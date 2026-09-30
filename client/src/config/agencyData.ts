/**
 * 「声优事务所经营」的静态数据：委托、特质、称号、道具、事件（含彩蛋）。
 *
 * 全是纯数据 + i18n 键，文案在 `seiyuuAgency.*` 命名空间；
 * 数值都写得「有取有舍」，加成的合并规则见 agencyTypes.ts 的 mergeModifiers。
 */

import type {
  AgencyEventDef,
  AgencyEventKey,
  AgencyJob,
  AgencyJobKind,
  ItemDef,
  TalentModifier,
  TitleDef,
  TraitDef,
  TraitKey,
} from './agencyTypes';

/* ------------------------------ 委托 ------------------------------ */

/** 每月的正式委托数（有成败判定）。 */
export const AGENCY_OFFER_COUNT = 3;

/** 四个专项训练课（每月随机放一个，无成败判定）。 */
export const AGENCY_TRAINING_KEYS: AgencyJobKind[] = [
  'singingLesson',
  'danceLesson',
  'actingLesson',
  'dubbingLesson',
];

/**
 * 委托表（按档位从易到难）。
 *
 * 入门档可以「新手三人数值就能接」，顶级档放到合约后半段；
 * 训练类委托是无成败判定的自修活，把「公司集训」拆成四个专项。
 */
export const AGENCY_JOBS: Record<AgencyJobKind, AgencyJob> = {
  /* ---- 入门档 ---- */
  commercial: { kind: 'commercial', stat: 'charm', tier: 'entry', difficulty: 26, pay: 46, fame: 8, stamina: 10, slack: 0.08 },
  animeSide: { kind: 'animeSide', stat: 'skill', tier: 'entry', difficulty: 28, pay: 42, fame: 7, stamina: 12, slack: 0.08 },
  radioShow: { kind: 'radioShow', stat: 'vocal', tier: 'entry', difficulty: 30, pay: 36, fame: 6, stamina: 8, slack: 0.08 },
  /* ---- 常规档 ---- */
  gameVoice: { kind: 'gameVoice', stat: 'skill', tier: 'normal', difficulty: 44, pay: 68, fame: 9, stamina: 12 },
  varietyShow: { kind: 'varietyShow', stat: 'charm', tier: 'normal', difficulty: 48, pay: 92, fame: 15, stamina: 14 },
  stageLive: { kind: 'stageLive', stat: 'vocal', tier: 'normal', difficulty: 50, pay: 96, fame: 14, stamina: 20 },
  themeSong: { kind: 'themeSong', stat: 'vocal', tier: 'normal', difficulty: 52, pay: 118, fame: 16, stamina: 18, slack: -0.03 },
  /* ---- 挑战档 ---- */
  animeLead: { kind: 'animeLead', stat: 'skill', tier: 'hard', difficulty: 58, pay: 130, fame: 20, stamina: 22, slack: -0.04 },
  movieDub: { kind: 'movieDub', stat: 'skill', tier: 'hard', difficulty: 64, pay: 150, fame: 18, stamina: 16, slack: -0.02 },
  unitLive: { kind: 'unitLive', stat: 'charm', tier: 'hard', difficulty: 50, pay: 160, fame: 18, stamina: 26, unitOnly: true },
  /* ---- 顶级档 ---- */
  filmLead: { kind: 'filmLead', stat: 'skill', tier: 'elite', difficulty: 72, pay: 240, fame: 26, stamina: 24, slack: -0.05 },
  worldTour: { kind: 'worldTour', stat: 'charm', tier: 'elite', difficulty: 68, pay: 260, fame: 24, stamina: 34, slack: -0.03 },
  awardHost: { kind: 'awardHost', stat: 'vocal', tier: 'elite', difficulty: 62, pay: 190, fame: 20, stamina: 18 },
  /* ---- 自修活（不会失败） ---- */
  singingLesson: { kind: 'singingLesson', stat: 'none', tier: 'entry', difficulty: 0, pay: 0, fame: 0, stamina: 14, safe: true, train: 'vocal', gain: 9 },
  danceLesson: { kind: 'danceLesson', stat: 'none', tier: 'entry', difficulty: 0, pay: 0, fame: 0, stamina: 16, safe: true, train: 'charm', gain: 9 },
  actingLesson: { kind: 'actingLesson', stat: 'none', tier: 'entry', difficulty: 0, pay: 0, fame: 0, stamina: 14, safe: true, train: 'skill', gain: 9 },
  dubbingLesson: { kind: 'dubbingLesson', stat: 'none', tier: 'entry', difficulty: 0, pay: 8, fame: 1, stamina: 16, safe: true, train: 'all', gain: 4 },
  rest: { kind: 'rest', stat: 'none', tier: 'entry', difficulty: 0, pay: 0, fame: 0, stamina: -26, safe: true },
};

