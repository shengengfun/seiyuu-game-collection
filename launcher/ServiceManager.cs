using System.Diagnostics;
using System.Text;

namespace SeiyuuGuessLauncher;

/// <summary>状态灯的级别：绿（正常）/ 黄（在跑但有问题）/ 灰（没在跑）。</summary>
public enum ServiceState
{
    Down,
    Up,
    Warn,
}

public sealed record ServiceRow(string Name, string Detail, bool Running, bool Managed, int Pid, ServiceState State = ServiceState.Down);

/// <summary>
/// 负责拉起 / 停止各项服务，并把子进程输出写进 logs/ 下的日志文件。
/// </summary>
public sealed class ServiceManager : IDisposable
{
    private readonly object _logLock = new();
    private readonly AppConfig _config;

    /// <summary>netstat / 进程扫描的结果缓存：界面每秒刷新，但这类探测没必要每秒做一遍。</summary>
    private readonly object _probeLock = new();
    private Dictionary<int, int> _portPids = new();
    private DateTime _probeAtUtc = DateTime.MinValue;
    private bool _tunnelSeen;
    private bool _forceProbe = true;
    private static readonly TimeSpan ProbeTtl = TimeSpan.FromSeconds(3);

    // ---- 隧道系统服务 + 公网健康检查 ----

    /// <summary>公网健康检查的共享 HTTP 客户端：一律直连，不走系统代理。</summary>
    private static readonly HttpClient HealthClient = CreateHealthClient();

    private readonly System.Threading.Timer _healthTimer;
    private readonly object _healthLock = new();
    private bool? _publicReachable;
    private string _healthDetail = "尚未检测";
    private int _healthFailures;
    private DateTime _lastAutoHealUtc = DateTime.MinValue;
    private int _healthProbing;
    private bool _disposed;

    private static readonly TimeSpan HealthInterval = TimeSpan.FromSeconds(20);
    private static readonly TimeSpan AutoHealCooldown = TimeSpan.FromMinutes(5);

    private TunnelServiceInfo _tunnelServiceInfo = TunnelServiceInfo.Missing;
    private DateTime _tunnelServiceAtUtc = DateTime.MinValue;

    private Process? _server;
    private Process? _client;
    private Process? _tunnel;
    private Process? _build;

    public ServiceManager(AppConfig config)
    {
        _config = config;
        NodeExe = SysProbe.ResolveNode(config.NodeExe);
        // 公网健康检查放后台定时器：界面每秒刷状态，不能把 HTTP 请求塞在刷新路径上。
        // 隧道本来就该停着时不探测（见 ProbeHealthInBackground）。
        _healthTimer = new System.Threading.Timer(
            _ => ProbeHealthInBackground(),
            null,
            TimeSpan.FromSeconds(6),
            HealthInterval);
    }

    public string? NodeExe { get; }

    /// <summary>
    /// 上一次修隧道是不是被权限挡住的。界面据此提示「以管理员身份修复」。
    /// 标准用户对 Windows 服务只有查询权限，启停必须提权。
    /// </summary>
    public bool TunnelFixNeedsElevation { get; private set; }

    public string ServerLogPath => Path.Combine(_config.LogDirectory, "server.log");
    public string ClientLogPath => Path.Combine(_config.LogDirectory, "client.log");
    public string TunnelLogPath => Path.Combine(_config.LogDirectory, "cloudflared.log");
    public string BuildLogPath => Path.Combine(_config.LogDirectory, "build.log");

    public bool IsBuilding => _build is { HasExited: false };

    public bool CanStartServer => NodeExe is not null && File.Exists(_config.ServerEntry);

    /// <summary>前端能不能起：preview 需要构建产物，dev 只需要 vite 本体。</summary>
    public bool CanStartClient => _config.Mode switch
    {
        ClientMode.Off => true,
        ClientMode.Preview => NodeExe is not null && File.Exists(_config.ViteEntry) && File.Exists(_config.ClientIndexHtml),
        _ => NodeExe is not null && File.Exists(_config.ViteEntry),
    };

    /// <summary>前端起不来时的原因说明（能起则为 null）。</summary>
    public string? ClientBlockReason
    {
        get
        {
            if (_config.Mode == ClientMode.Off) return null;
            if (NodeExe is null) return "找不到 node.exe，请在 config.json 里填写 NodeExe";
            if (!File.Exists(_config.ViteEntry)) return "找不到 vite（请先在仓库根执行 pnpm install）";
            if (_config.Mode == ClientMode.Preview && !File.Exists(_config.ClientIndexHtml))
            {
                return $"缺少前端构建产物：{_config.ClientIndexHtml}（请点「重新构建」）";
            }
            return null;
        }
    }

