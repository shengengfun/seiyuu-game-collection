import { describe, expect, it } from 'vitest';
import { agencyOf, PROJECTS, SEIYUU_BY_ID, formatCharacter } from '@seiyuu/shared';
import { extractI18nKeys, readSource } from '../test/readSource';
import { resources } from '../i18n/resources';
import { FANDOM_IDS } from './fandom';
import {
  RESUME_DIFFICULTIES,
  RESUME_ERROR_FIELDS,
  RESUME_FIELD_IDS,
  RESUME_RULES,
  checkCard,
  gradeOf,
  makeCard,
  roundScore,
  type ResumeFieldId,
} from './seiyuuResume';

const LANGS = ['zh', 'en', 'ja'] as const;
const SEEDS = [10001, 22222, 33333, 45678, 56789, 67890];

describe('seiyuuResume 出卡', () => {
  it('五栏齐全，姓名永远是正确锚点', () => {
    for (const seed of SEEDS) {
      for (const difficulty of RESUME_DIFFICULTIES) {
        const card = makeCard(seed, difficulty);
        expect(card.fields.map((field) => field.id)).toEqual(RESUME_FIELD_IDS);
        expect(card.fields[0].wrong).toBe(false);
        expect(FANDOM_IDS).toContain(card.seiyuuId);
        // 事务所可以是空串（自由身），由页面翻译成「自由身」；其余栏目不能为空
        for (const field of card.fields) {
          if (field.id === 'agency') continue;
          expect(field.value.trim().length).toBeGreaterThan(0);
        }
      }
    }
  });

  it('埋错数量与难度一致，且只埋在可改的栏目上', () => {
    for (const seed of SEEDS) {
      for (const difficulty of RESUME_DIFFICULTIES) {
        const card = makeCard(seed, difficulty);
        const wrong = card.fields.filter((field) => field.wrong).map((field) => field.id);
        expect(wrong).toHaveLength(RESUME_RULES[difficulty].errors);
        expect(card.errors).toBe(wrong.length);
        for (const id of wrong) expect(RESUME_ERROR_FIELDS).toContain(id);
      }
    }
  });

  it('每个错项都真的和档案矛盾', () => {
    for (const seed of SEEDS) {
      for (const difficulty of RESUME_DIFFICULTIES) {
        const card = makeCard(seed, difficulty);
        const identity = SEIYUU_BY_ID.get(card.seiyuuId)!;
        const value = (id: ResumeFieldId) => card.fields.find((field) => field.id === id)!.value;

        if (card.fields.find((field) => field.id === 'agency')!.wrong) {
          expect(value('agency')).not.toBe(agencyOf(identity.id));
          expect(value('agency').length).toBeGreaterThan(0);
        }
        if (card.fields.find((field) => field.id === 'project')!.wrong) {
          const own = new Set<string>([identity.project, ...(identity.alsoIn ?? [])]);
          const wrongIds = Object.values(PROJECTS)
            .filter((project) => project.nameJa === value('project'))
            .map((project) => project.id);
          expect(wrongIds).toHaveLength(1);
          expect(own.has(wrongIds[0])).toBe(false);
        }
        if (card.fields.find((field) => field.id === 'role')!.wrong) {
          const own = identity.characters.map((character) => formatCharacter(character));
          expect(own).not.toContain(value('role'));
        }
        if (card.fields.find((field) => field.id === 'romaji')!.wrong) {
          expect(value('romaji')).not.toBe(identity.romaji);
        }
      }
    }
  });

  it('正确栏目的值就是档案里的原值', () => {
    for (const seed of SEEDS) {
      const card = makeCard(seed, 'hard');
      const identity = SEIYUU_BY_ID.get(card.seiyuuId)!;
      for (const field of card.fields) {
        if (field.wrong) continue;
        if (field.id === 'agency') expect(field.value).toBe(agencyOf(identity.id));
        if (field.id === 'project') expect(field.value).toBe(PROJECTS[identity.project].nameJa);
        if (field.id === 'role') expect(field.value).toBe(formatCharacter(identity.characters[0]));
        if (field.id === 'romaji') expect(field.value).toBe(identity.romaji);
      }
    }
  });

  it('同一个 seed 出同一张卡', () => {
    expect(makeCard(8888, 'normal')).toEqual(makeCard(8888, 'normal'));
  });
});

