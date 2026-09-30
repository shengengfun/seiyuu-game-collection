import type { CorsOptions } from 'cors';
import { isOriginAllowed, isTrustedHostOrigin } from '../config';
import { isSameHostOrigin } from './sameOrigin';
import { logTransientWarning } from '../services/transientLog';

type RequestLike = { headers?: Record<string, unknown> | undefined };

/**
 * 已经拒绝过的来源（只记一次日志，上限 200 条防止被打爆内存）。
 * 注意这是「每个进程一份」的缓存，重启后重新记，可接受。
 */
const deniedOrigins = new Set<string>();
const DENIED_LOG_LIMIT = 200;

/**
 * 是否允许该 Origin 跨域访问本次请求。
 *
 * 1. `undefined`（curl / 健康检查 / 同源简单请求）放行，严格校验交给下一个中间件；
 * 2. 精确或通配白名单命中（`CORS_ORIGINS` / `CORS_ORIGIN_PATTERNS`）；
 * 3. Origin 的 host 与本次请求的 `Host` 一致（用 IP / localhost 直连自托管前端时
 *    模块脚本也会带 Origin，不放行会整站 500 → 白屏，见 middleware/sameOrigin.ts）；
 * 4. Origin 的 host 是白名单里出现过的 host（**忽略协议**，覆盖 `http://<站点>` 访问
 *    `https://<站点>` 白名单的情况）。
 */
export function isRequestOriginAllowed(req: RequestLike, origin: string | undefined): boolean {
  if (!origin) return true;
  return isOriginAllowed(origin) || isSameHostOrigin(req, origin) || isTrustedHostOrigin(origin);
}

/**
 * 构造 cors 的 options。
 *
 * ⚠️ 被拒绝时**绝不能抛错**：
 *   - express 路径下 cors 会把错误转给 errorHandler，访客拿到 500；
 *   - socket.io 握手路径不经过 express 的错误链，异常直接冒到 `uncaughtException`
 *     把整个进程带崩（线上被 `Origin: http://<站点>` 的访问弄崩过两次）。
 * 正确做法是不下发 CORS 头，让浏览器自己拦。
 */
export function buildCorsOptions(req: RequestLike, errorCode = 'CORS_NOT_ALLOWED'): CorsOptions {
  return {
    origin: (requestOrigin, originCallback) => {
      // requestOrigin 为 undefined 时（curl / 健康检查）放行：浏览器只在跨域时才带 Origin,
      // 是否放行由后续中间件再判断一次。
      if (!requestOrigin) return originCallback(null, true);
      if (isRequestOriginAllowed(req, requestOrigin)) {
        return originCallback(null, requestOrigin);
      }
      if (!deniedOrigins.has(requestOrigin) && deniedOrigins.size < DENIED_LOG_LIMIT) {
        deniedOrigins.add(requestOrigin);
        logTransientWarning(`[${errorCode}]`, `拒绝来源 ${requestOrigin}（不在白名单，且 Host 不同）`);
      }
      originCallback(null, false);
    },
    credentials: true,
  };
}

/** 仅供测试：清空「已记录来源」集合。 */
export function resetDeniedOriginsForTests(): void {
  deniedOrigins.clear();
}
