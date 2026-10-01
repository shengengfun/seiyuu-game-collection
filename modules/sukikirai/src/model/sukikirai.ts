import {
  SEIYUU_ROSTER,
  seiyuuPhotoPath,
  type ProjectId,
  type SeiyuuIdentity,
} from '@seiyuu/shared';

/**
 * 「喜欢或讨厌」（好き嫌い）板块的客户端数据层。
 *
 * 候选人是 `@seiyuu/shared` 名册里的全部女声优（拉邦歌偶马：LoveLive! / BanG Dream! /
 * 少女☆歌剧 / 偶像大师 / 赛马娘 / 世界计划 / 学园偶像大师 / D4DJ）。
 *
 * 榜单只按**热度（总票数）**排序——喜欢 / 讨厌的拆分只在人物页、且投票之后才下发，
 * 榜单里不出现，否则「先投票才能看结果」就形同虚设。
 *
 * 投票规则（与服务端 services/sukikirai.ts 对齐）：
 * - 同一身份对同一人物累计最多 `VOTE_PER_PERSON_LIMIT` 票，点同一边 = 再加一票，
 *   点另一边 = 改投（票数不变）。
 * - 每日额度：匿名按 IP 1 票、登录账号 10 票；只有真的加票才消耗额度。
 */

export const SUKIKIRAI_ID_PATTERN = /^[a-z0-9-]{1,64}$/;

export const VOTE_CHOICES = ['like', 'dislike'] as const;
export type VoteChoice = (typeof VOTE_CHOICES)[number];

/** 短评长度上限（与服务端 `COMMENT_MAX_LENGTH` 保持一致）。 */
export const COMMENT_MAX_LENGTH = 200;

/** 同一个身份**每天**能投给同一个人物的票数上限（与服务端 `VOTE_PER_PERSON_LIMIT` 一致）。 */
export const VOTE_PER_PERSON_LIMIT = 5;

/** 每日额度分档（与服务端 `VOTE_DAILY_LIMIT` 一致）。 */
export const VOTE_DAILY_LIMIT = { guest: 1, user: 10, veteran: 20, admin: 50 } as const;
export type VoterTier = keyof typeof VOTE_DAILY_LIMIT;

/** 累计投满这么多票之后，日额度从 user 提到 veteran（与服务端一致）。 */
export const VOTE_VETERAN_THRESHOLD = 100;

/** 榜单时间窗：总榜（全部）/ 日榜（今天）/ 周榜（最近 7 天）/ 月榜（最近 30 天），顺序即界面顺序。 */
export const BOARD_RANGES = ['all', 'day', 'week', 'month'] as const;
export type VoteRange = (typeof BOARD_RANGES)[number];

/** 默认看总榜（第一个标签）：新站点日榜经常是空的，先给一份完整排行。 */
export const DEFAULT_BOARD_RANGE: VoteRange = 'all';

/**
 * 投票时可选的理由 id。
 *
 * ⚠️ 与服务端 `server/src/services/sukikirai.ts` 的 `VOTE_REASONS` 镜像，
 * 文案在 i18n 的 `sukikirai.reasons.<choice>.<id>`，改的时候三处一起改。
 */
export const VOTE_REASON_IDS: Record<VoteChoice, readonly string[]> = {
  like: ['voice', 'acting', 'looks', 'character', 'personality', 'live', 'growth', 'vibe'],
  dislike: ['voice', 'acting', 'looks', 'character', 'personality', 'overpush', 'hype', 'vibe'],
};

/** 前端展示的候选池（名册顺序与全站一致）。 */
export const SUKIKIRAI_ROSTER: SeiyuuIdentity[] = SEIYUU_ROSTER;

/**
 * 彩蛋人物：不是女声优、不进 `@seiyuu/shared` 名册（混进去会污染 Who You Are 的画像与公式照），
 * 只在本板块作为“可投的一个人”存在。
 *
 * 介绍文案**只写中文**（与「声优问答」里的彩蛋题库同一约定），不做三语。
 */
export interface SukikiraiEgg {
  id: string;
  name: string;
  nameJa: string;
  romaji: string;
  /** 榜单项与人物页上展示的一句话介绍。 */
  intro: string;
  /** 榜单里的企划标签（他本来就是邦邦那边的人）。 */
  project: ProjectId;
}

export const SUKIKIRAI_EASTER_EGGS: SukikiraiEgg[] = [
  {
    id: 'kidani-takaaki',
    name: '木谷高明',
    nameJa: '木谷高明',
    romaji: 'Kidani Takaaki',
    intro:
      '女声优的庇护者，木柜子的缔造者，久经考验的日本资本主义战士，坚定的中国市场维护者',
    project: 'bangdream',
  },
];

/** 累计投满这么多票，榜单才会多出「不看彩蛋人物」开关（默认勾上 = 默认不看）。 */
export const EASTER_EGG_UNLOCK_VOTES = 50;

/** 彩蛋人物的榜单项（借用 `SeiyuuIdentity` 的形状，代表角色为空）。 */
export const SUKIKIRAI_EGG_ENTRIES: SeiyuuIdentity[] = SUKIKIRAI_EASTER_EGGS.map((egg) => ({
  id: egg.id,
  name: egg.name,
  nameJa: egg.nameJa,
  romaji: egg.romaji,
  project: egg.project,
  characters: [],
}));

/** 榜单 / 投票页真正可投的全部人选（名册 + 彩蛋）。 */
export const SUKIKIRAI_ENTRIES: SeiyuuIdentity[] = [
  ...SUKIKIRAI_ROSTER,
  ...SUKIKIRAI_EGG_ENTRIES,
];

