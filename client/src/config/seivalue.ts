/**
 * SeiValue 测试的题库池、抽题器、计分与成绩码。
 *
 * 计分模型（参考 8values，改成 4 轴 / 5 档）：
 * - 4 个轴：声优观 voice、商法观 consume、社区观 community、交互观 interact
 * - 5 档：强烈同意 +2、同意 +1、中立 0、不同意 -1、强烈反对 -2
 * - 每题得分 = 档位值 * direction * 层级权重；轴得分归一化到 -100 ~ +100（负=左极，正=右极）
 * - 层级权重：warmup 0.8 / core 1.0 / extreme 0.6 / trap 0（送命题不计分，只用于彩蛋判定）
 *
 * 抽题：从固定题库池随机抽取。快速模式 33 题、PRO 模式 56 题；同一个 seed 永远同一套题。
 * 不变量：矛盾对两题固定相隔 PAIR_GAP 题；每个轴左右权重对称，中立答案不会被推向某一极。
 */

export const AXIS_IDS = ['voice', 'consume', 'community', 'interact'] as const;
export type AxisId = (typeof AXIS_IDS)[number];

/** 16 型名称的拼装顺序：声优观 → 社区观 → 交互观 → 商法观。 */
export const TYPE_ORDER: AxisId[] = ['voice', 'community', 'interact', 'consume'];

export type PoleSide = 'left' | 'right';
export type Layer = 'warmup' | 'core' | 'extreme' | 'trap';
export type TrapFlag = 'antiHuman' | 'possibleLARP' | 'shameless' | 'gachikoi' | 'troll';
export type Rarity = 'normal' | 'rare' | 'epic' | 'legendary';
export type QuizMode = 'fast' | 'pro';

export const RARITY_RANK: Record<Rarity, number> = { normal: 0, rare: 1, epic: 2, legendary: 3 };

/**
 * 层级权重。热身与极端同为 0.8：一局里每个轴会各拿 1 题（快速）或 2 题（PRO），
 * 两侧权重完全相等，中立答案不会被系统性推向某一侧；核心（矛盾对）权重最高。
 */
export const LAYER_WEIGHT: Record<Layer, number> = {
  warmup: 0.8,
  core: 1,
  extreme: 0.8,
  trap: 0,
};

export interface ModeConfig {
  pairs: number;
  warmup: number;
  extreme: number;
  trap: number;
  questions: number;
}

/**
 * 快速模式 32 题、PRO 模式 64 题（正好是快速的两倍）。
 * 两种模式的层级配比完全一致：核心 62.5% / 热身 12.5% / 极端 12.5% / 送命 12.5%。
 */
export const QUIZ_MODES: Record<QuizMode, ModeConfig> = {
  fast: { pairs: 10, warmup: 4, extreme: 4, trap: 4, questions: 32 },
  pro: { pairs: 20, warmup: 8, extreme: 8, trap: 8, questions: 64 },
};

/** 矛盾对两题之间的固定间隔。 */
export const PAIR_GAP = 20;

/** 五档选项，value 同时用于计分与统计。 */
export const SCALE = [
  { id: 'stronglyAgree', value: 2 },
  { id: 'agree', value: 1 },
  { id: 'neutral', value: 0 },
  { id: 'disagree', value: -1 },
  { id: 'stronglyDisagree', value: -2 },
] as const;

export type ScaleId = (typeof SCALE)[number]['id'];
export type AnswerValue = (typeof SCALE)[number]['value'];

export const ANSWER_VALUES = SCALE.map((item) => item.value);
export const SCALE_MAX = 2;
/** 未作答在成绩码里的占位数字。 */
const SKIPPED_DIGIT = SCALE.length;

export interface QuizQuestion {
  /** 同时是 i18n 的键：seivalue.questions.<id>。 */
  id: string;
  /** 送命题没有轴，不计分。 */
  axis?: AxisId;
  /** -1：同意偏向左侧（前一个词），+1：同意偏向右侧（后一个词）。 */
  direction: -1 | 1;
  layer: Layer;
  /** 自相矛盾题的配对 id，同一对两题的 direction 相反。 */
  pair?: string;
  trapFlag?: TrapFlag;
  /** 送命题的触发方式：同意触发或反对触发。 */
  trapTrigger?: 'agree' | 'disagree';
}

export interface QuizSet {
  seed: number;
  mode: QuizMode;
  questions: QuizQuestion[];
}

interface PairDefinition {
  id: string;
  axis: AxisId;
  /** direction = -1 的陈述。 */
  left: string;
  /** direction = +1 的陈述。 */
  right: string;
}

