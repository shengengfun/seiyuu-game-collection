import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { config, validateProductionConfig } from './config';
import { assertDatabaseReady } from './db/ready';
import { ensureSchema } from './db/schema';
import { db } from './db/knex';
import { errorHandler } from './middleware/common';
import { buildCorsOptions, isRequestOriginAllowed } from './middleware/cors';
import authRoutes from './routes/auth';
import playerRoutes from './routes/players';
import gameRoutes from './routes/game';
import statsRoutes from './routes/stats';
import leaderboardRoutes from './routes/leaderboard';
import announcementRoutes from './routes/announcements';
import presenceRoutes from './routes/presence';
import seiyuuQuizRoutes from './routes/seiyuuQuiz';
import songQuizRoutes, { songQuizAudioRouter } from './routes/songQuiz';
import sukikiraiRoutes from './routes/sukikirai';
import adminRoutes from './routes/admin';
import externalPlayerRoutes, { externalPlayerAuth } from './routes/externalPlayers';
import { setupSocket } from './socket';
import {
  closeRedis,
  duplicateRedisClient,
  initRedis,
  isRedisAvailable,
  isRedisTimeoutError,
} from './redis';
import { initPlayerCache } from './services/playerCache';
import { rateLimit } from './middleware/rateLimit';
import { initMatchResultWorker } from './services/matchResultQueue';
import powRoutes from './routes/pow';
import { requirePow } from './middleware/pow';
import { closePasswordWorkers } from './services/password';
import { getRuntimeSnapshot, startRuntimeMonitor } from './services/runtimeMonitor';
import { requireAdmin, requireAuth } from './middleware/auth';
import { trafficMiddleware } from './middleware/traffic';
import { parseJsonOnce, rejectOversizedBody } from './middleware/jsonBody';
import { rejectMissingClientAsset, setClientAssetCacheHeaders } from './middleware/clientAssets';
import { injectUmamiScript } from './services/umami';

const SHUTDOWN_TIMEOUT_MS = 10_000;
const CLOUDFLARE_INSIGHTS_SCRIPT_ORIGIN = 'https://static.cloudflareinsights.com';
const CLOUDFLARE_INSIGHTS_BEACON_ORIGIN = 'https://cloudflareinsights.com';
// 「猜歌」的 30 秒试听由浏览器直接从 Apple 的 CDN 拉取(服务端不转发音频),
// 因此 CSP 必须单独放行 media-src;封面图同理走 img-src。
const APPLE_PREVIEW_ORIGIN = 'https://audio-ssl.itunes.apple.com';
const APPLE_ARTWORK_ORIGIN = 'https://*.mzstatic.com';

process.on('unhandledRejection', (reason) => {
  if (isRedisTimeoutError(reason)) {
    console.error('[server:redis-timeout-unhandled]', reason);
    return;
  }
  console.error('[server:unhandled-rejection]', reason);
  setImmediate(() => {
    throw reason instanceof Error ? reason : new Error(String(reason));
  });
});

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, onTimeout: () => void): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      try {
        onTimeout();
        reject(new Error('SHUTDOWN_TIMEOUT'));
      } catch (err) {
        reject(err);
      }
    }, timeoutMs);
    timer.unref?.();
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

