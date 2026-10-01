import { describe, expect, it } from 'vitest';
import { resources } from '../i18n/resources';
import { extractI18nKeys, readSource } from '../test/readSource';
import { UNIT_NAME_JOINER } from './model/agencyData';
import {
  AGENCY_DIFFICULTIES,
  AGENCY_EVENTS,
  AGENCY_ITEMS,
  AGENCY_JOBS,
  AGENCY_LENGTHS,
  AGENCY_MAX_TALENTS,
  AGENCY_OFFER_COUNT,
  AGENCY_RULES,
  AGENCY_START_TALENTS,
  AGENCY_TITLES,
  AGENCY_TRAITS,
  AGENT_ATTRS,
  AGENT_ATTR_MAX,
  EASTER_EGG_CHANCE,
  ITEM_KEYS,
  LENGTH_MONTHS,
  NORMAL_EVENTS,
  TITLE_KEYS,
  TRAIT_KEYS,
  UNIT_FORM_COST,
  UNIT_LIMIT,
  UNIT_MAX_MEMBERS,
  UNIT_MIN_MEMBERS,
  assignJob,
  buyItem,
  createAgency,
  defaultPoints,
  disbandUnit,
  drawOffers,
  eligibleEvents,
  eventDefOf,
  formUnit,
  modifierOf,
  nameOf,
  pointsFromSeiValueAxes,
  recruit,
  recruitMonthsOf,
  reportOf,
  resolveEvent,
  sanitizePoints,
  skipRecruit,
  successRate,
  unitFameOf,
  unitNameOf,
  useItem,
  type AgencyDifficulty,
  type AgencyEventKey,
  type AgencyJob,
  type AgencyLength,
  type AgencyState,
  type AgencyTalent,
  type ItemKey,
} from './model/seiyuuAgency';

const LANGS = ['zh', 'en', 'ja'] as const;

/* ------------------------------ 测试用工具 ------------------------------ */

/** 常用开局（默认标准难度 + 短局）。 */
function open(setup: { difficulty?: AgencyDifficulty; length?: AgencyLength } = {}, seed = 4242): AgencyState {
  return createAgency(seed, { difficulty: 'normal', length: 'short', ...setup });
}

/** 把阶段推到派活（跳过招募）。 */
function toAssign(state: AgencyState): AgencyState {
  return { ...state, stage: 'assign', candidates: [] };
}

/** 白送几个道具（测试不去赌开局的随机道具池）。 */
function withItems(state: AgencyState, keys: ItemKey[]): AgencyState {
  const items = { ...state.items };
  for (const key of keys) items[key] = (items[key] ?? 0) + 1;
  return { ...state, items };
}

function itemTotal(state: AgencyState): number {
  return Object.values(state.items).reduce((sum, count) => sum + (count ?? 0), 0);
}

function talentOf(state: AgencyState, id: string): AgencyTalent {
  const talent = state.talents.find((item) => item.id === id);
  if (!talent) throw new Error(`talent ${id} not found`);
  return talent;
}

/** 干净成员（剥掉随机特质，方便比较数值）。 */
function cleanTalent(state: AgencyState, patch: Partial<AgencyTalent> = {}): AgencyTalent {
  return { ...state.talents[0], traits: [], titles: [], ...patch };
}

/** 构造一张「正要拍板」的事件卡。 */
function pendingEvent(state: AgencyState, id: AgencyEventKey, talentId?: string): AgencyState {
  return {
    ...state,
    stage: 'event',
    pendingEvent: { eventId: id, talentId: talentId ?? state.talents[0]?.id },
  };
}

/** 用固定策略把一局打到底（招募一律跳过）。 */
function play(seed: number, setup: { difficulty?: AgencyDifficulty; length?: AgencyLength } = {}) {
  let state = open(setup, seed);
  let guard = 0;
  while (state.stage !== 'done' && guard < 500) {
    guard += 1;
    if (!state.talents.length) break;
    if (state.stage === 'recruit') {
      state = skipRecruit(state);
      continue;
    }
    if (state.stage === 'event') {
      const def = state.pendingEvent ? eventDefOf(state.pendingEvent.eventId) : undefined;
      if (!def) break;
      const option =
        def.options.find((item) => item.requiresCash === undefined || state.cash >= item.requiresCash) ??
        def.options[0];
      state = resolveEvent(state, option.id);
      continue;
    }
    const offer = state.offers.find((item) => !item.job.unitOnly || state.talents.some((t) => t.unitId));
    if (!offer) break;
    const talent = [...state.talents].sort(
      (a, b) => successRate(offer.job, b, state) - successRate(offer.job, a, state),
    )[0];
    state = assignJob(state, offer.index, talent.id);
  }
  return state;
}

/* ------------------------------ 开局 ------------------------------ */

describe('seiyuuAgency 开局', () => {
  it('难度决定资金 / 声望 / 道具数，长度决定月数', () => {
    for (const difficulty of AGENCY_DIFFICULTIES) {
      for (const length of AGENCY_LENGTHS) {
        const state = open({ difficulty, length });
        const rule = AGENCY_RULES[difficulty];
        expect(state.cash, `${difficulty}`).toBe(rule.cash);
        expect(state.reputation, `${difficulty}`).toBe(rule.reputation);
        expect(state.months, `${length}`).toBe(LENGTH_MONTHS[length]);
        expect(Object.values(state.agent).reduce((sum, value) => sum + value, 0)).toBe(rule.points);
      }
    }
  });

  it('开局带 3 位成员，每人至少一个特质且不重复', () => {
    const state = open();
    expect(state.talents.length).toBe(AGENCY_START_TALENTS);
    for (const talent of state.talents) {
      expect(talent.traits.length).toBeGreaterThan(0);
      expect(new Set(talent.traits).size).toBe(talent.traits.length);
      expect(talent.titles).toEqual([]);
      expect(talent.stamina).toBeGreaterThan(0);
    }
    expect(new Set(state.talents.map((talent) => talent.id)).size).toBe(AGENCY_START_TALENTS);
  });

  it('第一个月是招募月：阶段停在招募，候选人有 3 位', () => {
    const state = open();
    expect(recruitMonthsOf(LENGTH_MONTHS.short)).toContain(1);
    expect(state.month).toBe(1);
    expect(state.stage).toBe('recruit');
    expect(state.candidates.length).toBe(3);
  });

  it('兼容旧写法 createAgency(seed, difficulty)', () => {
    const state = createAgency(99, 'hard');
    expect(state.difficulty).toBe('hard');
    expect(state.cash).toBe(AGENCY_RULES.hard.cash);
  });

  it('同一个 seed 开局完全一致，不同 seed 换人', () => {
    const profile = (state: AgencyState) => state.talents.map((talent) => talent.id).join(',');
    expect(profile(open({}, 777))).toBe(profile(open({}, 777)));
    expect(profile(open({}, 777))).not.toBe(profile(open({}, 778)));
  });
});

