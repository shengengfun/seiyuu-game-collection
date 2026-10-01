import { defineModule, Page } from '@seiyuu/game-sdk';
import { useTranslation } from 'react-i18next';
import './styles.css';

/**
 * 模块入口：`export default` 一个 React 组件即可。
 *
 * 主站会把它挂在 `module.json` 里声明的 `path` 之下，模块自己的子路由
 * 直接写 `<Routes>`（react-router-dom 与主站共用同一份实例）。
 * 主站的能力（i18n / 认证 / API / 主题 / 分享图）全部从 `@seiyuu/game-sdk` 取。
 */
function ModuleRoot() {
  const { t } = useTranslation();

  return (
    <Page title={t('__MODULE_NS__.title')} className="__MODULE_CLASS__">
      <p>{t('__MODULE_NS__.placeholder')}</p>
    </Page>
  );
}

export default defineModule(ModuleRoot);
