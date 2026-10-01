# __MODULE_TITLE_ZH__（`__MODULE_ID__`）

声优情报站的独立小游戏模块，路由 `__MODULE_PATH__`。

## 开发

```bash
# 在**主库根目录**（seiyuu-game-collection）里：

# 1. 第一次先构建共享依赖产物（生成 apps/host/public/vendor/）
node scripts/build-vendor.mjs

# 2. 边改边构建这个模块
pnpm --filter @seiyuu/module-__MODULE_ID__ dev

# 3. 另开一个终端跑主站（会自动读到 modules/<id>/dist 的产物）
pnpm dev
```

改完模块源码后 `pnpm --filter @seiyuu/module-__MODULE_ID__ dev` 会自动重建，
产物同步到主站由 `node scripts/build-modules.mjs` 负责（跑一次全量构建即可）。

## 结构

| 文件 | 作用 |
| --- | --- |
| `module.json` | 模块清单：路由、门户卡片标题/描述（三语）、图标、排序 |
| `src/index.tsx` | 模块入口，`export default` 一个 React 组件 |
| `locales/{zh,en,ja}.json` | 模块自带文案，挂载时由主站登记进 i18next |
| `shared-deps.mjs` | 与主站共用的依赖清单（构建时外置到 `/vendor/*.js`） |

## 约定

- 所有跨模块能力都从 `@seiyuu/game-sdk` 取：`Page` / `api` / `useAuth` /
  `shareToQq` / `renderScorePoster` / `toast` …，**不要**直接依赖主站源码。
- `react`、`react-router-dom`、`react-i18next` 等已由主站提供，
  它们不是重复打包，而是指向同一实例——所以 `<Link>` / `useTranslation` 都正常工作。
- 文案三语齐全；缺哪一语言就跑 `locales/<lang>.json` 补上。
