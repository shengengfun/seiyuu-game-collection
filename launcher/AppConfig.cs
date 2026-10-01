using System.Text.Json;
using System.Text.Json.Serialization;

namespace SeiyuuGuessLauncher;

/// <summary>
/// 前端（:5173）的托管方式。
///
/// 这个端口是**本机访问/调试**用的预览地址（历史上也曾作为隧道源站；
/// 公网入口现在以 Cloudflare 后台的隧道路由为准，当前指向后端 3000）。
/// <list type="bullet">
///   <item><see cref="Preview"/>：<c>vite preview</c>，直接提供 <c>client/dist</c> 构建产物（默认）；</item>
///   <item><see cref="Dev"/>：<c>vite dev</c>，未打包未压缩、还带 no-store，仅前端调试时用；</item>
///   <item><see cref="Off"/>：不管理 5173。</item>
/// </list>
/// </summary>
public enum ClientMode
{
    Preview,
    Dev,
    Off,
}

/// <summary>
/// 隧道的托管方式。
///
/// 背景：公网入口（Error 1033 = Cloudflare 侧找不到任何隧道连接）最常见的成因就是本机
/// cloudflared 没在跑、或者进程活着但连接已经断了。生产上应当让它跑在 Windows 系统服务里
/// （开机由 Windows 自己拉起、与服务是否被 GUI 拉起无关），启动器负责「检测 + 修复」。
/// <list type="bullet">
///   <item><see cref="Service"/>：托管系统服务 <c>Cloudflared</c>（默认），启动器负责启停与自愈；</item>
///   <item><see cref="Process"/>：由启动器自己拉一个 cloudflared 进程（v1 行为，用于没装服务的机器）；</item>
///   <item><see cref="Off"/>：不管理，只看状态。</item>
/// </list>
/// </summary>
public enum TunnelMode
{
    Service,
    Process,
    Off,
}

/// <summary>启动器配置：写到 launcher/config.json，缺失字段自动补默认值。</summary>
public sealed class AppConfig
{
    /// <summary>仓库根目录（手填的覆盖值）。留空 = 从 exe 位置向上自动查找（含 pnpm-workspace.yaml 的目录）。</summary>
    public string RepoRoot { get; set; } = "";

    /// <summary>后端端口（生产模式下同时托管前端构建产物）。</summary>
    public int ServerPort { get; set; } = 3000;

    /// <summary>前端端口（本地访问/调试；公网入口看 Cloudflare 后台的隧道路由）。</summary>
    public int ClientPort { get; set; }

    /// <summary>前端托管方式：preview（默认）/ dev / off。</summary>
    [JsonPropertyName("ClientMode")]
    public string ClientModeName { get; set; } = "preview";

    /// <summary>node.exe 路径。留空 = 自动查找（PATH / Program Files / C:\tools\node-*）。</summary>
    public string NodeExe { get; set; } = "";

    /// <summary>隧道托管方式：service（默认，托管系统服务）/ process（启动器自己拉起）/ off。</summary>
    [JsonPropertyName("TunnelMode")]
    public string TunnelModeName { get; set; } = "service";

    /// <summary>隧道系统服务名（cloudflared service install 装出来的名字固定是 Cloudflared）。</summary>
    public string TunnelServiceName { get; set; } = "Cloudflared";

    /// <summary>
    /// 启动/自检时发现隧道不通就自动修复（重启服务，或者把启动类型改回「自动」）。
    /// 只在连续探测失败后才动手，避免一次网络抖动就把隧道重启一遍。
    /// </summary>
    public bool AutoHealTunnel { get; set; } = true;

    /// <summary>cloudflared.exe 路径。留空 = 自动查找（系统服务的 BINARY_PATH_NAME → 常见安装目录 → 仓库内）。</summary>
    public string CloudflaredExe { get; set; } = "";

    /// <summary>cloudflared 启动参数。默认走 token 模式（与服务安装脚本一致）。</summary>
    public string CloudflaredArgs { get; set; } = "tunnel run --token-file C:\\ProgramData\\cloudflared\\token";

    /// <summary>开机自启时是否立刻启动服务。</summary>
    public bool StartServicesOnBoot { get; set; } = true;

    /// <summary>启动服务后多久开始探测端口（毫秒）。</summary>
    public int StartupProbeDelayMs { get; set; } = 1200;

    /// <summary>公网站点地址。留空 = 界面与托盘里不出现「打开公网站点」。</summary>
    public string PublicUrl { get; set; } = "https://homoto-akina.top";

    // ---- 旧字段：只在读取时用于迁移，迁移后置空，不再写回 ----