/* ------------------------------ 经纪人加点 ------------------------------ */

describe('seiyuuAgency 经纪人加点', () => {
  it('sanitizePoints 永远收敛到 total 点、每栏 0~5', () => {
    const cases: Partial<Record<(typeof AGENT_ATTRS)[number], number>>[] = [
      { eye: 99 },
      { eye: -5, network: 3 },
      { eye: 2.4, care: 1.6 },
      {},
      { network: 5, eye: 5, negotiation: 5, care: 5 },
    ];
    for (const total of [5, 6, 7]) {
      for (const input of cases) {
        const points = sanitizePoints(input, total);
        for (const attr of AGENT_ATTRS) {
          expect(points[attr], `${attr}`).toBeGreaterThanOrEqual(0);
          expect(points[attr], `${attr}`).toBeLessThanOrEqual(AGENT_ATTR_MAX);
        }
        expect(AGENT_ATTRS.reduce((sum, attr) => sum + points[attr], 0), JSON.stringify(input)).toBe(total);
      }
    }
  });

  it('defaultPoints 总点数正确', () => {
    for (const total of [5, 6, 7]) {
      const points = defaultPoints(total);
      expect(AGENT_ATTRS.reduce((sum, attr) => sum + points[attr], 0)).toBe(total);
    }
  });

  it('成绩码联动：四轴转加点，总数固定、每栏 0~5，极端值也不会溢出', () => {
    const axes = [
      { axis: 'voice', percent: 100 },
      { axis: 'consume', percent: 100 },
      { axis: 'community', percent: -100 },
      { axis: 'interact', percent: 0 },
    ];
    for (const total of [5, 6, 7]) {
      const points = pointsFromSeiValueAxes(axes, total);
      expect(AGENT_ATTRS.reduce((sum, attr) => sum + points[attr], 0)).toBe(total);
      for (const attr of AGENT_ATTRS) expect(points[attr]).toBeLessThanOrEqual(AGENT_ATTR_MAX);
    }
    // 空的 / 全是未知轴 → 不能崩，也仍然守恒
    for (const bad of [[], [{ axis: 'unknown', percent: 50 }]]) {
      const points = pointsFromSeiValueAxes(bad, 6);
      expect(AGENT_ATTRS.reduce((sum, attr) => sum + points[attr], 0)).toBe(6);
    }
  });

  it('四轴里更高的那一轴拿到更多点', () => {
    const points = pointsFromSeiValueAxes(
      [
        { axis: 'voice', percent: 80 },
        { axis: 'consume', percent: -60 },
        { axis: 'community', percent: -60 },
        { axis: 'interact', percent: -60 },
      ],
      6,
    );
    expect(points.eye).toBeGreaterThan(points.negotiation);
    expect(points.eye).toBeGreaterThan(points.network);
  });

  it('带成绩码开局：点数比手动多 1，并把成绩码记下来', () => {
    const axes = [
      { axis: 'voice', percent: 40 },
      { axis: 'consume', percent: 10 },
      { axis: 'community', percent: -20 },
      { axis: 'interact', percent: -30 },
    ];
    const state = createAgency(2024, {
      difficulty: 'normal',
      length: 'short',
      linkedCode: 'F95734-1a-k3f9z2qx',
      linkedAxes: axes,
    });
    expect(state.linkedPoints).toBe(AGENCY_RULES.normal.points + 1);
    expect(state.linkedCode).toBe('F95734-1a-k3f9z2qx');
    const manual = createAgency(2024, { difficulty: 'normal', length: 'short' });
    expect(manual.linkedPoints).toBe(0);
    expect(manual.linkedCode).toBeUndefined();
  });
});

/* ------------------------------ 特质 / 称号 / 成功率 ------------------------------ */

describe('seiyuuAgency 特质与称号', () => {
  it('modifierOf 把特质和称号叠起来', () => {
    const state = open();
    const talent = cleanTalent(state, { traits: ['workaholic'], titles: ['leadMachine'] });
    const merged = modifierOf(talent);
    expect(merged.jobPay).toBeCloseTo(0.25, 5);
    expect(merged.jobSuccess?.animeLead).toBeCloseTo(0.08, 5);
    expect(merged.growth).toBe(1);
  });

  it('成功率：随数值 / 体力 / 加成 / 加点单调变化，且落在 5%~95%', () => {
    const state = open();
    const job: AgencyJob = AGENCY_JOBS.animeLead;
    const base = cleanTalent(state, { skill: 50, stamina: 50 });

    expect(successRate(job, base, state)).toBeGreaterThanOrEqual(0.05);
    expect(successRate(job, { ...base, skill: 96 }, state)).toBeLessThanOrEqual(0.95);
    expect(successRate(job, { ...base, skill: 80 }, state)).toBeGreaterThan(successRate(job, { ...base, skill: 40 }, state));
    expect(successRate(job, { ...base, stamina: 90 }, state)).toBeGreaterThan(
      successRate(job, { ...base, stamina: 20 }, state),
    );
    // 金耳朵（全委托加成）
    expect(successRate(job, { ...base, traits: ['goldenEar'] }, state)).toBeGreaterThan(successRate(job, base, state));
    // 职业对口特质
    expect(successRate(job, { ...base, traits: ['leadAura'] }, state)).toBeGreaterThan(successRate(job, base, state));
    // 眼光的全局加成
    expect(successRate(job, base, { ...state, agent: { ...state.agent, eye: 5 } })).toBeGreaterThan(
      successRate(job, base, { ...state, agent: { ...state.agent, eye: 0 } }),
    );
    // 本月加成（外出取材 / 事件里的 monthMod）
    expect(successRate(job, base, { ...state, monthMods: { ...state.monthMods, successBoost: 0.2 } })).toBeGreaterThan(
      successRate(job, base, state),
    );
    // 安全委托必定成功
    expect(successRate(AGENCY_JOBS.singingLesson, base, state)).toBe(1);
    expect(successRate(AGENCY_JOBS.rest, base, state)).toBe(1);
  });

  it('称号条件：够条件才算解锁，且不会重复加', () => {
    const state = open();
    const talent = cleanTalent(state, { jobs: 9, fame: 32 });
    const context = {
      month: 6,
      reputation: 50,
      jobSuccess: { animeLead: 2 },
      unitSuccess: 0,
      easterEggs: [] as AgencyEventKey[],
    };
    expect(AGENCY_TITLES.leadMachine.check(talent, context)).toBe(true);
    expect(AGENCY_TITLES.ironBody.check(talent, context)).toBe(true);
    expect(AGENCY_TITLES.radioQueen.check(talent, context)).toBe(false);
    expect(AGENCY_TITLES.livingLegend.check({ ...talent, fame: 90 }, context)).toBe(true);
    // 彩蛋专属称号只认彩蛋
    expect(AGENCY_TITLES.president.check(talent, context)).toBe(false);
    expect(
      AGENCY_TITLES.president.check(talent, { ...context, easterEggs: ['easterPresident'] as AgencyEventKey[] }),
    ).toBe(true);
  });

  it('实打实接两次主役之后自动解锁「主役机器」', () => {
    const job: AgencyJob = AGENCY_JOBS.animeLead;
    let state = toAssign(open({}, 31));
    const id = state.talents[0].id;
    const offer = { index: 0, job };
    // rng 固定为 0：判定必成功，事件必为彩蛋（不影响称号）
    state = { ...state, rng: () => 0, offers: [offer] };
    state = assignJob(state, 0, id);
    state = { ...state, stage: 'assign', pendingEvent: null, offers: [offer], rng: () => 0 };
    state = assignJob(state, 0, id);

    const talent = talentOf(state, id);
    expect(talent.jobs).toBeGreaterThanOrEqual(2);
    expect(talent.titles).toContain('leadMachine');
    expect(state.log.some((entry) => entry.key === 'title' && entry.titleKey === 'leadMachine')).toBe(true);
    // 解锁只发生一次
    expect(talent.titles.filter((key) => key === 'leadMachine').length).toBe(1);
  });
});

