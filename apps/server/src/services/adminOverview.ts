import { db } from '../db/knex';

/**
 * 管理后台「数据概览」的统计口径。
 *
 * ⚠️ 时间戳在本库里有**两种形态**，必须分开处理：
 *  1. `CURRENT_TIMESTAMP`（knex 的 `fn.now()`）→ 字符串 `YYYY-MM-DD HH:MM:SS`，内容是 **UTC**。
 *  2. 单人对局 `games.created_at` → **epoch 毫秒数字**（routes/game.ts 写入的是 `new Date(...)`）。
 *
 * 所以：字符串按 UTC 解析、数字按毫秒解析，再统一换算成「服务器本地日期」分桶。
 * （早期版本无差别按本地时间解析，会在每天 00:00–08:00（UTC+8）把记录算到前一天；
 * 更糟的是拿字符串去和数字列比较 —— SQLite 里 INTEGER 恒小于 TEXT，单人局会永远统计为 0。）
 */
export const TREND_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;

const pad = (value: number) => String(value).padStart(2, '0');

const DB_DATETIME_RE = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(\.\d+)?$/;

/** 把库里的时间戳统一解析成时刻（字符串按 UTC，数字按 epoch 毫秒）。 */
export function parseDbTimestamp(value: unknown): Date | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === 'number') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const date = DB_DATETIME_RE.test(trimmed)
      ? new Date(`${trimmed.replace(' ', 'T')}Z`)
      : new Date(trimmed);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}