    /// <summary>服务状态快照，供界面定时刷新。</summary>
    public IReadOnlyList<ServiceRow> Snapshot()
    {
        var rows = new List<ServiceRow>();
        var pids = ProbePids();

        var serverPortPid = pids.GetValueOrDefault(_config.ServerPort);
        var serverManaged = _server is { HasExited: false };
        var serverRunning = SysProbe.IsPortListening(_config.ServerPort) || serverManaged;
        var serverPid = serverManaged ? _server!.Id : serverPortPid;
        rows.Add(new ServiceRow(
            $"后端服务 :{_config.ServerPort}",
            ServerDetail(serverRunning, serverPid, serverManaged),
            serverRunning,
            serverManaged,
            serverPid));

        var clientPortPid = pids.GetValueOrDefault(_config.ClientPort);
        var clientManaged = _client is { HasExited: false };
        var clientRunning = SysProbe.IsPortListening(_config.ClientPort) || clientManaged;
        var clientPid = clientManaged ? _client!.Id : clientPortPid;
        rows.Add(new ServiceRow(
            $"前端服务 :{_config.ClientPort}",
            ClientDetail(clientRunning, clientPid, clientManaged),
            clientRunning,
            clientManaged,
            clientPid));

        var (tunnelDetail, tunnelState, tunnelRunning, tunnelPid) = TunnelRow();
        rows.Add(new ServiceRow("Cloudflare 隧道", tunnelDetail, tunnelRunning, tunnelPid > 0, tunnelPid, tunnelState));

        return rows;
    }

    /// <summary>
    /// 隧道那一行怎么显示。核心区分：
    /// <list type="bullet">
    ///   <item>系统服务在跑 + 公网可达 → 绿；</item>
    ///   <item>进程在但公网不通（典型 Error 1033）→ 黄，提示「修复隧道」；</item>
    ///   <item>根本没跑 → 灰。</item>
    /// </list>
    /// </summary>
    private (string Detail, ServiceState State, bool Running, int Pid) TunnelRow()
    {
        var name = _config.TunnelServiceName;
        var service = TunnelInfoCached();
        var managed = _tunnel is { HasExited: false };
        var pid = managed ? _tunnel!.Id : 0;

        if (_config.Tunnel == TunnelMode.Off)
        {
            return (_tunnelSeen ? "未管理（模式 off）· 检测到 cloudflared 进程" : "未管理（模式 off）", ServiceState.Down, _tunnelSeen, 0);
        }

        if (_config.Tunnel == TunnelMode.Process)
        {
            var exeReady = ResolveCloudflaredExe() is not null;
            if (managed) return ($"运行中 · PID {_tunnel!.Id}（启动器拉起）{HealthSuffix()}", HealthState(ServiceState.Up), true, pid);
            if (_tunnelSeen) return ($"运行中（外部进程）{HealthSuffix()}", HealthState(ServiceState.Up), true, 0);
            return (exeReady ? "未运行（点「修复隧道」拉起）" : "未运行（找不到 cloudflared.exe，请在 config.json 里填 CloudflaredExe）",
                ServiceState.Down, false, 0);
        }

        // 默认：托管系统服务
        if (!service.Installed)
        {
            return managed
                ? ($"未安装系统服务 {name}，当前由启动器自拉进程兜底（PID {_tunnel!.Id}）{HealthSuffix()}", HealthState(ServiceState.Warn), true, pid)
                : ($"未安装系统服务 {name}（点「修复隧道」或用 cloudflared\\install-service.bat 安装）", ServiceState.Down, false, 0);
        }

        if (!service.Running)
        {
            var fallback = managed ? $"，自拉进程兜底中（PID {_tunnel!.Id}）" : "";
            // pending（尤其是 STOP_PENDING）说明服务在启停中间态卡着，这是挂死的典型形态
            var stateDesc = service.Pending ? $"中间态 {service.StateText}" : $"启动类型 {service.StartTypeLabel}";
            return ($"已停止 · 系统服务 {name}（{stateDesc}）{fallback}",
                managed ? HealthState(ServiceState.Warn) : ServiceState.Down, managed, pid);
        }

        return ($"运行中 · 系统服务 {name}（启动类型 {service.StartTypeLabel}）{HealthSuffix()}", HealthState(ServiceState.Up), true, pid);
    }

    /// <summary>隧道在跑、但公网不通时降级成黄色（这才是 Error 1033 的真实形态）。</summary>
    private ServiceState HealthState(ServiceState running)
    {
        var reachable = PublicReachable;
        if (reachable == false) return ServiceState.Warn;
        if (reachable is null) return running;
        return ServiceState.Up;
    }

    private string HealthSuffix() => PublicReachable switch
    {
        true => " · 公网可达",
        false => " · " + HealthDetailText(),
        _ => "",
    };

    private bool? PublicReachable
    {
        get
        {
            lock (_healthLock) return _publicReachable;
        }
    }

    private string HealthDetailText()
    {
        lock (_healthLock) return _healthDetail;
    }

    /// <summary>带 TTL 的服务状态缓存（sc.exe 要起进程，不能每秒查）。</summary>
    private TunnelServiceInfo TunnelInfoCached()
    {
        lock (_probeLock)
        {
            var now = DateTime.UtcNow;
            if (_forceProbe || now - _tunnelServiceAtUtc >= ProbeTtl)
            {
                _tunnelServiceInfo = TunnelService.Query(_config.TunnelServiceName);
                _tunnelServiceAtUtc = now;
            }
            return _tunnelServiceInfo;
        }
    }

    private void SetTunnelServiceCache(TunnelServiceInfo info)
    {
        lock (_probeLock)
        {
            _tunnelServiceInfo = info;
            _tunnelServiceAtUtc = DateTime.UtcNow;
        }
    }

