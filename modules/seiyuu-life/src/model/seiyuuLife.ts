/**
 * 「声优人生重开」——从新人声优开始，8 个岔路口选完，给一个结局，
 * 再配一位「和你的经历最相似」的现役声优。
 *
 * 玩法：
 * - 8 个阶段各 2~3 个选项，选项改五项数值（演技 / 歌唱 / 知名度 / 体力 / 运气），
 *   并可能挂上路径标签（偶像企划、乐队、广播、游戏、讲师、大所、自由身……）。
 * - 结算时按「体力 → 讲师 → 数值 + 标签」的优先级匹配结局，**一定命中一个**。
 * - 结局再决定匹配池（自由身 / 大所 / 偶像系 / 乐队系 / 舞台系 / 不限），
 *   用同一个 seed 从主推范围里抽一位「和你最像的」。
 *
 * 纯逻辑：所有随机都走注入的 `random()`，同一个 seed 可复现；
 * 数值全部 clamp 到 0~100，避免极端路线把后续判据算歪。
 */

import { SEIYUU_BY_ID, seiyuuPhotoPath, type SeiyuuIdentity } from '@seiyuu/shared';
import { agencyOf } from '@seiyuu/shared';
import { FANDOM_IDS, FANDOM_PROJECT_IDS } from '@seiyuu/game-sdk';

/** 五项数值的上限（下限固定为 0）。 */
export const LIFE_MAX = 100;

/** 开局数值：刚毕业的新人，什么都不多，只有体力。 */
export const LIFE_INITIAL_STATS: LifeStats = {
  skill: 20,
  vocal: 20,
  fame: 5,
  stamina: 86,
  luck: 30,
};

export interface LifeStats {
  /** 演技（配音功底）。 */
  skill: number;
  /** 歌唱 / 舞台表现。 */
  vocal: number;
  /** 知名度。 */
  fame: number;
  /** 体力。低到 15 以下会走「身体垮掉」结局。 */
  stamina: number;
  /** 运气 / 人脉。 */
  luck: number;
}

/** 数值键的展示顺序（页面与分享图都用它，保证顺序一致）。 */
export const LIFE_STAT_KEYS: (keyof LifeStats)[] = [
  'skill',
  'vocal',
  'fame',
  'stamina',
  'luck',
];

/** 路径标签：只影响结局判定与匹配池，不直接展示。 */
export type LifePathTag =
  | 'bigAgency'
  | 'smallAgency'
  | 'freelance'
  | 'idol'
  | 'band'
  | 'stage'
  | 'anime'
  | 'game'
  | 'radio'
  | 'teacher'
  | 'variety'
  | 'streamer'
  /** 拿过声优奖（突发事件里的好结果）。 */
  | 'award'
  /** 以歌手身份出道 / 出过单曲。 */
  | 'anison'
  /** 海外也吃得开（漫展、巡演、流媒体）。 */
  | 'overseas';

export interface LifeOption {
  /** i18n 键后缀：`seiyuuLife.stages.<nodeId>.options.<id>`。 */
  id: string;
  effects: Partial<LifeStats>;
  tags?: LifePathTag[];
  /** 选完去哪个岔路口；不写表示这一生到这里结束（只有最后一关这么写）。 */
  next?: string;
}

export interface LifeNode {
  /** i18n 键后缀：`seiyuuLife.stages.<id>`。 */
  id: string;
  options: LifeOption[];
}

/** 一开始站在哪个岔路口。 */
export const LIFE_START_NODE = 'start';

/** 最长路径的步数（提示玩家这一生大概多长）。 */
export const LIFE_PATH_LENGTH = 14;

/** 单步效果的随机浮动：±15%，让同一套选择也不会每次一模一样。 */
export const LIFE_OPTION_JITTER = 0.15;

/**
 * 16 个岔路口，走一条约 12~13 步。
 *
 * 不是一条直线：起点之后按「上京 / 专门学校 / 老家」分成三支，
 * 组了团的人会先撞上「团还保不保」，走爆红那条路的人还会翻一次车。
 * 每条选项的 `next` 指向下一个岔路口，不写就是人生收尾。
 */
