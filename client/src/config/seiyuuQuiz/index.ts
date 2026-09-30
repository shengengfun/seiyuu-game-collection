/**
 * 「声优问答」——先搜出要考的声优，再从 TA 的个人题库里答题，最后按得分给等级与评语。
 *
 * 玩法：
 * - 每位声优一套题库（`./banks/<id>.ts`，每人 12 题，可随时手动加题），题库按 id 与
 *   `@seiyuu/shared` 名册对齐，公式照直接复用 `/seiyuu/<id>.jpg`。
 * - 两种模式：快速 8 题（从题库里定种子随机抽）/ 完整版（题库全部，按作者顺序）。
 * - 答完全部题目才结算（过程不提示对错）：分数 = 各题难度权重之和（easy 1 / normal 1.5 / hard 2），
 *   正确率决定等级 S ~ D，评语见 i18n 的 `seiyuuQuiz.grades.*`。
 * - 成绩码 `Q|<F|A>|<题库 id>|<种子>|<用时秒>|<答案>` 可还原整局（查询成绩面板直接重算）。
 */

import {
  SEIYUU_ROSTER,
  formatCharacter,
  primaryCharacter,
  seiyuuPhotoPath,
  type ProjectId,
  type SeiyuuIdentity,
} from '@seiyuu/shared';
import {
  LEVEL_IDS,
  validateBank,
  type BankIssue,
  type EasterEggIdentity,
  type QuestionLevel,
  type QuestionText,
  type SeiyuuQuizBank,
  type SeiyuuQuizQuestion,
} from './types';
// 彩蛋人物的「公式照」直接复用站点已有的特别感谢头像，不用再往 public/seiyuu 里塞一份。
import wanjiqiPhoto from '../../assets/wjq.jpg';
import { PROJECT_GROUP_FALLBACK, QUIZ_GROUP_IDS, isQuizGroupId, type QuizGroupId } from './groups';

export * from './types';
export * from './groups';

export type QuizMode = 'fast' | 'love' | 'full';

export interface QuizModeConfig {
  /** 每局抽题数；null = 题库全部。 */
  pick: number | null;
  /** 成绩码里的模式字母（F 快速 / L 真爱 / A 单推）。 */
  letter: 'F' | 'L' | 'A';
  label: string;
}

/** 快速 8 题 / 真爱 16 题 / 单推模式（题库全部）。题库不足时按实际题量抽。 */
export const QUIZ_MODES: Record<QuizMode, QuizModeConfig> = {
  fast: { pick: 8, letter: 'F', label: 'fast' },
  love: { pick: 16, letter: 'L', label: 'love' },
  full: { pick: null, letter: 'A', label: 'full' },
};

/** 模式展示顺序（选人界面的卡片顺序）。 */
export const QUIZ_MODE_ORDER: QuizMode[] = ['fast', 'love', 'full'];

/** 难度权重。 */
export const LEVEL_WEIGHT: Record<QuestionLevel, number> = {
  easy: 1,
  normal: 1.5,
  hard: 2,
};

export const GRADES = ['S', 'A', 'B', 'C', 'D'] as const;
export type Grade = (typeof GRADES)[number];

/** 等级门槛（正确率下限），与 i18n `seiyuuQuiz.grades.*` 一一对应。 */
export const GRADE_THRESHOLDS: { grade: Grade; min: number }[] = [
  { grade: 'S', min: 0.95 },
  { grade: 'A', min: 0.85 },
  { grade: 'B', min: 0.7 },
  { grade: 'C', min: 0.5 },
  { grade: 'D', min: 0 },
];

/* ------------------------------------------------------------------ 题库注册 */

type BankModule = { default: SeiyuuQuizBank };

// 新增题库 = 往 banks/ 里丢一个文件即可，不需要改这里（Vite 的 glob 会在构建期展开）。
const modules = import.meta.glob<BankModule>('./banks/*.ts', { eager: true });

