import { describe, expect, it } from 'vitest';
import { resources } from '../i18n/resources';
import {
  ALL_SEIYUU_IDS,
  INITIAL_LIVES,
  agencyNameOf,
  coStarsOf,
  identityOf,
  isCoStar,
  isSameAgency,
  isSameProject,
  pickQuestion,
  projectNameOf,
  relationOf,
  roleLineOf,
  sameAgencyPeersOf,
  sharedWorks,
  spiralLayout,
} from './model/seiyuuNetwork';

const LANGS = ['zh', 'en', 'ja'] as const;

/** 测试用的确定性随机源。 */
function rng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function flatKeys(value: unknown, prefix = ''): string[] {
  if (value === null || typeof value !== 'object') return [prefix];
  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
    flatKeys(child, prefix ? `${prefix}.${key}` : key),
  );
}

/** 共演关系最多的一批人，用作测试起点。 */
const RICH_START = ALL_SEIYUU_IDS.filter((id) => coStarsOf(id).length >= 8);

describe('seiyuuNetwork 关系数据', () => {
  it('共演是相互的，且共同作品非空', () => {
    expect(isCoStar('a', 'a')).toBe(false);
    const sample = ALL_SEIYUU_IDS.slice(0, 12);
    for (const left of sample) {
      for (const right of sample) {
        if (!isCoStar(left, right)) continue;
        expect(isCoStar(right, left)).toBe(true);
        expect(sharedWorks(left, right).length).toBeGreaterThan(0);
        expect(sharedWorks(left, right)).toEqual(sharedWorks(right, left));
      }
    }
  });

  it('有足够的起点可供出题', () => {
    expect(RICH_START.length).toBeGreaterThan(10);
  });

  it('relationOf 优先返回共演', () => {
    const source = RICH_START[0];
    const answer = coStarsOf(source)[0];
    expect(relationOf(source, answer)).toBe('coStar');
    expect(relationOf(source, source)).toBeNull();
  });

  it('同企划判定不吃自己', () => {
    expect(isSameProject('a', 'a')).toBe(false);
    const source = ALL_SEIYUU_IDS[0];
    expect(isSameProject(source, ALL_SEIYUU_IDS[1])).toBe(
      identityOf(source)?.project === identityOf(ALL_SEIYUU_IDS[1])?.project,
    );
  });

  it('同事务所是相互的，且没收录的人不算同事务所', () => {
    expect(isSameAgency('a', 'a')).toBe(false);
    const withAgency = ALL_SEIYUU_IDS.filter((id) => agencyNameOf(id));
    expect(withAgency.length).toBeGreaterThan(80);

    let pairs = 0;
    for (const left of withAgency.slice(0, 40)) {
      for (const right of withAgency.slice(0, 40)) {
        if (!isSameAgency(left, right)) continue;
        expect(isSameAgency(right, left)).toBe(true);
        expect(agencyNameOf(left)).toBe(agencyNameOf(right));
        pairs += 1;
      }
    }
    expect(pairs).toBeGreaterThan(0);

    const free = ALL_SEIYUU_IDS.filter((id) => !agencyNameOf(id));
    expect(free.length).toBeGreaterThan(0);
    // 自由身/未收录的人不应该和任何人“同事务所”
    for (const id of free) {
      expect(sameAgencyPeersOf(id)).toEqual([]);
      expect(isSameAgency(id, withAgency[0])).toBe(false);
    }
  });

  it('同事务所伙伴名单里没有自己', () => {
    for (const id of ALL_SEIYUU_IDS) {
      expect(sameAgencyPeersOf(id)).not.toContain(id);
    }
  });

  it('relationOf 优先返回共演，其次是同事务所', () => {
    const source = ALL_SEIYUU_IDS.find((id) => sameAgencyPeersOf(id).length >= 2)!;
    const peer = sameAgencyPeersOf(source)[0];
    if (!isCoStar(source, peer)) {
      expect(relationOf(source, peer)).toBe('sameAgency');
    }
  });

  it('档案与展示文本可用', () => {
    const source = RICH_START[0];
    expect(identityOf(source)?.name).toBeTruthy();
    expect(projectNameOf(source).length).toBeGreaterThan(0);
    expect(roleLineOf(source).length).toBeGreaterThan(0);
    expect(projectNameOf('nobody')).toBe('');
  });

  it('初始生命为 3', () => {
    expect(INITIAL_LIVES).toBe(3);
  });
});

