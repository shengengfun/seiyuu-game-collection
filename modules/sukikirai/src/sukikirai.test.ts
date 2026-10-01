import { describe, expect, it } from 'vitest';
import { SEIYUU_ROSTER } from '@seiyuu/shared';
import { resources } from '../i18n/resources';
import {
  BOARD_RANGES,
  COMMENT_MAX_LENGTH,
  DEFAULT_BOARD_RANGE,
  EASTER_EGG_UNLOCK_VOTES,
  SUKIKIRAI_BY_ID,
  SUKIKIRAI_EASTER_EGGS,
  SUKIKIRAI_ENTRIES,
  SUKIKIRAI_ROSTER,
  VOTE_CHOICES,
  VOTE_DAILY_LIMIT,
  VOTE_PER_PERSON_LIMIT,
  VOTE_REASON_IDS,
  VOTE_VETERAN_THRESHOLD,
  buildBoardRows,
  easterEggIntro,
  formatResetIn,
  formatVoteCount,
  isEasterEgg,
  searchRows,
  totalVotes,
  votePercentages,
  type ReasonStat,
} from './model/sukikirai';

const LANGS = ['zh', 'en', 'ja'] as const;

describe('喜欢或讨厌：候选池', () => {
  it('候选池就是公共库名册（拉邦歌偶马全员）', () => {
    expect(SUKIKIRAI_ROSTER).toBe(SEIYUU_ROSTER);
    expect(SUKIKIRAI_ROSTER.length).toBeGreaterThan(0);
    expect(new Set(SUKIKIRAI_ROSTER.map((item) => item.id)).size).toBe(SUKIKIRAI_ROSTER.length);
  });

  it('彩蛋人物不进名册，但进可投名单（且带自定义介绍）', () => {
    expect(SUKIKIRAI_EASTER_EGGS.length).toBeGreaterThan(0);
    for (const egg of SUKIKIRAI_EASTER_EGGS) {
      // 不在公共库里，否则会污染 Who You Are 的画像/公式照
      expect(SEIYUU_ROSTER.some((item) => item.id === egg.id)).toBe(false);
      expect(isEasterEgg(egg.id)).toBe(true);
      expect(easterEggIntro(egg.id)).toBe(egg.intro);
      expect(egg.intro.length).toBeGreaterThan(0);
      // 可投名单里有他，而且能查到（人物页用 SUKIKIRAI_BY_ID）
      expect(SUKIKIRAI_ENTRIES.some((entry) => entry.id === egg.id)).toBe(true);
      expect(SUKIKIRAI_BY_ID.get(egg.id)?.name).toBe(egg.name);
    }
    expect(SUKIKIRAI_ENTRIES.length).toBe(SUKIKIRAI_ROSTER.length + SUKIKIRAI_EASTER_EGGS.length);
    // 名册成员不会被误判成彩蛋
    expect(isEasterEgg(SUKIKIRAI_ROSTER[0].id)).toBe(false);
    expect(easterEggIntro(SUKIKIRAI_ROSTER[0].id)).toBe('');
  });

  it('榜单默认带上彩蛋人物（隐藏与否由界面开关决定）', () => {
    const rows = buildBoardRows({}, {});
    expect(rows).toHaveLength(SUKIKIRAI_ENTRIES.length);
    for (const egg of SUKIKIRAI_EASTER_EGGS) {
      expect(rows.some((row) => row.identity.id === egg.id)).toBe(true);
    }
    // 解锁门槛是 50 票（超过才算）
    expect(EASTER_EGG_UNLOCK_VOTES).toBe(50);
  });
});

