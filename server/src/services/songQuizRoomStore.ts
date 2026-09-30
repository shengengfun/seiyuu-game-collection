/**
 * 「猜歌」多人对战的房间状态（内存态，不落库）。
 *
 * 为什么单独写一份、不复用 `services/roomStore.ts`？
 * 那份是声优猜的：房间要存猜测历史、回放、BO 局数、匹配池、观众，还要落 SQLite。
 * 猜歌对战的房间只有「谁在房间里、第几题、谁答了什么」，而且**曲库只在客户端**，
 * 服务端既不需要也不应该存题目，所以这里是一份纯内存的小状态机。
 *
 * 职责划分：
 * - 本文件：纯状态变更（可单测，不碰 io / 定时器 / 不碰数据库）。
 * - `socket/songQuizMulti.ts`：房间表、定时器、广播、限流。
 *
 * 计分与正确性：**正确与否由客户端判定**（曲库在客户端，服务端没有题目数据），
 * 服务端只负责计时、排序、算分——和单人成绩上报是同一档信任级别（见 README 的说明）。
 */

export const SQ_MULTI_MODES = ['rush', 'reveal'] as const;
export type SqMultiMode = (typeof SQ_MULTI_MODES)[number];

/** 与 `routes/songQuiz.ts` 的 `SONG_DIFFICULTY_KEYS` 保持一致。 */
export const SQ_MULTI_DIFFICULTIES = ['easy', 'normal', 'hard', 'expert'] as const;
export type SqMultiDifficulty = (typeof SQ_MULTI_DIFFICULTIES)[number];

/** 一局几题（房主选）。 */
export const SQ_MULTI_ROUND_OPTIONS = [3, 5, 10] as const;
export const SQ_MULTI_MIN_PLAYERS = 2;
export const SQ_MULTI_MAX_PLAYERS = 8;
/** 一题给多少时间作答。 */
export const SQ_MULTI_QUESTION_MS = 25_000;
/** 揭晓答案后停留多久再进下一题。 */
export const SQ_MULTI_REVEAL_MS = 4_000;
/** 基础分 / 速度分 / 第 1、2、3 个答对的额外分。 */
export const SQ_MULTI_BASE_POINTS = 100;
export const SQ_MULTI_SPEED_BONUS = 60;
export const SQ_MULTI_RANK_BONUS = [50, 30, 15] as const;
/** 「渐进揭示」模式：每题允许听的秒数从 5 秒起、每题 +3 秒。 */
export const SQ_MULTI_PREVIEW_BASE_SECONDS = 5;
export const SQ_MULTI_PREVIEW_STEP_SECONDS = 3;
export const SQ_MULTI_PREVIEW_MAX_SECONDS = 20;
/** 「同题竞速」：试听是完整的 30 秒。 */
export const SQ_MULTI_FULL_PREVIEW_SECONDS = 30;
/** 空房间 / 闲置房间的回收时间。 */
export const SQ_MULTI_EMPTY_TTL_MS = 2 * 60_000;
export const SQ_MULTI_IDLE_TTL_MS = 30 * 60_000;
export const SQ_MULTI_FINISHED_TTL_MS = 5 * 60_000;

export interface SqMultiPlayer {
  key: string;
  name: string;
  socketId: string | null;
  connected: boolean;
  host: boolean;
  ready: boolean;
  score: number;
  correct: number;
  /** 已经作答的题号（-1 = 本题还没答）。 */
  answeredIndex: number;
  disconnectedAt: number | null;
}

export interface SqMultiAnswer {
  pick: number;
  correct: boolean;
  ms: number;
  at: number;
}

export interface SqMultiResultRow {
  key: string;
  name: string;
  /** null = 本题没作答。 */
  pick: number | null;
  correct: boolean;
  ms: number | null;
  delta: number;
  score: number;
}

export interface SqMultiRoundResult {
  index: number;
  rows: SqMultiResultRow[];
}

