/**
 * 「你是哪个声优」——你和哪位女声优最像（题库池、声优画像、匹配计分与成绩码）。
 *
 * 模型（对应型测验，参考 8values 的作答手感 + MBTI 式匹配）：
 * - 6 个气质维度，每个维度是一条 0 ~ 100 的坐标（50 = 中性，越低越偏 low 端，越高越偏 high 端）
 * - 每位候选声优在这 6 个维度上有一组人工设定的画像分（依据公开形象，仅供娱乐）
 * - 每题五档（强烈同意 +2 … 强烈反对 -2），题目挂 1~2 个维度并带方向；
 *   轴得分 = Σ(档位值 × 方向) / Σ(满分)，归一化到 -100 ~ +100，再换算成 0 ~ 100 坐标
 * - 相似度 = 100 - 六个维度上的平均绝对差，再按「名次曲线 + 绝对强度」折算成展示分
 *   （顶部几名是一条平滑缓坡，不会出现第 1 名 97、第 2 名 86 这种断层）
 *
 * 抽题：固定题库池随机抽题。快速 20 题（每维 3 题 + 2 题交叉），PRO 40 题（每维 6 题 + 4 题交叉）；
 * 同一个 seed 永远同一套题。每维的「同意偏高端」与「同意偏低端」题数差不超过 1，中立作答不会被推向某一侧。
 */

import {
  PROJECT_IDS,
  SEIYUU_BY_ID,
  SEIYUU_ROSTER,
  formatCharacter,
  type ProjectId,
  type SeiyuuIdentity,
} from '@seiyuu/shared';

export const TRAIT_IDS = ['mood', 'express', 'social', 'play', 'drive', 'taste'] as const;
export type TraitId = (typeof TRAIT_IDS)[number];

/** 维度的两端。low = 坐标 0 一侧，high = 坐标 100 一侧。 */
export type TraitSide = 'low' | 'high';

// 企划定义与声优身份档案统一由公共库（@seiyuu/shared）提供，这里只做转出，
// 方便玩法模块从同一处引用。
export {
  PROJECTS,
  PROJECT_IDS,
  SEIYUU_BY_ID,
  SEIYUU_ROSTER,
  formatCharacter,
  seiyuuById,
  seiyuuPhotoPath,
} from '@seiyuu/shared';
export type {
  ProjectId,
  RepresentativeCharacter,
  SeiyuuIdentity,
} from '@seiyuu/shared';

export type QuizMode = 'fast' | 'pro';
export type Rarity = 'normal' | 'rare' | 'epic' | 'legendary';

/** 五档选项，value 同时用于计分与统计。 */
export const SCALE = [
  { id: 'stronglyAgree', value: 2 },
  { id: 'agree', value: 1 },
  { id: 'neutral', value: 0 },
  { id: 'disagree', value: -1 },
  { id: 'stronglyDisagree', value: -2 },
] as const;

export type ScaleId = (typeof SCALE)[number]['id'];
export const SCALE_MAX = 2;
/** 未作答在成绩码里的占位数字。 */
const SKIPPED_DIGIT = SCALE.length;

export interface ModeConfig {
  /** 每个维度抽几题。 */
  perTrait: number;
  /** 交叉题抽几题。 */
  cross: number;
  questions: number;
}

/** 快速 24 题 / PRO 48 题（PRO 正好是快速的两倍，配比一致）。 */
export const QUIZ_MODES: Record<QuizMode, ModeConfig> = {
  fast: { perTrait: 3, cross: 6, questions: 24 },
  pro: { perTrait: 6, cross: 12, questions: 48 },
};

interface AxisBinding {
  axis: TraitId;
  /** +1：同意偏向 high 端；-1：同意偏向 low 端。 */
  direction: -1 | 1;
}

export interface WhoQuestion {
  /** 同时是 i18n 的键：whoYouAre.questions.<id>。 */
  id: string;
  /** 挂载的维度（交叉题两个）。 */
  axes: AxisBinding[];
}

