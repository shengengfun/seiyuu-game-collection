using Microsoft.Win32;

namespace SeiyuuGuessLauncher;

/// <summary>开机自启：写在 HKCU\...\Run 下，无需管理员权限。</summary>
public static class Autostart
{
    private const string RunKey = @"Software\Microsoft\Windows\CurrentVersion\Run";
    public const string ValueName = "SeiyuuGuessLauncher";

    /// <summary>带 --silent 的命令行：开机时静默拉起服务，不弹窗口。</summary>
    public static string SilentCommandLine(string exePath) => $"\"{exePath}\" --silent";

    public static bool IsEnabled()
    {
        try
        {
            using var key = Registry.CurrentUser.OpenSubKey(RunKey, false);
            return key?.GetValue(ValueName) is string value && value.Length > 0;
        }
        catch
        {
            return false;
        }
    }

    public static string? CurrentCommandLine()
    {
        try
        {
            using var key = Registry.CurrentUser.OpenSubKey(RunKey, false);
            return key?.GetValue(ValueName) as string;
        }
        catch
        {
            return null;
        }
    }

    /// <summary>启用/取消开机自启，返回是否写入成功。</summary>
    public static bool SetEnabled(bool enabled, string exePath)
    {
        try
        {
            using var key = Registry.CurrentUser.CreateSubKey(RunKey, true);
            if (key is null) return false;
            if (enabled)
            {
                key.SetValue(ValueName, SilentCommandLine(exePath), RegistryValueKind.String);
            }
            else
            {
                key.DeleteValue(ValueName, false);
            }
            return true;
        }
        catch
        {
            return false;
        }
    }
}
