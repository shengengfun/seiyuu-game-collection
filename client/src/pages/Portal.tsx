import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Building2, Compass, Gamepad2, Grid3x3, Heart, ListChecks, Music, Network, Scale, ScanSearch, Sparkles, Sprout } from 'lucide-react';
import MenuCard from '../components/MenuCard';
import SiteHeader from '../components/SiteHeader';
import AnnouncementBoard from '../components/AnnouncementBoard';
import HomeSpecialThanks from '../components/HomeSpecialThanks';
import HomeFriendLinks from '../components/HomeFriendLinks';
import { BilibiliIcon, GitHubIcon } from '../components/BrandIcons';
import { LIKE_YOU_HOME, SEIVALUE_HOME, SEIYU_GUESS_HOME, SEIYUU_AGENCY_HOME, SEIYUU_BINGO_HOME, SEIYUU_LIFE_HOME, SEIYUU_NETWORK_HOME, SEIYUU_QUIZ_HOME, SEIYUU_RESUME_HOME, SONG_QUIZ_HOME, SUKIKIRAI_HOME, WHO_YOU_ARE_HOME } from '../config/routes';
import { QUIZ_MODES } from '../config/whoYouAre';

/**
 * 站点首页:声优情报站门户。
 * 只负责列出各个小游戏的入口,游戏自身的内容都在二级页面里。
 */
export default function Portal() {
  const { t } = useTranslation();
  const sponsor = t('home.titleSponsor');

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
        <div className="portal-grid">
          <MenuCard
            to={SEIYU_GUESS_HOME}
            icon={<Gamepad2 size={22} />}
            label={t('common.brand')}
            description={t('portal.games.seiyuGuess')}
            color="#74e38f"
          />
          <MenuCard
            to={SEIVALUE_HOME}
            icon={<Compass size={22} />}
            label={t('seivalue.title')}
            description={t('portal.games.seivalue')}
            color="#c08cff"
          />
          <MenuCard
            to={WHO_YOU_ARE_HOME}
            icon={<Heart size={22} />}
            label={t('whoYouAre.title')}
            description={t('portal.games.whoYouAre', {
              fast: QUIZ_MODES.fast.questions,
              pro: QUIZ_MODES.pro.questions,
            })}
            color="#ff9ec4"
          />
          <MenuCard
            to={SEIYUU_QUIZ_HOME}
            icon={<ListChecks size={22} />}
            label={t('seiyuuQuiz.title')}
            description={t('portal.games.seiyuuQuiz')}
            color="#ffd166"
          />
          <MenuCard
            to={SUKIKIRAI_HOME}
            icon={<Scale size={22} />}
            label={t('sukikirai.title')}
            description={t('portal.games.sukikirai')}
            color="#5b9dff"
          />
          <MenuCard
            to={SONG_QUIZ_HOME}
            icon={<Music size={22} />}
            label={t('songQuiz.title')}
            description={t('portal.games.songQuiz')}
            color="#ff9f5b"
          />
          <MenuCard
            to={LIKE_YOU_HOME}
            icon={<Sparkles size={22} />}
            label={t('likeYou.title')}
            description={t('portal.games.likeYou')}
            color="#ff6fae"
          />
          <MenuCard
            to={SEIYUU_BINGO_HOME}
            icon={<Grid3x3 size={22} />}
            label={t('seiyuuBingo.title')}
            description={t('portal.games.seiyuuBingo')}
            color="#ffb020"
          />
          <MenuCard
            to={SEIYUU_NETWORK_HOME}
            icon={<Network size={22} />}
            label={t('seiyuuNetwork.title')}
            description={t('portal.games.seiyuuNetwork')}
            color="#4fd1c5"
          />
          <MenuCard
            to={SEIYUU_LIFE_HOME}
            icon={<Sprout size={22} />}
            label={t('seiyuuLife.title')}
            description={t('portal.games.seiyuuLife')}
            color="#7bd389"
          />
          <MenuCard
            to={SEIYUU_AGENCY_HOME}
            icon={<Building2 size={22} />}
            label={t('seiyuuAgency.title')}
            description={t('portal.games.seiyuuAgency')}
            color="#f4a259"
          />
          <MenuCard
            to={SEIYUU_RESUME_HOME}
            icon={<ScanSearch size={22} />}
            label={t('seiyuuResume.title')}
            description={t('portal.games.seiyuuResume')}
            color="#8ecae6"
          />
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
      {/* 右下角公告栏：当日第一次打开自动展开，之后默认收起 */}
      <AnnouncementBoard />
    </div>
  );
}