const EGG_BY_ID = new Map(SUKIKIRAI_EASTER_EGGS.map((egg) => [egg.id, egg]));

/** id -> 档案（含彩蛋），投票页用它查人。 */
export const SUKIKIRAI_BY_ID = new Map(SUKIKIRAI_ENTRIES.map((entry) => [entry.id, entry]));

export function isEasterEgg(id: string): boolean {
  return EGG_BY_ID.has(id);
}

/** 彩蛋介绍（没有就返回空串）。 */
export function easterEggIntro(id: string): string {
  return EGG_BY_ID.get(id)?.intro ?? '';
}

export const sukikiraiPhotoPath = seiyuuPhotoPath;

export interface VoteQuota {
  kind: 'guest' | 'user';
  /** 额度档位：guest 1 / user 10 / veteran 20 / admin 50。 */
  tier: VoterTier;
  limit: number;
  used: number;
  remaining: number;
  resetsInSeconds: number;
  /** 登录账号的累计票数（匿名恒为 0）。 */
  cumulativeVotes: number;
}

export interface VoteCounts {
  likes: number;
  dislikes: number;
  total: number;
}

/** 我在某个人物上投出的票（`votes` 累计、`dayVotes` 今天）。 */
export interface MyVote {
  choice: VoteChoice;
  votes: number;
  /** 今天给这位投了几票（每天上限 `VOTE_PER_PERSON_LIMIT`）。 */
  dayVotes: number;
  reason: string | null;
}

export interface CommentView {
  id: number;
  seiyuuId: string;
  author: string;
  choice: VoteChoice;
  body: string;
  createdAt: number;
}

export interface BoardResponse {
  /** 服务端实际使用的时间窗（非法值会回落到总榜）。 */
  range: VoteRange;
  /** 每个人物在该时间窗内的总票数（不含喜欢 / 讨厌拆分）。 */
  counts: Record<string, number>;
  myVotes: Record<string, MyVote>;
  quota: VoteQuota;
  commentsEnabled: boolean;
  /** 服务端的“同一人最多几票”，用来核对与常量是否同步。 */
  perPersonLimit: number;
  day: number;
  updatedAt: number;
}

export type SeiyuuDetailResponse = {
  id: string;
  quota: VoteQuota;
  commentsEnabled: boolean;
} & (
  | { voted: false }
  | {
      voted: true;
      myVote: VoteChoice;
      /** 我选的理由 id（未选为 null）。 */
      myReason: string | null;
      /** 我投给这位的累计票数（展示用）。 */
      myVotes: number;
      /** 我今天投给这位的票数（上限判断用，跨天会归零）。 */
      myDayVotes: number;
      likes: number;
      dislikes: number;
      total: number;
      reasons: { likes: ReasonStat[]; dislikes: ReasonStat[] };
      comments: CommentView[];
    }
);

/** 某个理由被选了多少次（只统计填了理由的票）。 */
export interface ReasonStat {
  id: string;
  count: number;
}

export interface BoardRow {
  identity: SeiyuuIdentity;
  /** 总票数（热度）。 */
  total: number;
  myVote: MyVote | null;
}

/** 把服务端的票数映射合并进名册（含彩蛋），并按热度降序排（同票按名单顺序，保证稳定）。 */
export function buildBoardRows(
  counts: Record<string, number>,
  myVotes: Record<string, MyVote> = {},
  entries: SeiyuuIdentity[] = SUKIKIRAI_ENTRIES
): BoardRow[] {
  return entries
    .map((identity) => ({
      identity,
      total: Math.max(0, Number(counts[identity.id]) || 0),
      myVote: myVotes[identity.id] ?? null,
    }))
    .sort((left, right) => right.total - left.total);
}

/** 关键词匹配（姓名 / 日文名 / 罗马字 / id / 代表角色），空关键词返回全部。 */
export function searchRows(rows: BoardRow[], keyword: string): BoardRow[] {
  const needle = keyword.trim().toLowerCase();
  if (!needle) return rows;
  return rows.filter((row) =>
    [
      row.identity.name,
      row.identity.nameJa,
      row.identity.romaji,
      row.identity.id,
      ...row.identity.characters.map((character) => `${character.name}${character.work}`),
    ]
      .join(' ')
      .toLowerCase()
      .includes(needle)
  );
}

/** 喜欢 / 讨厌的百分比（四舍五入到整数，两者之和恒为 100；无票时各 50）。 */
export function votePercentages(counts: Pick<VoteCounts, 'likes' | 'dislikes'>): {
  like: number;
  dislike: number;
} {
  const total = counts.likes + counts.dislikes;
  if (total <= 0) return { like: 50, dislike: 50 };
  const like = Math.round((counts.likes / total) * 100);
  return { like, dislike: 100 - like };
}

/** 榜单里的总票数合计。 */
export function totalVotes(counts: Record<string, number>): number {
  return Object.values(counts).reduce((sum, value) => sum + (Number(value) || 0), 0);
}

/** 今日额度文案用的小时 / 分钟拆分。 */
export function formatResetIn(seconds: number): { hours: number; minutes: number } {
  const safe = Math.max(0, Math.floor(seconds));
  return { hours: Math.floor(safe / 3600), minutes: Math.floor((safe % 3600) / 60) };
}

/** 票数密集时的紧凑写法：1.2 万 / 3456。 */
export function formatVoteCount(value: number): string {
  if (value >= 10_000) return `${(value / 10_000).toFixed(1)} 万`;
  return String(value);
}