export const LIFE_NODES: LifeNode[] = [
  {
    id: 'start',
    options: [
      { id: 'tokyo', next: 'agency', effects: { luck: 6, fame: 5, stamina: -5 } },
      { id: 'local', next: 'hometown', effects: { stamina: 8, skill: 3, fame: -2 } },
      { id: 'school', next: 'school', effects: { skill: 10, vocal: 5, fame: 1, stamina: -4 } },
    ],
  },
  {
    id: 'agency',
    options: [
      { id: 'major', next: 'firstRole', effects: { fame: 8, luck: 8, stamina: -6, skill: 3 }, tags: ['bigAgency'] },
      { id: 'small', next: 'firstRole', effects: { skill: 6, fame: 2, luck: 3, stamina: -2 }, tags: ['smallAgency'] },
      { id: 'free', next: 'firstRole', effects: { skill: 10, vocal: 5, fame: -3, stamina: -3 }, tags: ['freelance'] },
    ],
  },
  {
    id: 'school',
    options: [
      { id: 'top', next: 'firstRole', effects: { skill: 9, vocal: 4, fame: 4, stamina: -6 } },
      { id: 'partTime', next: 'firstRole', effects: { luck: 8, fame: 3, stamina: 5 } },
      { id: 'club', next: 'firstRole', effects: { vocal: 8, skill: 4, luck: 2, stamina: -4 } },
    ],
  },
  {
    id: 'hometown',
    options: [
      { id: 'localTv', next: 'firstRole', effects: { fame: 6, skill: 3, stamina: -4 } },
      { id: 'workshop', next: 'firstRole', effects: { skill: 7, vocal: 3, stamina: 3 } },
      { id: 'giveUp', next: 'firstRole', effects: { stamina: 12, luck: 6, fame: -4 } },
    ],
  },
  {
    id: 'firstRole',
    options: [
      { id: 'lead', next: 'crew', effects: { fame: 11, skill: 4, stamina: -8 } },
      { id: 'support', next: 'crew', effects: { skill: 7, fame: 4, vocal: 3, stamina: -3 } },
      { id: 'refuse', next: 'crew', effects: { luck: 4, stamina: 6, fame: -4 } },
    ],
  },
  {
    id: 'crew',
    options: [
      { id: 'idol', next: 'unitSplit', effects: { fame: 12, vocal: 10, skill: 1, stamina: -8 }, tags: ['idol'] },
      { id: 'band', next: 'unitSplit', effects: { vocal: 13, fame: 5, stamina: -7 }, tags: ['band'] },
      { id: 'solo', next: 'route', effects: { skill: 10, fame: 3, stamina: -3 } },
    ],
  },
  {
    id: 'unitSplit',
    options: [
      { id: 'hold', next: 'route', effects: { luck: 6, fame: 6, vocal: 5, stamina: -5 } },
      { id: 'split', next: 'route', effects: { skill: 8, fame: 4, stamina: -3 } },
      { id: 'dissolve', next: 'route', effects: { stamina: 9, fame: -5, skill: 4 } },
    ],
  },
  {
    id: 'route',
    options: [
      { id: 'anime', next: 'live', effects: { skill: 6, fame: 9, stamina: -6 }, tags: ['anime'] },
      { id: 'game', next: 'live', effects: { skill: 5, fame: 5, luck: 4, stamina: -4 }, tags: ['game'] },
      { id: 'radio', next: 'live', effects: { vocal: 5, fame: 7, luck: 5, stamina: -3 }, tags: ['radio'] },
    ],
  },
  {
    id: 'live',
    options: [
      { id: 'tour', next: 'break', effects: { fame: 12, vocal: 7, stamina: -11 }, tags: ['stage'] },
      { id: 'steady', next: 'break', effects: { stamina: 9, fame: 4, skill: 4 } },
      { id: 'skip', next: 'break', effects: { fame: -6, stamina: 11, skill: 4 } },
    ],
  },
  {
    id: 'break',
    options: [
      { id: 'viral', next: 'scandal', effects: { fame: 16, luck: 2, stamina: -8 } },
      { id: 'steady', next: 'side', effects: { skill: 6, fame: 5, stamina: -4 } },
      { id: 'decline', next: 'side', effects: { stamina: 9, luck: 6, fame: -4 } },
    ],
  },
  {
    id: 'scandal',
    options: [
      { id: 'apologize', next: 'side', effects: { fame: -7, luck: 5, stamina: -4 } },
      { id: 'deny', next: 'side', effects: { fame: -11, luck: -2, stamina: -4 } },
      { id: 'layLow', next: 'side', effects: { fame: -5, stamina: 8, skill: 4 } },
    ],
  },
  {
    id: 'side',
    options: [
      { id: 'stream', next: 'biz', effects: { fame: 9, luck: 6, stamina: -7 } },
      { id: 'craft', next: 'biz', effects: { skill: 11, vocal: 5, stamina: -6 } },
      { id: 'teach', next: 'biz', effects: { luck: 8, skill: 4, stamina: -3, fame: -3 }, tags: ['teacher'] },
    ],
  },
  {
    id: 'biz',
    options: [
      { id: 'cm', next: 'rival', effects: { fame: 10, luck: 5, stamina: -6 } },
      { id: 'indie', next: 'rival', effects: { skill: 8, vocal: 4, fame: -2, stamina: -4 } },
      { id: 'charity', next: 'rival', effects: { luck: 9, fame: 3, stamina: -3 } },
    ],
  },
  {
    id: 'rival',
    options: [
      { id: 'mentor', next: 'body', effects: { skill: 8, fame: 4, luck: 6, stamina: -4 } },
      { id: 'compete', next: 'body', effects: { fame: 12, skill: 5, stamina: -7 } },
      { id: 'team', next: 'body', effects: { vocal: 7, fame: 6, luck: 4, stamina: -6 } },
    ],
  },
  {
    id: 'body',
    options: [
      { id: 'rest', next: 'final', effects: { stamina: 26, fame: -4 } },
      { id: 'push', next: 'final', effects: { fame: 13, skill: 6, stamina: -13 } },
      { id: 'backstage', next: 'final', effects: { stamina: 13, fame: -5, skill: 6 } },
    ],
  },
  {
    id: 'final',
    options: [
      { id: 'bigStage', effects: { fame: 15, vocal: 8, stamina: -10 }, tags: ['stage'] },
      { id: 'retire', effects: { stamina: 14, luck: 4, fame: -4 } },
      { id: 'steady', effects: { skill: 7, fame: 5, stamina: -4 } },
    ],
  },
];