async function main() {
  validateProductionConfig();
  const stopRuntimeMonitor = startRuntimeMonitor();
  console.log('[server] 正在初始化数据库结构');
  await ensureSchema();
  console.log('[server] 正在验证数据库结构');
  await assertDatabaseReady();
  console.log('[server] 数据库结构验证通过');
  const redisReady = await initRedis();
  await initPlayerCache();
  const stopMatchWorker = redisReady ? await initMatchResultWorker() : async () => undefined;

  const app = express();
  app.set('trust proxy', config.trustProxy ? 1 : false);

  // index.html 含内联脚本(主题开关、启动屏进度),CSP 不放开 unsafe-inline,
  // 而是从实际服务的 HTML 计算各内联脚本的 sha256 哈希加入 script-src
  const clientDist = path.resolve(__dirname, '../../client/dist');
  const clientIndexPath = path.join(clientDist, 'index.html');
  const rawIndexHtml = fs.existsSync(clientIndexPath)
    ? fs.readFileSync(clientIndexPath, 'utf8')
    : null;
  const inlineScriptHashes = rawIndexHtml
    ? [...rawIndexHtml.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(
        (match) => `'sha256-${crypto.createHash('sha256').update(match[1], 'utf8').digest('base64')}'`
      )
    : [];

  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'wasm-unsafe-eval'",
          CLOUDFLARE_INSIGHTS_SCRIPT_ORIGIN,
          ...(config.umami ? [config.umami.origin] : []),
          ...inlineScriptHashes,
        ],
        workerSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', APPLE_ARTWORK_ORIGIN],
        mediaSrc: ["'self'", APPLE_PREVIEW_ORIGIN],
        connectSrc: [
          "'self'",
          ...config.corsOrigins,
          CLOUDFLARE_INSIGHTS_BEACON_ORIGIN,
          ...(config.umami ? [config.umami.origin] : []),
        ],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        frameAncestors: ["'none'"],
      },
    },
  }));
  // Vite 构建产物里的 <script type="module" crossorigin> 会让浏览器在**同源**请求上也带 Origin,
  // 因此必须放行「Origin 的 host 与本次请求 Host 一致」的情况,否则用 IP / localhost 直连
  // 服务端托管的前端时会整站 500(资源加载失败 → 白屏)。判定规则见 middleware/cors.ts。
  app.use(cors((req, callback) => callback(null, buildCorsOptions(req))));
  app.use((req, res, next) => {
    if (shuttingDown) return res.status(503).json({ code: 'SERVER_SHUTTING_DOWN' });
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      const origin = req.headers.origin;
      if (!isRequestOriginAllowed(req, typeof origin === 'string' ? origin : undefined)) {
        return res.status(403).json({ code: 'INVALID_ORIGIN' });
      }
    }
    next();
  });
  // 流量打点：挂在最前面，response finish 时批量聚合（健康检查 / Socket.IO 由中间件自行跳过）
  app.use(trafficMiddleware);
  app.get('/api/health', (_req, res) =>
    res.json({
      ok: true,
      redis: isRedisAvailable() ? 'up' : 'degraded',
      features: { leaderboard: config.showLeaderboard },
      runtime: getRuntimeSnapshot(),
    })
  );
  app.use('/api', rateLimit({ name: 'api', limit: 600, windowSeconds: 60 }));
  app.use('/api/pow', rejectOversizedBody(16 * 1024), parseJsonOnce('16kb'));
  app.use('/api/pow', powRoutes);
  app.use('/api/external', externalPlayerAuth);
  app.use(
    '/api/external',
    rejectOversizedBody(config.adminImportBodyLimitBytes),
    parseJsonOnce(`${config.adminImportBodyLimitBytes}b`)
  );
  app.use('/api/external', externalPlayerRoutes);
  // 在线人数：无需工作量证明的轻量公开接口（页面左下角展示）
  app.use('/api/presence', presenceRoutes);
  // 猜歌音频转发：<audio src> 带不了 PoW 头，靠 URL 里的 HMAC 签名自证（见 routes/songQuiz.ts）
  app.use('/api/song-quiz/audio', songQuizAudioRouter);
  app.use('/api', requirePow);
  app.use('/api/admin/players/import', requireAuth, requireAdmin);
  app.use(
    '/api/admin/players/import',
    rejectOversizedBody(config.adminImportBodyLimitBytes),
    parseJsonOnce(`${config.adminImportBodyLimitBytes}b`)
  );
  app.use('/api', rejectOversizedBody(64 * 1024), parseJsonOnce('64kb'));

  app.use('/api/auth', authRoutes);
  app.use('/api/players', playerRoutes);
  app.use('/api/game', gameRoutes);
  app.use('/api/stats', statsRoutes);
  app.use('/api/leaderboard', leaderboardRoutes);
  app.use('/api/announcements', announcementRoutes);
  app.use('/api/seiyuu-quiz', seiyuuQuizRoutes);
  app.use('/api/song-quiz', songQuizRoutes);
  app.use('/api/sukikirai', sukikiraiRoutes);
  app.use('/api/admin', adminRoutes);

  // 生产环境托管前端构建产物
  if (rawIndexHtml !== null) {
    const indexHtml = injectUmamiScript(rawIndexHtml, config.umami);
    app.use(express.static(clientDist, { index: false, setHeaders: setClientAssetCacheHeaders }));
    app.use(rejectMissingClientAsset);
    app.get(/^(?!\/api|\/socket\.io).*/, (_req, res) => {
      res.setHeader('Cache-Control', 'no-cache');
      res.type('html').send(indexHtml);
    });
  }

  app.use(errorHandler);

  const server = http.createServer(app);
  const io = new Server(server, {
    // 同上:同源(host 一致)的连接也要放行,否则直连 IP / localhost 时实时对局不可用。
    cors: (req, callback) => callback(null, buildCorsOptions(req, 'SOCKET_CORS_NOT_ALLOWED')),
  });
  app.set('io', io);
  let shuttingDown = false;
  let shutdownPromise: Promise<void> | null = null;
  let adapterPubClient: ReturnType<typeof duplicateRedisClient> = null;
  let adapterSubClient: ReturnType<typeof duplicateRedisClient> = null;
  io.use((_socket, next) => {
    if (shuttingDown) return next(new Error('SERVER_SHUTTING_DOWN'));
    next();
  });
  if (redisReady) {
    adapterPubClient = duplicateRedisClient('socket-adapter-pub');
    adapterSubClient = duplicateRedisClient('socket-adapter-sub');
    if (adapterPubClient && adapterSubClient) {
      await Promise.all([adapterPubClient.connect(), adapterSubClient.connect()]);
      io.adapter(createAdapter(adapterPubClient, adapterSubClient));
    }
  }
  const stopSocket = setupSocket(io);

  server.listen(config.port, () => {
    console.log(`[server] 声优猜服务已启动: http://localhost:${config.port}`);
    console.log(`[server] allowed origins: ${config.corsOrigins.join(', ')}`);
  });

  const shutdown = async (signal: string): Promise<void> => {
    if (shutdownPromise) return shutdownPromise;
    shutdownPromise = (async () => {
      shuttingDown = true;
      console.log(`[server] 收到 ${signal},开始优雅退出`);
      stopRuntimeMonitor();
      const serverClosed = new Promise<void>((resolve) => {
        server.close(() => resolve());
        server.closeIdleConnections?.();
      });
      const socketClosed = new Promise<void>((resolve) => io.close(() => resolve()));
      await Promise.allSettled([
        withTimeout(serverClosed, SHUTDOWN_TIMEOUT_MS, () => server.closeAllConnections?.()),
        withTimeout(socketClosed, SHUTDOWN_TIMEOUT_MS, () => io.disconnectSockets(true)),
        withTimeout(stopMatchWorker(), SHUTDOWN_TIMEOUT_MS, () => undefined),
      ]);
      await withTimeout(stopSocket(), SHUTDOWN_TIMEOUT_MS, () => undefined).catch((err) => {
        console.error('[shutdown:socket-drain]', err);
      });

      await Promise.allSettled([
        withTimeout(
          adapterPubClient?.isOpen ? adapterPubClient.quit().then(() => undefined) : Promise.resolve(),
          SHUTDOWN_TIMEOUT_MS,
          () => undefined
        ),
        withTimeout(
          adapterSubClient?.isOpen ? adapterSubClient.quit().then(() => undefined) : Promise.resolve(),
          SHUTDOWN_TIMEOUT_MS,
          () => undefined
        ),
        withTimeout(closeRedis(), SHUTDOWN_TIMEOUT_MS, () => undefined),
        withTimeout(closePasswordWorkers(), SHUTDOWN_TIMEOUT_MS, () => undefined),
        withTimeout(db.destroy(), SHUTDOWN_TIMEOUT_MS, () => undefined),
      ]);
      console.log('[server] 优雅退出完成');
    })();
    return shutdownPromise;
  };
  const handleSignal = (signal: string) => {
    const forceExitTimer = setTimeout(() => {
      console.error('[server] 优雅退出超时,强制退出');
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS * 2 + 2_000);
    void shutdown(signal)
      .then(() => {
        clearTimeout(forceExitTimer);
        process.exit(0);
      })
      .catch((err) => {
        clearTimeout(forceExitTimer);
        console.error('[server] 优雅退出失败:', err);
        process.exit(1);
      });
  };
  process.once('SIGINT', () => handleSignal('SIGINT'));
  process.once('SIGTERM', () => handleSignal('SIGTERM'));
}

main().catch((err) => {
  console.error('[server] 启动失败:', err);
  process.exit(1);
});
