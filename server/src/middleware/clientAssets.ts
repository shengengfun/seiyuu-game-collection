import path from 'path';
import { NextFunction, Request, Response } from 'express';

/**
 * 构建产物的缓存策略。
 *
 * `/assets/**` 的文件名自带内容哈希,可以直接 immutable。
 * 其余静态文件(声优头像 `/seiyuu/*.jpg`、站点 logo、PoW 的 wasm)文件名固定、内容极少变,
 * 但同样需要有明确的 max-age:否则浏览器每次访问都要为 100+ 张头像回源做 304 校验,
 * 弱网下这部分往返能占掉首屏的绝大部分时间。
 */
const STATIC_MEDIA_PATTERN = /\.(?:avif|gif|ico|jpe?g|png|svg|webp|woff2?|wasm)$/i;
const STATIC_MEDIA_CACHE = 'public, max-age=604800, stale-while-revalidate=86400';

export function setClientAssetCacheHeaders(res: Response, filePath: string): void {
  if (filePath.includes(`${path.sep}assets${path.sep}`)) {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    return;
  }
  if (STATIC_MEDIA_PATTERN.test(filePath)) {
    res.setHeader('Cache-Control', STATIC_MEDIA_CACHE);
    return;
  }
  if (path.basename(filePath) === 'index.html') {
    res.setHeader('Cache-Control', 'no-cache');
  }
}

/** Keep missing files as 404; only extensionless application routes use the SPA fallback. */
export function rejectMissingClientAsset(req: Request, res: Response, next: NextFunction) {
  const filename = req.path.split('/').at(-1) ?? '';
  if (/^\/assets(?:\/|$)/.test(req.path) || /\.[A-Za-z0-9]{1,16}$/.test(filename)) {
    return res.status(404).type('text/plain').send('Not Found');
  }
  next();
}
