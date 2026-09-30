import { Request, Response, NextFunction } from 'express';
import {
  anonVisitorKey,
  normalizeRoute,
  recordTraffic,
  TrafficUserType,
} from '../services/trafficStats';
import { authenticateCookie, getGuestFromCookie, hasAuthSessionCookie } from './auth';

/**
 * 请求流量打点中间件：response finish 时记录一个流量点，按小时批量落库。
 *
 * 归类口径：
 *  - 用户类型：路由上已有的 req.user（requireAuth/optionalAuth 之后才有）优先；
 *    其次按访客 cookie；带登录 cookie 但验证不过的按访客；都没有则按匿名（IP+UA 哈希）。
 *  - 字节数取 Content-Length（Express 的 res.json / 静态资源都会设）；缺失按 0 计。
 *  - 健康检查 / Socket.IO / CORS 预检不计入，避免探针把流量刷爆。
 */

const HEALTH_PATH = '/api/health';
const SOCKET_PREFIX = '/socket.io';

async function resolveIdentity(
  req: Request
): Promise<{ userType: TrafficUserType; visitor: string }> {
  if (req.user) return { userType: 'user', visitor: `u:${req.user.id}` };
  const cookie = req.headers.cookie;
  const guest = getGuestFromCookie(cookie);
  if (guest) return { userType: 'guest', visitor: `g:${guest.key}` };
  if (hasAuthSessionCookie(cookie)) {
    try {
      const user = await authenticateCookie(cookie);
      if (user) return { userType: 'user', visitor: `u:${user.id}` };
    } catch {
      // 统计失败降级为匿名，不影响请求本身。
    }
  }
  return {
    userType: 'anon',
    visitor: anonVisitorKey(req.ip || req.socket.remoteAddress || undefined, req.headers['user-agent']),
  };
}

export function trafficMiddleware(req: Request, res: Response, next: NextFunction): void {
  const pathname = (req.originalUrl || req.url).split('?')[0] || '/';
  if (req.method === 'OPTIONS' || pathname === HEALTH_PATH || pathname.startsWith(SOCKET_PREFIX)) {
    next();
    return;
  }
  res.on('finish', () => {
    void resolveIdentity(req)
      .then(({ userType, visitor }) => {
        const status = res.statusCode || 200;
        const hundreds = Math.min(5, Math.max(1, Math.floor(status / 100)));
        const rawLength = Number(res.getHeader('content-length'));
        recordTraffic({
          route: normalizeRoute(pathname),
          userType,
          statusClass: `${hundreds}xx`,
          bytes: Number.isFinite(rawLength) && rawLength > 0 ? rawLength : 0,
          visitor,
        });
      })
      .catch((err) => console.error('[server:traffic]', err));
  });
  next();
}
