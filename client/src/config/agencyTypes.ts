/**
 * 「声优事务所经营」的类型与常量。
 *
 * 玩法拆成三块放不同文件，避免一个文件几千行：
 * - 本文件：类型 + 常量 + 数值计算（特质/称号的加成怎么叠）
 * - `agencyData.ts`：委托、事件、彩蛋、道具、特质、称号的静态表
 * - `agencySim.ts`：状态机（开局、派活、事件、道具、组合、结算）
 * - `seiyuuAgency.ts`：对外统一 re-export（页面与测试只认这一个入口）
 */

/* ------------------------------ 回合长度 ------------------------------ */

export type AgencyLength = 'short' | 'standard' | 'long';

export const AGENCY_LENGTHS: AgencyLength[] = ['short', 'standard', 'long'];

/** 各档回合长度（月）。 */
export const LENGTH_MONTHS: Record<AgencyLength, number> = {
  short: 12,
  standard: 24,
  long: 36,
};

/** 向后兼容：默认（短局）长度。 */
export const AGENCY_MONTHS = LENGTH_MONTHS.short;

/* ------------------------------ 难度 ------------------------------ */

export type AgencyDifficulty = 'easy' | 'normal' | 'hard';

export const AGENCY_DIFFICULTIES: AgencyDifficulty[] = ['easy', 'normal', 'hard'];

export interface AgencyRule {
  cash: number;
  reputation: number;
  /** 开局加点总点数（默认的手动加点）。 */
  points: number;
}

export const AGENCY_RULES: Record<AgencyDifficulty, AgencyRule> = {
  easy: { cash: 980, reputation: 30, points: 14 },
  normal: { cash: 860, reputation: 22, points: 12 },
  hard: { cash: 720, reputation: 16, points: 10 },
};

/* ------------------------------ 事务所出身 ------------------------------ */

/** 开局事务所类型：决定开局成员、资金、工资、招募条件。 */
export type AgencyOrigin = 'legendary' | 'academy' | 'rookie' | 'boutique';

export const AGENCY_ORIGINS: AgencyOrigin[] = ['legendary', 'academy', 'rookie', 'boutique'];

export interface AgencyOriginRule {
  /** 开局资金倍率。 */
  cashMul: number;
  /** 成员工资倍率（老牌所工资高）。 */
  wageMul: number;
  /** 开局成员是老牌的概率（1 = 全员老牌）。 */
  veteranChance: number;
  /** 开局成员三项主数值的增减。 */
  statBoost: number;
  /** 开局成员知名度加成。 */
  fameBoost: number;
  /** 每次成功的额外成长。 */
  growth: number;
  /** 每次招募多给几位候选。 */
  candidateBonus: number;
  /** 签约费倍率。 */
  signMul: number;
  /** 经纪人额外加点。 */
  pointBonus: number;
}

export const AGENCY_ORIGIN_RULES: Record<AgencyOrigin, AgencyOriginRule> = {
  /** 老牌事务所：全员老资历，工资贵。 */
  legendary: { cashMul: 1, wageMul: 1.05, veteranChance: 1, statBoost: 0, fameBoost: 0, growth: 0, candidateBonus: 0, signMul: 1, pointBonus: 0 },
  /** 专业育成所：钱多、工资便宜、成长快。 */
  academy: { cashMul: 1.35, wageMul: 0.85, veteranChance: 0, statBoost: 0, fameBoost: 0, growth: 1, candidateBonus: 0, signMul: 1, pointBonus: 0 },
  /** 新人青训营：候选人更多、签约便宜，但都是白纸。 */
  rookie: { cashMul: 0.9, wageMul: 0.75, veteranChance: 0, statBoost: -6, fameBoost: 0, growth: 2, candidateBonus: 2, signMul: 0.7, pointBonus: 1 },
  /** 独立工作室：钱少工资低，但老板亲自带（加点更多）。 */
  boutique: { cashMul: 0.8, wageMul: 0.65, veteranChance: 0.34, statBoost: 0, fameBoost: 0, growth: 0, candidateBonus: 0, signMul: 1, pointBonus: 3 },
};