export interface SqMultiRoom {
  id: string;
  mode: SqMultiMode;
  group: string;
  difficulty: SqMultiDifficulty;
  rounds: number;
  /** 随机匹配的房间可以被别人匹配进来。 */
  open: boolean;
  status: 'waiting' | 'playing' | 'finished';
  hostKey: string;
  /** 对局开始后才有：客户端据此本地生成同一套题。 */
  seed: number | null;
  /** 当前题号（0 开始）；未开局为 -1。 */
  questionIndex: number;
  questionStartedAt: number | null;
  questionEndsAt: number | null;
  answers: Map<string, SqMultiAnswer>;
  results: SqMultiRoundResult[];
  players: SqMultiPlayer[];
  createdAt: number;
  updatedAt: number;
}

export interface SqMultiPlayerView {
  key: string;
  name: string;
  host: boolean;
  ready: boolean;
  score: number;
  correct: number;
  connected: boolean;
  /** 本题是否已经作答（不泄露选了什么）。 */
  answered: boolean;
  me: boolean;
}

export interface SqMultiRoomView {
  id: string;
  mode: SqMultiMode;
  group: string;
  difficulty: SqMultiDifficulty;
  rounds: number;
  status: SqMultiRoom['status'];
  seed: number | null;
  questionIndex: number;
  questionEndsAt: number | null;
  players: SqMultiPlayerView[];
  results: SqMultiRoundResult[];
  /** 房间里的题量与试听秒数由客户端按这些参数算出来。 */
  questionCount: number;
  serverTime: number;
}

export function makePlayer(
  identity: { key: string; name: string },
  socketId: string,
  host: boolean,
): SqMultiPlayer {
  return {
    key: identity.key,
    name: identity.name,
    socketId,
    connected: true,
    host,
    ready: false,
    score: 0,
    correct: 0,
    answeredIndex: -1,
    disconnectedAt: null,
  };
}

export function createRoom(input: {
  id: string;
  host: { key: string; name: string };
  socketId: string;
  mode: SqMultiMode;
  group: string;
  difficulty: SqMultiDifficulty;
  rounds: number;
  open: boolean;
  now: number;
}): SqMultiRoom {
  return {
    id: input.id,
    mode: input.mode,
    group: input.group,
    difficulty: input.difficulty,
    rounds: input.rounds,
    open: input.open,
    status: 'waiting',
    hostKey: input.host.key,
    seed: null,
    questionIndex: -1,
    questionStartedAt: null,
    questionEndsAt: null,
    answers: new Map(),
    results: [],
    players: [makePlayer(input.host, input.socketId, true)],
    createdAt: input.now,
    updatedAt: input.now,
  };
}

export function playerOf(room: SqMultiRoom, key: string): SqMultiPlayer | undefined {
  return room.players.find((player) => player.key === key);
}

export function connectedPlayers(room: SqMultiRoom): SqMultiPlayer[] {
  return room.players.filter((player) => player.connected);
}

/** 本题允许听的秒数：竞速给完整试听，渐进揭示按题号递增。 */
export function previewSecondsOf(room: SqMultiRoom, index: number): number {
  if (room.mode === 'rush') return SQ_MULTI_FULL_PREVIEW_SECONDS;
  const grown = SQ_MULTI_PREVIEW_BASE_SECONDS + SQ_MULTI_PREVIEW_STEP_SECONDS * index;
  return Math.min(SQ_MULTI_PREVIEW_MAX_SECONDS, grown);
}

/** 一局总共几题。 */
export function questionCountOf(room: SqMultiRoom): number {
  return room.rounds;
}

export interface JoinOutcome {
  error?: 'ROOM_NOT_FOUND' | 'ROOM_FULL' | 'ROOM_IN_PROGRESS' | 'STALE_CONNECTION';
  rejoined?: boolean;
}

export function joinRoom(
  room: SqMultiRoom,
  identity: { key: string; name: string },
  socketId: string,
  now: number,
): JoinOutcome {
  const existing = playerOf(room, identity.key);
  if (existing) {
    // 重连：把 socket 换到新连接上（旧连接可能已经断了）
    if (existing.connected && existing.socketId && existing.socketId !== socketId) {
      return { error: 'STALE_CONNECTION' };
    }
    existing.socketId = socketId;
    existing.connected = true;
    existing.disconnectedAt = null;
    existing.name = identity.name;
    room.updatedAt = now;
    return { rejoined: true };
  }
  if (room.players.length >= SQ_MULTI_MAX_PLAYERS) return { error: 'ROOM_FULL' };
  if (room.status !== 'waiting') return { error: 'ROOM_IN_PROGRESS' };
  room.players.push(makePlayer(identity, socketId, false));
  room.updatedAt = now;
  return {};
}

