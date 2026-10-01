using System.Text;

namespace SeiyuuGuessLauncher;

/// <summary>
/// 隧道系统服务（<c>Cloudflared</c>）的状态快照，由 <c>sc.exe query/qc</c> 解析得到。
/// </summary>
public sealed record TunnelServiceInfo(
    bool Installed,
    bool Running,
    string StateText,
    string StartTypeText,
    string DisplayName,
    string? ImagePath)
{
    public static TunnelServiceInfo Missing { get; } = new(false, false, "未安装", "", "", null);

    /// <summary>启动类型是「自动」= 开机时由 Windows 自己拉起，不依赖任何用户登录。</summary>
    public bool AutoStart => StartTypeText.Contains("AUTO_START", StringComparison.OrdinalIgnoreCase);

    /// <summary>正在启动/停止过程中（START_PENDING / STOP_PENDING ...）。</summary>
    public bool Pending => StateText.Contains("PENDING", StringComparison.OrdinalIgnoreCase);

    /// <summary>卡在停止过程中：连接器挂死时就是这个状态，SCM 在等进程退出。</summary>
    public bool Stopping => StateText.Contains("STOP_PENDING", StringComparison.OrdinalIgnoreCase);

    public string StartTypeLabel => StartTypeText switch
    {
        "" => "未知",
        _ when AutoStart => "自动",
        _ when StartTypeText.Contains("DISABLED", StringComparison.OrdinalIgnoreCase) => "已禁用",
        _ when StartTypeText.Contains("DEMAND", StringComparison.OrdinalIgnoreCase) => "手动",
        _ => StartTypeText,
    };

    /// <summary>从 <c>BINARY_PATH_NAME</c> 里抠出 exe 路径（后面通常还跟着启动参数）。</summary>
    public string? ExePath
    {
        get
        {
            if (string.IsNullOrWhiteSpace(ImagePath)) return null;
            var raw = ImagePath.Trim();
            if (raw.StartsWith('"'))
            {
                var end = raw.IndexOf('"', 1);
                return end > 1 ? raw[1..end] : null;
            }
            var exe = raw.IndexOf(".exe", StringComparison.OrdinalIgnoreCase);
            return exe > 0 ? raw[..(exe + 4)] : raw;
        }
    }
}

/// <summary>服务控制操作的结果。区分「权限不足」是因为它可以靠提权再试一次。</summary>
public sealed record ServiceOpResult(bool Ok, bool AccessDenied, string Message)
{
    public static ServiceOpResult Success(string message) => new(true, false, message);
    public static ServiceOpResult Denied(string message) => new(false, true, message);
    public static ServiceOpResult Failed(string message) => new(false, false, message);
}

/// <summary>
/// 隧道系统服务的查询与控制。
///
/// 为什么要走 <c>sc.exe</c> 而不是 <c>System.ServiceProcess.ServiceController</c>：
/// 后者在 .NET 上要额外引一个 NuGet 包（单文件发布的启动器想保持零依赖），
/// 而 <c>sc.exe</c> 的退出码就是 Win32 错误码（1060=服务不存在、5=拒绝访问、1062=服务未启动），
/// 判断失败原因反而更准。
///
/// 输出编码按 Latin1 直读：sc.exe 写的是控制台 OEM 编码（中文系统上 GBK），
/// 我们只解析 <c>RUNNING</c> / <c>AUTO_START</c> / <c>BINARY_PATH_NAME</c> 这些 ASCII 关键字，
/// 中文提示语不参与判断，免得在单文件 exe 里注册代码页提供程序。
/// </summary>
public static class TunnelService
{
    /// <summary>cloudflared service install 装出来的服务名是固定的（不支持改名）。</summary>
    public const string DefaultName = "Cloudflared";

    private const int ErrorAccessDenied = 5;
    private const int ErrorServiceNotActive = 1062;
    private const int ErrorServiceAlreadyRunning = 1056;
    private const int ErrorServiceDoesNotExist = 1060;
    /// <summary>服务正在停止中，此时下发 start 会被拒。</summary>
    private const int ErrorServiceStopPending = 1051;
    /// <summary>服务不接受控制（例如正卡在 pending）。</summary>
    private const int ErrorServiceCannotAcceptCtrl = 1052;
    /// <summary>服务正在启动中。</summary>
    private const int ErrorServiceStartPending = 1053;
    /// <summary>服务已经在停（再次下 stop 会得到它）。</summary>
    private const int ErrorServiceNotStopped = 1061;