/** 本地日期键 `YYYY-MM-DD`（趋势分桶用）。 */
export function localDayKey(value: unknown): string | null {
  const date = parseDbTimestamp(value);
  if (!date) return null;
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** 时刻 → 库里的 UTC 字符串，用于和 `CURRENT_TIMESTAMP` 列做字符串比较。 */
function formatDbUtc(date: Date): string {
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

/** 本地当天 00:00 对应的时刻。 */
function startOfLocalDay(reference: Date): Date {
  const start = new Date(reference);
  start.setHours(0, 0, 0, 0);
  return start;
}

export interface AdminOverviewTrendPoint {
  date: string;
  users: number;
  guests: number;
  singleGames: number;
  matches: number;
}

export interface AdminOverview {
  generatedAt: string;
  today: string;
  users: { total: number; admins: number; banned: number; newToday: number; activeToday: number };
  guests: { total: number; newToday: number; activeToday: number };
  games: { singleTotal: number; singleToday: number; multiTotal: number; multiToday: number };
  content: {
    seiyuus: number;
    announcements: number;
    pendingReports: number;
    pendingPlayerChanges: number;
    pendingQuizSubmissions: number;
    approvedQuizSubmissions: number;
  };
  trend: AdminOverviewTrendPoint[];
}

const countOf = (row: unknown): number => Number((row as { count?: unknown } | undefined)?.count ?? 0);

export async function buildAdminOverview(): Promise<AdminOverview> {
  const now = new Date();
  const today = localDayKey(now)!;
  const trendStart = new Date(startOfLocalDay(now).getTime() - (TREND_DAYS - 1) * DAY_MS);
  const windowStartMs = trendStart.getTime();
  const windowStartUtc = formatDbUtc(trendStart);
  const todayStartUtc = formatDbUtc(startOfLocalDay(now));
  const todayEndUtc = formatDbUtc(new Date(startOfLocalDay(now).getTime() + DAY_MS - 1000));

  const [
    userTotal,
    userAdmins,
    userBanned,
    guestTotal,
    guestActiveRow,
    singleTotalRow,
    multiTotalRow,
    seiyuuTotal,
    announcementTotal,
    pendingReports,
    pendingChanges,
    pendingQuiz,
    approvedQuiz,
    userRows,
    guestRows,
    gameRows,
    matchRows,
  ] = await Promise.all([
    db('users').count({ count: 'id' }).first(),
    db('users').where({ role: 'admin' }).count({ count: 'id' }).first(),
    db('users').whereNotNull('banned_at').count({ count: 'id' }).first(),
    db('guest_accounts').count({ count: 'id' }).first(),
    db('guest_accounts').whereBetween('last_seen_at', [todayStartUtc, todayEndUtc]).count({ count: 'id' }).first(),
    db('games').whereNot({ status: 'playing' }).count({ count: 'id' }).first(),
    db('match_records').count({ count: 'id' }).first(),
    db('seiyuus').count({ count: 'id' }).first(),
    db('announcements').count({ count: 'id' }).first(),
    db('match_reports').where({ status: 'pending' }).count({ count: 'id' }).first(),
    db('player_change_items').where({ status: 'pending' }).count({ count: 'id' }).first(),
    db('quiz_submissions').where({ status: 'pending' }).count({ count: 'id' }).first(),
    db('quiz_submissions').where({ status: 'approved' }).count({ count: 'id' }).first(),
    db('users').where('created_at', '>=', windowStartUtc).select('created_at'),
    db('guest_accounts').where('created_at', '>=', windowStartUtc).select('created_at'),
    // games 的时间列是毫秒数字，必须用数字比较（否则 INTEGER 与 TEXT 比较恒为假）。
    db('games')
      .whereNot({ status: 'playing' })
      .where('created_at', '>=', windowStartMs)
      .select('id', 'user_id', 'created_at'),
    db('match_records')
      .where('created_at', '>=', windowStartUtc)
      .select('id', 'winner_id', 'created_at'),
  ]);

  const trendMap = new Map<string, AdminOverviewTrendPoint>();
  for (let offset = TREND_DAYS - 1; offset >= 0; offset -= 1) {
    const date = localDayKey(new Date(now.getTime() - offset * DAY_MS))!;
    trendMap.set(date, { date, users: 0, guests: 0, singleGames: 0, matches: 0 });
  }

  const userDayRows = (userRows as { created_at: unknown }[])
    .map((row) => localDayKey(row.created_at))
    .filter((key): key is string => Boolean(key));
  const guestDayRows = (guestRows as { created_at: unknown }[])
    .map((row) => localDayKey(row.created_at))
    .filter((key): key is string => Boolean(key));
  const gameDayRows = (gameRows as { id: number; user_id: number | null; created_at: unknown }[])
    .map((row) => ({ day: localDayKey(row.created_at), userId: row.user_id }));
  const matchDayRows = (matchRows as { id: number; winner_id: number | null; created_at: unknown }[])
    .map((row) => ({ day: localDayKey(row.created_at), id: row.id }));

  for (const day of userDayRows) {
    const point = trendMap.get(day);
    if (point) point.users += 1;
  }
  for (const day of guestDayRows) {
    const point = trendMap.get(day);
    if (point) point.guests += 1;
  }
  for (const row of gameDayRows) {
    if (!row.day) continue;
    const point = trendMap.get(row.day);
    if (point) point.singleGames += 1;
  }
  for (const row of matchDayRows) {
    if (!row.day) continue;
    const point = trendMap.get(row.day);
    if (point) point.matches += 1;
  }

  // 今日活跃账号 = 今天玩过单人对局的账号 ∪ 今天参与过多人的账号。
  const activeUserIds = new Set<number>();
  for (const row of gameDayRows) {
    if (row.day === today && row.userId != null) activeUserIds.add(Number(row.userId));
  }
  const todayMatchIds = matchDayRows.filter((row) => row.day === today).map((row) => row.id);
  if (todayMatchIds.length) {
    const matchUserIds = await db('match_players')
      .whereIn('match_id', todayMatchIds)
      .whereNotNull('user_id')
      .distinct('user_id')
      .pluck('user_id');
    for (const id of matchUserIds as number[]) activeUserIds.add(Number(id));
  }

  return {
    generatedAt: now.toISOString(),
    today,
    users: {
      total: countOf(userTotal),
      admins: countOf(userAdmins),
      banned: countOf(userBanned),
      newToday: userDayRows.filter((day) => day === today).length,
      activeToday: activeUserIds.size,
    },
    guests: {
      total: countOf(guestTotal),
      newToday: guestDayRows.filter((day) => day === today).length,
      activeToday: countOf(guestActiveRow),
    },
    games: {
      singleTotal: countOf(singleTotalRow),
      singleToday: gameDayRows.filter((row) => row.day === today).length,
      multiTotal: countOf(multiTotalRow),
      multiToday: todayMatchIds.length,
    },
    content: {
      seiyuus: countOf(seiyuuTotal),
      announcements: countOf(announcementTotal),
      pendingReports: countOf(pendingReports),
      pendingPlayerChanges: countOf(pendingChanges),
      pendingQuizSubmissions: countOf(pendingQuiz),
      approvedQuizSubmissions: countOf(approvedQuiz),
    },
    trend: [...trendMap.values()],
  };
}