/* ------------------------------ 委托 ------------------------------ */

describe('seiyuuAgency 委托池', () => {
  it('每月给 3 个正式委托 + 1 个训练 + 1 个公司休整，序号连续、不重复', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const state = open({}, seed);
      const offers = drawOffers(state.rng, state);
      expect(offers.length).toBe(AGENCY_OFFER_COUNT + 2);
      expect(offers.map((offer) => offer.index)).toEqual([0, 1, 2, 3, 4]);
      const risky = offers.filter((offer) => !offer.job.safe).map((offer) => offer.job.kind);
      expect(risky.length).toBe(AGENCY_OFFER_COUNT);
      expect(new Set(risky).size).toBe(risky.length);
      // 第一个月不该出现后期才开放 / 组合限定的活，且自修位固定带一个休整
      for (const offer of offers) {
        expect(offer.job.unitOnly).toBeFalsy();
        if (!offer.job.safe) expect(offer.job.tier).toBe('entry');
      }
      expect(offers.some((offer) => offer.job.kind === 'rest')).toBe(true);
      expect(offers.filter((offer) => offer.job.safe).length).toBe(2);
    }
  });

  it('组合专场只在有组合时才会出现', () => {
    const state = open({ length: 'long' }, 12);
    const late = { ...state, month: 30, units: [{ id: 'unit-1', members: [], formedMonth: 1, fame: 0, successes: 0 }] };
    const kinds = new Set<string>();
    for (let index = 0; index < 40; index += 1) {
      for (const offer of drawOffers(late.rng, late)) kinds.add(offer.job.kind);
    }
    expect(kinds.has('unitLive')).toBe(true);
    // 没有组合时永远不出现
    const solo = { ...state, month: 30 };
    for (let index = 0; index < 40; index += 1) {
      for (const offer of drawOffers(solo.rng, solo)) expect(offer.job.unitOnly).toBeFalsy();
    }
  });

  it('委托池里有组合专场的 i18n 键（页面靠 kind 取文案）', () => {
    expect(Object.keys(AGENCY_JOBS).length).toBeGreaterThanOrEqual(12);
    expect(AGENCY_JOBS.unitLive.unitOnly).toBe(true);
  });
});

/* ------------------------------ 派活 ------------------------------ */

describe('seiyuuAgency 派活', () => {
  it('组合专场只能派组合成员，成功时队友一起长知名度', () => {
    let state = toAssign(open());
    state = { ...state, cash: 999 };
    const [first, second] = state.talents;
    state = formUnit(state, [first.id, second.id]);
    const job: AgencyJob = AGENCY_JOBS.unitLive;
    state = { ...state, offers: [{ index: 0, job }], rng: () => 0 };

    // 非组合成员接不了
    const outsider = state.talents.find((talent) => !talent.unitId);
    if (outsider) expect(assignJob(state, 0, outsider.id)).toBe(state);

    const before = state.talents.map((talent) => talent.fame);
    const next = assignJob(state, 0, first.id);
    const unit = state.units[0];
    const members = next.talents.filter((talent) => unit.members.includes(talent.id));
    expect(members.length).toBe(2);
    expect(members[0].fame).toBeGreaterThan(before[0]);
    expect(members[1].fame).toBeGreaterThan(before[1]);
    expect(next.units[0].successes).toBe(1);
  });

  it('体力见底的成员扣忠诚', () => {
    let state = toAssign(open());
    const target = { ...state.talents[0], stamina: 20, loyalty: 60 };
    state = { ...state, talents: [target, ...state.talents.slice(1)], offers: [{ index: 0, job: AGENCY_JOBS.rest }] };
    const next = assignJob(state, 0, target.id);
    expect(talentOf(next, target.id).loyalty).toBeLessThan(60);
  });

  it('同一个 seed + 同一串操作结果一致', () => {
    const run = () => {
      let state = toAssign(open({}, 55));
      state = { ...state, offers: [{ index: 0, job: AGENCY_JOBS.radioShow }] };
      const id = state.talents[0].id;
      return assignJob(state, 0, id);
    };
    const a = run();
    const b = run();
    expect(talentOf(a, a.talents[0].id)).toEqual(talentOf(b, b.talents[0].id));
    expect(a.cash).toBe(b.cash);
  });
});

/* ------------------------------ 道具 ------------------------------ */

