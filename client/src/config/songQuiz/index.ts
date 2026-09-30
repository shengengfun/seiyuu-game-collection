import { SONG_GROUP_IDS, type SongGroupId } from './groups';
import type { SongDifficulty, SongQuizQuestion, SongQuizRound, SongQuizSong } from './types';

export * from './types';
export * from './groups';

/* ------------------------------------------------------------------ 曲库注册 */

type SongModule = { default: SongQuizSong[] };

const modules = import.meta.glob<SongModule>('./songs/*.ts', { eager: true });

const SONGS_BY_GROUP = new Map<SongGroupId, SongQuizSong[]>();
for (const [path, module] of Object.entries(modules)) {
  const groupId = path.replace(/^\.\/songs\//, '').replace(/\.ts$/, '');
  if (!(SONG_GROUP_IDS as readonly string[]).includes(groupId)) {
    throw new Error(`曲库文件名必须是分组 id：${path}`);
  }
  const songs = module?.default;
  if (!Array.isArray(songs) || songs.length === 0) {
    throw new Error(`曲库文件格式不合法：${path}（需要 default 导出 SongQuizSong[]）`);
  }
  const seen = new Set<number>();
  for (const song of songs) {
    if (!Number.isInteger(song?.id) || !song.title?.trim()) {
      throw new Error(`曲目数据不完整：${path} → ${JSON.stringify(song)}`);
    }
    if (seen.has(song.id)) throw new Error(`曲库内 trackId 重复：${path} → ${song.id}`);
    seen.add(song.id);
  }
  SONGS_BY_GROUP.set(groupId as SongGroupId, songs);
}

/** 某个分组的曲库（按发行日期升序）。 */
export function songsOfGroup(groupId: SongGroupId): SongQuizSong[] {
  return SONGS_BY_GROUP.get(groupId) ?? [];
}

/** 每个分组的曲数。 */
export const SONG_COUNTS: Record<string, number> = SONG_GROUP_IDS.reduce(
  (accumulator, groupId) => {
    accumulator[groupId] = songsOfGroup(groupId).length;
    return accumulator;
  },
  {} as Record<string, number>,
);

/* -------------------------------------------------------------------- 难度 */

export interface SongDifficultyConfig {
  /** 每局抽几首；null = 全题库（抽完为止）。 */
  count: number | null;
  /** 允许答错几次（红心）；null = 不限。 */
  hearts: number | null;
  /** 成绩码里的难度字母。 */
  letter: 'E' | 'N' | 'H' | 'X';
  /** 计分权重（越难越高）。 */
  weight: number;
  label: string;
}

/** 每题听多少秒（用来算速度分）。 */
export const QUESTION_LIMIT_MS = 30_000;
/** 答对的基础分与速度奖励上限。 */
export const BASE_POINTS = 100;
export const SPEED_BONUS_MAX = 60;
/** 全程零失误的额外奖励。 */
export const PERFECT_BONUS = 250;

export const SONG_DIFFICULTIES: Record<SongDifficulty, SongDifficultyConfig> = {
  easy: { count: 5, hearts: null, letter: 'E', weight: 1, label: 'easy' },
  normal: { count: 10, hearts: null, letter: 'N', weight: 1.25, label: 'normal' },
  hard: { count: 20, hearts: null, letter: 'H', weight: 1.5, label: 'hard' },
  expert: { count: null, hearts: 3, letter: 'X', weight: 2, label: 'expert' },
};

/** 界面顺序 = 难度从低到高。 */
export const SONG_DIFFICULTY_ORDER: SongDifficulty[] = ['easy', 'normal', 'hard', 'expert'];

/** 每题几个选项。 */
export const OPTION_COUNT = 4;

/** 选项字母，界面与解析都用它。 */
export const OPTION_LETTERS = ['A', 'B', 'C', 'D'] as const;

/* -------------------------------------------------------------- 抽题与计分 */

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
  return Math.floor(Math.random() * 900000) + 100000;
}

/**
 * 抽出一局。同一 (group, difficulty, seed) 必然得到完全一样的一局，
 * 因此成绩码只需记分组 + 难度 + seed + 答案即可还原。
 *
 * `explicitCount` 给多人对战用：那边由房主选题量（3/5/10），与难度自带题量无关。
 */
export function createRound(
  group: SongGroupId,
  seed: number = randomSeed(),
  difficulty: SongDifficulty = 'normal',
  explicitCount?: number,
): SongQuizRound {
  const pool = songsOfGroup(group);
  const random = mulberry32(seed);
  const config = SONG_DIFFICULTIES[difficulty];
  const wanted = explicitCount ?? config.count;
  const count = wanted === null ? pool.length : Math.min(Math.max(1, wanted), pool.length);
  const picked = shuffle(pool, random).slice(0, count);

  const questions: SongQuizQuestion[] = picked.map((song, index) => {
    const distractors = shuffle(
      pool.filter((item) => item.title !== song.title),
      random,
    ).slice(0, OPTION_COUNT - 1);
    const correctSlot = index % OPTION_COUNT;
    const options = distractors.map((item) => item.title);
    options.splice(correctSlot, 0, song.title);
    return { song, options, answer: correctSlot };
  });

  const trackIds = [...new Set(questions.map((question) => question.song.id))];
  return { group, difficulty, seed, questions, trackIds };
}

