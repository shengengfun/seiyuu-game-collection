/**
 * 「声优问答」数据结构：一套题库 = 一位声优的个人常识题。
 *
 * 题库按声优一人一份，放在 `./banks/<声优 id>.ts`，格式与增改方式见 `./banks/README.md`。
 */

import type { QuizGroupId } from './groups';

/** 题目难度，同时决定得分权重（见 index.ts 的 LEVEL_WEIGHT）。 */
export type QuestionLevel = 'easy' | 'normal' | 'hard';

export const LEVEL_IDS = ['easy', 'normal', 'hard'] as const;

/** 非中文文案覆盖；缺省时回退到中文题干/选项/解析。 */
export interface QuestionText {
  prompt: string;
  options: string[];
  explain?: string;
}

export interface SeiyuuQuizQuestion {
  /** 题目 id，同一题库内唯一即可（作为作答记录的键）。 */
  id: string;
  /** 难度。 */
  level: QuestionLevel;
  /** 题干（简体中文）。 */
  prompt: string;
  /** 选项，2 ~ 4 个，顺序即展示顺序（不随机打乱，解析里可以直接引用选项）。 */
  options: string[];
  /** 正确选项下标（从 0 开始），必须落在 options 范围内。 */
  answer: number;
  /** 解析：答错时告诉玩家「为什么」以及正确说法。 */
  explain: string;
  /** 可选出处，方便日后校对（banks/README.md 里约定的写法）。 */
  source?: string;
  /** 其他语言覆盖（可选），目前题库只写中文，en/ja 自动回退中文。 */
  l10n?: Partial<Record<'en' | 'ja', QuestionText>>;
}

/** 一位声优的题库。 */
export interface SeiyuuQuizBank {
  /** 必须与 `@seiyuu/shared` 名册里的 id 一致（同时决定公式照 `/seiyuu/<id>.jpg`）。 */
  id: string;
  /**
   * 所属分组（选人界面的分组标题），取值见 `./groups.ts` 的 `QUIZ_GROUP_IDS`。
   *
   * 跨界声优可以填多个（例：林鼓子 → `['nijigasaki', 'mygo']`）；
   * 不填则按名册的 project 兜底。
   */
  groups?: QuizGroupId[];
  /** 一句话导语，展示在答题前的声优卡片上（可选）。 */
  intro?: string;
  questions: SeiyuuQuizQuestion[];
}

/**
 * 彩蛋人物：不是女声优，只是玩梗用的嘉宾题库。
 *
 * 故意**不进** `@seiyuu/shared` 名册——名册只放真实女声优，
 * 否则会被画儏/匹配等其他玩法当成候选人。名单在 index.ts 里的
 * `EASTER_EGG_IDENTITIES` 声明。
 */
export interface EasterEggIdentity {
  id: string;
  /** 展示名。 */
  name: string;
  /** 副标题位（卡片上正常声优放日文名，彩蛋放别名/代称）。 */
  nameJa: string;
  /** 拉丁转写；随手写一个方便搜索即可。 */
  romaji: string;
  /** 卡片第二行的说明文字（正常声优放「角色（作品）」）。 */
  character: string;
  /** 可选的公式照路径；没有就走首字方块兜底。 */
  photo?: string;
}

/** 题库自检结果，供测试与页面兜底使用。 */
export interface BankIssue {
  bankId: string;
  questionId: string;
  message: string;
}

/** 检查一份题库是否合法（结构、选项、答案下标、重复 id）。 */
export function validateBank(bank: SeiyuuQuizBank): BankIssue[] {
  const issues: BankIssue[] = [];
  if (!bank.id || typeof bank.id !== 'string') {
    issues.push({ bankId: String(bank.id), questionId: '-', message: '缺少题库 id' });
    return issues;
  }
  if (!Array.isArray(bank.questions) || bank.questions.length === 0) {
    issues.push({ bankId: bank.id, questionId: '-', message: '题库没有题目' });
    return issues;
  }
  const seen = new Set<string>();
  for (const question of bank.questions) {
    const id = question?.id ?? '-';
    if (!question?.id) {
      issues.push({ bankId: bank.id, questionId: id, message: '缺少题目 id' });
    } else if (seen.has(question.id)) {
      issues.push({ bankId: bank.id, questionId: id, message: '题目 id 重复' });
    }
    seen.add(id);
    if (!question?.prompt?.trim()) {
      issues.push({ bankId: bank.id, questionId: id, message: '题干为空' });
    }
    if (!Array.isArray(question?.options) || question.options.length < 2) {
      issues.push({ bankId: bank.id, questionId: id, message: '选项少于 2 个' });
    } else if (question.options.length > 4) {
      issues.push({ bankId: bank.id, questionId: id, message: '选项多于 4 个' });
    } else if (question.options.some((option) => !option?.trim())) {
      issues.push({ bankId: bank.id, questionId: id, message: '存在空选项' });
    } else if (new Set(question.options).size !== question.options.length) {
      issues.push({ bankId: bank.id, questionId: id, message: '选项内容重复' });
    }
    if (
      typeof question?.answer !== 'number' ||
      !Number.isInteger(question.answer) ||
      question.answer < 0 ||
      question.answer >= (question?.options?.length ?? 0)
    ) {
      issues.push({ bankId: bank.id, questionId: id, message: `答案下标越界（${question?.answer}）` });
    }
    if (!LEVEL_IDS.includes(question?.level)) {
      issues.push({ bankId: bank.id, questionId: id, message: `难度取值非法（${question?.level}）` });
    }
    if (!question?.explain?.trim()) {
      issues.push({ bankId: bank.id, questionId: id, message: '缺少解析' });
    }
  }
  return issues;
}