/* ------------------------------ 特质 ------------------------------ */

export const AGENCY_TRAITS: Record<TraitKey, TraitDef> = {
  leadAura: { key: 'leadAura', rarity: 'rare', weight: 8, modifier: { jobSuccess: { animeLead: 0.12 } } },
  radioVoice: { key: 'radioVoice', rarity: 'common', weight: 12, modifier: { jobSuccess: { radioShow: 0.15, themeSong: 0.1 } } },
  varietySense: { key: 'varietySense', rarity: 'common', weight: 12, modifier: { jobSuccess: { varietyShow: 0.18 }, jobFame: 0.1 } },
  ironThroat: { key: 'ironThroat', rarity: 'rare', weight: 7, modifier: { staminaCost: -0.25 } },
  glassHeart: { key: 'glassHeart', rarity: 'common', weight: 10, flaw: true, modifier: { loyaltyDecay: 6 } },
  workaholic: { key: 'workaholic', rarity: 'common', weight: 10, modifier: { jobPay: 0.15, growth: 1, staminaCost: 0.12 } },
  mediaDarling: { key: 'mediaDarling', rarity: 'rare', weight: 6, modifier: { jobFame: 0.25 } },
  introvert: { key: 'introvert', rarity: 'common', weight: 9, flaw: true, modifier: { jobSuccess: { varietyShow: -0.12, animeSide: 0.1 } } },
  goldenEar: { key: 'goldenEar', rarity: 'legend', weight: 2, modifier: { anyJob: 0.08 } },
  stageBorn: { key: 'stageBorn', rarity: 'rare', weight: 6, modifier: { jobSuccess: { stageLive: 0.15, unitLive: 0.12 }, staminaCost: -0.1 } },
};

/** 特质池（按权重抽）。 */
export const TRAIT_KEYS = Object.keys(AGENCY_TRAITS) as TraitKey[];

/* ------------------------------ 称号 ------------------------------ */

/** 称号：达成条件后自动解锁，带来的加成同样是 TalentModifier。 */
export const AGENCY_TITLES: Record<string, TitleDef> = {
  leadMachine: {
    key: 'leadMachine',
    rarity: 'normal',
    modifier: { jobSuccess: { animeLead: 0.08 }, jobPay: 0.1 },
    check: (_talent, context) => (context.jobSuccess.animeLead ?? 0) >= 2,
  },
  radioQueen: {
    key: 'radioQueen',
    rarity: 'normal',
    modifier: { jobSuccess: { radioShow: 0.15 }, jobFame: 0.15 },
    check: (_talent, context) => (context.jobSuccess.radioShow ?? 0) >= 3,
  },
  varietyStar: {
    key: 'varietyStar',
    rarity: 'normal',
    modifier: { jobSuccess: { varietyShow: 0.15 } },
    check: (_talent, context) => (context.jobSuccess.varietyShow ?? 0) >= 2,
  },
  ironBody: {
    key: 'ironBody',
    rarity: 'normal',
    modifier: { staminaCost: -0.15 },
    check: (talent) => talent.jobs >= 8 && talent.fame >= 30,
  },
  comeback: {
    key: 'comeback',
    rarity: 'rare',
    modifier: { anyJob: 0.06, loyaltyGain: 4 },
    check: (talent) => talent.fails >= 3 && talent.fame >= 25,
  },
  unitSoul: {
    key: 'unitSoul',
    rarity: 'rare',
    modifier: { jobSuccess: { unitLive: 0.15 }, jobFame: 0.1 },
    check: (_talent, context) => context.unitSuccess >= 3,
  },
  newcomerKing: {
    key: 'newcomerKing',
    rarity: 'rare',
    modifier: { jobFame: 0.15, anyJob: 0.04 },
    check: (talent, context) => talent.joinedMonth > 1 && talent.fame >= 40 && context.month - talent.joinedMonth <= 8,
  },
  livingLegend: {
    key: 'livingLegend',
    rarity: 'rare',
    modifier: { anyJob: 0.1, jobFame: 0.2 },
    check: (talent) => talent.fame >= 85,
  },
  president: {
    key: 'president',
    rarity: 'easter',
    modifier: { anyJob: 0.15, jobFame: 0.3, jobPay: 0.3 },
    check: (_talent, context) => context.easterEggs.includes('easterPresident'),
  },
  cosmicNarrator: {
    key: 'cosmicNarrator',
    rarity: 'easter',
    modifier: { anyJob: 0.1, jobPay: 0.25 },
    check: (_talent, context) => context.easterEggs.includes('easterNasa'),
  },
};

