# 声优情报站 · 本地启动器

Windows 小工具（.NET + WinForms，单文件 200KB），用来在本机一键管理这套服务：

| 服务 | 端口 | 说明 |
| --- | --- | --- |
| 后端服务 | 3000 | `server/dist/index.js`，生产模式下同时托管前端构建产物（当前公网入口指向的就是它） |
| 前端服务 | 5173 | 本机预览用：默认 `vite preview`（直接给 `client/dist` 构建产物）；可切成 `vite dev` 或不管理 |
| Cloudflare 隧道 | — | 默认托管 Windows 系统服务 `Cloudflared`：查状态 + 启停 + 公网健康自愈 |

> 公网入口的源站由 **Cloudflare 后台的隧道路由**决定（当前部署 → 本机 3000），
> 所以 5173 只影响本机访问/调试速度：`preview` 首屏约 0.28MB，`dev` 要下载上百个未打包模块（约 4.3MB）。
> 隧道侧的部署与排查细节见仓库根目录的 `cloudflared/README.md`。

## 快速开始

```bat
cd launcher
build.cmd
dist\SeiyuuGuessLauncher.exe
```

> 重新发布前请先退出正在运行的启动器（托盘菜单 →「退出（服务继续运行）」），
> 否则单文件 exe 被占用，`dotnet publish` 会报 `Access to the path ... is denied`。

首次使用前请保证已经构建过前端与后端（仓库根目录 `pnpm build`），否则启动器会提示缺少 `server/dist/index.js`。

## 界面功能

- **服务状态**：三个状态灯，绿=运行中，**黄=在跑但公网不通**（隧道的典型故障形态），灰=没在跑。
  并显示 PID 与「启动器拉起 / 外部进程」。外部进程（例如手动 `pnpm start` 起的）也能识别，
  点「停止服务」会按端口找到进程并结束。
- **启动服务 / 停止服务 / 重启服务**：后端始终处理；前端按「启动选项」里的模式处理（preview / dev / off）；
  隧道按「公网隧道托管」的设置处理。
- **修复隧道**：重新检测公网（`PublicUrl/api/health`）与系统服务状态，该重启才重启；
  被权限挡住时会提示以管理员身份重试（弹 UAC 跑一次 `--fix-tunnel`）。
  它也是排查 **Error 1033** 的首选动作：报 1033 不一定是进程没跑，
  很多时候是「进程活着但连接断光了」，光看进程是看不出来的。
- **前端 :5173 模式 / 公网隧道托管**：两个下拉框即时写入 `config.json`，点「重启服务」/「修复隧道」生效。
  托盘右键菜单里也有同样的入口。
- **打开本机站点 / 打开公网站点 / 打开日志目录**：本机站点开的是 3000/5173 里正在对外服务的那个。
  日志在仓库根的 `logs/`（`server.log`、`client.log`、`cloudflared.log`、`cloudflared-cli.log`、`build.log`、`launcher.log`）。
- **重新构建**：后台执行 `pnpm build`（PoW 产物 + 前端 + 后端），输出写进 `logs/build.log`，完成后点「重启服务」生效。
  `preview` 模式需要前端构建产物，没构建过时会直接提示。
- **开机自启**：勾上即写入 `HKCU\Software\Microsoft\Windows\CurrentVersion\Run`（不需要管理员权限），禁用时删除该值。
- **关闭窗口 = 收进托盘**：服务继续跑；要退出用托盘菜单。
  - 「退出（服务继续运行）」：只关启动器，服务不动。
  - 「退出并停止服务」：先停服务再退出。

> 服务进程是由 `cmd.exe` 持有日志文件句柄启动的，所以**启动器退出后服务不会被带走**（这也避免了子进程因管道关闭而 EPIPE 崩溃）。

## 开机静默自启

勾选界面上的「开机静默自启」后，注册表里会写入：

```
"H:\path\to\SeiyuuGuessLauncher.exe" --silent
```

开机时执行的就是这条命令：**不弹窗口**，只在托盘留一个图标，并（当 `StartServicesOnBoot=true` 时）
自动把后端/前端拉起来，同时**检查隧道**：

- 系统服务没在跑 → 启动它；启动类型不是「自动」→ 改回「自动」（这两步需要管理员权限）；
- 权限不够 / 服务起不来 → 退回「自己拉一个 cloudflared 连接器」把所有公开先救回来；
- 服务在跑但公网不通 → 重启服务（每 20 秒探测一次 `/api/health`，连续失败才动手，5 分钟冷却）。

所以「开机自启」实际上有两层：Windows 自己拉起隧道服务（不依赖登录），
以及启动器登录后把本机服务与隧道健康一起保上。

