import { Suspense, lazy, type ReactElement } from 'react';
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './store/auth';
import Portal from './pages/Portal';
import RouteError from './components/RouteError';
import Page from './components/Page';
import { Wrench } from 'lucide-react';

/*
 * 除门户外的页面全部按路由懒加载。
 * 之前所有页面(含 70 份声优题库、管理后台)都静态引入,首屏要下载一整个大 chunk;
 * 手机端网络慢时这一步就是主要的卡顿来源。拆开后首屏只拿门户 + 公共依赖,
 * 其余 chunk 在真正进入对应路由时才下载(Vite 会自动为动态 chunk 注入 modulepreload)。
 */
const Home = lazy(() => import('./pages/Home'));
const SeiValue = lazy(() => import('./pages/SeiValue'));
const WhoYouAre = lazy(() => import('./pages/WhoYouAre'));
const SeiyuuQuiz = lazy(() => import('./pages/SeiyuuQuiz'));
const SongQuiz = lazy(() => import('./pages/SongQuiz'));
const LikeYou = lazy(() => import('./pages/LikeYou'));
const SeiyuuBingo = lazy(() => import('./pages/SeiyuuBingo'));
const SeiyuuNetwork = lazy(() => import('./pages/SeiyuuNetwork'));
const SeiyuuLife = lazy(() => import('./pages/SeiyuuLife'));
const SeiyuuAgency = lazy(() => import('./pages/SeiyuuAgency'));
const SeiyuuResume = lazy(() => import('./pages/SeiyuuResume'));
const Sukikirai = lazy(() => import('./pages/Sukikirai'));
const SukikiraiSeiyuu = lazy(() => import('./pages/SukikiraiSeiyuu'));
const Login = lazy(() => import('./pages/Login'));
const PasswordReset = lazy(() => import('./pages/PasswordReset'));
const EmailVerify = lazy(() => import('./pages/EmailVerify'));
const Search = lazy(() => import('./pages/Search'));
const SingleGame = lazy(() => import('./pages/SingleGame'));
const SingleLobby = lazy(() => import('./pages/SingleLobby'));
const MultiLobby = lazy(() => import('./pages/MultiLobby'));
const MultiRoom = lazy(() => import('./pages/MultiRoom'));
const Stats = lazy(() => import('./pages/Stats'));
const Leaderboard = lazy(() => import('./pages/Leaderboard'));
const Announcements = lazy(() => import('./pages/Announcements'));
const Admin = lazy(() => import('./pages/Admin'));
const NotFound = lazy(() => import('./pages/NotFound'));

/** 懒加载 chunk 到位前的占位,避免白屏。 */
function RouteLoading() {
  return (
    <div className="page-loading route-loading" aria-busy="true">
      <div className="spinner" />
    </div>
  );
}

/** 给懒加载页面套一层 Suspense 边界。 */
function withSuspense(element: ReactElement) {
  return <Suspense fallback={<RouteLoading />}>{element}</Suspense>;
}
import { useTranslation } from 'react-i18next';
import {
  LIKE_YOU_HOME,
  SEIVALUE_HOME,
  SEIYUU_AGENCY_HOME,
  SEIYUU_BINGO_HOME,
  SEIYUU_LIFE_HOME,
  SEIYUU_NETWORK_HOME,
  SEIYU_8VALUES_HOME,
  SEIYU_GUESS_HOME,
  SEIYUU_QUIZ_HOME,
  SEIYUU_RESUME_HOME,
  SITE_HOME,
  SONG_QUIZ_HOME,
  SUKIKIRAI_HOME,
  WHO_YOU_ARE_HOME,
} from './config/routes';

/* 所有游戏与数据页面均不强制登录,仅管理后台需要管理员身份 */
function RequireAdmin() {
  const { t } = useTranslation();
  const { user, initialized } = useAuth();
  if (!initialized) {
    return (
      <Page title={t('admin.title')} icon={<Wrench size={17} />}>
        <div className="page-loading" aria-label={t('home.restoring')}>
          <div className="spinner" />
        </div>
      </Page>
    );
  }
  return user?.role === 'admin' ? <Outlet /> : <Navigate to="/" replace />;
}

export const router = createBrowserRouter([
  {
    errorElement: <RouteError />,
    children: [
      /* 门户:声优情报站首页,是首屏页面,保持静态引入 */
      { path: SITE_HOME, element: <Portal /> },
      /* 二级页面:声优猜 */
      { path: SEIYU_GUESS_HOME, element: withSuspense(<Home />) },
      /* 二级页面:SeiValue 测试 */
      { path: SEIVALUE_HOME, element: withSuspense(<SeiValue />) },
      /* 二级页面:你是哪个声优 */
      { path: WHO_YOU_ARE_HOME, element: withSuspense(<WhoYouAre />) },
      /* 二级页面:声优问答 */
      { path: SEIYUU_QUIZ_HOME, element: withSuspense(<SeiyuuQuiz />) },
      /* 二级页面:猜歌 */
      { path: SONG_QUIZ_HOME, element: withSuspense(<SongQuiz />) },
      /* 二级页面:我喜欢你 */
      { path: LIKE_YOU_HOME, element: withSuspense(<LikeYou />) },
      /* 二级页面:声优粉宾果 */
      { path: SEIYUU_BINGO_HOME, element: withSuspense(<SeiyuuBingo />) },
      /* 二级页面:声优关系网 */
      { path: SEIYUU_NETWORK_HOME, element: withSuspense(<SeiyuuNetwork />) },
      /* 二级页面:声优人生重开 */
      { path: SEIYUU_LIFE_HOME, element: withSuspense(<SeiyuuLife />) },
      /* 二级页面:声优事务所经营 */
      { path: SEIYUU_AGENCY_HOME, element: withSuspense(<SeiyuuAgency />) },
      /* 二级页面:声优简历找茬 */
      { path: SEIYUU_RESUME_HOME, element: withSuspense(<SeiyuuResume />) },
      /* 二级页面:喜欢或讨厌（热度榜 + 人物页） */
      { path: SUKIKIRAI_HOME, element: withSuspense(<Sukikirai />) },
      { path: `${SUKIKIRAI_HOME}/:id`, element: withSuspense(<SukikiraiSeiyuu />) },
      /* 旧地址重定向 */
      { path: SEIYU_8VALUES_HOME, element: <Navigate to={SEIVALUE_HOME} replace /> },
      { path: '/login', element: withSuspense(<Login />) },
      { path: '/password-reset', element: withSuspense(<PasswordReset />) },
      { path: '/email-verify', element: withSuspense(<EmailVerify />) },
      { path: '/search', element: withSuspense(<Search />) },
      { path: '/single', element: withSuspense(<SingleLobby />) },
      { path: '/single/:mode', element: withSuspense(<SingleGame />) },
      { path: '/multi', element: withSuspense(<MultiLobby />) },
      { path: '/multi/room', element: withSuspense(<MultiRoom />) },
      { path: '/stats', element: withSuspense(<Stats />) },
      { path: '/leaderboard', element: withSuspense(<Leaderboard />) },
      { path: '/announcement', element: withSuspense(<Announcements />) },
      {
        element: <RequireAdmin />,
        children: [{ path: '/admin', element: withSuspense(<Admin />) }],
      },
      { path: '*', element: withSuspense(<NotFound />) },
    ],
  },
]);