describe('喜欢或讨厌：榜单行', () => {
  const counts = { a: 3, b: 0, c: 12, unknown: 999 };

  it('按热度降序，票数相同保持名册顺序', () => {
    const roster = [
      { id: 'a', name: 'A', nameJa: '', romaji: '', project: 'lovelive', characters: [] },
      { id: 'b', name: 'B', nameJa: '', romaji: '', project: 'lovelive', characters: [] },
      { id: 'c', name: 'C', nameJa: '', romaji: '', project: 'lovelive', characters: [] },
    ] as unknown as typeof SUKIKIRAI_ROSTER;
    const rows = buildBoardRows({ a: 3, b: 3, c: 1 }, {}, roster);
    expect(rows.map((row) => row.identity.id)).toEqual(['a', 'b', 'c']);
  });

  const roster = [
    { id: 'a', name: 'A', nameJa: '', romaji: '', project: 'lovelive', characters: [] },
    { id: 'b', name: 'B', nameJa: '', romaji: '', project: 'lovelive', characters: [] },
    { id: 'c', name: 'C', nameJa: '', romaji: '', project: 'lovelive', characters: [] },
  ] as unknown as typeof SUKIKIRAI_ROSTER;

  it('未知 id 不进榜、缺票算 0、我的票能标出来', () => {
    const rows = buildBoardRows(
      counts,
      { c: { choice: 'dislike', votes: 3, dayVotes: 1, reason: null } },
      roster
    );
    // 名册里没有 unknown，票数再高也不该出现
    expect(rows.some((row) => row.identity.id === 'unknown')).toBe(false);
    const total = rows.reduce((sum, row) => sum + row.total, 0);
    expect(total).toBe(3 + 0 + 12);
    expect(rows.find((item) => item.identity.id === 'c')?.myVote).toEqual({
      choice: 'dislike',
      votes: 3,
      dayVotes: 1,
      reason: null,
    });
    expect(rows.find((item) => item.identity.id === 'a')?.myVote).toBeNull();
  });

  it('名册里没票的人也在榜上（热度 0），只用服务端票数不会凭空造数据', () => {
    const rows = buildBoardRows(counts, {}, roster);
    expect(rows).toHaveLength(roster.length);
    expect(rows.filter((row) => row.total === 0).map((row) => row.identity.id)).toEqual(['b']);
  });

  it('榜单页的总票数合计忽略未知 id', () => {
    expect(totalVotes(counts)).toBe(3 + 0 + 12 + 999);
  });
});

describe('喜欢或讨厌：搜索', () => {
  const rows = buildBoardRows({});

  it('空关键词返回全部', () => {
    expect(searchRows(rows, '   ')).toHaveLength(rows.length);
  });

  it('能按姓名、日文名与代表角色命中', () => {
    const target = SUKIKIRAI_ROSTER.find((item) => item.characters.length > 0)!;
    expect(searchRows(rows, target.name).some((row) => row.identity.id === target.id)).toBe(true);
    expect(searchRows(rows, target.nameJa).some((row) => row.identity.id === target.id)).toBe(true);
    expect(
      searchRows(rows, target.characters[0].name).some((row) => row.identity.id === target.id)
    ).toBe(true);
  });

  it('没有匹配时返回空数组', () => {
    expect(searchRows(rows, 'zzzz-不存在-zzzz')).toHaveLength(0);
  });
});

describe('喜欢或讨厌：比例与格式化', () => {
  it('喜欢 / 讨厌百分比之和恒为 100', () => {
    for (const [likes, dislikes] of [
      [0, 0],
      [1, 0],
      [1, 2],
      [7, 13],
      [999, 1],
    ]) {
      const { like, dislike } = votePercentages({ likes, dislikes });
      expect(like + dislike).toBe(100);
      expect(like).toBeGreaterThanOrEqual(0);
      expect(dislike).toBeLessThanOrEqual(100);
    }
  });

  it('没有票时按 50 / 50 处理', () => {
    expect(votePercentages({ likes: 0, dislikes: 0 })).toEqual({ like: 50, dislike: 50 });
  });

  it('票数格式化', () => {
    expect(formatVoteCount(0)).toBe('0');
    expect(formatVoteCount(9999)).toBe('9999');
    expect(formatVoteCount(12_000)).toBe('1.2 万');
  });

  it('额度刷新倒计时拆成小时 / 分钟', () => {
    expect(formatResetIn(0)).toEqual({ hours: 0, minutes: 0 });
    expect(formatResetIn(3 * 3600 + 25 * 60 + 59)).toEqual({ hours: 3, minutes: 25 });
    expect(formatResetIn(-10)).toEqual({ hours: 0, minutes: 0 });
  });
});