describe('seiyuuAgency 道具', () => {
  it('每月只能用一件，买的时候付钱、用的时候不额外扣钱', () => {
    const state = withItems(toAssign(open()), ['trainingCamp', 'healthCheck']);
    const used = useItem(state, 'trainingCamp');
    expect(used.cash).toBe(state.cash);
    expect(used.items.trainingCamp).toBe((state.items.trainingCamp ?? 0) - 1);
    expect(used.usedItems).toContain('trainingCamp');
    expect(used.itemUses).toBe(1);
    expect(used.log.at(-1)).toMatchObject({ key: 'item', itemKey: 'trainingCamp' });
    // 同一件道具在这个子回合内不能再用第二遍，但换一件可以
    expect(useItem(used, 'trainingCamp')).toBe(used);
    expect(useItem(used, 'healthCheck').usedItems).toContain('healthCheck');
  });

  it('商店：花钱买进背包、记日志，钱不够买不到', () => {
    const state = toAssign(open());
    const bought = buyItem(state, 'coach');
    expect(bought.cash).toBe(state.cash - AGENCY_ITEMS.coach.cost);
    expect(bought.items.coach).toBe(1);
    expect(bought.log.at(-1)).toMatchObject({ key: 'buy', itemKey: 'coach', amount: AGENCY_ITEMS.coach.cost });
    const poor = { ...state, cash: 10 };
    expect(buyItem(poor, 'coach')).toBe(poor);
  });

  it('手上没有的、买不起的、阶段不对的都用不了', () => {
    const base = toAssign(open());
    expect(useItem(base, 'coach', base.talents[0].id)).toBe(base); // 没货
    const rich = withItems(base, ['coach', 'trainingCamp', 'publicity', 'trainingCamp']);
    expect(useItem({ ...rich, cash: 10 }, 'coach', rich.talents[0].id).cash).toBe(10);
    // 需要派活阶段的道具在招募阶段用不了
    const recruitStage = withItems(open(), ['trainingCamp']);
    expect(recruitStage.stage).toBe('recruit');
    expect(useItem(recruitStage, 'trainingCamp')).toBe(recruitStage);
    // 事件卡上不能插道具
    const onEvent = withItems(toAssign(open()), ['publicity']);
    const eventCard = pendingEvent(onEvent, 'viral');
    expect(useItem(eventCard, 'publicity')).toBe(eventCard);
  });

  it('要点人的道具必须给对人', () => {
    const state = withItems(toAssign(open()), ['giftTickets', 'coach']);
    expect(useItem(state, 'giftTickets')).toBe(state);
    expect(useItem(state, 'giftTickets', 'nobody')).toBe(state);
  });

  it('集训营：全所演技歌唱 +6、体力 -8', () => {
    const state = withItems(toAssign(open()), ['trainingCamp']);
    const next = useItem(state, 'trainingCamp');
    for (const talent of state.talents) {
      const after = talentOf(next, talent.id);
      expect(after.skill).toBe(Math.min(100, talent.skill + 6));
      expect(after.vocal).toBe(Math.min(100, talent.vocal + 6));
      expect(after.stamina).toBe(Math.max(0, talent.stamina - 8));
    }
  });

  it('体检疗养 / 粉丝见面会 / 公关宣传动的是全所或声望', () => {
    const healthy = useItem(withItems(toAssign(open()), ['healthCheck']), 'healthCheck');
    const state = toAssign(open());
    for (const talent of state.talents) {
      const after = talentOf(healthy, talent.id);
      expect(after.stamina).toBe(Math.min(100, talent.stamina + 20));
      expect(after.loyalty).toBe(Math.min(100, talent.loyalty + 4));
    }

    const fan = useItem(withItems(toAssign(open()), ['fanEvent']), 'fanEvent');
    expect(fan.reputation).toBe(state.reputation + 4);

    const pr = useItem(withItems(toAssign(open()), ['publicity']), 'publicity');
    expect(pr.reputation).toBe(state.reputation + 8);
    expect(pr.monthMods.shield).toBe(true);
  });

  it('演出票 / 写真拍摄 / 私教课只作用在指定的人身上', () => {
    const state = withItems(toAssign(open()), ['giftTickets']);
    const target = state.talents[1];
    const gift = useItem(state, 'giftTickets', target.id);
    expect(talentOf(gift, target.id).loyalty).toBe(Math.min(100, target.loyalty + 18));
    expect(talentOf(gift, state.talents[0].id).loyalty).toBe(state.talents[0].loyalty);

    const shootState = withItems(toAssign(open()), ['photoShoot']);
    const shoot = useItem(shootState, 'photoShoot', target.id);
    expect(talentOf(shoot, target.id).fame).toBe(Math.min(100, target.fame + 8));
    expect(talentOf(shoot, target.id).stamina).toBe(Math.max(0, target.stamina - 10));

    const weak = { ...target, skill: 20, vocal: 60, charm: 50 };
    const coachState = withItems(
      { ...toAssign(open()), talents: [state.talents[0], weak, ...state.talents.slice(2)] },
      ['coach'],
    );
    const coached = useItem(coachState, 'coach', weak.id);
    expect(talentOf(coached, weak.id).skill).toBe(30);
    expect(talentOf(coached, weak.id).vocal).toBe(60);
  });

  it('外出取材 / 星探报告 / 换委托 / 保险：改的是本月状态', () => {
    const trip = useItem(withItems(toAssign(open()), ['businessTrip']), 'businessTrip');
    expect(trip.monthMods.successBoost).toBeGreaterThan(0);

    // 星探报告：写进 carryMods，下一次试音会（第 5 个月）多一位候选
    const scoutState = { ...withItems(toAssign(open()), ['scoutReport']), month: 4 };
    const scout = useItem(scoutState, 'scoutReport');
    expect(scout.carryMods.extraCandidates).toBe(1);
    const nextMonth = assignJob(
      { ...scout, actionsLeft: 1, offers: [{ index: 0, job: AGENCY_JOBS.rest }] },
      0,
      scout.talents[0].id,
    );
    expect(nextMonth.month).toBe(5);
    expect(nextMonth.stage).toBe('recruit');
    expect(nextMonth.candidates.length).toBe(4);

    const rerollState = withItems(toAssign(open()), ['rerollOffers']);
    const rerolled = useItem(rerollState, 'rerollOffers');
    expect(rerolled.offers.length).toBe(AGENCY_OFFER_COUNT + 2);
    expect(rerolled.offers.map((offer) => offer.job.kind)).not.toEqual(
      rerollState.offers.map((offer) => offer.job.kind),
    );

    const insured = useItem(withItems(toAssign(open()), ['insurance']), 'insurance');
    expect(insured.monthMods.insurance).toBe(1);
  });

  it('事故保险：本月第一次翻车不掉忠诚、不掉声望', () => {
    const state = withItems(toAssign(open()), ['insurance']);
    const insured = useItem(state, 'insurance');
    const job: AgencyJob = AGENCY_JOBS.stageLive;
    const target = { ...insured.talents[0], stamina: 60 };
    const forcing = {
      ...insured,
      rng: () => 0.999, // 必定翻车
      offers: [{ index: 0, job }],
      talents: [target, ...insured.talents.slice(1)],
    };
    const next = assignJob(forcing, 0, target.id);
    expect(talentOf(next, target.id).loyalty).toBe(target.loyalty);
    expect(talentOf(next, target.id).fails).toBe(target.fails);
    expect(next.monthMods.insurance).toBe(0);

    // 没有保险时同一操作会真的扣忠诚与声望
    const bare = { ...forcing, monthMods: { ...forcing.monthMods, insurance: 0 } };
    const raw = assignJob(bare, 0, target.id);
    expect(talentOf(raw, target.id).loyalty).toBeLessThan(target.loyalty);
  });
});

