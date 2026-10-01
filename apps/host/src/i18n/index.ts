import { bootstrapI18n } from '@seiyuu/game-sdk';
import zh from './locales/zh';

/**
 * 主站核心文案（导航、后台、多人对战、错误码……）。
 *
 * 这段逻辑本身在 `@seiyuu/game-sdk`，主站只负责把「核心语言包」交给它；
 * 小游戏模块的文案由模块加载器在运行时登记进同一个 i18next 实例。
 *
 * 只有中文随首屏一起打包：en / ja 各占 100KB 以上，且访客大多数用中文，
 * 其余语言拆成独立 chunk，真正需要时再下载（手机端首屏能少下一大截）。
 */
export const { languageReady } = bootstrapI18n({
  eager: zh,
  loaders: {
    en: () => import('./locales/en'),
    ja: () => import('./locales/ja'),
  },
});

export {
  addTranslationBundle,
  currentLanguage,
  currentLocale,
  loadLanguage,
  onLanguageChanged,
  supportedLanguages,
  type AppLanguage,
} from '@seiyuu/game-sdk';
