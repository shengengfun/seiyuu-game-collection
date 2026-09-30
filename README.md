<div align="center">

# 声优情报站 (seiyuu-game-collection)

**日本女声优主题小游戏合集 —— 12 个小游戏 · 实时多人对战 · 全站排行榜**

[![CI and Docker](https://github.com/shengengfun/seiyuu-game-collection/actions/workflows/docker.yml/badge.svg)](https://github.com/shengengfun/seiyuu-game-collection/actions/workflows/docker.yml)
[![License: AGPL-3.0](https://img.shields.io/badge/license-AGPL--3.0-blue.svg)](LICENSE)
[![Node.js ≥ 22](https://img.shields.io/badge/node-%E2%89%A522-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![pnpm workspaces](https://img.shields.io/badge/pnpm-workspaces-F69220?logo=pnpm&logoColor=white)](https://pnpm.io/)
[![ghcr.io](https://img.shields.io/badge/ghcr.io-seiyuu--game--collection-2496ED?logo=docker&logoColor=white)](https://github.com/shengengfun/seiyuu-game-collection/pkgs/container/seiyuu-game-collection)

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![React 18](https://img.shields.io/badge/React_18-61DAFB?logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?logo=express&logoColor=white)
![Socket.IO](https://img.shields.io/badge/Socket.IO-010101?logo=socketdotio&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-FF4438?logo=redis&logoColor=white)

[小游戏](#小游戏) · [功能特性](#功能特性) · [技术栈](#技术栈) · [快速开始](#快速开始) · [部署](#docker-生产部署) · [猜歌曲库](#猜歌曲库) · [贡献](#贡献)

</div>

---

## 小游戏

全部游戏**免登录可玩**，登录后战绩同步到账号；文案中 / 英 / 日三语，主题明暗双色。

| 小游戏                                       | 路径                   | 玩法                                                             |
| -------------------------------------------- | ---------------------- | ---------------------------------------------------------------- |
| [声优猜](client/src/pages/Home.tsx)          | `/seiyu-guess`         | 类 Wordle：8 次机会猜出目标女声优，事务所 / 出生地 / 出道年 / 代表角色逐项给提示；单人 + 开房对战 |
| [猜歌](client/src/pages/SongQuiz.tsx)        | `/song-quiz`           | 听 30 秒 iTunes 试听猜歌名，四选一；13 企划 / 72 分组 / 6525 首；四档难度 + 专家红心 + 多人对战 + 全站排行榜 |
| [SeiValue 测试](client/src/pages/SeiValue.tsx) | `/seivalue`          | 4 个轴测你在声优圈的成分，快速 32 题 / PRO 64 题；给主义名称、稀有度与彩蛋 |
| [你是哪个声优](client/src/pages/WhoYouAre.tsx) | `/seiyu-who-you-are` | 6 个气质维度，快速 24 题 / PRO 48 题，算出与哪位女声优最像，附 7 位排行 |
| [声优问答](client/src/pages/SeiyuuQuiz.tsx)  | `/seiyuu-quiz`         | 搜一位声优开考，从 TA 的个人题库出题（35 套），结算给得分 / 等级 / 错题解析；支持社区投稿 |
| [喜欢或讨厌](client/src/pages/Sukikirai.tsx) | `/seiyuu-sukikirai`    | 给声优投喜欢 / 讨厌，投完才看得到红蓝比例与短评；日 / 周 / 月 / 总榜 |
| [我喜欢你](client/src/pages/LikeYou.tsx)     | `/seiyu-like-you`      | 从名册里挑出最喜欢的 9 位，分批预选 + 两两对决，最后拿一张九宫格心动名单 |
| [声优粉宾果](client/src/pages/SeiyuuBingo.tsx) | `/seiyuu-bingo`      | 5×5 的声优粉行为点卡，按连线数领称号，结果卡可直接截图分享        |
| [声优关系网](client/src/pages/SeiyuuNetwork.tsx) | `/seiyuu-network`   | 从一位声优出发，选出和 TA 共演过的人，答对一次连一条线，看关系网能连多大 |
| [声优人生重开](client/src/pages/SeiyuuLife.tsx) | `/seiyuu-life`       | 十几个岔路口 + 突发事件决定一位新人声优的一生，给结局并配一位经历最像的现役声优 |
| [声优事务所经营](client/src/pages/SeiyuuAgency.tsx) | `/seiyuu-agency`  | 12 / 24 / 36 个月经营事务所：签新人、接委托、组团、买道具，最后出一张年报 |
| [声优简历找茬](client/src/pages/SeiyuuResume.tsx) | `/seiyuu-resume`    | 给一份声优资料卡，里面混进了错信息，限时把被改错的栏目点出来     |

门户（`/`）是游戏大厅：卡片式入口 + 公告栏 + 当前在线人数。

## 功能特性

- 🎮 **12 个小游戏** —— 单人玩法为主，声优猜与猜歌另有实时多人对战（房间码 / 随机匹配 / 断线重连）
- 🎵 **猜歌曲库** —— 13 企划 / 72 分组 / **6525 首**，试听走服务端签名转发，不直连第三方（见[猜歌曲库](#猜歌曲库)）
- 👤 **免登录可玩** —— 所有游戏对匿名访客开放，战绩按浏览器本地标识记账，登录后自动并入账号
- 🏆 **全站排行榜** —— 猜歌按难度系数加权、每人只取最好一局；喜欢或讨厌分日 / 周 / 月 / 总榜
- 🌏 **多语言** —— 简体中文 / English / 日本語；前后端只传错误码，文案统一在前端翻译
- 🎨 **双主题** —— Blast 暗色 / 日间浅色，首次访问跟随系统偏好
- 🛡 **PoW 人机验证** —— 公开接口由 WASM 工作量证明保护（Rust 编译，仓库内置预编译产物）
- 🛠 **管理后台** —— 声优增删改、JSON 批量导入、外部 API Token、公告管理、题目审核、短评审核、数据概览
- 📱 **移动端适配** —— 窄屏（竖屏）下所有页面无横向溢出，卡片与选项自适应

## 技术栈

| 层        | 技术                                                           |
| --------- | -------------------------------------------------------------- |
| 前端      | React 18 + Vite + TypeScript + React Router + Zustand + i18next |
| 后端      | Node.js + Express + TypeScript                                 |
| 数据库    | 本地开发 SQLite 开箱即用；生产 Docker 镜像固定使用 PostgreSQL   |
| 缓存/实时 | Redis + Socket.IO（Redis Adapter 跨实例广播）                   |
| 认证      | JWT + bcrypt（HttpOnly Cookie，客户端不存明文令牌）             |
| 校验/测试 | Zod / Vitest                                                    |
| 包管理    | pnpm workspaces（`client` / `server` / `shared`）               |

## 快速开始

**环境要求**:Node.js ≥ 22、pnpm、Redis(本地开发可降级为内存模式)；SQLite 开箱即用,无需额外数据库。Rust 工具链可选——仅在需要重新编译 PoW WASM 时安装,默认使用仓库内置的预编译产物。

```bash
pnpm install
cp .env.example .env                 # 可选,有默认值
pnpm dev                             # server: 3000, client: 5173
```

访问 http://localhost:5173 。公开注册的账号默认都是普通用户,创建或重置管理员:

```bash
# 密码至少 10 位;ADMIN_EMAIL 可选,填了就能在登录页直接用邮箱登录(登录接口按 用户名 → 邮箱 依次匹配)
ADMIN_USERNAME=admin ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='你的密码' pnpm create-admin
```

Windows PowerShell 不支持 `VAR=value cmd` 这种写法,改用:

```powershell
pnpm --filter server create-admin   # 先在 .env 里填好 ADMIN_USERNAME / ADMIN_EMAIL / ADMIN_PASSWORD
```

### 运行时行为说明

- Redis 默认连接 `redis://127.0.0.1:6379`;生产环境建议 `REDIS_REQUIRED=true`,避免 Redis 故障时降级为仅适合单实例的内存模式
- 生产环境强制要求 PostgreSQL、至少 32 字节随机 `JWT_SECRET` 和 `REDIS_REQUIRED=true`
- 访客显示 ID 使用 HMAC-SHA256 派生,可用 `GUEST_ID_SALT` 配置独立盐(未配置时复用 `JWT_SECRET`)
- 单人进行中的对局只保存在 Redis,**1800 秒(30 分钟)** 无有效操作自动过期;猜中、次数耗尽或查看答案后才写入数据库,主动离开或重新开始只清理临时状态、不产生历史战绩

### 直连与代理(重要)

站点通过 Cloudflare 隧道对外,而本机又常开着 Clash 之类的代理工具。一旦请求走了代理就会**直接连不上**:浏览器被系统代理接管后,访问 `http://localhost:3000`、`http://192.168.*:5173`、`https://homoto-akina.top` 会被丢给代理节点,而代理节点到不了你的机器;隧道进程自己走代理也建立不起来(表现为 1033 / 502)。

仓库自带两层保障,不需要手工操作:

- 启动脚本会先调用 `scripts/no-proxy-env.bat`,清空 `HTTP_PROXY` / `HTTPS_PROXY` / `ALL_PROXY`(含 npm/pnpm 变体)并写入 `NO_PROXY`
- 同时运行 `scripts/direct-connection.ps1`,把 `<local>`、`localhost`、`127.*`、`10.*`、`172.16.*`、`192.168.*` 与站点域名写进 Windows 系统代理例外列表(`run.bat` / `install.bat` / `cloudflared\start-tunnel.bat` 均已内置)
- 托盘启动器拉起 server / vite / cloudflared 时会注入同样的干净环境变量,点「打开本机站点」前也会再确保一次例外
- 隧道跑在 Windows 系统服务 `Cloudflared` 里(启动类型「自动」,开机由 Windows 拉起,不依赖启动器是否登录);
  启动器每 20 秒探测一次 `/api/health`,公网不通就重启隧道服务,权限不够时退回自拉连接器兜底。
  公网报 **1033 / 530** 表示 Cloudflare 侧一条活跃隧道连接都没有 —— 此时进程可能是活的,
  光看进程查不出来,以启动器状态灯(黄)或 `/api/health` 为准;细节见 `cloudflared/README.md`

手动排查与回滚:

```powershell
# 只看现状(不改动),有主机没绕过时退出码为 1
pnpm direct:check

# 应用例外 + 直连环境变量,并额外测试隧道域名 443
pnpm direct

# 还原成脚本改动前的例外列表
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\direct-connection.ps1 -Revert
```

Clash Verge 每次开关「系统代理」都会重写这份例外列表,所以要么每次启动时跑一遍(`run.bat` 已内置),要么在 Verge 的「设置 → 系统代理 → 绕过」里填一次: `<local>;localhost;127.*;10.*;172.16.*;192.168.*;homoto-akina.top;www.homoto-akina.top;*.homoto-akina.top`。原始列表备份在 `logs/proxy-override.bak.txt`。

## 常用脚本

| 命令                | 说明                                    |
| ------------------- | --------------------------------------- |
| `pnpm dev`          | 同时启动前后端开发服务                  |
| `pnpm build`        | 构建 PoW WASM + 前端 + 编译后端         |
| `pnpm start`        | 生产模式启动(server 托管 client/dist)   |
| `pnpm test`         | 运行前后端测试                          |
| `pnpm migrate`      | 初始化数据库结构              |
| `pnpm seed`         | 补写缺失的种子声优            |
| `pnpm create-admin` | 显式创建或重置管理员                    |
| `pnpm loadtest`     | 运行 HTTP 缓存接口与多人建房负载测试    |
| `pnpm direct`       | 让本机站点/隧道域名绕过系统代理(Windows)|

## 切换 PostgreSQL

修改根目录 `.env`:

```
DB_CLIENT=pg
DB_URL=postgres://user:pass@localhost:5432/seiyuu_game_collection
```

## Redis 用途

<details>
<summary>展开查看</summary>

- HTTP 与 Socket.IO 分布式限流
- HttpOnly Cookie 会话、实时角色校验和匿名身份签名绑定
- `/api/players/list` 版本化缓存、ETag 与跨实例失效通知
- 排行榜、公告等热点查询缓存
- 多人房间快照、身份索引、分布式房间锁和匹配队列
- 回合超时、断线判负和房间清理的可恢复调度
- Socket.IO Redis Adapter 跨实例广播
- Redis Stream 多人战绩持久化重试

</details>

## Docker 生产部署

生产环境使用 PostgreSQL 专用的精简 Docker 镜像(distroless 运行时,不含 Rust、pnpm、TypeScript、Vite、源码、测试与 SQLite 驱动)。GitHub Actions 自动执行测试、前后端编译、`linux/amd64` 镜像构建并发布到 [`ghcr.io/shengengfun/seiyuu-game-collection`](https://github.com/shengengfun/seiyuu-game-collection/pkgs/container/seiyuu-game-collection)。

Docker Compose 部署、自动数据库迁移、管理员创建、更新和回滚方法见 [`deploy/README.md`](deploy/README.md)。

### 服务器与整合包

- 本机 Windows 环境下可以用仓库自带的脚本一键拉起：`install.bat`(首次安装)、`run.bat`(开发模式)、`start-prod.bat`(生产模式)、`rebuild-native.cmd`(重编原生依赖)；托盘启动器见 [`launcher/`](launcher/README.md)。
- `_package/` 是**本地维护的部署整合包**（内容为根目录的镜像 + 服务器端脚本），**不进 git**；一键部署脚本与整合包说明见 [`DEPLOY.md`](DEPLOY.md)。
- 建议**按模块打包上传**：`client/`（前端产物）、`server/`（后端产物 + 数据库）、`shared/`、`scripts/` 分开传，单个包小很多，出问题也只需重传那一块。

管理员按需外部作弊分析的 Bearer 鉴权与 JSON 展示契约见 [`docs/cheat-analysis-api.md`](docs/cheat-analysis-api.md)。

## 声优数据

声优的**客观身份**统一维护在 [`shared/src/seiyuu/roster.ts`](shared/src/seiyuu/roster.ts)（目前 **102 位**，覆盖 LoveLive! / BanG Dream! / Project SEKAI / 偶像大师 / 学园偶像大师 / 赛马娘 / 少女歌剧 / D4DJ），玩法模块只保留自己的主观数据（如「你是哪个声优」的气质画像分按 `id` 关联）。

服务端库（`seiyuus` 表）里的声优可以通过管理后台增删改或 JSON 批量导入，字段为：
`name / romaji / birth_place / agency / birth_date / debut_year / height / blood_type /
voice_types / representative_works / representative_characters / is_enabled / difficulties`。

改完 `roster.ts` 后跑一次校验（对照服务端库与 Bangumi）：

```bash
node --experimental-strip-types --disable-warning=ExperimentalWarning scripts/verify-seiyuu.mjs
```

报告输出到 `tmp/seiyuu-verify-report.md`。公式照抓取用 `scripts/fetch-seiyuu-photos.mjs`。

### 外部声优更新 API

管理员可在管理后台的 **API Token** 页生成最长 365 天有效的 Bearer Token。明文只在创建时返回一次，服务端仅保存 SHA-256 哈希；每位管理员最多保留 20 个有效 Token，撤销后立即失效。

外部 API 不需要浏览器 PoW，但保留全局限流与独立的失效关闭限流。请求统一携带：

```http
Authorization: Bearer csgf_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
Content-Type: application/json
```

可用端点（路径里的 `players` 是历史命名，语义上就是声优）：

- `POST /api/external/players`：新增单个声优，body 与管理后台新增声优格式相同。
- `PUT /api/external/players/:id`：部分更新声优，只传需要修改的字段。
- `POST /api/external/players/import`：按姓名批量 upsert，body 为 `{ "players": [...] }`，单次最多 1000 名。

示例：

```bash
curl -X PUT 'https://example.com/api/external/players/123' \
  -H 'Authorization: Bearer csgf_your_token' \
  -H 'Content-Type: application/json' \
  -d '{"agency":"響 HiBiKi","birth_place":"东京都","debut_year":2018,"difficulties":["normal","hard"]}'
```

外部 API 不提供永久删除；同步源可将 `is_enabled` 设为 `false`，使其立即退出游戏池与搜索列表，同时保留历史记录。

## 项目结构

```
shared/src           # 跨端共用库 @seiyuu/shared
├── seiyuu/roster.ts # 声优身份档案(姓名/日文表记/罗马字/企划/代表角色)
└── seiyuu/          # 企划定义、类型与查询辅助
server/src
├── config.ts          # 环境配置
├── db/                # Knex 实例、建表、种子数据
├── middleware/        # 认证、Zod 校验、限流、PoW、错误处理
├── routes/            # auth / players / game / stats / leaderboard / announcements / admin
├── services/          # 游戏判定、声优缓存、房间状态、战绩队列等
└── socket/            # 多人房间系统
client/src
├── api/               # axios 封装、socket 单例、声优列表缓存
├── store/             # auth / theme / guest 等轻量状态
├── i18n/locales/      # 中 / 英 / 日 文案与错误码翻译
├── config/            # 各玩法的纯逻辑与数据(songQuiz/ seiyuuQuiz/ seiyuuLife/ seiyuuAgency/ ...)
├── components/        # Page / SiteHeader / GuessBoard / DataTable / admin/*
└── pages/             # Portal / Home / SongQuiz / SeiValue / WhoYouAre / SeiyuuQuiz / ...
```

### 猜歌曲库

谜题数据完全在前端：`client/src/config/songQuiz/songs/<groupId>.ts`，一个分组一个文件，
由 `import.meta.glob` 自动注册（新增分组只需丢文件 + 在 `groups.ts` 登记）。

### 声优公共库

声优的客观身份信息统一放在 `shared/src/seiyuu/roster.ts`,玩法模块只保留自己的主观数据
(如 Who You Are 的气质画像分按 `id` 关联)。改完数据跑一次校验:

```bash
node --experimental-strip-types --disable-warning=ExperimentalWarning scripts/verify-seiyuu.mjs
```

报告输出到 `tmp/seiyuu-verify-report.md`,内容为对照服务端声优库与 Bangumi 的差异清单。

## 贡献

- 🐛 [问题反馈 / 功能建议](https://github.com/shengengfun/seiyuu-game-collection/issues/new/choose) —— 请使用对应的 issue 模板
- 提交 PR 前请运行 `pnpm test` 与 `pnpm build`；所有用户可见文案需同步维护中/英/日三语(`client/src/i18n/locales/{zh,en,ja}.ts`)
- 新增曲目/题库：曲库生成与校验脚本见 `tmp/`(本地脚手架，不入库)，题库直接往 `client/src/config/seiyuuQuiz/banks/<声优 id>.ts` 丢文件即可

### 打包与上线

推送前建议按模块提交、分模块上传，单次体积小、定位问题也快：

```bash
git add .gitignore README.md package.json pnpm-lock.yaml pnpm-workspace.yaml \
        compose.yaml Dockerfile .github deploy docs && git commit -m "chore: 仓库骨架"
git add shared && git commit -m "feat(shared): 声优公共库"
git add server && git commit -m "feat(server): 后端与接口"
git add client && git commit -m "feat(client): 前端与 12 个小游戏"
git add scripts pow-wasm launcher cloudflared && git commit -m "chore: 脚本 / PoW / 启动器"
git push
```

## 致谢与贡献者

- **小丸** —— 项目最初的前身与玩法灵感
- **shengengfun** —— 站点搭建、玩法设计、数据整理与运维
- **DeepSeek** —— 代码与文案协作
- **GitHub Copilot** —— 代码与文案协作

## 许可证

本项目基于 [AGPL-3.0](LICENSE) 开源。