/** 矛盾对池：每个轴 6 对，一局抽 2~4 对。 */
export const PAIR_POOL: PairDefinition[] = [
  { id: 'v1', axis: 'voice', left: 'q03', right: 'q23' },
  { id: 'v2', axis: 'voice', left: 'q06', right: 'q26' },
  { id: 'v3', axis: 'voice', left: 'q07', right: 'q27' },
  { id: 'v4', axis: 'voice', left: 'v4a', right: 'v4b' },
  { id: 'v5', axis: 'voice', left: 'v5a', right: 'v5b' },
  { id: 'v6', axis: 'voice', left: 'v6a', right: 'v6b' },
  { id: 'v7', axis: 'voice', left: 'v7a', right: 'v7b' },
  { id: 'v8', axis: 'voice', left: 'v8a', right: 'v8b' },
  { id: 'c1', axis: 'consume', left: 'q04', right: 'q24' },
  { id: 'c2', axis: 'consume', left: 'q08', right: 'q28' },
  { id: 'c3', axis: 'consume', left: 'c3a', right: 'c3b' },
  { id: 'c4', axis: 'consume', left: 'c4a', right: 'c4b' },
  { id: 'c5', axis: 'consume', left: 'c5a', right: 'c5b' },
  { id: 'c6', axis: 'consume', left: 'c6a', right: 'c6b' },
  { id: 'c7', axis: 'consume', left: 'c7a', right: 'c7b' },
  { id: 'c8', axis: 'consume', left: 'c8a', right: 'c8b' },
  { id: 'm1', axis: 'community', left: 'q02', right: 'q22' },
  { id: 'm2', axis: 'community', left: 'q09', right: 'q29' },
  { id: 'm3', axis: 'community', left: 'q30', right: 'q10' },
  { id: 'm4', axis: 'community', left: 'm4a', right: 'm4b' },
  { id: 'm5', axis: 'community', left: 'm5a', right: 'm5b' },
  { id: 'm6', axis: 'community', left: 'm6a', right: 'm6b' },
  { id: 'm7', axis: 'community', left: 'm7a', right: 'm7b' },
  { id: 'm8', axis: 'community', left: 'm8a', right: 'm8b' },
  { id: 'i1', axis: 'interact', left: 'q01', right: 'q21' },
  { id: 'i2', axis: 'interact', left: 'q05', right: 'q25' },
  { id: 'i3', axis: 'interact', left: 'i3a', right: 'i3b' },
  { id: 'i4', axis: 'interact', left: 'i4a', right: 'i4b' },
  { id: 'i5', axis: 'interact', left: 'i5a', right: 'i5b' },
  { id: 'i6', axis: 'interact', left: 'i6a', right: 'i6b' },
  { id: 'i7', axis: 'interact', left: 'i7a', right: 'i7b' },
  { id: 'i8', axis: 'interact', left: 'i8a', right: 'i8b' },
];

const core = (id: string, axis: AxisId, direction: -1 | 1, pair: string): QuizQuestion => ({
  id,
  axis,
  direction,
  layer: 'core',
  pair,
});

/** 矛盾对展开成的具体题目。 */
export const PAIR_QUESTIONS: QuizQuestion[] = PAIR_POOL.flatMap((pair) => [
  core(pair.left, pair.axis, -1, pair.id),
  core(pair.right, pair.axis, 1, pair.id),
]);

const warmup = (id: string, axis: AxisId, direction: -1 | 1): QuizQuestion => ({
  id,
  axis,
  direction,
  layer: 'warmup',
});

/** 热身题池：每个轴 3 左 3 右。 */
export const WARMUP_POOL: QuizQuestion[] = [
  warmup('q11', 'voice', 1),
  warmup('wv1', 'voice', -1),
  warmup('wv2', 'voice', -1),
  warmup('wv3', 'voice', 1),
  warmup('wv4', 'voice', -1),
  warmup('wv5', 'voice', 1),
  warmup('wv6', 'voice', -1),
  warmup('wv7', 'voice', 1),
  warmup('q12', 'consume', -1),
  warmup('wc1', 'consume', -1),
  warmup('wc2', 'consume', 1),
  warmup('wc3', 'consume', 1),
  warmup('wc4', 'consume', -1),
  warmup('wc5', 'consume', 1),
  warmup('wc6', 'consume', -1),
  warmup('wc7', 'consume', 1),
  warmup('q13', 'community', 1),
  warmup('wm1', 'community', -1),
  warmup('wm2', 'community', -1),
  warmup('wm3', 'community', 1),
  warmup('wm4', 'community', -1),
  warmup('wm5', 'community', 1),
  warmup('wm6', 'community', -1),
  warmup('wm7', 'community', 1),
  warmup('q14', 'interact', -1),
  warmup('wi1', 'interact', -1),
  warmup('wi2', 'interact', 1),
  warmup('wi3', 'interact', 1),
  warmup('wi4', 'interact', -1),
  warmup('wi5', 'interact', 1),
  warmup('wi6', 'interact', -1),
  warmup('wi7', 'interact', 1),
];