export const TITLE_KEYS = Object.keys(AGENCY_TITLES) as TitleDef['key'][];

/* ------------------------------ 道具 ------------------------------ */

export const AGENCY_ITEMS: Record<ItemDef['key'], ItemDef> = {
  trainingCamp: { key: 'trainingCamp', cost: 120, note: 'monthly', stage: 'assign' },
  businessTrip: { key: 'businessTrip', cost: 60, note: 'monthly', stage: 'assign' },
  publicity: { key: 'publicity', cost: 90, note: 'monthly' },
  healthCheck: { key: 'healthCheck', cost: 70, note: 'monthly' },
  giftTickets: { key: 'giftTickets', cost: 50, note: 'monthly', target: 'talent' },
  photoShoot: { key: 'photoShoot', cost: 80, note: 'monthly', target: 'talent' },
  coach: { key: 'coach', cost: 100, note: 'monthly', target: 'talent' },
  scoutReport: { key: 'scoutReport', cost: 40, note: 'monthly' },
  rerollOffers: { key: 'rerollOffers', cost: 30, note: 'monthly', stage: 'assign' },
  insurance: { key: 'insurance', cost: 100, note: 'monthly' },
  fanEvent: { key: 'fanEvent', cost: 60, note: 'monthly', stage: 'assign' },
};

export const ITEM_KEYS = Object.keys(AGENCY_ITEMS) as ItemDef['key'][];

/** 训练 / 休整以外，商店在售的道具顺序（与 AGENCY_ITEMS 一致）。 */
export const SHOP_ITEM_KEYS: ItemDef['key'][] = ITEM_KEYS;

/* ------------------------------ 事件 ------------------------------ */

/** 抽彩蛋的概率：一局基本撞不上，撞上就是名场面。 */
export const EASTER_EGG_CHANCE = 0.005;

/** 常态事件概率（随月份推进略微变频繁：开局 0.28 → 后期 0.52）。 */
export function eventChance(month: number, months: number): number {
  const progress = months <= 1 ? 0 : (month - 1) / (months - 1);
  return 0.28 + Math.min(1, Math.max(0, progress)) * 0.24;
}

/** 一局最多来几次常态事件（每月 3 次行动，所以额度跟着放大）。 */
export function maxEventsFor(months: number): number {
  return Math.max(6, Math.round(months * 1.1));
}