/** 单维度题池。每个维度 8 题：4 题「同意偏高端」+ 4 题「同意偏低端」。 */
const AXIS_POOL: WhoQuestion[] = [
  { id: 'm1', axes: [{ axis: 'mood', direction: 1 }] },
  { id: 'm2', axes: [{ axis: 'mood', direction: -1 }] },
  { id: 'm3', axes: [{ axis: 'mood', direction: 1 }] },
  { id: 'm4', axes: [{ axis: 'mood', direction: -1 }] },
  { id: 'm5', axes: [{ axis: 'mood', direction: 1 }] },
  { id: 'm6', axes: [{ axis: 'mood', direction: -1 }] },
  { id: 'm7', axes: [{ axis: 'mood', direction: 1 }] },
  { id: 'm8', axes: [{ axis: 'mood', direction: -1 }] },
  { id: 'm9', axes: [{ axis: 'mood', direction: 1 }] },
  { id: 'm10', axes: [{ axis: 'mood', direction: -1 }] },
  { id: 'm11', axes: [{ axis: 'mood', direction: 1 }] },
  { id: 'm12', axes: [{ axis: 'mood', direction: -1 }] },
  { id: 'e1', axes: [{ axis: 'express', direction: 1 }] },
  { id: 'e2', axes: [{ axis: 'express', direction: -1 }] },
  { id: 'e3', axes: [{ axis: 'express', direction: 1 }] },
  { id: 'e4', axes: [{ axis: 'express', direction: -1 }] },
  { id: 'e5', axes: [{ axis: 'express', direction: 1 }] },
  { id: 'e6', axes: [{ axis: 'express', direction: -1 }] },
  { id: 'e7', axes: [{ axis: 'express', direction: 1 }] },
  { id: 'e8', axes: [{ axis: 'express', direction: -1 }] },
  { id: 'e9', axes: [{ axis: 'express', direction: 1 }] },
  { id: 'e10', axes: [{ axis: 'express', direction: -1 }] },
  { id: 'e11', axes: [{ axis: 'express', direction: 1 }] },
  { id: 'e12', axes: [{ axis: 'express', direction: -1 }] },
  { id: 's1', axes: [{ axis: 'social', direction: 1 }] },
  { id: 's2', axes: [{ axis: 'social', direction: -1 }] },
  { id: 's3', axes: [{ axis: 'social', direction: 1 }] },
  { id: 's4', axes: [{ axis: 'social', direction: -1 }] },
  { id: 's5', axes: [{ axis: 'social', direction: 1 }] },
  { id: 's6', axes: [{ axis: 'social', direction: -1 }] },
  { id: 's7', axes: [{ axis: 'social', direction: 1 }] },
  { id: 's8', axes: [{ axis: 'social', direction: -1 }] },
  { id: 's9', axes: [{ axis: 'social', direction: 1 }] },
  { id: 's10', axes: [{ axis: 'social', direction: -1 }] },
  { id: 's11', axes: [{ axis: 'social', direction: 1 }] },
  { id: 's12', axes: [{ axis: 'social', direction: -1 }] },
  { id: 'p1', axes: [{ axis: 'play', direction: 1 }] },
  { id: 'p2', axes: [{ axis: 'play', direction: -1 }] },
  { id: 'p3', axes: [{ axis: 'play', direction: 1 }] },
  { id: 'p4', axes: [{ axis: 'play', direction: -1 }] },
  { id: 'p5', axes: [{ axis: 'play', direction: 1 }] },
  { id: 'p6', axes: [{ axis: 'play', direction: -1 }] },
  { id: 'p7', axes: [{ axis: 'play', direction: 1 }] },
  { id: 'p8', axes: [{ axis: 'play', direction: -1 }] },
  { id: 'p9', axes: [{ axis: 'play', direction: 1 }] },
  { id: 'p10', axes: [{ axis: 'play', direction: -1 }] },
  { id: 'p11', axes: [{ axis: 'play', direction: 1 }] },
  { id: 'p12', axes: [{ axis: 'play', direction: -1 }] },
  { id: 'd1', axes: [{ axis: 'drive', direction: 1 }] },
  { id: 'd2', axes: [{ axis: 'drive', direction: -1 }] },
  { id: 'd3', axes: [{ axis: 'drive', direction: 1 }] },
  { id: 'd4', axes: [{ axis: 'drive', direction: -1 }] },
  { id: 'd5', axes: [{ axis: 'drive', direction: 1 }] },
  { id: 'd6', axes: [{ axis: 'drive', direction: -1 }] },
  { id: 'd7', axes: [{ axis: 'drive', direction: 1 }] },
  { id: 'd8', axes: [{ axis: 'drive', direction: -1 }] },
  { id: 'd9', axes: [{ axis: 'drive', direction: 1 }] },
  { id: 'd10', axes: [{ axis: 'drive', direction: -1 }] },
  { id: 'd11', axes: [{ axis: 'drive', direction: 1 }] },
  { id: 'd12', axes: [{ axis: 'drive', direction: -1 }] },
  { id: 't1', axes: [{ axis: 'taste', direction: 1 }] },
  { id: 't2', axes: [{ axis: 'taste', direction: -1 }] },
  { id: 't3', axes: [{ axis: 'taste', direction: 1 }] },
  { id: 't4', axes: [{ axis: 'taste', direction: -1 }] },
  { id: 't5', axes: [{ axis: 'taste', direction: 1 }] },
  { id: 't6', axes: [{ axis: 'taste', direction: -1 }] },
  { id: 't7', axes: [{ axis: 'taste', direction: 1 }] },
  { id: 't8', axes: [{ axis: 'taste', direction: -1 }] },
  { id: 't9', axes: [{ axis: 'taste', direction: 1 }] },
  { id: 't10', axes: [{ axis: 'taste', direction: -1 }] },
  { id: 't11', axes: [{ axis: 'taste', direction: 1 }] },
  { id: 't12', axes: [{ axis: 'taste', direction: -1 }] },
];