export function markDisconnected(room: SqMultiRoom, key: string, now: number): void {
  const player = playerOf(room, key);
  if (!player) return;
  player.connected = false;
  player.socketId = null;
  player.ready = false;
  player.disconnectedAt = now;
  room.updatedAt = now;
}

export function leaveRoom(room: SqMultiRoom, key: string, now: number): void {
  room.players = room.players.filter((player) => player.key !== key);
  room.answers.delete(key);
  room.updatedAt = now;
  if (!room.players.length) return;
  // 房主走了就把房主交给还在的人
  if (room.hostKey === key) {
    const next = connectedPlayers(room)[0] ?? room.players[0];
    room.hostKey = next.key;
    for (const player of room.players) player.host = player.key === next.key;
  }
}

export function setReady(room: SqMultiRoom, key: string, ready: boolean, now: number): boolean {
  const player = playerOf(room, key);
  if (!player || room.status !== 'waiting') return false;
  player.ready = ready;
  room.updatedAt = now;
  return true;
}

/** 开局前 / 再来一局前的重置：回到等待状态、清空分数。 */
export function resetRoom(room: SqMultiRoom, now: number): void {
  room.status = 'waiting';
  room.seed = null;
  room.questionIndex = -1;
  room.questionStartedAt = null;
  room.questionEndsAt = null;
  room.answers.clear();
  room.results = [];
  room.updatedAt = now;
  for (const player of room.players) {
    player.score = 0;
    player.correct = 0;
    player.answeredIndex = -1;
    player.ready = false;
  }
}

/** 能不能开局：至少两人、都在线、都准备了（房主不用准备）。 */
export function canStart(room: SqMultiRoom): boolean {
  if (room.status !== 'waiting') return false;
  const players = connectedPlayers(room);
  if (players.length < SQ_MULTI_MIN_PLAYERS) return false;
  return players.every((player) => player.host || player.ready);
}

export function startGame(room: SqMultiRoom, seed: number, now: number): void {
  room.status = 'playing';
  room.seed = seed;
  room.questionIndex = -1;
  room.questionStartedAt = null;
  room.questionEndsAt = null;
  room.answers.clear();
  room.results = [];
  room.updatedAt = now;
  for (const player of room.players) {
    player.score = 0;
    player.correct = 0;
    player.answeredIndex = -1;
    player.ready = false;
  }
}

/** 开始第 `index` 题。 */
export function beginQuestion(room: SqMultiRoom, index: number, now: number): void {
  room.questionIndex = index;
  room.questionStartedAt = now;
  room.questionEndsAt = now + SQ_MULTI_QUESTION_MS;
  room.answers.clear();
  for (const player of room.players) player.answeredIndex = -1;
  room.updatedAt = now;
}

export interface AnswerInput {
  index: number;
  pick: number;
  correct: boolean;
  ms: number;
}

export interface AnswerOutcome {
  error?: 'NOT_PLAYING' | 'WRONG_QUESTION' | 'ALREADY_ANSWERED' | 'INVALID_ANSWER' | 'ALREADY_REVEALED';
  accepted?: boolean;
  /** 该题所有人都答完了（可以提前揭晓）。 */
  allAnswered?: boolean;
}

export function submitAnswer(
  room: SqMultiRoom,
  key: string,
  input: AnswerInput,
  now: number,
): AnswerOutcome {
  if (room.status !== 'playing') return { error: 'NOT_PLAYING' };
  // 揭晓后（questionEndsAt 归 null）到下一题开始之间不再收答案，
  // 否则同一题会被重复结算、分数能刷两遍。
  if (room.questionEndsAt === null) return { error: 'ALREADY_REVEALED' };
  const player = playerOf(room, key);
  if (!player) return { error: 'NOT_PLAYING' };
  if (input.index !== room.questionIndex) return { error: 'WRONG_QUESTION' };
  if (room.answers.has(key)) return { error: 'ALREADY_ANSWERED' };
  if (!Number.isInteger(input.pick) || input.pick < 0 || input.pick > 3) return { error: 'INVALID_ANSWER' };
  const ms = Math.max(0, Math.min(SQ_MULTI_QUESTION_MS + 2_000, Math.round(input.ms)));
  room.answers.set(key, { pick: input.pick, correct: Boolean(input.correct), ms, at: now });
  player.answeredIndex = room.questionIndex;
  room.updatedAt = now;
  const pending = connectedPlayers(room).some((item) => item.answeredIndex !== room.questionIndex);
  return { accepted: true, allAnswered: !pending };
}

