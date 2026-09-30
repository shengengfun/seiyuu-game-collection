# Cloudflare Tunnel 部署指南

## 现状:这台机器上是怎么跑的

公网入口由 **Windows 系统服务 `Cloudflared`** 常驻(启动类型「自动」,开机由 Windows 自己拉起),
跑的是 **token 模式**(隧道在 Cloudflare 后台创建,隧道 ID `eb1f95de-1d2a-4ff3-9dee-c960133b64f5`):

```
sc qc Cloudflared
  BINARY_PATH_NAME : "C:\Program Files (x86)\cloudflared\cloudflared.exe" tunnel run --token-file C:\ProgramData\cloudflared\token
```

也就是说:

- 域名路由(homoto-akina.top → 本机哪个端口)**以 Cloudflare 后台为准**,不是本地 `config.yml`;
  当前后台指向 **本机 3000**(后端 Express 同源托管前端构建产物)。
  想确认实际走哪个端口,看响应头:带 helmet 那一串(CSP / X-DNS-Prefetch-Control /
  Origin-Agent-Cluster)的是 3000,vite preview(5173)只回 Cache-Control / Vary / ETag。
- `config.yml` / `start-tunnel.bat` 只用于**前台手动调试**(想直接看连接日志时)。
- 日常不用手敲命令:**启动器界面的「修复隧道」按钮**会先查服务状态与公网健康
  (`/api/health`),该重启才重启;权限不够时会提示以管理员身份重试,
  并自动退回「自己拉一个连接器」把公网先救回来。

```powershell
# 手工排查用
sc qc Cloudflared            # 看启动命令与启动类型
sc query Cloudflared         # 看是否 RUNNING
net start Cloudflared        # 启动(需管理员)
net stop  Cloudflared        # 停止(需管理员)
```

## 故障排查

| 现象 | 含义 | 处理 |
| --- | --- | --- |
| 浏览器 Error 1033 / 530 | Cloudflare 侧**没有任何活跃隧道连接**(服务没跑,或进程活着但连接已断) | 启动器点「修复隧道」;失败时看 `sc query Cloudflared` 与事件查看器里的 Cloudflared 日志 |
| 浏览器 502 | 隧道通了,但**源站**不通 | 检查后台指向的端口有没有在跑(`curl http://localhost:3000/api/health`) |
| 域名解析不到 / 522 | DNS 记录或 Cloudflare 侧问题 | 后台检查 Tunnels 页面的 Public Hostname 与 DNS CNAME |
| 隧道起不来、日志里全是超时 | 出网被代理接管或网络受限 | 隧道必须**直连**边缘节点:`scripts\no-proxy-env.bat` 清代理环境变量,`scripts\direct-connection.ps1` 加系统代理例外 |

一键判断隧道是否活着(推荐):`https://homoto-akina.top/api/health` 返回 200 即正常。

## 文件清单

```
cloudflared/
├── cloudflared.exe          # 主程序(已下载好)
├── config.yml               # 前台调试用的配置(token-file + ingress,可选)
├── start-tunnel.bat         # 前台跑一个连接器(调试用,关窗口就停)
└── install-service.bat      # 安装/修复系统服务(管理员,开机自启)
```

## 从零部署(或换机器)

### 步骤 1: 把域名托管到 Cloudflare

1. 打开 https://dash.cloudflare.com/sign-up 注册账号(免费)
2. 登录后点 **+ Add a Site**
3. 输入你的域名 → 选 **Free 计划**
4. Cloudflare 会给你两个 NS 服务器,例如:
   ```
   alice.ns.cloudflare.com
   bob.ns.cloudflare.com
   ```
5. 去你买域名的注册商后台(阿里云/腾讯云/Namecheap等),修改域名的 **NS 服务器** 为 Cloudflare 给的两个
6. 回到 Cloudflare 点 "Check nameservers" 等待生效(10分钟~24小时)
7. 生效后 Cloudflare 后台会显示域名状态为 **Active**

### 步骤 2: 在后台创建隧道并拿到 token(推荐)

后台 → **Networks → Tunnels → Create a tunnel**(选 Cloudflared)→ 命名 → 复制页面给出的
**token**,保存到本机:

```powershell
New-Item -ItemType Directory -Force C:\ProgramData\cloudflared | Out-Null
# 把 token 粘进文件(只放 token 一行)
notepad C:\ProgramData\cloudflared\token
```

然后在同一个页面配置 **Public Hostname**:`homoto-akina.top` → `http://localhost:3000`
(后端 Express 会同时提供前端构建产物)。DNS 记录会在这一步自动创建。

> token 里已经包含隧道 ID 与密钥,所以**不要再**往 `config.yml` 里写
> `tunnel` / `credentials-file`(token 不是 credentials.json,填错会报 invalid JSON)。

### 步骤 3: 装成系统服务(开机自启)

```
双击 install-service.bat        # 会自动请求管理员权限
sc qc Cloudflared               # 确认启动类型是 AUTO_START
```