/** 交叉题池：一题同时测两个维度，用来打破「一条线答到底」的惯性。 */
export const CROSS_POOL: WhoQuestion[] = [
  { id: 'c1', axes: [{ axis: 'mood', direction: 1 }, { axis: 'express', direction: 1 }] },
  { id: 'c2', axes: [{ axis: 'express', direction: 1 }, { axis: 'social', direction: -1 }] },
  { id: 'c3', axes: [{ axis: 'social', direction: 1 }, { axis: 'taste', direction: -1 }] },
  { id: 'c4', axes: [{ axis: 'drive', direction: 1 }, { axis: 'express', direction: 1 }] },
  { id: 'c5', axes: [{ axis: 'play', direction: -1 }, { axis: 'express', direction: -1 }] },
  { id: 'c6', axes: [{ axis: 'drive', direction: 1 }, { axis: 'taste', direction: 1 }] },
  { id: 'c7', axes: [{ axis: 'social', direction: -1 }, { axis: 'play', direction: 1 }] },
  { id: 'c8', axes: [{ axis: 'social', direction: -1 }, { axis: 'drive', direction: 1 }] },
  { id: 'c9', axes: [{ axis: 'mood', direction: 1 }, { axis: 'play', direction: 1 }] },
  { id: 'c10', axes: [{ axis: 'mood', direction: -1 }, { axis: 'taste', direction: 1 }] },
  { id: 'c11', axes: [{ axis: 'express', direction: -1 }, { axis: 'drive', direction: 1 }] },
  { id: 'c12', axes: [{ axis: 'social', direction: 1 }, { axis: 'drive', direction: -1 }] },
  { id: 'c13', axes: [{ axis: 'play', direction: -1 }, { axis: 'taste', direction: 1 }] },
  { id: 'c14', axes: [{ axis: 'mood', direction: 1 }, { axis: 'social', direction: 1 }] },
  { id: 'c15', axes: [{ axis: 'express', direction: 1 }, { axis: 'taste', direction: -1 }] },
  { id: 'c16', axes: [{ axis: 'drive', direction: 1 }, { axis: 'play', direction: -1 }] },
];

/** 全部题库，用于校对所有题都有文案。 */
export const ALL_QUESTIONS: WhoQuestion[] = [...AXIS_POOL, ...CROSS_POOL];

export const POOL_SIZE = ALL_QUESTIONS.length;

/** 每个维度的单维度题池（按方向分开，抽题时保证均衡）。 */
const POOL_BY_TRAIT: Record<TraitId, { high: WhoQuestion[]; low: WhoQuestion[] }> = TRAIT_IDS.reduce(
  (accumulator, trait) => {
    const own = AXIS_POOL.filter((question) => question.axes[0].axis === trait);
    accumulator[trait] = {
      high: own.filter((question) => question.axes[0].direction === 1),
      low: own.filter((question) => question.axes[0].direction === -1),
    };
    return accumulator;
  },
  {} as Record<TraitId, { high: WhoQuestion[]; low: WhoQuestion[] }>,
);

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

export interface WhoQuizSet {
  seed: number;
  mode: QuizMode;
  questions: WhoQuestion[];
}

/**
 * 抽出一局题目。同一个 seed + 模式永远得到同一套题，方便复现与分享。
 * 每维抽 count 题时，两种方向的题数最多差 1（奇数时由 seed 决定哪一侧多一题）。
 */
export function createQuiz(seed: number = randomSeed(), mode: QuizMode = 'fast'): WhoQuizSet {
  const config = QUIZ_MODES[mode];
  const random = mulberry32(seed);

  const picked: WhoQuestion[] = [];
  for (const trait of TRAIT_IDS) {
    const { high, low } = POOL_BY_TRAIT[trait];
    const highFirst = random() < 0.5;
    const highCount = highFirst ? Math.ceil(config.perTrait / 2) : Math.floor(config.perTrait / 2);
    const lowCount = config.perTrait - highCount;
    picked.push(...shuffle(high, random).slice(0, highCount));
    picked.push(...shuffle(low, random).slice(0, lowCount));
  }

  const cross = shuffle(CROSS_POOL, random).slice(0, config.cross);
  return { seed, mode, questions: shuffle([...picked, ...cross], random) };
}

/** 用户坐标：每个维度 0 ~ 100。 */
export type TraitVector = Record<TraitId, number>;

export interface TraitScore {
  trait: TraitId;
  /** 原始加权分，负值偏 low 端。 */
  raw: number;
  /** 归一化强度，-100 ~ +100。 */
  percent: number;
  /** 0 ~ 100 的坐标值。 */
  coord: number;
  /** 偏离中性的强度 0 ~ 100。 */
  strength: number;
}