const extreme = (id: string, axis: AxisId, direction: -1 | 1): QuizQuestion => ({
  id,
  axis,
  direction,
  layer: 'extreme',
});

/** 极端题池：每个轴 3 左 3 右。 */
export const EXTREME_POOL: QuizQuestion[] = [
  extreme('q15', 'voice', -1),
  extreme('xv1', 'voice', -1),
  extreme('xv2', 'voice', 1),
  extreme('xv3', 'voice', 1),
  extreme('xv4', 'voice', -1),
  extreme('xv5', 'voice', 1),
  extreme('xv6', 'voice', -1),
  extreme('xv7', 'voice', 1),
  extreme('xc1', 'consume', -1),
  extreme('xc2', 'consume', -1),
  extreme('q16', 'consume', 1),
  extreme('xc3', 'consume', 1),
  extreme('xc4', 'consume', -1),
  extreme('xc5', 'consume', 1),
  extreme('xc6', 'consume', -1),
  extreme('xc7', 'consume', 1),
  extreme('q19', 'community', -1),
  extreme('xm1', 'community', -1),
  extreme('xm2', 'community', 1),
  extreme('xm3', 'community', 1),
  extreme('xm4', 'community', -1),
  extreme('xm5', 'community', 1),
  extreme('xm6', 'community', -1),
  extreme('xm7', 'community', 1),
  extreme('xi1', 'interact', -1),
  extreme('xi2', 'interact', -1),
  extreme('q20', 'interact', 1),
  extreme('xi3', 'interact', 1),
  extreme('xi4', 'interact', -1),
  extreme('xi5', 'interact', 1),
  extreme('xi6', 'interact', -1),
  extreme('xi7', 'interact', 1),
];

const trap = (
  id: string,
  trapFlag: TrapFlag,
  trapTrigger: 'agree' | 'disagree',
): QuizQuestion => ({
  id,
  direction: 1,
  layer: 'trap',
  trapFlag,
  trapTrigger,
});

/** 送命题池：一局抽 5 题（PRO 抽 8 题）。 */
export const TRAP_POOL: QuizQuestion[] = [
  trap('q17', 'gachikoi', 'agree'),
  trap('q18', 'shameless', 'agree'),
  trap('q31', 'antiHuman', 'agree'),
  trap('q32', 'antiHuman', 'agree'),
  trap('q33', 'possibleLARP', 'agree'),
  trap('t6', 'antiHuman', 'disagree'),
  trap('t7', 'possibleLARP', 'agree'),
  trap('t8', 'shameless', 'disagree'),
  trap('t9', 'troll', 'disagree'),
  trap('t10', 'gachikoi', 'agree'),
  trap('t11', 'antiHuman', 'agree'),
  trap('t12', 'shameless', 'agree'),
  trap('t13', 'antiHuman', 'agree'),
  trap('t14', 'gachikoi', 'agree'),
  trap('t15', 'antiHuman', 'agree'),
  trap('t16', 'possibleLARP', 'agree'),
];

/** 全部题库，用于校对所有题都有文案。 */
export const ALL_POOL_QUESTIONS: QuizQuestion[] = [
  ...PAIR_QUESTIONS,
  ...WARMUP_POOL,
  ...EXTREME_POOL,
  ...TRAP_POOL,
];

export const POOL_SIZE = ALL_POOL_QUESTIONS.length;

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

/** 每个轴抽 count 题；count 为偶数时保证左右各半。 */
function drawPerAxis(
  pool: QuizQuestion[],
  count: number,
  random: () => number,
): QuizQuestion[] {
  return AXIS_IDS.flatMap((axis) => {
    const candidates = shuffle(
      pool.filter((question) => question.axis === axis),
      random,
    );
    if (count % 2 === 0) {
      const half = count / 2;
      return [
        ...candidates.filter((question) => question.direction === -1).slice(0, half),
        ...candidates.filter((question) => question.direction === 1).slice(0, half),
      ];
    }
    return candidates.slice(0, count);
  });
}

/** 极端题：偶数时左右各半；奇数时取与同轴热身题相反的一极，保证该轴左右权重对称。 */
function drawExtremes(
  count: number,
  warmups: QuizQuestion[],
  random: () => number,
): QuizQuestion[] {
  return AXIS_IDS.flatMap((axis) => {
    const candidates = shuffle(
      EXTREME_POOL.filter((question) => question.axis === axis),
      random,
    );
    if (count % 2 === 0) {
      const half = count / 2;
      return [
        ...candidates.filter((question) => question.direction === -1).slice(0, half),
        ...candidates.filter((question) => question.direction === 1).slice(0, half),
      ];
    }
    const paired = warmups.find((question) => question.axis === axis);
    const side: -1 | 1 = paired ? (paired.direction === 1 ? -1 : 1) : 1;
    return candidates.filter((question) => question.direction === side).slice(0, count);
  });
}

