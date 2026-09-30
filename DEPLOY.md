# 声优猜 - 部署指南

## 整合包内容

```
seiyu-guess-package/
├── client/              # 前端源码
├── server/              # 后端源码 + 数据库
│   └── data/
│       └── seiyuu-bangumi.sqlite3   # 核心数据库(已修复好的)
├── pow-wasm/            # PoW Rust 源码(防作弊,可选)
├── docs/                # 文档
├── deploy/              # 部署辅助
├── .env                 # 生产环境配置(需要填)
├── .env.dev-reference   # 开发环境的 .env(仅供参考)
├── setup.sh / setup.bat # 一键部署脚本
├── start.sh / start.bat # 启动脚本
├── package.json
├── pnpm-lock.yaml
└── README.md
```

## 服务器环境要求

- **Node.js 20+** (推荐 22 LTS)
- **pnpm** (`npm i -g pnpm`)
- **Rust + wasm32 target** (可选,只在开启 PoW 防作弊时需要)
- **Redis** (可选,不装的话多人对战不能用,单人能玩)
- **Cloudflared** (Cloudflare Tunnel 客户端)

## 部署步骤 (Linux 服务器)

### 1. 上传整合包

```bash
# 把 zip 上传到服务器,比如 /opt/
scp seiyu-guess-package.zip user@server:/opt/
ssh user@server
cd /opt
unzip seiyu-guess-package.zip
cd seiyu-guess-package
```

### 2. 编辑 .env

```bash
vim .env
```

必须修改的项:
- `CORS_ORIGINS`: 改成你的真实公网域名,例如 `https://guess.yourdomain.com`
- `JWT_SECRET`: 用 `openssl rand -base64 48` 生成,粘贴进来
- `GUEST_ID_SALT`: 再生成一个不同的,粘贴进来

可选修改:
- `REDIS_REQUIRED`: 想开多人对战改成 `true` 并装 Redis
- `POW_DIFFICULTY`: 默认 17 已经够用

### 3. 一键部署

```bash
chmod +x setup.sh
./setup.sh
```

这会自动:
- 检查 Node.js / pnpm
- `pnpm install` 装依赖
- 检查 .env 配置
- `pnpm build` 构建前后端 + PoW wasm

### 4. 启动服务

**前台测试:**
```bash
./start.sh
```

**PM2 守护(推荐):**
```bash
npm install -g pm2
pm2 start ./start.sh --name seiyuu-guess
pm2 logs seiyuu-guess
pm2 save
pm2 startup    # 按提示执行命令实现开机自启
```

服务默认监听 **3000** 端口。

### 5. 配置 Cloudflare Tunnel

```bash
# 安装 cloudflared
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o /usr/local/bin/cloudflared
chmod +x /usr/local/bin/cloudflared

# 登录(会打开浏览器)
cloudflared tunnel login

# 创建隧道
cloudflared tunnel create seiyuu-guess

# 配置隧道(编辑 ~/.cloudflared/config.yml)
cat > ~/.cloudflared/config.yml <<EOF
tunnel: <你的隧道ID>
credentials-file: /root/.cloudflared/<你的隧道ID>.json

ingress:
  - hostname: guess.yourdomain.com
    service: http://localhost:3000
  - service: http_status:404
EOF

# 绑定 DNS 记录
cloudflared tunnel route dns seiyuu-guess guess.yourdomain.com

# 启动隧道
cloudflared tunnel run seiyuu-guess

# (可选)装成系统服务
cloudflared service install
systemctl start cloudflared
```

### 6. 验证

访问 `https://guess.yourdomain.com` 即可。

健康检查: `curl http://localhost:3000/api/health`

## 部署步骤 (Windows)

1. 解压 zip 到任意目录
2. 用记事本打开 `.env`,填好 `CORS_ORIGINS` / `JWT_SECRET` / `GUEST_ID_SALT`
3. 双击 `setup.bat`
4. 双击 `start.bat`

## 常见问题

### Q: 启动后访问 502 / 连不上?
- 检查 `pm2 logs seiyuu-guess` 看报错
- 确认 `.env` 里的占位符 `<...>` 已经全部替换
- 确认 `server/data/seiyuu-bangumi.sqlite3` 存在

### Q: 想开多人对战?
1. 装 Redis: `apt install redis-server`
2. `.env` 改 `REDIS_REQUIRED=true`
3. 重启服务

### Q: PoW 报错 "wasm 文件不存在"?
- 没 Rust 环境会跳过 PoW 构建,默认 `POW_DIFFICULTY=0` 是关掉的
- 想开启:装 Rust → `rustup target add wasm32-unknown-unknown` → `pnpm build:pow`

### Q: 数据库要更新怎么办?
- 替换 `server/data/seiyuu-bangumi.sqlite3`
- 重启服务: `pm2 restart seiyuu-guess`

### Q: 怎么备份数据库?
- SQLite 是单文件,直接复制 `server/data/seiyuu-bangumi.sqlite3` 即可
- 建议用 crontab 定时备份