const BANK_BY_ID = new Map<string, SeiyuuQuizBank>();
for (const [path, module] of Object.entries(modules)) {
  const bank = module?.default;
  if (!bank || typeof bank.id !== 'string' || !Array.isArray(bank.questions)) {
    throw new Error(`题库文件格式不合法：${path}（需要 default 导出 SeiyuuQuizBank）`);
  }
  if (BANK_BY_ID.has(bank.id)) {
    throw new Error(`题库 id 重复：${bank.id}（${path}）`);
  }
  BANK_BY_ID.set(bank.id, { ...bank, questions: [...bank.questions] });
}

/**
 * 自动生成的「出演作品」派生题（`banks/generated/<id>.ts`，由 `tmp/gen-works-questions.mjs` 产出）。
 * 注册时按 id 接在手写题后面，不需要改手写题库文件；没有对应手写题库的自动跳过。
 */
type GeneratedModule = { default: { id: string; questions: SeiyuuQuizQuestion[] } };
const generatedModules = import.meta.glob<GeneratedModule>('./banks/generated/*.ts', {
  eager: true,
});

const BANKS = BANK_BY_ID;
for (const [path, module] of Object.entries(generatedModules)) {
  const generated = module?.default;
  if (!generated || typeof generated.id !== 'string' || !Array.isArray(generated.questions)) {
    throw new Error(`生成题库格式不合法：${path}（需要 default 导出 { id, questions }）`);
  }
  const bank = BANKS.get(generated.id);
  if (!bank) continue;
  const existing = new Set(bank.questions.map((question) => question.id));
  bank.questions.push(...generated.questions.filter((question) => !existing.has(question.id)));
}

const ROSTER_ORDER = new Map(SEIYUU_ROSTER.map((identity, index) => [identity.id, index]));

/**
 * 彩蛋人物：不是女声优，只在「声优问答」里出现，**故意不进 @seiyuu/shared 名册**。
 *
 * 卡牌与结果页只需要 id / 名字这几个字段，所以这里给一个最小身份视图即可，
 * 不需要凑齐 SeiyuuIdentity 的 project / characters。
 */
const EASTER_EGG_IDENTITIES: Record<string, EasterEggIdentity> = {
  'wjq-machine': {
    id: 'wjq-machine',
    name: '玩机器Machine',
    nameJa: '6657',
    romaji: 'Wanjiqi Machine',
    character: '长崎素世单推人（自称）',
    photo: wanjiqiPhoto,
  },
};

/** 卡片/结果页需要的最小身份信息（声优与彩蛋人物都能提供）。 */
export interface QuizIdentityView {
  id: string;
  name: string;
  nameJa: string;
  romaji: string;
}

export interface QuizEntry {
  bank: SeiyuuQuizBank;
  identity: QuizIdentityView;
  /** 公式照路径 `/seiyuu/<id>.jpg`（彩蛋人物可缺图，页面会退化成首字方块）。 */
  photo: string;
  /** 主要代表角色「角色（作品）」；彩蛋人物放一句说明。 */
  character: string;
  /** 是不是彩蛋人物（不是女声优）。 */
  easterEgg: boolean;
  /** 所属企划分组（选人界面的分组标题），跨界声优会同时属于多组。 */
  groups: QuizGroupId[];
}

/** 解析题库的分组：题库自己声明优先，没写就按名册企划兜底。 */
function resolveGroups(bank: SeiyuuQuizBank, project?: ProjectId): QuizGroupId[] {
  const declared = bank.groups ?? [];
  for (const id of declared) {
    if (!isQuizGroupId(id)) {
      throw new Error(`题库 ${bank.id} 声明了未知分组：${id}（见 config/seiyuuQuiz/groups.ts）`);
    }
  }
  if (declared.length > 0) return [...declared];
  return project ? [PROJECT_GROUP_FALLBACK[project]] : ['extra'];
}