/** 按 id 取岔路口。 */
export function nodeById(id: string): LifeNode | undefined {
  return LIFE_NODES.find((node) => node.id === id);
}

/** 结局的匹配池类型。 */
export type LifeMatchKind = 'any' | 'freelance' | 'majorAgency' | 'minorAgency' | 'idol' | 'band' | 'stage';

export interface LifeEnding {
  /** i18n 键后缀：`seiyuuLife.endings.<id>.name / .desc / .reason`。 */
  id: string;
  /** 「和你最像的人」从哪个池子里抽。 */
  match: LifeMatchKind;
  /** 判定函数：从上往下第一个命中的就是结局。 */
  test: (stats: LifeStats, tags: Set<LifePathTag>) => boolean;
}

/**
 * 结局表，**顺序即优先级**。
 *
 * 体力崩掉排最前（不然「硬撑到顶流」会把身体信号吞掉），
 * 讲师其次（这是明确的职业转向），接着是三条「被认可」的好结局（拿奖 / 歌手出道 / 海外走红），
 * 剩下的按数值门槛从高到低。
 */
export const LIFE_ENDINGS: LifeEnding[] = [
  {
    id: 'burnout',
    match: 'any',
    test: (stats) => stats.stamina <= 15,
  },
  {
    id: 'teacher',
    match: 'minorAgency',
    // 转讲师是「没大火但留下来」的路，红到一定程度就不算讲师了
    test: (stats, tags) => tags.has('teacher') && stats.fame < 55,
  },
  {
    id: 'award',
    match: 'any',
    // 声优奖：作品被记住的证明，靠突发事件里的好结果拿
    test: (stats, tags) => tags.has('award') && stats.fame >= 45,
  },
  {
    id: 'anison',
    match: 'any',
    // 歌手出道：靠歌唱与曝光撑起来
    test: (stats, tags) => tags.has('anison') && stats.vocal >= 50,
  },
  {
    id: 'overseas',
    match: 'stage',
    // 海外也吃得开：漫展、巡演、流媒体都认这张脸
    test: (stats, tags) => tags.has('overseas') && stats.fame >= 38,
  },
  {
    id: 'legend',
    match: 'any',
    // 只有「数值几乎全满」才拿得到：正常岔路口走不出来，得靠突发事件把两项顶到顶
    test: (stats) => stats.skill >= 90 && stats.fame >= 88 && stats.stamina >= 28,
  },
  {
    id: 'star',
    match: 'any',
    test: (stats) => stats.skill >= 80 && stats.fame >= 66,
  },
  {
    id: 'variety',
    match: 'any',
    test: (stats, tags) => tags.has('variety') && stats.fame >= 50,
  },
  {
    id: 'streamer',
    match: 'any',
    test: (stats, tags) => tags.has('streamer') && stats.fame >= 42,
  },
  {
    id: 'idol',
    match: 'idol',
    test: (stats, tags) => tags.has('idol') && stats.fame >= 52,
  },
  {
    id: 'band',
    match: 'band',
    test: (stats, tags) => tags.has('band') && stats.vocal >= 54,
  },
  {
    id: 'radio',
    match: 'any',
    test: (stats, tags) => tags.has('radio') && stats.fame >= 48,
  },
  {
    id: 'game',
    match: 'any',
    test: (stats, tags) => tags.has('game') && stats.fame >= 44,
  },
  {
    id: 'freelance',
    match: 'freelance',
    test: (stats, tags) => tags.has('freelance') && stats.skill >= 58,
  },
  {
    id: 'workhorse',
    match: 'majorAgency',
    test: (stats, tags) => tags.has('bigAgency') && stats.fame >= 40,
  },
  {
    id: 'unsung',
    match: 'any',
    test: () => true,
  },
];

