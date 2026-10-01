import { Router } from 'express';
import type { Server as SocketServer } from 'socket.io';
import { asyncHandler } from '../middleware/common';
import { getPresenceStats } from '../services/presence';

/**
 * 公开的在线人数接口，供页面左下角展示。
 * 不放在 requirePow 之后：只是读取一个数字，没必要让每个访客算一遍工作量证明。
 * 结果缓存几秒，避免每个访客都触发一次 Redis 查询。
 */
const CACHE_MS = 5_000;

interface OnlineSnapshot {
  /** 展示用人数：Redis 里的去重身份数 与 当前 socket 连接数 取较大值 */
  online: number;
  /** 当前 socket 连接数（无 Redis 时的兜底来源） */
  sockets: number;
  /** Redis presence 里 150 秒内活跃的去重身份数 */
  identities: number;
  updatedAt: number;
}

const router = Router();
let cached: { at: number; value: OnlineSnapshot } | null = null;

router.get(
  '/online',
  asyncHandler(async (req, res) => {
    const now = Date.now();
    if (!cached || now - cached.at >= CACHE_MS) {
      const stats = await getPresenceStats();
      const io = req.app.get('io') as SocketServer | undefined;
      const sockets = io?.engine?.clientsCount ?? 0;
      cached = {
        at: now,
        value: {
          online: Math.max(stats.onlineUsers, sockets),
          sockets,
          identities: stats.onlineUsers,
          updatedAt: now,
        },
      };
    }
    res.setHeader('Cache-Control', 'no-store');
    res.json(cached.value);
  })
);

export default router;
