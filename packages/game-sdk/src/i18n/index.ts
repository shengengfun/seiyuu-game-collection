import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

/**
 * 站点文案运行时。
 *
 * 这段逻辑原本在主站 `client/src/i18n/index.ts`，模块化之后上移到 SDK：
 * 主站与所有游戏模块共用**同一个** i18next 实例（由 `/vendor/i18next.js` 提供单例），
 * 因此模块只需要把自带的文案包登记进来，`useTranslation()` 就能取到。
 *
 * 主站负责登记「核心文案」（导航、后台、多人对战等），模块负责登记自己的文案，
 * 两边都通过 `addTranslationBundle` 写入同一个实例。
 */

export const supportedLanguages = ['zh', 'en', 'ja'] as const;
export type AppLanguage = (typeof supportedLanguages)[number];

/** 语言偏好的 localStorage 键（沿用历史键名，避免老访客丢掉选择）。 */
export const LANGUAGE_STORAGE_KEY = 'csgofriberg_language';

type LocaleModule = { default: Record<string, unknown> };
/** 某种语言的文案懒加载器（模块的 locales/<lang>.json 或主站的语言包）。 */
export type LocaleLoader = () => Promise<LocaleModule>;

/** 语言切换监听器：语言包换掉之后需要重新登记文案的使用方（如模块加载器）。 */
type LanguageListener = (language: AppLanguage) => void;
const languageListeners = new Set<LanguageListener>();

const languageLoads = new Map<string, Promise<void>>();

export function normalizeLanguage(value: string | null | undefined): AppLanguage | null {
  const language = value?.toLowerCase().split('-')[0];
  return supportedLanguages.find((candidate) => candidate === language) ?? null;
}

/** 按 localStorage → navigator 的顺序推断首屏语言。 */
export function detectLanguage(): AppLanguage {
  try {
    const stored = normalizeLanguage(localStorage.getItem(LANGUAGE_STORAGE_KEY));
    if (stored) return stored;
  } catch {
    // 浏览器可能禁用存储；语言推断仍要继续
  }
  for (const language of navigator.languages ?? [navigator.language]) {
    const supported = normalizeLanguage(language);
    if (supported) return supported;
  }
  return 'zh';
}

/** 当前语言对应的 BCP-47 标签（给 Intl / <html lang> 用）。 */
export function currentLocale(): string {
  const language = normalizeLanguage(i18n.language) ?? 'zh';
  return language === 'zh' ? 'zh-CN' : language === 'ja' ? 'ja-JP' : 'en-US';
}

/** 当前语言。 */
export function currentLanguage(): AppLanguage {
  return normalizeLanguage(i18n.language) ?? 'zh';
}

/**
 * 登记一份文案包。
 *
 * `deep` + `overwrite` 都打开：模块重复挂载时不会互相覆盖，
 * 后加载的模块文案也不会把核心文案挤掉。
 */
export function addTranslationBundle(
  language: string,
  bundle: Record<string, unknown>
): void {
  i18n.addResourceBundle(language, 'translation', bundle, true, true);
}

/** 监听语言切换（加载完新语言包之后触发）。 */
export function onLanguageChanged(listener: LanguageListener): () => void {
  languageListeners.add(listener);
  return () => languageListeners.delete(listener);
}

/** 已登记的语言包是否就位。 */
export function hasTranslationBundle(language: string): boolean {
  return i18n.hasResourceBundle(language, 'translation');
}

export interface BootstrapI18nOptions {
  /** 首屏内置的文案（主站一般是中文），随主包一起下发，省一次请求。 */
  eager: Record<string, unknown>;
  /** 内置文案对应的语言，默认 `zh`。 */
  eagerLanguage?: AppLanguage;
  /** 其余语言的懒加载器。 */
  loaders?: Partial<Record<AppLanguage, LocaleLoader>>;
  /** 首屏语言；不传则按 localStorage → navigator 推断。 */
  language?: AppLanguage;
}

let loaders: Partial<Record<AppLanguage, LocaleLoader>> = {};

/**
 * 确保某语言的**核心**文案已就位；模块自带的文案由模块加载器负责。
 * 内置语言直接完成，其余语言按需下载并缓存 promise（并发调用只下载一次）。
 */
export function loadLanguage(language: AppLanguage): Promise<void> {
  if (hasTranslationBundle(language)) return Promise.resolve();
  const pending = languageLoads.get(language);
  if (pending) return pending;
  const loader = loaders[language];
  if (!loader) return Promise.resolve();
  const task = loader()
    .then((module) => {
      addTranslationBundle(language, module.default);
    })
    .catch(() => {
      // 语言包拿不到时退回 fallbackLng，不阻塞页面
    });
  languageLoads.set(language, task);
  return task;
}

function applyLanguage(language: string | undefined): void {
  const normalized = normalizeLanguage(language) ?? 'zh';
  document.documentElement.lang = normalized === 'zh' ? 'zh-CN' : normalized;
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, normalized);
  } catch {
    // 存储不可用时当前语言仍然生效
  }
}

/**
 * 初始化 i18n。返回的 `languageReady` 在首屏语言包就位后才 resolve，
 * 主站渲染前 await 一下，非中文访客就不会先闪一段中文。
 */
export function bootstrapI18n(options: BootstrapI18nOptions): { languageReady: Promise<void> } {
  const eagerLanguage = options.eagerLanguage ?? 'zh';
  loaders = options.loaders ?? {};
  const initialLanguage = options.language ?? detectLanguage();

  const initPromise = i18n.use(initReactI18next).init({
    resources: { [eagerLanguage]: { translation: options.eager } },
    /* 只内置一种语言，其余由 loadLanguage 动态补入 */
    partialBundledLanguages: true,
    lng: initialLanguage,
    initAsync: false,
    fallbackLng: eagerLanguage,
    supportedLngs: [...supportedLanguages],
    interpolation: { escapeValue: false },
    returnNull: false,
  });

  const languageReady = initPromise.then(() => loadLanguage(initialLanguage));

  i18n.on('languageChanged', (language: string) => {
    applyLanguage(language);
    const normalized = normalizeLanguage(language) ?? eagerLanguage;
    void loadLanguage(normalized).then(() => {
      for (const listener of languageListeners) listener(normalized);
    });
  });

  applyLanguage(i18n.language);
  return { languageReady };
}

export default i18n;
