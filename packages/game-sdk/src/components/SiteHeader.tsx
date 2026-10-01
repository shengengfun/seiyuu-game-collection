import { useState, useSyncExternalStore } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, LogIn, LogOut, MailWarning, Wrench } from 'lucide-react';
import LanguageSelect from './LanguageSelect';
import OnlineBadge from './OnlineBadge';
import PersonalSettings from './PersonalSettings';
import ThemeToggle from './ThemeToggle';
import { useConfirm } from './ConfirmDialog';
import { toast } from './Toast';
import { api, errMsg } from '../api/client';
import { clearAuthenticated, markGuestSession } from '../api/session';
import { useAuth } from '../store/auth';
import { getGuestName, subscribeGuestName } from '../store/guest';

/** 站点 logo（public/logo-website-144.jpg；favicon 仍用 logo-website-192.jpg）。
 *
 * 原图是 1920×1920 的方图，站点里最大只用到 72px，512px 的 53KB 版本属于纯浪费；
 * 这里换成 144px 的 8KB 版本（覆盖 72px 的 2 倍屏），首屏少下 45KB。
 * 方图在容器里用 object-fit: cover 裁切，圆角与描边由 CSS 负责（见 home-multiplayer.css）。
 */
const brandLogo = '/logo-website-144.jpg';

interface SiteHeaderProps {
  /** 顶栏主标题:门户写站点名,游戏内写游戏名 */
  brand: string;
  /** 二级页面返回门户的入口;门户自身不传 */
  backTo?: { to: string; label: string };
}

const GUEST_FALLBACK = '访客';

/**
 * 全站顶栏:品牌区 + 语言/主题/账号操作。
 * 门户与游戏主菜单共用,二级页面通过 backTo 提供回门户的入口。
 */
export default function SiteHeader({ brand, backTo }: SiteHeaderProps) {
  const { t } = useTranslation();
  const location = useLocation();
  const { user, initialized, setUser } = useAuth();
  const confirm = useConfirm();
  const [loggingOut, setLoggingOut] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const guestName = useSyncExternalStore(subscribeGuestName, getGuestName, () => GUEST_FALLBACK);

  const logout = async () => {
    if (!await confirm({
      title: t('home.logoutTitle'),
      message: t('home.logoutMessage'),
      confirmLabel: t('home.logoutConfirm'),
      tone: 'warning',
    })) return;
    setLoggingOut(true);
    try {
      await api.post('/auth/logout');
      const { closeSocket } = await import('../api/socket');
      closeSocket();
      clearAuthenticated();
      markGuestSession();
      setUser(null);
      const { getSocket } = await import('../api/socket');
      getSocket();
    } catch (error) {
      toast.error(errMsg(error));
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <>
    <div className="header-bar">
      <div className="home-brand">
        <span className="home-brand-slashes" aria-hidden="true">//</span>
        <img className="home-brand-logo" src={brandLogo} alt="" />
        <span className="title">{brand}</span>
      </div>
      <span className="btns">
        {backTo && (
          <Link
            className="btn btn-ghost btn-sm"
            to={backTo.to}
            aria-label={backTo.label}
            title={backTo.label}
            data-umami-event="header-back-to-site"
          >
            <ArrowLeft size={15} aria-hidden="true" />
            <span className="btn-text">{backTo.label}</span>
          </Link>
        )}
        <LanguageSelect />
        <span className="personal-settings-anchor">
          <PersonalSettings open={settingsOpen} onOpenChange={setSettingsOpen} />
          {initialized && user?.email && !user.emailVerified && (
            <button
              type="button"
              className="email-verification-reminder"
              onClick={() => setSettingsOpen(true)}
              aria-label={t('home.emailVerificationReminder')}
              data-umami-event="home-email-verification-reminder"
            >
              <MailWarning size={15} aria-hidden="true" />
              <span>{t('home.emailVerificationReminder')}</span>
            </button>
          )}
        </span>
        <ThemeToggle />
        {!initialized ? (
          <span className="auth-pending" aria-label={t('home.restoring')} />
        ) : user ? (
          <>
            <span className="muted">
              {user.username}
              {user.role === 'admin' && ` · ${t('home.admin')}`}
            </span>
            {user.role === 'admin' && (
              <Link className="btn btn-ghost btn-sm" to="/admin" aria-label={t('home.adminPanel')}>
                <Wrench size={15} />
                <span className="btn-text">{t('home.manage')}</span>
              </Link>
            )}
            <button
              className="btn btn-ghost btn-sm"
              aria-label={t('home.logout')}
              onClick={() => void logout()}
              disabled={loggingOut}
            >
              <LogOut size={15} />
              <span className="btn-text">{t('home.logout')}</span>
            </button>
          </>
        ) : (
          <>
            <span className="muted">{guestName === GUEST_FALLBACK ? t('common.guest') : guestName}</span>
            <Link
              className="btn btn-sm"
              to="/login"
              state={{ from: location.pathname }}
              aria-label={t('home.loginRegister')}
            >
              <LogIn size={15} />
              <span className="btn-text">{t('home.loginRegister')}</span>
            </Link>
          </>
        )}
      </span>
    </div>
    {/* 必须放在 .header-bar 之外：顶栏的 backdrop-filter 会成为 fixed 元素的包含块，
        导致徽标贴到顶栏左下角而不是屏幕左下角。 */}
    <OnlineBadge />
    </>
  );
}