## 命令行参数

| 参数 | 作用 |
| --- | --- |
| `--silent` / `-s` | 静默模式：不显示窗口，只驻留托盘；若 `StartServicesOnBoot=true` 则顺带启动服务 |
| `--no-services` | 配合 `--silent`：只驻留托盘，不自动启动服务 |
| `--start` | 启动服务后立即退出（结果写入 `logs/launcher.log`），可写进计划任务 |
| `--stop` | 停止服务后退出（结果写入 `logs/launcher.log`） |
| `--mode preview\|dev\|off` | 改写前端托管方式后退出（等同界面上切下拉框），可写进 .bat |
| `--tunnel service\|process\|off` | 改写隧道托管方式后退出 |
| `--tunnel-status` | 打印隧道诊断（服务状态、启动类型、exe、公网健康、开机自启）到 `logs/launcher.log` |
| `--fix-tunnel` | 检查并修复隧道（界面提权后会带这个参数再跑一次自己；结果写日志并弹框） |
| `--autostart on\|off` | 开关开机自启后退出 |

重复运行（已有实例时）：非静默方式会唤醒已有窗口，静默方式直接退出，不会开第二个实例。

## 配置

首次运行不会生成配置文件，需要改默认值时把 `config.example.json` 复制成 `config.json`（放在 `launcher/` 目录，和 csproj 同级）：

| 字段 | 默认 | 说明 |
| --- | --- | --- |
| `RepoRoot` | 自动 | 仓库根目录；留空则从 exe 位置向上找含 `pnpm-workspace.yaml` 的目录 |
| `ServerPort` | 3000 | 后端端口 |
| `ClientPort` | 5173 | 前端端口（必须与隧道源站一致） |
| `ClientMode` | `preview` | `preview` \| `dev` \| `off`，见上表说明 |
| `TunnelMode` | `service` | `service`（托管系统服务）\| `process`（启动器自拉进程）\| `off`（只管状态） |
| `TunnelServiceName` | `Cloudflared` | 隧道系统服务名（`cloudflared service install` 装出来的名字固定是它） |
| `AutoHealTunnel` | true | 公网连续探测失败就自动重启隧道（带 5 分钟冷却），权限不够时退回自拉进程 |
| `PublicUrl` | `https://homoto-akina.top` | 公网站点地址；留空则不显示「打开公网站点」且不做健康检查 |
| `NodeExe` | 自动 | `node.exe` 路径；留空则依次查 PATH、`where node`、`C:\Program Files\nodejs`、`C:\tools\node-*` |
| `CloudflaredExe` / `CloudflaredArgs` | 自动 / token 模式 | `process` 模式用的 exe 与参数；留空则自动找（服务里注册的路径 → 仓库 `cloudflared\` → 常见安装目录 → PATH） |
| `StartServicesOnBoot` | true | `--silent` 启动时是否立刻拉起服务 |
| `StartupProbeDelayMs` | 1200 | 启动后探测端口前的等待时间 |

> v1 的 `DevClientPort` / `StartDevClient` 会在首次启动时自动迁移到 `ClientPort` / `ClientMode`
> （`StartDevClient: true` → `preview`），并在界面上提示一次，不会再重复提示。
> 隧道托管也是新字段：老配置里填过 `CloudflaredExe` 的会继续用 `process` 方式，
> 其余默认切到 `service`（系统服务），迁移时同样提示一次。

## 常见问题

- **提示「缺少服务端构建产物」**：先在仓库根执行 `pnpm build`（或点界面「重新构建」）。
- **公网报 Error 1033 / 530（Cloudflare Tunnel error）**：意思是 Cloudflare 侧没有任何活跃隧道连接。
  先在界面上点「修复隧道」；状态行会告诉你是「服务已停止」、「未安装系统服务」还是
  「运行中 · 公网不可达」（黄灯）。还不行就看仓库根目录 `cloudflared/README.md` 的排查表。
- **本地打开很慢 / 像没样式**：检查「前端 :5173 模式」是不是被切到了「开发模式」（只影响本机访问）。
- **提示「缺少前端构建产物」**：`preview` 模式需要 `client/dist/index.html`，点「重新构建」。
- **状态灯是灰的但页面能开**：说明端口被别的程序占用/未监听，点「刷新」并看 `logs/server.log`。
- **不想让启动器管隧道**：把「公网隧道托管」切成「不管理（只看状态）」，启动器就只显示状态、不动它。
- **想把隧道改回进程方式**：切成「启动器自拉进程」（启动器退出时隧道就断，建议只临时用）。
- **换了 exe 位置**：开机自启里记的是绝对路径，重新勾选一次即可。