    /// <summary>
    /// netstat + 进程扫描（贵），加 TTL 缓存；端口监听检测（便宜）仍然实时。
    /// 启动/停止操作后调用 <see cref="InvalidateProbe"/> 立即重探。
    /// </summary>
    private Dictionary<int, int> ProbePids()
    {
        lock (_probeLock)
        {
            var now = DateTime.UtcNow;
            if (!_forceProbe && now - _probeAtUtc < ProbeTtl) return _portPids;

            _portPids = SysProbe.PortOwnerPids(new[] { _config.ServerPort, _config.ClientPort });
            _tunnelSeen = SysProbe.IsProcessRunning("cloudflared");
            _probeAtUtc = now;
            _forceProbe = false;
            return _portPids;
        }
    }

    /// <summary>让下一次 Snapshot 重新做一次端口/进程探测。</summary>
    public void InvalidateProbe()
    {
        lock (_probeLock)
        {
            _forceProbe = true;
        }
    }

    // ---------------- 公网健康检查 ----------------

    /// <summary>让下一次健康检查重做（重启隧道后调用）。</summary>
    public void InvalidateHealth()
    {
        lock (_healthLock)
        {
            _publicReachable = null;
            _healthDetail = "正在检测…";
            _healthFailures = 0;
        }
    }

    private static HttpClient CreateHealthClient()
    {
        var handler = new HttpClientHandler
        {
            // 直连：走系统代理（Clash 等）会连不上自己的站点
            UseProxy = false,
            AllowAutoRedirect = true,
        };
        return new HttpClient(handler) { Timeout = TimeSpan.FromSeconds(6) };
    }

    /// <summary>
    /// 公网健康检查（后台定时器调用）：本机端口通、公网不通 = 隧道断了。
    /// 这是 Error 1033 最真实的判据：进程活着但连接断光时，光看进程是看不出毛病的。
    /// <paramref name="force"/>：手动点「修复隧道」时忽略「隧道本来就没在跑」的前置判断。
    /// </summary>
    private void ProbeHealthInBackground(bool force = false)
    {
        if (_disposed) return;
        if (_config.PublicHealthUrl is not { } publicUrl) return;
        if (!force && TunnelShouldBeUp() is false) return;
        // 重入保护：上一次探测还没回来就跳过这一轮
        if (Interlocked.CompareExchange(ref _healthProbing, 1, 0) != 0) return;

        try
        {
            var reachable = IsUrlHealthy(publicUrl);
            string detail;
            if (reachable)
            {
                detail = "公网可达";
            }
            else
            {
                detail = IsUrlHealthy(_config.LocalHealthUrl)
                    ? "公网不可达（隧道断了，点「修复隧道」）"
                    : "公网不可达，本机服务也没响应";
            }

            int failures;
            lock (_healthLock)
            {
                _publicReachable = reachable;
                _healthDetail = detail;
                _healthFailures = reachable ? 0 : _healthFailures + 1;
                failures = _healthFailures;
            }

            if (reachable)
            {
                AppendLog(TunnelLogPath, $"[launcher] 隧道健康检查通过（{DateTime.Now:HH:mm:ss}）", false);
            }
            else
            {
                AppendLog(TunnelLogPath, $"[launcher] 隧道健康检查失败（第 {failures} 次）：{detail}", true);
                TryAutoHeal(failures);
            }
        }
        catch
        {
            // 健康检查失败不能影响别的功能
        }
        finally
        {
            Interlocked.Exchange(ref _healthProbing, 0);
        }
    }

    /// <summary>隧道此刻是不是「应该活着」（该停着的时候不必探测）。</summary>
    private bool? TunnelShouldBeUp() => _config.Tunnel switch
    {
        TunnelMode.Off => false,
        TunnelMode.Process => _tunnel is { HasExited: false } || _tunnelSeen,
        _ => TunnelInInfoRunning(),
    };

    private bool TunnelInInfoRunning() => TunnelInfoCached().Running || _tunnel is { HasExited: false };

    private static bool IsUrlHealthy(string url)
    {
        try
        {
            using var response = HealthClient.GetAsync(url, HttpCompletionOption.ResponseHeadersRead).GetAwaiter().GetResult();
            return response.IsSuccessStatusCode;
        }
        catch
        {
            return false;
        }
    }

    /// <summary>
    /// 连续失败后自动修复。带 5 分钟冷却：隧道偶尔抖一下不值得反复重启服务。
    /// 没权限重启服务时会退回「自己拉一个 cloudflared 连接器」——同一条隧道允许多个连接，
    /// 所以这一步不需要管理员权限也能把公网救回来。
    /// </summary>
    private void TryAutoHeal(int failures)
    {
        if (!_config.AutoHealTunnel || _config.Tunnel == TunnelMode.Off) return;
        if (failures < 2) return;

        lock (_healthLock)
        {
            if (DateTime.UtcNow - _lastAutoHealUtc < AutoHealCooldown) return;
            _lastAutoHealUtc = DateTime.UtcNow;
        }

        var result = _config.Tunnel == TunnelMode.Process
            ? RestartTunnelProcess()
            : RestartTunnelService();
        AppendLog(TunnelLogPath, $"[launcher] 检测到公网不通，自动修复（第 {failures} 次失败）：{result.Message}", !result.Ok);
        InvalidateProbe();
    }