/** 可考的声优列表（按名册顺序，彩蛋人物排在最后）。 */
export const QUIZ_ENTRIES: QuizEntry[] = [...BANKS.values()]
  .sort((left, right) => {
    const leftOrder = ROSTER_ORDER.get(left.id) ?? Number.MAX_SAFE_INTEGER;
    const rightOrder = ROSTER_ORDER.get(right.id) ?? Number.MAX_SAFE_INTEGER;
    return leftOrder - rightOrder || left.id.localeCompare(right.id);
  })
  .map((bank) => {
    const identity = SEIYUU_ROSTER.find((candidate) => candidate.id === bank.id);
    if (identity) {
      const character = primaryCharacter(identity);
      return {
        bank,
        identity,
        photo: seiyuuPhotoPath(identity.id),
        character: character ? formatCharacter(character) : '',
        easterEgg: false,
        groups: resolveGroups(bank, identity.project),
      };
    }
    const egg = EASTER_EGG_IDENTITIES[bank.id];
    if (egg) {
      return {
        bank,
        identity: egg,
        photo: egg.photo ?? seiyuuPhotoPath(egg.id),
        character: egg.character,
        easterEgg: true,
        groups: resolveGroups(bank),
      };
    }
    // 既不在名册也不是已登记的彩蛋：页面拿不到照片与角色信息，测试会直接拦住。
    throw new Error(
      `题库 ${bank.id} 既不在 @seiyuu/shared 名册里，也没登记到 EASTER_EGG_IDENTITIES`,
    );
  });

export const QUIZ_ENTRY_BY_ID: ReadonlyMap<string, QuizEntry> = new Map(
  QUIZ_ENTRIES.map((entry) => [entry.bank.id, entry]),
);

/** 按企划分组后的可考名单（空组不输出，组内保持名册顺序）。 */
export const QUIZ_ENTRIES_BY_GROUP: { id: QuizGroupId; entries: QuizEntry[] }[] = QUIZ_GROUP_IDS.map(
  (id) => ({ id, entries: QUIZ_ENTRIES.filter((entry) => entry.groups.includes(id)) }),
).filter((group) => group.entries.length > 0);

export function quizEntryById(id: string): QuizEntry | undefined {
  return QUIZ_ENTRY_BY_ID.get(id);
}

/** 题库自检（测试用；页面也用它做兜底提示）。 */
export function inspectBanks(): BankIssue[] {
  return [...BANKS.values()].flatMap((bank) => validateBank(bank));
}

/* -------------------------------------------------------- 玩家投稿（已审核） */

/** 服务端 `/api/seiyuu-quiz/community` 下发的题目形状。 */
export interface CommunityQuestionInput {
  id: string;
  seiyuuId: string;
  level: string;
  prompt: string;
  options: string[];
  answer: number;
  explain: string;
  source?: string;
}

/**
 * 把管理员审核通过的玩家投稿合并进题库。
 *
 * 题库主体仍是构建期的静态文件，这里只在运行时把 `bank.questions` 追加几条：
 * `QUIZ_ENTRIES` 持有的就是同一个 bank 对象，所以选人页的题数、抽题、成绩码还原
 * 都会立刻用上这些题（页面挂载时拉一次即可，重复调用按题目 id 去重）。
 *
 * 只写中文；en/ja 由 `questionText()` 回退中文，和手写题库的约定一致。
 */
export function registerCommunityQuestions(rows: CommunityQuestionInput[]): number {
  if (!Array.isArray(rows)) return 0;
  let added = 0;
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue;
    const bank = BANKS.get(String(row.seiyuuId));
    // 只挂到已有题库上：投稿入口本身就在该声优的结果页，正常不会落到这里。
    if (!bank) continue;
    const id = String(row.id ?? '');
    if (!id || bank.questions.some((question) => question.id === id)) continue;
    if (typeof row.prompt !== 'string' || !row.prompt.trim()) continue;
    if (typeof row.explain !== 'string' || !row.explain.trim()) continue;
    if (!Array.isArray(row.options) || row.options.length < 2 || row.options.length > 4) continue;
    if (row.options.some((option) => typeof option !== 'string' || !option.trim())) continue;
    if (new Set(row.options).size !== row.options.length) continue;
    if (!Number.isInteger(row.answer) || row.answer < 0 || row.answer >= row.options.length) continue;
    const level = (LEVEL_IDS as readonly string[]).includes(row.level)
      ? (row.level as QuestionLevel)
      : 'normal';
    bank.questions.push({
      id,
      level,
      prompt: row.prompt,
      options: [...row.options],
      answer: row.answer,
      explain: row.explain,
      ...(row.source ? { source: row.source } : {}),
    });
    added += 1;
  }
  return added;
}

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

