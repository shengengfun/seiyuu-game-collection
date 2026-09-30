import { Router } from 'express';
import { db } from '../db/knex';
import { asyncHandler } from '../middleware/common';
import { cached } from '../services/queryCache';
import { rateLimit } from '../middleware/rateLimit';

const router = Router();

router.get(
  '/',
  rateLimit({ name: 'announcements', limit: 60, windowSeconds: 60, failClosed: true }),
  asyncHandler(async (_req, res) => {
    const rows = await cached('announcements', 300, () =>
      db('announcements')
        // 置顶的排前面，其余按时间倒序；首页右下角公告栏直接用这个顺序。
        .orderBy([{ column: 'is_pinned', order: 'desc' }, { column: 'created_at', order: 'desc' }])
        .limit(50)
    );
    res.json(rows);
  })
);

export default router;