    private string ServerDetail(bool running, int pid, bool managed)
    {
        if (!running) return "未运行";
        var who = managed ? "启动器拉起" : "外部进程";
        return pid > 0 ? $"运行中 · PID {pid}（{who}）" : $"运行中（{who}）";
    }

    private string ClientDetail(bool running, int pid, bool managed)
    {
        if (!running)
        {
            return _config.Mode switch
            {
                ClientMode.Off => "未启用（本地不跑 5173）",
                ClientMode.Preview => "未运行（构建产物预览）",
                _ => "未运行（开发模式 · 仅供调试）",
            };
        }
        var who = managed ? "启动器拉起" : "外部进程";
        var mode = _config.Mode == ClientMode.Dev ? "dev · 仅供调试" : "构建产物预览";
        return pid > 0 ? $"运行中 · PID {pid}（{mode}，{who}）" : $"运行中（{mode}，{who}）";
    }

    // ---------------- 启动 ----------------

    /// <summary>启动服务：后端始终处理，前端按 <see cref="AppConfig.Mode"/> 处理。</summary>
    public string StartAll()
    {
        var messages = new List<string>();

        var bypassNote = ProxyBypass.EnsureSystemBypass();
        AppendLog(ServerLogPath, "[launcher] " + bypassNote, false);
        if (bypassNote.StartsWith("已加入", StringComparison.Ordinal)) messages.Add(bypassNote);

        if (!CanStartServer)
        {
            messages.Add(NodeExe is null
                ? "找不到 node.exe，请在 config.json 里填写 NodeExe"
                : $"缺少服务端构建产物：{_config.ServerEntry}（请先执行 pnpm build）");
        }
        else if (!SysProbe.IsPortListening(_config.ServerPort) && _server is not { HasExited: false })
        {
            _server = StartNode("后端服务", _config.ServerEntry, _config.ServerWorkingDirectory, ServerLogPath);
            messages.Add(_server is null ? "后端服务启动失败" : $"后端服务已启动（PID {_server.Id}）");
            // node 要初始化数据库，几秒后才真正监听端口。等它起来再拉前端，
            // 否则 vite preview 的 /api、/socket.io 代理会在启动瞬间哗啦啦报 ECONNREFUSED。
            if (_server is not null && _config.Mode != ClientMode.Off &&
                !WaitForPortListening(_config.ServerPort, 15_000))
            {
                messages.Add($"等待 :{_config.ServerPort} 就绪超时，请看 server.log");
            }
        }
        else
        {
            messages.Add("后端服务已在运行");
        }

        messages.Add(StartClient());
        // 隧道放最后：它依赖源站端口已经起来，顺便把「服务/连接到底活没活」查一遍
        messages.Add(StartTunnel());
        InvalidateProbe();
        return string.Join("；", messages);
    }

    /// <summary>
    /// 启动前端端口（5173）。preview 给构建产物（快），dev 给开发服务器（只用于调试）。
    /// </summary>
    public string StartClient()
    {
        if (_config.Mode == ClientMode.Off) return $"前端服务未启用（模式 off）";
        if (SysProbe.IsPortListening(_config.ClientPort) || _client is { HasExited: false })
        {
            return "前端服务已在运行";
        }
        var reason = ClientBlockReason;
        if (reason is not null) return reason;

        var mode = _config.Mode == ClientMode.Dev ? "" : "preview";
        var name = _config.Mode == ClientMode.Dev ? "前端开发服务器" : "前端预览服务";
        var subcommand = mode.Length == 0 ? "" : mode + " ";
        var arguments = $"\"{_config.ViteEntry}\" {subcommand}--port {_config.ClientPort} --strictPort";
        _client = StartNodeArgs(name, arguments, _config.ClientWorkingDirectory, ClientLogPath);
        InvalidateProbe();
        return _client is null ? $"{name}启动失败，请看日志" : $"{name}已启动（PID {_client.Id}，:{_config.ClientPort}）";
    }

    /// <summary>
    /// 确保隧道在跑。默认交给 Windows 系统服务（service 模式），退而求其次是启动器自拉进程。
    /// </summary>
    public string StartTunnel() => _config.Tunnel switch
    {
        TunnelMode.Off => "隧道托管已关闭（模式 off）",
        TunnelMode.Process => StartTunnelProcess().Message,
        _ => EnsureTunnelService(),
    };

    /// <summary>界面「修复隧道」按钮：强制查一遍、该重启就重启，并立刻重测公网。</summary>
    public string RepairTunnel()
    {
        TunnelFixNeedsElevation = false;
        var result = _config.Tunnel switch
        {
            TunnelMode.Off => ServiceOpResult.Failed("隧道托管已关闭（模式 off），未做任何操作"),
            TunnelMode.Process => RestartTunnelProcess(),
            _ => RestartTunnelService(),
        };

        InvalidateHealth();
        // 刚重启时连接器还要几秒才和 Cloudflare 边缘握手完成，立刻探测必然报「不可达」，
        // 所以动作成功的话小步重试，把最终结果报出来，免得刚修好就显示一句红字。
        if (result.Ok)
        {
            WaitForPublicHealth(20000);
        }
        else if (_config.PublicHealthUrl is not null)
        {
            ProbeHealthInBackground(force: true);
        }
        InvalidateProbe();

        var health = HealthSuffix().TrimStart(' ', '·');
        return health.Length > 0 ? $"{result.Message}；{health}" : result.Message;
    }