export interface QuizRound {
  bankId: string;
  mode: QuizMode;
  seed: number;
  questions: SeiyuuQuizQuestion[];
}

/**
 * 抽出一局题目。快速模式同 seed 同题目（方便成绩码还原），完整版给出全部题目。
 */
export function createRound(
  bank: SeiyuuQuizBank,
  seed: number = randomSeed(),
  mode: QuizMode = 'fast',
): QuizRound {
  const pick = QUIZ_MODES[mode].pick;
  const questions =
    pick === null || pick >= bank.questions.length
      ? [...bank.questions]
      : shuffle(bank.questions, mulberry32(seed)).slice(0, pick);
  return { bankId: bank.id, mode, seed, questions };
}

export function emptyAnswers(round: QuizRound): Record<string, number | undefined> {
  const answers: Record<string, number | undefined> = {};
  for (const question of round.questions) {
    answers[question.id] = undefined;
  }
  return answers;
}

export interface QuizStats {
  total: number;
  answered: number;
  correct: number;
  wrong: number;
  skipped: number;
  /** 加权得分（easy 1 / normal 1.5 / hard 2）。 */
  score: number;
  /** 满分（全部答对时的分数）。 */
  maxScore: number;
  /** 正确率 0 ~ 1（未作答计为错）。 */
  accuracy: number;
  byLevel: Record<QuestionLevel, { correct: number; total: number }>;
  duration: number;
}

export function scoreRound(
  round: QuizRound,
  answers: Record<string, number | undefined>,
  duration = 0,
): QuizStats {
  const byLevel = LEVEL_IDS.reduce(
    (accumulator, level) => {
      accumulator[level] = { correct: 0, total: 0 };
      return accumulator;
    },
    {} as Record<QuestionLevel, { correct: number; total: number }>,
  );
  let correct = 0;
  let answered = 0;
  let score = 0;
  let maxScore = 0;
  for (const question of round.questions) {
    const weight = LEVEL_WEIGHT[question.level] ?? 1;
    maxScore += weight;
    byLevel[question.level].total += 1;
    const picked = answers[question.id];
    if (picked === undefined) continue;
    answered += 1;
    if (picked === question.answer) {
      correct += 1;
      score += weight;
      byLevel[question.level].correct += 1;
    }
  }
  const total = round.questions.length;
  return {
    total,
    answered,
    correct,
    wrong: answered - correct,
    skipped: total - answered,
    score,
    maxScore,
    accuracy: total === 0 ? 0 : correct / total,
    byLevel,
    duration,
  };
}

export function gradeOf(accuracy: number): Grade {
  return GRADE_THRESHOLDS.find((item) => accuracy >= item.min)?.grade ?? 'D';
}

export interface QuizResult {
  round: QuizRound;
  stats: QuizStats;
  grade: Grade;
  /** 答错的题目（未作答也算），结算页按题库顺序展示解析。 */
  missed: { question: SeiyuuQuizQuestion; picked: number | undefined }[];
}

export function resultOf(
  round: QuizRound,
  answers: Record<string, number | undefined>,
  duration = 0,
): QuizResult {
  const stats = scoreRound(round, answers, duration);
  return {
    round,
    stats,
    grade: gradeOf(stats.accuracy),
    missed: round.questions
      .filter((question) => answers[question.id] !== question.answer)
      .map((question) => ({ question, picked: answers[question.id] })),
  };
}

/* ---------------------------------------------------------------- 成绩码 */

/** 成绩码里「未作答」的答案数字（选项下标最多 3）。 */
const SKIPPED_DIGIT = 4;
const ANSWER_BASE = BigInt(SKIPPED_DIGIT + 1);

function toBase36(value: number): string {
  return value.toString(36);
}

function fromBase36(value: string): number {
  return parseInt(value, 36);
}

