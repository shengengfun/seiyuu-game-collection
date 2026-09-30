/**
 * 「声优事务所经营」的状态机：开局 → 派活 → 突发事件 → 道具 / 组合 → 结算。
 *
 * 设计原则：
 * - **所有随机都走 state.rng()**：同一个 seed + 同一串操作可完整复现（测试依赖这一点）。
 * - **不可变更新**：每个动作返回新的 state，页面只 setState，不做原地修改。
 * - 道具 / 组合都刻意带代价（每月只能用一个道具、组合占人、转会要花钱），
 *   避免出现「一路狂用某个东西就必胜」的解法。
 */

import { agencyOf, SEIYUU_BY_ID, seiyuuPhotoPath, type SeiyuuIdentity } from '@seiyuu/shared';
import { FANDOM_IDS } from './fandom';
import {
  AGENCY_EVENTS,
  AGENCY_EVENT_TONES,
  AGENCY_ITEMS,
  AGENCY_JOBS,
  AGENCY_OFFER_COUNT,
  AGENCY_TITLES,
  AGENCY_TRAITS,
  AGENCY_TRAINING_KEYS,
  EASTER_EGG_CHANCE,
  ITEM_KEYS,
  NORMAL_EVENTS,
  TITLE_KEYS,
  TRAIT_KEYS,
  UNIT_NAME_JOINER,
  eventChance,
  maxEventsFor,
} from './agencyData';

import {
  AGENCY_DIFFICULTY_CEIL,
  AGENCY_DIFFICULTY_FLOOR,
  AGENCY_MAX_TALENTS,
  AGENCY_ORIGINS,
  AGENCY_ORIGIN_RULES,
  AGENCY_START_TALENTS,
  AGENCY_TIERS,
  AGENCY_TIER_DIFFICULTY,
  AGENCY_TIER_UNLOCK,
  AGENCY_TIER_WEIGHT,
  AGENCY_ACTIONS,
  AGENCY_CANDIDATE_REFRESH,
  PREFERRED_PROJECT_CHANCE,
  AGENT_ATTRS,
  AGENT_ATTR_EFFECT,
  AGENT_ATTR_MAX,
  AGENT_STREAK_BONUS,
  AGENT_STREAK_MAX,
  AGENCY_DIFFICULTIES,
  AGENCY_LENGTHS,
  AGENCY_RULES,
  LENGTH_MONTHS,
  UNIT_FORM_COST,
  UNIT_LIMIT,
  UNIT_MAX_MEMBERS,
  UNIT_MIN_MEMBERS,
  UNIT_NAME_MAX,
  WAGE_BASE,
  REST_SPARK_CHANCE,
  defaultMonthMods,
  emptyPoints,
  mergeModifiers,
  type AgencyDifficulty,
  type AgencyEventDef,
  type AgencyEventEffects,
  type AgencyEventKey,
  type AgencyJob,
  type AgencyJobKind,
  type AgencyLength,
  type AgencyLogEntry,
  type AgencyMonthMods,
  type AgencyOffer,
  type AgencyOrigin,
  type AgencyPendingEvent,
  type AgencyState,
  type AgencyStatKey,
  type AgencyTalent,
  type AgencyTier,
  type AgencyUnit,
  type AgentAttr,
  type AgentPoints,
  type ItemKey,
  type TalentModifier,
  type TitleCheckContext,
  type TitleKey,
  type TraitKey,
} from './agencyTypes';

export * from './agencyTypes';
export {
  AGENCY_EVENTS,
  AGENCY_ITEMS,
  AGENCY_JOBS,
  AGENCY_OFFER_COUNT,
  AGENCY_EVENT_TONES,
  AGENCY_TITLES,
  AGENCY_TRAITS,
  AGENCY_TRAINING_KEYS,
  EASTER_EGG_CHANCE,
  ITEM_KEYS,
  NORMAL_EVENTS,
  TITLE_KEYS,
  TRAIT_KEYS,
  eventChance,
  maxEventsFor,
};

/** 一位成员的月薪（万）：老牌贵、新人便宜，知名度也会挂价。 */
export function salaryOf(veteran: boolean, fame: number, wageMul: number): number {
  const base = veteran ? WAGE_BASE.veteran : WAGE_BASE.rookie;
  return Math.max(4, Math.round((base + fame / 14) * wageMul));
}

/** 经纪人的「联动加点」总点数（比手动加点多 1 点，作为联动的彩头）。 */
export const AGENT_POINT_TOTAL = AGENCY_RULES.normal.points;

/** SeiValue 的四轴 → 经纪人四项能力。 */
export const SEIVALUE_AXIS_TO_ATTR: Record<string, AgentAttr> = {
  voice: 'eye',
  consume: 'negotiation',
  community: 'network',
  interact: 'care',
};

/* ------------------------------ 小工具 ------------------------------ */

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

