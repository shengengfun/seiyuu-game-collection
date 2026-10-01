import { Router } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import { config } from '../config';
import { db } from '../db/knex';
import { optionalAuth, requireAuth, userNameFromUsername } from '../middleware/auth';
import { asyncHandler, HttpError, validateBody, validateQuery } from '../middleware/common';
import { rateLimit, requestIdentity } from '../middleware/rateLimit';
import { cached } from '../services/queryCache';

/**
 * 「猜歌」的 30 秒试听换取接口。
 *
 * 曲库是客户端的静态文件（`client/src/config/songQuiz/songs/*.ts`），只存 iTunes trackId；
 * 这里按 trackId 批量换 Apple 的 30 秒试听地址。过一道服务端的原因：
 * ① 试听地址要实时向 Apple 换取，放服务端才能让所有玩家共享缓存；
 * ② 客户端不必直连 Apple 的检索接口（少一处跨域/网络差异）；
 * ③ 以后换音源只改这里，前端协议不用动。
 *
 * 注意：真正的音频仍由浏览器直接从 Apple 的 CDN 拉取（服务端不转发音频，省带宽），
 * 因此生产环境的 CSP 必须放行 `audio-ssl.itunes.apple.com`（见 `index.ts` 的 `mediaSrc`）。
 */

/** Apple 试听链接带时效，缓存 6 小时足够（一局最多用 20 条，且 CDN 无签名）。 */
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
/** 一次最多换取多少条（最长的一局 20 首，留一倍余量）。 */
export const PREVIEW_MAX_IDS = 40;
const LOOKUP_ENDPOINT = 'https://itunes.apple.com/lookup';
const LOOKUP_TIMEOUT_MS = 8000;

export interface SongPreview {
  id: number;
  /** 30 秒试听地址（Apple CDN）。 */
  previewUrl: string;
  /** 走本站转发的试听地址（推荐用这个，见下方 audio 路由的说明）。 */
  audioUrl?: string;
  /** 专辑封面（结算页展示），拿不到就为空串。 */
  artworkUrl: string;
}

/* ---------------------------------------------------------------- 音频转发 */

/**
 * 为什么还要自己转发一次音频？
 *
 * Apple 的试听 CDN 返回 `audio/x-m4p` / `audio/x-m4a` 这种非标准 MIME，
 * Chromium 只认标准 MIME 就懒得嗅探，直接报「不支持的源」（实测 VS Code 内嵌浏览器必挂，
 * 换成 `audio/mp4` 的同一条流就能播）。转发一层把 MIME 规范化，顺便把音频收进自己的域名，
 * 省掉 CSP 里的外部媒体来源、也避免客户端直连 Apple 的差异。
 *
 * 这里不缓存音频本体（只转发），带宽是 30 秒 AAC（约 1MB/首）。
 */
const AUDIO_TTL_MS = 6 * 60 * 60 * 1000;

function audioKey(): Buffer {
  return crypto.createHash('sha256').update(`${config.jwtSecret}:song-quiz-audio`).digest();
}

/** 生成带签名与有效期的转发地址，避免这个免 PoW 的接口被人当免费代理刷。 */
export function signAudioUrl(trackId: number, now = Date.now()): string {
  const expiresAt = now + AUDIO_TTL_MS;
  const payload = `${trackId}.${expiresAt}`;
  const signature = crypto.createHmac('sha256', audioKey()).update(payload).digest('base64url');
  return `/api/song-quiz/audio?t=${Buffer.from(payload).toString('base64url')}.${signature}`;
}

