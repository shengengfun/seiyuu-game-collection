using System.Diagnostics;

namespace SeiyuuGuessLauncher;

/// <summary>主窗口：状态灯 + 启停按钮 + 开机自启 + 日志。</summary>
public sealed class MainForm : Form
{
    private readonly AppConfig _config;
    private readonly ServiceManager _services;

    private readonly Label[] _dots = new Label[3];
    private readonly Label[] _names = new Label[3];
    private readonly Label[] _details = new Label[3];
    private readonly Label _message = new();
    private readonly Label _modeHint = new();
    private readonly CheckBox _autoStart = new();
    private readonly ComboBox _clientMode = new();
    private readonly ComboBox _tunnelMode = new();
    private readonly Label _tunnelHint = new();
    private readonly Button _openSite = new();
    private readonly Button _openPublic = new();
    private readonly TextBox _logBox = new();
    private readonly System.Windows.Forms.Timer _timer = new();
    private readonly Button _buildButton = new();

    private string _lastLogText = "";
    private bool _loadingUi = true;
    private bool _busy;
    private bool _refreshing;
    private bool _pendingElevationPrompt;

    public MainForm(AppConfig config, ServiceManager services)
    {
        _config = config;
        _services = services;

        Text = "声优情报站 · 本地启动器";
        Font = new Font("Microsoft YaHei UI", 9F);
        // 布局全部走 TableLayoutPanel + Dock/Percent，配合 DPI 缩放不会出现被挤掉的控件
        AutoScaleMode = AutoScaleMode.Dpi;
        AutoScaleDimensions = new SizeF(96F, 96F);
        ClientSize = new Size(880, 764);
        MinimumSize = new Size(760, 660);
        StartPosition = FormStartPosition.CenterScreen;

        BuildUi();
        LoadAutostartState();
        SyncModeUi();
        _loadingUi = false;

        // 旧配置迁移过一次就提示一次，避免用户以为「明明没改过怎么不一样了」
        if (!string.IsNullOrEmpty(_config.MigrationNote))
        {
            Report("已同步新版设置：" + _config.MigrationNote);
        }

        _timer.Interval = 1000;
        _timer.Tick += (_, _) => RefreshStatus();
        _timer.Start();
    }