function clampStat(value: number): number {
  return Math.max(0, Math.min(LIFE_MAX, Math.round(value)));
}

/** 把一项选择的加成结算到数值上，返回新的数值对象。 */
export function applyEffects(stats: LifeStats, effects: Partial<LifeStats>): LifeStats {
  const next: LifeStats = { ...stats };
  for (const key of LIFE_STAT_KEYS) {
    const delta = effects[key];
    if (delta) next[key] = clampStat(next[key] + delta);
  }
  return next;
}

/**
 * 结算一个岔路口选项：每项加成在基础值上抖 ±LIFE_OPTION_JITTER。
 *
 * 页面和模拟走的是同一个函数，所以「玩家实际体验」与「稀有度统计」不会两套规则；
 * `random` 传 `() => 0.5` 就是完全确定性的版本（穷举测试用）。
 */
export function applyOptionEffects(
  stats: LifeStats,
  option: LifeOption,
  random: () => number = Math.random,
): LifeStats {
  const rolled: Partial<LifeStats> = {};
  for (const key of LIFE_STAT_KEYS) {
    const base = option.effects[key];
    if (!base) continue;
    rolled[key] = base + base * LIFE_OPTION_JITTER * (random() * 2 - 1);
  }
  return applyEffects(stats, rolled);
}

/** 按结局表的优先级判定结局；一定返回一项。 */
export function endingOf(stats: LifeStats, tags: Iterable<LifePathTag>): LifeEnding {
  const tagSet = new Set(tags);
  for (const ending of LIFE_ENDINGS) {
    if (ending.test(stats, tagSet)) return ending;
  }
  return LIFE_ENDINGS[LIFE_ENDINGS.length - 1];
}

export function endingById(id: string): LifeEnding | undefined {
  return LIFE_ENDINGS.find((ending) => ending.id === id);
}

/** 大所：同事务所人数排前 5 的那几家（数据来自 shared 的事务所表）。 */
const MAJOR_AGENCIES: Set<string> = (() => {
  const counter = new Map<string, number>();
  for (const id of FANDOM_IDS) {
    const agency = agencyOf(id);
    if (agency) counter.set(agency, (counter.get(agency) ?? 0) + 1);
  }
  return new Set(
    [...counter.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 5)
      .map(([agency]) => agency),
  );
})();

/** 偶像系企划（会被「加入偶像企划」的路线认领）。 */
const IDOL_PROJECTS = new Set(FANDOM_PROJECT_IDS.filter((project) => project !== 'umamusume' && project !== 'revuestar'));

/** 乐队系企划。 */
const BAND_PROJECTS = new Set(['bangdream', 'd4dj']);

/** 舞台 / 演唱会系企划。 */
const STAGE_PROJECTS = new Set(FANDOM_PROJECT_IDS.filter((project) => project !== 'pjsk' && project !== 'umamusume'));

function belongsTo(identity: SeiyuuIdentity, projects: Set<string>): boolean {
  if (projects.has(identity.project)) return true;
  return (identity.alsoIn ?? []).some((project) => projects.has(project));
}

/** 结局匹配池；池子空了就退回全体主推范围，保证一定有人。 */
export function matchPool(ending: LifeEnding): string[] {
  const pick = (test: (identity: SeiyuuIdentity) => boolean): string[] => {
    const pool = FANDOM_IDS.filter((id) => {
      const identity = SEIYUU_BY_ID.get(id);
      return identity ? test(identity) : false;
    });
    return pool.length ? pool : FANDOM_IDS;
  };

  switch (ending.match) {
    case 'freelance':
      return pick((identity) => agencyOf(identity.id) === '');
    case 'majorAgency':
      return pick((identity) => MAJOR_AGENCIES.has(agencyOf(identity.id)));
    case 'minorAgency':
      return pick((identity) => {
        const agency = agencyOf(identity.id);
        return Boolean(agency) && !MAJOR_AGENCIES.has(agency);
      });
    case 'idol':
      return pick((identity) => belongsTo(identity, IDOL_PROJECTS));
    case 'band':
      return pick((identity) => belongsTo(identity, BAND_PROJECTS));
    case 'stage':
      return pick((identity) => belongsTo(identity, STAGE_PROJECTS));
    default:
      return [...FANDOM_IDS];
  }
}

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