/* ------------------------------ 组合 ------------------------------ */

describe('seiyuuAgency 组合', () => {
  it('人数不对 / 钱不够 / 已经组过的人不能重复进团', () => {
    const state = withItems(toAssign(open()), []);
    const [a, b, c] = state.talents;
    expect(formUnit(state, [a.id])).toBe(state);
    const poor = { ...state, cash: 10 };
    expect(formUnit(poor, [a.id, b.id])).toBe(poor);
    const formed = formUnit(state, [a.id, b.id]);
    expect(formed).not.toBe(state);
    expect(formUnit(formed, [a.id, c.id])).toBe(formed);
    expect(formUnit(state, [a.id, b.id, c.id, 'x', 'y'])).toBe(state);
  });

  it('成团花掉 UNIT_FORM_COST，成员忠诚 +8，登记日志与组合名', () => {
    const state = toAssign(open());
    const [a, b] = state.talents;
    const next = formUnit(state, [a.id, b.id]);
    expect(next.cash).toBe(state.cash - UNIT_FORM_COST);
    expect(next.units.length).toBe(1);
    expect(talentOf(next, a.id).unitId).toBe(next.units[0].id);
    expect(talentOf(next, a.id).loyalty).toBe(Math.min(100, a.loyalty + 8));
    expect(next.log.some((entry) => entry.key === 'unit')).toBe(true);
    expect(unitNameOf(next, next.units[0].id)).toBe(`${nameOf(a.id)}${UNIT_NAME_JOINER}${nameOf(b.id)}`);
  });

  it(`最多 ${UNIT_LIMIT} 支组合`, () => {
    let state = toAssign(open({ difficulty: 'easy' }, 9));
    // 签到 6 人：直接往候选里塞人再签
    while (state.talents.length < AGENCY_MAX_TALENTS) {
      const candidate = open({}, 100 + state.talents.length).talents[0];
      state = recruit(
        {
          ...state,
          cash: 999,
          stage: 'recruit',
          candidates: [{ ...candidate, id: `extra-${state.talents.length}` }],
        },
        `extra-${state.talents.length}`,
      );
      state = toAssign(state);
    }
    expect(state.talents.length).toBe(AGENCY_MAX_TALENTS);
    const ids = state.talents.map((talent) => talent.id);
    state = formUnit(state, ids.slice(0, UNIT_MIN_MEMBERS));
    state = formUnit(state, ids.slice(UNIT_MIN_MEMBERS, UNIT_MIN_MEMBERS * 2));
    expect(state.units.length).toBe(UNIT_LIMIT);
    state = formUnit(state, ids.slice(UNIT_MIN_MEMBERS * 2, UNIT_MIN_MEMBERS * 2 + UNIT_MIN_MEMBERS));
    expect(state.units.length).toBe(UNIT_LIMIT);
  });

  it('组合人数不足 2 人时自动解散，解散后成员恢复自由身', () => {
    const base = toAssign(open());
    const [a, b] = base.talents;
    const state = formUnit(base, [a.id, b.id]);
    const next = resolveEvent(pendingEvent(state, 'poach', a.id), 'letGo');
    expect(next.talents.some((talent) => talent.id === a.id)).toBe(false);
    // 组合只剩 1 人 → 自动解散，剩下的成员 unitId 清空
    expect(next.units.length).toBe(0);
    expect(talentOf(next, b.id).unitId).toBeUndefined();
    expect(next.log.some((entry) => entry.key === 'leave')).toBe(true);
  });

  it('组合知名度 = 成员平均 + 组合加成', () => {
    const base = toAssign(open());
    const [a, b] = base.talents;
    const state = formUnit(base, [a.id, b.id]);
    const unit = state.units[0];
    const average = Math.round((talentOf(state, a.id).fame + talentOf(state, b.id).fame) / 2);
    expect(unitFameOf(state, unit.id)).toBe(Math.min(100, average));
    const boosted = { ...state, units: [{ ...unit, fame: 6 }] };
    expect(unitFameOf(boosted, unit.id)).toBe(Math.min(100, average + 6));
  });

  it('主动解散组合：成员恢复自由身、专场委托被换掉', () => {
    const base = toAssign(open());
    const formed = formUnit(base, [base.talents[0].id, base.talents[1].id]);
    const next = disbandUnit(formed, formed.units[0].id);
    expect(next.units.length).toBe(0);
    for (const talent of next.talents) expect(talent.unitId).toBeUndefined();
    expect(next.offers.some((offer) => offer.job.unitOnly)).toBeFalsy();
  });
});

/* ------------------------------ 突发事件 ------------------------------ */