/** 月薪基数（万）：老牌贵、新人便宜。 */
export const WAGE_BASE = { veteran: 19, rookie: 11 } as const;

/** 每月有几个「子回合」（每个子回合 = 三选一，派一次活）。 */
export const AGENCY_ACTIONS = 3;

/** 每次招募可以刷新候选的次数。 */
export const AGENCY_CANDIDATE_REFRESH = 3;

/** 签约倾向企划的声优被抽到的概率。 */
export const PREFERRED_PROJECT_CHANCE = 0.7;

/** 连败补偿：每连败一次下次派活成功率 +，最多叠 3 次。 */
export const AGENT_STREAK_BONUS = 0.08;
export const AGENT_STREAK_MAX = 3;

/** 公司休整期间触发小事件的概率（回体力的同时给数值）。 */
export const REST_SPARK_CHANCE = 0.45;

/* ------------------------------ 经纪人（玩家） ------------------------------ */

export type AgentAttr = 'network' | 'eye' | 'negotiation' | 'care';

export const AGENT_ATTRS: AgentAttr[] = ['network', 'eye', 'negotiation', 'care'];

export type AgentPoints = Record<AgentAttr, number>;

export const AGENT_ATTR_MAX = 10;

/** 单点上线的加成（每点）。 */
export const AGENT_ATTR_EFFECT = {
  /** 人脉：转来投 / 挖角 更容易，招募候选更好，事件里的「找人」更容易成 */
  network: { recruitBonus: 0.06, transferBonus: 0.05 },
  /** 眼光：全所委托成功率 +，抽到好特质的概率 + */
  eye: { success: 0.02, traitLuck: 0.05 },
  /** 谈判：片酬倍率 +，事件金钱收益 +
   */
  negotiation: { pay: 0.04, cashEvent: 0.05 },
  /** 照顾：体力恢复 +，忠诚衰减 −，离开事件更少 */
  care: { staminaRegen: 0.08, loyaltyDecay: -0.05 },
} as const;

export function emptyPoints(): AgentPoints {
  return { network: 0, eye: 0, negotiation: 0, care: 0 };
}

/* ------------------------------ 委托 ------------------------------ */

export const AGENCY_JOB_KINDS = [
  /* 入门档：难度低、钱少，新手期能接得住 */
  'commercial',
  'animeSide',
  'radioShow',
  /* 常规档 */
  'gameVoice',
  'varietyShow',
  'stageLive',
  'themeSong',
  /* 挑战档 */
  'animeLead',
  'movieDub',
  'unitLive',
  /* 顶级档：后期才放出 */
  'filmLead',
  'worldTour',
  'awardHost',
  /* 无成败判定的自修活（分项训练 + 休整） */
  'singingLesson',
  'danceLesson',
  'actingLesson',
  'dubbingLesson',
  'rest',
] as const;

export type AgencyJobKind = (typeof AGENCY_JOB_KINDS)[number];

/** 委托档位：前期只出低档，免得开局全是接不住的活。 */
export type AgencyTier = 'entry' | 'normal' | 'hard' | 'elite';

export const AGENCY_TIERS: AgencyTier[] = ['entry', 'normal', 'hard', 'elite'];

/** 各档放出所需的进度（0~1 的合约进度）。 */
export const AGENCY_TIER_UNLOCK: Record<AgencyTier, number> = {
  entry: 0,
  normal: 0.06,
  hard: 0.28,
  elite: 0.55,
};

/** 委托难度随队伍水平浮动：最终难度 = 队伍该数值的参考值 × 这个系数。 */
export const AGENCY_TIER_DIFFICULTY: Record<AgencyTier, number> = {
  entry: 0.58,
  normal: 0.78,
  hard: 0.95,
  elite: 1.1,
};

/** 公告委托的难度下限 / 上限。 */
export const AGENCY_DIFFICULTY_FLOOR = 12;
export const AGENCY_DIFFICULTY_CEIL = 96;

/** 抽档位时的权重（越往后越容易出大活，但高档不会被刷屏）。 */
export const AGENCY_TIER_WEIGHT: Record<AgencyTier, number> = {
  entry: 5,
  normal: 4,
  hard: 3,
  elite: 2,
};

