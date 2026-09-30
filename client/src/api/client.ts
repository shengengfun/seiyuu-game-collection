import axios from 'axios';
import { translate } from '../i18n/messages';
import { createRegisterPow, ensurePow, notePowExpiry } from './pow';
import { hasAuthHint, refreshAuthenticatedSession } from './authSession';

export const api = axios.create({ baseURL: '/api', withCredentials: true });

/**
 * 需要「注册档」PoW（难度更高且一次性）的端点：注册本体与两个会真实发信的端点。
 * 与服务端 `middleware/pow.ts` 的 `REGISTRATION_POW_PATHS` 对齐。
 */
const REGISTRATION_POW_PATHS = new Set(['/auth/register', '/auth/register/code', '/auth/password/code']);

function apiPathOf(url: unknown): string {
  return String(url ?? '').replace(/^.*\/api/, '');
}

api.interceptors.request.use(async (request) => {
  const needsRegisterPow = request.method?.toLowerCase() === 'post' &&
    REGISTRATION_POW_PATHS.has(apiPathOf(request.url));
  if (needsRegisterPow) {
    const proof = await createRegisterPow();
    request.headers.set('X-Register-PoW-Id', proof.id);
    request.headers.set('X-Register-PoW-Nonce', proof.nonce);
  } else {
    await ensurePow();
  }
  if (hasAuthHint()) request.headers.set('X-Auth-Expected', '1');
  else request.headers.delete('X-Auth-Expected');
  return request;
});

api.interceptors.response.use(
  (response) => {
    notePowExpiry(
      response.headers['x-pow-expires-at'],
      response.headers['x-pow-expires-in']
    );
    return response;
  },
  async (error) => {
    if (!axios.isAxiosError(error)) throw error;
    const config = error.config as (typeof error.config & {
      _powRetried?: boolean;
      _authRetried?: boolean;
    }) | undefined;
    const code = String(error.response?.data?.code ?? '');
    if (code === 'POW_REQUIRED' && config && !config._powRetried) {
      config._powRetried = true;
      const needsRegisterPow = REGISTRATION_POW_PATHS.has(apiPathOf(config?.url));
      if (!needsRegisterPow) await ensurePow(true);
      return api.request(config);
    }
    if (
      error.response?.status === 401 &&
      (code === 'AUTH_REQUIRED' || code === 'AUTH_EXPIRED') &&
      config &&
      !config._authRetried
    ) {
      config._authRetried = true;
      await refreshAuthenticatedSession();
      return api.request(config);
    }
    throw error;
  }
);

/** 从 axios 错误中取出后端错误码并翻译成文案 */
export function errMsg(err: unknown): string {
  if (axios.isAxiosError(err)) {
    if (!err.response) return translate('NETWORK_ERROR');
    const code = String(err.response.data?.code || '');
    if (code.startsWith('POW_')) return translate('NETWORK_ERROR');
    return translate(code);
  }
  return translate('INTERNAL_ERROR');
}