export function randomSeed(): number {
  return Math.floor(Math.random() * 90000) + 10000;
}

/** 结局 → 「和你最像的人」。同一个 seed 结果固定。 */
export function matchSeiyuu(ending: LifeEnding, seed: number): string {
  const pool = matchPool(ending);
  const index = Math.floor(mulberry32(seed)() * pool.length) % pool.length;
  return pool[index];
}

/** 档案（页面渲染用）。 */
export function identityOf(id: string): SeiyuuIdentity | undefined {
  return SEIYUU_BY_ID.get(id);
}

/** 公式照路径。 */
export function photoOf(id: string): string {
  return seiyuuPhotoPath(id);
}

/* ------------------------------------------------------------------ *
 * 突发事件
 *
 * 八个岔路口一路选下来太顺、也太可预测，所以每推进一步都有概率插播
 * 一件事：有的只能选态度，有的是「赌一把」（写明成功率和两套结果）。
 * 事件按数值/标签/进度做条件，所以同一个 seed 不同路线会撞到不同的事。
 * ------------------------------------------------------------------ */

export interface LifeEventRisk {
  /** 成功概率（0~1）。 */
  chance: number;
  success: Partial<LifeStats>;
  failure: Partial<LifeStats>;
  successTags?: LifePathTag[];
  failureTags?: LifePathTag[];
}

export interface LifeEventOption {
  /** i18n 键后缀：`seiyuuLife.events.<eventId>.options.<id>`。 */
  id: string;
  /** 稳扎稳打的效果；带 risk 时忽略。 */
  effects?: Partial<LifeStats>;
  tags?: LifePathTag[];
  /** 赌一把。 */
  risk?: LifeEventRisk;
}

export interface LifeEvent {
  /** i18n 键后缀：`seiyuuLife.events.<id>.title / .desc / .options.<opt>`。 */
  id: string;
  /** 触发条件；不写就是任何时候都可能来。 */
  when?: (stats: LifeStats, tags: Set<LifePathTag>, stageIndex: number) => boolean;
  /** 抽取权重，默认 1。 */
  weight?: number;
  options: LifeEventOption[];
}

/** 一局最多插几件事（12~13 步里撞上五六件也不奇怪，但再多就腻了）。 */
export const LIFE_MAX_EVENTS = 6;

/** 每次推进后判定一次的事件概率。 */
export const LIFE_EVENT_CHANCE = 0.5;