/**
 * 玩法视角的候选档案 = 公共库身份档案（姓名/罗马字/企划/代表角色） + 本测验的气质画像分。
 *
 * 身份信息一律从 `@seiyuu/shared` 取，别在本模块里重写；
 * `chibi` 是主要代表角色的展示串，由身份档案推导出来。
 */
export interface SeiyuuProfile extends SeiyuuIdentity {
  /** 代表角色，形如「涩谷香音（Love Live! Superstar!!）」。 */
  chibi: string;
  traits: TraitVector;
}

/** 画像分种子：只存 id 与分数，身份信息去公共库查。 */
interface TraitSeed {
  /** 对应公共库 `SEIYUU_ROSTER` 的 id。 */
  id: string;
  /** 顺序固定为 TRAIT_IDS：mood / express / social / play / drive / taste。 */
  traits: [number, number, number, number, number, number];
}

/**
 * 候选声优的气质画像分，覆盖公共库 `SEIYUU_ROSTER` 里的**每一位**。
 *
 * 库里新增声优后必须在这里补分，否则 `PROFILES` 会直接抛错（测试会拦住）。
 * 分数是人工设定的「公开形象印象值」，不是客观事实，仅供娱乐；
 * 顺序固定为 mood / express / social / play / drive / taste。
 */
