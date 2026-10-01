import type { SongDifficulty, SongGroupId } from './songQuiz/index';

/**
 * 猜歌多人对战：客户端这一侧用到的协议常量与类型。
 *
 * 服务端的同名常量在 `server/src/services/songQuizRoomStore.ts`，
 * 两边改动要一起改（数值只影响体验，不一致不会造成状态错乱）。
 */

export const SQ_MULTI_MODES = ['rush', 'reveal'] as const;
export type SqMultiMode = (typeof SQ_MULTI_MODES)[number];

export const SQ_MULTI_ROUND_OPTIONS = [3, 5, 10] as const;
export const SQ_MULTI_MIN_PLAYERS = 2;
export const SQ_MULTI_MAX_PLAYERS = 8;

/** 每题作答时间（毫秒）。 */
export const SQ_MULTI_QUESTION_MS = 25_000;
/** 揭晓后停留多久再进下一题。 */
export const SQ_MULTI_REVEAL_MS = 4_000;
/** 渐进揭示：起始秒数与每题增量、上限。 */
export const SQ_MULTI_PREVIEW_BASE_SECONDS = 5;
export const SQ_MULTI_PREVIEW_STEP_SECONDS = 3;
export const SQ_MULTI_PREVIEW_MAX_SECONDS = 20;
/** 同题竞速：完整 30 秒试听。 */
export const SQ_MULTI_FULL_PREVIEW_SECONDS = 30;

export const SQ_MULTI_ROOM_ID_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const SQ_MULTI_ROOM_ID_LENGTH = 5;
export const SQ_MULTI_ROOM_ID_PATTERN = new RegExp(
  `^[${SQ_MULTI_ROOM_ID_CHARS}]{${SQ_MULTI_ROOM_ID_LENGTH}}$`,
);

export interface SqMultiPlayerView {
  key: string;
  name: string;
  host: boolean;
  ready: boolean;
  score: number;
  correct: number;
  connected: boolean;
  answered: boolean;
  me: boolean;
}

export interface SqMultiResultRow {
  key: string;
  name: string;
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

export interface SqMultiRoomView {
  id: string;
  mode: SqMultiMode;
  group: string;
  difficulty: SongDifficulty;
  rounds: number;
  status: 'waiting' | 'playing' | 'finished';
  seed: number | null;
  questionIndex: number;
  questionEndsAt: number | null;
  players: SqMultiPlayerView[];
  results: SqMultiRoundResult[];
  questionCount: number;
  /** 服务端时间，用来矫正本地时钟差。 */
  serverTime: number;
}

/** 本题允许听的秒数（与服务端的 `previewSecondsOf` 一致）。 */
export function previewSecondsFor(mode: SqMultiMode, index: number): number {
  if (mode === 'rush') return SQ_MULTI_FULL_PREVIEW_SECONDS;
  return Math.min(
    SQ_MULTI_PREVIEW_MAX_SECONDS,
    SQ_MULTI_PREVIEW_BASE_SECONDS + SQ_MULTI_PREVIEW_STEP_SECONDS * index,
  );
}

/** 本地时钟相对服务端的偏移（毫秒）：`serverNow + offset = localStorageNow`。 */
export function clockOffset(serverTime: number): number {
  return serverTime - Date.now();
}

/** 名次排序：分数 > 答对数 > 名字。 */
export function sortPlayers(players: SqMultiPlayerView[]): SqMultiPlayerView[] {
  return [...players].sort(
    (a, b) => b.score - a.score || b.correct - a.correct || a.name.localeCompare(b.name),
  );
}

export function modeGroupKey(input: {
  mode: SqMultiMode;
  group: SongGroupId | string;
  difficulty: SongDifficulty | string;
}): string {
  return `${input.mode}|${input.group}|${input.difficulty}`;
}