/** 事件表。`when` 里能用数值、标签和「走到第几个岔路口」。 */
export const LIFE_EVENTS: LifeEvent[] = [
  {
    id: 'rainyAudition',
    when: (_stats, _tags, stageIndex) => stageIndex >= 1 && stageIndex <= 3,
    weight: 1.1,
    options: [
      { id: 'taxi', effects: { fame: 6, skill: 4, stamina: -5 } },
      { id: 'walk', effects: { stamina: -10, luck: 8, fame: 2 } },
      { id: 'skip', effects: { fame: -6, stamina: 6 } },
    ],
  },
  {
    id: 'viralClip',
    when: (stats) => stats.fame >= 25,
    weight: 1.2,
    options: [
      { id: 'ride', effects: { fame: 14, luck: 6, stamina: -6 } },
      { id: 'deny', effects: { fame: -6, stamina: 2, luck: -4 } },
      {
        id: 'double',
        risk: {
          chance: 0.65,
          success: { fame: 22, vocal: 6 },
          failure: { fame: -8, stamina: -6 },
        },
      },
    ],
  },
  {
    id: 'injury',
    when: (stats, _tags, stageIndex) => stats.stamina <= 55 && stageIndex >= 3,
    weight: 0.8,
    options: [
      { id: 'rest', effects: { stamina: 20, fame: -5 } },
      {
        id: 'push',
        risk: {
          chance: 0.5,
          success: { fame: 18, vocal: 8, stamina: -14 },
          failure: { stamina: -16, fame: -4 },
        },
      },
    ],
  },
  {
    id: 'watcher',
    when: (stats) => stats.fame >= 45,
    weight: 0.75,
    options: [
      { id: 'police', effects: { stamina: -6, luck: 10 } },
      { id: 'ignore', effects: { luck: -5, stamina: -3, fame: 4 } },
      { id: 'announce', effects: { fame: 8, luck: 6, stamina: -5 } },
    ],
  },
  {
    id: 'senpaiDinner',
    when: (_stats, _tags, stageIndex) => stageIndex >= 2,
    options: [
      { id: 'go', effects: { skill: 6, luck: 10, stamina: -4 } },
      { id: 'skip', effects: { stamina: 8, luck: -6 } },
      {
        id: 'perform',
        risk: {
          chance: 0.6,
          success: { fame: 16, skill: 8 },
          failure: { luck: -6, fame: -3 },
        },
      },
    ],
  },
  {
    id: 'tabloid',
    when: (stats) => stats.fame >= 55,
    weight: 0.8,
    options: [
      { id: 'apologize', effects: { fame: -5, luck: 4 } },
      {
        id: 'silent',
        risk: {
          chance: 0.55,
          success: { fame: 6, luck: 4 },
          failure: { fame: -11 },
        },
      },
      { id: 'quit', effects: { stamina: 10, fame: 4 } },
    ],
  },
  {
    id: 'gameOffer',
    when: (_stats, _tags, stageIndex) => stageIndex >= 2,
    options: [
      { id: 'take', effects: { skill: 8, fame: 10, stamina: -10 }, tags: ['game'] },
      { id: 'bundle', effects: { luck: 12, fame: 6, skill: 4 } },
      { id: 'pass', effects: { stamina: 10, fame: -4 } },
    ],
  },
  {
    id: 'newManager',
    when: (_stats, tags) => tags.has('bigAgency'),
    weight: 1.1,
    options: [
      { id: 'trust', effects: { fame: 8, luck: 6, stamina: -4 } },
      { id: 'resist', effects: { skill: 10, luck: -6 } },
      {
        id: 'solo',
        risk: {
          chance: 0.5,
          success: { fame: 18, skill: 6, luck: 8 },
          failure: { fame: -10, luck: -8 },
        },
      },
    ],
  },
  {
    id: 'fanLetter',
    when: (_stats, _tags, stageIndex) => stageIndex >= 4,
    options: [
      { id: 'reply', effects: { luck: 12, stamina: -4 } },
      { id: 'archive', effects: { luck: 4 } },
      { id: 'share', effects: { fame: 8, luck: 8, stamina: -6 } },
    ],
  },
  {
    id: 'voiceLoss',
    when: (stats, _tags, stageIndex) => stats.stamina <= 40 && stageIndex >= 4,
    weight: 0.7,
    options: [
      { id: 'surgery', effects: { stamina: 22, fame: -8 } },
      {
        id: 'conservative',
        risk: {
          chance: 0.55,
          success: { fame: 12, stamina: -10 },
          failure: { stamina: -14, fame: -8 },
        },
      },
    ],
  },
  {
    id: 'unitClash',
    when: (_stats, tags) => tags.has('idol') || tags.has('band'),
    options: [
      { id: 'mediate', effects: { luck: 10, stamina: -6 } },
      { id: 'sideMajor', effects: { fame: 8, luck: -6 } },
      { id: 'leave', effects: { fame: -6, skill: 10, stamina: 8 } },
    ],
  },
  {
    id: 'tvOffer',
    when: (stats) => stats.fame >= 60,
    options: [
      { id: 'accept', effects: { fame: 16, luck: 8, stamina: -14 }, tags: ['variety'] },
      { id: 'decline', effects: { skill: 12, vocal: 6, fame: -6 } },
      { id: 'guest', effects: { fame: 8, stamina: -6 } },
    ],
  },
  {
    id: 'memeClip',
    when: (stats) => stats.luck >= 55,
    weight: 1.2,
    options: [
      { id: 'lean', effects: { fame: 14, luck: 8, stamina: -8 }, tags: ['streamer'] },
      { id: 'deny', effects: { skill: 8, fame: -2 } },
    ],
  },
  /* ------------------------------------------------------------------ *
   * 下面这批是「好结果」为主的事件：
   * 一条能把体力大幅补回来的长假，外加三条各自通往好结局的路
   * （拿奖 / 歌手出道 / 海外也吃得开）。权重都给得比倒霉事高，所以撞上好事更多。
   * ------------------------------------------------------------------ */
  {
    id: 'longRest',
    weight: 1.4,
    options: [
      { id: 'rest', effects: { stamina: 24, luck: 4 } },
      { id: 'trip', effects: { stamina: 15, luck: 10, fame: 2 } },
      { id: 'hustle', effects: { fame: 12, skill: 4, stamina: -7 } },
    ],
  },
  {
    id: 'dreamRole',
    when: (stats) => stats.fame >= 18,
    weight: 1.4,
    options: [
      { id: 'take', effects: { skill: 8, fame: 12, stamina: -6 } },
      {
        id: 'audition',
        risk: {
          chance: 0.7,
          success: { fame: 20, skill: 10 },
          failure: { fame: -5, stamina: -5 },
        },
      },
      { id: 'recommend', effects: { luck: 12, fame: 5, skill: 3 } },
    ],
  },
  {
    id: 'awardNominee',
    when: (stats) => stats.fame >= 50,
    weight: 1.3,
    options: [
      { id: 'attend', effects: { fame: 12, luck: 8, stamina: -6 }, tags: ['award'] },
      { id: 'video', effects: { skill: 6, luck: 6 } },
      { id: 'skip', effects: { stamina: 6, luck: -4 } },
    ],
  },
  {
    id: 'anisonOffer',
    when: (stats) => stats.vocal >= 38,
    weight: 1.3,
    options: [
      { id: 'accept', effects: { vocal: 12, fame: 12, stamina: -7 }, tags: ['anison'] },
      { id: 'unit', effects: { vocal: 8, luck: 8, fame: 6, stamina: -4 } },
      { id: 'decline', effects: { skill: 8, stamina: 6, fame: -3 } },
    ],
  },
  {
    id: 'overseasInvite',
    when: (stats) => stats.fame >= 42,
    weight: 1.3,
    options: [
      { id: 'go', effects: { fame: 14, luck: 10, stamina: -7 }, tags: ['overseas'] },
      { id: 'online', effects: { fame: 8, luck: 6, stamina: -3 } },
      { id: 'decline', effects: { skill: 6, stamina: 6, fame: -3 } },
    ],
  },
  {
    id: 'fanMeeting',
    when: (_stats, _tags, stageIndex) => stageIndex >= 3,
    weight: 1.3,
    options: [
      { id: 'hold', effects: { fame: 10, luck: 10, stamina: -6 } },
      { id: 'small', effects: { luck: 6, vocal: 3, stamina: -2 } },
      { id: 'gift', effects: { luck: 8, fame: 3 } },
    ],
  },
];