/**
 * 抽出一局题目：同一个 seed + 模式永远得到同一套题，方便复现与分享。
 * 排版规则：矛盾对两题固定相隔 PAIR_GAP 题，其余题目随机填入空位。
 */
export function createQuiz(seed: number = randomSeed(), mode: QuizMode = 'fast'): QuizSet {
  const config = QUIZ_MODES[mode];
  const random = mulberry32(seed);

  const perAxisPairs = Math.floor(config.pairs / AXIS_IDS.length);
  const extraPairs = config.pairs - perAxisPairs * AXIS_IDS.length;
  const byAxis = AXIS_IDS.map((axis) => shuffle(PAIR_POOL.filter((pair) => pair.axis === axis), random));
  const picked = byAxis.map((pairs) => pairs.slice(0, perAxisPairs));
  // 多出来的矛盾对尽量分散到不同轴，避免某个轴被过度测量（各轴题量差不超过 1 对）
  const leftovers = shuffle(
    byAxis.flatMap((pairs, axisIndex) => pairs.slice(perAxisPairs).map((pair) => ({ pair, axisIndex }))),
    random,
  );
  const extras: PairDefinition[] = [];
  const usedAxes = new Set<number>();
  for (const entry of leftovers) {
    if (extras.length >= extraPairs) break;
    if (usedAxes.has(entry.axisIndex)) continue;
    usedAxes.add(entry.axisIndex);
    extras.push(entry.pair);
  }
  for (const entry of leftovers) {
    if (extras.length >= extraPairs) break;
    if (!extras.includes(entry.pair)) extras.push(entry.pair);
  }
  const pairs = shuffle([...picked.flat(), ...extras], random);

  const warmups = drawPerAxis(WARMUP_POOL, config.warmup / AXIS_IDS.length, random);
  const extremes = drawExtremes(config.extreme / AXIS_IDS.length, warmups, random);
  const traps = shuffle(TRAP_POOL, random).slice(0, config.trap);

  const slots: (QuizQuestion | undefined)[] = new Array(config.questions);
  pairs.forEach((pair, position) => {
    slots[position] = core(pair.left, pair.axis, -1, pair.id);
    slots[position + PAIR_GAP] = core(pair.right, pair.axis, 1, pair.id);
  });

  const fillers = shuffle([...warmups, ...extremes, ...traps], random);
  let cursor = 0;
  for (let index = 0; index < config.questions; index += 1) {
    if (!slots[index]) {
      slots[index] = fillers[cursor];
      cursor += 1;
    }
  }

  return { seed, mode, questions: slots as QuizQuestion[] };
}

export function questionWeight(question: QuizQuestion): number {
  return LAYER_WEIGHT[question.layer];
}

export function questionScore(question: QuizQuestion, value: number): number {
  if (question.layer === 'trap' || question.axis === undefined) {
    return 0;
  }
  return value * question.direction * questionWeight(question);
}

export interface AxisScore {
  axis: AxisId;
  /** 原始加权分，负值偏左极，正值偏右极。 */
  rawScore: number;
  /** 归一化后的倾向强度，-100 ~ +100。 */
  percent: number;
  /** 归属的一极；0 分时按左侧处理。 */
  side: PoleSide;
  /** 该轴的绝对值强度，0 ~ 100。 */
  strength: number;
  /** 左极占比（与 rightShare 相加为 100），用于画左右分配条。 */
  leftShare: number;
  /** 右极占比。 */
  rightShare: number;
}

export interface TrapSummary {
  total: number;
  triggered: number;
  flags: TrapFlag[];
}

export interface QuizStats {
  total: number;
  answered: number;
  skipped: number;
  unansweredRate: number;
  duration: number;
  allAgree: boolean;
  allDisagree: boolean;
  allNeutral: boolean;
  randomness: number;
  contradictionCount: number;
  alternation: boolean;
  trap: TrapSummary;
  /** 每个档位（-2 ~ 2）被选中的次数。 */
  valueCounts: Record<number, number>;
  axes: AxisScore[];
}

export interface SpecialResult {
  kind: 'egg' | 'tag';
  id: string;
  rarity: Rarity;
}

