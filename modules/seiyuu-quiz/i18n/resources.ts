/** 模块自带三语文案，供测试校验键齐全性。 */
import zh from '../locales/zh.json';
import en from '../locales/en.json';
import ja from '../locales/ja.json';

export const resources = {
  zh: { translation: zh as Record<string, unknown> },
  en: { translation: en as Record<string, unknown> },
  ja: { translation: ja as Record<string, unknown> },
};