    /// <summary>等公网恢复可达（重启后连接器握手需要几秒）。返回是否最终可达。</summary>
    private bool WaitForPublicHealth(int timeoutMs)
    {
        if (_config.PublicHealthUrl is null) return true;
        var deadline = DateTime.UtcNow.AddMilliseconds(timeoutMs);
        while (true)
        {
            ProbeHealthInBackground(force: true);
            if (PublicReachable == true) return true;
            if (DateTime.UtcNow >= deadline) return false;
            Thread.Sleep(2500);
        }
    }

    /// <summary>
    /// service 模式：服务优先 + 进程兜底。
    /// 先确认启动类型是「自动」（下次开机能自己跑），没在跑就启动；在跑但公网不通就重启。
    /// 一旦被权限挡住（标准用户启停不了服务），立刻退回自拉进程——同一条隧道允许多个连接器，
    /// 所以这一步能把公网救回来，不必先弹 UAC。
    /// </summary>
    private string EnsureTunnelService()
    {
        var name = _config.TunnelServiceName;
        var info = TunnelService.Query(name);
        SetTunnelServiceCache(info);

        if (!info.Installed)
        {
            return ProcessFallback($"未安装系统服务 {name}（可用 cloudflared\\install-service.bat 安装，或把隧道模式改成 process）");
        }

        var messages = new List<string>();
        var auto = TunnelService.EnsureAutoStart(name);
        if (auto.AccessDenied) TunnelFixNeedsElevation = true;
        // 已经是「自动」且没出错就不用报了，省得每次启动都刷一句废话
        if (!auto.Ok || !info.AutoStart) messages.Add(auto.Message);

        if (!info.Running)
        {
            var started = TunnelService.Start(name);
            if (started.AccessDenied) TunnelFixNeedsElevation = true;
            if (!started.Ok)
            {
                messages.Add(started.Message);
                return ProcessFallback(string.Join("；", messages));
            }
            SetTunnelServiceCache(TunnelService.Query(name));
            InvalidateHealth();
            messages.Add(started.Message);
            return string.Join("；", messages);
        }

        if (ShouldRestartForHealth())
        {
            var restarted = TunnelService.Restart(name);
            SetTunnelServiceCache(TunnelService.Query(name));
            if (restarted.AccessDenied)
            {
                TunnelFixNeedsElevation = true;
                messages.Add(restarted.Message);
                return ProcessFallback(string.Join("；", messages));
            }
            messages.Add(restarted.Message);
            InvalidateHealth();
            return string.Join("；", messages);
        }

        messages.Add($"系统服务 {name} 已在运行");
        return string.Join("；", messages);
    }

    /// <summary>在跑但公网不通 → 需要重启；健康结果未知时先不动（避免无谓重启）。</summary>
    private bool ShouldRestartForHealth() => _config.AutoHealTunnel && PublicReachable == false;

    /// <summary>重启系统服务（服务不存在/没权限时退回自拉进程）。</summary>
    private ServiceOpResult RestartTunnelService()
    {
        var name = _config.TunnelServiceName;
        var info = TunnelService.Query(name);
        SetTunnelServiceCache(info);
        if (!info.Installed) return ServiceOpResult.Failed(ProcessFallback($"未安装系统服务 {name}"));

        var messages = new List<string>();
        var auto = TunnelService.EnsureAutoStart(name);
        if (auto.AccessDenied) TunnelFixNeedsElevation = true;
        if (!auto.Ok) messages.Add(auto.Message);

        var restarted = TunnelService.Restart(name);
        SetTunnelServiceCache(TunnelService.Query(name));
        if (restarted.AccessDenied)
        {
            TunnelFixNeedsElevation = true;
            messages.Add(restarted.Message);
            return ServiceOpResult.Failed(ProcessFallback(string.Join("；", messages)));
        }
        messages.Add(restarted.Message);
        SetTunnelServiceCache(TunnelService.Query(name));

        // 服务起来了但公网还是不通：多半是服务里的连接器坏了，用自拉进程再顶一个
        if (restarted.Ok && _config.AutoHealTunnel && PublicReachable == false)
        {
            messages.Add(ProcessFallback("服务已重启但公网仍不通"));
        }
        return new ServiceOpResult(restarted.Ok, false, string.Join("；", messages));
    }

    /// <summary>服务的连接器起不来时的兜底：启动器自己拉一个 cloudflared 连到同一条隧道。</summary>
    private string ProcessFallback(string prefix)
    {
        var result = StartTunnelProcess(skipExistingProcessCheck: true);
        return result.Ok ? $"{prefix}；兜底方案：{result.Message}" : $"{prefix}；{result.Message}";
    }

    private ServiceOpResult RestartTunnelProcess()
    {
        if (_tunnel is { HasExited: false })
        {
            _tunnel = KillOurProcess(_tunnel!);
        }
        else if (_tunnelSeen)
        {
            return ServiceOpResult.Failed("检测到外部 cloudflared 进程，启动器不便重启它（可改用「系统服务」模式托管）");
        }
        return StartTunnelProcess();
    }

