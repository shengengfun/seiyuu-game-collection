import crypto from 'crypto';
import { config } from '../config';
import { db } from '../db/knex';
import { cached, invalidateCached } from './queryCache';

/**
 * 「喜欢或讨厌」（好き嫌い）板块的服务层。
 *
 * 投票规则（用户定稿）：
 * - **一人一票**：同一身份对同一人物只算一票（`unique(seiyuu_id, voter_key)`），
 *   改投只覆盖原纪录，不会把票数堆起来。
 * - **一天一票 / 一天十票**：匿名身份按 **IP** 记账，每天 1 票；登录账号按账号记账，
 *   每天 10 票。额度只在「首次给某位投票」时消耗，改投不消耗。
 * - **同一人每天最多 5 票**：同一个身份每天可以给同一个人累计投到 `VOTE_PER_PERSON_LIMIT` 票
 *   （带一个“再加一票”的语义，体力/投入度能体现在热度里）；
 *   上限是**按天**的——昨天投满 5 票，今天仍然可以继续投。改投只换立场，票数不变。
 * - **投票前看不到结果**：比例与评论只对已经投过票的身份下发（见 `getSeiyuuDetail`）。
 *
 * 评论：必须登录 + 必须已投票 + 管理员审核通过后才公开，当前默认不开放
 * （`SUKIKIRAI_COMMENTS_ENABLED=false`）。
 */

export const VOTE_CHOICES = ['like', 'dislike'] as const;
export type VoteChoice = (typeof VOTE_CHOICES)[number];

/**
 * 可选的预设理由（投票时点一下即可，不填也行）。
 *
 * ⚠️ 客户端在 `client/src/config/sukikirai.ts` 里镜像了同一份 id 列表（文案在 i18n 的
 * `sukikirai.reasons.*`），两边要一起改。
 */
export const VOTE_REASONS: Record<VoteChoice, readonly string[]> = {
  like: ['voice', 'acting', 'looks', 'character', 'personality', 'live', 'growth', 'vibe'],
  dislike: ['voice', 'acting', 'looks', 'character', 'personality', 'overpush', 'hype', 'vibe'],
};

export function isReasonFor(choice: VoteChoice, reason: unknown): reason is string {
  return typeof reason === 'string' && VOTE_REASONS[choice].includes(reason);
}

/**
 * 每日额度分档：匿名按 IP 1 票、普通账号 10 票、**累计投满 100 票的老用户 20 票**、管理员 50 票
 * （管理员那一档是给测试留的口子）。
 */
export const VOTE_DAILY_LIMIT = { guest: 1, user: 10, veteran: 20, admin: 50 } as const;
export type VoterTier = keyof typeof VOTE_DAILY_LIMIT;

/** 累计投满这么多票之后，日额度从 user 提到 veteran。 */
export const VOTE_VETERAN_THRESHOLD = 100;

/** 同一个身份 **每天** 能投给同一个人物的票数上限（“一天五票都给同一个人”）。 */
export const VOTE_PER_PERSON_LIMIT = 5;

export const COMMENT_MAX_LENGTH = 200;
export const COMMENT_STATUSES = ['pending', 'approved', 'rejected'] as const;
export type CommentStatus = (typeof COMMENT_STATUSES)[number];

export const VOTES_CACHE_KEY = 'sukikirai:votes';
const VOTES_CACHE_TTL_SECONDS = 30;

/** 榜单时间窗：日榜（今天）/ 周榜（最近 7 天）/ 月榜（最近 30 天）/ 总榜（全部）。 */
export const VOTE_RANGES = ['day', 'week', 'month', 'all'] as const;
export type VoteRange = (typeof VOTE_RANGES)[number];

export function isVoteRange(value: unknown): value is VoteRange {
  return typeof value === 'string' && (VOTE_RANGES as readonly string[]).includes(value);
}

/** 每个时间窗覆盖多少个自然日（含今天）。总榜用 `seiyuu_votes` 的累计票数，不走流水。 */
export const RANGE_DAY_SPAN: Record<Exclude<VoteRange, 'all'>, number> = {
  day: 1,
  week: 7,
  month: 30,
};