describe('seiyuuAgency 突发事件', () => {
  it('事件表结构自洽：id 唯一、权重非负、选项非空且不重复', () => {
    const ids = new Set<string>();
    for (const event of AGENCY_EVENTS) {
      expect(ids.has(event.id)).toBe(false);
      ids.add(event.id);
      expect(event.options.length).toBeGreaterThan(0);
      expect(event.weight ?? 1).toBeGreaterThanOrEqual(0);
      const optionIds = event.options.map((option) => option.id);
      expect(new Set(optionIds).size, event.id).toBe(optionIds.length);
      for (const option of event.options) {
        if (option.requiresCash !== undefined) expect(option.requiresCash).toBeGreaterThan(0);
        if (option.risk) {
          expect(option.risk.chance).toBeGreaterThan(0);
          expect(option.risk.chance).toBeLessThan(1);
          expect(option.effects).toBeUndefined();
        } else {
          expect(option.effects).toBeTruthy();
        }
      }
    }
    expect(NORMAL_EVENTS.length + 4).toBe(AGENCY_EVENTS.length);
  });

  it('条件不满足的事件抽不到，抽过的不会再来', () => {
    const fresh = toAssign(open());
    const ids = eligibleEvents(fresh).map((event) => event.id);
    expect(ids).not.toContain('scandal'); // 要有 25 点知名度的人才会被拍
    expect(ids).not.toContain('taxAudit'); // 第 8 个月之后才有
    expect(ids).not.toContain('unitClash'); // 没有组合
    const seen = { ...fresh, seenEvents: ['viral' as AgencyEventKey] };
    const seenIds = eligibleEvents(seen).map((event) => event.id);
    expect(seenIds).not.toContain('viral');
    expect(seenIds.length).toBe(eligibleEvents(fresh).length - 1);
  });

  it('赌注按概率走两个分支，拍不动的选项直接返回原状态', () => {
    const base = pendingEvent(toAssign(open()), 'viral');
    const win = resolveEvent({ ...base, rng: () => 0 }, 'risk');
    const lose = resolveEvent({ ...base, rng: () => 0.99 }, 'risk');
    expect(win.cash).toBeGreaterThan(base.cash);
    // 翻车分支：钱不会涨（结算时还会扣当月工资）
    expect(lose.cash).toBeLessThanOrEqual(base.cash);
    expect(lose.reputation).toBeLessThan(base.reputation);

    // 未知选项 / 钱不够的选项都不生效
    expect(resolveEvent(base, 'nope')).toBe(base);
    const poor = pendingEvent({ ...toAssign(open()), cash: 10 }, 'veteranLeaving');
    expect(resolveEvent(poor, 'studio')).toBe(poor);
  });

  it('事件选项真的改数值：全所 / 组合 / 单人三种范围', () => {
    const all = resolveEvent(pendingEvent(toAssign(open()), 'flu'), 'pushAll');
    // flu.pushAll：全所体力 -15、声望 -3
    const base = toAssign(open());
    for (const talent of base.talents) {
      expect(talentOf(all, talent.id).stamina).toBeLessThan(talent.stamina);
    }
    expect(all.reputation).toBe(Math.max(0, base.reputation - 3));

    const target = base.talents[0];
    const one = resolveEvent(pendingEvent(base, 'songDeal', target.id), 'mini');
    expect(talentOf(one, target.id).vocal).toBe(Math.min(100, target.vocal + 5));
    expect(talentOf(one, base.talents[1].id).vocal).toBe(base.talents[1].vocal);
  });

  it('「放她走」类事件会把成员移出事务所，并记进日志', () => {
    const base = pendingEvent(toAssign(open()), 'poach', open().talents[0].id);
    const target = base.pendingEvent?.talentId as string;
    const next = resolveEvent(base, 'letGo');
    expect(next.talents.length).toBe(base.talents.length - 1);
    expect(next.log.some((entry) => entry.key === 'leave' && entry.talentId === target)).toBe(true);
    expect(next.cash).toBeGreaterThan(base.cash);
  });

  it('转会类事件能把人签进来（钱够时），人满了就不签', () => {
    const base = pendingEvent({ ...toAssign(open()), cash: 500 }, 'transferIn');
    const next = resolveEvent(base, 'sign');
    expect(next.talents.length).toBe(base.talents.length + 1);
    expect(next.talents.at(-1)?.veteran).toBe(true);
    expect(next.log.some((entry) => entry.key === 'recruit')).toBe(true);

    const crowded = toAssign(open());
    const full: AgencyState = {
      ...crowded,
      cash: 500,
      talents: [...crowded.talents, ...crowded.talents].slice(0, AGENCY_MAX_TALENTS),
    };
    expect(full.talents.length).toBe(AGENCY_MAX_TALENTS);
    const blocked = resolveEvent(pendingEvent(full, 'transferIn'), 'sign');
    expect(blocked.talents.length).toBe(AGENCY_MAX_TALENTS);
  });

  it('事件里的 monthMod 会在下个月生效', () => {
    const base = pendingEvent({ ...toAssign(open()), month: 3, actionsLeft: 1 }, 'industryWinter');
    const next = resolveEvent(base, 'cut');
    expect(next.month).toBe(4);
    expect(next.monthMods.payRate).toBeLessThan(1);

    const clashBase = pendingEvent({ ...toAssign(open()), month: 3, actionsLeft: 1 }, 'unitClash');
    const clash = resolveEvent(clashBase, 'split');
    expect(clash.monthMods.successBoost ?? 0).toBeGreaterThan(0);
  });

  it('声望被公关护住时，负面数值减半', () => {
    const base = pendingEvent(toAssign(open()), 'scandal');
    const raw = resolveEvent(base, 'apologize');
    const shielded = resolveEvent({ ...base, monthMods: { ...base.monthMods, shield: true } }, 'apologize');
    expect(shielded.reputation).toBeGreaterThan(raw.reputation);
  });

  it('彩蛋事件：概率极低、单独记档、不占常态事件额度', () => {
    expect(EASTER_EGG_CHANCE).toBeGreaterThan(0);
    expect(EASTER_EGG_CHANCE).toBeLessThan(0.01);
    const eggs = AGENCY_EVENTS.filter((event) => event.easter);
    expect(eggs.length).toBe(4);
    for (const egg of eggs) expect(NORMAL_EVENTS.map((event) => event.id)).not.toContain(egg.id);

    // rng 恒为 0 → 必定命中彩蛋分支
    const state = { ...toAssign(open()), offers: [{ index: 0, job: AGENCY_JOBS.rest }], rng: () => 0 };
    const next = assignJob(state, 0, state.talents[0].id);
    expect(next.stage).toBe('event');
    const id = next.pendingEvent?.eventId as AgencyEventKey;
    expect(eggs.map((event) => event.id)).toContain(id);
    const resolved = resolveEvent(next, eventDefOf(id)?.options[0].id as string);
    expect(resolved.easterEggs).toContain(id);
    // 彩蛋不写进常态事件的历史（不占额度）
    expect(resolved.seenEvents.filter((seen) => !seen.startsWith('easter'))).not.toContain(id);
  });

  it('eventDefOf 认得出的只有表里的事件', () => {
    expect(eventDefOf('viral')?.id).toBe('viral');
    expect(eventDefOf('nope' as AgencyEventKey)).toBeUndefined();
  });
});

/* ------------------------------ 招募 ------------------------------ */

