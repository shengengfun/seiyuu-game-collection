import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { KeyRound } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Page } from '@seiyuu/game-sdk';
import { api, errMsg } from '@seiyuu/game-sdk';
import { toast } from '@seiyuu/game-sdk';
import { LOGIN_HOME, SITE_HOME } from '@seiyuu/game-sdk';

const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+$/;
const CODE_PATTERN = /^\d{6}$/;
const PASSWORD_MIN_LENGTH = 10;
const PASSWORD_MAX_LENGTH = 128;
/** 「获取验证码」倒计时（服务端同邮箱 60 秒冷却）。 */
const CODE_RESEND_SECONDS = 60;

type Step = 'request' | 'reset';
type FieldErrors = Partial<Record<'email' | 'code' | 'password' | 'confirmPassword', string>>;

/**
 * 忘记密码：邮箱验证码 → 设置新密码。
 *
 * 与「喜欢或讨厌」的短评一样，错误码由服务端下发、前端翻译（`errors.*`）。
 * 服务端不会因为邮箱未注册而报错（避免账号枚举），所以这里对「发信成功」也
 * 只提示「如果该邮箱已注册，验证码已发出」。
 */
export default function PasswordReset() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('request');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [sending, setSending] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = window.setTimeout(() => setResendIn((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [resendIn]);

  const clearError = (field: keyof FieldErrors) => {
    setErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const emailValid = email.trim().length > 0 && email.length <= 320 && EMAIL_PATTERN.test(email.trim());

  const requestCode = async () => {
    if (!emailValid) {
      setErrors((current) => ({ ...current, email: t('auth.emailInvalid') }));
      return;
    }
    setSending(true);
    try {
      const res = await api.post('/auth/password/code', { email: email.trim() });
      const retryAt = Number(res.data?.retryAt);
      const serverNow = Number(res.data?.serverNow) || Date.now();
      setResendIn(
        Number.isFinite(retryAt) && retryAt > serverNow
          ? Math.max(1, Math.ceil((retryAt - serverNow) / 1000))
          : CODE_RESEND_SECONDS
      );
      setStep('reset');
      toast.success(t('passwordReset.codeSent'));
    } catch (err) {
      const data = (err as { response?: { data?: { retryAt?: number; serverNow?: number } } })?.response?.data;
      if (Number.isFinite(Number(data?.retryAt)) && Number(data?.retryAt) > Number(data?.serverNow ?? 0)) {
        setResendIn(Math.max(1, Math.ceil((Number(data?.retryAt) - Number(data?.serverNow)) / 1000)));
      }
      toast.error(errMsg(err));
    } finally {
      setSending(false);
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const next: FieldErrors = {};
    if (!emailValid) next.email = t('auth.emailInvalid');
    if (!CODE_PATTERN.test(code.trim())) next.code = t('auth.codeLength');
    if (password.length < PASSWORD_MIN_LENGTH || password.length > PASSWORD_MAX_LENGTH) {
      next.password = t('auth.passwordLength');
    }
    if (password !== confirmPassword) next.confirmPassword = t('auth.mismatch');
    setErrors(next);
    const firstInvalid = Object.keys(next)[0];
    if (firstInvalid) {
      (event.currentTarget.elements.namedItem(firstInvalid) as HTMLElement | null)?.focus();
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/auth/password/reset', { email: email.trim(), code: code.trim(), password });
      toast.success(t('passwordReset.done'));
      navigate(LOGIN_HOME);
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Page title={t('passwordReset.title')} icon={<KeyRound size={17} />} homeTo={SITE_HOME}>
      <div className="card auth-card">
        <p className="muted" style={{ textAlign: 'center' }}>
          {t('passwordReset.description')}
        </p>
        <form className="form" onSubmit={submit} noValidate>
          <div className="auth-field">
            <div className="auth-code-row">
              <input
                className="input"
                name="email"
                type="email"
                autoComplete="email"
                placeholder={t('auth.email')}
                value={email}
                aria-invalid={Boolean(errors.email)}
                onChange={(event) => {
                  setEmail(event.target.value);
                  clearError('email');
                }}
              />
              <button
                type="button"
                className="btn btn-ghost auth-code-button"
                disabled={sending || resendIn > 0}
                aria-busy={sending}
                onClick={requestCode}
              >
                {sending
                  ? t('auth.codeSending')
                  : resendIn > 0
                    ? t('auth.codeResendIn', { seconds: resendIn })
                    : t('auth.sendCode')}
              </button>
            </div>
            {errors.email && <span className="auth-field-error">{errors.email}</span>}
          </div>

          {step === 'request' ? (
            <p className="muted auth-step-hint">{t('passwordReset.requestHint')}</p>
          ) : (
            <>
              <div className="auth-field">
                <input
                  className="input"
                  name="code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder={t('auth.codePlaceholder')}
                  value={code}
                  aria-invalid={Boolean(errors.code)}
                  onChange={(event) => {
                    setCode(event.target.value.replace(/\D/g, '').slice(0, 6));
                    clearError('code');
                  }}
                />
                {errors.code && <span className="auth-field-error">{errors.code}</span>}
              </div>
              <div className="auth-password-fields">
                <div className="auth-field">
                  <input
                    className="input"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    placeholder={t('auth.newPassword')}
                    value={password}
                    aria-invalid={Boolean(errors.password)}
                    onChange={(event) => {
                      setPassword(event.target.value);
                      clearError('password');
                    }}
                  />
                  {errors.password && <span className="auth-field-error">{errors.password}</span>}
                </div>
                <div className="auth-field">
                  <input
                    className="input"
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    placeholder={t('auth.confirmPassword')}
                    value={confirmPassword}
                    aria-invalid={Boolean(errors.confirmPassword)}
                    onChange={(event) => {
                      setConfirmPassword(event.target.value);
                      clearError('confirmPassword');
                    }}
                  />
                  {errors.confirmPassword && (
                    <span className="auth-field-error">{errors.confirmPassword}</span>
                  )}
                </div>
              </div>
              <button className="btn" disabled={submitting} aria-busy={submitting}>
                {submitting ? t('passwordReset.submitting') : t('passwordReset.submit')}
              </button>
            </>
          )}

          <Link className="btn btn-ghost" to={LOGIN_HOME}>
            {t('passwordReset.backToLogin')}
          </Link>
        </form>
      </div>
    </Page>
  );
}
