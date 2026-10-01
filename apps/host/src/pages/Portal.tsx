import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { GameModuleManifest } from '@seiyuu/game-sdk';
import {
  BilibiliIcon,
  GitHubIcon,
  HomeFriendLinks,
  HomeSpecialThanks,
  MenuCard,
  SiteHeader,
} from '@seiyuu/game-sdk';
import AnnouncementBoard from '../components/AnnouncementBoard';
import { moduleIcon } from '../modules/moduleIcons';
import { useModules } from '../modules/useModules';

/**
 * 站点首页：声优情报站门户。
 *
 * 游戏入口**不写死**——它读 `modules/registry.json`（由 `scripts/build-modules.mjs`
 * 从各模块的 module.json 汇总）。新增/下线一个小游戏不需要改主站源码，
 * 重新生成注册表即可。
 */
function useLocalized(manifest: GameModuleManifest) {
  const { i18n } = useTranslation();
  const language = (i18n.language || 'zh').split('-')[0];
  const pick = (text: Record<string, string> | undefined) =>
    text?.[language] ?? text?.zh ?? manifest.id;
  return { title: pick(manifest.title), description: pick(manifest.description) };
}

function ModuleCard({ manifest }: { manifest: GameModuleManifest }) {
  const { title, description } = useLocalized(manifest);
  const Icon = moduleIcon(manifest.icon);
  return (
    <MenuCard
      to={manifest.path}
      icon={<Icon size={22} />}
      label={title}
      description={description}
      color={manifest.color}
    />
  );
}

export default function Portal() {
  const { t } = useTranslation();
  const sponsor = t('home.titleSponsor');
  const { modules, loading, error } = useModules();

  useEffect(() => {
    document.title = `${t('common.siteName')} - ${t('portal.subtitle')}`;
  }, [t]);

  return (
    <div className="page home-page">
      <a className="skip-link" href="#main-content">
        {t('common.skipToContent')}
      </a>
      <SiteHeader brand={t('common.siteName')} />
      <main className="page-scroll" id="main-content">
        <div className="home-hero portal-hero">
          <img
            className="portal-logo"
            src="/logo-website-144.jpg"
            alt=""
            width={72}
            height={72}
          />
          <span className="hero-kicker">{t('portal.kicker')}</span>
          <h1>{t('common.siteName')}</h1>
          <p className="hero-subtitle">{t('portal.subtitle')}</p>
          {/* 主标题下的作者 B 站入口：引导关注以第一时间看到更新公告 */}
          <a
            className="portal-follow"
            href="https://space.bilibili.com/10521989"
            target="_blank"
            rel="noopener noreferrer"
            data-umami-event="portal-follow-author"
          >
            <BilibiliIcon />
            {t('portal.followAuthor')}
          </a>
          {sponsor && (
            <a
              className="home-sponsor-link"
              href="https://www.douyu.com/6979222"
              target="_blank"
              rel="noopener noreferrer"
              data-umami-event="home-wanjiqi-sponsor"
            >
              {sponsor}
            </a>
          )}
        </div>

        {loading && (
          <div className="page-loading portal-loading" aria-busy="true">
            <div className="spinner" />
          </div>
        )}
        {!loading && !!error && (
          <p className="muted portal-hint">{t('moduleHost.registryFailed')}</p>
        )}

        <div className="portal-grid">
          {modules.map((manifest) => (
            <ModuleCard key={manifest.id} manifest={manifest} />
          ))}
        </div>

        <p className="muted portal-hint">{t('portal.hint')}</p>
        <div className="bottom-bar">
          <HomeSpecialThanks />
          <HomeFriendLinks />
          <a
            href="https://space.bilibili.com/10521989"
            className="btn btn-bilibili"
            target="_blank"
            rel="noopener noreferrer"
            data-umami-event="home-bilibili"
          >
            <BilibiliIcon />
            {t('home.bilibili')}
          </a>
          <a
            href="https://github.com/shengengfun/seiyuu-game-collection"
            className="btn btn-github"
            target="_blank"
            rel="noopener noreferrer"
            data-umami-event="home-github"
          >
            <GitHubIcon />
            {t('home.github')}
          </a>
        </div>
      </main>
      {/* 右下角公告栏：当日第一次打开自动展开，之后默认收起 */}
      <AnnouncementBoard />
    </div>
  );
}
