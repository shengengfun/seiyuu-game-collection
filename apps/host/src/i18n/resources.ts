import zh from './locales/zh';
import en from './locales/en';
import ja from './locales/ja';

/**
 * 三语全量文案的聚合视图。
 *
 * 运行时不会整体加载它:`i18n/index.ts` 只静态引入中文,en/ja 在需要时才动态下载
 * (见 `loadLanguage`),这样手机端首屏能少下 200KB 左右。
 * 这个对象保留给测试与工具做「三语键齐全性」校验(如 `config/whoYouAre.test.ts`)。
 */
export const resources = {
  zh: { translation: zh },
  en: { translation: en },
  ja: { translation: ja },
};