    /// <summary>
    /// 启动器自拉一个 cloudflared 进程（v1 行为 / 服务不可用时的兜底）。
    /// <paramref name="skipExistingProcessCheck"/>：兜底场景下「有 cloudflared 进程」恰恰是问题本身
    /// （系统服务的进程活着但连接断光），所以不能因为看到进程就跳过。
    /// </summary>
    private ServiceOpResult StartTunnelProcess(bool skipExistingProcessCheck = false)
    {
        if (_tunnel is { HasExited: false }) return ServiceOpResult.Success("隧道进程已由启动器拉起");
        if (!skipExistingProcessCheck && _tunnelSeen) return ServiceOpResult.Success("检测到已有的 cloudflared 进程，无需重复启动");

        var exe = ResolveCloudflaredExe();
        if (exe is null)
        {
            return ServiceOpResult.Failed("找不到 cloudflared.exe（在 config.json 里填 CloudflaredExe，或改用系统服务模式）");
        }

        var proc = StartDetached("Cloudflare 隧道", exe, _config.CloudflaredArgs,
            Path.GetDirectoryName(exe)!, TunnelLogPath);
        if (proc is null) return ServiceOpResult.Failed("隧道进程启动失败，请看 cloudflared.log");

        _tunnel = proc;
        InvalidateProbe();
        InvalidateHealth();
        return ServiceOpResult.Success($"已由启动器拉起隧道进程（PID {proc.Id}）");
    }

    /// <summary>停止隧道：service 模式下停系统服务，另外顺手收掉启动器自己拉的那个进程。</summary>
    public string StopTunnel()
    {
        var messages = new List<string>();

        if (_config.Tunnel == TunnelMode.Service)
        {
            var name = _config.TunnelServiceName;
            var info = TunnelService.Query(name);
            SetTunnelServiceCache(info);
            if (info.Installed && info.Running)
            {
                var result = TunnelService.Stop(name);
                if (result.AccessDenied) TunnelFixNeedsElevation = true;
                messages.Add(result.Message);
                SetTunnelServiceCache(TunnelService.Query(name));
            }
        }

        if (_tunnel is { HasExited: false })
        {
            _tunnel = KillOurProcess(_tunnel!);
            messages.Add("已停止启动器拉起的隧道进程");
        }

        InvalidateProbe();
        InvalidateHealth();
        return messages.Count > 0 ? string.Join("；", messages) : "隧道未在运行";
    }

    /// <summary>找 cloudflared.exe：配置 → 系统服务的可执行路径 → 仓库自带 → 常见安装目录 → PATH。</summary>
    public string? ResolveCloudflaredExe()
    {
        if (!string.IsNullOrWhiteSpace(_config.CloudflaredExe) && File.Exists(_config.CloudflaredExe))
        {
            return _config.CloudflaredExe;
        }

        var fromService = TunnelInfoCached().ExePath;
        if (fromService is not null && File.Exists(fromService)) return fromService;

        foreach (var candidate in new[]
                 {
                     _config.RepoCloudflaredExe,
                     @"C:\Program Files (x86)\cloudflared\cloudflared.exe",
                     @"C:\Program Files\cloudflared\cloudflared.exe",
                 })
        {
            if (File.Exists(candidate)) return candidate;
        }

        var fromPath = SysProbe.RunAndRead("where.exe", "cloudflared")
            .Split('\n')
            .Select(line => line.Trim())
            .FirstOrDefault(line => line.Length > 0 && File.Exists(line));
        return fromPath;
    }

    // ---------------- 停止 ----------------

    public string StopAll()
    {
        var messages = new List<string> { StopServer(), StopClient(), StopTunnel() };
        InvalidateProbe();
        return string.Join("；", messages.Where(m => !string.IsNullOrEmpty(m)));
    }

    public string StopServer()
    {
        var messages = new List<string>();
        if (_server is { HasExited: false })
        {
            _server = KillOurProcess(_server!);
            messages.Add("已停止后端服务");
        }
        else
        {
            var pid = SysProbe.PortOwnerPid(_config.ServerPort);
            if (pid > 0)
            {
                SysProbe.KillProcessTree(pid);
                messages.Add($"已停止占用 :{_config.ServerPort} 的进程（PID {pid}）");
            }
        }

        WaitForPortFree(_config.ServerPort);
        InvalidateProbe();
        return messages.Count > 0 ? string.Join("；", messages) : "后端服务未在运行";
    }

    public string StopClient()
    {
        var messages = new List<string>();
        if (_client is { HasExited: false })
        {
            _client = KillOurProcess(_client!);
            messages.Add("已停止前端服务");
        }
        else
        {
            var pid = SysProbe.PortOwnerPid(_config.ClientPort);
            if (pid > 0)
            {
                SysProbe.KillProcessTree(pid);
                messages.Add($"已停止占用 :{_config.ClientPort} 的进程（PID {pid}）");
            }
        }
        WaitForPortFree(_config.ClientPort);
        InvalidateProbe();
        return messages.Count > 0 ? string.Join("；", messages) : "前端服务未在运行";
    }

    private Process? KillOurProcess(Process proc)
    {
        try
        {
            if (!proc.HasExited) SysProbe.KillProcessTree(proc.Id);
            proc.WaitForExit(5000);
        }
        catch
        {
            // ignore
        }
        proc.Dispose();
        return null;
    }

    private static void WaitForPortFree(int port)
    {
        WaitForPortListening(port, 6000, waitUntilListening: false);
    }

