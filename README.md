# 声优情报站（seiyuu-game-collection）

日本女声优主题小游戏合集。主库只负责门户、账号、排行榜、多人对战、后台与静态数据库，
**每个小游戏都是一个独立仓库**，通过 git submodule 挂在 `modules/` 下，主站在运行时按注册表动态加载。

## 仓库结构

| 路径 | 说明 |
| --- | --- |
| `apps/host` | 主站前端：门户 / 认证 / 排行榜 / 多人 / 后台 / 模块加载器 |
| `apps/server` | 后端：Express + Socket.IO + SQLite |
| `packages/game-sdk` | `@seiyuu/game-sdk`：模块协议（`defineModule` / `Page` / i18n 注入）与主站注入的共享能力 |
| `packages/shared` | `@seiyuu/shared`：声优公共数据与工具 |
| `modules/<id>` | 13 个小游戏模块，**每个都是独立仓库（submodule）** |
| `scripts` | 构建与运维脚本（vendor 打包、模块构建、子库拆分等） |

模块子库（`shengengfun/seiyuu-module-<id>`）：

`song-quiz` · `seiyuu-quiz` · `seiyu-guess` · `seivalue` · `who-you-are` · `sukikirai` ·
`like-you` · `seiyuu-bingo` · `seiyuu-network` · `seiyuu-life` · `seiyuu-agency` · `seiyuu-resume`

## 快速开始

```bash
# 子库必须一起拉，否则 modules/ 是空目录
git clone --recurse-submodules https://github.com/shengengfun/seiyuu-game-collection.git
cd seiyuu-game-collection

# 已经克隆过但没带子库
git submodule update --init --recursive

pnpm install
pnpm dev        # 主站(5173) + 后端(3000)
```

常用命令：

```bash
pnpm build            # PoW(wasm) + 全部模块 + 主站 + 后端
pnpm build:modules    # 只重建小游戏模块（主站无需重新编译）
node scripts/build-vendor.mjs --force   # 重建 /vendor 共享依赖
pnpm --filter host build                # 只构建主站
pnpm test             # 全仓测试
```

数据：数据库不入库，首次运行从 [bangumi/Archive](https://github.com/bangumi/Archive) 的
release dump 本地生成 `apps/server/data/*.sqlite3`。

## 模块化机制

### 一个模块由什么组成

```
modules/<id>/
  module.json      # id / path / order / icon / title / description / entry / styles / locales
  src/index.tsx    # 入口：export default defineModule(Component)
  locales/*.json   # 只属于该模块的文案
  shared-deps.mjs  # 与主站共用的依赖清单（外置成 /vendor/*.js）
```

主站**不打包任何游戏代码**：进入路由时才去 `import()` 对应模块的产物，
这样改一个游戏只需要重建该模块，不必全量重编译主站。

### 共享依赖（`/vendor/*.js`）

主站与模块必须共用**同一份** React / Router / i18n / SDK，否则模块里的
`useContext` 拿不到主站上下文、`<Link>` 也不在同一个 Router 树里。

- 生产：`scripts/build-vendor.mjs` 用 esbuild 把这些包打成 `apps/host/vendor/*.js`，
  主站与模块构建时都外置成 `/vendor/<固定名>.js`，构建产物再拷进 `dist/vendor/`。
  注意 React 18 只有 CJS 产物，`export * from 'react'` 在 ESM 输出里拿不到具名导出，
  因此脚本会先探测真实导出名再生成显式 `export { ... } from 'react'` 垫片。
- 开发：**不外置**，`vite-plugins/devModules.ts` 直接加载模块的 TSX 源码，
  由 Vite 保证全局只有一份 React；模块因此支持 HMR，改一行源码立即生效。

### 新增一个小游戏

```bash
pnpm modules:new <id>          # 按模板生成 modules/<id>
cd modules/<id> && pnpm dev    # 单独开发该模块
```

完成后按 `module.json` 的 `path` 挂载，主站无需改代码，只要重建该模块：

```bash
pnpm build:modules
```

需要把它也拆成独立仓库（含创建 GitHub 仓库并登记为 submodule）：

```bash
node scripts/modules-to-submodules.mjs <id>   # 已经是 submodule 的会自动跳过
```

### 子库开发流程

改某个游戏时，把它当独立仓库对待即可：

```bash
cd modules/song-quiz
git checkout -b feat/xxx
# ...改代码、commit、push...
```

子库提交后，回到主库提交一次指针更新（`.gitmodules` 指向的 commit 变了）：

```bash
cd ../.. && git add modules/song-quiz && git commit -m "chore: 更新 song-quiz 子库"
```

## 部署

见 `DEPLOY.md`；容器化在 `compose.yaml` + `Dockerfile`。

## 已知待办

- `scripts/fetch-bangumi-dump.mjs` 尚未实现（`pnpm data:fetch` 目前会失败）
- 部分 `modules/*/shared-deps.mjs` 的注释仍写着旧的 `public/vendor/` 路径

## License

见 `LICENSE`。
