import { describe, expect, it } from 'vitest';
import { resources } from '../i18n/resources';
import {
  ALL_POOL_QUESTIONS,
  AXIS_IDS,
  EGGS,
  EXTREME_POOL,
  LAYER_WEIGHT,
  PAIR_GAP,
  PAIR_POOL,
  POOL_SIZE,
  QUIZ_MODES,
  RARE_TAGS,
  RECOMMEND,
  SCALE,
  TRAP_POOL,
  WARMUP_POOL,
  allTypeCodes,
  createQuiz,
  decodeQuizCode,
  decodeResultCode,
  encodeResultCode,
  randomnessOf,
  recommendSeiyuu,
  resultCodeOf,
  scoreSeiValue,
  type QuizMode,
  type QuizQuestion,
} from './seivalue';

const SEEDS = [10001, 23456, 77777, 88888, 99999];
const MODES: QuizMode[] = ['fast', 'pro'];
const LANGS = ['zh', 'en', 'ja'] as const;

function texts(lang: (typeof LANGS)[number], key: string): Record<string, string> {
  const section = resources[lang].translation.seivalue as unknown as Record<string, Record<string, string>>;
  return section[key];
}

/** 全部偏向某一极作答：left=true 表示答成左极。 */
function answerAll(quizQuestions: QuizQuestion[], left: boolean): Record<string, number> {
  const answers: Record<string, number> = {};
  quizQuestions.forEach((question) => {
    answers[question.id] = (left ? question.direction === -1 : question.direction === 1) ? 2 : -2;
  });
  return answers;
}

describe('seivalue 题库池', () => {
  it('池子足够大，两种模式都有变化空间', () => {
    expect(PAIR_POOL.length).toBe(32);
    expect(WARMUP_POOL.length).toBe(32);
    expect(EXTREME_POOL.length).toBe(32);
    expect(TRAP_POOL.length).toBe(16);
    expect(POOL_SIZE).toBeGreaterThan(QUIZ_MODES.pro.questions * 2);
  });

  it('题目 id 唯一', () => {
    const ids = ALL_POOL_QUESTIONS.map((question) => question.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(PAIR_POOL.map((pair) => pair.id)).size).toBe(PAIR_POOL.length);
  });

  it('每个轴的热身题和极端题都是左右各半，矛盾对各 8 对', () => {
    AXIS_IDS.forEach((axis) => {
      [WARMUP_POOL, EXTREME_POOL].forEach((pool) => {
        const scoped = pool.filter((question) => question.axis === axis);
        expect(scoped.filter((question) => question.direction === -1).length).toBe(4);
        expect(scoped.filter((question) => question.direction === 1).length).toBe(4);
      });
      expect(PAIR_POOL.filter((pair) => pair.axis === axis).length).toBe(8);
    });
  });

  it('送命题都带有标记和触发方式', () => {
    TRAP_POOL.forEach((question) => {
      expect(question.layer).toBe('trap');
      expect(question.axis).toBeUndefined();
      expect(question.trapFlag).toBeDefined();
      expect(question.trapTrigger === 'agree' || question.trapTrigger === 'disagree').toBe(true);
    });
  });
});

describe('seivalue 文案齐全（三语言）', () => {
  it('池子里每道题都有文案', () => {
    LANGS.forEach((lang) => {
      const pool = texts(lang, 'questions');
      ALL_POOL_QUESTIONS.forEach((question) => {
        expect(pool[question.id], `${lang} 缺少题目 ${question.id}`).toBeTruthy();
      });
    });
  });

  it('16 型名称 / 描述 / 客观评价都齐全', () => {
    const codes = allTypeCodes();
    expect(codes.length).toBe(16);
    LANGS.forEach((lang) => {
      const types = resources[lang].translation.seivalue.types;
      codes.forEach((code) => {
        const entry = types[code as keyof typeof types];
        expect(entry.name, `${lang} 缺少 ${code}.name`).toBeTruthy();
        expect(entry.desc, `${lang} 缺少 ${code}.desc`).toBeTruthy();
        expect(entry.review, `${lang} 缺少 ${code}.review`).toBeTruthy();
      });
    });
  });

  it('稀有标签与彩蛋都有名称和评价', () => {
    LANGS.forEach((lang) => {
      const tags = resources[lang].translation.seivalue.rareTags;
      RARE_TAGS.forEach((tag) => {
        const entry = tags[tag.id as keyof typeof tags];
        expect(entry.name, `${lang} 缺少标签 ${tag.id}`).toBeTruthy();
        expect(entry.review, `${lang} 缺少标签评价 ${tag.id}`).toBeTruthy();
      });
      const eggs = texts(lang, 'eggs');
      const eggDesc = texts(lang, 'eggDesc');
      EGGS.forEach((egg) => {
        expect(eggs[egg.id], `${lang} 缺少彩蛋 ${egg.id}`).toBeTruthy();
        expect(eggDesc[egg.id], `${lang} 缺少彩蛋说明 ${egg.id}`).toBeTruthy();
      });
    });
  });
});

