/**
 * 「我喜欢你」——一共 9 轮，每轮出两位，选你更心动的那位。
 *
 * 9 个心动席位，每轮从「还没出场」的人里随机抽两位：选中的坐进席位，另一位出局。
 * 9 轮正好凑齐 9 位 —— 只有被抽中的人会出场（随机抽签，不是全员海选），
 * 所以 9 次点击就出结果，不用刷上百轮。
 *
 * 候选范围见 config/fandom.ts，改范围只改那一个文件。
 *
 * 纯逻辑：随机只走注入的 `random()`，同一个 seed 结果可复现。
 */

import {
  SEIYUU_BY_ID,
  seiyuuPhotoPath,
  type SeiyuuIdentity,
} from '@seiyuu/shared';
import { FANDOM_IDS } from '@seiyuu/game-sdk';

/** 心动席位数（= 轮数），3×3。 */
export const LIKE_YOU_TARGET = 9;

/** 参赛名单：主推企划全集（范围定义见 config/fandom.ts）。 */
export const LIKE_YOU_IDS: string[] = FANDOM_IDS;

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(items: T[], random: () => number): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [result[index], result[swap]] = [result[swap], result[index]];
  }
  return result;
}

export function randomSeed(): number {
  return Math.floor(Math.random() * 90000) + 10000;
}

/** 开局把参赛名单打乱，得到「还没出场」的队列。 */
export function createDeck(seed: number = randomSeed(), ids: string[] = LIKE_YOU_IDS): string[] {
  return shuffle(ids, mulberry32(seed));
}

/** 把一份 id 名单打乱。 */
export function shuffleIds(ids: string[]): string[] {
  return shuffle(ids, Math.random);
}

export interface DuelRound {
  /** 两位选手，左右顺序已打乱。 */
  pair: [string, string];
}

/**
 * 出下一轮；9 轮走完或没人可抽了就返回 null。
 *
 * `roster` = 还没出场的人，`board` = 已经坐进心动席位的人。
 */
export function nextRound(
  roster: string[],
  board: string[],
  random: () => number = Math.random,
): DuelRound | null {
  if (board.length >= LIKE_YOU_TARGET) return null;
  if (roster.length < 2) return null;
  const [left, right] = shuffle(roster, random);
  return { pair: [left, right] };
}

export interface DuelOutcome {
  /** 新的心动席位。 */
  board: string[];
  /** 这一轮出局的人。 */
  eliminated: string;
  /** 坐进席位的那位（提示文案用）。 */
  winner: string;
}

/** 结算一轮：`pickedId` 是玩家点的那位，另一位出局。 */
export function resolveRound(round: DuelRound, board: string[], pickedId: string): DuelOutcome {
  const other = round.pair[0] === pickedId ? round.pair[1] : round.pair[0];
  return { board: [...board, pickedId], eliminated: other, winner: pickedId };
}

/** 拿档案（页面渲染用；名册里查不到时返回 undefined）。 */
export function identityOf(id: string): SeiyuuIdentity | undefined {
  return SEIYUU_BY_ID.get(id);
}

/** 公式照路径。 */
export function photoOf(id: string): string {
  return seiyuuPhotoPath(id);
}

/** 分享图默认文件名前缀。 */
export const LIKE_YOU_POSTER_PREFIX = 'seiyuu-like-you';