/** 校验转发地址的签名与有效期，返回 trackId；不合法返回 null。 */
export function verifyAudioToken(token: string, now = Date.now()): number | null {
  const separator = token.lastIndexOf('.');
  if (separator <= 0) return null;
  let payload: string;
  try {
    payload = Buffer.from(token.slice(0, separator), 'base64url').toString('utf8');
  } catch {
    return null;
  }
  const expected = crypto
    .createHmac('sha256', audioKey())
    .update(payload)
    .digest('base64url');
  const provided = token.slice(separator + 1);
  if (
    expected.length !== provided.length ||
    !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(provided))
  ) {
    return null;
  }
  const [idText, expiresText] = payload.split('.');
  const id = Number(idText);
  const expiresAt = Number(expiresText);
  if (!Number.isInteger(id) || id <= 0 || !Number.isFinite(expiresAt) || expiresAt < now) return null;
  return id;
}

const cache = new Map<number, { previewUrl: string; artworkUrl: string; expiresAt: number }>();

/**
 * 查不到的 id 也要记一笔（负缓存）：
 * Apple 的 lookup 只要列表里混进一个查不到的 id，整批请求就返回 400，
 * 不记下来的话每局都会重新去撞一次同样的错。
 */
const missCache = new Map<number, number>();

const previewQuerySchema = z.object({
  ids: z.string().trim().min(1).max(1024),
});