const TRAIT_SEEDS: TraitSeed[] = [
  /* ---- LoveLive! ---- */
  { id: 'aoyama-nagisa', traits: [72, 66, 62, 50, 74, 56] },
  { id: 'maeda-kaori', traits: [66, 62, 58, 68, 70, 60] },
  { id: 'kito-akari', traits: [48, 52, 46, 40, 78, 64] },
  { id: 'sashide-maria', traits: [58, 54, 52, 46, 64, 50] },
  { id: 'kubota-miyu', traits: [70, 64, 66, 76, 62, 48] },
  { id: 'tanaka-chiemi', traits: [62, 58, 56, 50, 60, 46] },
  { id: 'sagara-mayu', traits: [46, 44, 42, 38, 66, 44] },
  { id: 'murakami-natsumi', traits: [76, 70, 72, 80, 58, 44] },
  { id: 'uchida-shuu', traits: [78, 72, 74, 66, 76, 70] },
  { id: 'houmoto-akina', traits: [62, 56, 58, 62, 60, 78] },
  { id: 'saito-shuka', traits: [74, 68, 70, 82, 60, 52] },
  { id: 'aida-rikako', traits: [54, 50, 48, 44, 72, 58] },
  { id: 'mimori-suzuko', traits: [70, 66, 68, 54, 76, 62] },
  { id: 'kohara-konomi', traits: [60, 56, 54, 62, 58, 48] },
  { id: 'hanamiya-hina', traits: [44, 46, 40, 36, 80, 66] },
  { id: 'date-sayuri', traits: [88, 82, 76, 58, 80, 68] },
  { id: 'liyuu', traits: [84, 78, 82, 72, 74, 78] },
  { id: 'misaki-nako', traits: [70, 68, 74, 56, 72, 62] },
  { id: 'payton-naomi', traits: [86, 72, 88, 66, 70, 74] },
  { id: 'suzuhara-nozomi', traits: [76, 74, 68, 54, 70, 58] },
  { id: 'yabushima-akane', traits: [80, 70, 78, 60, 68, 72] },
  { id: 'okuma-wakana', traits: [66, 72, 70, 74, 64, 62] },
  { id: 'emori-aya', traits: [82, 76, 72, 58, 72, 66] },
  { id: 'yuina', traits: [62, 70, 66, 68, 74, 70] },
  { id: 'sakakura-hana', traits: [74, 66, 70, 56, 68, 64] },
  { id: 'ohnishi-aguri', traits: [58, 56, 52, 44, 62, 50] },
  { id: 'koizumi-moeka', traits: [34, 40, 40, 48, 72, 66] },
  { id: 'inami-anju', traits: [90, 86, 84, 76, 66, 62] },
  { id: 'furihata-ai', traits: [56, 54, 62, 52, 44, 34] },
  { id: 'kusunoki-tomoyo', traits: [30, 34, 36, 46, 78, 32] },
  { id: 'nirei-kisara', traits: [78, 72, 68, 52, 70, 56] },

  /* ---- BanG Dream! ---- */
  { id: 'itou-ayasa', traits: [78, 72, 74, 84, 56, 46] },
  { id: 'kudou-haruka', traits: [52, 50, 48, 44, 74, 68] },
  { id: 'nakajima-yuki', traits: [58, 54, 56, 48, 76, 60] },
  { id: 'sakuragawa-meggu', traits: [80, 74, 76, 82, 64, 50] },
  { id: 'misawa-sachika', traits: [56, 52, 50, 46, 82, 72] },
  { id: 'ozawa-ari', traits: [72, 66, 64, 58, 60, 42] },
  { id: 'toyota-moe', traits: [50, 46, 44, 40, 68, 54] },
  { id: 'shindou-amane', traits: [48, 52, 44, 42, 78, 58] },
  { id: 'naota-hina', traits: [68, 64, 62, 56, 62, 48] },
  { id: 'hayashi-koko', traits: [62, 60, 58, 66, 70, 52] },
  { id: 'okada-mei', traits: [54, 58, 50, 46, 80, 66] },
  { id: 'sasaki-riko', traits: [46, 50, 44, 40, 84, 62] },
  { id: 'watase-yuzuki', traits: [40, 42, 38, 36, 76, 70] },
  { id: 'yonezawa-akane', traits: [70, 68, 74, 80, 72, 70] },
  { id: 'aimi', traits: [86, 78, 80, 62, 82, 58] },
  { id: 'aiba-aina', traits: [76, 80, 74, 60, 88, 62] },
  { id: 'itou-miku', traits: [60, 50, 54, 42, 52, 44] },
  { id: 'ohashi-ayaka', traits: [82, 76, 82, 88, 58, 30] },
  { id: 'takao-kanon', traits: [34, 38, 38, 44, 80, 30] },
  { id: 'hina-youmiya', traits: [32, 36, 34, 38, 76, 30] },
  { id: 'tateishi-rin', traits: [80, 74, 78, 86, 60, 34] },
  { id: 'aoki-hina', traits: [48, 44, 46, 84, 48, 32] },
  { id: 'kohinata-mika', traits: [46, 42, 44, 44, 68, 40] },

  /* ---- Project SEKAI ---- */
  { id: 'kino-hina', traits: [74, 70, 68, 72, 58, 46] },
  { id: 'motoizumi-rina', traits: [56, 52, 50, 44, 66, 50] },
  { id: 'tanabe-rui', traits: [42, 44, 40, 38, 72, 56] },
  { id: 'yoshioka-mayu', traits: [66, 62, 60, 54, 74, 52] },
  { id: 'noguchi-ruriko', traits: [84, 76, 72, 56, 78, 54] },
  { id: 'akina', traits: [52, 46, 48, 42, 50, 46] },
  { id: 'isobe-karin', traits: [78, 70, 70, 52, 72, 56] },
  { id: 'ogura-yui', traits: [66, 58, 56, 46, 70, 52] },
  { id: 'suzuki-minori', traits: [40, 42, 42, 76, 74, 36] },
  { id: 'satou-hinata', traits: [74, 68, 72, 88, 58, 30] },

  /* ---- 偶像大师 ---- */
  { id: 'nakamura-eriko', traits: [72, 68, 70, 64, 78, 54] },
  { id: 'asakura-azumi', traits: [54, 50, 46, 42, 70, 48] },
  { id: 'numakura-manami', traits: [62, 58, 56, 52, 80, 60] },
  { id: 'shimoda-asami', traits: [76, 72, 68, 78, 66, 58] },
  { id: 'taneda-risa', traits: [48, 46, 44, 40, 76, 62] },
  { id: 'ootsuka-yuka', traits: [70, 66, 64, 60, 58, 44] },
  { id: 'imai-asami', traits: [58, 62, 66, 48, 86, 54] },
  { id: 'hasegawa-akiko', traits: [50, 44, 50, 40, 42, 48] },
  { id: 'hara-sayuri', traits: [76, 68, 74, 56, 68, 58] },
  { id: 'kuroki-honoka', traits: [52, 46, 46, 42, 62, 48] },

  /* ---- 学园偶像大师 ---- */
  { id: 'minato-miya', traits: [50, 48, 46, 42, 74, 60] },
  { id: 'hanaiwa-kana', traits: [56, 54, 52, 48, 72, 54] },
  { id: 'usui-yuri', traits: [64, 60, 58, 52, 68, 50] },
  { id: 'takasago-mashiro', traits: [80, 74, 72, 58, 84, 56] },
  { id: 'nagatsuki-aoi', traits: [84, 78, 70, 54, 88, 60] },
  { id: 'koshika-nao', traits: [36, 34, 36, 42, 82, 30] },
  { id: 'iida-hikaru', traits: [80, 74, 76, 74, 62, 52] },
  { id: 'kawamura-rena', traits: [34, 36, 38, 44, 76, 32] },

  /* ---- 赛马娘 ---- */
  { id: 'saitou-machico', traits: [78, 72, 74, 66, 76, 54] },
  { id: 'tadokoro-azusa', traits: [60, 56, 54, 48, 82, 58] },
  { id: 'oozora-naomi', traits: [74, 70, 68, 74, 64, 46] },
  { id: 'tatsumi-yuiko', traits: [52, 48, 46, 42, 66, 52] },
  { id: 'shinohara-yu', traits: [58, 54, 52, 46, 70, 56] },
  { id: 'tokui-sora', traits: [82, 76, 78, 86, 62, 68] },
  { id: 'waki-azumi', traits: [82, 76, 78, 66, 54, 56] },
  { id: 'takano-marika', traits: [50, 44, 44, 44, 68, 34] },
  { id: 'ueda-hitomi', traits: [74, 82, 76, 86, 82, 58] },
  { id: 'yano-hinaki', traits: [54, 48, 46, 42, 66, 46] },

  /* ---- 少女☆歌剧 Revue Starlight ---- */
  { id: 'ikuta-teru', traits: [66, 62, 60, 56, 84, 64] },
  { id: 'koyama-momoyo', traits: [80, 74, 74, 58, 76, 54] },
  { id: 'iwata-haruki', traits: [48, 46, 44, 48, 62, 36] },
  { id: 'tomita-maho', traits: [52, 56, 54, 46, 80, 74] },

  /* ---- D4DJ ---- */
  { id: 'kurahashi-rei', traits: [60, 56, 58, 52, 74, 62] },
  { id: 'takagi-miyu', traits: [72, 66, 68, 70, 60, 48] },
  { id: 'kozaki-kanon', traits: [44, 46, 42, 40, 78, 66] },
  { id: 'ootsuka-sae', traits: [68, 64, 62, 76, 58, 50] },
  { id: 'nishio-yuka', traits: [84, 80, 80, 82, 62, 50] },
  { id: 'tsumugi-risa', traits: [42, 44, 48, 66, 78, 56] },
];

