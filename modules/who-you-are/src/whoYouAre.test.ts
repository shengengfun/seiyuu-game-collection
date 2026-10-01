import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { SEIYUU_ROSTER } from '@seiyuu/shared';
import { resources } from '../i18n/resources';
import {
  ALL_QUESTIONS,
  CROSS_POOL,
  EGGS,
  POOL_SIZE,
  PROFILES,
  PROFILE_COUNT,
  PROJECT_IDS,
  QUIZ_MODES,
  SCALE,
  SCALE_MAX,
  TRAIT_IDS,
  createQuiz,
  decodeWhoQuizCode,
  resultCodeOf,
  scoreWho,
  scoreTraits,
  verdictOf,
  type QuizMode,
  type TraitId,
  type WhoQuestion,
} from './model/whoYouAre';

const here = dirname(fileURLToPath(import.meta.url));
const seiyuuPhotoDir = resolve(here, '../../public/seiyuu');

const SEEDS = [10001, 23456, 77777, 88888, 99999];
const MODES: QuizMode[] = ['fast', 'pro'];
const LANGS = ['zh', 'en', 'ja'] as const;

function texts(lang: (typeof LANGS)[number], key: string): Record<string, string> {
  const section = resources[lang].translation.whoYouAre as unknown as Record<string, Record<string, string>>;
  return section[key];
}

/** 按每个维度自己的期望方向作答：positive=true 表示答成 high 端。 */
function answerAll(questions: WhoQuestion[], positive: boolean): Record<string, number> {
  const answers: Record<string, number> = {};
  for (const question of questions) {
    const binding = question.axes[0];
    const agree = positive ? binding.direction === 1 : binding.direction === -1;
    answers[question.id] = agree ? SCALE_MAX : -SCALE_MAX;
  }
  return answers;
}