/** 时间窗的起始自然日序号（含），总榜返回 null 表示不限。 */
export function rangeStartDay(range: VoteRange, now: number = Date.now()): number | null {
  if (range === 'all') return null;
  return voteDayIndex(now) - (RANGE_DAY_SPAN[range] - 1);
}

function rangeCacheKey(range: VoteRange): string {
  return `${VOTES_CACHE_KEY}:${range}`;
}

/** 自然日切分按 Asia/Shanghai（UTC+8），与站内用户的时间感受一致。 */
const DAY_OFFSET_MS = 8 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export const SEIYUU_ID_PATTERN = /^[a-z0-9-]{1,64}$/;

export function isSeiyuuId(value: string): boolean {
  return SEIYUU_ID_PATTERN.test(value);
}

/** 当前所处的自然日序号（同一个序号内共享一份额度）。 */
export function voteDayIndex(now: number = Date.now()): number {
  return Math.floor((now + DAY_OFFSET_MS) / DAY_MS);
}

/** 当前自然日还剩多少毫秒结束，用于给前端显示「额度何时刷新」。 */
export function voteDayRemainingMs(now: number = Date.now()): number {
  return (voteDayIndex(now) + 1) * DAY_MS - (now + DAY_OFFSET_MS);
}

export interface VoterIdentity {
  /** 库里的 `voter_key`。 */
  key: string;
  kind: 'guest' | 'user';
  userId: number | null;
  /** 当日可投出的新增票数上限。 */
  limit: number;
  /** 额度分档（前端用来解释「为什么我一天有 20 票」）。 */
  tier: VoterTier;
  /** 登录账号的累计投票数（匿名恒为 0）。 */
  cumulativeVotes: number;
}

/** 匿名身份用 IP 派生（只存 HMAC，不存明文 IP，沿用访客身份的盐）。 */
function hashIp(ip: string): string {
  return crypto.createHmac('sha256', config.guestIdSalt).update(`sukikirai:${ip}`).digest('hex');
}

/**
 * 把同一个访客的 IP 写法归一，避免「同一个浏览器换一种写法就多一份额度」：
 * - `::ffff:1.2.3.4` → `1.2.3.4`（IPv4-mapped IPv6，Node 在双栈监听下很常见）
 * - `::1` → `127.0.0.1`（本地回环：浏览器可能在两种写法之间来回切，dev 下尤其明显）
 * - 去掉 `%eth0` 这类 zone id，统一小写
 *
 * 注意：真正的 IPv4 与真正的 IPv6 地址在网络层就是两个地址，不做合并——
 * 匿名额度按 IP 记账（用户定稿），这是它的固有粒度。
 */
export function normalizeIp(ip: string): string {
  let value = ip.trim().toLowerCase();
  const zone = value.indexOf('%');
  if (zone >= 0) value = value.slice(0, zone);
  if (value.startsWith('::ffff:')) value = value.slice('::ffff:'.length);
  if (value === '::1' || value === '0:0:0:0:0:0:0:1') value = '127.0.0.1';
  return value;
}

export function voterIdentityOf(req: {
  user?: { id: number };
  ip?: string;
  socket?: { remoteAddress?: string };
}): VoterIdentity {
  if (req.user) {
    return {
      key: `u:${req.user.id}`,
      kind: 'user',
      userId: req.user.id,
      limit: VOTE_DAILY_LIMIT.user,
      tier: 'user',
      cumulativeVotes: 0,
    };
  }
  const ip = normalizeIp(req.ip || req.socket?.remoteAddress || 'unknown');
  return {
    key: `ip:${hashIp(ip)}`,
    kind: 'guest',
    userId: null,
    limit: VOTE_DAILY_LIMIT.guest,
    tier: 'guest',
    cumulativeVotes: 0,
  };
}

/** 某个身份投出的累计票数（用来判定 veteran 档与彩蛋开关）。 */
export async function loadCumulativeVotes(voterKey: string): Promise<number> {
  const row = await db('seiyuu_votes').where({ voter_key: voterKey }).sum({ count: 'votes' }).first();
  return Number((row as { count?: number | string } | undefined)?.count ?? 0);
}