/** 形如 `Q|F|maeda-kaori|1ab|2m|3x9k1`（模式 | 题库 | 种子 | 用时秒 | 答案）。 */
export function resultCodeOf(
  round: QuizRound,
  answers: Record<string, number | undefined>,
  duration: number,
): string {
  let packed = BigInt(0);
  for (const question of round.questions) {
    const picked = answers[question.id];
    const digit = picked === undefined ? SKIPPED_DIGIT : Math.max(0, Math.min(SKIPPED_DIGIT, picked));
    packed = packed * ANSWER_BASE + BigInt(digit);
  }
  return [
    'Q',
    QUIZ_MODES[round.mode].letter,
    round.bankId,
    toBase36(Math.max(0, round.seed)),
    toBase36(Math.max(0, Math.round(duration / 1000))),
    packed.toString(36),
  ].join('|');
}

export interface QuizCodePayload {
  mode: QuizMode;
  bankId: string;
  seed: number;
  duration: number;
  digits: number[];
}

export function decodeQuizCode(code: string): QuizCodePayload | null {
  const match = /^Q\|([FLA])\|([a-z0-9_-]+)\|([0-9a-z]+)\|([0-9a-z]+)\|([0-9a-z]+)$/i.exec(code.trim());
  if (!match) return null;
  const letter = match[1].toUpperCase();
  const mode: QuizMode = letter === 'A' ? 'full' : letter === 'L' ? 'love' : 'fast';
  const bankId = match[2].toLowerCase();
  const bank = BANKS.get(bankId);
  if (!bank) return null;
  const seed = fromBase36(match[3].toLowerCase());
  if (Number.isNaN(seed)) return null;
  const duration = fromBase36(match[4].toLowerCase()) * 1000;
  let packed = BigInt(0);
  for (const char of match[5].toLowerCase()) {
    const value = parseInt(char, 36);
    if (Number.isNaN(value)) return null;
    packed = packed * BigInt(36) + BigInt(value);
  }
  const expected = createRound(bank, seed, mode).questions.length;
  const digits: number[] = [];
  while (packed > BigInt(0)) {
    digits.unshift(Number(packed % ANSWER_BASE));
    packed /= ANSWER_BASE;
  }
  if (digits.length > expected) return null;
  while (digits.length < expected) digits.unshift(0);
  return { mode, bankId, seed, duration, digits };
}

/** 由成绩码还原整局（题目 + 答案 + 用时），用于「查询成绩」直接重算。 */
export function decodeQuizRound(code: string): {
  entry: QuizEntry;
  round: QuizRound;
  answers: Record<string, number | undefined>;
  duration: number;
} | null {
  const payload = decodeQuizCode(code);
  if (!payload) return null;
  const entry = quizEntryById(payload.bankId);
  if (!entry) return null;
  const round = createRound(entry.bank, payload.seed, payload.mode);
  const answers: Record<string, number | undefined> = {};
  round.questions.forEach((question, index) => {
    const digit = payload.digits[index];
    answers[question.id] = digit === undefined || digit === SKIPPED_DIGIT ? undefined : digit;
  });
  return { entry, round, answers, duration: payload.duration };
}

/* ------------------------------------------------------------------ 杂项 */

/** 毫秒转「1 分 23 秒」。 */
export function formatDuration(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.round(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes} 分 ${seconds} 秒` : `${seconds} 秒`;
}

/** 选项字母 A / B / C / D。 */
export const OPTION_LETTERS = ['A', 'B', 'C', 'D'] as const;

/** 按题目 id 取题目文案（含语言回退）。 */
export function questionText(
  question: SeiyuuQuizQuestion,
  language: string,
): Required<QuestionText> {
  const key = language.startsWith('ja') ? 'ja' : language.startsWith('en') ? 'en' : null;
  const override = key ? question.l10n?.[key] : undefined;
  return {
    prompt: override?.prompt ?? question.prompt,
    options: override?.options ?? question.options,
    explain: override?.explain ?? question.explain,
  };
}

/** 题库题量统计，给选人界面显示「n 题」。 */
export function bankSize(bank: SeiyuuQuizBank): number {
  return bank.questions.length;
}
