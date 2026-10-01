import i18n from 'i18next';

/**
 * 把后端返回的错误码翻译成当前语言文案。
 * 前后端只传错误码（见 README「多语言」），翻译统一在前端做。
 */
export function translate(code: string | undefined | null): string {
  if (!code) return i18n.t('errors.INTERNAL_ERROR');
  const key = `errors.${code}`;
  return i18n.exists(key) ? i18n.t(key) : i18n.t('errors.UNKNOWN', { code });
}