/** 按种子重建随机源（存档读档用）。 */
export function mulberry32Seed(seed: number): () => number {
  return mulberry32(seed);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function pick<T>(items: readonly T[], rng: () => number): T {
  return items[Math.floor(rng() * items.length) % items.length];
}

/** 按权重抽一个（权重为 0 的不会抽到；池子空则返回 null）。 */
function pickWeighted<Item>(
  items: readonly Item[],
  weightOf: (item: Item) => number,
  rng: () => number,
): Item | null {
  const total = items.reduce((sum, item) => sum + Math.max(0, weightOf(item)), 0);
  if (total <= 0) return null;
  let ticket = rng() * total;
  for (const item of items) {
    ticket -= Math.max(0, weightOf(item));
    if (ticket <= 0) return item;
  }
  return items[items.length - 1] ?? null;
}

function isDifficulty(value: unknown): value is AgencyDifficulty {
  return typeof value === 'string' && (AGENCY_DIFFICULTIES as string[]).includes(value);
}

/* ------------------------------ 加点 ------------------------------ */

/** 把一栏点数收敛到 0~5，并让总和正好等于 total。 */
export function sanitizePoints(points: Partial<AgentPoints>, total: number): AgentPoints {
  const result = emptyPoints();
  for (const attr of AGENT_ATTRS) {
    result[attr] = clamp(Math.round(points[attr] ?? 0), 0, AGENT_ATTR_MAX);
  }
  let sum = AGENT_ATTRS.reduce((acc, attr) => acc + result[attr], 0);
  // 多了从最高的一栏削，少了补给最低的一栏，保证确定性
  while (sum > total) {
    const attr = [...AGENT_ATTRS].sort((a, b) => result[b] - result[a] || a.localeCompare(b))[0];
    if (result[attr] === 0) break;
    result[attr] -= 1;
    sum -= 1;
  }
  while (sum < total) {
    const attr = [...AGENT_ATTRS].sort((a, b) => result[a] - result[b] || a.localeCompare(b))[0];
    if (result[attr] >= AGENT_ATTR_MAX) {
      // 全都满了还差，就直接给第一栏（总点数不该超过 4*5）
      if (AGENT_ATTRS.every((item) => result[item] >= AGENT_ATTR_MAX)) break;
      continue;
    }
    result[attr] += 1;
    sum += 1;
  }
  return result;
}

/** 默认加点（平均分，剩下的给前几栏）。 */
export function defaultPoints(total: number = AGENT_POINT_TOTAL): AgentPoints {
  const points = emptyPoints();
  for (let index = 0; index < total; index += 1) {
    points[AGENT_ATTRS[index % AGENT_ATTRS.length]] += 1;
  }
  return sanitizePoints(points, total);
}

/** 只把每栏收敛到 0~上限，**不强行补满**：允许玩家留点不用。 */
export function clampPoints(points: Partial<AgentPoints>): AgentPoints {
  const result = emptyPoints();
  for (const attr of AGENT_ATTRS) {
    result[attr] = clamp(Math.round(points[attr] ?? 0), 0, AGENT_ATTR_MAX);
  }
  return result;
}

/**
 * 把 SeiValue 的四轴百分比转成经纪人加点。
 *
 * 每条轴 1~4 分（按百分位线性映射），再按比例缩放到总点数；
 * 这样「联动」只改加点倾向，不会凭空多出一堆点数。
 */
export function pointsFromSeiValueAxes(
  axes: { axis: string; percent: number }[],
  total: number = AGENT_POINT_TOTAL + 1,
): AgentPoints {
  const raw = emptyPoints();
  for (const { axis, percent } of axes) {
    const attr = SEIVALUE_AXIS_TO_ATTR[axis];
    if (!attr) continue;
    raw[attr] = 1 + ((clamp(percent, -100, 100) + 100) / 200) * 3;
  }
  const sum = AGENT_ATTRS.reduce((acc, attr) => acc + raw[attr], 0);
  const scaled = emptyPoints();
  for (const attr of AGENT_ATTRS) {
    scaled[attr] = sum > 0 ? (raw[attr] / sum) * total : 0;
  }
  // 最大余数法取整，剩下的按小数部分从大到小补
  const floors = emptyPoints();
  let used = 0;
  for (const attr of AGENT_ATTRS) {
    floors[attr] = Math.max(1, Math.floor(scaled[attr]));
    used += floors[attr];
  }
  const order = [...AGENT_ATTRS].sort(
    (a, b) => scaled[b] - floors[b] - (scaled[a] - floors[a]) || a.localeCompare(b),
  );
  let index = 0;
  while (used < total && index < order.length * 8) {
    const attr = order[index % order.length];
    if (floors[attr] < AGENT_ATTR_MAX) {
      floors[attr] += 1;
      used += 1;
    }
    index += 1;
  }
  return sanitizePoints(floors, total);
}

/** 联动标签（页面显示「已用 SeiValue 成绩码联动」）。 */
export function linkSummary(code: string, points: AgentPoints): string {
  return `${code} → ${AGENT_ATTRS.map((attr) => `${attr}:${points[attr]}`).join(' / ')}`;
}

/* ------------------------------ 特质 / 称号 / 加成 ------------------------------ */

export function traitDefOf(key: TraitKey) {
  return AGENCY_TRAITS[key];
}

export function titleDefOf(key: TitleKey) {
  return AGENCY_TITLES[key];
}

export function itemDefOf(key: ItemKey) {
  return AGENCY_ITEMS[key];
}

/** 成员当前的加成总和（特质 + 称号）。 */
export function modifierOf(talent: AgencyTalent): TalentModifier {
  return mergeModifiers([
    ...talent.traits.map((key) => AGENCY_TRAITS[key]?.modifier),
    ...talent.titles.map((key) => AGENCY_TITLES[key]?.modifier),
  ]);
}

/** 抽特质：眼光越高，稀有 / 传说特质越容易出现；老牌带两个。 */
function rollTraits(rng: () => number, veteran: boolean, agent: AgentPoints): TraitKey[] {
  const count = veteran ? 2 : 1;
  const result: TraitKey[] = [];
  const luck = 1 + agent.eye * AGENT_ATTR_EFFECT.eye.traitLuck;
  for (let index = 0; index < count; index += 1) {
    const pool = TRAIT_KEYS.filter((key) => !result.includes(key));
    const chosen = pickWeighted(
      pool,
      (key) => {
        const def = AGENCY_TRAITS[key];
        const rarityFactor = def.rarity === 'common' ? 1 : def.rarity === 'rare' ? luck : luck * luck;
        return def.weight * rarityFactor;
      },
      rng,
    );
    if (!chosen) break;
    result.push(chosen);
  }
  // 负面特质不是必来，来一个算「人设更立体」
  if (rng() < (veteran ? 0.35 : 0.12)) {
    const flaws = TRAIT_KEYS.filter(
      (key) => AGENCY_TRAITS[key].flaw && !result.includes(key),
    );
    const flaw = flaws.length ? pick(flaws, rng) : null;
    if (flaw) result.push(flaw);
  }
  return result;
}

/** 称号判定需要的履历（从日志里数，免得再存一份计数）。 */
function titleContextOf(state: AgencyState, talent: AgencyTalent): TitleCheckContext {
  const jobSuccess: Partial<Record<AgencyJobKind, number>> = {};
  for (const entry of state.log) {
    if (entry.key !== 'success' || !entry.job || entry.talentId !== talent.id) continue;
    jobSuccess[entry.job] = (jobSuccess[entry.job] ?? 0) + 1;
  }
  const unit = unitOf(state, talent.id);
  return {
    month: state.month,
    reputation: state.reputation,
    jobSuccess,
    unitSuccess: unit?.successes ?? 0,
    easterEggs: state.easterEggs,
  };
}

/** 统一在动作结算后跑一遍：谁够条件了就发称号（并写日志）。 */
function withNewTitles(state: AgencyState): AgencyState {
  const log = [...state.log];
  let changed = false;
  const talents = state.talents.map((talent) => {
    const context = titleContextOf(state, talent);
    const fresh = TITLE_KEYS.filter(
      (key) => !talent.titles.includes(key) && AGENCY_TITLES[key].check(talent, context),
    );
    if (!fresh.length) return talent;
    changed = true;
    for (const key of fresh) {
      log.push({ month: state.month, key: 'title', talentId: talent.id, titleKey: key });
    }
    return { ...talent, titles: [...talent.titles, ...fresh] };
  });
  return changed ? { ...state, talents, log } : state;
}

/* ------------------------------ 成员 ------------------------------ */

function makeTalent(
  id: string,
  rng: () => number,
  agent: AgentPoints,
  options: {
    veteran?: boolean;
    fame?: number;
    loyalty?: number;
    fromAgency?: string;
    joinedMonth?: number;
    /** 三项主数值的增减（青训营 -6 / 老牌所 0）。 */
    boost?: number;
    /** 知名度额外加成。 */
    fameBoost?: number;
    /** 工资倍率（事务所出身）。 */
    wageMul?: number;
  } = {},
): AgencyTalent {
  const veteran = options.veteran ?? false;
  const boost = options.boost ?? 0;
  const span = (base: number) => clamp(Math.round(base + rng() * 22) + boost, 8, 96);
  const fame = clamp(
    (options.fame ?? (veteran ? Math.round(10 + rng() * 14) : Math.round(rng() * 5))) + (options.fameBoost ?? 0),
    0,
    100,
  );
  const wageMul = options.wageMul ?? 1;
  return {
    id,
    skill: span(veteran ? 42 : 28),
    vocal: span(veteran ? 40 : 26),
    charm: span(veteran ? 38 : 24),
    stamina: clamp(Math.round((veteran ? 78 : 84) - rng() * 10), 40, 100),
    fame,
    jobs: 0,
    fails: 0,
    loyalty: options.loyalty ?? clamp(Math.round(veteran ? 55 + rng() * 15 : 70 + rng() * 20), 0, 100),
    joinedMonth: options.joinedMonth ?? 1,
    veteran,
    salary: salaryOf(veteran, fame, wageMul),
    fromAgency: options.fromAgency,
    traits: rollTraits(rng, veteran, agent),
    titles: [],
  };
}

/** 数值变化明细（日志里把「演技 +3 · 体力 -12」这种列出来）。 */
const GAIN_KEYS = ['skill', 'vocal', 'charm', 'stamina', 'fame', 'loyalty'] as const;
type GainKey = (typeof GAIN_KEYS)[number];
function gainsOf(before: AgencyTalent, after: AgencyTalent): { stat: GainKey; delta: number }[] {
  return GAIN_KEYS.map((stat) => ({ stat, delta: after[stat] - before[stat] })).filter(
    (item) => item.delta !== 0,
  );
}

/** 事务所固定成员里属于哪些企划（签约倾向用）。 */
function projectOf(id: string): string | undefined {
  return SEIYUU_BY_ID.get(id)?.project;
}

/** 从主推范围里抽 n 个不重复的 id（倾向企划的人出现率更高）。 */
function drawIds(
  count: number,
  rng: () => number,
  exclude: Set<string>,
  preferred: string[] = [],
): string[] {
  const pool = FANDOM_IDS.filter((id) => !exclude.has(id));
  const result: string[] = [];
  while (result.length < count && pool.length) {
    const favored = preferred.length ? pool.filter((id) => preferred.includes(projectOf(id) ?? '')) : [];
    const useFavored = favored.length > 0 && rng() < PREFERRED_PROJECT_CHANCE;
    const source = useFavored ? favored : pool;
    const picked = source[Math.floor(rng() * source.length) % source.length];
    const [id] = pool.splice(pool.indexOf(picked), 1);
    result.push(id);
  }
  return result;
}

/* ------------------------------ 委托 ------------------------------ */

/** 队伍在某项主数值上的参考水平（最好与平均的中间值）。 */
function referenceStatOf(state: AgencyState | undefined, stat: AgencyStatKey | 'none'): number {
  if (!state || stat === 'none' || !state.talents.length) return 50;
  const values = state.talents.map((talent) => talent[stat]);
  const best = Math.max(...values);
  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  return Math.round((best + average) / 2);
}

/** 把静态委托表按队伍水平重新定难度 / 定报酿（水平上去了，活也变大）。 */
function scaleJob(job: AgencyJob, reference: number): AgencyJob {
  if (job.safe) return job;
  const difficulty = clamp(
    Math.round(reference * AGENCY_TIER_DIFFICULTY[job.tier]),
    AGENCY_DIFFICULTY_FLOOR,
    AGENCY_DIFFICULTY_CEIL,
  );
  const factor = clamp(difficulty / job.difficulty, 0.7, 1.7);
  return {
    ...job,
    difficulty,
    pay: Math.round(job.pay * factor),
    fame: Math.max(1, Math.round(job.fame * factor)),
  };
}

export function drawOffers(rng: () => number, state?: AgencyState): AgencyOffer[] {
  const progress = state ? (state.month - 1) / Math.max(1, state.months - 1) : 0;
  const hasUnit = (state?.units.length ?? 0) > 0;
  const count = state?.monthMods.offerCount ?? AGENCY_OFFER_COUNT;

  // 正式委托：已经解锁的档位 + 组合专场（有团才放）；未解锁的档根本不入池
  const openPool = (Object.keys(AGENCY_JOBS) as AgencyJobKind[]).filter((kind) => {
    const job = AGENCY_JOBS[kind];
    if (job.safe) return false;
    if (job.unitOnly && !hasUnit) return false;
    return progress >= AGENCY_TIER_UNLOCK[job.tier];
  });
  const openTiers = AGENCY_TIERS.filter((tier) => progress >= AGENCY_TIER_UNLOCK[tier]);
  const weighted = openTiers.flatMap((tier) => new Array(AGENCY_TIER_WEIGHT[tier]).fill(tier) as AgencyTier[]);
  const offers: AgencyOffer[] = [];
  const used: AgencyJobKind[] = [];

  for (let index = 0; index < count; index += 1) {
    let kind: AgencyJobKind | null = null;
    for (let attempt = 0; attempt < 14 && !kind; attempt += 1) {
      const tier = weighted.length ? pick(weighted, rng) : 'entry';
      const candidates = openPool.filter(
        (item) => AGENCY_JOBS[item].tier === tier && !used.includes(item),
      );
      if (candidates.length) kind = pick(candidates, rng);
    }
    if (!kind) {
      const fresh = openPool.filter((item) => !used.includes(item));
      kind = fresh.length ? pick(fresh, rng) : openPool.length ? pick(openPool, rng) : 'commercial';
    }
    used.push(kind);
    const job = AGENCY_JOBS[kind];
    offers.push({ index: offers.length, job: scaleJob(job, referenceStatOf(state, job.stat)) });
  }

  // 自修位：一个随机训练课 + 固定的公司休整（跳过回合也能回体力）
  const training = pick(AGENCY_TRAINING_KEYS, rng);
  offers.push({ index: offers.length, job: AGENCY_JOBS[training] });
  offers.push({ index: offers.length, job: AGENCY_JOBS.rest });
  return offers;
}

/* ------------------------------ 成功率 ------------------------------ */

/** 派活成功率的显示与判定都走这里（页面直接展示给玩家）。 */
export function successRate(job: AgencyJob, talent: AgencyTalent, state?: AgencyState): number {
  if (job.safe) return 1;
  const modifier = modifierOf(talent);
  const stat = job.stat === 'none' ? 50 : talent[job.stat];
  const agent = state?.agent ?? emptyPoints();
  const boost = state?.monthMods.successBoost ?? 0;
  const streak = Math.min(state?.failStreak ?? 0, AGENT_STREAK_MAX) * AGENT_STREAK_BONUS;
  const unitBonus = talent.unitId ? 0.03 : 0;
  const base =
    0.34 +
    (stat - job.difficulty) / 150 +
    (talent.stamina - 50) / 300 +
    (job.slack ?? 0) +
    (modifier.anyJob ?? 0) +
    (modifier.jobSuccess?.[job.kind] ?? 0) +
    agent.eye * AGENT_ATTR_EFFECT.eye.success +
    boost +
    unitBonus +
    // 连败补偿：连续翻车后下一次明显更好成（避免「运气差就崩盘」）
    streak;
  return clamp(base, 0.13, 0.95);
}

/* ------------------------------ 开局 ------------------------------ */

export interface AgencySetup {
  difficulty?: AgencyDifficulty;
  length?: AgencyLength;
  origin?: AgencyOrigin;
  agent?: AgentPoints;
  /** 签约倾向的企划（至多两个）。 */
  preferredProjects?: string[];
  /** 联动用的 SeiValue 成绩码（只用来显示 + 决定点数）。 */
  linkedCode?: string;
  linkedAxes?: { axis: string; percent: number }[];
}

/** 开启一局。第二个参数兼容旧的 `createAgency(seed, difficulty)` 写法。 */
export function createAgency(
  seed: number = randomSeed(),
  setup: AgencySetup | AgencyDifficulty = {},
): AgencyState {
  const options: AgencySetup = isDifficulty(setup) ? { difficulty: setup } : setup;
  const difficulty = options.difficulty ?? 'normal';
  const length = options.length ?? 'short';
  const origin = options.origin ?? 'legendary';
  const rule = AGENCY_RULES[difficulty];
  const originRule = AGENCY_ORIGIN_RULES[origin];
  const months = LENGTH_MONTHS[length];
  const rng = mulberry32(seed);

  // 事务所出身会额外给点数（老牌/育成所 0 点，青训营 +1，个人工作室 +3）
  const totalPoints = rule.points + originRule.pointBonus;
  const linked = options.linkedAxes?.length
    ? pointsFromSeiValueAxes(options.linkedAxes, totalPoints + 1)
    : null;
  // 允许留点不用：只收敛上限，不强行补满
  const agent = linked ?? clampPoints(options.agent ?? defaultPoints(totalPoints));

  const ids = drawIds(AGENCY_START_TALENTS, rng, new Set(), options.preferredProjects ?? []);
  const talents = ids.map((id) =>
    makeTalent(id, rng, agent, {
      veteran: rng() < originRule.veteranChance,
      boost: originRule.statBoost,
      fameBoost: originRule.fameBoost,
      wageMul: originRule.wageMul,
      joinedMonth: 1,
    }),
  );

  const items: Partial<Record<ItemKey, number>> = {};

  const base: AgencyState = {
    seed,
    difficulty,
    length,
    origin,
    months,
    month: 1,
    stage: 'recruit',
    talents,
    units: [],
    rng,
    cash: Math.round(rule.cash * originRule.cashMul),
    reputation: rule.reputation,
    offers: [],
    candidates: [],
    log: [],
    pendingEvent: null,
    seenEvents: [],
    agent,
    linkedPoints: linked ? totalPoints + 1 : 0,
    linkedCode: linked ? options.linkedCode : undefined,
    items,
    usedItems: [],
    monthMods: defaultMonthMods(AGENCY_OFFER_COUNT),
    carryMods: {},
    easterEggs: [],
    itemUses: 0,
    wageTotal: 0,
    wagePaid: 0,
    actionsLeft: AGENCY_ACTIONS,
    refreshLeft: AGENCY_CANDIDATE_REFRESH,
    preferredProjects: options.preferredProjects ?? [],
    failStreak: 0,
  };
  const withOffers: AgencyState = { ...base, offers: drawOffers(rng, base) };
  return withCandidates(withOffers);
}

/** 摆好候选人并把阶段调到「招募」或「派活」。 */
function withCandidates(state: AgencyState): AgencyState {
  const filled = refreshCandidates(state);
  return { ...filled, stage: filled.candidates.length ? 'recruit' : 'assign' };
}

/** 到了可签新人的月份就摆候选人（已签满 / 没到月份就置空）。 */
function refreshCandidates(state: AgencyState): AgencyState {
  const { month, rng, talents, monthMods } = state;
  const originRule = AGENCY_ORIGIN_RULES[state.origin];
  const count = 3 + (monthMods.extraCandidates ?? 0) + originRule.candidateBonus;
  const months = state.months;
  const recruitMonths = recruitMonthsOf(months);
  if (!recruitMonths.includes(month) || talents.length >= AGENCY_MAX_TALENTS) {
    return { ...state, candidates: [] };
  }
  const ids = drawIds(count, rng, new Set(talents.map((talent) => talent.id)), state.preferredProjects);
  const veteranChance =
    0.25 +
    state.agent.network * AGENT_ATTR_EFFECT.network.recruitBonus +
    (originRule.veteranChance * 0.5);
  return {
    ...state,
    candidates: ids.map((id) =>
      makeTalent(id, rng, state.agent, {
        veteran: rng() < veteranChance,
        boost: originRule.statBoost,
        joinedMonth: month,
        loyalty: 65,
        wageMul: originRule.wageMul,
      }),
    ),
  };
}

/** 招募阶段重抽一次候选（每次招募最多 3 次）。 */
export function refreshCandidatesNow(state: AgencyState): AgencyState {
  if (state.stage !== 'recruit' || state.refreshLeft <= 0) return state;
  const next = refreshCandidates({ ...state, refreshLeft: state.refreshLeft - 1 });
  return { ...next, refreshLeft: state.refreshLeft - 1 };
}

/** 招募月：短局 1/5/9，长局按季度摊开。 */
export function recruitMonthsOf(months: number): number[] {
  const result: number[] = [];
  for (let month = 1; month <= months; month += Math.max(4, Math.round(months / 3))) {
    result.push(month);
  }
  return result;
}

/** 签下一位候选人（只有招募阶段可用）。 */
export function recruit(state: AgencyState, candidateId: string): AgencyState {
  if (state.stage !== 'recruit') return state;
  const candidate = state.candidates.find((item) => item.id === candidateId);
  if (!candidate) return state;
  const signMul = AGENCY_ORIGIN_RULES[state.origin].signMul;
  const cost = Math.round((candidate.veteran ? 160 : 120) * signMul);
  if (state.talents.length >= AGENCY_MAX_TALENTS || state.cash < cost) return state;
  return withNewTitles({
    ...state,
    stage: 'assign',
    talents: [...state.talents, candidate],
    candidates: [],
    cash: state.cash - cost,
    log: [...state.log, { month: state.month, key: 'recruit', talentId: candidate.id }],
  });
}

/** 跳过招募。 */
export function skipRecruit(state: AgencyState): AgencyState {
  if (state.stage !== 'recruit') return state;
  return { ...state, stage: 'assign', candidates: [] };
}

/* ------------------------------ 数值结算 ------------------------------ */

interface WorkResult {
  talent: AgencyTalent;
  fame: number;
  pay: number;
  /** 翻车时学到的点（日志用）。 */
  lesson?: number;
}

function fameGainOf(job: AgencyJob, talent: AgencyTalent): number {
  const modifier = modifierOf(talent);
  return Math.max(1, Math.round(job.fame * (1 + (talent.charm - 50) / 200 + (modifier.jobFame ?? 0))));
}

function payOf(job: AgencyJob, talent: AgencyTalent, state: AgencyState): number {
  const modifier = modifierOf(talent);
  const rate = 1 + (talent.charm - 50) / 200 + (modifier.jobPay ?? 0);
  const agent = 1 + state.agent.negotiation * AGENT_ATTR_EFFECT.negotiation.pay;
  return Math.round(job.pay * rate * agent * state.monthMods.payRate);
}

function staminaCostOf(job: AgencyJob, talent: AgencyTalent, share = 1): number {
  const modifier = modifierOf(talent);
  const rate = 1 + (modifier.staminaCost ?? 0);
  return Math.max(1, Math.round(job.stamina * rate * share));
}

/** 训练 / 休整：不动成败，只涨对应的数值或回体力；休整期还有概率“自己长本事”。 */
function applySafeJob(
  talent: AgencyTalent,
  job: AgencyJob,
  state: AgencyState,
): { talent: AgencyTalent; spark: { stat: AgencyStatKey; gain: number }[] } {
  const modifier = modifierOf(talent);
  const careBoost = state.agent.care * AGENT_ATTR_EFFECT.care.staminaRegen;
  const regen = job.stamina < 0 ? 1 + Math.abs(modifier.staminaRegen ?? 0) + careBoost : 1;
  const gain = job.gain ?? 0;
  const train = job.train;
  const bump = (value: number) => clamp(value + gain, 0, 100);
  const next: AgencyTalent = {
    ...talent,
    stamina: clamp(talent.stamina + Math.round(job.stamina * regen), 0, 100),
    skill: train === 'skill' || train === 'all' ? bump(talent.skill) : talent.skill,
    vocal: train === 'vocal' || train === 'all' ? bump(talent.vocal) : talent.vocal,
    charm: train === 'charm' || train === 'all' ? bump(talent.charm) : talent.charm,
    loyalty: clamp(talent.loyalty + 2, 0, 100),
  };
  // 公司休整：回体力的同时有概率触发小事件，白赚几项数值
  const spark: { stat: AgencyStatKey; gain: number }[] = [];
  if (job.kind === 'rest' && state.rng() < REST_SPARK_CHANCE) {
    const pool: AgencyStatKey[] = ['skill', 'vocal', 'charm'];
    const count = state.rng() < 0.5 ? 1 : 2;
    for (let index = 0; index < count && pool.length; index += 1) {
      const stat = pool.splice(Math.floor(state.rng() * pool.length) % pool.length, 1)[0];
      const value = 3 + Math.floor(state.rng() * 4);
      next[stat] = clamp(next[stat] + value, 0, 100);
      spark.push({ stat, gain: value });
    }
  }
  return { talent: next, spark };
}

function applyWorkSuccess(job: AgencyJob, talent: AgencyTalent, state: AgencyState, share: number): WorkResult {
  const modifier = modifierOf(talent);
  const fame = fameGainOf(job, talent);
  const key: 'skill' | 'vocal' | 'charm' = job.stat === 'none' ? 'skill' : job.stat;
  // 成长基础 3：接活本身就是涨点的主要途径
  const growth = 3 + (modifier.growth ?? 0) + AGENCY_ORIGIN_RULES[state.origin].growth;
  return {
    talent: {
      ...talent,
      fame: clamp(talent.fame + Math.round(fame * share), 0, 100),
      jobs: talent.jobs + 1,
      stamina: clamp(talent.stamina - staminaCostOf(job, talent, share === 1 ? 0.7 : 0.55), 0, 100),
      [key]: clamp(talent[key] + Math.round(growth * share), 0, 100),
      loyalty: clamp(talent.loyalty + 2 + (modifier.loyaltyGain ?? 0), 0, 100),
    },
    fame,
    pay: payOf(job, talent, state),
  };
}

function applyWorkFailure(job: AgencyJob, talent: AgencyTalent, state: AgencyState, share: number): WorkResult {
  const modifier = modifierOf(talent);
  const decay = (3 + (modifier.loyaltyDecay ?? 0)) * (1 + state.agent.care * AGENT_ATTR_EFFECT.care.loyaltyDecay);
  // 花钱买教训：翻车也大概率长本事（70% 给对应主数值 +2～3）
  const learned = state.rng() < 0.7;
  const key: 'skill' | 'vocal' | 'charm' = job.stat === 'none' ? 'skill' : job.stat;
  const lesson = learned ? 2 + (state.rng() < 0.4 ? 1 : 0) : 0;
  return {
    talent: {
      ...talent,
      fame: clamp(talent.fame + 1, 0, 100),
      jobs: talent.jobs + 1,
      fails: talent.fails + 1,
      [key]: clamp(talent[key] + lesson, 0, 100),
      stamina: clamp(talent.stamina - staminaCostOf(job, talent, share === 1 ? 1 : 0.8), 0, 100),
      loyalty: clamp(talent.loyalty - Math.round(decay * share), 0, 100),
    },
    fame: 0,
    pay: Math.round(payOf(job, talent, state) * 0.45),
    lesson,
  };
}

/** 发工资：每月结算时扣全员月薪；发不出来就全员忠诚下滑。 */
function payWages(state: AgencyState): AgencyState {
  const total = state.talents.reduce((sum, talent) => sum + talent.salary, 0);
  if (total <= 0) return state;
  const cash = state.cash - total;
  const broke = cash < 0;
  return {
    ...state,
    cash,
    wageTotal: total,
    wagePaid: state.wagePaid + total,
    talents: broke
      ? state.talents.map((talent) => ({ ...talent, loyalty: clamp(talent.loyalty - 3, 0, 100) }))
      : state.talents,
    log: [...state.log, { month: state.month, key: 'wage', amount: total, net: -total, ok: broke ? false : true }],
  };
}

/* ------------------------------ 组合 ------------------------------ */

export function unitOf(state: AgencyState, talentId: string): AgencyUnit | undefined {
  const talent = state.talents.find((item) => item.id === talentId);
  if (!talent?.unitId) return undefined;
  return state.units.find((unit) => unit.id === talent.unitId);
}

export function unitById(state: AgencyState, unitId: string): AgencyUnit | undefined {
  return state.units.find((unit) => unit.id === unitId);
}

/** 组合名：玩家取的名字优先，否则用成员名拼。 */
export function unitNameOf(state: AgencyState, unitId: string): string {
  const unit = unitById(state, unitId);
  if (!unit) return '';
  if (unit.name?.trim()) return unit.name.trim();
  return unit.members.map((id) => nameOf(id)).join(UNIT_NAME_JOINER);
}

/** 默认组合名（成员名拼），页面把它当输入框的落位。 */
export function defaultUnitName(members: string[]): string {
  return members.map((id) => nameOf(id)).join(UNIT_NAME_JOINER).slice(0, UNIT_NAME_MAX);
}

export function unitMembersOf(state: AgencyState, unitId: string): AgencyTalent[] {
  const unit = unitById(state, unitId);
  if (!unit) return [];
  return unit.members
    .map((id) => state.talents.find((talent) => talent.id === id))
    .filter((talent): talent is AgencyTalent => Boolean(talent));
}

/** 组合知名度：成员平均值 + 组合自身加成。 */
export function unitFameOf(state: AgencyState, unitId: string): number {
  const members = unitMembersOf(state, unitId);
  const base = members.length
    ? Math.round(members.reduce((sum, talent) => sum + talent.fame, 0) / members.length)
    : 0;
  const unit = unitById(state, unitId);
  return clamp(base + Math.round(unit?.fame ?? 0), 0, 100);
}

/** 成立组合：花 UNIT_FORM_COST，成员忠诚 +8，之后能接组合专场。 */
export function formUnit(state: AgencyState, memberIds: string[], name?: string): AgencyState {
  if (state.stage === 'done' || state.stage === 'event') return state;
  const unique = [...new Set(memberIds)];
  if (unique.length < UNIT_MIN_MEMBERS || unique.length > UNIT_MAX_MEMBERS) return state;
  if (state.units.length >= UNIT_LIMIT || state.cash < UNIT_FORM_COST) return state;
  const members = unique
    .map((id) => state.talents.find((talent) => talent.id === id))
    .filter((talent): talent is AgencyTalent => Boolean(talent));
  if (members.length !== unique.length) return state;
  if (members.some((talent) => talent.unitId)) return state;

  const unit: AgencyUnit = {
    id: `unit-${state.units.length + 1}`,
    name: name?.trim() ? name.trim().slice(0, UNIT_NAME_MAX) : undefined,
    members: unique,
    formedMonth: state.month,
    fame: 0,
    successes: 0,
  };
  return withNewTitles({
    ...state,
    units: [...state.units, unit],
    cash: state.cash - UNIT_FORM_COST,
    talents: state.talents.map((talent) =>
      unique.includes(talent.id)
        ? { ...talent, unitId: unit.id, loyalty: clamp(talent.loyalty + 8, 0, 100) }
        : talent,
    ),
    offers: state.offers.some((offer) => offer.job.unitOnly)
      ? state.offers
      : drawOffers(state.rng, { ...state, units: [...state.units, unit] }),
    log: [...state.log, { month: state.month, key: 'unit', unitId: unit.id }],
  });
}

/** 解散组合（不退款，但成员忠诚小涨：不用再忍队友）。 */
export function disbandUnit(state: AgencyState, unitId: string): AgencyState {
  const unit = unitById(state, unitId);
  if (!unit) return state;
  return {
    ...state,
    units: state.units.filter((item) => item.id !== unitId),
    talents: state.talents.map((talent) =>
      unit.members.includes(talent.id)
        ? { ...talent, unitId: undefined, loyalty: clamp(talent.loyalty + 4, 0, 100) }
        : talent,
    ),
    offers: drawOffers(state.rng, { ...state, units: state.units.filter((item) => item.id !== unitId) }),
  };
}

/* ------------------------------ 成员增减 ------------------------------ */

/** 让成员离所（老牌出走 / 被挖角）：组合人数不够就自动解散。 */
function removeTalent(state: AgencyState, talentId: string): AgencyState {
  const talent = state.talents.find((item) => item.id === talentId);
  if (!talent) return state;
  let units = state.units;
  let talents = state.talents.filter((item) => item.id !== talentId);
  if (talent.unitId) {
    units = units
      .map((unit) =>
        unit.id === talent.unitId ? { ...unit, members: unit.members.filter((id) => id !== talentId) } : unit,
      )
      .filter((unit) => unit.members.length >= UNIT_MIN_MEMBERS);
    const alive = new Set(units.map((unit) => unit.id));
    talents = talents.map((item) =>
      item.unitId && !alive.has(item.unitId) ? { ...item, unitId: undefined } : item,
    );
  }
  return {
    ...state,
    units,
    talents,
    log: [...state.log, { month: state.month, key: 'leave', talentId, unitId: talent.unitId }],
  };
}

/* ------------------------------ 事件 ------------------------------ */

export function eventDefOf(id: AgencyEventKey): AgencyEventDef | undefined {
  return AGENCY_EVENTS.find((event) => event.id === id);
}

/** 当前局面能抽到的事件（彩蛋单独一档，不在这里）。 */
export function eligibleEvents(state: AgencyState): AgencyEventDef[] {
  return NORMAL_EVENTS.filter(
    (event) => !state.seenEvents.includes(event.id) && (!event.when || event.when(state)),
  );
}

/** 按 pick 策略挑当事人。 */
function pickTarget(state: AgencyState, def: AgencyEventDef): string | undefined {
  const talents = state.talents;
  if (!talents.length) return undefined;
  switch (def.pick) {
    case 'none':
      return undefined;
    case 'top':
      return [...talents].sort((a, b) => b.fame - a.fame)[0].id;
    case 'lowestFame':
      return [...talents].sort((a, b) => a.fame - b.fame)[0].id;
    case 'lowLoyalty':
      return [...talents].sort((a, b) => a.loyalty - b.loyalty)[0].id;
    case 'unitMember': {
      const unit = state.units[Math.floor(state.rng() * state.units.length) % state.units.length];
      return unit?.members[Math.floor(state.rng() * unit.members.length) % unit.members.length];
    }
    default:
      return pick(talents, state.rng).id;
  }
}

/** 每次派活结算后：先判彩蛋，再判常态事件。 */
function rollEvent(state: AgencyState): AgencyPendingEvent | null {
  const { rng } = state;
  const limit = maxEventsFor(state.months);
  const eggs = AGENCY_EVENTS.filter((event) => event.easter && !state.seenEvents.includes(event.id));

  // 彩蛋优先且概率极低：撞上就是名场面，不占用常态事件的历史记录
  if (eggs.length && rng() < EASTER_EGG_CHANCE) {
    const egg = pick(eggs, rng);
    return { eventId: egg.id, talentId: pickTarget(state, egg) };
  }

  if (state.seenEvents.filter((id) => !id.startsWith('easter')).length >= limit) return null;
  if (rng() >= eventChance(state.month, state.months)) return null;
  const pool = eligibleEvents(state);
  const chosen = pickWeighted(pool, (event) => event.weight ?? 1, rng);
  if (!chosen) return null;
  return { eventId: chosen.id, talentId: pickTarget(state, chosen) };
}

/** 把一套事件效果落在「一位 / 全所 / 组合」上。 */
function applyEffectsTo(
  state: AgencyState,
  effects: AgencyEventEffects,
  talentId: string | undefined,
  eventId: AgencyEventKey,
): AgencyState {
  let next: AgencyState = { ...state };
  const shield = state.monthMods.shield;
  const soften = (value: number) => (shield && value < 0 ? Math.ceil(value / 2) : value);
  const negotiation = 1 + state.agent.negotiation * AGENT_ATTR_EFFECT.negotiation.cashEvent;

  if (effects.cash) {
    const raw = effects.cash > 0 ? Math.round(effects.cash * negotiation) : effects.cash;
    next.cash = state.cash + soften(raw);
  }
  if (effects.reputation) {
    next.reputation = clamp(state.reputation + soften(effects.reputation), 0, 100);
  }
  if (effects.monthMod) {
    next = applyMonthMod(next, effects.monthMod);
  }
  if (effects.item) {
    next.items = { ...next.items, [effects.item]: (next.items[effects.item] ?? 0) + 1 };
  }

  const bump = (talent: AgencyTalent): AgencyTalent => ({
    ...talent,
    fame: clamp(talent.fame + soften(effects.fame ?? 0), 0, 100),
    stamina: clamp(talent.stamina + soften(effects.stamina ?? 0), 0, 100),
    skill: clamp(talent.skill + (effects.skill ?? 0), 0, 100),
    vocal: clamp(talent.vocal + (effects.vocal ?? 0), 0, 100),
    charm: clamp(talent.charm + (effects.charm ?? 0), 0, 100),
    loyalty: clamp(talent.loyalty + (effects.loyalty ?? 0), 0, 100),
  });

  const scope = effects.scope ?? (talentId ? 'one' : 'none');
  if (scope === 'all') {
    next.talents = next.talents.map(bump);
  } else if (scope === 'unit' && talentId) {
    const unit = unitOf(next, talentId);
    const ids = new Set(unit?.members ?? [talentId]);
    next.talents = next.talents.map((talent) => (ids.has(talent.id) ? bump(talent) : talent));
    if (unit) {
      next.units = next.units.map((item) =>
        item.id === unit.id ? { ...item, fame: clamp(item.fame + Math.round((effects.fame ?? 0) / 2), -50, 100) } : item,
      );
    }
  } else if (scope === 'one' && talentId) {
    next.talents = next.talents.map((talent) => (talent.id === talentId ? bump(talent) : talent));
  }

  if (effects.recruit) {
    const id = drawIds(1, state.rng, new Set(state.talents.map((talent) => talent.id)))[0];
    if (id && next.talents.length < AGENCY_MAX_TALENTS) {
      const incoming = makeTalent(id, state.rng, state.agent, {
        veteran: effects.recruit.veteran,
        fame: effects.recruit.fame,
        loyalty: effects.recruit.loyalty,
        joinedMonth: state.month,
        fromAgency: TRANSFER_EVENTS.has(eventId) ? agencyOf(id) || undefined : undefined,
      });
      next.talents = [...next.talents, incoming];
      next.log = [...next.log, { month: state.month, key: 'recruit', talentId: id }];
    }
  }

  if (effects.leave && talentId) {
    next = removeTalent(next, talentId);
  }

  return next;
}

/** 这些事件是「别所的人来投」，签进来的成员要记一下出处。 */
const TRANSFER_EVENTS = new Set<AgencyEventKey>(['transferIn', 'freelanceDeal']);

/** 事件里写的 `monthMod` → 下个月的临时状态。 */
function applyMonthMod(state: AgencyState, key: keyof AgencyMonthMods): AgencyState {
  const carry = { ...state.carryMods };
  if (key === 'offerCount') carry.offerCount = Math.max(2, state.monthMods.offerCount - 1);
  else if (key === 'payRate') carry.payRate = 0.8;
  else if (key === 'successBoost') carry.successBoost = (carry.successBoost ?? 0) + 0.08;
  else if (key === 'shield') carry.shield = true;
  else if (key === 'insurance') carry.insurance = (carry.insurance ?? 0) + 1;
  else if (key === 'extraCandidates') carry.extraCandidates = (carry.extraCandidates ?? 0) + 1;
  return { ...state, carryMods: carry };
}

/** 玩家为突发事件拍板；结算完进下个月。 */
export function resolveEvent(state: AgencyState, optionId: string): AgencyState {
  if (state.stage !== 'event' || !state.pendingEvent) return state;
  const def = eventDefOf(state.pendingEvent.eventId);
  const option = def?.options.find((item) => item.id === optionId);
  if (!def || !option) return state;
  if (option.requiresCash !== undefined && state.cash < option.requiresCash) return state;

  const { rng, pendingEvent } = state;
  // 转会 / 自由身来投：人脉越好，谈成的概率越高
  const chanceBonus = TRANSFER_EVENTS.has(def.id)
    ? state.agent.network * AGENT_ATTR_EFFECT.network.transferBonus
    : 0;
  const outcome = option.risk
    ? rng() < clamp(option.risk.chance + chanceBonus, 0.05, 0.95)
      ? { effects: option.risk.success, ok: true }
      : { effects: option.risk.failure, ok: false }
    : { effects: option.effects ?? {}, ok: null };

  const resolved = applyEffectsTo(state, outcome.effects, pendingEvent.talentId, def.id);
  const log: AgencyLogEntry[] = [
    ...resolved.log,
    {
      month: state.month,
      key: 'event',
      event: def.id,
      talentId: pendingEvent.talentId,
      optionId: option.id,
      ok: outcome.ok,
    },
  ];

  const easterEggs = def.easter ? [...state.easterEggs, def.id] : state.easterEggs;

  const settled = withNewTitles({
    ...resolved,
    log,
    easterEggs,
    seenEvents: [...state.seenEvents, def.id],
    pendingEvent: null,
  });
  // 事件本身不额外消耗委托，但当年那张卡已经用掉了
  return finishAction({ ...settled, stage: 'assign' }, state.pendingEvent?.offerIndex);
}

/* ------------------------------ 道具 ------------------------------ */

/** 道具商店：随时能买，花钱进背包（每月只限用一件）。 */
export function buyItem(state: AgencyState, key: ItemKey, count = 1): AgencyState {
  const def = AGENCY_ITEMS[key];
  if (!def || count <= 0) return state;
  if (state.stage === 'done') return state;
  const cost = def.cost * count;
  if (state.cash < cost) return state;
  return {
    ...state,
    cash: state.cash - cost,
    items: { ...state.items, [key]: (state.items[key] ?? 0) + count },
    log: [...state.log, { month: state.month, key: 'buy', itemKey: key, amount: cost, net: -cost }],
  };
}

/** 用道具。`targetId` 只对需要点人的道具有用。 */
export function useItem(state: AgencyState, key: ItemKey, targetId?: string): AgencyState {
  const def = AGENCY_ITEMS[key];
  if (!def) return state;
  if (state.stage === 'done' || state.stage === 'event') return state;
  // 同一件道具在每个子回合只能用一次（不同道具可以一起用）
  if (state.usedItems.includes(key)) return state;
  if (def.stage && def.stage !== state.stage) return state;
  // 钱在商店买的时候已经付过，用的时候只看有没有货
  if ((state.items[key] ?? 0) <= 0) return state;
  if (def.target === 'talent') {
    const target = state.talents.find((talent) => talent.id === targetId);
    if (!target) return state;
  }

  let next: AgencyState = {
    ...state,
    usedItems: [...state.usedItems, key],
    itemUses: state.itemUses + 1,
    items: { ...state.items, [key]: (state.items[key] ?? 0) - 1 },
  };
  const bump = (fn: (talent: AgencyTalent) => AgencyTalent) => {
    next.talents = next.talents.map(fn);
  };
  const bumpOne = (fn: (talent: AgencyTalent) => AgencyTalent) => {
    next.talents = next.talents.map((talent) => (talent.id === targetId ? fn(talent) : talent));
  };

  const beforeTarget = targetId ? state.talents.find((talent) => talent.id === targetId) : undefined;

  switch (key) {
    case 'trainingCamp':
      bump((talent) => ({
        ...talent,
        skill: clamp(talent.skill + 6, 0, 100),
        vocal: clamp(talent.vocal + 6, 0, 100),
        stamina: clamp(talent.stamina - 8, 0, 100),
      }));
      break;
    case 'businessTrip':
      next.monthMods = { ...next.monthMods, successBoost: next.monthMods.successBoost + 0.15 };
      break;
    case 'publicity':
      next.reputation = clamp(next.reputation + 8, 0, 100);
      next.monthMods = { ...next.monthMods, shield: true };
      break;
    case 'healthCheck':
      bump((talent) => ({
        ...talent,
        stamina: clamp(talent.stamina + 20, 0, 100),
        loyalty: clamp(talent.loyalty + 4, 0, 100),
      }));
      break;
    case 'giftTickets':
      bumpOne((talent) => ({
        ...talent,
        loyalty: clamp(talent.loyalty + 18, 0, 100),
        fame: clamp(talent.fame + 3, 0, 100),
      }));
      break;
    case 'photoShoot':
      bumpOne((talent) => ({
        ...talent,
        fame: clamp(talent.fame + 8, 0, 100),
        stamina: clamp(talent.stamina - 10, 0, 100),
        loyalty: clamp(talent.loyalty - 4, 0, 100),
      }));
      break;
    case 'coach':
      bumpOne((talent) => {
        const weakest: 'skill' | 'vocal' | 'charm' = (['skill', 'vocal', 'charm'] as const).reduce(
          (weak, key2) => (talent[key2] < talent[weak] ? key2 : weak),
          'skill' as 'skill' | 'vocal' | 'charm',
        );
        return { ...talent, [weakest]: clamp(talent[weakest] + 10, 0, 100) };
      });
      break;
    case 'scoutReport':
      // 候选要等到下一次试音会才用得上 → 写进 carryMods，且没到试音会就一直留着
      next.carryMods = { ...next.carryMods, extraCandidates: (next.carryMods.extraCandidates ?? 0) + 1 };
      break;
    case 'rerollOffers':
      next.offers = drawOffers(next.rng, { ...next, offers: [] });
      break;
    case 'insurance':
      next.monthMods = { ...next.monthMods, insurance: next.monthMods.insurance + 1 };
      break;
    case 'fanEvent':
      bump((talent) => ({
        ...talent,
        fame: clamp(talent.fame + 3, 0, 100),
        stamina: clamp(talent.stamina - 6, 0, 100),
        loyalty: clamp(talent.loyalty + 3, 0, 100),
      }));
      next.reputation = clamp(next.reputation + 4, 0, 100);
      break;
    default:
      break;
  }

  const afterTarget = targetId ? next.talents.find((talent) => talent.id === targetId) : undefined;
  next.log = [
    ...next.log,
    {
      month: state.month,
      key: 'item',
      itemKey: key,
      talentId: targetId,
      gains: beforeTarget && afterTarget ? gainsOf(beforeTarget, afterTarget) : undefined,
    },
  ];
  return withNewTitles(next);
}

/* ------------------------------ 派活 ------------------------------ */

/** 派活：结算本月 → 有事件就先弹事件卡 → 没有就进下个月。 */
export function assignJob(state: AgencyState, offerIndex: number, talentId: string): AgencyState {
  if (state.stage !== 'assign') return state;
  const offer = state.offers.find((item) => item.index === offerIndex);
  const talent = state.talents.find((item) => item.id === talentId);
  if (!offer || !talent) return state;
  const job = offer.job;
  // 组合专场必须派组合成员
  if (job.unitOnly && !talent.unitId) return state;

  const success = job.safe || state.rng() < successRate(job, talent, state);
  const unit = job.unitOnly ? unitOf(state, talentId) : undefined;
  const partners = unit ? unitMembersOf(state, unit.id).filter((item) => item.id !== talentId) : [];

  let next: AgencyState = { ...state };
  const log = [...state.log];
  let insuredFlop = false;
  const replace = (updated: AgencyTalent) => {
    next.talents = next.talents.map((item) => (item.id === updated.id ? updated : item));
  };

  if (job.safe) {
    const safe = applySafeJob(talent, job, state);
    replace(safe.talent);
    log.push({
      month: state.month,
      key: job.train ? 'training' : 'rest',
      talentId,
      job: job.kind,
      restBonus: safe.spark,
      gains: gainsOf(talent, safe.talent),
      net: job.pay,
    });
  } else if (success) {
    const result = applyWorkSuccess(job, talent, state, 1);
    replace(result.talent);
    for (const partner of partners) {
      const shared = applyWorkSuccess(job, partner, state, 0.6);
      replace(shared.talent);
    }
    next.cash = state.cash + result.pay;
    next.reputation = clamp(state.reputation + Math.round(job.fame * 0.6), 0, 100);
    if (unit) {
      next.units = next.units.map((item) =>
        item.id === unit.id
          ? { ...item, successes: item.successes + 1, fame: clamp(item.fame + Math.round(job.fame * 0.5), -50, 100) }
          : item,
      );
    }
    log.push({
      month: state.month,
      key: 'success',
      talentId,
      job: job.kind,
      amount: result.pay,
      net: result.pay,
      gains: gainsOf(talent, result.talent),
    });
  } else {
    // 事故保险：本月第一次翻车不算数（不掉忠诚、不掉声望、不记败绩），保险就用掉了
    const insured = state.monthMods.insurance > 0;
    const result = applyWorkFailure(job, talent, state, 1);
    if (insured) {
      replace({ ...result.talent, fails: talent.fails, loyalty: talent.loyalty });
      next.monthMods = { ...next.monthMods, insurance: state.monthMods.insurance - 1 };
      insuredFlop = true;
    } else {
      replace(result.talent);
    }
    for (const partner of partners) {
      replace(applyWorkFailure(job, partner, state, 0.7).talent);
    }
    next.cash = state.cash + result.pay;
    next.reputation = insured
      ? state.reputation
      : clamp(state.reputation - Math.max(1, Math.round(job.fame * 0.18)), 0, 100);
    if (unit) {
      next.units = next.units.map((item) =>
        item.id === unit.id ? { ...item, fame: clamp(item.fame - Math.round(job.fame * 0.3), -50, 100) } : item,
      );
    }
    log.push({
      month: state.month,
      key: 'fail',
      talentId,
      job: job.kind,
      amount: result.pay,
      net: result.pay,
      lesson: result.lesson,
      gains: gainsOf(talent, insured ? { ...result.talent, fails: talent.fails, loyalty: talent.loyalty } : result.talent),
    });
  }

  // 累到极限会想走人（现实感：体力见底的成员忠诚掉得更快）
  next.talents = next.talents.map((item) =>
    item.id === talentId && item.stamina <= 25
      ? { ...item, loyalty: clamp(item.loyalty - 3, 0, 100) }
      : item,
  );

  // 连败补偿计数：训练/休整不清零也不累加，保险兜住的翻车不算
  next.failStreak = job.safe
    ? state.failStreak
    : success
      ? 0
      : insuredFlop
        ? state.failStreak
        : Math.min(state.failStreak + 1, AGENT_STREAK_MAX + 2);

  next.log = log;
  next = withNewTitles(next);

  const event = rollEvent(next);
  if (event) {
    // 事件结算完再扣行动点（pendingEvent 里带上这张卡）
    return { ...next, stage: 'event', pendingEvent: { ...event, offerIndex } };
  }
  return finishAction(next, offerIndex);
}

/** 一个子回合结束：还剩行动点就继续在本月选活，用完就进下个月。 */
function finishAction(state: AgencyState, usedOfferIndex?: number): AgencyState {
  const actionsLeft = Math.max(0, state.actionsLeft - 1);
  const offers =
    usedOfferIndex === undefined
      ? state.offers
      : state.offers.filter((offer) => offer.index !== usedOfferIndex);
  if (actionsLeft > 0) {
    // 每个子回合都是全新的「三选一」：重新发一批委托，道具使用限制也跟着刷新
    return {
      ...state,
      actionsLeft,
      offers: drawOffers(state.rng, { ...state, offers: [] }),
      usedItems: [],
      stage: 'assign',
      pendingEvent: null,
    };
  }
  return advanceMonth({ ...state, actionsLeft: 0, offers });
}

/* ------------------------------ 月份推进 ------------------------------ */

/** 进入下个月（或收局），并处理工资 / carryMods / 定期补给。 */
function advanceMonth(state: AgencyState): AgencyState {
  // 先发这个月的工资（发不出来则全员忠诚下滑）
  const paid = payWages(state);
  const mods: AgencyMonthMods = { ...defaultMonthMods(AGENCY_OFFER_COUNT), ...paid.carryMods };
  if (paid.month >= paid.months) {
    return { ...paid, stage: 'done', month: paid.months, offers: [], candidates: [], pendingEvent: null, monthMods: mods };
  }
  const month = paid.month + 1;
  let next: AgencyState = {
    ...paid,
    month,
    stage: 'assign',
    offers: [],
    candidates: [],
    pendingEvent: null,
    actionsLeft: AGENCY_ACTIONS,
    refreshLeft: AGENCY_CANDIDATE_REFRESH,
    usedItems: [],
    monthMods: mods,
    carryMods: {},
  };
  // 「星探报告」加的那位候选要等到试音会，还没到就继续留着
  if (paid.monthMods.extraCandidates && !recruitMonthsOf(paid.months).includes(month)) {
    next.monthMods = { ...next.monthMods, extraCandidates: paid.monthMods.extraCandidates };
  }
  // 每 6 个月发一件补给道具已经取消：道具一律到商店买，只限每月用一次
  if (month % 6 === 1) {
    next.monthMods = { ...next.monthMods };
  }
  next.offers = drawOffers(paid.rng, next);
  return withCandidates(next);
}

/* ------------------------------ 结算 ------------------------------ */

export type AgencyAwardKey = 'breakout' | 'bestNewcomer' | 'bestLead' | 'busiest' | 'bestUnit' | 'fanFavorite';

export const AGENCY_AWARD_KEYS: AgencyAwardKey[] = [
  'breakout',
  'bestNewcomer',
  'bestLead',
  'busiest',
  'bestUnit',
  'fanFavorite',
];

export interface AgencyReport {
  score: number;
  grade: 'S' | 'A' | 'B' | 'C';
  reputation: number;
  cash: number;
  /** 开局事务所类型与合约长度。 */
  origin: AgencyOrigin;
  /** 计划月数与实际打完的月数。 */
  months: number;
  /** 按知名度排序的成员（最多 3 位）。 */
  top: { id: string; fame: number; grade: string; titles: TitleKey[]; traits: TraitKey[] }[];
  highlights: { key: AgencyEventKey; talentId?: string }[];
  awards: { key: AgencyAwardKey; talentId?: string; unitId?: string }[];
  /** 触发过的彩蛋（名场面）。 */
  easterEggs: AgencyEventKey[];
  units: { id: string; members: string[]; fame: number; successes: number }[];
  jobs: number;
  itemUses: number;
  titleCount: number;
  /** 全年发出的工资总额（万）。 */
  wagePaid: number;
}

export function talentGrade(fame: number): 'S' | 'A' | 'B' | 'C' | 'D' {
  if (fame >= 75) return 'S';
  if (fame >= 55) return 'A';
  if (fame >= 35) return 'B';
  if (fame >= 18) return 'C';
  return 'D';
}

/** 年报里优先展示的好事（其余按发生顺序兜底）。 */
const GOOD_EVENTS: AgencyEventKey[] = [
  'viral',
  'easterPresident',
  'easterNasa',
  'easterTimeCover',
  'easterPrimeMinister',
  'award',
  'voiceAward',
  'movieLead',
  'songDeal',
  'variety',
  'offer',
  'graduation',
  'unitStage',
  'flu',
  'sick',
  'poach',
  'taxAudit',
  'scandal',
];

function pickHighlights(state: AgencyState): { key: AgencyEventKey; talentId?: string }[] {
  const events = state.log.filter((entry) => entry.key === 'event' && entry.event);
  return [...events]
    .sort((a, b) => GOOD_EVENTS.indexOf(a.event as AgencyEventKey) - GOOD_EVENTS.indexOf(b.event as AgencyEventKey))
    .slice(0, 3)
    .map((entry) => ({ key: entry.event as AgencyEventKey, talentId: entry.talentId }));
}

function pickAwards(state: AgencyState): { key: AgencyAwardKey; talentId?: string; unitId?: string }[] {
  const awards: { key: AgencyAwardKey; talentId?: string; unitId?: string }[] = [];

  const topFame = [...state.talents].sort((a, b) => b.fame - a.fame)[0];
  if (topFame && topFame.fame > 0) awards.push({ key: 'breakout', talentId: topFame.id });
  if (topFame && topFame.fame >= 45) awards.push({ key: 'fanFavorite', talentId: topFame.id });

  const recruited = new Set(
    state.log.filter((entry) => entry.key === 'recruit' && entry.talentId).map((e) => e.talentId as string),
  );
  const rookie = [...state.talents].filter((talent) => recruited.has(talent.id)).sort((a, b) => b.fame - a.fame)[0];
  if (rookie) awards.push({ key: 'bestNewcomer', talentId: rookie.id });

  const leadCounts = new Map<string, number>();
  for (const entry of state.log) {
    if (entry.key !== 'success' || !entry.talentId) continue;
    if (entry.job !== 'animeLead' && entry.job !== 'gameVoice' && entry.job !== 'themeSong' && entry.job !== 'movieDub') continue;
    leadCounts.set(entry.talentId, (leadCounts.get(entry.talentId) ?? 0) + 1);
  }
  const lead = [...leadCounts.entries()].sort((a, b) => b[1] - a[1])[0];
  if (lead) awards.push({ key: 'bestLead', talentId: lead[0] });

  const busiest = [...state.talents].sort((a, b) => b.jobs - a.jobs)[0];
  if (busiest && busiest.jobs >= 2) awards.push({ key: 'busiest', talentId: busiest.id });

  const bestUnit = [...state.units].sort((a, b) => b.successes - a.successes)[0];
  if (bestUnit && bestUnit.successes > 0) awards.push({ key: 'bestUnit', unitId: bestUnit.id });

  // 同一个人（或同一个团）不重复领奖，最多 4 个
  const taken = new Set<string>();
  return awards
    .filter((award) => {
      const key = award.talentId ?? award.unitId ?? '';
      if (!key || taken.has(key)) return false;
      taken.add(key);
      return true;
    })
    .slice(0, 4);
}

export function reportOf(state: AgencyState): AgencyReport {
  const score = clamp(Math.round(state.reputation), 0, 100);
  const grade: AgencyReport['grade'] = score >= 85 ? 'S' : score >= 70 ? 'A' : score >= 55 ? 'B' : 'C';
  const top = [...state.talents]
    .sort((a, b) => b.fame - a.fame)
    .slice(0, 3)
    .map((talent) => ({
      id: talent.id,
      fame: talent.fame,
      grade: talentGrade(talent.fame),
      titles: talent.titles,
      traits: talent.traits,
    }));
  return {
    score,
    grade,
    reputation: state.reputation,
    cash: state.cash,
    origin: state.origin,
    months: state.months,
    top,
    highlights: pickHighlights(state),
    awards: pickAwards(state),
    easterEggs: state.easterEggs,
    units: state.units.map((unit) => ({
      id: unit.id,
      members: unit.members,
      fame: unitFameOf(state, unit.id),
      successes: unit.successes,
    })),
    jobs: state.talents.reduce((total, talent) => total + talent.jobs, 0),
    itemUses: state.itemUses,
    titleCount: state.talents.reduce((total, talent) => total + talent.titles.length, 0),
    wagePaid: state.wagePaid,
  };
}

/* ------------------------------ 展示用 ------------------------------ */

export function identityOf(id: string): SeiyuuIdentity | undefined {
  return SEIYUU_BY_ID.get(id);
}

export function nameOf(id: string): string {
  return SEIYUU_BY_ID.get(id)?.name ?? id;
}

export function photoOf(id: string): string {
  return seiyuuPhotoPath(id);
}

export function agencyLabelOf(id: string): string {
  return agencyOf(id);
}

/** 分享图默认文件名前缀。 */
export const AGENCY_POSTER_PREFIX = 'seiyuu-agency';