/** 委托会对上的三项「主数值」（体力与知名度不参与难度判定）。 */
export type AgencyStatKey = 'skill' | 'vocal' | 'charm';

export interface AgencyJob {
  kind: AgencyJobKind;
  /** 需要的主数值；`none` = 训练 / 休整。 */
  stat: AgencyStatKey | 'none';
  /** 档位：入门 / 常规 / 挑战 / 顶级。 */
  tier: AgencyTier;
  difficulty: number;
  pay: number;
  fame: number;
  /** 体力变化：正数 = 消耗，负数 = 恢复。 */
  stamina: number;
  /** 成功率修正（负值 = 这类活更容易翻车）。 */
  slack?: number;
  /** 不成败判定（训练 / 休整）。 */
  safe?: boolean;
  /** 训练课练哪项（`all` = 三项各加一部分）。 */
  train?: AgencyStatKey | 'all';
  /** 训练课的涨点幅度。 */
  gain?: number;
  /** 只允许组合成员接。 */
  unitOnly?: boolean;
}

/* ------------------------------ 成员 ------------------------------ */

export interface AgencyTalentStats {
  skill: number;
  vocal: number;
  charm: number;
  stamina: number;
}

export interface AgencyTalent extends AgencyTalentStats {
  id: string;
  fame: number;
  jobs: number;
  /** 翻车次数（称号判定用）。 */
  fails: number;
  /** 忠诚度 0~100：过低会因为挖角 / 离开事件走人。 */
  loyalty: number;
  /** 入所月份（最佳新人判定，也用来区分老牌 / 新人）。 */
  joinedMonth: number;
  /** 老牌声优（数值更稳、忠诚更脆）。 */
  veteran: boolean;
  /** 月薪（万），每月发工资时扣。 */
  salary: number;
  /** 从别的事务所转来的话，记一下出处，转来事件文案用得上。 */
  fromAgency?: string;
  /** 天生特质。 */
  traits: TraitKey[];
  /** 已达成的称号。 */
  titles: TitleKey[];
  /** 所属组合 id。 */
  unitId?: string;
}

/* ------------------------------ 特质与称号 ------------------------------ */

/** 一个加成集合：委托成功率按类型、知名度/片酬倍率、体力消耗、忠诚衰减都在这。 */
export interface TalentModifier {
  /** 按委托类型加成功率（加法，0.12 = +12%）。 */
  jobSuccess?: Partial<Record<AgencyJobKind, number>>;
  /** 所有委托成功率。 */
  anyJob?: number;
  /** 知名度收益倍率加成（0.25 = +25%）。 */
  jobFame?: number;
  /** 片酬倍率加成。 */
  jobPay?: number;
  /** 体力消耗倍率变化（-0.25 = 少花 25%）。 */
  staminaCost?: number;
  /** 体力恢复加成（倍率）。 */
  staminaRegen?: number;
  /** 翻车时的额外忠诚损失（绝对值，越小越玻璃心）。 */
  loyaltyDecay?: number;
  /** 成功时的忠诚变化加成（正值更感恩）。 */
  loyaltyGain?: number;
  /** 数值成长加成（每次成功额外加的主数值）。 */
  growth?: number;
}

export type TraitKey =
  | 'leadAura'
  | 'radioVoice'
  | 'varietySense'
  | 'ironThroat'
  | 'glassHeart'
  | 'workaholic'
  | 'mediaDarling'
  | 'introvert'
  | 'goldenEar'
  | 'stageBorn';

export type TraitRarity = 'common' | 'rare' | 'legend';

export interface TraitDef {
  key: TraitKey;
  rarity: TraitRarity;
  /** 抽取权重（越大越常见）。 */
  weight: number;
  /** 是不是负面特质（招募卡上会标出来）。 */
  flaw?: boolean;
  modifier: TalentModifier;
}

export type TitleKey =
  | 'leadMachine'
  | 'radioQueen'
  | 'varietyStar'
  | 'ironBody'
  | 'comeback'
  | 'unitSoul'
  | 'newcomerKing'
  | 'livingLegend'
  | 'president'
  | 'cosmicNarrator';