/**
 * 解析当前身份的额度档位（异步：登录账号要看累计票数）。
 * 优先顺序：管理员 50 ▶ 累计投满 100 票的老用户 20 ▶ 普通账号 10 ▶ 匿名 1。
 */
export async function resolveVoter(req: {
  user?: { id: number; role?: string };
  ip?: string;
  socket?: { remoteAddress?: string };
}): Promise<VoterIdentity> {
  const base = voterIdentityOf(req);
  // 累计票数两种身份都算（彩蛋开关按它解锁），但**额度分档只给登录账号升级**。
  const cumulativeVotes = await loadCumulativeVotes(base.key);
  if (base.kind !== 'user' || base.userId === null) {
    return { ...base, cumulativeVotes };
  }
  if (req.user?.role === 'admin') {
    return { ...base, limit: VOTE_DAILY_LIMIT.admin, tier: 'admin', cumulativeVotes };
  }
  if (cumulativeVotes < VOTE_VETERAN_THRESHOLD) return { ...base, cumulativeVotes };
  return { ...base, limit: VOTE_DAILY_LIMIT.veteran, tier: 'veteran', cumulativeVotes };
}

export interface VoteCounts {
  likes: number;
  dislikes: number;
  total: number;
}

interface VoteRow {
  seiyuu_id: string;
  choice: string;
  count: number | string;
}

/** 全站票数：按人物聚合（按票数加权，不是按人头），30 秒缓存（投票后立即失效）。 */
export async function loadVoteTotals(): Promise<Map<string, VoteCounts>> {
  const rows = await cached(VOTES_CACHE_KEY, VOTES_CACHE_TTL_SECONDS, () =>
    db<VoteRow>('seiyuu_votes')
      .select('seiyuu_id', 'choice')
      .sum({ count: 'votes' })
      .groupBy('seiyuu_id', 'choice')
  );
  const totals = new Map<string, VoteCounts>();
  for (const row of rows) {
    const entry = totals.get(row.seiyuu_id) ?? { likes: 0, dislikes: 0, total: 0 };
    const count = Number(row.count) || 0;
    if (row.choice === 'dislike') entry.dislikes += count;
    else entry.likes += count;
    entry.total += count;
    totals.set(row.seiyuu_id, entry);
  }
  return totals;
}

/** 某个身份投过哪些人、投的什么、各投了几票（`votes` 是累计，`day_votes` 是当天新增）。 */
export interface MyVote {
  choice: VoteChoice;
  votes: number;
  dayVotes: number;
  reason: string | null;
}

export async function loadMyVotes(voterKey: string): Promise<Map<string, MyVote>> {
  const day = voteDayIndex();
  const rows = await db('seiyuu_votes')
    .where({ voter_key: voterKey })
    .select('seiyuu_id', 'choice', 'votes', 'reason', 'day', 'day_votes');
  return new Map(
    rows.map(
      (row) =>
        [
          String(row.seiyuu_id),
          {
            choice: String(row.choice) as VoteChoice,
            votes: Number(row.votes) || 1,
            dayVotes: Number(row.day) === day ? Number(row.day_votes) || 0 : 0,
            reason: row.reason == null ? null : String(row.reason),
          },
        ] as const
    )
  );
}

export interface VoteQuota {
  kind: 'guest' | 'user';
  tier: VoterTier;
  limit: number;
  used: number;
  remaining: number;
  /** 额度刷新（进入下一个自然日）还有多少秒。 */
  resetsInSeconds: number;
  /** 登录账号的累计票数；匿名恒为 0。 */
  cumulativeVotes: number;
}

export async function loadQuota(voter: VoterIdentity): Promise<VoteQuota> {
  const row = await db('seiyuu_votes')
    .where({ voter_key: voter.key, day: voteDayIndex() })
    .sum({ count: 'day_votes' })
    .first();
  const used = Number(row?.count ?? 0);
  return {
    kind: voter.kind,
    tier: voter.tier,
    limit: voter.limit,
    used,
    remaining: Math.max(0, voter.limit - used),
    resetsInSeconds: Math.max(0, Math.round(voteDayRemainingMs() / 1000)),
    cumulativeVotes: voter.cumulativeVotes,
  };
}

