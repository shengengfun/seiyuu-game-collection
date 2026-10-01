import { describe, expect, it } from 'vitest';
import { resources } from '../i18n/resources';
import { extractI18nKeys, readSource } from '../test/readSource';
import { FANDOM_IDS } from '@seiyuu/game-sdk';
import {
  LIFE_ENDINGS,
  LIFE_EVENTS,
  LIFE_EVENT_CHANCE,
  LIFE_INITIAL_STATS,
  LIFE_MAX,
  LIFE_MAX_EVENTS,
  LIFE_NODES,
  LIFE_PATH_LENGTH,
  LIFE_START_NODE,
  LIFE_STAT_KEYS,
  applyEffects,
  eligibleEvents,
  endingOdds,
  endingOf,
  matchPool,
  matchSeiyuu,
  nodeById,
  resolveEventOption,
  rollEvent,
  runLife,
  simulateLife,
} from './model/seiyuuLife';

const LANGS = ['zh', 'en', 'ja'] as const;

describe('seiyuuLife 数值与结局', () => {
  it('数值 clamp 到 0~100', () => {
    expect(applyEffects(LIFE_INITIAL_STATS, { fame: 999 }).fame).toBe(LIFE_MAX);
    expect(applyEffects(LIFE_INITIAL_STATS, { stamina: -999 }).stamina).toBe(0);
  });

  it('16 个岔路口，每个 2~3 个选项，选项 id 不重复，next 都指向真实节点', () => {
    expect(LIFE_NODES).toHaveLength(16);
    const nodeIds = new Set(LIFE_NODES.map((node) => node.id));
    expect(nodeIds.size).toBe(LIFE_NODES.length);
    expect(nodeIds.has(LIFE_START_NODE)).toBe(true);
    for (const node of LIFE_NODES) {
      expect(node.options.length).toBeGreaterThanOrEqual(2);
      expect(node.options.length).toBeLessThanOrEqual(3);
      const ids = node.options.map((option) => option.id);
      expect(new Set(ids).size).toBe(ids.length);
      for (const option of node.options) {
        if (option.next) {
          expect(nodeIds.has(option.next), `${node.id}.${option.id} -> ${option.next}`).toBe(true);
        }
      }
    }
    // 从起点出发必须能把 16 个节点都走到（不然有写了文案却永远遇不到的分支）
    const reachable = new Set<string>();
    const walk = (id: string) => {
      if (reachable.has(id)) return;
      reachable.add(id);
      for (const option of nodeById(id)?.options ?? []) {
        if (option.next) walk(option.next);
      }
    };
    walk(LIFE_START_NODE);
    expect(reachable.size).toBe(LIFE_NODES.length);
  });

  it('穷举采样：岔路口自己的结局都能走到，事件专属结局走不到', () => {
    let state = 20261001;
    const random = () => {
      state = (state * 1103515245 + 12345) % 2147483648;
      return state / 2147483648;
    };
    const seen = new Set<string>();
    const picks = Array.from({ length: LIFE_PATH_LENGTH + 2 }, () => 0);
    for (let round = 0; round < 5000; round += 1) {
      for (let index = 0; index < picks.length; index += 1) picks[index] = Math.floor(random() * 3);
      seen.add(runLife(picks).ending.id);
    }

    const stageOnly = [
      'burnout',
      'teacher',
      'star',
      'idol',
      'band',
      'radio',
      'game',
      'freelance',
      'workhorse',
      'unsung',
    ];
    for (const id of stageOnly) expect(seen.has(id), id).toBe(true);
    // 这三个只能靠突发事件拿到 —— 不然「综艺 / 直播 / 传说」太廉价了
    for (const id of ['legend', 'variety', 'streamer']) expect(seen.has(id), id).toBe(false);
    for (const id of seen) expect(stageOnly, id).toContain(id);
  });

  it('runLife 记录沿路的选择与去重后的标签', () => {
    const run = runLife([2, 2, 1, 1, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0]);
    expect(run.picks.length).toBeGreaterThanOrEqual(12);
    expect(run.picks.length).toBeLessThanOrEqual(LIFE_PATH_LENGTH);
    expect(new Set(run.tags).size).toBe(run.tags.length);
    for (const key of LIFE_STAT_KEYS) {
      expect(run.stats[key]).toBeGreaterThanOrEqual(0);
      expect(run.stats[key]).toBeLessThanOrEqual(LIFE_MAX);
    }
  });

  it('体力崩掉优先于一切数值结局', () => {
    const ending = endingOf({ skill: 100, vocal: 100, fame: 100, stamina: 10, luck: 100 }, ['idol']);
    expect(ending.id).toBe('burnout');
  });

  it('讲师标签优先于偶像标签（红到一定程度就不再算讲师）', () => {
    const ending = endingOf({ skill: 70, vocal: 70, fame: 40, stamina: 80, luck: 60 }, [
      'idol',
      'teacher',
    ]);
    expect(ending.id).toBe('teacher');
    // 名气上去了就该走偶像 / 大牌那边，不会因为早年当过讲师被卡住
    const famous = endingOf({ skill: 100, vocal: 100, fame: 100, stamina: 80, luck: 100 }, [
      'idol',
      'teacher',
    ]);
    expect(famous.id).not.toBe('teacher');
  });
});