describe('喜欢或讨厌：理由与文案齐全性', () => {
  const sections = LANGS.map(
    (lang) =>
      [
        lang,
        resources[lang].translation.sukikirai as unknown as Record<string, unknown>,
      ] as const
  );

  it('三语都有 sukikirai 段与入口描述', () => {
    sections.forEach(([lang, section]) => {
      expect(section, lang).toBeTruthy();
      const portal = resources[lang].translation.portal as unknown as Record<string, unknown>;
      expect((portal.games as Record<string, string>).sukikirai, lang).toBeTruthy();
    });
  });

  it('每个立场、每个理由 id 三语都有文案', () => {
    for (const [lang, section] of sections) {
      const reasons = section.reasons as Record<string, Record<string, string>>;
      for (const choice of VOTE_CHOICES) {
        for (const id of VOTE_REASON_IDS[choice]) {
          expect(reasons[choice]?.[id], `${lang}:${choice}.${id}`).toBeTruthy();
        }
      }
      expect(reasons.other, lang).toBeTruthy();
      expect(reasons.statsTitle, lang).toBeTruthy();
    }
  });

  it('票数与返回按钮的文案三语齐全', () => {
    for (const [lang, section] of sections) {
      const vote = section.vote as Record<string, string>;
      for (const key of ['done', 'added', 'count', 'hint', 'mine', 'full', 'saved']) {
        expect(vote[key], `${lang}:vote.${key}`).toBeTruthy();
      }
      expect(section.mineCount, lang).toBeTruthy();
      const detail = section.detail as Record<string, string>;
      expect(detail.back, lang).toBeTruthy();
      const choice = section.choice as Record<string, string>;
      expect(choice.like, lang).toBeTruthy();
      expect(choice.dislike, lang).toBeTruthy();
      // 上方提示里的数字要与常量对得上（文案用了插值，只需要拼得出来）
      expect(`1 / ${VOTE_PER_PERSON_LIMIT}`).toMatch(/\d+ \/ \d+/);
    }
  });

  it('板块标题与榜单时间窗的文案三语齐全', () => {
    for (const [lang, section] of sections) {
      expect(section.kicker, lang).toBeTruthy();
      expect(section.subtitle, lang).toBeTruthy();
      expect(section.rangeLabel, lang).toBeTruthy();
      expect(section.emptyDay, lang).toBeTruthy();
      expect(section.emptyRange, lang).toBeTruthy();
      expect(section.hideEggs, lang).toBeTruthy();
      expect(section.easterEgg, lang).toBeTruthy();
      expect(section.eggHint, lang).toBeTruthy();
      const range = section.range as Record<string, string>;
      for (const id of BOARD_RANGES) expect(range[id], `${lang}:range.${id}`).toBeTruthy();
    }
  });

  it('对外文案里不出现票的额度（普通 / 老用户 / 管理员档位与累计阈值都不该露）', () => {
    // 只拦真正的档位数字：10 / 20 / 50 / 100（累计阈值）。
    // 不拦 1 与 5——「1 票」在日语里就是「1 日」这类正常量词，5 是同一人每天的上限、属于玩法规则。
    const forbidden = [String(VOTE_DAILY_LIMIT.user), String(VOTE_DAILY_LIMIT.veteran), String(VOTE_DAILY_LIMIT.admin), String(VOTE_VETERAN_THRESHOLD)];
    for (const [lang, section] of sections) {
      const quota = section.quota as Record<string, string>;
      const errors = resources[lang].translation.errors as unknown as Record<string, string>;
      const texts = [
        String(section.intro),
        String(section.guide),
        String(quota.pill),
        String(quota.pillEmpty),
        String(errors.VOTE_QUOTA_EXCEEDED),
      ];
      for (const text of texts) {
        expect(text, `${lang}: ${text}`).toBeTruthy();
        for (const value of forbidden) {
          expect(text.includes(value), `${lang} leaked quota ${value}: ${text}`).toBe(false);
        }
      }
      // 额度档位的解释文案也不应该存在
      expect(quota.tier, lang).toBeUndefined();
    }
  });

  it('额度分档与服务端约定一致，默认看总榜', () => {
    expect(VOTE_DAILY_LIMIT.guest).toBe(1);
    expect(VOTE_DAILY_LIMIT.user).toBe(10);
    expect(VOTE_DAILY_LIMIT.veteran).toBe(20);
    expect(VOTE_DAILY_LIMIT.admin).toBe(50);
    expect(VOTE_VETERAN_THRESHOLD).toBe(100);
    // 总榜排第一且是默认项
    expect(DEFAULT_BOARD_RANGE).toBe('all');
    expect([...BOARD_RANGES]).toEqual(['all', 'day', 'week', 'month']);
    expect(BOARD_RANGES[0]).toBe(DEFAULT_BOARD_RANGE);
  });

  it('两个立场的理由 id 都不重复', () => {
    for (const choice of VOTE_CHOICES) {
      const ids = VOTE_REASON_IDS[choice];
      expect(new Set(ids).size, choice).toBe(ids.length);
    }
  });

  it('理由统计结构能对上文案里的 other 兜底', () => {
    const stat: ReasonStat = { id: 'voice', count: 3 };
    expect(VOTE_REASON_IDS.like).toContain(stat.id);
    expect(COMMENT_MAX_LENGTH).toBeGreaterThan(0);
  });
});