describe('whoYouAre 题库池', () => {
  /** 每个维度的单维度题数（新增题目时同步这个值即可）。 */
  const perTraitPool = 12;
  /** 交叉题池大小。 */
  const crossPoolSize = 16;

  it('每个维度 12 题，且两个方向各半', () => {
    TRAIT_IDS.forEach((trait) => {
      const scoped = ALL_QUESTIONS.filter(
        (question) => question.axes.length === 1 && question.axes[0].axis === trait,
      );
      expect(scoped.length).toBe(perTraitPool);
      expect(scoped.filter((question) => question.axes[0].direction === 1).length).toBe(
        perTraitPool / 2,
      );
      expect(scoped.filter((question) => question.axes[0].direction === -1).length).toBe(
        perTraitPool / 2,
      );
    });
  });

  it('交叉题都挂两个维度，且不重复同一维度', () => {
    expect(CROSS_POOL.length).toBe(crossPoolSize);
    CROSS_POOL.forEach((question) => {
      expect(question.axes.length).toBe(2);
      const traits = question.axes.map((binding) => binding.axis);
      expect(new Set(traits).size).toBe(2);
    });
  });

  it('题目 id 唯一，池子足够大', () => {
    const ids = ALL_QUESTIONS.map((question) => question.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(POOL_SIZE).toBe(TRAIT_IDS.length * perTraitPool + crossPoolSize);
    expect(POOL_SIZE).toBeGreaterThan(QUIZ_MODES.pro.questions);
    // 交叉题池必须够 PRO 模式抽，否则会静默少题。
    expect(CROSS_POOL.length).toBeGreaterThanOrEqual(QUIZ_MODES.pro.cross);
  });
});

describe('公共库 @seiyuu/shared 自检', () => {
  it('id 唯一，字段齐全，代表角色都带日文名', () => {
    const ids = SEIYUU_ROSTER.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
    SEIYUU_ROSTER.forEach((entry) => {
      expect(entry.name.length).toBeGreaterThan(0);
      expect(entry.nameJa.length).toBeGreaterThan(0);
      expect(entry.romaji.length).toBeGreaterThan(0);
      expect(PROJECT_IDS).toContain(entry.project);
      expect(entry.characters.length).toBeGreaterThan(0);
      entry.characters.forEach((character) => {
        expect(character.name.length).toBeGreaterThan(0);
        // 填了日文名才能被 scripts/verify-seiyuu.mjs 自动核对
        expect(character.nameJa, `${entry.id} 的代表角色缺少 nameJa`).toBeTruthy();
        expect(character.work.length).toBeGreaterThan(0);
      });
      (entry.alsoIn ?? []).forEach((project) => {
        expect(PROJECT_IDS).toContain(project);
        expect(project).not.toBe(entry.project);
      });
    });
  });

  it('公式照与 id 一一对应', () => {
    SEIYUU_ROSTER.forEach((entry) => {
      expect(existsSync(resolve(seiyuuPhotoDir, `${entry.id}.jpg`)), `缺少 ${entry.id}.jpg`).toBe(
        true,
      );
    });
  });
});

describe('whoYouAre 候选声优画像', () => {
  it('覆盖公共库全部声优，id 唯一，企划合法', () => {
    // 不再写死人数：公共库（@seiyuu/shared）扩充后这里自动跟随。
    expect(PROFILE_COUNT).toBe(SEIYUU_ROSTER.length);
    expect(PROFILE_COUNT).toBeGreaterThanOrEqual(60);
    const ids = PROFILES.map((profile) => profile.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(ids)).toEqual(new Set(SEIYUU_ROSTER.map((profile) => profile.id)));
    PROFILES.forEach((profile) => {
      expect(PROJECT_IDS).toContain(profile.project);
      expect(profile.name.length).toBeGreaterThan(0);
      expect(profile.chibi.length).toBeGreaterThan(0);
      TRAIT_IDS.forEach((trait) => {
        const value = profile.traits[trait];
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(100);
      });
    });
  });

  it('每个候选企划都至少有一位声优', () => {
    PROJECT_IDS.forEach((project) => {
      expect(PROFILES.filter((profile) => profile.project === project).length).toBeGreaterThan(0);
    });
  });

  it('公式照都已落到 public/seiyuu', () => {
    PROFILES.forEach((profile) => {
      expect(
        existsSync(resolve(seiyuuPhotoDir, `${profile.id}.jpg`)),
        `缺少 ${profile.id}.jpg`,
      ).toBe(true);
    });
  });
});

describe('whoYouAre 文案齐全（三语言）', () => {
  it('池子里每道题都有文案', () => {
    LANGS.forEach((lang) => {
      const questions = texts(lang, 'questions');
      ALL_QUESTIONS.forEach((question) => {
        expect(questions[question.id], `${lang} 缺少题目 ${question.id}`).toBeTruthy();
      });
    });
  });

  it('每位候选声优都有一句气质文案', () => {
    LANGS.forEach((lang) => {
      const vibes = texts(lang, 'vibes');
      PROFILES.forEach((profile) => {
        expect(vibes[profile.id], `${lang} 缺少气质文案 ${profile.id}`).toBeTruthy();
      });
    });
  });

  it('维度 / 企划 / 结论 / 彩蛋文案齐全', () => {
    LANGS.forEach((lang) => {
      const section = resources[lang].translation.whoYouAre;
      TRAIT_IDS.forEach((trait) => {
        const entry = section.traits[trait as TraitId];
        expect(entry.name, `${lang} 缺少维度名 ${trait}`).toBeTruthy();
        expect(entry.low, `${lang} 缺少维度低端 ${trait}`).toBeTruthy();
        expect(entry.high, `${lang} 缺少维度高端 ${trait}`).toBeTruthy();
      });
      PROJECT_IDS.forEach((project) => {
        expect(section.projects[project], `${lang} 缺少企划 ${project}`).toBeTruthy();
      });
      (['soulmate', 'close', 'similar', 'spark', 'contrast'] as const).forEach((verdict) => {
        expect(section.verdict[verdict], `${lang} 缺少结论 ${verdict}`).toBeTruthy();
      });
      (['normal', 'rare', 'epic', 'legendary'] as const).forEach((rarity) => {
        expect(section.rarities[rarity], `${lang} 缺少稀有度 ${rarity}`).toBeTruthy();
      });
      const eggs = texts(lang, 'eggs');
      const eggDesc = texts(lang, 'eggDesc');
      const eggRole = texts(lang, 'eggRole');
      EGGS.forEach((egg) => {
        expect(eggs[egg.id], `${lang} 缺少彩蛋 ${egg.id}`).toBeTruthy();
        expect(eggDesc[egg.id], `${lang} 缺少彩蛋说明 ${egg.id}`).toBeTruthy();
        // 只有「彩蛋人物」（带头像的）才有身份行
        if (egg.person) {
          expect(eggRole[egg.id], `${lang} 缺少彩蛋人物身份 ${egg.id}`).toBeTruthy();
        }
      });
    });
  });
});

describe('whoYouAre 抽题', () => {
  it('同一个 seed 抽到同一套题，不同 seed 会换题', () => {
    MODES.forEach((mode) => {
      const first = createQuiz(4242, mode).questions.map((question) => question.id);
      const again = createQuiz(4242, mode).questions.map((question) => question.id);
      expect(again).toEqual(first);
      const other = createQuiz(9999, mode).questions.map((question) => question.id);
      expect(other).not.toEqual(first);
    });
  });

  it('题量正确，且每个维度的题量一致', () => {
    MODES.forEach((mode) => {
      const quiz = createQuiz(2024, mode);
      expect(quiz.questions.length).toBe(QUIZ_MODES[mode].questions);
      const counts = TRAIT_IDS.map(
        (trait) =>
          quiz.questions.filter((question) => question.axes.some((binding) => binding.axis === trait)).length,
      );
      // 单维度题每维恰好 perTrait 题；交叉题只占 2~4 题，所以各维最多多 4 题
      counts.forEach((count) => {
        expect(count).toBeGreaterThanOrEqual(QUIZ_MODES[mode].perTrait);
        expect(count).toBeLessThanOrEqual(QUIZ_MODES[mode].perTrait + QUIZ_MODES[mode].cross);
      });
    });
  });

  it('每维「同意偏高端」与「同意偏低端」的题数差不超过 1', () => {
    SEEDS.forEach((seed) => {
      MODES.forEach((mode) => {
        const quiz = createQuiz(seed, mode);
        TRAIT_IDS.forEach((trait) => {
          const scoped = quiz.questions.filter(
            (question) => question.axes.length === 1 && question.axes[0].axis === trait,
          );
          const high = scoped.filter((question) => question.axes[0].direction === 1).length;
          const low = scoped.length - high;
          expect(Math.abs(high - low)).toBeLessThanOrEqual(1);
        });
      });
    });
  });

  it('抽出的题目不重复', () => {
    SEEDS.forEach((seed) => {
      const ids = createQuiz(seed, 'pro').questions.map((question) => question.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });
});

describe('whoYouAre 计分', () => {
  it('全部答成 high 端时坐标接近 100，全部答成 low 端时接近 0', () => {
    const quiz = createQuiz(555, 'pro');
    // 交叉题挂两个轴，按其中一个轴的方向作答会拖累另一个轴，所以只看单维度题
    const singles = quiz.questions.filter((question) => question.axes.length === 1);
    const high = scoreTraits(quiz.questions, answerAll(singles, true));
    high.forEach((score) => expect(score.coord).toBeCloseTo(100, 5));

    const low = scoreTraits(quiz.questions, answerAll(singles, false));
    low.forEach((score) => expect(score.coord).toBeCloseTo(0, 5));
  });

  it('全部中立时六个维度都是 50', () => {
    const quiz = createQuiz(555, 'fast');
    const answers: Record<string, number> = {};
    quiz.questions.forEach((question) => {
      answers[question.id] = 0;
    });
    scoreTraits(quiz.questions, answers).forEach((score) => expect(score.coord).toBeCloseTo(50, 5));
  });

  it('跳过全部题目时坐标回到中性', () => {
    const quiz = createQuiz(777, 'fast');
    const result = scoreWho(quiz, {}, 12_000);
    TRAIT_IDS.forEach((trait) => expect(result.coord[trait]).toBeCloseTo(50, 5));
    expect(result.stats.answered).toBe(0);
    expect(result.stats.skipped).toBe(QUIZ_MODES.fast.questions);
  });

  it('排行榜覆盖全部候选，按相似度降序，分数在 42 ~ 97 之间且顶部不会出现断层', () => {
    const quiz = createQuiz(31337, 'pro');
    const result = scoreWho(quiz, answerAll(quiz.questions, true), 60_000);
    expect(result.ranking.length).toBe(PROFILE_COUNT);
    expect(new Set(result.ranking.map((entry) => entry.id)).size).toBe(PROFILE_COUNT);
    for (let index = 1; index < result.ranking.length; index += 1) {
      expect(result.ranking[index - 1].score).toBeGreaterThanOrEqual(result.ranking[index].score);
    }
    result.ranking.forEach((entry) => {
      expect(entry.score).toBeLessThanOrEqual(97);
      expect(entry.score).toBeGreaterThanOrEqual(42);
    });
    // 前 7 名相邻差距要平缓（旧算法会出现 97 → 86 这种断层），整体又要有真正的落差
    const topScores = result.ranking.slice(0, 7).map((entry) => entry.score);
    for (let index = 1; index < topScores.length; index += 1) {
      expect(topScores[index - 1] - topScores[index]).toBeLessThanOrEqual(4);
    }
    expect(topScores[0] - topScores[topScores.length - 1]).toBeGreaterThanOrEqual(3);
    expect(result.contrast.id).toBe(result.ranking[result.ranking.length - 1].id);
    expect(result.contrast.score).toBeLessThan(result.ranking[0].score);
  });

  it('把答案凑成某位声优的画像时，她就排在前面', () => {
    const target = PROFILES[7];
    const quiz = createQuiz(606, 'pro');
    const answers: Record<string, number> = {};
    // 交叉题留空（不答就不计入该轴满分），单维度题按目标坐标凑分;

    for (const trait of TRAIT_IDS) {
      const scoped = quiz.questions.filter(
        (question) => question.axes.length === 1 && question.axes[0].axis === trait,
      );
      const wantHigh = target.traits[trait] >= 50;
      // 该轴满分 = SCALE_MAX * 题数；按目标坐标（或补数）凑一个整数总分
      const span = SCALE_MAX * scoped.length;
      const distance = Math.abs(target.traits[trait] - 50) / 50;
      const wanted = Math.round(distance * span) * (wantHigh ? 1 : -1);
      let remaining = wanted;
      scoped.forEach((question) => {
        const step = Math.min(SCALE_MAX, Math.abs(remaining));
        remaining -= Math.sign(remaining) * step;
        const direction = question.axes[0].direction;
        answers[question.id] = (wantHigh ? direction === 1 : direction === -1) ? step : -step;
      });
    }

    const result = scoreWho(quiz, answers, 45_000);
    const matched = result.ranking.find((entry) => entry.id === target.id);
    expect(matched).toBeDefined();
    // 坐标凑分有粒度误差，允许 3 点以内的差距
    expect(matched?.diff).toBeLessThanOrEqual(3);
    expect(result.ranking.slice(0, 3).map((entry) => entry.id)).toContain(target.id);
  });

  it('全选强烈同意 / 强烈反对 / 中立都能触发对应彩蛋', () => {
    const quiz = createQuiz(808, 'fast');
    const allAgree: Record<string, number> = {};
    const allDisagree: Record<string, number> = {};
    const allNeutral: Record<string, number> = {};
    quiz.questions.forEach((question) => {
      allAgree[question.id] = 2;
      allDisagree[question.id] = -2;
      allNeutral[question.id] = 0;
    });
    expect(scoreWho(quiz, allAgree, 50_000).egg?.id).toBe('e_all_agree');
    expect(scoreWho(quiz, allDisagree, 50_000).egg?.id).toBe('e_all_disagree');
    expect(scoreWho(quiz, allNeutral, 50_000).egg?.id).toBe('e_all_neutral');
  });

  it('全选强烈同意显示彩蛋人物木谷高明', () => {
    const quiz = createQuiz(808, 'fast');
    const allAgree: Record<string, number> = {};
    quiz.questions.forEach((question) => {
      allAgree[question.id] = 2;
    });
    const result = scoreWho(quiz, allAgree, 50_000);
    expect(result.egg?.id).toBe('e_all_agree');
    expect(result.egg?.rarity).toBe('legendary');
    // 三个语言都得有名字与调侃文案
    LANGS.forEach((lang) => {
      expect(texts(lang, 'eggs').e_all_agree, `${lang} 缺少木谷高明的名字`).toBeTruthy();
      expect(texts(lang, 'eggDesc').e_all_agree, `${lang} 缺少木谷高明的文案`).toBeTruthy();
    });
    expect(texts('zh', 'eggs').e_all_agree).toBe('木谷高明');
    expect(texts('ja', 'eggs').e_all_agree).toBe('木谷高明');
    expect(texts('en', 'eggs').e_all_agree).toBe('Takaaki Kidani');
    // 中文文案必须带上那句调侃
    expect(texts('zh', 'eggDesc').e_all_agree).toContain('你只是喜欢炒作罢了');
  });

  it('彩蛋人物不进候选池，不会出现在任何人的相似度排行榜里', () => {
    const quiz = createQuiz(909, 'fast');
    const answers: Record<string, number> = {};
    quiz.questions.forEach((question, index) => {
      answers[question.id] = (index % 5) - 2;
    });
    const result = scoreWho(quiz, answers, 30_000);

    const eggPeople = EGGS.map((egg) => egg.person).filter((person): person is string => Boolean(person));
    expect(eggPeople.length).toBeGreaterThan(0);

    eggPeople.forEach((person) => {
      // 1. 不在候选池（否则 traits / 公式照 / 外号都得给他凑一套）
      expect(PROFILES.some((profile) => profile.id === person), `${person} 不该进 PROFILES`).toBe(false);
      // 2. 不在排行榜里
      expect(result.ranking.some((entry) => entry.id === person), `${person} 不该出现在排行榜`).toBe(
        false,
      );
      expect(result.contrast.id).not.toBe(person);
      // 3. 头像文件要真的在（隐藏结果里要露脸）
      expect(existsSync(resolve(seiyuuPhotoDir, `${person}.jpg`)), `缺少 ${person}.jpg`).toBe(true);
    });

    // 排行榜人数 == 候选人数，没混进别人
    expect(result.ranking.length).toBe(PROFILE_COUNT);
  });

  it('相似度定性覆盖五个档位', () => {
    expect(verdictOf(95)).toBe('soulmate');
    expect(verdictOf(85)).toBe('close');
    expect(verdictOf(75)).toBe('similar');
    expect(verdictOf(65)).toBe('spark');
    expect(verdictOf(40)).toBe('contrast');
  });
});

describe('whoYouAre 成绩码', () => {
  it('编码后可以还原题目与答案', () => {
    MODES.forEach((mode) => {
      const quiz = createQuiz(1024, mode);
      const answers: Record<string, number> = {};
      quiz.questions.forEach((question, index) => {
        answers[question.id] = SCALE[index % SCALE.length].value;
      });
      const code = resultCodeOf(quiz, answers, 91_000);
      const decoded = decodeWhoQuizCode(code);
      expect(decoded).not.toBeNull();
      expect(decoded?.quiz.seed).toBe(1024);
      expect(decoded?.quiz.mode).toBe(mode);
      expect(decoded?.duration).toBe(91_000);
      quiz.questions.forEach((question) => {
        expect(decoded?.answers[question.id]).toBe(answers[question.id]);
      });
    });
  });

  it('跳过会记录为占位符并原样还原', () => {
    const quiz = createQuiz(2048, 'fast');
    const code = resultCodeOf(quiz, {}, 1_000);
    const decoded = decodeWhoQuizCode(code);
    expect(decoded).not.toBeNull();
    quiz.questions.forEach((question) => {
      expect(decoded?.answers[question.id]).toBeUndefined();
    });
  });

  it('非法成绩码返回 null', () => {
    expect(decodeWhoQuizCode('')).toBeNull();
    expect(decodeWhoQuizCode('F95734-1a-k3f9z2qx')).toBeNull();
    expect(decodeWhoQuizCode('WF9573-1a-k3f9z2qx')).toBeNull();
    expect(decodeWhoQuizCode('WX95734-1a-k3f9z2qx')).toBeNull();
  });
});