    /// <summary>
    /// 等待端口变成（或不再是）监听状态。
    /// 调用方会把它放在后台线程上（界面用 <c>RunBackground</c>），所以这里可以放心阻塞。
    /// </summary>
    private static bool WaitForPortListening(int port, int timeoutMs, bool waitUntilListening = true)
    {
        var deadline = DateTime.UtcNow.AddMilliseconds(timeoutMs);
        while (DateTime.UtcNow < deadline)
        {
            if (SysProbe.IsPortListening(port) == waitUntilListening) return true;
            Thread.Sleep(200);
        }
        return SysProbe.IsPortListening(port) == waitUntilListening;
    }

    // ---------------- 构建 ----------------

    /// <summary>后台跑一次完整构建（pnpm build：PoW 产物 + 前端 + 后端），输出写进 logs/build.log。</summary>
    public string StartBuild()
    {
        if (IsBuilding) return "正在构建中，请稍候";
        if (!File.Exists(Path.Combine(_config.ResolvedRepoRoot, "package.json"))) return "仓库根目录不对，找不到 package.json";

        try
        {
            File.Delete(BuildLogPath);
        }
        catch
        {
            // ignore
        }
        AppendLog(BuildLogPath, $"[launcher] 开始构建（{DateTime.Now:yyyy-MM-dd HH:mm:ss}）", false);
        // 直接调用仓库根脚本，保证与命令行 pnpm build 完全一致（含 build:pow 产物准备）
        var psi = new ProcessStartInfo("cmd.exe", "/c pnpm build")
        {
            WorkingDirectory = _config.ResolvedRepoRoot,
            UseShellExecute = false,
            CreateNoWindow = true,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            StandardOutputEncoding = Encoding.UTF8,
            StandardErrorEncoding = Encoding.UTF8,
        };
        ProxyBypass.PrepareProcess(psi);
        var proc = new Process { StartInfo = psi, EnableRaisingEvents = true };
        proc.OutputDataReceived += (_, e) => AppendLog(BuildLogPath, e.Data, false);
        proc.ErrorDataReceived += (_, e) => AppendLog(BuildLogPath, e.Data, true);
        proc.Exited += (_, _) =>
        {
            AppendLog(BuildLogPath, $"[launcher] 构建结束（exit {proc.ExitCode}）", proc.ExitCode != 0);
            proc.Dispose();
        };
        proc.Start();
        proc.BeginOutputReadLine();
        proc.BeginErrorReadLine();
        _build = proc;
        return "已开始构建（PoW 产物 + 前端 + 后端），完成后需点「重启服务」生效";
    }

    // ---------------- 日志 ----------------

    /// <summary>用 node 跑一个脚本文件（例如 server/dist/index.js）。</summary>
    private Process? StartNode(string name, string script, string workingDirectory, string logPath)
    {
        return StartNodeArgs(name, $"\"{script}\"", workingDirectory, logPath);
    }

    /// <summary>用 node 跑任意参数（vite 的 bin 脚本要带 preview/dev 子命令与端口）。</summary>
    private Process? StartNodeArgs(string name, string arguments, string workingDirectory, string logPath)
    {
        return StartDetached(name, NodeExe!, arguments, workingDirectory, logPath);
    }

    /// <summary>
    /// 通过 cmd 把输出重定向到日志文件后启动子进程。
    /// 关键点：**不要**用 ProcessStartInfo 的 RedirectStandardOutput——
    /// 那样管道读端在启动器退出后就关了，node 一写 stdout 就会 EPIPE 崩掉
    /// （服务在启动器退出后必须继续运行）。交给 cmd 持有文件句柄最稳。
    /// </summary>
    private Process? StartDetached(string name, string exePath, string arguments, string workingDirectory, string logPath)
    {
        try
        {
            var logDir = Path.GetDirectoryName(logPath);
            if (!string.IsNullOrEmpty(logDir)) Directory.CreateDirectory(logDir);

            var command = $"\"\"{exePath}\" {arguments} >> \"{logPath}\" 2>&1\"";
            var psi = new ProcessStartInfo("cmd.exe", "/c " + command)
            {
                WorkingDirectory = workingDirectory,
                UseShellExecute = false,
                CreateNoWindow = true,
            };
            // server / vite / cloudflared 一律直连：走了代理就连不上本机站点与 Cloudflare 边缘
            ProxyBypass.PrepareProcess(psi);
            // 输出是重定向进文件的，不需要 ANSI 颜色码：否则日志里全是 [32m→[39m 这种乱码
            psi.Environment["NO_COLOR"] = "1";
            psi.Environment["FORCE_COLOR"] = "0";

            var proc = new Process { StartInfo = psi, EnableRaisingEvents = true };
            proc.Exited += (_, _) => AppendLog(logPath, $"[launcher] {name} 已退出（exit {proc.ExitCode}）", proc.ExitCode != 0);
            proc.Start();
            AppendLog(logPath, $"[launcher] 启动 {name}（PID {proc.Id}）{DateTime.Now:yyyy-MM-dd HH:mm:ss}", false);
            return proc;
        }
        catch (Exception ex)
        {
            AppendLog(logPath, "[launcher] 启动失败：" + ex.Message, true);
            return null;
        }
    }