export interface TitleDef {
  key: TitleKey;
  /** 稀有度：彩蛋称号单独一档，结算页会打星。 */
  rarity: 'normal' | 'rare' | 'easter';
  modifier: TalentModifier;
  /** 判定条件（按成员的履历 + 事务所局面）。 */
  check: (talent: AgencyTalent, state: TitleCheckContext) => boolean;
}

/** 称号判定需要的最小上下文（避免把整个 state 类型拖进来）。 */
export interface TitleCheckContext {
  month: number;
  reputation: number;
  /** 该成员各类型委托的成功次数。 */
  jobSuccess: Partial<Record<AgencyJobKind, number>>;
  /** 该成员组合的成功次数。 */
  unitSuccess: number;
  easterEggs: AgencyEventKey[];
}

/** 把若干 modifier 合并成一个（加法叠加，倍率也按加法叠加）。 */
export function mergeModifiers(modifiers: (TalentModifier | undefined)[]): TalentModifier {
  const merged: TalentModifier = { jobSuccess: {} };
  for (const modifier of modifiers) {
    if (!modifier) continue;
    merged.anyJob = (merged.anyJob ?? 0) + (modifier.anyJob ?? 0);
    merged.jobFame = (merged.jobFame ?? 0) + (modifier.jobFame ?? 0);
    merged.jobPay = (merged.jobPay ?? 0) + (modifier.jobPay ?? 0);
    merged.staminaCost = (merged.staminaCost ?? 0) + (modifier.staminaCost ?? 0);
    merged.staminaRegen = (merged.staminaRegen ?? 0) + (modifier.staminaRegen ?? 0);
    merged.loyaltyDecay = (merged.loyaltyDecay ?? 0) + (modifier.loyaltyDecay ?? 0);
    merged.loyaltyGain = (merged.loyaltyGain ?? 0) + (modifier.loyaltyGain ?? 0);
    merged.growth = (merged.growth ?? 0) + (modifier.growth ?? 0);
    for (const [kind, value] of Object.entries(modifier.jobSuccess ?? {})) {
      const key = kind as AgencyJobKind;
      merged.jobSuccess![key] = (merged.jobSuccess![key] ?? 0) + (value ?? 0);
    }
  }
  return merged;
}

/* ------------------------------ 道具 ------------------------------ */

export type ItemKey =
  | 'trainingCamp'
  | 'businessTrip'
  | 'publicity'
  | 'healthCheck'
  | 'giftTickets'
  | 'photoShoot'
  | 'coach'
  | 'scoutReport'
  | 'rerollOffers'
  | 'insurance'
  | 'fanEvent';

export interface ItemDef {
  key: ItemKey;
  /** 花费（万）。0 = 不花钱。 */
  cost: number;
  /** 需要玩家再点一位成员才能生效。 */
  target?: 'talent';
  /** 只在某个阶段可用（默认任何阶段）。 */
  stage?: 'assign' | 'recruit';
  /** 每月最多用一次：所有道具都走这条，避免「全靠道具」碾压。 */
  note: 'monthly';
  /** 商店里的分类标题（i18n 键后缀）。 */
  group?: 'growth' | 'showbiz' | 'safety';
}

/* ------------------------------ 事件 ------------------------------ */

export type AgencyEventKey =
  | 'viral'
  | 'scandal'
  | 'sick'
  | 'offer'
  | 'graduation'
  | 'award'
  | 'poach'
  | 'flu'
  | 'variety'
  | 'songDeal'
  | 'veteranLeaving'
  | 'transferIn'
  | 'freelanceDeal'
  | 'movieLead'
  | 'gossip'
  | 'backlash'
  | 'voiceAward'
  | 'industryWinter'
  | 'taxAudit'
  | 'unitClash'
  | 'unitBreak'
  | 'unitStage'
  | 'easterPresident'
  | 'easterNasa'
  | 'easterTimeCover'
  | 'easterPrimeMinister';