/** 当前条件下能抽到的事件。 */
export function eligibleEvents(
  stats: LifeStats,
  tags: Iterable<LifePathTag>,
  stageIndex: number,
): LifeEvent[] {
  const tagSet = new Set(tags);
  return LIFE_EVENTS.filter((event) => !event.when || event.when(stats, tagSet, stageIndex));
}

/**
 * 判定要不要插一件事。
 * 返回 null 表示这一步平安无事（概率没过、或者抽到的事件已经来过、或者事件数到顶）。
 */
export function rollEvent(
  stats: LifeStats,
  tags: Iterable<LifePathTag>,
  stageIndex: number,
  usedIds: Iterable<string>,
  random: () => number,
): LifeEvent | null {
  const used = new Set(usedIds);
  if (used.size >= LIFE_MAX_EVENTS) return null;
  if (random() >= LIFE_EVENT_CHANCE) return null;
  const pool = eligibleEvents(stats, tags, stageIndex).filter((event) => !used.has(event.id));
  if (!pool.length) return null;

  const total = pool.reduce((sum, event) => sum + (event.weight ?? 1), 0);
  let ticket = random() * total;
  for (const event of pool) {
    ticket -= event.weight ?? 1;
    if (ticket <= 0) return event;
  }
  return pool[pool.length - 1];
}

export interface LifeEventOutcome {
  effects: Partial<LifeStats>;
  tags: LifePathTag[];
  /** 赌一把的结果；不是赌注就是 null。 */
  ok: boolean | null;
}

/** 结算一个事件选项；赌注在这里掷骰子。 */
export function resolveEventOption(
  option: LifeEventOption,
  random: () => number = Math.random,
): LifeEventOutcome {
  if (!option.risk) {
    return { effects: option.effects ?? {}, tags: option.tags ?? [], ok: null };
  }
  const ok = random() < option.risk.chance;
  return {
    effects: ok ? option.risk.success : option.risk.failure,
    tags: (ok ? option.risk.successTags : option.risk.failureTags) ?? [],
    ok,
  };
}

/** 人生大事记的一条。 */
export interface LifeLogEntry {
  kind: 'stage' | 'event';
  /** 阶段 id 或事件 id。 */
  ref: string;
  /** 选项 id。 */
  optionId: string;
  /** 赌一把的结果；非赌注为 null。 */
  ok: boolean | null;
  /** 这一步走完时的知名度（大事记右侧的数字）。 */
  fame: number;
}