    /// <summary>追加一行日志。写进文件的内容也先洗掉 ANSI 码。</summary>
    private void AppendLog(string path, string? line, bool isError)
    {
        if (line is null) return;
        lock (_logLock)
        {
            try
            {
                Directory.CreateDirectory(Path.GetDirectoryName(path)!);
                RotateIfLarge(path);
                var prefix = isError ? "! " : "";
                File.AppendAllText(path, prefix + AnsiPattern.Replace(line, "") + Environment.NewLine, Encoding.UTF8);
            }
            catch
            {
                // 日志失败不影响主流程
            }
        }
    }

    private static void RotateIfLarge(string path)
    {
        var info = new FileInfo(path);
        if (!info.Exists || info.Length < 4 * 1024 * 1024) return;
        var backup = path + ".1";
        try
        {
            if (File.Exists(backup)) File.Delete(backup);
            File.Move(path, backup);
        }
        catch
        {
            // ignore
        }
    }

    /// <summary>读取日志尾部若干行（供界面展示）。</summary>
    public string TailLog(int lines)
    {
        var parts = new List<string>();
        foreach (var (title, path) in new[]
                 {
                     ($"=== server.log（前端/后端服务）===", ServerLogPath),
                     ($"=== client.log（:5173 前端）===", ClientLogPath),
                     ($"=== cloudflared.log（启动器自拉隧道时的输出，服务方式走事件日志）===", TunnelLogPath),
                     ($"=== build.log（构建）===", BuildLogPath),
                 })
        {
            parts.Add(title);
            parts.Add(TailFile(path, lines));
        }
        return string.Join(Environment.NewLine, parts);
    }

    /// <summary>只读文件尾部一个块再取最后 N 行。</summary>
    private const int TailChunkBytes = 64 * 1024;

    /// <summary>CSI 控制序列（颜色、光标等），日志里出现就是乱码。</summary>
    private static readonly System.Text.RegularExpressions.Regex AnsiPattern =
        new(@"\x1B\[[0-9;?]*[ -/]*[@-~]", System.Text.RegularExpressions.RegexOptions.Compiled);

    public static string TailFile(string path, int lines)
    {
        try
        {
            if (!File.Exists(path)) return "(暂无日志)";
            using var stream = new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.ReadWrite);
            // v1 每秒把整个文件读完再取尾部：4MB 的日志就是每秒 4MB 的无意义 IO。
            // 这里只定位到尾部一个块，代价与文件大小无关。
            var start = Math.Max(0, stream.Length - TailChunkBytes);
            if (start > 0) stream.Seek(start, SeekOrigin.Begin);
            using var reader = new StreamReader(stream, Encoding.UTF8, detectEncodingFromByteOrderMarks: false);
            var queue = new Queue<string>();
            // 从中途开始时，第一行可能是被截断的半行，丢掉
            if (start > 0) reader.ReadLine();
            string? line;
            while ((line = reader.ReadLine()) is not null)
            {
                // 兜底：早先写进文件里的颜色码也一并洗掉
                queue.Enqueue(AnsiPattern.Replace(line, ""));
                if (queue.Count > lines) queue.Dequeue();
            }
            return queue.Count == 0 ? "(暂无日志)" : string.Join(Environment.NewLine, queue);
        }
        catch (Exception ex)
        {
            return "(读取日志失败：" + ex.Message + ")";
        }
    }

    public void ClearLogs()
    {
        foreach (var path in new[] { ServerLogPath, ClientLogPath, TunnelLogPath, BuildLogPath })
        {
            try
            {
                if (File.Exists(path)) File.Delete(path);
            }
            catch
            {
                // ignore
            }
        }
    }

    public void Dispose()
    {
        // 只释放句柄，不主动结束子进程：关闭启动器不应该把线上服务一起杀掉。
        _disposed = true;
        _healthTimer.Dispose();
        _server?.Dispose();
        _client?.Dispose();
        _tunnel?.Dispose();
    }

    /// <summary>把隧道相关状态拼成一段诊断文本（写日志 / 排查用）。</summary>
    public string DescribeTunnelState()
    {
        var name = _config.TunnelServiceName;
        var info = TunnelService.Query(name);
        SetTunnelServiceCache(info);
        // 进程扫描有 TTL 缓存，CLI 是一次性动作，这里强制重探一遍再报，免得写出过时的结果
        InvalidateProbe();
        ProbePids();
        // 顺手做一次实时健康检查（GUI 里是定时器在跑，这里等结果，最多几秒）
        if (_config.PublicHealthUrl is not null) ProbeHealthInBackground(force: true);
        var lines = new List<string>
        {
            $"模式={_config.TunnelModeName}",
            $"服务 {name}=" + (info.Installed
                ? $"已安装，状态 {info.StateText}，启动类型 {info.StartTypeLabel}，display={info.DisplayName}"
                : "未安装"),
            $"服务 exe={info.ExePath ?? "(未知)"}",
            $"启动器可用 exe={ResolveCloudflaredExe() ?? "(找不到)"}",
            $"cloudflared 进程={(_tunnelSeen ? "有" : "无")}" +
            (_tunnel is { HasExited: false } ? $"（启动器拉起 PID {_tunnel!.Id}）" : ""),
            $"公网健康={_healthDetail}",
            $"开机自启={(Autostart.IsEnabled() ? Autostart.CurrentCommandLine() : "未开启")}",
        };
        return string.Join("；", lines);
    }
}