export const AGENCY_EVENTS: AgencyEventDef[] = [
  {
    id: 'viral',
    when: (state) => state.talents.length > 0,
    weight: 12,
    options: [
      { id: 'push', effects: { fame: 12, reputation: 6, cash: -40 } },
      { id: 'nothing', effects: { fame: 4 } },
      {
        id: 'risk',
        risk: {
          chance: 0.55,
          success: { cash: 200, fame: 8, reputation: 4 },
          failure: { fame: -6, reputation: -6 },
        },
      },
    ],
  },
  {
    id: 'scandal',
    when: (state) => state.talents.some((talent) => talent.fame >= 25),
    weight: 11,
    pick: 'top',
    options: [
      { id: 'apologize', effects: { reputation: -4, fame: -6 } },
      {
        id: 'silent',
        risk: { chance: 0.5, success: { reputation: 2, fame: 4 }, failure: { reputation: -12, fame: -8 } },
      },
      {
        id: 'sue',
        risk: { chance: 0.6, success: { reputation: 8, fame: 6, cash: -60 }, failure: { reputation: -10, cash: -60 } },
      },
    ],
  },
  {
    id: 'sick',
    when: (state) => state.talents.some((talent) => talent.stamina <= 45),
    weight: 10,
    pick: 'random',
    health: true,
    options: [
      { id: 'rest', effects: { stamina: 22, cash: -30 } },
      { id: 'push', risk: { chance: 0.5, success: { fame: 10 }, failure: { stamina: -25, reputation: -6 } } },
    ],
  },
  {
    id: 'offer',
    when: (state) => state.cash < 260,
    weight: 8,
    options: [
      { id: 'accept', effects: { cash: 140, reputation: 4, stamina: -12, scope: 'all' } },
      { id: 'negotiate', risk: { chance: 0.5, success: { cash: 220 }, failure: { cash: 40, reputation: -4 } } },
      { id: 'decline', effects: { reputation: 2 } },
    ],
  },
  {
    id: 'graduation',
    when: (state) => state.talents.some((talent) => talent.fame >= 40),
    weight: 8,
    pick: 'top',
    options: [
      { id: 'fund', effects: { cash: -80, fame: 8, reputation: 3 } },
      { id: 'selfFunded', effects: { fame: 4, reputation: 2 } },
      { id: 'block', effects: { reputation: -2, stamina: 8, loyalty: -6 } },
    ],
  },
  {
    id: 'award',
    when: (state) => state.reputation >= 35,
    weight: 9,
    pick: 'top',
    options: [
      { id: 'campaign', risk: { chance: 0.65, success: { cash: -100, reputation: 14, fame: 10 }, failure: { cash: -100, reputation: -4 } } },
      { id: 'nothing', risk: { chance: 0.4, success: { reputation: 8, fame: 6 }, failure: { reputation: -2 } } },
      { id: 'attend', effects: { reputation: 3, cash: -30 } },
    ],
  },
  {
    id: 'voiceAward',
    when: (state) => state.reputation >= 55 && state.talents.some((talent) => talent.fame >= 45),
    weight: 5,
    pick: 'top',
    options: [
      { id: 'campaign', requiresCash: 120, effects: { cash: -120, reputation: 16, fame: 14, loyalty: 12 } },
      { id: 'nothing', risk: { chance: 0.45, success: { reputation: 10, fame: 10 }, failure: { reputation: -3 } } },
      { id: 'party', effects: { cash: -50, reputation: 6, loyalty: 6, scope: 'one' } },
    ],
  },
  {
    id: 'poach',
    when: (state) => state.talents.some((talent) => talent.fame >= 45),
    weight: 9,
    pick: 'top',
    options: [
      { id: 'raise', effects: { cash: -150, reputation: 4, loyalty: 14 } },
      { id: 'letGo', effects: { cash: 100, fame: -10, reputation: -4, leave: true } },
      { id: 'heart', risk: { chance: 0.5, success: { reputation: 6, fame: 4, loyalty: 10 }, failure: { fame: -12, reputation: -6, leave: true } } },
    ],
  },
  {
    id: 'veteranLeaving',
    when: (state) =>
      state.talents.some((talent) => talent.loyalty <= 45 && (talent.veteran || talent.fame >= 45)),
    weight: 10,
    pick: 'lowLoyalty',
    options: [
      { id: 'raise', effects: { cash: -180, loyalty: 32 } },
      { id: 'studio', requiresCash: 260, effects: { cash: -260, loyalty: 48, reputation: 6, fame: 8 } },
      { id: 'talk', risk: { chance: 0.55, success: { loyalty: 26 }, failure: { loyalty: -12, leave: true } } },
      { id: 'letGo', effects: { cash: 140, fame: -12, reputation: -3, leave: true } },
    ],
  },
  {
    id: 'transferIn',
    when: (state) => state.cash >= 180 && state.reputation >= 34 && state.talents.length < 6,
    weight: 8,
    pick: 'none',
    options: [
      { id: 'sign', effects: { cash: -150, reputation: 6, recruit: { veteran: true, fame: 22, loyalty: 55 } } },
      {
        id: 'trial',
        risk: {
          chance: 0.6,
          success: { cash: -50, reputation: 2, recruit: { veteran: true, fame: 14, loyalty: 45 } },
          failure: { cash: -50, reputation: -2 },
        },
      },
      { id: 'decline', effects: { reputation: 2 } },
    ],
  },
  {
    id: 'freelanceDeal',
    when: (state) => state.reputation >= 25,
    weight: 7,
    pick: 'none',
    options: [
      { id: 'accept', effects: { cash: 90, fame: 6, reputation: 4 } },
      { id: 'exclusive', effects: { cash: 40, loyalty: 8, reputation: 6 } },
      { id: 'decline', effects: { reputation: -2 } },
    ],
  },
  {
    id: 'flu',
    when: (state) => state.talents.length >= 3 && state.month >= 3,
    weight: 8,
    health: true,
    pick: 'none',
    options: [
      { id: 'restAll', effects: { stamina: 18, cash: -60, scope: 'all' } },
      { id: 'pushAll', effects: { stamina: -15, reputation: -3, scope: 'all' } },
    ],
  },
  {
    id: 'variety',
    when: (state) => state.talents.some((talent) => talent.fame >= 50),
    weight: 9,
    pick: 'top',
    options: [
      { id: 'accept', effects: { fame: 14, stamina: -12, cash: 80, reputation: 4 } },
      { id: 'pair', effects: { fame: 8, cash: 60, stamina: -8, skill: 2, scope: 'all' } },
      { id: 'decline', effects: { reputation: 2 } },
    ],
  },
  {
    id: 'songDeal',
    when: (state) => state.talents.some((talent) => talent.vocal >= 55),
    weight: 8,
    pick: 'random',
    options: [
      { id: 'sign', effects: { cash: 150, fame: 12, stamina: -14, reputation: 6 } },
      { id: 'mini', effects: { cash: 80, fame: 8, vocal: 5 } },
      { id: 'decline', effects: { vocal: 3 } },
    ],
  },
  {
    id: 'movieLead',
    when: (state) => state.reputation >= 40 && state.talents.some((talent) => talent.fame >= 40),
    weight: 6,
    pick: 'top',
    options: [
      { id: 'take', risk: { chance: 0.6, success: { cash: 220, fame: 24, reputation: 10 }, failure: { fame: -8, reputation: -4, stamina: -22 } } },
      { id: 'support', effects: { cash: 90, fame: 8, skill: 6, stamina: -10 } },
      { id: 'decline', effects: { stamina: 10 } },
    ],
  },
  {
    id: 'gossip',
    when: (state) => state.talents.some((talent) => talent.fame >= 35),
    weight: 7,
    pick: 'top',
    options: [
      { id: 'confirm', effects: { fame: 10, loyalty: 10, reputation: -6 } },
      { id: 'deny', risk: { chance: 0.5, success: { reputation: 4 }, failure: { fame: -10, reputation: -8 } } },
      { id: 'silent', effects: { fame: -4, reputation: 2, loyalty: -6 } },
    ],
  },
  {
    id: 'backlash',
    when: (state) => state.talents.some((talent) => talent.fame >= 45),
    weight: 6,
    pick: 'top',
    options: [
      { id: 'apologize', effects: { reputation: 4, fame: -5, loyalty: -4 } },
      { id: 'explain', risk: { chance: 0.55, success: { reputation: 8, fame: 6 }, failure: { reputation: -8, fame: -8 } } },
      { id: 'offline', effects: { reputation: -2, fame: -3, stamina: 12 } },
    ],
  },
  {
    id: 'industryWinter',
    when: (state) => state.month >= 6 && state.reputation >= 30,
    weight: 5,
    pick: 'none',
    options: [
      { id: 'cut', effects: { monthMod: 'payRate', reputation: -2 } },
      { id: 'invest', requiresCash: 120, effects: { cash: -120, reputation: 6 } },
    ],
  },
  {
    id: 'taxAudit',
    when: (state) => state.month >= 8 && state.cash >= 200,
    weight: 5,
    pick: 'none',
    options: [
      { id: 'pay', effects: { cash: -160, reputation: -2 } },
      { id: 'lawyer', requiresCash: 90, effects: { cash: -90, reputation: 2 } },
      { id: 'fight', risk: { chance: 0.5, success: { reputation: 6 }, failure: { cash: -260, reputation: -8 } } },
    ],
  },
  {
    id: 'unitClash',
    when: (state) => state.units.length > 0,
    weight: 9,
    pick: 'unitMember',
    options: [
      { id: 'mediate', effects: { loyalty: 12, stamina: -6, scope: 'unit' } },
      { id: 'sideMajor', effects: { fame: 8, loyalty: -10, scope: 'unit' } },
      { id: 'split', effects: { loyalty: -18, scope: 'unit', monthMod: 'successBoost' } },
    ],
  },
  {
    id: 'unitBreak',
    when: (state) => state.units.some((unit) => unit.members.some((id) => (state.talents.find((talent) => talent.id === id)?.loyalty ?? 100) <= 35)),
    weight: 6,
    pick: 'unitMember',
    options: [
      { id: 'save', requiresCash: 200, effects: { cash: -200, loyalty: 30, reputation: 8, scope: 'unit' } },
      { id: 'rebrand', effects: { reputation: -4, fame: -6, scope: 'unit', monthMod: 'successBoost' } },
      { id: 'break', effects: { reputation: -8, fame: -10, loyalty: 10, scope: 'unit' } },
    ],
  },
  {
    id: 'unitStage',
    when: (state) => state.units.length > 0,
    weight: 8,
    pick: 'unitMember',
    options: [
      { id: 'accept', risk: { chance: 0.62, success: { cash: 260, fame: 20, reputation: 12, scope: 'unit' }, failure: { cash: -40, fame: -6, reputation: -4, scope: 'unit', stamina: -18 } } },
      { id: 'small', effects: { cash: 90, fame: 8, reputation: 3, scope: 'unit' } },
      { id: 'decline', effects: { stamina: 12, scope: 'unit', loyalty: -4 } },
    ],
  },
  /* ---------------- 彩蛋：概率 0.5%，撞上就是这一局的名场面 ---------------- */
  {
    id: 'easterPresident',
    easter: true,
    pick: 'top',
    options: [
      { id: 'accept', effects: { fame: 40, reputation: 30, loyalty: 20 } },
      { id: 'decline', effects: { fame: 10, reputation: 8, loyalty: 10 } },
    ],
  },
  {
    id: 'easterNasa',
    easter: true,
    pick: 'random',
    options: [{ id: 'narrate', effects: { fame: 26, reputation: 20, skill: 8 } }],
  },
  {
    id: 'easterTimeCover',
    easter: true,
    pick: 'top',
    options: [
      { id: 'cover', effects: { fame: 30, reputation: 18, cash: 200 } },
      { id: 'refuse', effects: { reputation: 6, loyalty: 8 } },
    ],
  },
  {
    id: 'easterPrimeMinister',
    easter: true,
    pick: 'top',
    options: [{ id: 'advisor', effects: { fame: 24, reputation: 24, cash: 120, scope: 'all' } }],
  },
];

