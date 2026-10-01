import type { ComponentType } from 'react';

/**
 * 小游戏模块协议。
 *
 * 一个游戏模块就是一个独立的仓库 + 独立的构建产物，主站**运行时**按需加载它：
 *
 *   modules/<id>/
 *     module.json          模块清单（下面的 GameModuleManifest）
 *     src/index.tsx        `export default` 一个 React 组件
 *     dist/                vite lib 构建产物（index.js + style.css + locales/*.json）
 *
 * 主站把 `dist/` 汇总到 `apps/host/public/modules/<id>/`，并生成 `registry.json`。
 * 页面进入 `<path>` 时，主站才去 `import()` 该模块的入口脚本 ——
 * 所以改一个游戏只需要重新构建那一个模块，主站零改动。
 *
 * `react` / `react-dom` / `react-router-dom` / `i18next` / `react-i18next` / `zustand` /
 * `axios` / `@seiyuu/game-sdk` 全部走主站的 vendor 产物（`/vendor/*.js`），
 * 模块与主站共用同一份实例，因此 React 上下文、路由、i18n 都能直接互通。
 */

/** 模块自带文案（三语），用于门户卡片，避免门户必须先加载模块文案包。 */
export type LocalizedText = Record<string, string>;

export interface GameModuleManifest {
  /** 模块 id，同时也是目录名与产物目录名（小写短横线）。 */
  id: string;
  /** 主路由路径，如 `/seiyuu-life`；模块自己的子路由挂在它下面。 */
  path: string;
  /** 额外路由前缀（如声优猜的 `/single`、`/multi`），同样交给本模块处理。 */
  aliases?: string[];
  /** 产物内的入口文件，默认 `index.js`。 */
  entry?: string;
  /** 需要挂载的样式文件（产物内相对路径），按顺序注入。 */
  styles?: string[];
  /** 门户卡片标题（三语字面量）。 */
  title: LocalizedText;
  /** 门户卡片描述（三语字面量）。 */
  description: LocalizedText;
  /** 门户卡片图标名（lucide 图标名，主站有一份白名单）。 */
  icon: string;
  /** 门户卡片主题色。 */
  color: string;
  /** 门户排序，越小越靠前。 */
  order: number;
  /** 为 true 时不在门户展示（但路由仍然可用）。 */
  hidden?: boolean;
  /** 产物版本（构建脚本按内容哈希生成），用于样式/脚本缓存失效。 */
  version?: string;
  /** 模块用到的语言包（产物内相对路径），按语言键给出。 */
  locales?: Partial<Record<string, string>>;
}

/** 模块入口默认导出的组件。宿主已经把它挂在 `${path}/*` 的子路由里。 */
export type GameModuleComponent = ComponentType;

/** `defineModule` 只是给入口文件一个类型，避免写错默认导出。 */
export function defineModule(component: GameModuleComponent): GameModuleComponent {
  return component;
}

/** 构建脚本汇总出来的注册表，主站启动后拉取它。 */
export interface GameModuleRegistry {
  /** 注册表结构版本，便于以后做兼容处理。 */
  version: number;
  /** 生成时间戳（毫秒）。 */
  generatedAt: number;
  modules: GameModuleManifest[];
}