describe('seiyuuAgency 招募', () => {
  it('招募月跟着长度走', () => {
    expect(recruitMonthsOf(LENGTH_MONTHS.short)).toEqual([1, 5, 9]);
    for (const length of AGENCY_LENGTHS) {
      const months = recruitMonthsOf(LENGTH_MONTHS[length]);
      expect(months[0]).toBe(1);
      expect(months.length).toBeGreaterThanOrEqual(3);
      expect(months.at(-1)!).toBeLessThanOrEqual(LENGTH_MONTHS[length]);
    }
  });

  it('签约扣钱（老牌更贵）、换到派活阶段；跳过则只清掉候选', () => {
    const state = open();
    const rookie = state.candidates.find((candidate) => !candidate.veteran) ?? state.candidates[0];
    const next = recruit(state, rookie.id);
    expect(next.talents.length).toBe(state.talents.length + 1);
    expect(next.cash).toBe(state.cash - (rookie.veteran ? 160 : 120));
    expect(next.stage).toBe('assign');
    expect(next.candidates).toEqual([]);

    const skipped = skipRecruit(state);
    expect(skipped.stage).toBe('assign');
    expect(skipped.candidates).toEqual([]);
    expect(skipped.talents.length).toBe(state.talents.length);
    // 不在招募阶段签不了
    expect(recruit(skipped, state.candidates[0].id)).toBe(skipped);
  });

  it('钱不够 / 人满了签不下来', () => {
    const state = open();
    expect(recruit({ ...state, cash: 10 }, state.candidates[0].id).talents.length).toBe(state.talents.length);
    const full = {
      ...state,
      talents: [...state.talents, ...state.talents, ...state.talents].slice(0, AGENCY_MAX_TALENTS),
    };
    expect(recruit(full, state.candidates[0].id).talents.length).toBe(AGENCY_MAX_TALENTS);
  });
});

/* ------------------------------ 整局与年报 ------------------------------ */

describe('seiyuuAgency 整局', () => {
  it('整局能收局：月份停在计划的月数，委托和候选清空', () => {
    const state = play(31337);
    expect(state.stage).toBe('done');
    expect(state.month).toBe(state.months);
    expect(state.offers).toEqual([]);
    expect(state.candidates).toEqual([]);
  });

  it('同一个 seed 整局可复现', () => {
    const profile = (state: AgencyState) =>
      [
        state.reputation,
        state.cash,
        state.talents.map((talent) => `${talent.id}:${talent.fame}:${talent.jobs}`).join('|'),
        state.log.length,
        state.easterEggs.join(','),
      ].join('#');
    expect(profile(play(2026))).toBe(profile(play(2026)));
  });

  it('长局能跑完，且道具全靠商店', () => {
    const state = play(88, { length: 'long' });
    expect(state.stage).toBe('done');
    expect(state.months).toBe(LENGTH_MONTHS.long);
    // 开局不给道具，也不再有半年补给
    expect(itemTotal(state)).toBe(0);
    expect(state.itemUses).toBe(0);
  });

  it('年报字段自洽：奖项不重复领、top 按知名度排序、彩蛋/称号/道具统计对得上', () => {
    for (const seed of [1, 42, 777, 20260101]) {
      const state = play(seed);
      const report = reportOf(state);
      expect(report.months).toBe(state.months);
      expect(['S', 'A', 'B', 'C']).toContain(report.grade);
      expect(report.score).toBeGreaterThanOrEqual(0);
      expect(report.score).toBeLessThanOrEqual(100);
      expect(report.jobs).toBe(state.talents.reduce((sum, talent) => sum + talent.jobs, 0));
      expect(report.titleCount).toBe(state.talents.reduce((sum, talent) => sum + talent.titles.length, 0));
      expect(report.itemUses).toBe(state.itemUses);
      expect(report.top.length).toBeLessThanOrEqual(3);
      for (let index = 1; index < report.top.length; index += 1) {
        expect(report.top[index - 1].fame).toBeGreaterThanOrEqual(report.top[index].fame);
      }
      // 同一个人 / 同一个组合不重复领奖
      const who = report.awards.map((award) => award.talentId ?? award.unitId);
      expect(new Set(who).size).toBe(who.length);
      expect(report.awards.every((award) => who.includes(award.talentId ?? award.unitId))).toBe(true);
      expect(new Set(report.highlights.map((entry) => entry.key)).size).toBe(report.highlights.length);
      expect(report.easterEggs.every((key) => key.startsWith('easter'))).toBe(true);
    }
  });

  it('拿到称号的成员在年报里能被念到名字', () => {
    let state = toAssign(open({}, 606));
    const job: AgencyJob = AGENCY_JOBS.animeLead;
    const id = state.talents[0].id;
    state = { ...state, rng: () => 0, offers: [{ index: 0, job }] };
    state = assignJob(state, 0, id);
    state = { ...state, stage: 'assign', pendingEvent: null, offers: [{ index: 0, job }], rng: () => 0 };
    state = assignJob(state, 0, id);
    const report = reportOf(state);
    const row = report.top.find((item) => item.id === id);
    expect(row?.titles).toContain('leadMachine');
    expect(report.titleCount).toBeGreaterThanOrEqual(1);
  });
});

/* ------------------------------ 文案（三语言） ------------------------------ */

