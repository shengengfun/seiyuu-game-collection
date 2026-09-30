import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import zh from './locales/zh';

export const supportedLanguages = ['zh', 'en', 'ja'] as const;
export type AppLanguage = (typeof supportedLanguages)[number];

const STORAGE_KEY = 'csgofriberg_language';

function normalizeLanguage(value: string | null | undefined): AppLanguage | null {
  const language = value?.toLowerCase().split('-')[0];
  return supportedLanguages.find((candidate) => candidate === language) ?? null;
}

function detectLanguage(): AppLanguage {
  try {
    const stored = normalizeLanguage(localStorage.getItem(STORAGE_KEY));
    if (stored) return stored;
  } catch {
    // Browser storage can be disabled; language detection should still work.
  }
  for (const language of navigator.languages ?? [navigator.language]) {
    const supported = normalizeLanguage(language);
    if (supported) return supported;
  }
  return 'zh';
}

/*
 * 只有中文随首屏一起打包：en / ja 各占 100KB 以上，且访客大多数用中文。
 * 其余语言拆成独立 chunk，真正需要时再下载（手机端首屏能少下一大截）。
 */
const lazyLocales: Record<
  Exclude<AppLanguage, 'zh'>,
  () => Promise<{ default: Record<string, unknown> }>
> = {
  en: () => import('./locales/en'),
  ja: () => import('./locales/ja'),
};

const languageLoads = new Map<AppLanguage, Promise<void>>();

/** 确保某语言的文案已就位（中文是内置的，直接完成）。 */
export function loadLanguage(language: AppLanguage): Promise<void> {
  if (language === 'zh' || i18n.hasResourceBundle(language, 'translation')) return Promise.resolve();
  const pending = languageLoads.get(language);
  if (pending) return pending;
  const task = lazyLocales[language]()
    .then((module) => {
      i18n.addResourceBundle(language, 'translation', module.default, true, true);
    })
    .catch(() => {
      // 语言包拿不到时退回 fallbackLng（中文），不阻塞页面
    });
  languageLoads.set(language, task);
  return task;
}

const initialLanguage = detectLanguage();

const initPromise = i18n.use(initReactI18next).init({
  resources: { zh: { translation: zh } },
  /* 只内置了中文，其余语言由 loadLanguage 动态补入 */
  partialBundledLanguages: true,
  lng: initialLanguage,
  initAsync: false,
  fallbackLng: 'zh',
  supportedLngs: [...supportedLanguages],
  interpolation: { escapeValue: false },
  returnNull: false,
});

/** 首屏渲染前等语言包：非中文访客先拿到自己的文案，避免先闪一段中文。 */
export const languageReady: Promise<void> = initPromise.then(() => loadLanguage(initialLanguage));

function applyLanguage(language: string | undefined): void {
  const normalized = normalizeLanguage(language) ?? initialLanguage;
  document.documentElement.lang = normalized === 'zh' ? 'zh-CN' : normalized;
  try {
    localStorage.setItem(STORAGE_KEY, normalized);
  } catch {
    // The active language still applies when persistence is unavailable.
  }
}

applyLanguage(i18n.language);
i18n.on('languageChanged', (language: string) => {
  applyLanguage(language);
  const normalized = normalizeLanguage(language);
  if (normalized) void loadLanguage(normalized);
});

export function currentLocale(): string {
  const language = normalizeLanguage(i18n.language) ?? initialLanguage;
  return language === 'zh' ? 'zh-CN' : language === 'ja' ? 'ja-JP' : 'en-US';
}

export default i18n;
