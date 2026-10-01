import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Page } from '@seiyuu/game-sdk';
import ModuleHost from './ModuleHost';
import NotFound from '../pages/NotFound';
import { findModuleByPath } from './registry';
import { useModules } from './useModules';

/**
 * 路由兜底：静态路由都没命中时，看是不是某个小游戏模块的路径。
 *
 * 之所以用兜底路由而不是「按注册表动态生成路由表」，是因为注册表是异步拉取的，
 * 而 router 是同步创建的；兜底路由既不用重建 router，也不受模块增删影响。
 */
export default function ModuleRoute() {
  const location = useLocation();
  const { t } = useTranslation();
  const { modules, loading, error } = useModules();

  if (loading) {
    return (
      <Page title={t('common.loading')} className="module-host">
        <div className="page-loading route-loading" aria-busy="true">
          <div className="spinner" />
        </div>
      </Page>
    );
  }

  const manifest = findModuleByPath(modules, location.pathname);
  if (!manifest) {
    if (error) {
      return (
        <Page title={t('common.loading')} className="module-host">
          <div className="module-host-error">
            <p>{t('moduleHost.registryFailed')}</p>
            <button type="button" className="btn" onClick={() => window.location.reload()}>
              {t('common.retry')}
            </button>
          </div>
        </Page>
      );
    }
    return <NotFound />;
  }

  return <ModuleHost manifest={manifest} />;
}