export const AGENCY_EVENT_KEYS: AgencyEventKey[] = [
  'viral',
  'scandal',
  'sick',
  'offer',
  'graduation',
  'award',
  'poach',
  'flu',
  'variety',
  'songDeal',
  'veteranLeaving',
  'transferIn',
  'freelanceDeal',
  'movieLead',
  'gossip',
  'backlash',
  'voiceAward',
  'industryWinter',
  'taxAudit',
  'unitClash',
  'unitBreak',
  'unitStage',
  'easterPresident',
  'easterNasa',
  'easterTimeCover',
  'easterPrimeMinister',
];

/** 彩蛋事件（抽中概率极低，单独一档）。 */
export const EASTER_EGG_KEYS: AgencyEventKey[] = [
  'easterPresident',
  'easterNasa',
  'easterTimeCover',
  'easterPrimeMinister',
];

/** 事件效果。`scope` 决定落在「一位 / 全所 / 组合」上。 */
export interface AgencyEventEffects {
  cash?: number;
  reputation?: number;
  fame?: number;
  stamina?: number;
  skill?: number;
  vocal?: number;
  charm?: number;
  loyalty?: number;
  /** 默认 one（当事人）；all = 全所；unit = 当事人所在组合；none = 不落到人身上。 */
  scope?: 'one' | 'all' | 'unit' | 'none';
  /** 让当事人离所（老牌离开 / 被挖走）。 */
  leave?: boolean;
  /** 立刻签进一位新人/中坚。 */
  recruit?: { veteran: boolean; fame: number; loyalty: number };
  /** 下次结算开始生效的临时状态（行业寒冬 / 公关保护）。 */
  monthMod?: keyof AgencyMonthMods;
  /** 立刻给的道具。 */
  item?: ItemKey;
}

export interface AgencyMonthMods {
  /** 本月派活成功率加成（跑通告班表）。 */
  successBoost: number;
  /** 负面事件的数值损失减半（公关通稿）。 */
  shield: boolean;
  /** 本月委托数量（行业寒冬 → 2）。 */
  offerCount: number;
  /** 本月收益倍率（行业寒冬 → 0.8）。 */
  payRate: number;
  /** 下一个招募月的候选人数加成（星探报告）。 */
  extraCandidates: number;
  /** 健康类负面事件免疫次数（艺能保险）。 */
  insurance: number;
}

export interface AgencyEventOption {
  id: string;
  effects?: AgencyEventEffects;
  risk?: { chance: number; success: AgencyEventEffects; failure: AgencyEventEffects };
  /** 需要额外花钱才能选（选之前先看钱够不够）。 */
  requiresCash?: number;
}

export interface AgencyEventDef {
  id: AgencyEventKey;
  when?: (state: AgencyEventState) => boolean;
  weight?: number;
  /** 需要点一位当事人时怎么挑。 */
  pick?: 'random' | 'top' | 'lowLoyalty' | 'unitMember' | 'lowestFame' | 'none';
  /** 健康类事件（艺能保险可免疫）。 */
  health?: boolean;
  /** 彩蛋事件。 */
  easter?: boolean;
  /** 事件卡头图的色调：好事 / 麻烦 / 大场面 / 生意。 */
  tone?: 'good' | 'bad' | 'hype' | 'deal';
  options: AgencyEventOption[];
}

/** 事件条件判定需要的最小局面（不用把整个 state 拖进 data 文件）。 */
export interface AgencyEventState {
  month: number;
  months: number;
  cash: number;
  reputation: number;
  talents: AgencyTalent[];
  units: AgencyUnit[];
}

/* ------------------------------ 组合 ------------------------------ */

export interface AgencyUnit {
  id: string;
  /** 玩家取的名字（留空则用成员名拼，见 unitNameOf）。 */
  name?: string;
  /** i18n 里没有预设名，用成员名拼出来（见 unitNameOf）。 */
  members: string[];
  formedMonth: number;
  /** 组合自身的知名度（专场演唱会等大活会加）。 */
  fame: number;
  /** 组合成功的次数（称号判定）。 */
  successes: number;
}

/** 组合名长度上限（玩家自定义）。 */
export const UNIT_NAME_MAX = 14;