/** 解析 `ids=1,2,3`，忽略非法项并去重，保持顺序。 */
export function parsePreviewIds(raw: string): number[] {
  const ids: number[] = [];
  const seen = new Set<number>();
  for (const part of raw.split(',')) {
    const id = Number(part.trim());
    if (!Number.isInteger(id) || id <= 0 || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }
  return ids;
}

/** 从 Apple 的 lookup 响应里抽出试听地址（非歌曲条目或没有试听的会被丢掉）。 */
export function mapLookupResults(payload: unknown): SongPreview[] {
  const results = (payload as { results?: unknown })?.results;
  if (!Array.isArray(results)) return [];
  const items: SongPreview[] = [];
  for (const entry of results) {
    const item = entry as {
      trackId?: unknown;
      previewUrl?: unknown;
      artworkUrl100?: unknown;
    };
    const id = Number(item?.trackId);
    const previewUrl = typeof item?.previewUrl === 'string' ? item.previewUrl : '';
    if (!Number.isInteger(id) || !previewUrl) continue;
    items.push({
      id,
      previewUrl,
      artworkUrl: typeof item?.artworkUrl100 === 'string' ? item.artworkUrl100 : '',
    });
  }
  return items;
}

/** 整批失败后退化到多小的块（块里混进坏 id 时只牺牲这一块，再逐条兜底）。 */
const LOOKUP_CHUNK = 4;
/** 查不到的 id 的负缓存时长。 */
const MISS_TTL_MS = 60 * 60 * 1000;

/** 向 Apple 请求一批 id，返回 id → 试听信息。失败返回空表（不抛错，让调用方决定怎么退化）。 */
async function lookupBatch(ids: number[], fetchImpl: typeof fetch): Promise<SongPreview[]> {
  if (ids.length === 0) return [];
  try {
    const response = await fetchImpl(
      `${LOOKUP_ENDPOINT}?id=${ids.join(',')}&entity=song&country=JP`,
      { signal: AbortSignal.timeout(LOOKUP_TIMEOUT_MS) },
    );
    if (!response.ok) return [];
    return mapLookupResults(await response.json());
  } catch {
    return [];
  }
}

/** 批量向 Apple 换试听地址（带进程内缓存 + 坏 id 隔离）。 */
export async function resolvePreviews(
  ids: number[],
  fetchImpl: typeof fetch = fetch,
): Promise<SongPreview[]> {
  const now = Date.now();
  const items: SongPreview[] = [];
  let pending: number[] = [];
  for (const id of ids) {
    const hit = cache.get(id);
    if (hit && hit.expiresAt > now) {
      items.push({
        id,
        previewUrl: hit.previewUrl,
        audioUrl: signAudioUrl(id, now),
        artworkUrl: hit.artworkUrl,
      });
      continue;
    }
    const missAt = missCache.get(id);
    if (missAt && now - missAt < MISS_TTL_MS) continue;
    pending.push(id);
  }
  if (pending.length === 0) return items;

  const resolved = new Map<number, SongPreview>();
  // 先整批请求（正常情况一次就够）；整批失败时按小块重试，最后再逐条兜底，
  // 这样哪怕混进一个已下架的 id，也不会让整局都拿不到试听。
  const ladder = [...new Set([pending.length, LOOKUP_CHUNK, 1])]
    .sort((a, b) => b - a)
    .filter((size, index, all) => index === 0 || size < all[index - 1]);
  for (const chunkSize of ladder) {
    const chunks: number[][] = [];
    for (let index = 0; index < pending.length; index += chunkSize) {
      chunks.push(pending.slice(index, index + chunkSize));
    }
    for (const chunk of chunks) {
      for (const item of await lookupBatch(chunk, fetchImpl)) {
        if (!resolved.has(item.id)) resolved.set(item.id, item);
      }
    }
    pending = pending.filter((id) => !resolved.has(id));
    if (pending.length === 0) break;
  }

  for (const id of pending) missCache.set(id, now);
  for (const item of resolved.values()) {
    cache.set(item.id, {
      previewUrl: item.previewUrl,
      artworkUrl: item.artworkUrl,
      expiresAt: now + CACHE_TTL_MS,
    });
    items.push({ ...item, audioUrl: signAudioUrl(item.id, now) });
  }
  // 保持与请求顺序一致，方便前端对照。
  const order = new Map(ids.map((id, index) => [id, index]));
  return items.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
}

const router = Router();

const previewLimit = rateLimit({
  name: 'song-quiz-preview',
  limit: 120,
  windowSeconds: 3600,
  key: requestIdentity,
});

/**
 * `GET /api/song-quiz/previews?ids=1,2,3`
 * 返回 `{ items: [{ id, previewUrl, audioUrl, artworkUrl }] }`；换不到的曲目不会出现在 items 里，前端需自行降级。
 */
router.get(
  '/previews',
  previewLimit,
  validateQuery(previewQuerySchema),
  asyncHandler(async (req, res) => {
    const ids = parsePreviewIds(String(req.query.ids));
    if (ids.length === 0) throw new HttpError(400, 'VALIDATION_FAILED');
    if (ids.length > PREVIEW_MAX_IDS) throw new HttpError(400, 'TOO_MANY_IDS');
    const items = await resolvePreviews(ids);
    res.json({ items });
  }),
);

const audioQuerySchema = z.object({
  t: z.string().trim().min(1).max(512),
});

const audioLimit = rateLimit({
  name: 'song-quiz-audio',
  limit: 600,
  windowSeconds: 3600,
});

/**
 * `GET /api/song-quiz/audio?t=...` —— 把 Apple 的 30 秒试听转发给客户端，顺手把 MIME 规范化。
 *
 * 这个 router **挂在 PoW 之前**（见 index.ts）：`<audio src>` 这种请求带不了自定义头，过不了工作量证明；
 * 安全性靠 `t` 里的 HMAC 签名兜底（只能转发服务端自己签发过的 trackId，且 6 小时后失效）。
 */
export const songQuizAudioRouter = Router();

songQuizAudioRouter.get(
  '/',
  audioLimit,
  validateQuery(audioQuerySchema),
  asyncHandler(async (req, res) => {
    const trackId = verifyAudioToken(String(req.query.t));
    if (trackId === null) throw new HttpError(403, 'INVALID_AUDIO_TOKEN');
    const [preview] = await resolvePreviews([trackId]);
    if (!preview) throw new HttpError(404, 'PREVIEW_UNAVAILABLE');

    const range = req.headers.range;
    const upstream = await fetch(preview.previewUrl, {
      headers: range ? { Range: range } : undefined,
      signal: AbortSignal.timeout(LOOKUP_TIMEOUT_MS),
    }).catch(() => null);
    if (!upstream || (!upstream.ok && upstream.status !== 206) || !upstream.body) {
      throw new HttpError(502, 'PREVIEW_FETCH_FAILED');
    }

    res.status(upstream.status === 206 ? 206 : 200);
    res.setHeader('Content-Type', 'audio/mp4');
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    for (const header of ['content-length', 'content-range']) {
      const value = upstream.headers.get(header);
      if (value) res.setHeader(header, value);
    }
    res.end(Buffer.from(await upstream.arrayBuffer()));
  }),
);

/* ------------------------------------------------- 成绩上报与全站排行榜 */

/**
 * 计分口径的**上限**（用于校验上报的分数是否讲得通）：
 * 单题最多 `(基础分 + 速度分) × 最高难度权重`，另加「全对」奖励。
 * 前端的权重表在 `client/src/config/songQuiz/index.ts`，这里只守一个大致的上界。
 */
const MAX_POINTS_PER_SONG = (100 + 60) * 2;
const PERFECT_BONUS_LIMIT = 250 * 2;
/** 一局最多多少题（专家模式全曲库，最大的分组约 220 首，留足余量）。 */
const MAX_QUESTIONS = 400;

export const SONG_DIFFICULTY_KEYS = ['easy', 'normal', 'hard', 'expert'] as const;
export type SongDifficultyKey = (typeof SONG_DIFFICULTY_KEYS)[number];

const scoreBodySchema = z.object({
  difficulty: z.enum(SONG_DIFFICULTY_KEYS),
  groupId: z.string().trim().regex(/^[a-z0-9]{3,24}$/),
  score: z.number().int().min(0).max(MAX_QUESTIONS * MAX_POINTS_PER_SONG + PERFECT_BONUS_LIMIT),
  correct: z.number().int().min(0).max(MAX_QUESTIONS),
  total: z.number().int().min(1).max(MAX_QUESTIONS),
  answered: z.number().int().min(0).max(MAX_QUESTIONS),
  durationMs: z.number().int().min(0).max(6 * 60 * 60 * 1000),
  avgMs: z.number().int().min(0).max(60 * 1000).nullable(),
  fastestMs: z.number().int().min(0).max(60 * 1000).nullable(),
  heartsLeft: z.number().int().min(0).max(3).nullable(),
  code: z.string().trim().max(300).regex(/^S\|[ENHX]\|/),
});

const boardQuerySchema = z.object({
  difficulty: z.enum(SONG_DIFFICULTY_KEYS).default('normal'),
});

interface ScoreRow {
  user_id: number;
  username: string;
  score: number;
  correct: number;
  total: number;
  answered: number;
  avg_ms: number | null;
  group_id: string;
  hearts_left: number | null;
  created_at: string;
}

/** 每个难度取「每人最好的一局」，按分数降序（并列看更早达成的）。 */
async function loadBoard(difficulty: SongDifficultyKey): Promise<ScoreRow[]> {
  const rows = await db.raw(
    `select * from (
       select s.*, row_number() over (
         partition by s.user_id order by s.score desc, s.id asc
       ) as rn
       from song_quiz_scores s
       where s.difficulty = ?
     ) best
     join users u on u.id = best.user_id
     where best.rn = 1 and u.leaderboard_hidden = false
     order by best.score desc, best.created_at asc, best.user_id asc`,
    [difficulty]
  );
  return (rows as unknown[]).map((raw) => {
    const row = raw as Record<string, unknown>;
    return {
      user_id: Number(row.user_id),
      username: String(row.username ?? ''),
      score: Number(row.score ?? 0),
      correct: Number(row.correct ?? 0),
      total: Number(row.total ?? 0),
      answered: Number(row.answered ?? 0),
      avg_ms: row.avg_ms === null || row.avg_ms === undefined ? null : Number(row.avg_ms),
      group_id: String(row.group_id ?? ''),
      hearts_left: row.hearts_left === null || row.hearts_left === undefined ? null : Number(row.hearts_left),
      created_at: String(row.created_at ?? ''),
    };
  });
}

const scoreLimit = rateLimit({
  name: 'song-quiz-score',
  limit: 40,
  windowSeconds: 3600,
  key: (req) => `song-quiz-score:${req.user?.id ?? req.ip}`,
});

const boardLimit = rateLimit({
  name: 'song-quiz-board',
  limit: 60,
  windowSeconds: 60,
  key: requestIdentity,
  failClosed: true,
});

/**
 * `POST /api/song-quiz/scores` —— 上报单机成绩（需登录）。
 * 分数由客户端算出（与站内其它小游戏一致），服务端只做合理区间校验，
 * 并存下成绩码以便人工复盘可疑分数。
 */
router.post(
  '/scores',
  requireAuth,
  scoreLimit,
  validateBody(scoreBodySchema),
  asyncHandler(async (req, res) => {
    const payload = req.body as z.infer<typeof scoreBodySchema>;
    const userId = req.user!.id;
    if (payload.correct > payload.total || payload.answered > payload.total) {
      throw new HttpError(400, 'INVALID_SCORE');
    }
    if (payload.answered < payload.correct) throw new HttpError(400, 'INVALID_SCORE');
    const ceiling = payload.total * MAX_POINTS_PER_SONG + PERFECT_BONUS_LIMIT;
    if (payload.score > ceiling) throw new HttpError(400, 'INVALID_SCORE');
    if (payload.heartsLeft !== null && payload.difficulty !== 'expert') {
      throw new HttpError(400, 'INVALID_SCORE');
    }

    const previous = (await db('song_quiz_scores')
      .where({ user_id: userId, difficulty: payload.difficulty })
      .max({ best: 'score' })
      .first()) as { best?: number | null } | undefined;
    const previousBest = previous?.best ?? null;

    await db('song_quiz_scores').insert({
      user_id: userId,
      difficulty: payload.difficulty,
      group_id: payload.groupId,
      score: payload.score,
      correct: payload.correct,
      total: payload.total,
      answered: payload.answered,
      duration_ms: payload.durationMs,
      avg_ms: payload.avgMs,
      fastest_ms: payload.fastestMs,
      hearts_left: payload.heartsLeft,
      code: payload.code,
    });

    const board = await loadBoard(payload.difficulty);
    const rank = board.findIndex((row) => row.user_id === userId) + 1;
    res.json({
      best: Math.max(payload.score, previousBest ?? 0),
      improved: previousBest === null || payload.score > previousBest,
      rank: rank > 0 ? rank : null,
    });
  })
);

/**
 * `GET /api/song-quiz/leaderboard?difficulty=normal` —— 全站排行榜（公开）。
 * 只显示登录用户的成绩（客人局不上榜），并且尊重 `leaderboard_hidden`。
 */
router.get(
  '/leaderboard',
  boardLimit,
  optionalAuth,
  validateQuery(boardQuerySchema),
  asyncHandler(async (req, res) => {
    if (!config.showLeaderboard) throw new HttpError(404, 'FEATURE_DISABLED');
    const { difficulty } = req.query as unknown as z.infer<typeof boardQuerySchema>;
    const board = await cached(`song-quiz-board:${difficulty}`, 30, () => loadBoard(difficulty));
    const currentIndex = req.user ? board.findIndex((row) => row.user_id === req.user!.id) : -1;
    res.json({
      difficulty,
      items: board.slice(0, 50).map((row, index) => ({
        rank: index + 1,
        displayId: userNameFromUsername(row.username),
        score: row.score,
        correct: row.correct,
        total: row.total,
        accuracy: row.total > 0 ? row.correct / row.total : 0,
        avgMs: row.avg_ms,
        groupId: row.group_id,
        heartsLeft: row.hearts_left,
        me: req.user ? row.user_id === req.user.id : false,
      })),
      currentUser:
        req.user && currentIndex >= 0
          ? {
              rank: currentIndex + 1,
              displayId: userNameFromUsername(req.user.username),
              score: board[currentIndex].score,
            }
          : null,
    });
  })
);

export default router;