/** 每一题的作答记录：选了哪个 + 用了多久（毫秒）。 */
export interface SongAnswer {
  picked?: number;
  elapsedMs?: number;
}

export type SongAnswerMap = Record<number, SongAnswer | undefined>;

export interface SongQuizStats {
  /** 实际出过的题数：专家模式红心用光会提前结束，所以不等于抽题数。 */
  total: number;
  answered: number;
  correct: number;
  wrong: number;
  skipped: number;
  /** 正确率 0 ~ 1（未作答计为错）。 */
  accuracy: number;
  score: number;
  /** 该难度的红心数（null = 不限）。 */
  hearts: number | null;
  heartsLeft: number | null;
  duration: number;
  /** 最快 / 平均每题用时（毫秒），没有作答记录时为 null。 */
  fastestMs: number | null;
  avgMs: number | null;
}

/** 走一局题目，遇到红心耗尽就停下（专家模式）。 */
function walkRound(
  round: SongQuizRound,
  answers: SongAnswerMap,
): { hit: { question: SongQuizQuestion; answer: SongAnswer | undefined }[] } {
  const hearts = SONG_DIFFICULTIES[round.difficulty].hearts;
  const hit: { question: SongQuizQuestion; answer: SongAnswer | undefined }[] = [];
  let wrong = 0;
  for (const question of round.questions) {
    const answer = answers[question.song.id];
    hit.push({ question, answer });
    if (answer?.picked !== undefined && answer.picked !== question.answer) wrong += 1;
    if (hearts !== null && wrong >= hearts) break;
  }
  // 专家局没有固定题量：红心还没用完就交卷时，后面没做过的题不该算进本局成绩。
  if (hearts !== null) {
    while (hit.length > 0 && hit[hit.length - 1].answer?.picked === undefined) hit.pop();
  }
  return { hit };
}

/** 单题得分：答对拿基础分 + 速度分，再乘难度权重。 */
export function questionPoints(
  correct: boolean,
  elapsedMs: number | undefined,
  difficulty: SongDifficulty,
): number {
  if (!correct) return 0;
  const weight = SONG_DIFFICULTIES[difficulty].weight;
  const elapsed = elapsedMs === undefined ? QUESTION_LIMIT_MS : Math.max(0, elapsedMs);
  const remaining = Math.max(0, Math.min(1, (QUESTION_LIMIT_MS - elapsed) / QUESTION_LIMIT_MS));
  return (BASE_POINTS + Math.round(SPEED_BONUS_MAX * remaining)) * weight;
}

export function scoreRound(
  round: SongQuizRound,
  answers: SongAnswerMap,
  duration = 0,
): SongQuizStats {
  const { hit } = walkRound(round, answers);
  const config = SONG_DIFFICULTIES[round.difficulty];
  const total = hit.length;
  let correct = 0;
  let answered = 0;
  let score = 0;
  let fastest: number | null = null;
  let elapsedSum = 0;
  let elapsedCount = 0;

  for (const { question, answer } of hit) {
    const picked = answer?.picked;
    const isCorrect = picked === question.answer;
    if (picked !== undefined) {
      answered += 1;
      const elapsed = answer?.elapsedMs;
      if (elapsed !== undefined) {
        elapsedSum += elapsed;
        elapsedCount += 1;
        if (fastest === null || elapsed < fastest) fastest = elapsed;
      }
    }
    if (isCorrect) correct += 1;
    score += questionPoints(isCorrect, answer?.elapsedMs, round.difficulty);
  }

  const wrong = answered - correct;
  if (total > 0 && correct === total) score += PERFECT_BONUS * config.weight;

  return {
    total,
    answered,
    correct,
    wrong,
    skipped: total - answered,
    accuracy: total === 0 ? 0 : correct / total,
    score: Math.round(score),
    hearts: config.hearts,
    heartsLeft: config.hearts === null ? null : Math.max(0, config.hearts - wrong),
    duration,
    fastestMs: fastest,
    avgMs: elapsedCount === 0 ? null : Math.round(elapsedSum / elapsedCount),
  };
}

export const SONG_GRADES = ['S', 'A', 'B', 'C', 'D'] as const;
export type SongGrade = (typeof SONG_GRADES)[number];

/** 等级门槛（正确率下限），与 i18n `songQuiz.grades.*` 一一对应。 */
export const SONG_GRADE_THRESHOLDS: { grade: SongGrade; min: number }[] = [
  { grade: 'S', min: 0.95 },
  { grade: 'A', min: 0.8 },
  { grade: 'B', min: 0.65 },
  { grade: 'C', min: 0.45 },
  { grade: 'D', min: 0 },
];

export function gradeOf(accuracy: number): SongGrade {
  return SONG_GRADE_THRESHOLDS.find((item) => accuracy >= item.min)?.grade ?? 'D';
}

export interface SongQuizResult {
  round: SongQuizRound;
  stats: SongQuizStats;
  grade: SongGrade;
  /** 答错的题目（含未作答），结算页按题目顺序展示答案。 */
  missed: { question: SongQuizQuestion; picked: number | undefined }[];
}