/** 成立组合的花费与人数区间。 */
export const UNIT_FORM_COST = 90;
export const UNIT_MIN_MEMBERS = 2;
export const UNIT_MAX_MEMBERS = 3;
/** 一局最多组几个团。 */
export const UNIT_LIMIT = 2;

/** 开局成员数 / 成员上限。 */
export const AGENCY_START_TALENTS = 3;
export const AGENCY_MAX_TALENTS = 6;

/* ------------------------------ 状态 ------------------------------ */

export interface AgencyOffer {
  index: number;
  job: AgencyJob;
}

export interface AgencyLogEntry {
  month: number;
  key: 'success' | 'fail' | 'training' | 'rest' | 'event' | 'recruit' | 'item' | 'buy' | 'unit' | 'leave' | 'title' | 'wage';
  talentId?: string;
  job?: AgencyJobKind;
  event?: AgencyEventKey;
  optionId?: string;
  ok?: boolean | null;
  itemKey?: ItemKey;
  unitId?: string;
  /** 称号 key（`seiyuuAgency.titles.<key>.name`）。 */
  titleKey?: TitleKey;
  /** 金额（片酬 / 工资）。 */
  amount?: number;
  /** 本次资金净变化（片酬 / 工资 / 道具花费 / 事件收支）。 */
  net?: number;
  /** 本次的数值变化明细（日志里一条条列出来）。 */
  gains?: { stat: 'skill' | 'vocal' | 'charm' | 'stamina' | 'fame' | 'loyalty'; delta: number }[];
  /** 翻车学到的点数。 */
  lesson?: number;
  /** 公司休整期间涨的数值。 */
  restBonus?: { stat: AgencyStatKey; gain: number }[];
}

export interface AgencyPendingEvent {
  eventId: AgencyEventKey;
  talentId?: string;
  /** 引发这次事件的那张委托卡（结算后要扣行动点并移除）。 */
  offerIndex?: number;
}

export interface AgencyState {
  seed: number;
  difficulty: AgencyDifficulty;
  length: AgencyLength;
  /** 开局事务所类型。 */
  origin: AgencyOrigin;
  /** 计划月数（= LENGTH_MONTHS[length]）。 */
  months: number;
  month: number;
  stage: 'recruit' | 'assign' | 'event' | 'done';
  talents: AgencyTalent[];
  units: AgencyUnit[];
  rng: () => number;
  cash: number;
  reputation: number;
  offers: AgencyOffer[];
  candidates: AgencyTalent[];
  log: AgencyLogEntry[];
  pendingEvent: AgencyPendingEvent | null;
  seenEvents: AgencyEventKey[];
  /** 经纪人加点。 */
  agent: AgentPoints;
  /** 联动 SeiValue 得到的加点（0 = 没联动）。 */
  linkedPoints: number;
  /** 背包：道具 key → 数量。 */
  items: Partial<Record<ItemKey, number>>;
  /** 本子回合已经用过的道具（同一件每子回合只能用一次）。 */
  usedItems: ItemKey[];
  /** 临时状态（下个月重置）。 */
  monthMods: AgencyMonthMods;
  /** 事件带来的、要在下个月生效的临时状态。 */
  carryMods: Partial<AgencyMonthMods>;
  /** 已触发的彩蛋事件。 */
  easterEggs: AgencyEventKey[];
  /** 用过的道具次数（年报统计）。 */
  itemUses: number;
  /** 本次发工资总额（万）。 */
  wageTotal: number;
  /** 累计发出的工资（万，年报统计）。 */
  wagePaid: number;
  /** 本月还能派几次活（子回合）。 */
  actionsLeft: number;
  /** 本次招募还能刷新几次候选。 */
  refreshLeft: number;
  /** 签约倾向的企划（至多两个，抽人时优先）。 */
  preferredProjects: string[];
  /** 连续翻车次数（连败补偿，成功清零）。 */
  failStreak: number;
  /** 联动的 SeiValue 成绩码（显示用）。 */
  linkedCode?: string;
}

export function defaultMonthMods(offerCount: number): AgencyMonthMods {
  return {
    successBoost: 0,
    shield: false,
    offerCount,
    payRate: 1,
    extraCandidates: 0,
    insurance: 0,
  };
}