/** 一局人生：一路上选过的选项 + 数值 + 标签 + 结局。 */
export interface LifeRun {
  /** 每个岔路口选了哪个选项 id（分支不同，长度不一定一样）。 */
  picks: string[];
  stats: LifeStats;
  tags: LifePathTag[];
  ending: LifeEnding;
  seed: number;
  /** 完整经历（阶段 + 突发事件），结果页与分享图的大事记。 */
  log: LifeLogEntry[];
}

/** 每一步选第几个选项的决定方式（阶段与突发事件共用）。 */
type LifeChooser = (options: { id: string }[], kind: 'stage' | 'event', ref: string) => number;

/**
 * 沿分支把一局走完：从起点开始，每次读完 `option.next` 跳到下一个岔路口。
 *
 * 路线、随机源、要不要插事件全部由调用方决定，runLife / simulateLife 都走这里，
 * 免得「真实玩法」和「统计稀有度」出现两套推进规则。
 */
function walkLife(
  choose: LifeChooser,
  random: () => number,
  seed: number,
  withEvents: boolean,
): LifeRun {
  let stats = { ...LIFE_INITIAL_STATS };
  const tags: LifePathTag[] = [];
  const picks: string[] = [];
  const log: LifeLogEntry[] = [];
  const used = new Set<string>();

  const apply = (effects: Partial<LifeStats>, extraTags: LifePathTag[] = []) => {
    stats = applyEffects(stats, effects);
    for (const tag of extraTags) if (!tags.includes(tag)) tags.push(tag);
  };

  let nodeId: string | undefined = LIFE_START_NODE;
  let step = 0;
  while (nodeId) {
    const node = nodeById(nodeId);
    if (!node) break;
    const option = node.options[choose(node.options, 'stage', node.id) % node.options.length];
    stats = applyOptionEffects(stats, option, random);
    apply({}, option.tags);
    picks.push(option.id);
    log.push({ kind: 'stage', ref: node.id, optionId: option.id, ok: null, fame: stats.fame });

    if (withEvents) {
      const event = rollEvent(stats, tags, step, used, random);
      if (event) {
        used.add(event.id);
        const eventOption = event.options[choose(event.options, 'event', event.id) % event.options.length];
        const outcome = resolveEventOption(eventOption, random);
        apply(outcome.effects, outcome.tags);
        log.push({
          kind: 'event',
          ref: event.id,
          optionId: eventOption.id,
          ok: outcome.ok,
          fame: stats.fame,
        });
      }
    }

    nodeId = option.next;
    step += 1;
  }

  const ending = endingOf(stats, tags);
  return { picks, stats, tags, ending, seed, log };
}

/** 把一串「每一步选第几个选项」的索引沿着分支跑完，用于测试穷举与快速预览。 */
export function runLife(optionIndexes: number[], seed = 12345): LifeRun {
  let step = 0;
  return walkLife(() => optionIndexes[step++] ?? 0, () => 0.5, seed, false);
}

/**
 * 跑一整局（含突发事件）。
 *
 * `decide` 负责选选项：默认均匀随机，测试里换成固定策略。
 * 随机源与决策分开传入，是因为「抽到哪件事」和「玩家怎么选」在测试里要分别控制。
 */
export function simulateLife(
  random: () => number = Math.random,
  decide?: (options: { id: string }[], kind: 'stage' | 'event', ref: string) => number,
): LifeRun {
  const seed = Math.floor(random() * 90000) + 10000;
  const choose: LifeChooser = decide ?? ((options: { id: string }[]) => Math.floor(random() * options.length));
  return walkLife(choose, random, seed, true);
}

/**
 * 各结局的「自然发生率」（百分比，保留一位小数）。
 *
 * 不是精确解 —— 用固定 seed 做 40000 局「每一步都均匀乱选」的模拟统计出来的，
 * 目的只是给玩家一个「这个结局少见/常见」的参照，所以不值得为它推公式。
 */
export function endingOdds(samples = 40000): Record<string, number> {
  const random = mulberry32(20260930);
  const counts = new Map<string, number>();
  for (let index = 0; index < samples; index += 1) {
    const run = simulateLife(random);
    counts.set(run.ending.id, (counts.get(run.ending.id) ?? 0) + 1);
  }
  const odds: Record<string, number> = {};
  for (const ending of LIFE_ENDINGS) {
    odds[ending.id] = Math.round(((counts.get(ending.id) ?? 0) / samples) * 1000) / 10;
  }
  return odds;
}

/** 分享图默认文件名前缀。 */
export const LIFE_POSTER_PREFIX = 'seiyuu-life';