describe('seiyuuAgency 文案齐全（三语言）', () => {
  it('难度 / 长度 / 加点 / 特质 / 称号 / 道具 / 事件都有三语文案', () => {
    for (const lang of LANGS) {
      const section = resources[lang].translation.seiyuuAgency as unknown as {
        title: string;
        kicker: string;
        intro: string;
        start: string;
        difficultyTitle: string;
        lengthTitle: string;
        rule1: string;
        rule2: string;
        rule3: string;
        rule4: string;
        rule5: string;
        difficulties: Record<string, { name: string; desc: string }>;
        lengths: Record<string, { name: string; desc: string }>;
        agent: {
          title: string;
          left: string;
          linked: string;
          linkHint: string;
          link: string;
          unlink: string;
          linkedOk: string;
          codeInvalid: string;
          attrs: Record<string, { name: string; desc: string }>;
        };
        stats: Record<string, string>;
        jobs: Record<string, string>;
        offers: Record<string, string>;
        unit: Record<string, string>;
        items: Record<string, string | { name: string; desc: string }>;
        traits: Record<string, { name: string; desc: string }>;
        titles: Record<string, { name: string; desc: string }>;
        log: Record<string, string>;
        event: Record<string, string>;
        events: Record<string, { title: string; desc: string; options: Record<string, string> }>;
        awards: Record<string, string>;
        report: Record<string, string>;
        poster: Record<string, string>;
      };
      const text = (value: unknown, label: string) => {
        expect(typeof value, `${lang}.${label}`).toBe('string');
        expect((value as string).trim().length, `${lang}.${label}`).toBeGreaterThan(0);
      };

      for (const key of ['title', 'kicker', 'intro', 'start', 'difficultyTitle', 'lengthTitle']) {
        text((section as unknown as Record<string, unknown>)[key], key);
      }
      for (const key of ['rule1', 'rule2', 'rule3', 'rule4', 'rule5']) {
        text((section as unknown as Record<string, unknown>)[key], key);
      }
      for (const difficulty of AGENCY_DIFFICULTIES) {
        text(section.difficulties[difficulty]?.name, `difficulties.${difficulty}.name`);
        text(section.difficulties[difficulty]?.desc, `difficulties.${difficulty}.desc`);
      }
      for (const length of AGENCY_LENGTHS) {
        text(section.lengths[length]?.name, `lengths.${length}.name`);
        text(section.lengths[length]?.desc, `lengths.${length}.desc`);
      }
      for (const key of ['title', 'left', 'linked', 'linkHint', 'link', 'unlink', 'linkedOk', 'codeInvalid']) {
        text((section.agent as unknown as Record<string, unknown>)[key], `agent.${key}`);
      }
      for (const attr of AGENT_ATTRS) {
        text(section.agent.attrs[attr]?.name, `agent.attrs.${attr}.name`);
        text(section.agent.attrs[attr]?.desc, `agent.attrs.${attr}.desc`);
      }
      for (const key of ['skill', 'vocal', 'charm', 'stamina', 'fame', 'loyalty', 'cash', 'reputation']) {
        text(section.stats[key], `stats.${key}`);
      }
      for (const kind of Object.keys(AGENCY_JOBS)) text(section.jobs[kind], `jobs.${kind}`);
      for (const key of ['title', 'hint', 'safe', 'unitOnly', 'pay', 'fame']) text(section.offers[key], `offers.${key}`);
      for (const key of ['title', 'count', 'form', 'confirm', 'meta', 'disband', 'pickHint', 'pick', 'picked', 'invalid']) {
        text(section.unit[key], `unit.${key}`);
      }
      for (const key of ['title', 'available', 'used', 'shopHint', 'buy', 'needBuy', 'noCash', 'cost', 'pickTarget', 'use']) {
        text(section.items[key], `items.${key}`);
      }
      for (const key of ITEM_KEYS) {
        const item = section.items[key] as { name: string; desc: string };
        text(item?.name, `items.${key}.name`);
        text(item?.desc, `items.${key}.desc`);
      }
      for (const key of TRAIT_KEYS) {
        text(section.traits[key]?.name, `traits.${key}.name`);
        text(section.traits[key]?.desc, `traits.${key}.desc`);
      }
      for (const key of TITLE_KEYS) {
        text(section.titles[key]?.name, `titles.${key}.name`);
        text(section.titles[key]?.desc, `titles.${key}.desc`);
      }
      for (const key of ['success', 'fail', 'training', 'rest', 'event', 'recruit', 'leave', 'item', 'title', 'unit', 'wage', 'wageLate']) {
        text(section.log[key], `log.${key}`);
      }
      for (const key of [
        'kicker',
        'easterKicker',
        'target',
        'chance',
        'success',
        'failure',
        'scopeAll',
        'scopeUnit',
        'willLeave',
        'willSign',
        'noCash',
      ]) {
        text(section.event[key], `event.${key}`);
      }
      for (const event of AGENCY_EVENTS) {
        const copy = section.events[event.id];
        expect(copy, `${lang}.events.${event.id}`).toBeTruthy();
        text(copy.title, `events.${event.id}.title`);
        text(copy.desc, `events.${event.id}.desc`);
        for (const option of event.options) {
          text(copy.options[option.id], `events.${event.id}.options.${option.id}`);
        }
      }
      for (const key of ['title', 'breakout', 'bestNewcomer', 'bestLead', 'busiest', 'bestUnit', 'fanFavorite', 'line']) {
        text(section.awards[key], `awards.${key}`);
      }
      for (const key of [
        'title',
        'score',
        'top',
        'easterTitle',
        'statsTitle',
        'statsJobs',
        'statsTitles',
        'statsItems',
        'statsUnits',
        'stats',
        'eggNote',
        'highlight',
        'none',
        'restart',
        'shareTitle',
        'shareSummary',
      ]) {
        text(section.report[key], `report.${key}`);
      }
      for (const key of ['kicker', 'title', 'subtitle', 'hint', 'qrCaption', 'open', 'building', 'label', 'saveHint', 'download', 'failed']) {
        text(section.poster[key], `poster.${key}`);
      }
    }
  });

  it('三语结构一致：key 集合完全相同', () => {
    const shape = (value: unknown, prefix = ''): string[] => {
      if (!value || typeof value !== 'object') return [prefix];
      return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
        shape(child, prefix ? `${prefix}.${key}` : key),
      );
    };
    const base = shape(resources.zh.translation.seiyuuAgency).sort();
    for (const lang of ['en', 'ja'] as const) {
      expect(shape(resources[lang].translation.seiyuuAgency).sort(), lang).toEqual(base);
    }
  });

  it('页面里写死的键三语都有（含 common.*）', () => {
    const keys = extractI18nKeys(readSource('src/pages/SeiyuuAgency.tsx'));
    expect(keys.length).toBeGreaterThan(30);
    for (const lang of LANGS) {
      const translation = resources[lang].translation as unknown as Record<string, unknown>;
      for (const key of keys) {
        // 动态拼接（`'a.b.' + x`）只会捕到前缀，校验它确实是一个对象
        const path = key.endsWith('.') ? key.slice(0, -1) : key;
        const node = path.split('.').reduce<unknown>((current, part) => {
          if (current && typeof current === 'object') return (current as Record<string, unknown>)[part];
          return undefined;
        }, translation);
        if (key.endsWith('.')) {
          expect(typeof node, `${lang}.${key}`).toBe('object');
          expect(Object.keys(node as object).length, `${lang}.${key}`).toBeGreaterThan(0);
        } else {
          expect(typeof node, `${lang}.${key}`).toBe('string');
        }
      }
    }
  });

  it('站内文案不写内部机制（不出现「概率 0.5%」这种原样数字以外的实现细节）', () => {
    const section = resources.zh.translation.seiyuuAgency as unknown as {
      intro: string;
      rule1: string;
      rule5: string;
      report: { eggNote: string };
    };
    expect(section.intro).toContain('事务所');
    expect(section.report.eggNote).toContain('{{value}}');
    for (const copy of [section.rule1, section.rule5]) {
      expect(copy).not.toContain('seed');
      expect(copy).not.toContain('rand');
    }
  });
});