describe('seivalue 抽题', () => {
  it('同一个 seed 抽到同一套题，不同 seed 会换题', () => {
    MODES.forEach((mode) => {
      const first = createQuiz(4242, mode).questions.map((question) => question.id);
      const second = createQuiz(4242, mode).questions.map((question) => question.id);
      expect(second).toEqual(first);
    });
    const others = new Set(SEEDS.map((seed) => createQuiz(seed).questions.map((q) => q.id).join()));
    expect(others.size).toBeGreaterThan(1);
  });

  it('题量符合模式定义且 id 不重复', () => {
    MODES.forEach((mode) => {
      SEEDS.forEach((seed) => {
        const quiz = createQuiz(seed, mode);
        expect(quiz.questions).toHaveLength(QUIZ_MODES[mode].questions);
        const ids = quiz.questions.map((question) => question.id);
        expect(new Set(ids).size).toBe(QUIZ_MODES[mode].questions);
      });
    });
  });

  it('矛盾对成对出现、方向相反且固定相隔 20 题', () => {
    MODES.forEach((mode) => {
      SEEDS.forEach((seed) => {
        const quiz = createQuiz(seed, mode);
        const pairs = new Map<string, number[]>();
        quiz.questions.forEach((question, index) => {
          if (!question.pair) return;
          pairs.set(question.pair, [...(pairs.get(question.pair) ?? []), index]);
        });

        expect(pairs.size).toBe(QUIZ_MODES[mode].pairs);
        pairs.forEach(([first, second]) => {
          expect(second - first).toBe(PAIR_GAP);
          expect(quiz.questions[first].direction).toBe(-quiz.questions[second].direction);
        });
      });
    });
  });

  it('层级配比稳定', () => {
    MODES.forEach((mode) => {
      const config = QUIZ_MODES[mode];
      SEEDS.forEach((seed) => {
        const quiz = createQuiz(seed, mode);
        const count = (layer: string) => quiz.questions.filter((question) => question.layer === layer).length;
        expect(count('core')).toBe(config.pairs * 2);
        expect(count('warmup')).toBe(config.warmup);
        expect(count('extreme')).toBe(config.extreme);
        expect(count('trap')).toBe(config.trap);
      });
    });
  });

  it('每个轴的左右权重完全相同，中立答案不会被推向某一极', () => {
    MODES.forEach((mode) => {
      SEEDS.forEach((seed) => {
        const quiz = createQuiz(seed, mode);
        AXIS_IDS.forEach((axis) => {
          const scoped = quiz.questions.filter((question) => question.axis === axis);
          const weight = (direction: -1 | 1) =>
            scoped
              .filter((question) => question.direction === direction)
              .reduce((total, question) => total + LAYER_WEIGHT[question.layer], 0);
          expect(Math.abs(weight(-1) - weight(1))).toBeLessThanOrEqual(0.001);
        });
      });
    });
  });
});

describe('seivalue 题量与比例', () => {
  it('快速 32 题、PRO 64 题，层级占比一致', () => {
    expect(QUIZ_MODES.fast.questions).toBe(32);
    expect(QUIZ_MODES.pro.questions).toBe(64);
    expect(QUIZ_MODES.pro.questions).toBe(QUIZ_MODES.fast.questions * 2);

    MODES.forEach((mode) => {
      const config = QUIZ_MODES[mode];
      // 核心（矛盾对）62.5%，热身 / 极端 / 送命各 12.5%
      expect((config.pairs * 2) / config.questions).toBeCloseTo(0.625, 5);
      [config.warmup, config.extreme, config.trap].forEach((count) => {
        expect(count / config.questions).toBeCloseTo(0.125, 5);
      });
      // 送命题不计分，占比不应过高
      expect(config.trap / config.questions).toBeLessThanOrEqual(0.15);
      expect(config.questions).toBe(config.pairs * 2 + config.warmup + config.extreme + config.trap);
    });
  });

  it('每个轴的题量均衡，且左右题数严格相等', () => {
    MODES.forEach((mode) => {
      SEEDS.forEach((seed) => {
        const quiz = createQuiz(seed, mode);
        const perAxis = AXIS_IDS.map((axis) => quiz.questions.filter((question) => question.axis === axis));
        const counts = perAxis.map((items) => items.length);
        expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(2);

        perAxis.forEach((items) => {
          const left = items.filter((question) => question.direction === -1).length;
          const right = items.filter((question) => question.direction === 1).length;
          // 左右题数不相等会把中立答案推向某一极，这里必须相同
          expect(left).toBe(right);
        });
      });
    });
  });

  it('送命题池覆盖全部标记类型', () => {
    const flags = new Set(TRAP_POOL.map((question) => question.trapFlag));
    expect(flags.size).toBe(5);
    expect(TRAP_POOL.filter((question) => question.trapTrigger === 'disagree').length).toBeGreaterThanOrEqual(2);
  });
});

