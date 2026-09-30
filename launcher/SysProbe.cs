using System.Diagnostics;
using System.Net;
using System.Net.Sockets;

namespace SeiyuuGuessLauncher;

/// <summary>端口探测 / 端口占用进程查询 / node 路径解析。</summary>
public static class SysProbe
{
    /// <summary>端口是否已被监听（本机回环）。</summary>
    public static bool IsPortListening(int port)
    {
        try
        {
            using var client = new TcpClient();
            var task = client.ConnectAsync(IPAddress.Loopback, port);
            if (!task.Wait(350)) return false;
            return client.Connected;
        }
        catch
        {
            return false;
        }
    }

    /// <summary>
    /// 一次 netstat 查出多个端口各自的监听进程 PID（查不到的端口不会出现在结果里）。
    ///
    /// 界面每秒刷新一次状态，v1 是每个端口各起一次 netstat：进程创建 + 输出解析每秒两遍，
    /// 属于纯浪费。这里合并成一次调用，并由调用方加 TTL 缓存。
    /// </summary>
    public static Dictionary<int, int> PortOwnerPids(IEnumerable<int> ports)
    {
        var result = new Dictionary<int, int>();
        var wanted = new HashSet<int>(ports.Where(port => port > 0));
        if (wanted.Count == 0) return result;

        try
        {
            var psi = new ProcessStartInfo("netstat.exe", "-ano -p TCP")
            {
                UseShellExecute = false,
                CreateNoWindow = true,
                RedirectStandardOutput = true,
            };
            using var proc = Process.Start(psi);
            if (proc is null) return result;
            var output = proc.StandardOutput.ReadToEnd();
            proc.WaitForExit(4000);

            foreach (var raw in output.Split('\n'))
            {
                var line = raw.Trim();
                if (!line.Contains("LISTENING", StringComparison.OrdinalIgnoreCase)) continue;
                var parts = line.Split(' ', StringSplitOptions.RemoveEmptyEntries);
                if (parts.Length < 5) continue;
                // TCP  0.0.0.0:3000  0.0.0.0:0  LISTENING  1234
                var local = parts[1];
                var colon = local.LastIndexOf(':');
                if (colon < 0) continue;
                if (!int.TryParse(local.AsSpan(colon + 1), out var port)) continue;
                if (!wanted.Contains(port)) continue;
                if (!int.TryParse(parts[^1], out var pid)) continue;
                result[port] = pid;
            }
        }
        catch
        {
            // ignore
        }
        return result;
    }

    /// <summary>用 netstat 找出监听该端口的进程 ID（找不到返回 0）。</summary>
    public static int PortOwnerPid(int port) =>
        PortOwnerPids(new[] { port }).TryGetValue(port, out var pid) ? pid : 0;

    /// <summary>结束进程（含子进程）。返回是否成功。</summary>
    public static bool KillProcessTree(int pid)
    {
        if (pid <= 0) return false;
        try
        {
            var psi = new ProcessStartInfo("taskkill.exe", $"/F /T /PID {pid}")
            {
                UseShellExecute = false,
                CreateNoWindow = true,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
            };
            using var proc = Process.Start(psi);
            proc?.WaitForExit(8000);
            return proc is { ExitCode: 0 };
        }
        catch
        {
            return false;
        }
    }

    public static bool IsProcessRunning(string processName)
    {
        try
        {
            return Process.GetProcessesByName(processName).Length > 0;
        }
        catch
        {
            return false;
        }
    }

    /// <summary>找 node.exe：配置 &gt; PATH &gt; 常见安装目录。</summary>
    public static string? ResolveNode(string configured)
    {
        if (!string.IsNullOrWhiteSpace(configured) && File.Exists(configured)) return configured;

        foreach (var path in EnumeratePathCandidates("node.exe"))
        {
            if (File.Exists(path)) return path;
        }

        var fromWhere = RunAndRead("where.exe", "node");
        if (!string.IsNullOrWhiteSpace(fromWhere))
        {
            var first = fromWhere.Split('\n').Select(l => l.Trim()).FirstOrDefault(l => l.Length > 0);
            if (first is not null && File.Exists(first)) return first;
        }

        var programFiles = Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles);
        var direct = Path.Combine(programFiles, "nodejs", "node.exe");
        if (File.Exists(direct)) return direct;

        foreach (var root in new[] { @"C:\tools", @"C:\Program Files\nodejs" })
        {
            if (!Directory.Exists(root)) continue;
            try
            {
                var hit = Directory.EnumerateDirectories(root, "node-*")
                    .Select(d => Path.Combine(d, "node.exe"))
                    .FirstOrDefault(File.Exists);
                if (hit is not null) return hit;
            }
            catch
            {
                // ignore
            }
        }

        return null;
    }

    private static IEnumerable<string> EnumeratePathCandidates(string fileName)
    {
        var path = Environment.GetEnvironmentVariable("PATH") ?? "";
        foreach (var dir in path.Split(';', StringSplitOptions.RemoveEmptyEntries))
        {
            string candidate;
            try
            {
                candidate = Path.Combine(dir.Trim(), fileName);
            }
            catch
            {
                continue;
            }
            yield return candidate;
        }
    }

    public static string RunAndRead(string fileName, string arguments)
    {
        try
        {
            var psi = new ProcessStartInfo(fileName, arguments)
            {
                UseShellExecute = false,
                CreateNoWindow = true,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
            };
            using var proc = Process.Start(psi);
            if (proc is null) return "";
            var output = proc.StandardOutput.ReadToEnd();
            proc.WaitForExit(6000);
            return output;
        }
        catch
        {
            return "";
        }
    }

    /// <summary>打开资源管理器 / 默认浏览器。</summary>
    public static void OpenShell(string target)
    {
        try
        {
            Process.Start(new ProcessStartInfo(target) { UseShellExecute = true });
        }
        catch
        {
            // ignore
        }
    }

    /// <summary>
    /// 以管理员身份再跑一次自己（会弹 UAC）。
    ///
    /// 启停 Windows 服务需要管理员权限（标准用户对服务只有查询权限），
    /// 而启动器平时是普通权限在托盘里跑（开机自启也不该弹 UAC），
    /// 所以只有用户点「修复隧道」且确实被拒绝时才走这条提权路径。
    /// </summary>
    public static bool RunElevated(string exePath, string arguments, out string error)
    {
        try
        {
            Process.Start(new ProcessStartInfo(exePath, arguments)
            {
                UseShellExecute = true,
                Verb = "runas",
            });
            error = "";
            return true;
        }
        catch (System.ComponentModel.Win32Exception ex) when (ex.NativeErrorCode == 1223)
        {
            error = "已取消管理员授权";
            return false;
        }
        catch (Exception ex)
        {
            error = ex.Message;
            return false;
        }
    }
}