### 步骤 4: 起本机服务

用启动器(推荐):

```bat
cd D:\Seiyu-guess\launcher
dist\SeiyuuGuessLauncher.exe
```

点「启动服务」,再点「修复隧道」验证公网;

也可以用命令行 `--start`(结果写进 `logs/launcher.log`):

```powershell
& D:\Seiyu-guess\launcher\dist\SeiyuuGuessLauncher.exe --start
```

### 步骤 5: 前台调试(可选)

只想临时看连接日志时,才用前台方式(关窗口即停):

```powershell
cd D:\Seiyu-guess\cloudflared
.\cloudflared.exe tunnel --config .\config.yml run
```

或者直接双击 `start-tunnel.bat`。token 模式下不需要再写隧道名,
`config.yml` 里的 `ingress` 只是本地兜底(域名路由以后台为准)。

### 步骤 6: 验证

浏览器打开 `https://你的域名/`,应该能看到游戏页面。

健康检查: `https://你的域名/api/health` 返回 200 即「Cloudflare 边缘 → 隧道 → 本机服务」整条链路都活着。

### 步骤 7: 本机服务开机自启

后端(以及前端预览)建议交给启动器,不要再用 PM2 之类的额外进程管理器:

```
启动器界面勾上「开机静默自启」  →  写入 HKCU\...\Run:
  "D:\Seiyu-guess\launcher\dist\SeiyuuGuessLauncher.exe" --silent
```

开机时启动器静默起来(托盘图标,不弹窗口),自动拉起后端/前端,并检查隧道是否健康。

## 常见问题

### Q: 浏览器显示 Error 1033 / 530(Cloudflare Tunnel error)
含义是 Cloudflare 边缘侧**一条活跃隧道连接都没有**,两种典型情况:

1. **系统服务根本没在跑**(没装、被停了、开机没起来)→ `sc query Cloudflared` 看状态,
   启动器点「修复隧道」;没装就双击 `install-service.bat`。
2. **进程活着,但连接已经断光了** —— 这是最坑的一种:任务管理器里能看到 cloudflared.exe,
   可公网就是 1033。常见触发是服务被"升级/重装"打断(例如手动跑 cloudflared 的 MSI 安装包,
   安装失败回滚后,老进程还挂着但连接全没了)。光看进程查不出来,要用
   `https://homoto-akina.top/api/health` 或启动器的状态灯判断(此时是**黄灯**)。

启动器已经内置自愈:每 20 秒探测一次 `/api/health`,连续失败就重启隧道服务;
没有管理员权限时会退回「自己拉一个 cloudflared 连接器」(同一条隧道允许多个连接),先把公网救回来。

### Q: 启动 tunnel 报 "context deadline exceeded"
- 检查 cloudflared 能否联网(国外服务器,有时被墙)
- **不要随手给它挂代理**:隧道进程一旦走本地代理,出网连接会被接管,表现为隧道建不起来、域名 1033 / 连不上。
  `start-tunnel.bat` 启动前已调用 `..\scripts\no-proxy-env.bat` 清空 `HTTP_PROXY` / `HTTPS_PROXY` / `ALL_PROXY`;
  手动启动时也请先 `call ..\scripts\no-proxy-env.bat`
- 只有在当前网络确实完全出不了网时才临时挂代理(挂上后务必确认节点稳定):
  `$env:HTTPS_PROXY="http://127.0.0.1:7897"`

### Q: 浏览器打不开域名或 localhost:5173,提示无法连接到代理
- 系统代理(Clash / v2ray / Steam++ 等)把访问本机与站点域名的请求也带走了,代理节点到不了你的机器
- 跑一次 `scripts\direct-connection.ps1` 把地址加进系统代理例外(`run.bat` 已内置,启动时会自动修):
  `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\direct-connection.ps1 -Check` 先看现状

### Q: 访问域名显示 502 Bad Gateway
- 隧道是通的,但**源站**没起来:确认后台指向的端口有服务在跑,当前是 3000
  → `curl http://localhost:3000/api/health`,没通就在启动器里点「启动服务」
- 如果换过后台路由(例如改成 5173),记得让对应的前端服务也跑起来
  (启动器「前端 :5173 模式」= 构建产物预览)
- 看 tunnel 窗口的日志有没有错误

### Q: 访问域名显示 1033 错误
- tunnel 没启动,或者 config.yml 里 hostname 跟 DNS 记录对不上

### Q: WebSocket 连不上(Socket.IO 报错)
- config.yml 里 `service: http://localhost:3000` 不需要加任何参数,cloudflared 自动支持 WebSocket

### Q: 想要强制 HTTPS
- Cloudflare 默认就支持 HTTPS,不用配置
- 在 Cloudflare 后台 → SSL/TLS → 设置为 **Full** (不要 Full Strict,本机是 HTTP)

### Q: 想限制只有自己/朋友能访问
- Cloudflare Zero Trust → Access → Application,加一个应用,设置邮箱白名单
- 这样访问时需要邮箱验证码,完全免费