    public static TunnelServiceInfo Query(string serviceName)
    {
        if (string.IsNullOrWhiteSpace(serviceName)) return TunnelServiceInfo.Missing;

        var (code, output) = Run("sc.exe", $"query \"{serviceName}\"");
        if (code == ErrorServiceDoesNotExist || output.Contains("1060", StringComparison.Ordinal))
        {
            return TunnelServiceInfo.Missing;
        }
        if (code != 0) return TunnelServiceInfo.Missing;

        var state = ReadField(output, "STATE");
        var running = state.Contains("RUNNING", StringComparison.OrdinalIgnoreCase)
                      || state.Contains("START_PENDING", StringComparison.OrdinalIgnoreCase);

        var (cfgCode, cfgOutput) = Run("sc.exe", $"qc \"{serviceName}\"");
        var startType = cfgCode == 0 ? ReadField(cfgOutput, "START_TYPE") : "";
        var displayName = cfgCode == 0 ? ReadField(cfgOutput, "DISPLAY_NAME") : "";
        var imagePath = cfgCode == 0 ? ReadRawField(cfgOutput, "BINARY_PATH_NAME") : null;

        return new TunnelServiceInfo(
            Installed: true,
            Running: running,
            // STATE 字段形如 "4  RUNNING"，取最后一段
            StateText: LastToken(state),
            StartTypeText: LastToken(startType),
            DisplayName: displayName,
            ImagePath: imagePath);
    }

    /// <summary>启动服务。已经跑起来的情况按成功处理。</summary>
    public static ServiceOpResult Start(string serviceName, int waitMs = 20000)
    {
        var info = Query(serviceName);
        if (!info.Installed) return ServiceOpResult.Failed("隧道系统服务未安装");
        // 还在启动/停止的中间态就先等它落定，否则 sc start 会被拒
        if (info.Pending)
        {
            WaitForSettled(serviceName, 15000);
            info = Query(serviceName);
        }
        if (info.Running && !info.Stopping) return ServiceOpResult.Success("隧道系统服务已在运行");

        var (code, _) = Run("sc.exe", $"start \"{serviceName}\"");
        if (code == ErrorAccessDenied) return ServiceOpResult.Denied("启动隧道服务需要管理员权限");

        // 1056=已在运行 / 1051=正在停 / 1052=不接受控制 / 1053=正在启：这些不一定是失败，
        // 统一以「等一会儿后的最终状态」为准（sc 的即时返回码在 pending 阶段很不可靠）。
        var tolerated = code is 0 or ErrorServiceAlreadyRunning or ErrorServiceStopPending
            or ErrorServiceCannotAcceptCtrl or ErrorServiceStartPending;
        if (!tolerated) return ServiceOpResult.Failed($"启动隧道服务失败（sc 退出码 {code}）");

        if (WaitForRunning(serviceName, true, waitMs)) return ServiceOpResult.Success("隧道系统服务已启动");

        // 还卡着：典型是 STOP_PENDING 不动（连接器挂死不响应停止）。只能把进程清掉让 SCM 走完。
        var killed = KillStuckProcesses(info.ExePath);
        if (killed > 0)
        {
            WaitForSettled(serviceName, 8000);
            Run("sc.exe", $"start \"{serviceName}\"");
            if (WaitForRunning(serviceName, true, waitMs))
            {
                return ServiceOpResult.Success($"隧道服务卡在停止状态，已强制清掉 {killed} 个挂死的 cloudflared 进程并重新拉起");
            }
        }

        return ServiceOpResult.Failed("已下发启动命令，但服务没有进入运行状态（可能需要管理员权限或手动检查服务）");
    }

