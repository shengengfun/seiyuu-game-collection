/**
 * 「声优粉宾果」——5×5 的自我检定点卡。
 *
 * 25 格里 24 格从行为池随机抽（中心固定为免费格「我推天下第一」），
 * 玩家勾选自己符合的格子，按完成的行 / 列 / 对角线数量给称号。
 * 结果卡本身就是一张可分享的竖版名片。
 *
 * 池子比格子多，所以每次抽到的卡都不一样；同一个 seed 可复现。
 */

/** 棋盘边长。 */
export const BINGO_SIZE = 5;
/** 格子总数。 */
export const BINGO_CELLS = BINGO_SIZE * BINGO_SIZE;
/** 中心格下标（免费格）。 */
export const BINGO_FREE_INDEX = 12;

/**
 * 行为池。id 就是 i18n 键后缀（`seiyuuBingo.behaviors.<id>`），
 * 改文案不要改 id，id 同时是分享图与测试的锚点。
 */
export const BINGO_BEHAVIORS: string[] = [
  'lockScreen',
  'avatar',
  'album',
  'watchAnime',
  'liveArchive',
  'birthdayReminder',
  'gachaForHer',
  'danmakuWife',
  'phoneCase',
  'ingameId',
  'watchStream',
  'stickerPack',
  'commuteSong',
  'catchphrase',
  'photoBook',
  'offlineEvent',
  'longReview',
  'recognizeVoice',
  'waitForNews',
  'startedGame',
  'recommendFriend',
  'radioShow',
  'ringtone',
  'goods',
  'capsuleDupes',
  'castPhoto',
  'debutYear',
  'followOfficial',
  'allRoles',
  'birthdayPost',
  'fanLetter',
  'birthdayAd',
  'playHerRole',
  'heartbeat',
  'playlist',
  'collabCafe',
  'heightBlood',
  'autograph',
  'listenToSleep',
  'creditsScan',
];

/** 中心免费格的 i18n 键后缀。 */
export const BINGO_FREE_KEY = 'free';

export interface BingoCell {
  /** i18n 键后缀；中心格固定为 `free`。 */
  key: string;
  /** 是否免费格（自动视为已勾选）。 */
  free: boolean;
}

export type BingoCard = BingoCell[];

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

/** 抽一张卡：24 条随机行为 + 中心免费格。 */
export function createCard(
  seed: number = randomSeed(),
  pool: string[] = BINGO_BEHAVIORS,
): BingoCard {
  const random = mulberry32(seed);
  const picked = shuffle(pool, random).slice(0, BINGO_CELLS - 1);
  return Array.from({ length: BINGO_CELLS }, (_, index) => {
    if (index === BINGO_FREE_INDEX) return { key: BINGO_FREE_KEY, free: true };
    const key = picked[index > BINGO_FREE_INDEX ? index - 1 : index];
    return { key, free: false };
  });
}

/** 12 条线：5 行 + 5 列 + 2 条对角线。 */
export const BINGO_LINES: number[][] = (() => {
  const lines: number[][] = [];
  for (let row = 0; row < BINGO_SIZE; row += 1) {
    lines.push(Array.from({ length: BINGO_SIZE }, (_, col) => row * BINGO_SIZE + col));
  }
  for (let col = 0; col < BINGO_SIZE; col += 1) {
    lines.push(Array.from({ length: BINGO_SIZE }, (_, row) => row * BINGO_SIZE + col));
  }
  lines.push(Array.from({ length: BINGO_SIZE }, (_, index) => index * BINGO_SIZE + index));
  lines.push(
    Array.from({ length: BINGO_SIZE }, (_, index) => index * BINGO_SIZE + (BINGO_SIZE - 1 - index)),
  );
  return lines;
})();

/** 已完成（连成一线）的线，返回线的下标集合。 */
export function completedLineIndices(checked: boolean[]): number[] {
  return BINGO_LINES.reduce<number[]>((acc, line, index) => {
    if (line.every((cell) => checked[cell])) acc.push(index);
    return acc;
  }, []);
}

/** 连了几条线。 */
export function countLines(checked: boolean[]): number {
  return completedLineIndices(checked).length;
}

/** 属于任何一条已完成线的格子（海报上给它们加粗描边）。 */
export function completedCells(checked: boolean[]): Set<number> {
  const cells = new Set<number>();
  for (const index of completedLineIndices(checked)) {
    for (const cell of BINGO_LINES[index]) cells.add(cell);
  }
  return cells;
}

export interface BingoRank {
  id: string;
  /** 该称号要求的最少连线数。 */
  minLines: number;
}

/**
 * 称号阶梯：按连线数从高到低排，取第一个满足的。
 * 5×5 满打满算是 12 条线。
 */
export const BINGO_RANKS: BingoRank[] = [
  { id: 'complete', minLines: 10 },
  { id: 'legend', minLines: 8 },
  { id: 'heavy', minLines: 6 },
  { id: 'regular', minLines: 4 },
  { id: 'beginner', minLines: 2 },
  { id: 'passerby', minLines: 0 },
];

/** 按连线数取称号。 */
export function rankOf(lines: number): BingoRank {
  return BINGO_RANKS.find((rank) => lines >= rank.minLines) ?? BINGO_RANKS[BINGO_RANKS.length - 1];
}

/** 分享图默认文件名前缀。 */
export const BINGO_POSTER_PREFIX = 'seiyuu-bingo';