export const NORMAL_EVENTS = AGENCY_EVENTS.filter((event) => !event.easter);

/** 事件卡头图的色调（纯展示：好事 / 麻烦 / 大场面 / 生意）。 */
export const AGENCY_EVENT_TONES: Record<AgencyEventKey, 'good' | 'bad' | 'hype' | 'deal'> = {
  viral: 'good',
  scandal: 'bad',
  sick: 'bad',
  offer: 'deal',
  graduation: 'good',
  award: 'good',
  voiceAward: 'good',
  poach: 'bad',
  veteranLeaving: 'bad',
  transferIn: 'deal',
  freelanceDeal: 'deal',
  flu: 'bad',
  variety: 'good',
  songDeal: 'deal',
  movieLead: 'good',
  gossip: 'bad',
  backlash: 'bad',
  industryWinter: 'bad',
  taxAudit: 'bad',
  unitClash: 'bad',
  unitBreak: 'bad',
  unitStage: 'good',
  easterPresident: 'hype',
  easterNasa: 'hype',
  easterTimeCover: 'hype',
  easterPrimeMinister: 'hype',
};

/* ------------------------------ 奖励 / 里程碑 ------------------------------ */

/** 声望到达这些档位时送一个道具（按顺序取，不重复）。 */
export const REPUTATION_ITEM_MILESTONES: { reputation: number; item: ItemDef['key'] }[] = [
  { reputation: 40, item: 'publicity' },
  { reputation: 55, item: 'coach' },
  { reputation: 70, item: 'insurance' },
  { reputation: 85, item: 'photoShoot' },
];

/** 组合命名的连接符（页面与海报共用）。 */
export const UNIT_NAME_JOINER = '＆';