const TRAIT_BY_ID = new Map(TRAIT_SEEDS.map((seed) => [seed.id, seed.traits]));

for (const identity of SEIYUU_ROSTER) {
  if (!TRAIT_BY_ID.has(identity.id)) {
    throw new Error(`whoYouAre: 公共库里的「${identity.id}」缺少气质画像分，请在 TRAIT_SEEDS 里补上`);
  }
}

/** 身份档案（公共库） + 画像分（本模块）拼装成候选列表，顺序与公共库一致。 */
export const PROFILES: SeiyuuProfile[] = SEIYUU_ROSTER.map((identity) => {
  const traits = TRAIT_BY_ID.get(identity.id) as [
    number,
    number,
    number,
    number,
    number,
    number,
  ];
  return {
    ...identity,
    chibi: formatCharacter(identity.characters[0]),
    traits: TRAIT_IDS.reduce((vector, trait, index) => {
      vector[trait] = traits[index];
      return vector;
    }, {} as TraitVector),
  };
});

export const PROFILE_COUNT = PROFILES.length;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** 算出用户六个维度的坐标。 */
export function scoreTraits(
  questions: WhoQuestion[],
  answers: Record<string, number | undefined>,
): TraitScore[] {
  const raw: Record<TraitId, number> = TRAIT_IDS.reduce((accumulator, trait) => {
    accumulator[trait] = 0;
    return accumulator;
  }, {} as Record<TraitId, number>);
  const max: Record<TraitId, number> = { ...raw };

  for (const question of questions) {
    const value = answers[question.id];
    if (value === undefined) {
      continue;
    }
    for (const binding of question.axes) {
      raw[binding.axis] += value * binding.direction;
      max[binding.axis] += SCALE_MAX;
    }
  }

  return TRAIT_IDS.map((trait) => {
    const percent = max[trait] === 0 ? 0 : clamp((raw[trait] / max[trait]) * 100, -100, 100);
    return {
      trait,
      raw: raw[trait],
      percent,
      coord: 50 + percent / 2,
      strength: Math.abs(percent),
    };
  });
}

export type MatchVerdict = 'soulmate' | 'close' | 'similar' | 'spark' | 'contrast';

/** 相似度定性（用于结果页的一句话结论）。 */
export function verdictOf(score: number): MatchVerdict {
  if (score >= 92) return 'soulmate';
  if (score >= 82) return 'close';
  if (score >= 70) return 'similar';
  if (score >= 60) return 'spark';
  return 'contrast';
}

export interface MatchEntry {
  id: string;
  name: string;
  project: ProjectId;
  chibi: string;
  /** 名次折算后的展示相似度（约 42 ~ 97）。 */
  score: number;
  /** 六个维度上的平均绝对差（越小越像）。 */
  diff: number;
  /** 最接近的维度（最多 3 个）。 */
  closest: { trait: TraitId; diff: number }[];
  /** 差得最远的维度。 */
  farthest: { trait: TraitId; diff: number };
}

export interface WhoStats {
  total: number;
  answered: number;
  skipped: number;
  duration: number;
  allAgree: boolean;
  allDisagree: boolean;
  allNeutral: boolean;
  /** 六维全部落在 45 ~ 55 的中性区间。 */
  flat: boolean;
  /** 至少 4 个维度的强度 ≥ 85。 */
  polar: boolean;
  /** 答完时用时不到 40 秒。 */
  speedrun: boolean;
}