    /// <summary>
    /// 停止服务。本来就没在跑的情况按成功处理。
    /// <paramref name="force"/>：卡在 STOP_PENDING 时是否强杀挂死的 cloudflared 进程（重启场景用 true）。
    /// </summary>
    public static ServiceOpResult Stop(string serviceName, int waitMs = 20000, bool force = false)
    {
        var info = Query(serviceName);
        if (!info.Installed) return ServiceOpResult.Failed("隧道系统服务未安装");
        // pending 中间态先等它落定；强制模式（重启）不等太久，反正后面会强杀挂死进程
        if (info.Pending) WaitForSettled(serviceName, force ? 3000 : 15000);
        info = Query(serviceName);
        if (!info.Running && !info.Pending) return ServiceOpResult.Success("隧道系统服务本来就没在运行");

        var (code, _) = Run("sc.exe", $"stop \"{serviceName}\"");
        if (code == ErrorServiceNotActive) return ServiceOpResult.Success("隧道系统服务本来就没在运行");
        if (code == ErrorAccessDenied) return ServiceOpResult.Denied("停止隧道服务需要管理员权限");
        if (code != 0 && code != ErrorServiceNotStopped && code != ErrorServiceStopPending)
        {
            return ServiceOpResult.Failed($"停止隧道服务失败（sc 退出码 {code}）");
        }

        // 强制模式（重启）也先给 12 秒：cloudflared 正常停止要优雅地断开连接，
        // 太短会把「正常的慢停止」也当成挂死来强杀。
        if (WaitForStopped(serviceName, force ? 12000 : waitMs)) return ServiceOpResult.Success("隧道系统服务已停止");
        if (!force) return ServiceOpResult.Failed("已下发停止命令，但服务卡在停止过程中（连接器可能已挂死）");

        var killed = KillStuckProcesses(info.ExePath);
        return WaitForStopped(serviceName, 8000)
            ? ServiceOpResult.Success($"隧道服务停止卡住，已强制清掉 {killed} 个挂死的 cloudflared 进程")
            : ServiceOpResult.Failed("强制清理后服务仍未停止，请在服务管理器里查看或重启系统");
    }

    /// <summary>重启服务：先停（不介意原本没跑，并且会清掉挂死的连接器）再起。</summary>
    public static ServiceOpResult Restart(string serviceName)
    {
        var stop = Stop(serviceName, force: true);
        if (!stop.Ok) return stop;
        var start = Start(serviceName);
        return start.Ok ? ServiceOpResult.Success(stop.Message + "；" + start.Message) : start;
    }

    /// <summary>把启动类型改成「自动」，保证下次开机能自己拉起来。</summary>
    public static ServiceOpResult EnsureAutoStart(string serviceName)
    {
        var info = Query(serviceName);
        if (!info.Installed) return ServiceOpResult.Failed("隧道系统服务未安装");
        if (info.AutoStart) return ServiceOpResult.Success("隧道服务启动类型已是「自动」");

        var (code, _) = Run("sc.exe", $"config \"{serviceName}\" start= auto");
        if (code == ErrorAccessDenied) return ServiceOpResult.Denied("设置隧道服务为自动启动需要管理员权限");
        if (code != 0) return ServiceOpResult.Failed($"设置自动启动失败（sc 退出码 {code}）");
        return ServiceOpResult.Success("隧道服务启动类型已改为「自动」");
    }

    /// <summary>轮询等服务进入（或离开）运行状态。</summary>
    private static bool WaitForRunning(string serviceName, bool running, int timeoutMs)
    {
        var deadline = DateTime.UtcNow.AddMilliseconds(timeoutMs);
        while (DateTime.UtcNow < deadline)
        {
            if (Query(serviceName).Running == running) return true;
            Thread.Sleep(400);
        }
        return Query(serviceName).Running == running;
    }

    /// <summary>等到服务不再处于 pending 中间态（真正停下或真正跑起来）。</summary>
    private static bool WaitForSettled(string serviceName, int timeoutMs)
    {
        var deadline = DateTime.UtcNow.AddMilliseconds(timeoutMs);
        while (DateTime.UtcNow < deadline)
        {
            if (!Query(serviceName).Pending) return true;
            Thread.Sleep(400);
        }
        return !Query(serviceName).Pending;
    }