    private void BuildUi()
    {
        var root = new TableLayoutPanel
        {
            Dock = DockStyle.Fill,
            ColumnCount = 1,
            RowCount = 6,
            Padding = new Padding(14, 10, 14, 12),
        };
        root.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 100F));
        root.RowStyles.Add(new RowStyle(SizeType.AutoSize));       // 标题
        root.RowStyles.Add(new RowStyle(SizeType.Absolute, 132F)); // 状态
        root.RowStyles.Add(new RowStyle(SizeType.Absolute, 92F));  // 按钮
        root.RowStyles.Add(new RowStyle(SizeType.Absolute, 34F));  // 提示信息
        root.RowStyles.Add(new RowStyle(SizeType.Absolute, 168F)); // 启动选项
        root.RowStyles.Add(new RowStyle(SizeType.Percent, 100F));  // 日志
        Controls.Add(root);

        root.Controls.Add(BuildHeader(), 0, 0);
        root.Controls.Add(BuildStatusGroup(), 0, 1);
        root.Controls.Add(BuildButtons(), 0, 2);
        root.Controls.Add(BuildMessage(), 0, 3);
        root.Controls.Add(BuildOptionsGroup(), 0, 4);
        root.Controls.Add(BuildLogGroup(), 0, 5);
    }

    private Control BuildHeader()
    {
        var panel = new TableLayoutPanel
        {
            Dock = DockStyle.Fill,
            AutoSize = true,
            AutoSizeMode = AutoSizeMode.GrowAndShrink,
            ColumnCount = 1,
            RowCount = 2,
            Margin = new Padding(2, 0, 2, 8),
        };
        panel.RowStyles.Add(new RowStyle(SizeType.AutoSize));
        panel.RowStyles.Add(new RowStyle(SizeType.AutoSize));

        panel.Controls.Add(new Label
        {
            Text = "声优情报站 · 本地启动器",
            Font = new Font("Microsoft YaHei UI", 13F, FontStyle.Bold),
            AutoSize = true,
            Margin = new Padding(0, 0, 0, 2),
        }, 0, 0);

        panel.Controls.Add(new Label
        {
            Text = $"仓库目录：{_config.ResolvedRepoRoot}    node：{_services.NodeExe ?? "(未找到)"}",
            ForeColor = SystemColors.GrayText,
            AutoSize = true,
        }, 0, 1);

        return panel;
    }

    private Control BuildStatusGroup()
    {
        var group = new GroupBox { Text = "服务状态", Dock = DockStyle.Fill, Margin = new Padding(0, 0, 0, 8) };
        var grid = new TableLayoutPanel
        {
            Dock = DockStyle.Fill,
            ColumnCount = 3,
            RowCount = 3,
            Padding = new Padding(10, 6, 10, 6),
        };
        grid.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 28F));
        grid.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 210F));
        grid.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 100F));
        for (var i = 0; i < 3; i++) grid.RowStyles.Add(new RowStyle(SizeType.Percent, 33.3F));

        for (var i = 0; i < 3; i++)
        {
            _dots[i] = new Label
            {
                Text = "●",
                Font = new Font("Segoe UI", 12F),
                ForeColor = SystemColors.GrayText,
                AutoSize = true,
                Anchor = AnchorStyles.Left,
                Margin = new Padding(0, 2, 0, 0),
            };
            grid.Controls.Add(_dots[i], 0, i);

            _names[i] = new Label
            {
                Text = i switch
                {
                    0 => $"后端服务 :{_config.ServerPort}",
                    1 => $"前端服务 :{_config.ClientPort}",
                    _ => "Cloudflare 隧道",
                },
                AutoSize = true,
                Anchor = AnchorStyles.Left,
                Margin = new Padding(0),
            };
            grid.Controls.Add(_names[i], 1, i);

            _details[i] = new Label
            {
                Text = "检测中…",
                ForeColor = SystemColors.GrayText,
                AutoSize = false,
                AutoEllipsis = true,
                Dock = DockStyle.Fill,
                TextAlign = ContentAlignment.MiddleLeft,
                Margin = new Padding(0),
            };
            grid.Controls.Add(_details[i], 2, i);
        }

        group.Controls.Add(grid);
        return group;
    }

    private Control BuildButtons()
    {
        var stack = new TableLayoutPanel
        {
            Dock = DockStyle.Fill,
            ColumnCount = 1,
            RowCount = 2,
            Margin = new Padding(0, 0, 0, 4),
        };
        stack.RowStyles.Add(new RowStyle(SizeType.Absolute, 40F));
        stack.RowStyles.Add(new RowStyle(SizeType.Absolute, 40F));
        stack.Controls.Add(MakeRow(
            MakeButton("启动服务", (_, _) => RunBackground("正在启动服务…", () => _services.StartAll())),
            MakeButton("停止服务", (_, _) => Confirm("确定停止所有服务吗？", () => RunBackground("正在停止服务…", () => _services.StopAll()))),
            MakeButton("重启服务", (_, _) => Confirm("确定重启服务吗？", () => RunBackground("正在重启服务…", Restart))),
            MakeButton("修复隧道", (_, _) => Confirm("重新检测公网隧道，必要时重启隧道服务？", () => RunBackground("正在检查并修复隧道…", RepairTunnel)))
        ), 0, 0);

        _buildButton.Text = "重新构建";
        _buildButton.AutoSize = true;
        _buildButton.Padding = new Padding(10, 3, 10, 3);
        _buildButton.Margin = new Padding(0, 0, 8, 0);
        _buildButton.Click += (_, _) => Confirm("重新构建（PoW 产物 + 前端 + 后端）？构建期间页面可能短暂不可用。", () => Report(_services.StartBuild()));

        _openSite.Text = "打开本机站点";
        _openSite.AutoSize = true;
        _openSite.Padding = new Padding(10, 3, 10, 3);
        _openSite.Margin = new Padding(0, 0, 8, 0);
        _openSite.Click += (_, _) =>
        {
            // 打开前再确保一次代理例外：Clash 等工具切换系统代理时会重写这份列表，
            // 浏览器走代理访问 localhost 会直接连不上
            ProxyBypass.EnsureSystemBypass();
            SysProbe.OpenShell($"http://localhost:{_config.LocalSitePort}");
        };

        _openPublic.Text = "打开公网站点";
        _openPublic.AutoSize = true;
        _openPublic.Padding = new Padding(10, 3, 10, 3);
        _openPublic.Margin = new Padding(0, 0, 8, 0);
        _openPublic.Enabled = _config.PublicSiteUrl is not null;
        _openPublic.Click += (_, _) =>
        {
            if (_config.PublicSiteUrl is { } url) SysProbe.OpenShell(url);
        };

        stack.Controls.Add(MakeRow(
            _openSite,
            _openPublic,
            MakeButton("打开日志目录", (_, _) => SysProbe.OpenShell(_config.LogDirectory)),
            _buildButton
        ), 0, 1);
        return stack;
    }

    private static FlowLayoutPanel MakeRow(params Control[] controls)
    {
        var row = new FlowLayoutPanel
        {
            Dock = DockStyle.Fill,
            AutoSize = false,
            WrapContents = false,
            Margin = new Padding(0),
        };
        row.Controls.AddRange(controls);
        return row;
    }

    private Control BuildMessage()
    {
        _message.AutoSize = false;
        _message.Dock = DockStyle.Fill;
        _message.AutoEllipsis = true;
        _message.TextAlign = ContentAlignment.MiddleLeft;
        _message.ForeColor = Color.FromArgb(0, 102, 204);
        _message.Margin = new Padding(2, 0, 2, 6);
        return _message;
    }

    private Control BuildOptionsGroup()
    {
        var group = new GroupBox { Text = "启动选项", Dock = DockStyle.Fill, Margin = new Padding(0, 0, 0, 8) };

        var panel = new TableLayoutPanel
        {
            Dock = DockStyle.Fill,
            ColumnCount = 1,
            RowCount = 4,
            Padding = new Padding(10, 4, 10, 4),
        };
        panel.RowStyles.Add(new RowStyle(SizeType.Absolute, 26F));
        panel.RowStyles.Add(new RowStyle(SizeType.Absolute, 30F));
        panel.RowStyles.Add(new RowStyle(SizeType.Absolute, 30F));
        panel.RowStyles.Add(new RowStyle(SizeType.Percent, 100F));

        _autoStart.Text = "开机静默自启（后台拉起服务，不弹出窗口）";
        _autoStart.AutoSize = true;
        _autoStart.CheckedChanged += OnAutoStartChanged;
        panel.Controls.Add(_autoStart, 0, 0);

        // 前端托管方式：隧道源站就是 5173，所以这一项直接决定公网加载速度
        var modeRow = new TableLayoutPanel
        {
            Dock = DockStyle.Fill,
            ColumnCount = 3,
            RowCount = 1,
            Margin = new Padding(0),
        };
        modeRow.ColumnStyles.Add(new ColumnStyle(SizeType.AutoSize));
        modeRow.ColumnStyles.Add(new ColumnStyle(SizeType.AutoSize));
        modeRow.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 100F));
        modeRow.Controls.Add(new Label
        {
            Text = $"前端 :{_config.ClientPort} 模式",
            AutoSize = true,
            Anchor = AnchorStyles.Left,
            Margin = new Padding(0, 6, 8, 0),
        }, 0, 0);

        _clientMode.DropDownStyle = ComboBoxStyle.DropDownList;
        _clientMode.Items.AddRange(new object[]
        {
            "构建产物预览（推荐）",
            "开发模式（前端热更新）",
            "不管理（隧道源站指向后端）",
        });
        _clientMode.Width = 210;
        _clientMode.Anchor = AnchorStyles.Left;
        _clientMode.Margin = new Padding(0);
        _clientMode.SelectedIndex = _config.Mode switch
        {
            ClientMode.Dev => 1,
            ClientMode.Off => 2,
            _ => 0,
        };
        _clientMode.SelectedIndexChanged += OnClientModeChanged;
        modeRow.Controls.Add(_clientMode, 1, 0);

        _modeHint.AutoSize = true;
        _modeHint.ForeColor = SystemColors.GrayText;
        _modeHint.Anchor = AnchorStyles.Left;
        _modeHint.Margin = new Padding(8, 6, 0, 0);
        modeRow.Controls.Add(_modeHint, 2, 0);
        panel.Controls.Add(modeRow, 0, 1);

        // 隧道托管方式：默认交给 Windows 系统服务（开机由 Windows 拉起、断了自己修）。
        // 这一步是 Error 1033 的根治点：公网入口不该依赖「启动器有没有在跑」。
        var tunnelRow = new TableLayoutPanel
        {
            Dock = DockStyle.Fill,
            ColumnCount = 3,
            RowCount = 1,
            Margin = new Padding(0),
        };
        tunnelRow.ColumnStyles.Add(new ColumnStyle(SizeType.AutoSize));
        tunnelRow.ColumnStyles.Add(new ColumnStyle(SizeType.AutoSize));
        tunnelRow.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 100F));
        tunnelRow.Controls.Add(new Label
        {
            Text = "公网隧道托管",
            AutoSize = true,
            Anchor = AnchorStyles.Left,
            Margin = new Padding(0, 6, 8, 0),
        }, 0, 0);

        _tunnelMode.DropDownStyle = ComboBoxStyle.DropDownList;
        _tunnelMode.Items.AddRange(new object[]
        {
            "系统服务（推荐，开机自启）",
            "启动器自拉进程",
            "不管理（只看状态）",
        });
        _tunnelMode.Width = 210;
        _tunnelMode.Anchor = AnchorStyles.Left;
        _tunnelMode.Margin = new Padding(0);
        _tunnelMode.SelectedIndex = _config.Tunnel switch
        {
            TunnelMode.Process => 1,
            TunnelMode.Off => 2,
            _ => 0,
        };
        _tunnelMode.SelectedIndexChanged += OnTunnelModeChanged;
        tunnelRow.Controls.Add(_tunnelMode, 1, 0);

        _tunnelHint.AutoSize = true;
        _tunnelHint.ForeColor = SystemColors.GrayText;
        _tunnelHint.Anchor = AnchorStyles.Left;
        _tunnelHint.Margin = new Padding(8, 6, 0, 0);
        tunnelRow.Controls.Add(_tunnelHint, 2, 0);
        panel.Controls.Add(tunnelRow, 0, 2);

        panel.Controls.Add(new Label
        {
            // 隧道源站由 Cloudflare 后台决定：当前部署指向本机 3000（后端同源托管前端产物），
            // 本机 5173 只影响本机访问/调试速度，别把它当成公网入口。
            Text = $"公网隧道的源站以 Cloudflare 后台路由为准（当前部署 → 本机 {_config.ServerPort}，后端同源托管前端产物）；" +
                   $"本机 :{_config.ClientPort} 只用于本地预览/调试。",
            ForeColor = SystemColors.GrayText,
            Font = new Font("Microsoft YaHei UI", 8.5F),
            AutoSize = true,
            Anchor = AnchorStyles.Left,
            Margin = new Padding(0, 2, 0, 0),
        }, 0, 3);

        group.Controls.Add(panel);
        return group;
    }

    /// <summary>把 config 里的模式同步到界面（界面 / 托盘都可能改它）。</summary>
    public void SyncModeUi()
    {
        var index = _config.Mode switch
        {
            ClientMode.Dev => 1,
            ClientMode.Off => 2,
            _ => 0,
        };
        if (_clientMode.SelectedIndex != index) _clientMode.SelectedIndex = index;

        _modeHint.Text = _config.Mode switch
        {
            ClientMode.Dev => "dev：未打包未压缩，本机首屏约 4.3MB",
            ClientMode.Off => "off：不管 5173（本地调试用不到就选它）",
            _ => "preview：直接给构建产物，本机首屏约 0.28MB",
        };
        _openSite.Text = $"打开本机站点(:{_config.LocalSitePort})";
        SyncTunnelModeUi();
    }

    /// <summary>把隧道托管方式同步到界面（界面 / 托盘都可能改它）。</summary>
    private void SyncTunnelModeUi()
    {
        var index = _config.Tunnel switch
        {
            TunnelMode.Process => 1,
            TunnelMode.Off => 2,
            _ => 0,
        };
        if (_tunnelMode.SelectedIndex != index) _tunnelMode.SelectedIndex = index;

        _tunnelHint.Text = _config.Tunnel switch
        {
            TunnelMode.Process => "启动器拉进程：启动器退出就断（仅没装系统服务时用）",
            TunnelMode.Off => "不管理：公网隧道需自己维护",
            _ => $"托管系统服务 {_config.TunnelServiceName}：开机自启，断线自己修",
        };
    }

    private void OnClientModeChanged(object? sender, EventArgs e)
    {
        if (_loadingUi) return;
        var mode = _clientMode.SelectedIndex switch
        {
            1 => ClientMode.Dev,
            2 => ClientMode.Off,
            _ => ClientMode.Preview,
        };
        if (mode == _config.Mode) return;
        _config.ClientModeName = AppConfig.FormatMode(mode);
        _config.Save();
        SyncModeUi();
        Report($"前端模式已改为「{AppConfig.DescribeMode(mode)}」（已写入 config.json，点「重启服务」立即生效）");
    }

    private void OnTunnelModeChanged(object? sender, EventArgs e)
    {
        if (_loadingUi) return;
        var mode = _tunnelMode.SelectedIndex switch
        {
            1 => TunnelMode.Process,
            2 => TunnelMode.Off,
            _ => TunnelMode.Service,
        };
        if (mode == _config.Tunnel) return;
        _config.TunnelModeName = AppConfig.FormatTunnelMode(mode);
        _config.Save();
        SyncTunnelModeUi();
        Report($"隧道托管已改为「{AppConfig.DescribeTunnelMode(mode)}」（已写入 config.json，点「修复隧道」立即生效）");
    }

    private Control BuildLogGroup()
    {
        var group = new GroupBox { Text = "日志（server.log / client.log / cloudflared.log / build.log 尾部）", Dock = DockStyle.Fill, Margin = new Padding(0) };

        var refreshLog = new Button { Text = "刷新", AutoSize = true, Padding = new Padding(8, 2, 8, 2), Margin = new Padding(6, 0, 0, 0) };
        refreshLog.Click += (_, _) => UpdateLog(true);
        var clearLog = new Button { Text = "清空日志", AutoSize = true, Padding = new Padding(8, 2, 8, 2), Margin = new Padding(6, 0, 0, 0) };
        clearLog.Click += (_, _) => { _services.ClearLogs(); _lastLogText = ""; UpdateLog(true); };

        // 用 TableLayoutPanel 右对齐按钮：FlowLayoutPanel 在 DPI 缩放下会把按钮挤出可见区域
        var tools = new TableLayoutPanel
        {
            Dock = DockStyle.Fill,
            ColumnCount = 3,
            RowCount = 1,
            AutoSize = true,
            AutoSizeMode = AutoSizeMode.GrowAndShrink,
            Margin = new Padding(0),
        };
        tools.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 100F));
        tools.ColumnStyles.Add(new ColumnStyle(SizeType.AutoSize));
        tools.ColumnStyles.Add(new ColumnStyle(SizeType.AutoSize));
        tools.Controls.Add(new Label { Text = "", AutoSize = true }, 0, 0);
        tools.Controls.Add(refreshLog, 1, 0);
        tools.Controls.Add(clearLog, 2, 0);

        _logBox.Multiline = true;
        _logBox.ReadOnly = true;
        _logBox.ScrollBars = ScrollBars.Both;
        _logBox.WordWrap = false;
        _logBox.Font = new Font("Consolas", 8.5F);
        _logBox.BackColor = Color.FromArgb(250, 250, 251);
        _logBox.Dock = DockStyle.Fill;
        _logBox.Margin = new Padding(0);

        var grid = new TableLayoutPanel
        {
            Dock = DockStyle.Fill,
            ColumnCount = 1,
            RowCount = 2,
            Padding = new Padding(10, 4, 10, 8),
        };
        grid.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 100F));
        grid.RowStyles.Add(new RowStyle(SizeType.AutoSize));
        grid.RowStyles.Add(new RowStyle(SizeType.Percent, 100F));
        grid.Controls.Add(tools, 0, 0);
        grid.Controls.Add(_logBox, 0, 1);

        group.Controls.Add(grid);
        return group;
    }

    private static Button MakeButton(string text, EventHandler onClick)
    {
        var button = new Button { Text = text, AutoSize = true, Padding = new Padding(10, 3, 10, 3), Margin = new Padding(0, 0, 8, 0) };
        button.Click += onClick;
        return button;
    }

    private string Restart()
    {
        _services.StopAll();
        return _services.StartAll();
    }

    /// <summary>
    /// 修复隧道。启停 Windows 服务需要管理员权限，而启动器平时是普通权限在托盘里跑，
    /// 所以被拒时把标记挂起来，等回到 UI 线程再问用户要不要提权重试一次。
    /// </summary>
    private string RepairTunnel()
    {
        var result = _services.RepairTunnel();
        _pendingElevationPrompt = _services.TunnelFixNeedsElevation;
        return result;
    }

    /// <summary>提示用户提权修复（会弹 UAC）。</summary>
    private void AskElevate()
    {
        if (!_pendingElevationPrompt) return;
        _pendingElevationPrompt = false;

        var answer = MessageBox.Show(
            this,
            "启停 Windows 系统服务需要管理员权限。\n\n是否以管理员身份重新修复隧道？（会弹出 UAC 授权窗口）",
            "需要管理员权限",
            MessageBoxButtons.YesNo,
            MessageBoxIcon.Question);
        if (answer != DialogResult.Yes)
        {
            Report("已取消提权：隧道未修复（公网可能仍不可达）");
            return;
        }

        Report(SysProbe.RunElevated(Application.ExecutablePath, "--fix-tunnel", out var error)
            ? "已以管理员身份重新修复隧道，结果会写入 logs/launcher.log"
            : "提权失败：" + error);
    }

    /// <summary>
    /// 把启停这类会阻塞几百毫秒到十几秒的操作放到后台线程。
    /// 启停一个 node 服务要 netstat 找进程、taskkill 结束进程、等端口释放/就绪，
    /// 全都阻塞在 UI 线程上的话窗口会直接卡死。
    /// </summary>
    private void RunBackground(string busyText, Func<string> action)
    {
        if (_busy) return;
        _busy = true;
        _buildButton.Enabled = false;
        Report(busyText);

        Task.Run(action).ContinueWith(
            task =>
            {
                var text = task.Status == TaskStatus.RanToCompletion
                    ? task.Result
                    : "操作失败：" + (task.Exception?.GetBaseException().Message ?? "未知错误");
                if (IsDisposed) return;
                try
                {
                    BeginInvoke(new Action(() =>
                    {
                        _busy = false;
                        _buildButton.Enabled = !_services.IsBuilding;
                        Report(text);
                        // 修隧道被权限挡住时问一句要不要提权重试
                        AskElevate();
                    }));
                }
                catch (ObjectDisposedException)
                {
                    // 窗口已销毁，忽略
                }
            },
            TaskScheduler.Default);
    }

    private void Report(string message)
    {
        _message.Text = $"{DateTime.Now:HH:mm:ss}  {message}";
        RefreshStatus();
    }

    private void Confirm(string question, Action action)
    {
        var result = MessageBox.Show(this, question, "确认", MessageBoxButtons.OKCancel, MessageBoxIcon.Question);
        if (result == DialogResult.OK) action();
    }

    private void LoadAutostartState()
    {
        _autoStart.Checked = Autostart.IsEnabled();
    }

    private void OnAutoStartChanged(object? sender, EventArgs e)
    {
        // 初始化时是把注册表里的现值回填到勾选框，不应该当成一次用户操作
        if (_loadingUi) return;
        var exe = Application.ExecutablePath;
        if (Autostart.SetEnabled(_autoStart.Checked, exe))
        {
            Report(_autoStart.Checked
                ? $"已开启开机自启：{Autostart.CurrentCommandLine()}"
                : "已关闭开机自启");
        }
        else
        {
            Report("写入开机自启失败（注册表不可写）");
        }
    }

    private void RefreshStatus()
    {
        // 快照要 netstat + 读两个日志文件，放到后台线程做，避免每秒卡一下界面
        if (_refreshing) return;
        _refreshing = true;
        Task.Run(() => (_services.Snapshot(), _services.IsBuilding, _services.TailLog(120)))
            .ContinueWith(
                task =>
                {
                    if (IsDisposed) return;
                    try
                    {
                        BeginInvoke(new Action(() =>
                        {
                            _refreshing = false;
                            if (!task.IsCompletedSuccessfully) return;
                            var (rows, building, logText) = task.Result;
                            for (var i = 0; i < rows.Count && i < _dots.Length; i++)
                            {
                                // 绿=正常运行；黄=在跑但公网不通（隧道断了）；灰=没在跑
                                _dots[i].ForeColor = rows[i].State switch
                                {
                                    ServiceState.Up => Color.FromArgb(22, 163, 74),
                                    ServiceState.Warn => Color.FromArgb(217, 119, 6),
                                    _ => SystemColors.GrayText,
                                };
                                _names[i].Text = rows[i].Name;
                                _details[i].Text = rows[i].Detail;
                            }
                            _buildButton.Enabled = !building && !_busy;
                            ApplyLogText(logText);
                        }));
                    }
                    catch (ObjectDisposedException)
                    {
                        // 窗口已销毁，忽略
                    }
                },
                TaskScheduler.Default);
    }

    private void ApplyLogText(string text)
    {
        if (text == _lastLogText) return;
        _lastLogText = text;
        _logBox.Text = text;
        _logBox.SelectionStart = _logBox.TextLength;
        _logBox.ScrollToCaret();
    }

    private void UpdateLog(bool force)
    {
        var text = _services.TailLog(120);
        if (!force && text == _lastLogText) return;
        ApplyLogText(text);
    }

    protected override void OnVisibleChanged(EventArgs e)
    {
        base.OnVisibleChanged(e);
        // 收进托盘后没必要每秒刷：状态灯也没人看，降低刷新频率省 CPU
        _timer.Interval = Visible ? 1000 : 3000;
    }

    protected override void OnFormClosing(FormClosingEventArgs e)
    {
        // 关窗口 = 收进托盘，服务继续跑；要退出请用托盘菜单
        if (e.CloseReason == CloseReason.UserClosing)
        {
            e.Cancel = true;
            Hide();
            return;
        }
        base.OnFormClosing(e);
    }

    public void ShowAndActivate()
    {
        Show();
        if (WindowState == FormWindowState.Minimized) WindowState = FormWindowState.Normal;
        Activate();
        BringToFront();
    }
}