/**
 * 结算当前题：按「答对 + 用时」排名，第 1/2/3 个答对额外加分。
 * 返回这一题的结果（客户端自己知道正确答案，这里只回每个人选了什么、拿了多少分）。
 */
export function revealQuestion(room: SqMultiRoom, now: number): SqMultiRoundResult {
  const index = room.questionIndex;
  const order = [...room.answers.entries()]
    .filter(([, answer]) => answer.correct)
    .sort((a, b) => a[1].ms - b[1].ms)
    .map(([key]) => key);
  const rankBonus = new Map<string, number>();
  order.forEach((key, position) => {
    const bonus = SQ_MULTI_RANK_BONUS[position] ?? 0;
    if (bonus) rankBonus.set(key, bonus);
  });

  const rows: SqMultiResultRow[] = room.players.map((player) => {
    const answer = room.answers.get(player.key);
    let delta = 0;
    if (answer?.correct) {
      const remaining = Math.max(0, Math.min(1, (SQ_MULTI_QUESTION_MS - answer.ms) / SQ_MULTI_QUESTION_MS));
      delta = SQ_MULTI_BASE_POINTS + Math.round(SQ_MULTI_SPEED_BONUS * remaining) + (rankBonus.get(player.key) ?? 0);
      player.score += delta;
      player.correct += 1;
    }
    return {
      key: player.key,
      name: player.name,
      pick: answer ? answer.pick : null,
      correct: Boolean(answer?.correct),
      ms: answer ? answer.ms : null,
      delta,
      score: player.score,
    };
  });

  const result: SqMultiRoundResult = { index, rows };
  room.results.push(result);
  room.questionEndsAt = null;
  room.answers.clear();
  room.updatedAt = now;
  return result;
}

/** 还有下一题吗？没有就结束整局。 */
export function advance(room: SqMultiRoom, now: number): { finished: boolean } {
  if (room.questionIndex + 1 >= questionCountOf(room)) {
    room.status = 'finished';
    room.questionEndsAt = null;
    room.updatedAt = now;
    return { finished: true };
  }
  beginQuestion(room, room.questionIndex + 1, now);
  return { finished: false };
}

/** 名次（同分并列，按名字稳定排序）。 */
export function standings(room: SqMultiRoom): SqMultiPlayer[] {
  return [...room.players].sort(
    (a, b) => b.score - a.score || b.correct - a.correct || a.name.localeCompare(b.name),
  );
}

export function publicRoom(room: SqMultiRoom, meKey: string, now: number): SqMultiRoomView {
  return {
    id: room.id,
    mode: room.mode,
    group: room.group,
    difficulty: room.difficulty,
    rounds: room.rounds,
    status: room.status,
    seed: room.seed,
    questionIndex: room.questionIndex,
    questionEndsAt: room.questionEndsAt,
    results: room.results,
    players: room.players.map((player) => ({
      key: player.key,
      name: player.name,
      host: player.host,
      ready: player.ready,
      score: player.score,
      correct: player.correct,
      connected: player.connected,
      answered: player.answeredIndex === room.questionIndex && room.questionIndex >= 0,
      me: player.key === meKey,
    })),
    questionCount: questionCountOf(room),
    serverTime: now,
  };
}

/** 该回收了吗（没人的房间 / 长时间没动的房间）。 */
export function isExpired(room: SqMultiRoom, now: number): boolean {
  if (connectedPlayers(room).length === 0) {
    const lastSeen = Math.max(room.updatedAt, ...room.players.map((player) => player.disconnectedAt ?? 0));
    return now - lastSeen > SQ_MULTI_EMPTY_TTL_MS;
  }
  if (room.status === 'finished') return now - room.updatedAt > SQ_MULTI_FINISHED_TTL_MS;
  return now - room.updatedAt > SQ_MULTI_IDLE_TTL_MS;
}