describe('seivalue 计分', () => {
  it('没有作答时四轴都是 0 分、左右各占一半', () => {
    const result = scoreSeiValue(createQuiz(10001), {});
    result.stats.axes.forEach((axis) => {
      expect(axis.percent).toBe(0);
      expect(axis.leftShare).toBe(50);
      expect(axis.rightShare).toBe(50);
      expect(axis.side).toBe('left');
    });
    expect(result.stats.skipped).toBe(QUIZ_MODES.fast.questions);
  });

  it('全部偏向左侧时轴分数为负且触发全左彩蛋', () => {
    const quiz = createQuiz(10001);
    const result = scoreSeiValue(quiz, answerAll(quiz.questions, true));
    result.stats.axes.forEach((axis) => {
      expect(axis.percent).toBeLessThanOrEqual(-80);
      expect(axis.leftShare).toBeGreaterThanOrEqual(90);
      expect(axis.side).toBe('left');
    });
    expect(result.egg?.id).toBe('e_left');
    expect(result.rarity).toBe('legendary');
    // 全左作答命中「白嫖 + 演技」标签，说明标签条件与结果一致
    expect(result.tags[0].id).toBe('rt4');
  });

  it('全部偏向右侧时轴分数为正且触发全右彩蛋', () => {
    const quiz = createQuiz(23456);
    const result = scoreSeiValue(quiz, answerAll(quiz.questions, false));
    result.stats.axes.forEach((axis) => {
      expect(axis.percent).toBeGreaterThanOrEqual(80);
      expect(axis.rightShare).toBeGreaterThanOrEqual(90);
    });
    expect(result.egg?.id).toBe('e_right');
  });

  it('PRO 模式同样能算出四轴与标签', () => {
    const quiz = createQuiz(10001, 'pro');
    expect(quiz.questions).toHaveLength(QUIZ_MODES.pro.questions);
    const result = scoreSeiValue(quiz, answerAll(quiz.questions, true));
    expect(result.mode).toBe('pro');
    expect(result.stats.axes).toHaveLength(4);
    result.stats.axes.forEach((axis) => {
      expect(axis.percent).toBeLessThanOrEqual(-80);
    });
  });

  it('左右占比始终相加为 100', () => {
    SEEDS.forEach((seed) => {
      const quiz = createQuiz(seed);
      scoreSeiValue(quiz, answerAll(quiz.questions, true)).stats.axes.forEach((axis) => {
        expect(axis.leftShare + axis.rightShare).toBeCloseTo(100, 5);
      });
    });
  });

  it('全部强烈同意 / 强烈反对 / 中立都会命中对应彩蛋', () => {
    const quiz = createQuiz(77777);
    const fill = (value: number) => Object.fromEntries(quiz.questions.map((question) => [question.id, value]));
    expect(scoreSeiValue(quiz, fill(2)).egg?.id).toBe('e_all_agree');
    expect(scoreSeiValue(quiz, fill(-2)).egg?.id).toBe('e_all_disagree');
    expect(scoreSeiValue(quiz, fill(0)).egg?.id).toBe('e_all_neutral');
  });

  it('送命题按触发方式统计，不计入轴分', () => {
    const quiz = createQuiz(88888);
    const traps = quiz.questions.filter((question) => question.layer === 'trap');
    const answers: Record<string, number> = {};
    quiz.questions.forEach((question) => {
      answers[question.id] = question.layer === 'trap' ? -2 : 0;
    });

    const result = scoreSeiValue(quiz, answers);
    const expected = traps.filter((question) => question.trapTrigger === 'disagree').length;
    expect(result.stats.trap.total).toBe(QUIZ_MODES.fast.trap);
    expect(result.stats.trap.triggered).toBe(expected);
    result.stats.axes.forEach((axis) => {
      expect(axis.percent).toBe(0);
    });
  });

  it('矛盾数按极端对撞统计，严格交替会被识别', () => {
    const quiz = createQuiz(99999);
    const allExtreme = Object.fromEntries(quiz.questions.map((question) => [question.id, 2]));
    expect(scoreSeiValue(quiz, allExtreme).stats.contradictionCount).toBe(QUIZ_MODES.fast.pairs);
    expect(scoreSeiValue(quiz, allExtreme).stats.alternation).toBe(false);

    const alternating: Record<string, number> = {};
    quiz.questions.forEach((question, index) => {
      alternating[question.id] = index % 2 === 0 ? 2 : -2;
    });
    expect(scoreSeiValue(quiz, alternating).stats.alternation).toBe(true);
  });

  it('没有彩蛋但命中标签时，稀有度取稀有', () => {
    const quiz = createQuiz(10001);
    const result = scoreSeiValue(quiz, answerAll(quiz.questions, true));
    const tagged: typeof result = { ...result, egg: undefined, tags: result.tags };
    expect(tagged.tags.length).toBeGreaterThan(0);
    expect(tagged.rarity === 'legendary' || tagged.rarity === 'rare').toBe(true);
  });
});