    /// <summary>等到服务完全停下（不 pending 也不 running）。</summary>
    private static bool WaitForStopped(string serviceName, int timeoutMs)
    {
        var deadline = DateTime.UtcNow.AddMilliseconds(timeoutMs);
        while (DateTime.UtcNow < deadline)
        {
            var info = Query(serviceName);
            if (!info.Running && !info.Pending) return true;
            Thread.Sleep(400);
        }
        var last = Query(serviceName);
        return !last.Running && !last.Pending;
    }

    /// <summary>
    /// 强杀掉挂死的 cloudflared 进程。
    ///
    /// 为什么需要：连接器挂死时服务会卡在 STOP_PENDING —— SCM 已经发出停止请求并在等进程退出，
    /// 而进程自己不退，于是停了停不掉、启也启不了（公开就是 Error 1033）。这种时候只能把进程干掉，
    /// SCM 才会完成停止、之后才能重新启动。
    /// </summary>
    public static int KillStuckProcesses(string? preferExePath = null)
    {
        var killed = 0;
        foreach (var proc in System.Diagnostics.Process.GetProcessesByName("cloudflared"))
        {
            try
            {
                var path = TryGetImagePath(proc);
                // 能读到路径且与服务注册的不一致时跳过（例如用户手动跑的另一个版本）
                if (preferExePath is not null && path is not null &&
                    !string.Equals(path, preferExePath, StringComparison.OrdinalIgnoreCase))
                {
                    continue;
                }
                proc.Kill(entireProcessTree: true);
                proc.WaitForExit(8000);
                killed++;
            }
            catch
            {
                // 没权限或进程刚好退了：忽略
            }
            finally
            {
                proc.Dispose();
            }
        }
        return killed;
    }

    private static string? TryGetImagePath(System.Diagnostics.Process proc)
    {
        try
        {
            return proc.MainModule?.FileName;
        }
        catch
        {
            return null;
        }
    }

    /// <summary>取 <c>KEY  : value</c> 形式的字段值（只认带冒号的那一行，跳过括号里的补充说明）。</summary>
    private static string ReadField(string output, string key)
    {
        foreach (var raw in output.Split('\n'))
        {
            var line = raw.TrimEnd('\r');
            if (!line.Contains(':') || !line.Contains(key, StringComparison.OrdinalIgnoreCase)) continue;
            if (line.Contains("EXIT_CODE", StringComparison.OrdinalIgnoreCase)) continue;
            var parts = line.Split(':', 2);
            if (parts.Length < 2) continue;
            var value = parts[1].Trim();
            if (value.Length == 0) continue;
            return value;
        }
        return "";
    }

    /// <summary>取原始值（保留空格与引号），用于 BINARY_PATH_NAME 这种含参数的字段。</summary>
    private static string? ReadRawField(string output, string key)
    {
        foreach (var raw in output.Split('\n'))
        {
            var line = raw.TrimEnd('\r');
            var index = line.IndexOf(key, StringComparison.OrdinalIgnoreCase);
            if (index < 0) continue;
            var colon = line.IndexOf(':', index);
            if (colon < 0) continue;
            var value = line[(colon + 1)..].Trim();
            if (value.Length > 0) return value;
        }
        return null;
    }

    private static string LastToken(string value)
    {
        var tokens = value.Split(' ', StringSplitOptions.RemoveEmptyEntries);
        return tokens.Length == 0 ? "" : tokens[^1];
    }

    /// <summary>跑一次 sc.exe，返回退出码与合并后的输出。</summary>
    public static (int ExitCode, string Output) Run(string fileName, string arguments)
    {
        try
        {
            var psi = new System.Diagnostics.ProcessStartInfo(fileName, arguments)
            {
                UseShellExecute = false,
                CreateNoWindow = true,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                StandardOutputEncoding = Encoding.Latin1,
                StandardErrorEncoding = Encoding.Latin1,
            };
            using var proc = System.Diagnostics.Process.Start(psi);
            if (proc is null) return (-1, "");
            var text = proc.StandardOutput.ReadToEnd() + proc.StandardError.ReadToEnd();
            proc.WaitForExit(10000);
            return (proc.HasExited ? proc.ExitCode : -1, text);
        }
        catch (Exception ex)
        {
            return (-1, ex.Message);
        }
    }
}