    /// <summary>v1 的前端端口字段。</summary>
    [JsonPropertyName("DevClientPort")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public int? LegacyDevClientPort { get; set; }

    /// <summary>v1 的「启动时同时拉起前端开发服务器」字段。</summary>
    [JsonPropertyName("StartDevClient")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public bool? LegacyStartDevClient { get; set; }

    // ---- 运行时使用 ----

    [JsonIgnore]
    public string ConfigPath { get; set; } = "";

    /// <summary>加载时做过的配置迁移说明（供界面提示一次），无迁移则为空串。</summary>
    [JsonIgnore]
    public string MigrationNote { get; set; } = "";

    [JsonIgnore]
    public ClientMode Mode => ParseMode(ClientModeName);

    [JsonIgnore]
    public TunnelMode Tunnel => ParseTunnelMode(TunnelModeName);

    public static ClientMode ParseMode(string? value) =>
        value?.Trim().ToLowerInvariant() switch
        {
            "dev" => ClientMode.Dev,
            "off" => ClientMode.Off,
            _ => ClientMode.Preview,
        };

    public static string FormatMode(ClientMode mode) => mode switch
    {
        ClientMode.Dev => "dev",
        ClientMode.Off => "off",
        _ => "preview",
    };

    public static string DescribeMode(ClientMode mode) => mode switch
    {
        ClientMode.Dev => "开发模式（vite dev，仅供前端调试）",
        ClientMode.Off => "不管理（本地不跑 :5173）",
        _ => "构建产物预览（vite preview，推荐）",
    };

    public static TunnelMode ParseTunnelMode(string? value) =>
        value?.Trim().ToLowerInvariant() switch
        {
            "process" => TunnelMode.Process,
            "off" => TunnelMode.Off,
            _ => TunnelMode.Service,
        };

    public static string FormatTunnelMode(TunnelMode mode) => mode switch
    {
        TunnelMode.Process => "process",
        TunnelMode.Off => "off",
        _ => "service",
    };

    public static string DescribeTunnelMode(TunnelMode mode) => mode switch
    {
        TunnelMode.Process => "启动器自拉进程（没装系统服务时用）",
        TunnelMode.Off => "不管理（只看状态）",
        _ => "系统服务 Cloudflared（推荐，开机自启）",
    };

    private static readonly JsonSerializerOptions WriteOptions = new()
    {
        WriteIndented = true,
        Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
    };

    public static AppConfig Load(string exeDirectory)
    {
        var launcherDir = ResolveLauncherDirectory(exeDirectory);
        var path = Path.Combine(launcherDir, "config.json");
        AppConfig config;
        if (File.Exists(path))
        {
            try
            {
                config = JsonSerializer.Deserialize<AppConfig>(File.ReadAllText(path)) ?? new AppConfig();
            }
            catch
            {
                config = new AppConfig();
            }
        }
        else
        {
            config = new AppConfig();
        }

        config.ConfigPath = path;
        // 实际使用的根目录另存一份：手填值原样保留在配置文件里，自动查到的路径不写回，
        // 否则仓库挪个位置、配置文件里就钉死了旧路径。
        config.ResolvedRepoRoot = ResolveRepoRoot(config.RepoRoot, launcherDir, exeDirectory);

        config.MigrateLegacyFields();
        // 迁移结果立刻落盘：否则配置文件里会一直留着旧字段，每次启动都重复提示一遍
        if (!string.IsNullOrEmpty(config.MigrationNote)) config.Save();
        return config;
    }

    private static string ResolveRepoRoot(string configured, string launcherDir, string exeDirectory)
    {
        if (string.IsNullOrWhiteSpace(configured)) return FindRepoRoot(exeDirectory) ?? "";
        return Path.IsPathRooted(configured)
            ? configured
            : Path.GetFullPath(Path.Combine(launcherDir, configured));
    }

    /// <summary>
    /// 把 v1 配置迁移到新的「前端托管模式」。
    ///
    /// v1 只有「启动时同时拉起 vite dev」这一个开关，于是 5173 上一直挂着开发服务器
    /// （未打包未压缩、no-store，首屏 4.3MB）。迁移后统一落到 preview：
    /// 同样占 5173，但给的是构建产物（首屏 0.3MB）。
    /// </summary>
    private void MigrateLegacyFields()
    {
        var notes = new List<string>();

        if (ClientPort <= 0 && LegacyDevClientPort is > 0)
        {
            notes.Add($"前端端口 {LegacyDevClientPort} 已迁移到 ClientPort");
        }
        if (ClientPort <= 0) ClientPort = LegacyDevClientPort is > 0 ? LegacyDevClientPort!.Value : 5173;

        if (LegacyStartDevClient == true)
        {
            notes.Add("旧设置「同时拉起前端开发服务器」已改为「构建产物预览」：同样占用 :" +
                      ClientPort + "，但公网首屏从 4.3MB 降到 0.3MB。需要前端热更新请在界面上切到「开发模式」");
        }
        else if (string.IsNullOrWhiteSpace(ClientModeName))
        {
            ClientModeName = FormatMode(ClientMode.Preview);
        }

        ClientModeName = FormatMode(ParseMode(ClientModeName));
        LegacyDevClientPort = null;
        LegacyStartDevClient = null;

        // 隧道托管：v1 是「填了 CloudflaredExe 才管，而且是自己拉进程」。
        // 现在默认交给系统服务（开机由 Windows 拉起，不依赖启动器是否在跑），
        // 只有配置里明确写着 exe 路径（说明用户就是想用进程方式）时才留在 process。
        if (string.IsNullOrWhiteSpace(TunnelModeName))
        {
            var legacyProcess = !string.IsNullOrWhiteSpace(CloudflaredExe);
            TunnelModeName = FormatTunnelMode(legacyProcess ? TunnelMode.Process : TunnelMode.Service);
            notes.Add(legacyProcess
                ? "隧道仍按旧配置由启动器自拉进程管理（可在「启动选项」里改成系统服务）"
                : "隧道托管已默认切到系统服务 Cloudflared（开机由 Windows 自动拉起）");
        }
        TunnelModeName = FormatTunnelMode(ParseTunnelMode(TunnelModeName));
        if (string.IsNullOrWhiteSpace(TunnelServiceName)) TunnelServiceName = TunnelService.DefaultName;

        MigrationNote = notes.Count == 0 ? "" : string.Join("；", notes);
    }

    public void Save()
    {
        try
        {
            var dir = Path.GetDirectoryName(ConfigPath);
            if (!string.IsNullOrEmpty(dir)) Directory.CreateDirectory(dir);
            File.WriteAllText(ConfigPath, JsonSerializer.Serialize(this, WriteOptions));
        }
        catch
        {
            // 配置写不进去不影响运行
        }
    }

    /// <summary>exe 在 launcher\dist 下时，配置仍然写到 launcher\ 里，方便随手编辑。</summary>
    private static string ResolveLauncherDirectory(string exeDirectory)
    {
        var current = new DirectoryInfo(exeDirectory);
        while (current is not null)
        {
            if (File.Exists(Path.Combine(current.FullName, "SeiyuuGuessLauncher.csproj")))
            {
                return current.FullName;
            }
            current = current.Parent;
        }
        return exeDirectory;
    }

    /// <summary>向上查找仓库根：含 pnpm-workspace.yaml 的目录。</summary>
    public static string? FindRepoRoot(string startDirectory)
    {
        var current = new DirectoryInfo(startDirectory);
        while (current is not null)
        {
            if (File.Exists(Path.Combine(current.FullName, "pnpm-workspace.yaml")))
            {
                return current.FullName;
            }
            current = current.Parent;
        }
        return null;
    }

    /// <summary>实际使用的仓库根目录（自动查找结果）。不写回配置文件。</summary>
    [JsonIgnore]
    public string ResolvedRepoRoot { get; set; } = "";

    [JsonIgnore]
    public string ServerEntry => Path.Combine(ResolvedRepoRoot, "server", "dist", "index.js");

    [JsonIgnore]
    public string ServerWorkingDirectory => Path.Combine(ResolvedRepoRoot, "server");

    [JsonIgnore]
    public string ViteEntry => Path.Combine(ResolvedRepoRoot, "client", "node_modules", "vite", "bin", "vite.js");

    [JsonIgnore]
    public string ClientWorkingDirectory => Path.Combine(ResolvedRepoRoot, "client");

    /// <summary>前端构建产物入口。preview 模式没有它就只能起开发模式。</summary>
    [JsonIgnore]
    public string ClientIndexHtml => Path.Combine(ResolvedRepoRoot, "client", "dist", "index.html");

    /// <summary>公网站点地址；未配置时返回 null。</summary>
    [JsonIgnore]
    public string? PublicSiteUrl => string.IsNullOrWhiteSpace(PublicUrl) ? null : PublicUrl.Trim();

    /// <summary>隧道源站所在的端口：预览/开发模式是前端端口，off 模式则直接是后端端口。</summary>
    [JsonIgnore]
    public int LocalSitePort => Mode == ClientMode.Off ? ServerPort : ClientPort;

    /// <summary>界面/托盘文案用的模式描述。</summary>
    [JsonIgnore]
    public string ClientModeLabel => DescribeMode(Mode);

    [JsonIgnore]
    public string TunnelModeLabel => DescribeTunnelMode(Tunnel);

    /// <summary>仓库里自带的 cloudflared.exe（process 模式没配路径时的兜底）.</summary>
    [JsonIgnore]
    public string RepoCloudflaredExe => Path.Combine(ResolvedRepoRoot, "cloudflared", "cloudflared.exe");

    /// <summary>
    /// 公网健康检查地址（隧道通不通就看它）。
    /// 返回 200 说明「Cloudflare 边缘 → 隧道 → 本机服务」整条链路都活着，
    /// 这比只看进程在不在准得多：进程活着但连接断光了正是 Error 1033 的典型状态。
    /// </summary>
    [JsonIgnore]
    public string? PublicHealthUrl => PublicSiteUrl is { } url ? url.TrimEnd('/') + "/api/health" : null;

    /// <summary>本机健康检查地址，用来区分「隧道断了」和「本机服务也挂了」。</summary>
    [JsonIgnore]
    public string LocalHealthUrl => $"http://127.0.0.1:{LocalSitePort}/api/health";

    [JsonIgnore]
    public string LogDirectory => Path.Combine(ResolvedRepoRoot, "logs");
}