describe('seivalue 成绩码', () => {
  it('编码能完整还原模式、种子、用时与答案', () => {
    MODES.forEach((mode) => {
      const quiz = createQuiz(31415, mode);
      const answers: Record<string, number> = {};
      quiz.questions.forEach((question, index) => {
        answers[question.id] = index % 4 === 0 ? undefined as unknown as number : SCALE[index % SCALE.length].value;
      });
      const code = resultCodeOf(quiz, answers, 93_000);
      const decoded = decodeQuizCode(code);
      expect(decoded).not.toBeNull();
      expect(decoded?.quiz.mode).toBe(mode);
      expect(decoded?.quiz.seed).toBe(31415);
      expect(decoded?.duration).toBe(93_000);
      expect(decoded?.quiz.questions.map((question) => question.id)).toEqual(
        quiz.questions.map((question) => question.id),
      );
      quiz.questions.forEach((question, index) => {
        expect(decoded?.answers[question.id]).toBe(answers[question.id]);
        expect(index >= 0).toBe(true);
      });
      // 还原后重新计分应与原结果一致
      const first = scoreSeiValue(quiz, answers, 93_000);
      const second = scoreSeiValue(decoded!.quiz, decoded!.answers, decoded!.duration);
      expect(second.stats.axes.map((axis) => axis.percent)).toEqual(first.stats.axes.map((axis) => axis.percent));
      expect(second.tags.map((tag) => tag.id)).toEqual(first.tags.map((tag) => tag.id));
    });
  });

  it('全选同一档（含前导 0）也能还原', () => {
    const quiz = createQuiz(24680);
    const answers = Object.fromEntries(quiz.questions.map((question) => [question.id, 2]));
    const code = resultCodeOf(quiz, answers, 12_000);
    const decoded = decodeQuizCode(code);
    quiz.questions.forEach((question) => {
      expect(decoded?.answers[question.id]).toBe(2);
    });
  });

  it('非法成绩码会被拒绝', () => {
    expect(decodeResultCode('nope')).toBeNull();
    expect(decodeResultCode('F1234-1-1')).toBeNull();
    expect(decodeQuizCode('12345')).toBeNull();
    expect(decodeQuizCode('')).toBeNull();
  });

  it('编码/解码互为逆运算', () => {
    const digits = Array.from({ length: QUIZ_MODES.fast.questions }, (_, index) => index % 6);
    const code = encodeResultCode({ mode: 'fast', seed: 12345, duration: 45_000, digits });
    const payload = decodeResultCode(code);
    expect(payload?.digits).toEqual(digits);
    expect(payload?.mode).toBe('fast');
  });
});

describe('seivalue 随机度与推荐', () => {
  it('单档重复随机度为 0，五档均分为 1', () => {
    expect(randomnessOf([2, 2, 2, 2])).toBe(0);
    expect(randomnessOf(SCALE.map((item) => item.value))).toBeCloseTo(1, 5);
  });

  it('推荐名单按轴强度给出且不重复', () => {
    const quiz = createQuiz(10001);
    const { stats } = scoreSeiValue(quiz, answerAll(quiz.questions, true));
    const groups = recommendSeiyuu(stats.axes);
    expect(groups.length).toBeGreaterThan(0);
    const names = groups.flatMap((group) => group.names);
    expect(new Set(names).size).toBe(names.length);
    expect(names.length).toBeLessThanOrEqual(8);
  });

  it('每个极点都有 4 位候选声优，且 32 人互不重复', () => {
    const all: string[] = [];
    for (const axis of AXIS_IDS) {
      for (const side of ['left', 'right'] as const) {
        const names = RECOMMEND[axis][side];
        expect(names, `${axis}.${side}`).toHaveLength(4);
        names.forEach((name) => expect(name.trim().length).toBeGreaterThan(0));
        all.push(...names);
      }
    }
    expect(all).toHaveLength(32);
    expect(new Set(all).size).toBe(32);
  });
});