describe('seiyuuResume 判卷', () => {
  const card = makeCard(10001, 'hard');

  it('全对 / 漏掉 / 冤枉分别判对', () => {
    const wrong = card.fields.filter((field) => field.wrong).map((field) => field.id);
    expect(checkCard(card, wrong).perfect).toBe(true);
    expect(checkCard(card, wrong.slice(0, 1)).missed).toHaveLength(wrong.length - 1);
    const extra = card.fields.find((field) => !field.wrong)!.id;
    const verdict = checkCard(card, [...wrong, extra]);
    expect(verdict.perfect).toBe(false);
    expect(verdict.extra).toEqual([extra]);
  });

  it('全对的分数在 70~100，时间越足越高；乱选不给分', () => {
    const wrong = card.fields.filter((field) => field.wrong).map((field) => field.id);
    const fast = roundScore(checkCard(card, wrong), 60, 60);
    const slow = roundScore(checkCard(card, wrong), 6, 60);
    expect(fast).toBe(100);
    expect(slow).toBeGreaterThanOrEqual(70);
    expect(slow).toBeLessThan(fast);
    expect(roundScore(checkCard(card, []), 0, 60)).toBe(0);
    expect(roundScore(checkCard(card, ['name']), 0, 60)).toBe(0);
  });

  it('等级随正确率下降', () => {
    expect(gradeOf(500, 5)).toBe('S');
    expect(gradeOf(400, 5)).toBe('A');
    expect(gradeOf(300, 5)).toBe('B');
    expect(gradeOf(100, 5)).toBe('C');
  });
});

describe('seiyuuResume 文案齐全（三语言）', () => {
  it('栏目、难度、门户入口都有三语文案', () => {
    for (const lang of LANGS) {
      const section = resources[lang].translation.seiyuuResume as unknown as {
        fields: Record<string, string>;
        difficulties: Record<string, { name: string; desc: string }>;
        freelance: string;
      };
      const portal = resources[lang].translation.portal as unknown as { games: Record<string, string> };
      expect(typeof section.title).toBe('string');
      expect(typeof portal.games.seiyuuResume).toBe('string');
      expect(section.freelance.trim().length).toBeGreaterThan(0);
      for (const id of RESUME_FIELD_IDS) expect(typeof section.fields[id], `${lang}.${id}`).toBe('string');
      for (const difficulty of RESUME_DIFFICULTIES) {
        expect(typeof section.difficulties[difficulty]?.name, `${lang}.${difficulty}`).toBe('string');
        expect(section.difficulties[difficulty]?.desc.trim().length).toBeGreaterThan(0);
      }
      // 等级名与评语是拼出来的键（grades.<G> / result.comment.<G>）
      for (const grade of ['S', 'A', 'B', 'C']) {
        const grades = resources[lang].translation.seiyuuResume as unknown as {
          grades: Record<string, string>;
          result: { comment: Record<string, string> };
        };
        expect(typeof grades.grades[grade], `${lang}.grades.${grade}`).toBe('string');
        expect(grades.result.comment[grade]?.trim().length, `${lang}.comment.${grade}`).toBeGreaterThan(0);
      }
    }
  });

  it('页面里写死的 i18n 键三语都有（含 common.*）', () => {
    const keys = extractI18nKeys(readSource('src/pages/SeiyuuResume.tsx'));
    expect(keys.length).toBeGreaterThan(10);
    for (const lang of LANGS) {
      const translation = resources[lang].translation as unknown as Record<string, unknown>;
      for (const key of keys) {
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