/**
 * 榜单票数（只给总数，不给喜欢 / 讨厌拆分）：
 * - `all` 用 `seiyuu_votes` 的累计票数；
 * - 日 / 周 / 月按 `seiyuu_vote_events` 的 `day` 做时间窗聚合。
 * 结果按窗口缓存，投票后统一失效。
 */
export async function loadRangeCounts(range: VoteRange): Promise<Record<string, number>> {
  if (range === 'all') {
    const totals = await loadVoteTotals();
    const counts: Record<string, number> = {};
    for (const [id, entry] of totals) counts[id] = entry.total;
    return counts;
  }
  const from = rangeStartDay(range);
  return cached(rangeCacheKey(range), VOTES_CACHE_TTL_SECONDS, async () => {
    // knex 的 `.sum()` 会把 select 链的类型擦成 `{ count?: any }`，这里手动还原成实际返回列。
    const rows = (await db('seiyuu_vote_events')
      .where('day', '>=', from ?? 0)
      .select('seiyuu_id')
      .sum({ count: 'votes_delta' })
      .groupBy('seiyuu_id')) as unknown as { seiyuu_id: string; count?: number | string }[];
    const counts: Record<string, number> = {};
    for (const row of rows) counts[String(row.seiyuu_id)] = Number(row.count) || 0;
    return counts;
  });
}

/** 投票落库后：所有时间窗的缓存一起失效。 */
export async function invalidateVoteCaches(): Promise<void> {
  await invalidateCached(VOTES_CACHE_KEY, ...VOTE_RANGES.map((range) => rangeCacheKey(range)));
}

export function countsOf(totals: Map<string, VoteCounts>, seiyuuId: string): VoteCounts {
  return totals.get(seiyuuId) ?? { likes: 0, dislikes: 0, total: 0 };
}

export interface ReasonStat {
  id: string;
  count: number;
}

/** 某个人物上「大家选的理由」按票数降序，喜欢 / 讨厌分开（只给已投票的人看）。 */
export async function loadReasonStats(
  seiyuuId: string,
  limit = 4
): Promise<{ likes: ReasonStat[]; dislikes: ReasonStat[] }> {
  const rows = (await db('seiyuu_votes')
    .where({ seiyuu_id: seiyuuId })
    .whereNotNull('reason')
    .select('choice', 'reason')
    .sum({ count: 'votes' })
    .groupBy('choice', 'reason')) as Array<{ choice: string; reason: string; count: number | string }>;
  const pick = (choice: VoteChoice): ReasonStat[] =>
    rows
      .filter((row) => String(row.choice) === choice)
      .map((row) => ({ id: String(row.reason), count: Number(row.count) || 0 }))
      .sort((left, right) => right.count - left.count)
      .slice(0, limit);
  return { likes: pick('like'), dislikes: pick('dislike') };
}

/* ------------------------------------------------------------------ 评论 */

export function commentsEnabled(): boolean {
  return config.sukikiraiCommentsEnabled;
}

export interface CommentView {
  id: number;
  seiyuuId: string;
  author: string;
  choice: VoteChoice;
  body: string;
  createdAt: number;
}

/** 审核通过的短评（按时间正序，像 BBS 一样从上往下读）。 */
export async function listApprovedComments(seiyuuId: string): Promise<CommentView[]> {
  const rows = await db('seiyuu_vote_comments')
    .where({ seiyuu_id: seiyuuId, status: 'approved' })
    .orderBy('id', 'asc')
    .limit(200)
    .select('id', 'seiyuu_id', 'author_name', 'choice', 'body', 'created_at');
  return rows.map((row) => ({
    id: Number(row.id),
    seiyuuId: String(row.seiyuu_id),
    author: String(row.author_name ?? ''),
    choice: (String(row.choice) === 'dislike' ? 'dislike' : 'like') as VoteChoice,
    body: String(row.body ?? ''),
    createdAt: Number(row.created_at) || 0,
  }));
}

/** 审核动作后让公开接口立刻反映（评论目前不进缓存，这里留作显式失效点）。 */
export async function invalidateSukikirai(): Promise<void> {
  await invalidateVoteCaches();
}
