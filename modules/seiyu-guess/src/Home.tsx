import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Gamepad2, Globe, BarChart3, Trophy, Megaphone } from 'lucide-react';
import { MenuCard } from '@seiyuu/game-sdk';
import { GameRules } from '@seiyuu/game-sdk';
import { SiteHeader } from '@seiyuu/game-sdk';
import { HomeSpecialThanks } from '@seiyuu/game-sdk';
import { HomeFriendLinks } from '@seiyuu/game-sdk';
import { BilibiliIcon, GitHubIcon } from '@seiyuu/game-sdk';
import { useAuth } from '@seiyuu/game-sdk';
import { useTranslation } from 'react-i18next';
import { SITE_HOME } from '@seiyuu/game-sdk';

export default function Home() {
  const { t } = useTranslation();
  const { user, initialized } = useAuth();
  const sponsor = t('home.titleSponsor');
  const [showLeaderboard, setShowLeaderboard] = useState(true);

  useEffect(() => {
    document.title = `${t('common.brand')} - ${t('home.subtitle')}`;
  }, [t]);

  useEffect(() => {
    void fetch('/api/health', { credentials: 'include' })
      .then((response) => response.ok ? response.json() : null)
      .then((data: { features?: { leaderboard?: boolean } } | null) => {
        setShowLeaderboard(typeof data?.features?.leaderboard === 'boolean' ? data.features.leaderboard : true);
      })
      .catch(() => setShowLeaderboard(true));
  }, []);

  return (
    <div className="page home-page">
      <a className="skip-link" href="#main-content">
        {t('common.skipToContent')}
      </a>
      <SiteHeader
        brand={t('common.brand')}
        backTo={{ to: SITE_HOME, label: t('portal.backToSite') }}
      />
      <main className="page-scroll" id="main-content">
        <div className="home-hero">
          <span className="hero-kicker">SEIYUU GUESSING GAME</span>
          <h1>{t('common.brand')}</h1>
          <p className="hero-subtitle">{t('home.subtitle')}</p>
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
          <GameRules />
          {initialized && !user && (
            <p className="muted" style={{ marginTop: 6 }}>
              {t('home.guestHint')}
            </p>
          )}
        </div>
        <div className="menu-grid">
          <MenuCard
            to="/single"
            icon={<Gamepad2 size={22} />}
            label={t('home.singleMode')}
            description={t('home.singleModeDescription')}
            color="#74e38f"
          />
          <MenuCard
            to="/multi"
            icon={<Globe size={22} />}
            label={t('home.multiplayer')}
            description={t('home.multiplayerDescription')}
            color="#ffb64e"
          />
          <MenuCard
            to="/search"
            icon={<Search size={22} />}
            label={t('home.search')}
            description={t('home.searchDescription')}
            color="#65a8ff"
          />
        </div>
        <div className="bottom-bar">
          <Link to="/stats" className="btn">
            <BarChart3 size={15} />
            {t('home.stats')}
          </Link>
          {showLeaderboard && (
            <Link to="/leaderboard" className="btn btn-warning">
              <Trophy size={15} />
              {t('home.leaderboard')}
            </Link>
          )}
          <Link to="/announcement" className="btn btn-success">
            <Megaphone size={15} />
            {t('home.announcements')}
          </Link>
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
            href="https://github.com/shnlfriberg/csgofriberg"
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
    </div>
  );
}