export interface QuizResult {
  mode: QuizMode;
  seed: number;
  stats: QuizStats;
  /** 16 型名称所需的四极组合，顺序为 TYPE_ORDER。 */
  poles: { axis: AxisId; side: PoleSide; percent: number }[];
  /** 命中的隐藏结果（彩蛋），没有则为 undefined。 */
  egg?: SpecialResult;
  /** 命中的稀有标签，最多两条。 */
  tags: SpecialResult[];
  rarity: Rarity;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function scoreAxis(axis: AxisId, answers: Map<string, number>, questions: QuizQuestion[]): AxisScore {
  let rawScore = 0;
  let maxLeft = 0;
  let maxRight = 0;

  for (const question of questions) {
    if (question.axis !== axis || question.layer === 'trap') {
      continue;
    }
    const value = answers.get(question.id);
    if (value === undefined) {
      continue;
    }
    const weight = questionWeight(question) * SCALE_MAX;
    rawScore += questionScore(question, value);
    if (question.direction === -1) {
      maxLeft += weight;
    } else {
      maxRight += weight;
    }
  }

  const maxPossible = rawScore < 0 ? maxLeft : maxRight;
  const percent = maxPossible === 0 ? 0 : clamp((rawScore / maxPossible) * 100, -100, 100);
  // 平分（0 分）时归到左极，保证四轴总能给出一个极点用于拼流派名。
  const side: PoleSide = percent <= 0 ? 'left' : 'right';
  // 参考 8values：把轴当成 0~100 的坐标，中间点两侧各占 50%。
  const rightShare = 50 + percent / 2;

  return {
    axis,
    rawScore,
    percent,
    side,
    strength: Math.abs(percent),
    leftShare: 100 - rightShare,
    rightShare,
  };
}

function countContradictions(answers: Map<string, number>, questions: QuizQuestion[]): number {
  const seen = new Set<string>();
  let count = 0;

  for (const question of questions) {
    if (!question.pair || seen.has(question.pair)) {
      continue;
    }
    seen.add(question.pair);
    const partner = questions.find((item) => item.pair === question.pair && item.id !== question.id);
    if (!partner) {
      continue;
    }
    const first = answers.get(question.id);
    const second = answers.get(partner.id);
    if (first !== undefined && second !== undefined && Math.abs(first) === SCALE_MAX && Math.abs(second) === SCALE_MAX) {
      count += 1;
    }
  }

  return count;
}

function isStrictlyAlternating(values: number[]): boolean {
  if (values.length < 4) {
    return false;
  }
  for (let index = 1; index < values.length; index += 1) {
    const previous = values[index - 1];
    const current = values[index];
    if (previous === 0 || current === 0) {
      return false;
    }
    if (Math.sign(previous) === Math.sign(current)) {
      return false;
    }
  }
  return true;
}

/** 香农熵归一化到 0 ~ 1：全选同一档为 0，五档完全均匀为 1。 */
export function randomnessOf(values: number[]): number {
  if (values.length < 2) {
    return 0;
  }
  const counts = new Map<number, number>();
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  const total = values.length;
  let entropy = 0;
  for (const count of counts.values()) {
    const p = count / total;
    entropy -= p * Math.log2(p);
  }
  const max = Math.log2(5);
  return max === 0 ? 0 : Math.min(1, entropy / max);
}

export function scoreSeiValue(
  quiz: QuizSet,
  answers: Record<string, number | undefined>,
  duration = 0,
): QuizResult {
  const questions = quiz.questions;
  const answered = new Map<string, number>();
  for (const question of questions) {
    const value = answers[question.id];
    if (value !== undefined) {
      answered.set(question.id, value);
    }
  }

  const values = questions
    .map((question) => answered.get(question.id))
    .filter((value): value is number => value !== undefined);
  const axes = AXIS_IDS.map((axis) => scoreAxis(axis, answered, questions));
  const traps = questions.filter((question) => question.layer === 'trap');
  const triggered = traps.filter((question) => {
    const value = answered.get(question.id);
    if (value === undefined) {
      return false;
    }
    return question.trapTrigger === 'disagree' ? value < 0 : value > 0;
  });

  const stats: QuizStats = {
    total: questions.length,
    answered: values.length,
    skipped: questions.length - values.length,
    unansweredRate: questions.length === 0 ? 0 : (questions.length - values.length) / questions.length,
    duration,
    allAgree: values.length === questions.length && values.every((value) => value === SCALE_MAX),
    allDisagree: values.length === questions.length && values.every((value) => value === -SCALE_MAX),
    allNeutral: values.length === questions.length && values.every((value) => value === 0),
    randomness: randomnessOf(values),
    contradictionCount: countContradictions(answered, questions),
    alternation: isStrictlyAlternating(values),
    trap: {
      total: traps.length,
      triggered: triggered.length,
      flags: triggered
        .map((question) => question.trapFlag)
        .filter((flag): flag is TrapFlag => Boolean(flag)),
    },
    valueCounts: ANSWER_VALUES.reduce<Record<number, number>>((counts, value) => {
      counts[value] = values.filter((item) => item === value).length;
      return counts;
    }, {}),
    axes,
  };

  const matchedEgg = EGGS.find((egg) => egg.check(stats));
  const matchedTags = RARE_TAGS.filter((tag) => tag.check(stats)).slice(0, 2);
  const egg: SpecialResult | undefined = matchedEgg
    ? { kind: 'egg', id: matchedEgg.id, rarity: matchedEgg.rarity }
    : undefined;
  const tags: SpecialResult[] = matchedTags.map((tag) => ({ kind: 'tag', id: tag.id, rarity: 'rare' }));

  const poles = TYPE_ORDER.map((axis) => {
    const score = axes.find((item) => item.axis === axis);
    return {
      axis,
      side: score?.side ?? 'left',
      percent: score?.percent ?? 0,
    };
  });

  return {
    mode: quiz.mode,
    seed: quiz.seed,
    stats,
    poles,
    egg,
    tags,
    rarity: egg?.rarity ?? (tags.length > 0 ? 'rare' : 'normal'),
  };
}

interface EggDefinition {
  id: string;
  rarity: Rarity;
  check: (stats: QuizStats) => boolean;
}

function share(stats: QuizStats, value: number): number {
  if (stats.answered === 0) {
    return 0;
  }
  return (stats.valueCounts[value] ?? 0) / stats.answered;
}

/** 彩蛋按稀有度从高到低排列，取第一个命中的。 */
export const EGGS: EggDefinition[] = [
  { id: 'e_all_agree', rarity: 'legendary', check: (s) => s.allAgree },
  { id: 'e_all_disagree', rarity: 'legendary', check: (s) => s.allDisagree },
  {
    id: 'e_chaos',
    rarity: 'legendary',
    check: (s) => s.duration > 0 && s.duration < 90_000 && s.contradictionCount >= 8 && s.randomness > 0.7,
  },
  {
    id: 'e_toilet',
    rarity: 'legendary',
    check: (s) => s.trap.total > 0 && s.trap.triggered === s.trap.total && s.axes.every((axis) => axis.strength <= 35),
  },
  { id: 'e_left', rarity: 'legendary', check: (s) => s.axes.every((axis) => axis.percent <= -80) },
  { id: 'e_right', rarity: 'legendary', check: (s) => s.axes.every((axis) => axis.percent >= 80) },
  {
    id: 'e_void',
    rarity: 'legendary',
    check: (s) =>
      s.unansweredRate >= 0.5 && s.duration > 0 && s.duration < 90_000 && s.axes.every((axis) => axis.strength <= 10),
  },
  {
    id: 'e_blaster',
    rarity: 'legendary',
    check: (s) =>
      s.duration > 0 &&
      s.duration < 30_000 &&
      share(s, SCALE_MAX) >= 0.28 &&
      share(s, -SCALE_MAX) >= 0.28 &&
      share(s, 0) >= 0.28 &&
      share(s, 1) <= 0.1 &&
      share(s, -1) <= 0.1,
  },
  {
    id: 'e_multi_chaos',
    rarity: 'legendary',
    check: (s) => s.answered >= 15 && s.randomness >= 0.95 && s.axes.every((axis) => axis.strength <= 10),
  },
  {
    id: 'e_sprint',
    rarity: 'epic',
    check: (s) => s.answered === s.total && s.duration > 0 && s.duration < 45_000,
  },
  { id: 'e_pendulum', rarity: 'epic', check: (s) => s.alternation },
  { id: 'e_contradict', rarity: 'epic', check: (s) => s.contradictionCount >= 5 },
  {
    id: 'e_fishing',
    rarity: 'epic',
    check: (s) => s.trap.triggered >= 4 && s.axes.every((axis) => axis.strength <= 30),
  },
  { id: 'e_all_neutral', rarity: 'epic', check: (s) => s.allNeutral },
  {
    id: 'e_random',
    rarity: 'rare',
    check: (s) => s.answered >= 15 && s.randomness >= 0.9 && s.axes.every((axis) => axis.strength <= 45),
  },
  { id: 'e_blank', rarity: 'rare', check: (s) => s.unansweredRate > 0.2 },
  {
    id: 'e_middle',
    rarity: 'rare',
    check: (s) => s.answered >= 10 && s.axes.every((axis) => axis.strength <= 8),
  },
];

interface TagDefinition {
  id: string;
  check: (stats: QuizStats) => boolean;
}

function axisOf(stats: QuizStats, axis: AxisId): AxisScore | undefined {
  return stats.axes.find((item) => item.axis === axis);
}

function pct(stats: QuizStats, axis: AxisId): number {
  return axisOf(stats, axis)?.percent ?? 0;
}

/** 稀有标签：攻击性拉满，按特异性从高到低取前两条。 */
export const RARE_TAGS: TagDefinition[] = [
  {
    id: 'rt1',
    // 圈地 + 拆台 + 白嫖：不花钱、不许别人碰、嘴上最狠
    check: (s) => pct(s, 'community') >= 60 && pct(s, 'interact') >= 55 && pct(s, 'consume') <= -55,
  },
  {
    id: 'rt2',
    // 只看演技 + 到处点评 + 一分不掏
    check: (s) => pct(s, 'voice') <= -55 && pct(s, 'interact') >= 45 && pct(s, 'consume') <= -40,
  },
  {
    id: 'rt3',
    // 榜单/销量至上
    check: (s) => pct(s, 'consume') >= 70,
  },
  {
    id: 'rt4',
    // 白嫖 + 演技考据
    check: (s) => pct(s, 'consume') <= -65 && pct(s, 'voice') <= -55,
  },
  {
    id: 'rt5',
    check: (s) => pct(s, 'interact') <= -75,
  },
  {
    id: 'rt6',
    check: (s) => pct(s, 'voice') >= 75,
  },
  {
    id: 'rt7',
    // 反偶像化的演技派，还爱拆台
    check: (s) => pct(s, 'voice') <= -70 && pct(s, 'interact') >= 40,
  },
  {
    id: 'rt8',
    // 梦女声优盾：只要颜、全肯定、不跟别人分享
    check: (s) => pct(s, 'voice') >= 55 && pct(s, 'interact') <= -45 && pct(s, 'community') >= 50,
  },
  {
    id: 'rt9',
    // 炎上小作文：到处开火 + 爱拆台
    check: (s) => pct(s, 'community') >= 55 && pct(s, 'interact') >= 55 && pct(s, 'consume') <= 0,
  },
  {
    id: 'rt10',
    // 资源阴谋论：盯着配音表 + 圈地 + 白嫖
    check: (s) => pct(s, 'voice') <= -40 && pct(s, 'community') >= 40 && pct(s, 'consume') <= -40,
  },
  {
    id: 'rt11',
    // 现场恋爱脑：看脸 + 氪金 + 不传教
    check: (s) => pct(s, 'voice') >= 45 && pct(s, 'consume') >= 55 && pct(s, 'community') <= -30,
  },
  {
    id: 'rt12',
    // 偶像化全肯定 + 上贡
    check: (s) => pct(s, 'voice') >= 55 && pct(s, 'interact') <= -55 && pct(s, 'consume') >= 55,
  },
  {
    id: 'rt13',
    check: (s) => pct(s, 'community') >= 70,
  },
  {
    id: 'rt14',
    // 传教过载 + 爱拆台
    check: (s) => pct(s, 'community') <= -70 && pct(s, 'interact') >= 45,
  },
];

/** 16 型代号：按 TYPE_ORDER 拼接四个极点字母。 */
export const TYPE_CODE: Record<AxisId, Record<PoleSide, string>> = {
  voice: { left: 'a', right: 'f' },
  community: { left: 'e', right: 'q' },
  interact: { left: 's', right: 'd' },
  consume: { left: 'r', right: 'p' },
};

export function typeCode(poles: QuizResult['poles']): string {
  return poles.map((pole) => TYPE_CODE[pole.axis][pole.side]).join('');
}

/** 全部 16 型代号，用于校验文案齐全。 */
export function allTypeCodes(): string[] {
  return TYPE_ORDER.reduce<string[]>(
    (codes, axis) =>
      codes.flatMap((code) => [
        `${code}${TYPE_CODE[axis].left}`,
        `${code}${TYPE_CODE[axis].right}`,
      ]),
    [''],
  );
}

/**
 * 每个极点对应的推荐声优。
 * 全部取自 LoveLive! / BanG Dream! / 偶像大师 / 赛马娘 / Project SEKAI 五个企划，
 * 且名字都按本项目的声优库（简化字，例如「立石凛」「高尾奏音」）来写，保证在「声优猜」里搜得到。
 */
export const RECOMMEND: Record<AxisId, Record<PoleSide, string[]>> = {
  voice: {
    // 演技原教旨：IM@S / MYGO / 赛马娘 / PJSK 里公认的演技派
    left: ['上田丽奈', '羊宫妃那', '高野麻里佳', '楠木灯'],
    // 颜值恋爱脑：LoveLive 系的镜头担当
    right: ['伊达小百合', 'Liyuu', '小泉萌香', '大西亚玖璃'],
  },
  consume: {
    // 白嫖理性：动画游戏作品量大，免费内容管够
    left: ['中岛由贵', '田所梓', '降幡爱', '大桥彩香'],
    // 氪金上贡：偶像企划与 Live 的常驻
    right: ['南条爱乃', '三森铃子', '爱美', '相羽爱奈'],
  },
  community: {
    // 传教安利：节目与广播素材多，自来熟
    left: ['伊藤美来', '小仓唯', '立石凛', '加藤英美里'],
    // 圈地自萌：圈子小而黏，气质偏清冷
    right: ['铃木实里', '青木阳菜', '高尾奏音', '佐佐木琴子'],
  },
  interact: {
    // 全肯定：形象长期温柔稳定
    left: ['和气杏未', '指出毬亚', '久保田未梦', '高桥未奈美'],
    // 拆台去媚：气场硬、业务扎实
    right: ['三泽纱千香', '今井麻美', '日笠阳子', '佐佐木李子'],
  },
};

export interface RecommendGroup {
  axis: AxisId;
  side: PoleSide;
  percent: number;
  names: string[];
}

/**
 * 按轴的倾向强度排出「你可能喜欢的声优」，同一个人不会重复出现。
 * rotation 用来在同一极点的候选池里轮转（传种子即可），避免每局都只看到固定前两位。
 */
export function recommendSeiyuu(
  axes: AxisScore[],
  perPole = 2,
  maxNames = 8,
  rotation = 0,
): RecommendGroup[] {
  const used = new Set<string>();
  const groups: RecommendGroup[] = [];

  for (const score of [...axes].sort((a, b) => b.strength - a.strength)) {
    if (used.size >= maxNames) {
      break;
    }
    const pool = RECOMMEND[score.axis][score.side] ?? [];
    const offset = pool.length > 0 ? ((rotation % pool.length) + pool.length) % pool.length : 0;
    const ordered = [...pool.slice(offset), ...pool.slice(0, offset)];
    const names = ordered.filter((name) => !used.has(name)).slice(0, perPole);
    if (names.length === 0) {
      continue;
    }
    names.forEach((name) => used.add(name));
    groups.push({ axis: score.axis, side: score.side, percent: score.percent, names });
  }

  return groups;
}

function toBase36(value: number): string {
  return value.toString(36);
}

function fromBase36(value: string): number {
  return parseInt(value, 36);
}

export interface ResultCodePayload {
  mode: QuizMode;
  seed: number;
  duration: number;
  /** 与题目顺序一一对应：0~4 为选项下标，5 表示跳过。 */
  digits: number[];
}

/**
 * 把一局的结果压成可分享的成绩码：模式 + 种子 + 用时 + 答案序列。
 * 形如 `F95734-1a-k3f9z2qx`，输入同一个码就能还原题目与分数。
 */
export function encodeResultCode(payload: ResultCodePayload): string {
  const base = BigInt(SCALE.length + 1);
  let packed = BigInt(0);
  for (const digit of payload.digits) {
    packed = packed * base + BigInt(digit);
  }
  const prefix = payload.mode === 'pro' ? 'P' : 'F';
  return `${prefix}${payload.seed}-${toBase36(Math.max(0, Math.round(payload.duration / 1000)))}-${packed.toString(36)}`;
}

export function decodeResultCode(code: string): ResultCodePayload | null {
  const match = /^([FP])(\d{5})-([0-9a-z]+)-([0-9a-z]+)$/i.exec(code.trim());
  if (!match) {
    return null;
  }
  const mode: QuizMode = match[1].toUpperCase() === 'P' ? 'pro' : 'fast';
  const seed = Number(match[2]);
  const duration = fromBase36(match[3].toLowerCase()) * 1000;
  const base = BigInt(SCALE.length + 1);
  let packed = BigInt(0);
  for (const char of match[4].toLowerCase()) {
    const value = parseInt(char, 36);
    if (Number.isNaN(value)) {
      return null;
    }
    packed = packed * BigInt(36) + BigInt(value);
  }

  const digits: number[] = [];
  while (packed > BigInt(0)) {
    digits.unshift(Number(packed % base));
    packed /= base;
  }
  const expected = QUIZ_MODES[mode].questions;
  if (digits.length > expected) {
    return null;
  }
  while (digits.length < expected) {
    digits.unshift(0);
  }
  return { mode, seed, duration, digits };
}

/** 由成绩码还原题目与答案，用于「查询成绩」。 */
export function decodeQuizCode(code: string): {
  quiz: QuizSet;
  answers: Record<string, number | undefined>;
  duration: number;
} | null {
  const payload = decodeResultCode(code);
  if (!payload) {
    return null;
  }
  const quiz = createQuiz(payload.seed, payload.mode);
  const answers: Record<string, number | undefined> = {};
  quiz.questions.forEach((question, index) => {
    const digit = payload.digits[index];
    answers[question.id] = digit === SKIPPED_DIGIT ? undefined : SCALE[digit]?.value;
  });
  return { quiz, answers, duration: payload.duration };
}

/** 把一局的答案转成成绩码。 */
export function resultCodeOf(
  quiz: QuizSet,
  answers: Record<string, number | undefined>,
  duration: number,
): string {
  const digits = quiz.questions.map((question) => {
    const value = answers[question.id];
    if (value === undefined) {
      return SKIPPED_DIGIT;
    }
    const index = SCALE.findIndex((option) => option.value === value);
    return index < 0 ? SKIPPED_DIGIT : index;
  });
  return encodeResultCode({ mode: quiz.mode, seed: quiz.seed, duration, digits });
}

export function formatDuration(duration: number): string {
  const seconds = Math.max(0, Math.round(duration / 1000));
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return minutes > 0 ? `${minutes}:${String(rest).padStart(2, '0')}` : `${rest}s`;
}
