namespace SeiyuuGuessLauncher;

/// <summary>托盘驻留 + 主窗口宿主。静默模式下只创建托盘，不显示窗口。</summary>
public sealed class TrayContext : ApplicationContext
{
    private readonly AppConfig _config;
    private readonly ServiceManager _services;
    private readonly MainForm _form;
    private readonly NotifyIcon _tray;
    private readonly EventWaitHandle _showEvent;
    private readonly Thread _showThread;
    private readonly SynchronizationContext _ui;

    public TrayContext(AppConfig config, ServiceManager services, EventWaitHandle showEvent, bool silent)
    {
        _config = config;
        _services = services;
        _showEvent = showEvent;

        _form = new MainForm(config, services);
        // 表单已创建，此时 WinForms 的 SynchronizationContext 已安装，可用于把后台结果送回 UI 线程
        _ui = SynchronizationContext.Current ?? new SynchronizationContext();

        _tray = new NotifyIcon
        {
            Icon = SystemIcons.Application,
            Visible = true,
            Text = "声优情报站启动器",
            ContextMenuStrip = BuildMenu(),
        };
        _tray.DoubleClick += (_, _) => ShowWindow();

        if (silent)
        {
            _tray.BalloonTipTitle = "声优情报站启动器";
            _tray.BalloonTipText = "已在后台启动，双击托盘图标可打开控制台。";
            _tray.ShowBalloonTip(4000);
        }

        _showThread = new Thread(() =>
        {
            while (true)
            {
                try
                {
                    if (!_showEvent.WaitOne()) continue;
                    if (_form.IsDisposed) return;
                    _form.BeginInvoke(ShowWindow);
                }
                catch (ObjectDisposedException)
                {
                    return;
                }
                catch (ThreadInterruptedException)
                {
                    return;
                }
            }
        })
        {
            IsBackground = true,
            Name = "show-window-listener",
        };
        _showThread.Start();
    }

    private ContextMenuStrip BuildMenu()
    {
        var menu = new ContextMenuStrip();
        menu.Items.Add("打开控制台", null, (_, _) => ShowWindow());
        menu.Items.Add(new ToolStripSeparator());
        menu.Items.Add($"启动服务（后端 :{_config.ServerPort}）", null, (_, _) => RunInBackground(() => _services.StartAll()));
        menu.Items.Add(ClientMenuLabel(), null, (_, _) => RunInBackground(() => _services.StartClient()));
        menu.Items.Add(BuildModeMenu());
        menu.Items.Add(BuildTunnelMenu());
        menu.Items.Add(new ToolStripSeparator());
        menu.Items.Add("停止全部服务", null, (_, _) => RunInBackground(() => _services.StopAll()));
        menu.Items.Add(new ToolStripSeparator());
        menu.Items.Add($"打开本机站点(:{_config.LocalSitePort})", null, (_, _) =>
        {
            // 打开前再确保一次代理例外，避免浏览器走代理访问 localhost 连不上
            ProxyBypass.EnsureSystemBypass();
            SysProbe.OpenShell($"http://localhost:{_config.LocalSitePort}");
        });
        if (_config.PublicSiteUrl is { } publicUrl)
        {
            var publicItem = new ToolStripMenuItem("打开公网站点");
            publicItem.Click += (_, _) => SysProbe.OpenShell(publicUrl);
            menu.Items.Add(publicItem);
        }
        menu.Items.Add("打开日志目录", null, (_, _) => SysProbe.OpenShell(_config.LogDirectory));
        menu.Items.Add(new ToolStripSeparator());
        menu.Items.Add("退出（服务继续运行）", null, (_, _) => ExitThread());
        menu.Items.Add("退出并停止服务", null, (_, _) =>
        {
            _services.StopAll();
            ExitThread();
        });
        return menu;
    }

    private string ClientMenuLabel() =>
        _config.Mode == ClientMode.Dev ? $"启动前端开发服务器（:{_config.ClientPort}）"
        : _config.Mode == ClientMode.Off ? "前端服务未启用（模式 off）"
        : $"启动前端预览服务（:{_config.ClientPort}）";

    /// <summary>
    /// 托盘菜单里的启停别卡住消息循环：启动要等后端端口就绪（可能十几秒），
    /// 阻塞在 UI 线程上会让托盘菜单整个卡住。结果用气泡提示回报。
    /// </summary>
    private void RunInBackground(Func<string> action)
    {
        Task.Run(action).ContinueWith(
            task =>
            {
                var text = task.Status == TaskStatus.RanToCompletion
                    ? task.Result
                    : "操作失败：" + (task.Exception?.GetBaseException().Message ?? "未知错误");
                _ui.Post(_ => ShowStatus(text), null);
            },
            TaskScheduler.Default);
    }

    private void ShowStatus(string text)
    {
        try
        {
            _tray.ShowBalloonTip(4000, "声优情报站启动器", text, ToolTipIcon.Info);
        }
        catch
        {
            // 托盘图标已销毁，忽略
        }
    }

