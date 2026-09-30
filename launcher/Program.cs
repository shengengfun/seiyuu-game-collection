namespace SeiyuuGuessLauncher;

internal static class Program
{
    private const string MutexName = @"Local\SeiyuuGuessLauncher.SingleInstance";
    private const string ShowEventName = @"Local\SeiyuuGuessLauncher.ShowWindow";

    [STAThread]
    private static void Main(string[] args)
    {
        ApplicationConfiguration.Initialize();

        var config = AppConfig.Load(AppContext.BaseDirectory);
        var services = new ServiceManager(config);

        var silent = args.Any(a => a.Equals("--silent", StringComparison.OrdinalIgnoreCase)
                                  || a.Equals("-s", StringComparison.OrdinalIgnoreCase));
        var skipServices = args.Any(a => a.Equals("--no-services", StringComparison.OrdinalIgnoreCase));

        // 命令行快捷用法（方便写进 .bat / 计划任务），这些是一次性命令，不参与单实例判断：
        //   --start  启动服务后退出
        //   --stop   停止服务后退出
        //   --mode preview|dev|off  改写前端托管方式后退出
        //   --tunnel service|process|off  改写隧道托管方式后退出
        //   --tunnel-status  打印隧道诊断到 logs/launcher.log
        //   --fix-tunnel  检查并修复隧道（界面提权后会带这个参数再跑一次自己）
        //   --autostart on|off  开关开机自启后退出
        var modeIndex = Array.FindIndex(args, a => a.Equals("--mode", StringComparison.OrdinalIgnoreCase));
        if (modeIndex >= 0 && modeIndex + 1 < args.Length)
        {
            var mode = AppConfig.ParseMode(args[modeIndex + 1]);
            config.ClientModeName = AppConfig.FormatMode(mode);
            config.Save();
            LogCli(services, config, "mode", $"前端模式已设为 {config.ClientModeName}（{AppConfig.DescribeMode(mode)}）");
            return;
        }
        var tunnelIndex = Array.FindIndex(args, a => a.Equals("--tunnel", StringComparison.OrdinalIgnoreCase));
        if (tunnelIndex >= 0 && tunnelIndex + 1 < args.Length)
        {
            var mode = AppConfig.ParseTunnelMode(args[tunnelIndex + 1]);
            config.TunnelModeName = AppConfig.FormatTunnelMode(mode);
            config.Save();
            LogCli(services, config, "tunnel", $"隧道托管已设为 {config.TunnelModeName}（{AppConfig.DescribeTunnelMode(mode)}）");
            return;
        }
        if (args.Any(a => a.Equals("--tunnel-status", StringComparison.OrdinalIgnoreCase)))
        {
            LogCli(services, config, "tunnel-status", services.DescribeTunnelState());
            return;
        }
        if (args.Any(a => a.Equals("--fix-tunnel", StringComparison.OrdinalIgnoreCase)))
        {
            var result = services.RepairTunnel();
            LogCli(services, config, "fix-tunnel", result);
            if (!silent)
            {
                MessageBox.Show(result, "声优情报站启动器 · 隧道修复", MessageBoxButtons.OK, MessageBoxIcon.Information);
            }
            return;
        }
        if (args.Any(a => a.Equals("--start", StringComparison.OrdinalIgnoreCase)))
        {
            LogCli(services, config, "start", services.StartAll());
            return;
        }
        if (args.Any(a => a.Equals("--stop", StringComparison.OrdinalIgnoreCase)))
        {
            LogCli(services, config, "stop", services.StopAll());
            return;
        }
        var autoIndex = Array.FindIndex(args, a => a.Equals("--autostart", StringComparison.OrdinalIgnoreCase));
        if (autoIndex >= 0)
        {
            var turnOn = autoIndex + 1 < args.Length && args[autoIndex + 1].Equals("on", StringComparison.OrdinalIgnoreCase);
            var ok = Autostart.SetEnabled(turnOn, Application.ExecutablePath);
            LogCli(services, config, "autostart", ok
                ? (turnOn ? "已开启：" + Autostart.CurrentCommandLine() : "已关闭")
                : "失败（注册表不可写）");
            return;
        }

        using var mutex = new Mutex(true, MutexName, out var isFirstInstance);
        using var showEvent = new EventWaitHandle(false, EventResetMode.AutoReset, ShowEventName);

        if (!isFirstInstance)
        {
            // 已有实例在跑：让它把窗口弹出来（开机静默启动时不打扰用户）
            if (!silent) showEvent.Set();
            return;
        }

        if (!silent && !File.Exists(config.ServerEntry))
        {
            // 没构建过就别默默失败：正常模式下提示一声（静默开机时不打扰用户）
            MessageBox.Show(
                $"找不到服务端构建产物：{config.ServerEntry}\n\n请先在仓库根目录执行 pnpm build，或打开启动器点「重新构建」。",
                "声优情报站启动器",
                MessageBoxButtons.OK,
                MessageBoxIcon.Warning);
        }

        var context = new TrayContext(config, services, showEvent, silent);

        if (!silent)
        {
            context.ShowWindow();
        }
        else if (config.StartServicesOnBoot && !skipServices)
        {
            services.StartAll();
        }

        Application.Run(context);
    }

    /// <summary>命令行模式下把结果追加到 logs/launcher.log（WinExe 没有控制台）。</summary>
    private static void LogCli(ServiceManager services, AppConfig config, string action, string result)
    {
        try
        {
            Directory.CreateDirectory(config.LogDirectory);
            var line = $"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] {action}: {result}{Environment.NewLine}";
            File.AppendAllText(Path.Combine(config.LogDirectory, "launcher.log"), line, System.Text.Encoding.UTF8);
        }
        catch
        {
            // ignore
        }
        services.Dispose();
    }
}