export interface WhoResult {
  mode: QuizMode;
  seed: number;
  stats: WhoStats;
  /** 用户自己的六维坐标。 */
  coord: TraitVector;
  /** 每个维度的详细分数。 */
  traits: TraitScore[];
  /** 全部候选按相似度降序。 */
  ranking: MatchEntry[];
  /** 与用户最不像的那位（反差萌）。 */
  contrast: MatchEntry;
  rarity: Rarity;
  egg?: { id: string; rarity: Rarity };
}

/**
 * 展示相似度：名次曲线 + 绝对强度两层叠加。
 *
 * 之前是「池内线性拉伸到 55~97」：第 1 名恒为 97，而第 2 名可能只有 86，顶部几个的差距
 * 会大得莫名其妙，而且不管你和谁都不像，第一名也照样 97。
 *
 * - 名次曲线 `(1 - rank/(n-1)) ** RANK_CURVE`：名次越靠前，相邻名次的分数越接近（约 1 分一档），
 *   整体是「顶部密集、尾部拉开」的斜率 → 前几名是一条平滑的缓坡，不会出现断层。
 * - 绝对强度：raw（100 - 六维平均绝对差）在 [STRENGTH_FLOOR, STRENGTH_CEIL] 上取 0~1，
 *   按 STRENGTH_WEIGHT 混进结果。于是「和谁都不太像」时第一名落在 90 分附近，
 *   「一看就是你」才会顶到 97 —— 不同人的结果因此更有区分度。
 *
 * 实测（600 局模拟）：第 1~7 名相邻差距 p90 ≤ 2 分（旧算法最大 11 分），
 * 第一名在 91~97 之间浮动，末位约 42~46。
 */
const SCORE_TOP = 97;
const SCORE_BOTTOM = 42;
const RANK_CURVE = 2.2;
const STRENGTH_WEIGHT = 0.18;
const STRENGTH_FLOOR = 68;
const STRENGTH_CEIL = 95;

/** 名次 + 绝对强度 → 展示相似度（随名次单调不增）。 */
function displayScore(rank: number, count: number, raw: number): number {
  const rankPart = count <= 1 ? 1 : (1 - rank / (count - 1)) ** RANK_CURVE;
  const strength = clamp((raw - STRENGTH_FLOOR) / (STRENGTH_CEIL - STRENGTH_FLOOR), 0, 1);
  const blended = (1 - STRENGTH_WEIGHT) * rankPart + STRENGTH_WEIGHT * strength;
  return Math.round(SCORE_BOTTOM + (SCORE_TOP - SCORE_BOTTOM) * blended);
}

export function scoreWho(
  quiz: WhoQuizSet,
  answers: Record<string, number | undefined>,
  duration = 0,
): WhoResult {
  const questions = quiz.questions;
  const traits = scoreTraits(questions, answers);
  const coord = TRAIT_IDS.reduce((vector, trait) => {
    vector[trait] = traits.find((item) => item.trait === trait)?.coord ?? 50;
    return vector;
  }, {} as TraitVector);

  const raws = PROFILES.map((profile) => {
    const diffs = TRAIT_IDS.map((trait) => ({
      trait,
      diff: Math.abs(coord[trait] - profile.traits[trait]),
    }));
    const mean = diffs.reduce((sum, item) => sum + item.diff, 0) / diffs.length;
    const sorted = [...diffs].sort((a, b) => a.diff - b.diff);
    return {
      profile,
      mean,
      raw: 100 - mean,
      closest: sorted.slice(0, 3),
      farthest: sorted[sorted.length - 1],
    };
  });

  // 先按 raw 降序定名次（raw = 100 - 平均绝对差），再折算展示分，保证分数随名次单调不增。
  const ranked = [...raws].sort((a, b) => b.raw - a.raw);
  const count = ranked.length;

  const ranking: MatchEntry[] = ranked.map((item, rank) => ({
    id: item.profile.id,
    name: item.profile.name,
    project: item.profile.project,
    chibi: item.profile.chibi,
    diff: Math.round(item.mean * 10) / 10,
    score: displayScore(rank, count, item.raw),
    closest: item.closest.map((entry) => ({ trait: entry.trait, diff: Math.round(entry.diff) })),
    farthest: { trait: item.farthest.trait, diff: Math.round(item.farthest.diff) },
  }));

  const values = questions
    .map((question) => answers[question.id])
    .filter((value): value is number => value !== undefined);

  const stats: WhoStats = {
    total: questions.length,
    answered: values.length,
    skipped: questions.length - values.length,
    duration,
    allAgree: values.length === questions.length && values.every((value) => value === SCALE_MAX),
    allDisagree: values.length === questions.length && values.every((value) => value === -SCALE_MAX),
    allNeutral: values.length === questions.length && values.every((value) => value === 0),
    flat: traits.every((item) => Math.abs(item.coord - 50) <= 5),
    polar: traits.filter((item) => item.strength >= 85).length >= 4,
    speedrun: duration > 0 && duration < 40_000 && values.length === questions.length,
  };

  const egg = EGGS.find((item) => item.check(stats));
  const rarity: Rarity = egg?.rarity ?? (stats.polar ? 'rare' : 'normal');

  return {
    mode: quiz.mode,
    seed: quiz.seed,
    stats,
    coord,
    traits,
    ranking,
    contrast: ranking[ranking.length - 1],
    rarity,
    egg: egg ? { id: egg.id, rarity: egg.rarity } : undefined,
  };
}

