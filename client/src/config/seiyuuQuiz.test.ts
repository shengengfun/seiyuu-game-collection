import { describe, expect, it } from 'vitest';
import {
  LEVEL_IDS,
  OPTION_LETTERS,
  QUIZ_ENTRIES,
  QUIZ_MODES,
  createRound,
  decodeQuizCode,
  decodeQuizRound,
  emptyAnswers,
  gradeOf,
  inspectBanks,
  questionText,
  quizEntryById,
  resultCodeOf,
  resultOf,
  scoreRound,
  type QuizMode,
} from './seiyuuQuiz';
import { SEIYUU_ROSTER } from '@seiyuu/shared';

describe('声优问答题库', () => {
  it('题库结构全部合法（选项、答案下标、解析、难度）', () => {
    const issues = inspectBanks();
    expect(issues.map((issue) => `${issue.bankId}/${issue.questionId}: ${issue.message}`)).toEqual([]);
  });

  it('每个题库都能在公共库名册里找到对应声优', () => {
    expect(QUIZ_ENTRIES.length).toBeGreaterThan(0);
    QUIZ_ENTRIES.forEach((entry) => {
      expect(SEIYUU_ROSTER.some((identity) => identity.id === entry.bank.id) || entry.easterEgg).toBe(
        true,
      );
      // 声优的公式照固定走 /seiyuu/<id>.jpg；彩蛋人物可以自带一张图。
      expect(entry.photo.length).toBeGreaterThan(0);
      if (!entry.easterEgg) expect(entry.photo).toBe(`/seiyuu/${entry.bank.id}.jpg`);
      expect(entry.identity.name.length).toBeGreaterThan(0);
      expect(entry.character.length).toBeGreaterThan(0);
    });
    const ids = QUIZ_ENTRIES.map((entry) => entry.bank.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('彩蛋人物不进公共库名册，但能被正常抽到', () => {
    const egg = quizEntryById('wjq-machine');
    expect(egg, '缺少玩机器Machine 的题库').toBeTruthy();
    expect(egg?.easterEgg).toBe(true);
    // 关键：不能混进 @seiyuu/shared，否则会污染「你和哪位女声优像」的特质与公式照
    expect(SEIYUU_ROSTER.some((identity) => identity.id === 'wjq-machine')).toBe(false);
    expect(egg?.identity.name).toBe('玩机器Machine');
    // 题库会持续变长（目标 48 题），这里只卡下限
    expect(egg?.bank.questions.length).toBeGreaterThanOrEqual(12);
    expect(egg?.bank.questions.every((question) => question.explain.length > 0)).toBe(true);
    // 彩蛋排在名册之后
    expect(QUIZ_ENTRIES[QUIZ_ENTRIES.length - 1].bank.id).toBe('wjq-machine');
  });

  it('虹咲 13 人都有题库（每人至少 12 题）', () => {
    const nijigasaki = [
      'ohnishi-aguri',
      'sagara-mayu',
      'maeda-kaori',
      'kubota-miyu',
      'murakami-natsumi',
      'kito-akari',
      'kusunoki-tomoyo',
      'sashide-maria',
      'tanaka-chiemi',
      'koizumi-moeka',
      'uchida-shuu',
      'houmoto-akina',
      'yano-hinaki',
    ];
    nijigasaki.forEach((id) => {
      const entry = quizEntryById(id);
      expect(entry, `缺少 ${id} 的题库`).toBeTruthy();
      // 手写题 12 题起步，自动派生题会继续往上加，所以只卡下限
      expect(entry?.bank.questions.length, `${id} 的题库太少`).toBeGreaterThanOrEqual(12);
    });
  });

  it('每套题库难度分布健康、答案位置不集中', () => {
    QUIZ_ENTRIES.forEach((entry) => {
      const levels = entry.bank.questions.map((question) => question.level);
      LEVEL_IDS.forEach((level) => {
        expect(levels.filter((item) => item === level).length, `${entry.bank.id} 缺少 ${level} 题`).toBeGreaterThan(0);
      });
      // 正确项不能全落在同一个位置
      const answers = new Set(entry.bank.questions.map((question) => question.answer));
      expect(answers.size, `${entry.bank.id} 的正确答案位置过于集中`).toBeGreaterThan(1);
    });
  });
});

describe('抽题与计分', () => {
  const entry = QUIZ_ENTRIES[0];

  it('快速模式抽固定题数，同种子同题目', () => {
    const first = createRound(entry.bank, 12345, 'fast');
    const second = createRound(entry.bank, 12345, 'fast');
    expect(first.questions.map((question) => question.id)).toEqual(
      second.questions.map((question) => question.id),
    );
    expect(first.questions.length).toBe(Math.min(QUIZ_MODES.fast.pick ?? 0, entry.bank.questions.length));
    expect(new Set(first.questions.map((question) => question.id)).size).toBe(first.questions.length);
  });

  it('完整版给出全部题目且保持作者顺序', () => {
    const round = createRound(entry.bank, 1, 'full');
    expect(round.questions.map((question) => question.id)).toEqual(
      entry.bank.questions.map((question) => question.id),
    );
  });

  it('全对得满分，未作答计为错', () => {
    const round = createRound(entry.bank, 999, 'full');
    const perfect = emptyAnswers(round);
    round.questions.forEach((question) => {
      perfect[question.id] = question.answer;
    });
    const perfectStats = scoreRound(round, perfect, 60000);
    expect(perfectStats.correct).toBe(perfectStats.total);
    expect(perfectStats.score).toBe(perfectStats.maxScore);
    expect(perfectStats.accuracy).toBe(1);
    expect(gradeOf(perfectStats.accuracy)).toBe('S');

    const blank = scoreRound(round, emptyAnswers(round));
    expect(blank.correct).toBe(0);
    expect(blank.skipped).toBe(blank.total);
    expect(blank.accuracy).toBe(0);
    expect(gradeOf(blank.accuracy)).toBe('D');
  });

  it('错题会带上解析与作答记录', () => {
    const round = createRound(entry.bank, 42, 'full');
    const answers = emptyAnswers(round);
    // 故意全部选一个错的选项
    round.questions.forEach((question) => {
      answers[question.id] = (question.answer + 1) % question.options.length;
    });
    const result = resultOf(round, answers, 1000);
    expect(result.missed.length).toBe(round.questions.length);
    result.missed.forEach((item) => {
      expect(item.question.explain.length).toBeGreaterThan(0);
      expect(item.picked).not.toBe(item.question.answer);
    });
  });

  it('等级门槛单调递减', () => {
    expect(gradeOf(1)).toBe('S');
    expect(gradeOf(0.9)).toBe('A');
    expect(gradeOf(0.75)).toBe('B');
    expect(gradeOf(0.6)).toBe('C');
    expect(gradeOf(0.2)).toBe('D');
  });
});

describe('成绩码', () => {
  const entry = QUIZ_ENTRIES[1];

  it('编码后能还原模式、题目、答案与用时', () => {
    const modes: QuizMode[] = ['fast', 'full'];
    modes.forEach((mode) => {
      const round = createRound(entry.bank, 24680, mode);
      const answers = emptyAnswers(round);
      round.questions.forEach((question, index) => {
        // 留一题不答，验证跳过位能还原
        if (index !== 0) {
          answers[question.id] = index % question.options.length;
        }
      });
      const code = resultCodeOf(round, answers, 83000);
      const decoded = decodeQuizRound(code);
      expect(decoded).toBeTruthy();
      expect(decoded?.entry.bank.id).toBe(entry.bank.id);
      expect(decoded?.round.mode).toBe(mode);
      expect(decoded?.round.questions.map((question) => question.id)).toEqual(
        round.questions.map((question) => question.id),
      );
      expect(decoded?.duration).toBe(83000);
      round.questions.forEach((question) => {
        expect(decoded?.answers[question.id]).toBe(answers[question.id]);
      });
    });
  });

  it('非法或陌生题库的成绩码返回 null', () => {
    expect(decodeQuizCode('随便写的')).toBeNull();
    expect(decodeQuizCode('Q|F|not-a-bank|1|1|1')).toBeNull();
    const code = resultCodeOf(createRound(entry.bank, 1, 'fast'), emptyAnswers(createRound(entry.bank, 1, 'fast')), 0);
    expect(decodeQuizCode(code)).toBeTruthy();
  });
});

describe('题库文案与回退', () => {
  it('中文以外没有覆盖时回退中文', () => {
    const question = QUIZ_ENTRIES[0].bank.questions[0];
    const zh = questionText(question, 'zh-CN');
    const en = questionText(question, 'en');
    const ja = questionText(question, 'ja');
    expect(zh).toEqual({ prompt: question.prompt, options: question.options, explain: question.explain });
    expect(en).toEqual(zh);
    expect(ja).toEqual(zh);
  });

  it('选项字母表覆盖最多四个选项', () => {
    expect(OPTION_LETTERS.length).toBe(4);
    QUIZ_ENTRIES.forEach((entry) => {
      entry.bank.questions.forEach((question) => {
        expect(question.options.length).toBeLessThanOrEqual(OPTION_LETTERS.length);
      });
    });
  });
});