describe('seiyuuLife 匹配「最像的人」', () => {
  it('匹配池永远非空，且都在主推范围内', () => {
    for (const ending of LIFE_ENDINGS) {
      const pool = matchPool(ending);
      expect(pool.length).toBeGreaterThan(0);
      for (const id of pool) expect(FANDOM_IDS).toContain(id);
    }
  });

  it('同一个 seed 结果固定，不同 seed 会换人', () => {
    const ending = LIFE_ENDINGS[LIFE_ENDINGS.length - 1];
    expect(matchSeiyuu(ending, 10001)).toBe(matchSeiyuu(ending, 10001));
    const sample = new Set([10001, 20002, 30003, 40004, 50005].map((seed) => matchSeiyuu(ending, seed)));
    expect(sample.size).toBeGreaterThan(1);
  });
});

describe('seiyuuLife 突发事件', () => {
  const maxed = { skill: 100, vocal: 100, fame: 100, stamina: 100, luck: 100 };
  const rookie = { ...LIFE_INITIAL_STATS };

  it('事件表结构自洽：每条都有选项、选项 id 不重复', () => {
    expect(LIFE_EVENTS.length).toBeGreaterThanOrEqual(10);
    const ids = LIFE_EVENTS.map((event) => event.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const event of LIFE_EVENTS) {
      expect(event.options.length).toBeGreaterThanOrEqual(2);
      const optionIds = event.options.map((option) => option.id);
      expect(new Set(optionIds).size).toBe(optionIds.length);
      for (const option of event.options) {
        // 要么是稳的效果，要么是赌注，不能两头都空
        expect(Boolean(option.effects) || Boolean(option.risk)).toBe(true);
        if (option.risk) {
          expect(option.risk.chance).toBeGreaterThan(0);
          expect(option.risk.chance).toBeLessThan(1);
        }
      }
    }
  });

  it('条件生效：新人开局撞不上「有人红了才会来」的事', () => {
    const early = eligibleEvents(rookie, [], 0).map((event) => event.id);
    expect(early).not.toContain('watcher');
    expect(early).not.toContain('tabloid');
    expect(early).not.toContain('tvOffer');
    expect(early).not.toContain('memeClip');
    // 知名度、运气拉满之后这些事都会解锁
    const late = eligibleEvents(maxed, ['bigAgency', 'idol'], 7).map((event) => event.id);
    for (const id of ['watcher', 'tabloid', 'tvOffer', 'memeClip', 'newManager', 'unitClash']) {
      expect(late).toContain(id);
    }
  });

  it('概率为 0 时永远不插事件，为 1 时必插（且不重复）', () => {
    expect(rollEvent(maxed, [], 7, [], () => 1)).toBeNull();
    const used: string[] = [];
    for (let index = 0; index < LIFE_EVENTS.length; index += 1) {
      const event = rollEvent(maxed, [], 7, used, () => 0);
      if (!event) break;
      used.push(event.id);
      expect(used.filter((id) => id === event.id)).toHaveLength(1);
    }
    // 上限生效：抽满 LIFE_MAX_EVENTS 次之后就不再插了
    expect(rollEvent(maxed, [], 7, used.slice(0, LIFE_MAX_EVENTS), () => 0)).toBeNull();
  });

  it('事件概率在合理区间', () => {
    expect(LIFE_EVENT_CHANCE).toBeGreaterThan(0.2);
    expect(LIFE_EVENT_CHANCE).toBeLessThan(0.7);
  });

  it('赌注按概率走两个分支，稳的选项没有成败', () => {
    const gamble = LIFE_EVENTS.flatMap((event) => event.options).find((option) => option.risk)!;
    expect(resolveEventOption(gamble, () => 0).ok).toBe(true);
    expect(resolveEventOption(gamble, () => 0.99).ok).toBe(false);
    expect(resolveEventOption(gamble, () => 0).effects).toEqual(gamble.risk!.success);
    expect(resolveEventOption(gamble, () => 0.99).effects).toEqual(gamble.risk!.failure);

    const steady = LIFE_EVENTS.flatMap((event) => event.options).find((option) => !option.risk)!;
    expect(resolveEventOption(steady, () => 0).ok).toBeNull();
  });

  it('整局模拟：一定有结局、事件不重复、最多 LIFE_MAX_EVENTS 件', () => {
    const run = simulateLife(() => 0.5);
    expect(run.log.filter((entry) => entry.kind === 'stage')).toHaveLength(run.picks.length);
    expect(run.picks.length).toBeGreaterThanOrEqual(12);
    const events = run.log.filter((entry) => entry.kind === 'event');
    expect(events.length).toBeLessThanOrEqual(LIFE_MAX_EVENTS);
    expect(new Set(events.map((entry) => entry.ref)).size).toBe(events.length);
    expect(LIFE_ENDINGS).toContain(run.ending);
    // 大事记的知名度是单调记录，能直接画成人生曲线
    for (const key of LIFE_STAT_KEYS) {
      expect(run.stats[key]).toBeGreaterThanOrEqual(0);
      expect(run.stats[key]).toBeLessThanOrEqual(LIFE_MAX);
    }
  });

  it('综艺 / 直播 / 传说三条线只能靠事件解锁', () => {
    const tv = LIFE_EVENTS.find((event) => event.id === 'tvOffer')!;
    const accept = tv.options.find((option) => option.id === 'accept')!;
    const clip = LIFE_EVENTS.find((event) => event.id === 'memeClip')!;
    const lean = clip.options.find((option) => option.id === 'lean')!;
    expect(accept.tags).toContain('variety');
    expect(lean.tags).toContain('streamer');

    const stats = { ...LIFE_INITIAL_STATS, fame: 70, stamina: 60, skill: 70 };
    expect(endingOf(applyEffects(stats, accept.effects ?? {}), ['variety']).id).toBe('variety');
    expect(endingOf(applyEffects(stats, lean.effects ?? {}), ['streamer']).id).toBe('streamer');
    // 传说要求接近全满，且体力不能垮
    expect(endingOf({ ...stats, skill: 95, fame: 95 }, []).id).toBe('legend');
    expect(endingOf({ ...stats, skill: 95, fame: 95, stamina: 10 }, []).id).toBe('burnout');
  });

  it('固定策略跑一批：事件真的把结局拉开了', () => {
    let state = 987654321;
    const rng = () => {
      state = (state * 1103515245 + 12345) % 2147483648;
      return state / 2147483648;
    };
    const seen = new Set<string>();
    for (let index = 0; index < 2000; index += 1) seen.add(simulateLife(rng).ending.id);

    expect(seen.size).toBeGreaterThanOrEqual(5);
    for (const id of seen) expect(LIFE_ENDINGS.some((ending) => ending.id === id)).toBe(true);
  });

  it('稀有度是「百分比 + 覆盖全部结局」的完整表', () => {
    const odds = endingOdds(4000);
    for (const ending of LIFE_ENDINGS) {
      expect(odds[ending.id]).toBeTypeOf('number');
      expect(odds[ending.id]).toBeGreaterThanOrEqual(0);
      expect(odds[ending.id]).toBeLessThanOrEqual(100);
    }
    // 常见档（兜底结局）应该明显比传说档常见
    expect(odds.unsung).toBeGreaterThan(odds.legend);
    // 抽 4000 局也应该把兜底结局跑到
    expect(odds.unsung + odds.workhorse + odds.freelance).toBeGreaterThan(0);
  });
});