interface EggDefinition {
  id: string;
  rarity: Rarity;
  check: (stats: WhoStats) => boolean;
  /**
   * 彩蛋人物的档案 id（头像走 `/seiyuu/<person>.jpg`，与公式照同一个目录）。
   *
   * ⚠️ 彩蛋人物**只以隐藏结果的形式存在**，绝不能写进 `PROFILES` / `@seiyuu/shared` 名册：
   * 一旦进了候选池，他会出现在所有人的「相似度排行榜」里。
   */
  person?: string;
}

/**
 * 彩蛋：条件越苛刻越稀有，取第一个命中的。
 *
 * `e_all_agree`（全选强烈同意）显示的是**彩蛋人物木谷高明**（武士道创立者兼社长，业界著名「炒作」体质）：
 * 什么都说「强烈同意」不是共鸣，是只喜欢热度。文案见 i18n 的 `whoYouAre.eggs/eggRole/eggDesc.e_all_agree`。
 *
 * 他**不在 `PROFILES` 里**，所以不会出现在相似度排行榜 —— 想验证可以看 `whoYouAre.test.ts`
 * 里那条「彩蛋人物不进候选池」。
 */
export const EGGS: EggDefinition[] = [
  {
    id: 'e_all_agree',
    rarity: 'legendary',
    check: (s) => s.allAgree,
    person: 'kidani-takaaki',
  },
  { id: 'e_all_disagree', rarity: 'legendary', check: (s) => s.allDisagree },
  { id: 'e_speedrun', rarity: 'legendary', check: (s) => s.speedrun && s.polar },
  { id: 'e_all_neutral', rarity: 'epic', check: (s) => s.allNeutral },
  { id: 'e_flat', rarity: 'epic', check: (s) => s.flat && s.answered >= 10 },
  { id: 'e_polar', rarity: 'epic', check: (s) => s.polar },
  { id: 'e_speed', rarity: 'rare', check: (s) => s.speedrun },
  { id: 'e_skipped', rarity: 'rare', check: (s) => s.total > 0 && s.skipped / s.total > 0.3 },
];

function toBase36(value: number): string {
  return value.toString(36);
}

function fromBase36(value: string): number {
  return parseInt(value, 36);
}

/**
 * 把一局压成可分享的成绩码：模式 + 种子 + 用时 + 答案序列。
 * 形如 `WF95734-1a-k3f9z2qx`，输入同一个码就能还原题目与结果。
 */
export function resultCodeOf(
  quiz: WhoQuizSet,
  answers: Record<string, number | undefined>,
  duration: number,
): string {
  const base = BigInt(SCALE.length + 1);
  let packed = BigInt(0);
  for (const question of quiz.questions) {
    const value = answers[question.id];
    const digit = value === undefined ? SKIPPED_DIGIT : SCALE.findIndex((item) => item.value === value);
    packed = packed * base + BigInt(Math.max(0, digit));
  }
  const prefix = quiz.mode === 'pro' ? 'WP' : 'WF';
  // 种子固定补齐到 5 位，解码端按 5 位校验
  return `${prefix}${String(Math.max(0, quiz.seed)).padStart(5, '0')}-${toBase36(
    Math.max(0, Math.round(duration / 1000)),
  )}-${packed.toString(36)}`;
}

export interface WhoCodePayload {
  mode: QuizMode;
  seed: number;
  duration: number;
  digits: number[];
}

export function decodeWhoCode(code: string): WhoCodePayload | null {
  const match = /^W([FP])(\d{5})-([0-9a-z]+)-([0-9a-z]+)$/i.exec(code.trim());
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
export function decodeWhoQuizCode(code: string): {
  quiz: WhoQuizSet;
  answers: Record<string, number | undefined>;
  duration: number;
} | null {
  const payload = decodeWhoCode(code);
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

/** 毫秒转「1 分 23 秒」。 */
export function formatDuration(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.round(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes} 分 ${seconds} 秒` : `${seconds} 秒`;
}

/** 成绩码里前 5 位种子的展示用文本。 */
export function seedLabel(seed: number): string {
  return String(seed);
}

export type { AxisBinding };
