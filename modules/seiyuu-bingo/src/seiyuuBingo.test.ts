import { describe, expect, it } from 'vitest';
import { resources } from '../i18n/resources';
import {
  BINGO_BEHAVIORS,
  BINGO_CELLS,
  BINGO_FREE_INDEX,
  BINGO_FREE_KEY,
  BINGO_LINES,
  BINGO_RANKS,
  BINGO_SIZE,
  completedCells,
  completedLineIndices,
  countLines,
  createCard,
  rankOf,
} from './model/seiyuuBingo';

const SEEDS = [10001, 23456, 77777];
const LANGS = ['zh', 'en', 'ja'] as const;

function flatKeys(value: unknown, prefix = ''): string[] {
  if (value === null || typeof value !== 'object') return [prefix];
  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
    flatKeys(child, prefix ? `${prefix}.${key}` : key),
  );
}

describe('seiyuuBingo 抽卡', () => {
  it('每张卡 25 格、中心免费、其余不重复', () => {
    for (const seed of SEEDS) {
      const card = createCard(seed);
      expect(card).toHaveLength(BINGO_CELLS);
      expect(card[BINGO_FREE_INDEX]).toEqual({ key: BINGO_FREE_KEY, free: true });
      const keys = card.filter((cell) => !cell.free).map((cell) => cell.key);
      expect(keys).toHaveLength(BINGO_CELLS - 1);
      expect(new Set(keys).size).toBe(keys.length);
      for (const key of keys) expect(BINGO_BEHAVIORS).toContain(key);
    }
  });

  it('同一个 seed 抽到同一张卡', () => {
    expect(createCard(31415)).toEqual(createCard(31415));
  });

  it('池子比格子多，换卡有变化', () => {
    expect(BINGO_BEHAVIORS.length).toBeGreaterThan(BINGO_CELLS - 1);
    expect(new Set(BINGO_BEHAVIORS).size).toBe(BINGO_BEHAVIORS.length);
    expect(createCard(1)).not.toEqual(createCard(2));
  });
});

describe('seiyuuBingo 连线与称号', () => {
  const empty = () => Array.from({ length: BINGO_CELLS }, () => false);

  it('一共 12 条线（5 行 + 5 列 + 2 斜线）', () => {
    expect(BINGO_LINES).toHaveLength(12);
    for (const line of BINGO_LINES) expect(line).toHaveLength(BINGO_SIZE);
    const ids = BINGO_LINES.map((line) => [...line].sort((a, b) => a - b).join(','));
    expect(new Set(ids).size).toBe(12);
  });

  it('满盘连 12 条线，空格 0 条', () => {
    expect(countLines(empty())).toBe(0);
    expect(countLines(Array.from({ length: BINGO_CELLS }, () => true))).toBe(12);
  });

  it('只填满第一行只算 1 条线', () => {
    const checked = empty();
    for (const cell of BINGO_LINES[0]) checked[cell] = true;
    expect(countLines(checked)).toBe(1);
    expect(completedLineIndices(checked)).toEqual([0]);
  });

  it('穿心的对角线也算', () => {
    const checked = empty();
    for (const cell of BINGO_LINES[10]) checked[cell] = true;
    expect(countLines(checked)).toBe(1);
  });

  it('completedCells 只收「在完成线里的格子」', () => {
    const checked = empty();
    for (const cell of BINGO_LINES[0]) checked[cell] = true;
    checked[24] = true; // 孤独的一格，不属于任何线
    const cells = completedCells(checked);
    expect(cells.size).toBe(BINGO_SIZE);
    for (const cell of BINGO_LINES[0]) expect(cells.has(cell)).toBe(true);
    expect(cells.has(24)).toBe(false);
  });

  it('称号按连线数阶梯递减，且 0 线也有称号', () => {
    expect(rankOf(0).id).toBe('passerby');
    expect(rankOf(2).id).toBe('beginner');
    expect(rankOf(4).id).toBe('regular');
    expect(rankOf(6).id).toBe('heavy');
    expect(rankOf(8).id).toBe('legend');
    expect(rankOf(10).id).toBe('complete');
    expect(rankOf(12).id).toBe('complete');
    // 门槛必须单调递减，否则会出现永远取不到的死档
    for (let index = 1; index < BINGO_RANKS.length; index += 1) {
      expect(BINGO_RANKS[index - 1].minLines).toBeGreaterThan(BINGO_RANKS[index].minLines);
    }
    expect(BINGO_RANKS[BINGO_RANKS.length - 1].minLines).toBe(0);
  });
});

describe('seiyuuBingo 文案齐全（三语言）', () => {
  it('三语都有 seiyuuBingo 段与门户入口描述', () => {
    for (const lang of LANGS) {
      const section = resources[lang].translation.seiyuuBingo as unknown as Record<string, unknown>;
      const portal = resources[lang].translation.portal as unknown as {
        games: Record<string, string>;
      };
      expect(typeof section.title).toBe('string');
      expect(typeof portal.games.seiyuuBingo).toBe('string');
    }
  });

  it('每个行为都有三语文案', () => {
    for (const lang of LANGS) {
      const section = resources[lang].translation.seiyuuBingo as unknown as {
        behaviors: Record<string, string>;
        pickTitle: string;
        pickAll: string;
        actions: Record<string, string>;
      };
      for (const id of BINGO_BEHAVIORS) {
        expect(typeof section.behaviors[id]).toBe('string');
      }
      expect(section.pickTitle.trim().length).toBeGreaterThan(0);
      expect(section.pickAll.trim().length).toBeGreaterThan(0);
      expect(section.actions.changeSeiyuu.trim().length).toBeGreaterThan(0);
    }
  });

  it('每档称号都有三语的名称与描述', () => {
    for (const lang of LANGS) {
      const section = resources[lang].translation.seiyuuBingo as unknown as {
        ranks: Record<string, { name: string; desc: string }>;
      };
      for (const rank of BINGO_RANKS) {
        expect(section.ranks[rank.id]?.name?.trim().length).toBeGreaterThan(0);
        expect(section.ranks[rank.id]?.desc?.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('三语键结构完全一致', () => {
    const [base, ...rest] = LANGS.map((lang) => flatKeys(resources[lang].translation.seiyuuBingo));
    for (const keys of rest) expect(keys).toEqual(base);
  });
});
