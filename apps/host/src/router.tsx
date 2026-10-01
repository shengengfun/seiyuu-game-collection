import { Suspense, lazy, type ReactElement } from 'react';
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@seiyuu/game-sdk';
import { Page } from '@seiyuu/game-sdk';
import Portal from './pages/Portal';
import RouteError from './components/RouteError';
import ModuleRoute from './modules/ModuleRoute';
import { Wrench } from 'lucide-react';

/*
 * 主站只包含「站点骨架」：门户、账号、搜索、统计、排行榜、公告、后台。
 *
 * 12 个小游戏**不在主站源码里**——它们是 modules/<id> 下的独立模块，
 * 各自独立构建，产物由 ModuleRoute 在运行时按注册表加载（见 src/modules/）。
 * 因此改一个游戏只需要重建那一个模块，主站不必重新构建。
 *
 * 这里的静态页面仍然按路由懒加载：首屏只拿门户 + 公共依赖，
 * 其余 chunk 在真正进入对应路由时才下载。
 */
const Login = lazy(() => import('./pages/Login'));
const PasswordReset = lazy(() => import('./pages/PasswordReset'));
const EmailVerify = lazy(() => import('./pages/EmailVerify'));
const Search = lazy(() => import('./pages/Search'));
const Stats = lazy(() => import('./pages/Stats'));
const Leaderboard = lazy(() => import('./pages/Leaderboard'));
const Announcements = lazy(() => import('./pages/Announcements'));
const Admin = lazy(() => import('./pages/Admin'));

/** 懒加载 chunk 到位前的占位，避免白屏。 */
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

/* 所有静态页面与游戏模块均不强制登录，仅管理后台需要管理员身份 */
function RequireAdmin() {
  const { user, initialized } = useAuth();
  if (!initialized) {
    return (
      <Page title="管理后台" icon={<Wrench size={17} />}>
        <div className="page-loading">
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
      /* 门户：声优情报站首页，是首屏页面，保持静态引入 */
      { path: '/', element: <Portal /> },
      { path: '/login', element: withSuspense(<Login />) },
      { path: '/password-reset', element: withSuspense(<PasswordReset />) },
      { path: '/email-verify', element: withSuspense(<EmailVerify />) },
      { path: '/search', element: withSuspense(<Search />) },
      { path: '/stats', element: withSuspense(<Stats />) },
      { path: '/leaderboard', element: withSuspense(<Leaderboard />) },
      { path: '/announcement', element: withSuspense(<Announcements />) },
      {
        element: <RequireAdmin />,
        children: [{ path: '/admin', element: withSuspense(<Admin />) }],
      },
      /*
       * 兜底路由：静态页面都没命中时，看是不是某个小游戏模块的路径。
       * 用兜底而不是「按注册表生成路由」，是因为注册表是异步拉取的，
       * 而 router 是同步创建的——这样模块增删都不需要重建 router。
       */
      { path: '*', element: withSuspense(<ModuleRoute />) },
    ],
  },
]);