describe('seiyuuLife 文案齐全（三语言）', () => {
  it('阶段、选项、突发事件、结局、门户入口都有三语文案', () => {
    for (const lang of LANGS) {
      const section = resources[lang].translation.seiyuuLife as unknown as {
        stages: Record<string, { title: string; options: Record<string, { label: string }> }>;
        events: Record<string, { title: string; desc: string; options: Record<string, string> }>;
        endings: Record<string, { name: string; desc: string; reason: string }>;
        stats: Record<string, string>;
        risk: Record<string, string>;
        timeline: string;
        odds: string;
      };
      const portal = resources[lang].translation.portal as unknown as { games: Record<string, string> };
      expect(typeof section.title).toBe('string');
      expect(typeof portal.games.seiyuuLife).toBe('string');
      expect(section.timeline.trim().length).toBeGreaterThan(0);
      expect(section.odds.trim().length).toBeGreaterThan(0);
      for (const key of ['chance', 'success', 'failure']) {
        expect(typeof section.risk[key], `${lang}.risk.${key}`).toBe('string');
      }
      for (const key of LIFE_STAT_KEYS) expect(typeof section.stats[key]).toBe('string');
      for (const stage of LIFE_NODES) {
        const copy = section.stages[stage.id];
        expect(copy, `${lang}.${stage.id}`).toBeTruthy();
        expect(copy.title.trim().length).toBeGreaterThan(0);
        for (const option of stage.options) {
          expect(typeof copy.options[option.id]?.label, `${lang}.${stage.id}.${option.id}`).toBe('string');
        }
      }
      for (const event of LIFE_EVENTS) {
        const copy = section.events[event.id];
        expect(copy, `${lang}.${event.id}`).toBeTruthy();
        expect(copy.title.trim().length, `${lang}.${event.id}.title`).toBeGreaterThan(0);
        expect(copy.desc.trim().length, `${lang}.${event.id}.desc`).toBeGreaterThan(0);
        for (const option of event.options) {
          expect(typeof copy.options[option.id], `${lang}.${event.id}.${option.id}`).toBe('string');
        }
      }
      for (const ending of LIFE_ENDINGS) {
        const copy = section.endings[ending.id];
        expect(copy, `${lang}.${ending.id}`).toBeTruthy();
        expect(copy.name.trim().length).toBeGreaterThan(0);
        expect(copy.desc.trim().length).toBeGreaterThan(0);
        expect(copy.reason.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('页面里写死的 i18n 键三语都有（含 common.*）', () => {
    const keys = extractI18nKeys(readSource('src/pages/SeiyuuLife.tsx'));
    expect(keys.length).toBeGreaterThan(10);
    for (const lang of LANGS) {
      const translation = resources[lang].translation as unknown as Record<string, unknown>;
      for (const key of keys) {
        // 动态拼接（`'a.b.' + x`）只会捕到前缀，校验它确实是一个对象
        const path = key.endsWith('.') ? key.slice(0, -1) : key;
        const node = path.split('.').reduce<unknown>((current, part) => {
          if (current && typeof current === 'object') {
            return (current as Record<string, unknown>)[part];
          }
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
});