export function resultOf(
  round: SongQuizRound,
  answers: SongAnswerMap,
  duration = 0,
): SongQuizResult {
  const stats = scoreRound(round, answers, duration);
  const { hit } = walkRound(round, answers);
  return {
    round,
    stats,
    grade: gradeOf(stats.accuracy),
    missed: hit
      .filter(({ question, answer }) => answer?.picked !== question.answer)
      .map(({ question, answer }) => ({ question, picked: answer?.picked })),
  };
}

/* ---------------------------------------------------------------- 成绩码 */

/** 成绩码里「未作答」的答案数字（选项下标最多 3）。 */
const SKIPPED_DIGIT = OPTION_COUNT;
const ANSWER_BASE = BigInt(SKIPPED_DIGIT + 1);
/** 答案串最高位的哨兵位，用来保留被前导零吃掉的位数（见 `resultCodeOf`）。 */
const SENTINEL_DIGIT = BigInt(1);

/** 形如 `S|N|nijigasaki|1ab|2m|3x9k1`（游戏 | 难度 | 分组 | 种子 | 用时秒 | 答案）。 */
export function resultCodeOf(
  round: SongQuizRound,
  answers: SongAnswerMap,
  duration: number,
): string {
  const digits = round.questions.map((question) => {
    const picked = answers[question.song.id]?.picked;
    return picked === undefined ? SKIPPED_DIGIT : Math.max(0, Math.min(SKIPPED_DIGIT, picked));
  });
  // 末尾的「未作答」可以省掉（同一 seed 能还原出同样的题量），免得长局成绩码过长。
  let last = digits.length;
  while (last > 0 && digits[last - 1] === SKIPPED_DIGIT) last -= 1;
  // 最高位放一个哨兵位（1）：否则「一开头选了好几个 A」会因为前导零把位数吃掉，
  // 解码时就分不清「第 1 题选了 A」和「第 1 题没作答」。
  let packed = SENTINEL_DIGIT;
  for (let index = 0; index < last; index += 1) {
    packed = packed * ANSWER_BASE + BigInt(digits[index]);
  }
  return [
    'S',
    SONG_DIFFICULTIES[round.difficulty].letter,
    round.group,
    Math.max(0, round.seed).toString(36),
    Math.max(0, Math.round(duration / 1000)).toString(36),
    packed.toString(36),
  ].join('|');
}

export interface SongQuizCodePayload {
  difficulty: SongDifficulty;
  group: SongGroupId;
  seed: number;
  duration: number;
  /** 每题选中的下标，未作答为 `undefined`。 */
  answers: (number | undefined)[];
}

const DIFFICULTY_BY_LETTER = new Map<string, SongDifficulty>(
  Object.entries(SONG_DIFFICULTIES).map(([id, config]) => [config.letter, id as SongDifficulty]),
);

export function decodeSongQuizCode(code: string): SongQuizCodePayload | null {
  const match = /^S\|([ENHX])\|([a-z]+)\|([0-9a-z]+)\|([0-9a-z]+)\|([0-9a-z]*)$/i.exec(code.trim());
  if (!match) return null;
  const [, letter, group, seedText, secondsText, packedText] = match;
  const difficulty = DIFFICULTY_BY_LETTER.get(letter.toUpperCase());
  if (!difficulty || !(SONG_GROUP_IDS as readonly string[]).includes(group)) return null;
  const seed = parseInt(seedText, 36);
  const seconds = parseInt(secondsText, 36);
  if (!Number.isFinite(seed) || !Number.isFinite(seconds)) return null;

  let value = BigInt(0);
  const base36 = BigInt(36);
  for (const char of packedText.toLowerCase()) {
    const digit = parseInt(char, 36);
    if (!Number.isFinite(digit)) return null;
    value = value * base36 + BigInt(digit);
  }

  const round = createRound(group as SongGroupId, seed, difficulty);
  const digits: number[] = [];
  while (value > 0n) {
    digits.unshift(Number(value % ANSWER_BASE));
    value /= ANSWER_BASE;
  }
  // 最高位是哨兵位，去掉后剩下的就是「从第 1 题开始」的答案（被裁掉的只有末尾未作答）。
  if (digits.shift() !== Number(SENTINEL_DIGIT)) return null;
  if (digits.length > round.questions.length) return null;
  const answers: (number | undefined)[] = new Array(round.questions.length).fill(undefined);
  digits.forEach((digit, offset) => {
    answers[offset] = digit === SKIPPED_DIGIT ? undefined : digit;
  });
  return { difficulty, group: group as SongGroupId, seed, duration: seconds * 1000, answers };
}

/** 毫秒转「1 分 23 秒」。 */
export function formatDuration(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.round(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes} 分 ${seconds} 秒` : `${seconds} 秒`;
}

/** 毫秒转「3.4 秒」（速度统计用）。 */
export function formatSeconds(milliseconds: number | null): string {
  if (milliseconds === null) return '—';
  return `${(milliseconds / 1000).toFixed(1)} 秒`;
}
