import { useEffect, useState, type ComponentType } from 'react';
import {
  addTranslationBundle,
  currentLanguage,
  onLanguageChanged,
  Page,
  toast,
  type GameModuleManifest,
} from '@seiyuu/game-sdk';
import { useTranslation } from 'react-i18next';
import { moduleAssetUrl } from './registry';

/**
 * 单个小游戏模块的运行时宿主。
 *
 * 进入路由后依次做三件事：
 *   1. 注入模块样式（`<link>`，一次性）
 *   2. 把模块自带的当前语言文案登记进 i18next（切语言时按需补）
 *   3. 动态 `import()` 模块入口，拿到 default 导出的 React 组件后渲染
 *
 * 模块与主站共用同一份 React / Router / i18n（见 `/vendor/*.js`），
 * 所以模块里直接用 `useTranslation`、`<Link>`、`<Routes>` 都能正常工作。
 */

/** 已经注入过的样式与文案，避免重复挂载时反复发请求。 */
const injectedStyles = new Set<string>();
const loadedLocales = new Set<string>();

function injectStyles(manifest: GameModuleManifest): void {
  for (const file of manifest.styles ?? []) {
    const url = moduleAssetUrl(manifest, file);
    if (injectedStyles.has(url)) continue;
    injectedStyles.add(url);
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = url;
    link.dataset.module = manifest.id;
    document.head.appendChild(link);
  }
}

async function ensureLocaleBundle(manifest: GameModuleManifest): Promise<void> {
  const language = currentLanguage();
  const file = manifest.locales?.[language];
  if (!file) return;
  const key = `${manifest.id}:${language}`;
  if (loadedLocales.has(key)) return;
  loadedLocales.add(key);
  try {
    const response = await fetch(moduleAssetUrl(manifest, file), { cache: 'no-cache' });
    if (!response.ok) throw new Error(String(response.status));
    addTranslationBundle(language, (await response.json()) as Record<string, unknown>);
  } catch {
    // 文案拿不到时退回主站文案，模块仍然可用
    loadedLocales.delete(key);
  }
}

interface Props {
  manifest: GameModuleManifest;
}

export default function ModuleHost({ manifest }: Props) {
  const { t } = useTranslation();
  const [Component, setComponent] = useState<ComponentType | null>(null);
  const [failed, setFailed] = useState(false);
  /* 切换语言后 +1，强制重渲染让模块里的 t() 取到新文案 */
  const [, setLocaleVersion] = useState(0);

  // 1) 样式
  useEffect(() => {
    injectStyles(manifest);
  }, [manifest]);

  // 2) 文案（首挂 + 切语言）
  useEffect(() => {
    void ensureLocaleBundle(manifest);
    return onLanguageChanged(() => {
      void ensureLocaleBundle(manifest).then(() => setLocaleVersion((value) => value + 1));
    });
  }, [manifest]);

  // 3) 入口脚本
  useEffect(() => {
    let disposed = false;
    setComponent(null);
    setFailed(false);
    const entry = moduleAssetUrl(manifest, manifest.entry ?? 'index.js');
    import(/* @vite-ignore */ entry)
      .then((loaded: { default?: ComponentType }) => {
        if (disposed) return;
        if (!loaded.default) throw new Error('模块入口没有默认导出 React 组件');
        setComponent(() => loaded.default as ComponentType);
      })
      .catch((error: unknown) => {
        if (disposed) return;
        console.error(`[modules] ${manifest.id} 加载失败`, error);
        setFailed(true);
        toast.error(t('moduleHost.loadFailed', { name: manifest.title.zh ?? manifest.id }));
      });
    return () => {
      disposed = true;
    };
  }, [manifest, t]);

  if (failed) {
    return (
      <Page title={manifest.title.zh ?? manifest.id} className="module-host">
        <div className="module-host-error">
          <p>{t('moduleHost.loadFailed', { name: manifest.title.zh ?? manifest.id })}</p>
          <button type="button" className="btn" onClick={() => window.location.reload()}>
            {t('common.retry')}
          </button>
        </div>
      </Page>
    );
  }

  if (!Component) {
    return (
      <Page title={manifest.title.zh ?? manifest.id} className="module-host">
        <div className="page-loading route-loading" aria-busy="true">
          <div className="spinner" />
        </div>
      </Page>
    );
  }

  return <Component />;
}
