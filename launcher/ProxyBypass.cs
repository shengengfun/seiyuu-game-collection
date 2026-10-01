using System.Diagnostics;
using Microsoft.Win32;

namespace SeiyuuGuessLauncher;

/// <summary>
/// 直连保障：本项目的流量一律不经过代理。
///
/// 背景：机器上开了系统代理（Clash / v2ray / Steam++ 等）时，浏览器访问
/// <c>http://localhost:3000</c>、<c>http://192.168.*:5173</c> 以及隧道域名
/// <c>homoto-akina.top</c> 的请求会被丢给代理节点，而代理节点到不了本机，
/// 表现就是「网站连不上」。
///
/// 两种处理：
/// <list type="bullet">
///   <item><see cref="PrepareProcess"/>：清空子进程（server / vite / cloudflared）的代理环境变量；</item>
///   <item><see cref="EnsureSystemBypass"/>：把本机与站点地址写进 Windows 代理例外列表，
///   让浏览器直连。Clash 等工具每次开关系统代理都会重写这份列表，所以每次打开网站前都重新确保一次。</item>
/// </list>
/// </summary>
internal static class ProxyBypass
{
    private const string InternetSettingsKey =
        @"Software\Microsoft\Windows\CurrentVersion\Internet Settings";

    /// <summary>必须绕过代理的主机：本机回环、常见局域网段、站点域名。</summary>
    private static readonly string[] RequiredHosts =
    {
        "<local>",
        "localhost",
        "127.*",
        "10.*",
        "172.16.*",
        "192.168.*",
        "homoto-akina.top",
        "www.homoto-akina.top",
        "*.homoto-akina.top",
    };

    /// <summary>会诱导 node / pnpm / 各类 SDK 走代理的环境变量。</summary>
    private static readonly string[] ProxyEnvNames =
    {
        "HTTP_PROXY", "http_proxy",
        "HTTPS_PROXY", "https_proxy",
        "ALL_PROXY", "all_proxy",
        "npm_config_proxy", "npm_config_https_proxy",
    };

    public const string NoProxyValue =
        "localhost,127.0.0.1,::1,192.168.0.108,homoto-akina.top,www.homoto-akina.top,.homoto-akina.top";

    /// <summary>让子进程直连：移除代理环境变量，写入 NO_PROXY。</summary>
    public static void PrepareProcess(ProcessStartInfo psi)
    {
        try
        {
            foreach (var name in ProxyEnvNames) psi.Environment.Remove(name);
            psi.Environment["NO_PROXY"] = NoProxyValue;
            psi.Environment["no_proxy"] = NoProxyValue;
            // Node >= 24 只有在这个变量为 1 时才读环境变量里的代理
            psi.Environment["NODE_USE_ENV_PROXY"] = "0";
        }
        catch
        {
            // 注入环境变量失败不应影响启动服务
        }
    }

    /// <summary>
    /// 确保 Windows 代理例外列表包含本机与站点地址（幂等），返回一句可写进日志的描述。
    /// </summary>
    public static string EnsureSystemBypass()
    {
        try
        {
            using var key = Registry.CurrentUser.OpenSubKey(InternetSettingsKey, writable: true);
            if (key is null) return "系统代理例外：注册表不可写，已跳过";

            var current = ((key.GetValue("ProxyOverride") as string) ?? string.Empty)
                .Split(';', StringSplitOptions.RemoveEmptyEntries)
                .Select(entry => entry.Trim())
                .Where(entry => entry.Length > 0)
                .ToList();

            var missing = RequiredHosts
                .Where(host => !current.Any(entry => string.Equals(entry, host, StringComparison.OrdinalIgnoreCase)))
                .ToArray();

            if (missing.Length == 0) return "系统代理例外已包含本机与站点地址";

            key.SetValue("ProxyOverride", string.Join(";", current.Concat(missing)), RegistryValueKind.String);
            return $"已加入系统代理例外：{string.Join(", ", missing)}";
        }
        catch (Exception ex)
        {
            return "系统代理例外设置失败：" + ex.Message;
        }
    }
}