describe('seiyuuNetwork 出题', () => {
  it('选项 4 个、含答案、不重复、且不含出题人自己', () => {
    const random = rng(20260930);
    let network = [RICH_START[0]];
    for (let round = 0; round < 20; round += 1) {
      const question = pickQuestion(network, random);
      if (!question) break;
      expect(question.options).toHaveLength(4);
      expect(new Set(question.options).size).toBe(4);
      expect(question.options).toContain(question.answerId);
      expect(question.options).not.toContain(question.sourceId);
      expect(network).toContain(question.sourceId);
      // 答案一定和出题人有关系
      expect(relationOf(question.sourceId, question.answerId)).not.toBeNull();
      if (question.kind === 'coStar') expect(question.works.length).toBeGreaterThan(0);
      network = [...network, question.answerId];
    }
    expect(network.length).toBeGreaterThan(5);
  });

  it('干扰项和出题人的关系符合题型规则', () => {
    for (let seed = 1; seed <= 30; seed += 1) {
      const random = rng(seed);
      const network = [RICH_START[seed % RICH_START.length]];
      const question = pickQuestion(network, random);
      if (!question) continue;
      for (const option of question.options) {
        if (option === question.answerId) continue;
        // 任何题型的干扰项都不能是共演关系，否则“选它也算对”
        expect(isCoStar(question.sourceId, option)).toBe(false);
        // 共演题故意用「同事务所 / 同企划但没共演」的人做诱饵，其余题型必须完全无关
        if (question.kind !== 'coStar') {
          expect(isSameAgency(question.sourceId, option)).toBe(false);
          expect(isSameProject(question.sourceId, option)).toBe(false);
        }
      }
    }
  });

  it('三种题型都会出场（不会被共演挤掉）', () => {
    const counts = { coStar: 0, sameAgency: 0, sameProject: 0 };
    for (let seed = 1; seed <= 12; seed += 1) {
      const random = rng(seed);
      let network = [RICH_START[seed % RICH_START.length]];
      for (let round = 0; round < 30; round += 1) {
        const question = pickQuestion(network, random);
        if (!question) break;
        counts[question.kind] += 1;
        network = [...network, question.answerId];
      }
    }
    expect(counts.coStar).toBeGreaterThan(0);
    expect(counts.sameAgency).toBeGreaterThan(0);
    expect(counts.sameProject).toBeGreaterThan(0);
  });

  it('同事务所题型的答案与素材自洽', () => {
    let seen = 0;
    for (let seed = 1; seed <= 60 && seen < 3; seed += 1) {
      const random = rng(seed);
      let network = [RICH_START[seed % RICH_START.length]];
      for (let round = 0; round < 12; round += 1) {
        const question = pickQuestion(network, random);
        if (!question) break;
        if (question.kind === 'sameAgency') {
          expect(isSameAgency(question.sourceId, question.answerId)).toBe(true);
          expect(question.agency).toBe(agencyNameOf(question.answerId));
          expect(question.agency.length).toBeGreaterThan(0);
          seen += 1;
        }
        network = [...network, question.answerId];
      }
    }
    expect(seen).toBeGreaterThan(0);
  });

  it('出过的答案不会被重复出题', () => {
    const random = rng(777);
    let network = [RICH_START[0]];
    const answers = new Set<string>();
    for (let round = 0; round < 12; round += 1) {
      const question = pickQuestion(network, random);
      if (!question) break;
      expect(answers.has(question.answerId)).toBe(false);
      expect(network).not.toContain(question.answerId);
      answers.add(question.answerId);
      network = [...network, question.answerId];
    }
  });

  it('网络里的所有人都出过题后返回 null', () => {
    // 单人网络 + 该人没有任何共演/同企划伙伴是构造不出来的，
    // 这里改为验证：把整份名册塞进网络后一定没有下一题。
    expect(pickQuestion(ALL_SEIYUU_IDS, rng(5))).toBeNull();
  });
});

describe('seiyuuNetwork 布局', () => {
  it('第一个节点在圆心，其余落在单位圆内', () => {
    const layout = spiralLayout(12);
    expect(layout).toHaveLength(12);
    expect(layout[0]).toEqual({ x: 0, y: 0 });
    for (const point of layout) {
      expect(Math.hypot(point.x, point.y)).toBeLessThanOrEqual(1);
    }
  });

  it('半径随下标单调不减，最外圈正好贴到边界', () => {
    const layout = spiralLayout(20);
    const radii = layout.map((point) => Math.hypot(point.x, point.y));
    expect(radii[0]).toBe(0);
    for (let index = 1; index < radii.length; index += 1) {
      expect(radii[index]).toBeGreaterThanOrEqual(radii[index - 1] - 1e-9);
    }
    expect(radii[radii.length - 1]).toBeCloseTo(1, 6);
  });
});

describe('seiyuuNetwork 文案齐全（三语言）', () => {
  it('三语都有 seiyuuNetwork 段与门户入口描述', () => {
    for (const lang of LANGS) {
      const section = resources[lang].translation.seiyuuNetwork as unknown as Record<string, unknown>;
      const portal = resources[lang].translation.portal as unknown as {
        games: Record<string, string>;
      };
      expect(typeof section.title).toBe('string');
      expect(typeof portal.games.seiyuuNetwork).toBe('string');
    }
  });

  it('三语键结构完全一致', () => {
    const [base, ...rest] = LANGS.map((lang) => flatKeys(resources[lang].translation.seiyuuNetwork));
    for (const keys of rest) expect(keys).toEqual(base);
  });
});
