import { describe, expect, it } from 'vitest';
import { SEIYUU_ROSTER } from '@seiyuu/shared';
import { resources } from '../i18n/resources';
import { FANDOM_IDS, FANDOM_PROJECT_IDS } from '@seiyuu/game-sdk';
import {
  LIKE_YOU_IDS,
  LIKE_YOU_TARGET,
  createDeck,
  nextRound,
  resolveRound,
} from './model/likeYou';

const LANGS = ['zh', 'en', 'ja'] as const;

function flatKeys(value: unknown, prefix = ''): string[] {
  if (value === null || typeof value !== 'object') return [prefix];
  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
    flatKeys(child, prefix ? `${prefix}.${key}` : key),
  );
}

describe('likeYou 候选范围', () => {
  it('覆盖全部八个企划（含 D4DJ）', () => {
    expect(LIKE_YOU_IDS).toEqual(FANDOM_IDS);
    expect(FANDOM_PROJECT_IDS).toContain('d4dj');
    expect(FANDOM_PROJECT_IDS).toHaveLength(8);
    expect(LIKE_YOU_IDS.length).toBeGreaterThanOrEqual(100);
  });

  it('每个企划的人都进得来，D4DJ 也在', () => {
    const d4dj = SEIYUU_ROSTER.filter((item) => item.project === 'd4dj').map((item) => item.id);
    expect(d4dj.length).toBeGreaterThan(0);
    for (const id of d4dj) expect(LIKE_YOU_IDS).toContain(id);

    for (const project of FANDOM_PROJECT_IDS) {
      const members = SEIYUU_ROSTER.filter((item) => item.project === project);
      expect(members.length).toBeGreaterThan(0);
      expect(members.some((item) => LIKE_YOU_IDS.includes(item.id))).toBe(true);
    }
  });

  it('发牌不重不漏，同一个 seed 结果一致', () => {
    const deck = createDeck(2026);
    expect(deck).toHaveLength(LIKE_YOU_IDS.length);
    expect(new Set(deck).size).toBe(deck.length);
    expect(createDeck(2026)).toEqual(deck);
  });
});

describe('likeYou 九轮赛制', () => {
  it('每轮两位新人，选中的入席、另一位出局', () => {
    const deck = createDeck(1234);
    const round = nextRound(deck, []);
    expect(round).not.toBeNull();
    const [left, right] = round!.pair;
    expect(left).not.toBe(right);
    expect(deck).toContain(left);
    expect(deck).toContain(right);

    const outcome = resolveRound(round!, [], left);
    expect(outcome.board).toEqual([left]);
    expect(outcome.eliminated).toBe(right);
    expect(outcome.winner).toBe(left);
  });

  it('席位满了、人不够都出不了题', () => {
    expect(nextRound(LIKE_YOU_IDS, LIKE_YOU_IDS.slice(0, LIKE_YOU_TARGET))).toBeNull();
    expect(nextRound([], [])).toBeNull();
    expect(nextRound(['only-one'], [])).toBeNull();
  });

  it('正好 9 轮，共 18 人出场，名单不重复', () => {
    const deck = createDeck(777);
    const deckSize = deck.length;
    let roster = deck;
    let board: string[] = [];
    let rounds = 0;
    for (;;) {
      const round = nextRound(roster, board);
      if (!round) break;
      const outcome = resolveRound(round, board, round.pair[0]);
      board = outcome.board;
      roster = roster.filter((id) => !round.pair.includes(id));
      rounds += 1;
      expect(new Set(board).size).toBe(board.length);
      expect(board.length).toBeLessThanOrEqual(LIKE_YOU_TARGET);
    }
    expect(rounds).toBe(LIKE_YOU_TARGET);
    expect(board).toHaveLength(LIKE_YOU_TARGET);
    expect(deckSize - roster.length).toBe(LIKE_YOU_TARGET * 2);
  });
});

describe('likeYou 文案齐全（三语言）', () => {
  it('三语都有 likeYou 段与门户入口描述', () => {
    for (const lang of LANGS) {
      const section = resources[lang].translation.likeYou as unknown as Record<string, unknown>;
      const portal = resources[lang].translation.portal as unknown as {
        games: Record<string, string>;
      };
      expect(typeof section.title).toBe('string');
      expect(typeof portal.games.likeYou).toBe('string');
    }
  });

  it('三语键结构完全一致', () => {
    const [base, ...rest] = LANGS.map((lang) => flatKeys(resources[lang].translation.likeYou));
    for (const keys of rest) expect(keys).toEqual(base);
  });
});