    /// <summary>
    /// 前端托管方式子菜单。隧道源站就是这个端口，所以这里等于「公网给什么内容」的开关：
    /// 预览 = 构建产物（快），开发 = vite dev（调试用，公网会明显变慢）。
    /// </summary>
    private ToolStripMenuItem BuildModeMenu()
    {
        var root = new ToolStripMenuItem($"前端 :{_config.ClientPort} 模式");
        AddModeItem(root, ClientMode.Preview);
        AddModeItem(root, ClientMode.Dev);
        AddModeItem(root, ClientMode.Off);
        return root;
    }

    private void AddModeItem(ToolStripMenuItem root, ClientMode mode)
    {
        var item = new ToolStripMenuItem(AppConfig.DescribeMode(mode))
        {
            Checked = _config.Mode == mode,
        };
        item.Click += (_, _) => ApplyMode(mode);
        root.DropDownItems.Add(item);
    }

    /// <summary>切换前端模式：写回 config.json，并让主窗口的下拉框同步。</summary>
    private void ApplyMode(ClientMode mode)
    {
        if (mode == _config.Mode)
        {
            _tray.ShowBalloonTip(3000, "声优情报站启动器", $"前端已经是「{AppConfig.DescribeMode(mode)}」", ToolTipIcon.Info);
            return;
        }
        _config.ClientModeName = AppConfig.FormatMode(mode);
        _config.Save();
        _form.SyncModeUi();
        RefreshMenu();
        _tray.ShowBalloonTip(
            4000,
            "声优情报站启动器",
            $"前端模式已改为「{AppConfig.DescribeMode(mode)}」，点「重启服务」立即生效。",
            ToolTipIcon.Info);
    }

    private void RefreshMenu()
    {
        var old = _tray.ContextMenuStrip;
        _tray.ContextMenuStrip = BuildMenu();
        old?.Dispose();
    }

    /// <summary>
    /// 隧道子菜单。公网入口靠它顶着，所以把「查 / 修」放在一级位置：
    /// 服务方式下点一下就是重启系统服务，提权失败会自动退回自拉进程兑底。
    /// </summary>
    private ToolStripMenuItem BuildTunnelMenu()
    {
        var root = new ToolStripMenuItem(_config.Tunnel switch
        {
            TunnelMode.Off => "Cloudflare 隧道（不管理）",
            TunnelMode.Process => "Cloudflare 隧道（启动器自拉）",
            _ => $"Cloudflare 隧道（系统服务 {_config.TunnelServiceName}）",
        });

        root.DropDownItems.Add("启动 / 修复隧道", null, (_, _) => RunInBackground(() => _services.RepairTunnel()));
        root.DropDownItems.Add("启动隧道（缺了才补）", null, (_, _) => RunInBackground(() => _services.StartTunnel()));
        root.DropDownItems.Add(new ToolStripSeparator());
        AddTunnelModeItem(root, TunnelMode.Service);
        AddTunnelModeItem(root, TunnelMode.Process);
        AddTunnelModeItem(root, TunnelMode.Off);
        if (_config.PublicSiteUrl is { } url)
        {
            root.DropDownItems.Add(new ToolStripSeparator());
            root.DropDownItems.Add("公网健康检查（/api/health）", null, (_, _) => SysProbe.OpenShell(url.TrimEnd('/') + "/api/health"));
        }
        return root;
    }

    private void AddTunnelModeItem(ToolStripMenuItem root, TunnelMode mode)
    {
        var item = new ToolStripMenuItem(AppConfig.DescribeTunnelMode(mode))
        {
            Checked = _config.Tunnel == mode,
        };
        item.Click += (_, _) => ApplyTunnelMode(mode);
        root.DropDownItems.Add(item);
    }

    private void ApplyTunnelMode(TunnelMode mode)
    {
        if (mode == _config.Tunnel)
        {
            _tray.ShowBalloonTip(3000, "声优情报站启动器", $"隧道已经是「{AppConfig.DescribeTunnelMode(mode)}」", ToolTipIcon.Info);
            return;
        }
        _config.TunnelModeName = AppConfig.FormatTunnelMode(mode);
        _config.Save();
        _form.SyncModeUi();
        RefreshMenu();
        _tray.ShowBalloonTip(4000, "声优情报站启动器",
            $"隧道托管已改为「{AppConfig.DescribeTunnelMode(mode)}」，用托盘菜单里的「启动 / 修复隧道」立即生效。",
            ToolTipIcon.Info);
    }

    public void ShowWindow()
    {
        if (_form.IsDisposed) return;
        _form.ShowAndActivate();
    }

    protected override void Dispose(bool disposing)
    {
        if (disposing)
        {
            _tray.Visible = false;
            _tray.Dispose();
            _services.Dispose();
            _form.Dispose();
        }
        base.Dispose(disposing);
    }
}
