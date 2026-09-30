import { CSSProperties, FormEvent, useEffect, useState, useSyncExternalStore } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { KeyRound } from 'lucide-react';
import Page from '../components/Page';
import { api, errMsg } from '../api/client';
import { useAuth } from '../store/auth';
import { closeSocket, getSocket } from '../api/socket';
import { markAuthenticated } from '../api/session';
import { toast } from '../components/Toast';
import { useTranslation } from 'react-i18next';
import { getPowProgress, subscribePowProgress } from '../api/pow';
import { SEIYU_GUESS_HOME, SITE_HOME, PASSWORD_RESET_HOME } from '../config/routes';

const INACTIVE_POW_PROGRESS = { active: false, percent: 0 };
const USERNAME_PATTERN = /^[\w一-龥-]+$/;
const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+$/;
const CODE_PATTERN = /^\d{6}$/;
/** 「获取验证码」按钮的倒计时秒数（与服务端的冷却时间对齐，取一个稳妥值）。 */
const CODE_RESEND_SECONDS = 60;

type RegisterField = 'username' | 'password' | 'confirmPassword' | 'email' | 'code';
type RegisterErrors = Partial<Record<RegisterField, string>>;

export default function Login() {
  const { t } = useTranslation();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [codeSending, setCodeSending] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [registerErrors, setRegisterErrors] = useState<RegisterErrors>({});
  const [loading, setLoading] = useState(false);
  const powProgress = useSyncExternalStore(
    subscribePowProgress,
    getPowProgress,
    () => INACTIVE_POW_PROGRESS
  );
  const setUser = useAuth((s) => s.setUser);
  const navigate = useNavigate();
  const location = useLocation();
  /* 登录后回到来源页面,直接从登录页进入时回游戏主菜单 */
  const from = (location.state as { from?: string } | null)?.from;
  const redirectTo = from && from !== '/login' ? from : SEIYU_GUESS_HOME;

  const clearRegisterError = (field: RegisterField) => {
    setRegisterErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  /* 「获取验证码」的倒计时：服务端有 60 秒冷却，这里同步展示，避免用户白点。 */
  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = window.setTimeout(() => setResendIn((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [resendIn]);

  const emailLooksValid = !email || (email.length <= 320 && EMAIL_PATTERN.test(email.trim()));

  const sendCode = async () => {
    if (!email.trim()) {
      setRegisterErrors((current) => ({ ...current, email: t('auth.emailRequired') }));
      return;
    }
    if (!emailLooksValid) {
      setRegisterErrors((current) => ({ ...current, email: t('auth.emailInvalid') }));
      return;
    }
    setCodeSending(true);
    try {
      const res = await api.post('/auth/register/code', { email: email.trim() });
      const retryAt = Number(res.data?.retryAt);
      const serverNow = Number(res.data?.serverNow) || Date.now();
      const seconds = Number.isFinite(retryAt)
        ? Math.max(1, Math.ceil((retryAt - serverNow) / 1000))
        : CODE_RESEND_SECONDS;
      setResendIn(Math.max(seconds, 1));
      toast.success(t('auth.codeSent'));
    } catch (err) {
      // 冷却中：用服务端给出的 retryAt 直接进入倒计时。
      const retryAt = Number((err as { response?: { data?: { retryAt?: number; serverNow?: number } } })?.response?.data?.retryAt);
      const serverNow = Number((err as { response?: { data?: { serverNow?: number } } })?.response?.data?.serverNow) || Date.now();
      if (Number.isFinite(retryAt) && retryAt > serverNow) {
        setResendIn(Math.max(1, Math.ceil((retryAt - serverNow) / 1000)));
      }
      toast.error(errMsg(err));
    } finally {
      setCodeSending(false);
    }
  };

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (mode === 'register') {
      const errors: RegisterErrors = {};
      if (!username) errors.username = t('auth.usernameRequired');
      else if (username.length < 2 || username.length > 20) errors.username = t('auth.usernameLength');
      else if (!USERNAME_PATTERN.test(username)) errors.username = t('auth.usernameCharacters');
      if (!password) errors.password = t('auth.passwordRequired');
      else if (password.length < 10 || password.length > 128) errors.password = t('auth.passwordLength');
      if (password !== confirmPassword) errors.confirmPassword = t('auth.mismatch');
      if (!email.trim()) errors.email = t('auth.emailRequired');
      else if (!emailLooksValid) errors.email = t('auth.emailInvalid');
      if (!code.trim()) errors.code = t('auth.codeRequired');
      else if (!CODE_PATTERN.test(code.trim())) errors.code = t('auth.codeLength');
      setRegisterErrors(errors);
      const firstInvalid = Object.keys(errors)[0];
      if (firstInvalid) {
        (e.currentTarget.elements.namedItem(firstInvalid) as HTMLElement | null)?.focus();
        return;
      }
    }
    setLoading(true);
    try {
      const res = await api.post(
        `/auth/${mode}`,
        mode === 'register'
          ? { username, password, email: email.trim(), code: code.trim() }
          : { username, password }
      );
      markAuthenticated();
      setUser(res.data.user);
      closeSocket();
      getSocket();
      // 把匿名期间的对局并入账号(失败不阻塞登录)
      try {
        await api.post('/auth/claim');
      } catch (err) {
        toast.error(t('auth.claimFailed', { message: errMsg(err) }));
      }
      navigate(redirectTo);
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Page
      title={mode === 'login' ? t('auth.login') : t('auth.register')}
      icon={<KeyRound size={17} />}
      homeTo={SITE_HOME}
    >
      <div className="card auth-card">
        <p className="muted" style={{ textAlign: 'center' }}>
          {t('auth.description')}
        </p>
        <form className="form" onSubmit={submit} noValidate>
          <div className="auth-field">
            <input
              className="input"
              name="username"
              placeholder={mode === 'login' ? t('auth.account') : t('auth.username')}
              value={username}
              autoComplete="username"
              aria-invalid={Boolean(registerErrors.username)}
              aria-describedby={registerErrors.username ? 'register-username-error' : undefined}
              onChange={(e) => {
                setUsername(e.target.value);
                clearRegisterError('username');
              }}
            />
            {registerErrors.username && (
              <span className="auth-field-error" id="register-username-error">{registerErrors.username}</span>
            )}
          </div>
          {mode === 'register' ? (
            <div className="auth-password-fields">
              <div className="auth-field">
                <input
                  className="input"
                  name="password"
                  type="password"
                  placeholder={t('auth.password')}
                  autoComplete="new-password"
                  value={password}
                  aria-invalid={Boolean(registerErrors.password)}
                  aria-describedby={registerErrors.password ? 'register-password-error' : undefined}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    clearRegisterError('password');
                  }}
                />
                {registerErrors.password && (
                  <span className="auth-field-error" id="register-password-error">{registerErrors.password}</span>
                )}
              </div>
              <div className="auth-field">
                <input
                  className="input"
                  name="confirmPassword"
                  type="password"
                  placeholder={t('auth.confirmPassword')}
                  autoComplete="new-password"
                  value={confirmPassword}
                  aria-invalid={Boolean(registerErrors.confirmPassword)}
                  aria-describedby={registerErrors.confirmPassword ? 'register-confirm-password-error' : undefined}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    clearRegisterError('confirmPassword');
                  }}
                />
                {registerErrors.confirmPassword && (
                  <span className="auth-field-error" id="register-confirm-password-error">{registerErrors.confirmPassword}</span>
                )}
              </div>
            </div>
          ) : (
            <input
              className="input"
              name="password"
              type="password"
              placeholder={t('auth.password')}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          )}
          {mode === 'register' && (
            <>
              <div className="auth-field">
                <input
                  className="input"
                  name="email"
                  type="email"
                  placeholder={t('auth.email')}
                  autoComplete="email"
                  value={email}
                  aria-invalid={Boolean(registerErrors.email)}
                  aria-describedby={registerErrors.email ? 'register-email-error' : undefined}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    clearRegisterError('email');
                  }}
                />
                {registerErrors.email && (
                  <span className="auth-field-error" id="register-email-error">{registerErrors.email}</span>
                )}
              </div>
              <div className="auth-field">
                <div className="auth-code-row">
                  <input
                    className="input"
                    name="code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    placeholder={t('auth.codePlaceholder')}
                    value={code}
                    aria-invalid={Boolean(registerErrors.code)}
                    aria-describedby={registerErrors.code ? 'register-code-error' : undefined}
                    onChange={(e) => {
                      setCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                      clearRegisterError('code');
                    }}
                  />
                  <button
                    type="button"
                    className="btn btn-ghost auth-code-button"
                    disabled={codeSending || resendIn > 0}
                    aria-busy={codeSending}
                    onClick={sendCode}
                  >
                    {codeSending
                      ? t('auth.codeSending')
                      : resendIn > 0
                        ? t('auth.codeResendIn', { seconds: resendIn })
                        : t('auth.sendCode')}
                  </button>
                </div>
                {registerErrors.code && (
                  <span className="auth-field-error" id="register-code-error">{registerErrors.code}</span>
                )}
              </div>
            </>
          )}
          {mode === 'login' && (
            <button
              type="button"
              className="auth-link-button"
              onClick={() => navigate(PASSWORD_RESET_HOME)}
            >
              {t('auth.forgotPassword')}
            </button>
          )}
          <button className="btn" disabled={loading} aria-busy={loading}>
            {mode === 'register' && loading && powProgress.active ? (
              <span className="auth-pow-status">
                <span
                  className="auth-pow-ring"
                  style={{ '--pow-progress': `${powProgress.percent}%` } as CSSProperties}
                  aria-hidden="true"
                >
                  <span>{Math.round(powProgress.percent)}%</span>
                </span>
                {t('auth.registerPowComputing')}
              </span>
            ) : mode === 'login' ? t('auth.login') : t('auth.register')}
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              setConfirmPassword('');
              setEmail('');
              setCode('');
              setResendIn(0);
              setRegisterErrors({});
              setMode(mode === 'login' ? 'register' : 'login');
            }}
          >
            {mode === 'login' ? t('auth.toRegister') : t('auth.toLogin')}
          </button>
        </form>
      </div>
    </Page>
  );
}
