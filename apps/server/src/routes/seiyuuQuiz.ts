import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/knex';
import { requireAuth } from '../middleware/auth';
import { asyncHandler, HttpError, validateBody } from '../middleware/common';
import { rateLimit } from '../middleware/rateLimit';
import { cached, invalidateCached } from '../services/queryCache';

/**
 * 「声优问答」玩家投稿题目。
 *
 * 题库主体仍是前端静态文件（`client/src/config/seiyuuQuiz/banks/<id>.ts`），
 * 投稿走数据库：玩家在结果页提交 → 管理员审核 → 通过后前端拉 `/community` 合并进对应题库。
 * 这样加题不需要重新构建前端，也不会有未经审核的内容直接进题库。
 */
export const QUIZ_LEVELS = ['easy', 'normal', 'hard'] as const;
/** 题目展示上限：一次把审核通过的题全部下发（纯文本，量很小）。 */
export const COMMUNITY_MAX_QUESTIONS = 500;
export const COMMUNITY_CACHE_KEY = 'seiyuu-quiz-community';
/** 题目 id 前缀：避免与手写题库的 `q1` / 生成题的 id 撞车。 */
export const COMMUNITY_ID_PREFIX = 'c';

export interface CommunityQuizQuestion {
  id: string;
  seiyuuId: string;
  level: (typeof QUIZ_LEVELS)[number];
  prompt: string;
  options: string[];
  answer: number;
  explain: string;
  source: string;
}

export interface QuizSubmissionRow {
  id: number;
  seiyuu_id: string;
  seiyuu_name: string;
  level: string;
  prompt: string;
  options: string;
  answer: number;
  explain: string;
  source: string;
  submitter_user_id: number | null;
  submitter_name: string;
  status: string;
  review_note: string | null;
  reviewed_at: string | null;
  created_at: string;
}

/** 把库里的行转成前端题库能直接吃的题目（含合法的难度与答案范围校验）。 */
export function mapCommunityRows(rows: QuizSubmissionRow[]): CommunityQuizQuestion[] {
  const result: CommunityQuizQuestion[] = [];
  for (const row of rows) {
    let options: unknown;
    try {
      options = JSON.parse(row.options);
    } catch {
      continue;
    }
    if (!Array.isArray(options) || options.length < 2 || options.length > 4) continue;
    if (options.some((option) => typeof option !== 'string' || !option.trim())) continue;
    const level = QUIZ_LEVELS.includes(row.level as (typeof QUIZ_LEVELS)[number])
      ? (row.level as (typeof QUIZ_LEVELS)[number])
      : 'normal';
    const answer = Number(row.answer);
    if (!Number.isInteger(answer) || answer < 0 || answer >= options.length) continue;
    result.push({
      id: `${COMMUNITY_ID_PREFIX}${row.id}`,
      seiyuuId: row.seiyuu_id,
      level,
      prompt: row.prompt,
      options: options as string[],
      answer,
      explain: row.explain,
      source: row.source,
    });
  }
  return result;
}

const router = Router();

const submitLimit = rateLimit({
  name: 'quiz-submission',
  limit: 10,
  windowSeconds: 3600,
  key: (req) => `quiz-submission:${req.user?.id ?? req.ip}`,
  failClosed: true,
});

const submissionSchema = z
  .object({
    seiyuuId: z.string().trim().min(1).max(64).regex(/^[a-z0-9-]+$/),
    seiyuuName: z.string().trim().min(1).max(64),
    level: z.enum(QUIZ_LEVELS).default('normal'),
    prompt: z.string().trim().min(6).max(300),
    options: z.array(z.string().trim().min(1).max(120)).min(2).max(4),
    answer: z.number().int().min(0).max(3),
    explain: z.string().trim().min(2).max(600),
    source: z.string().trim().max(300).default(''),
  })
  .superRefine((value, ctx) => {
    if (value.answer >= value.options.length) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'ANSWER_OUT_OF_RANGE', path: ['answer'] });
    }
    if (new Set(value.options).size !== value.options.length) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'DUPLICATE_OPTIONS', path: ['options'] });
    }
  });

/** 审核通过的题目，前端进「声优问答」时一次性拉下来合并。 */
router.get(
  '/community',
  rateLimit({ name: 'quiz-community', limit: 60, windowSeconds: 60, failClosed: true }),
  asyncHandler(async (_req, res) => {
    const items = await cached(COMMUNITY_CACHE_KEY, 120, async () => {
      const rows = await db<QuizSubmissionRow>('quiz_submissions')
        .where({ status: 'approved' })
        .orderBy('id', 'asc')
        .limit(COMMUNITY_MAX_QUESTIONS);
      return mapCommunityRows(rows);
    });
    res.json({ items });
  })
);

/** 玩家投稿：需要登录（有问题可追溯，也方便挡刷屏）。 */
router.post(
  '/submissions',
  requireAuth,
  submitLimit,
  validateBody(submissionSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof submissionSchema>;
    const existing = await db('quiz_submissions')
      .where({ seiyuu_id: body.seiyuuId, prompt: body.prompt })
      .first('id', 'status');
    if (existing) {
      throw new HttpError(409, existing.status === 'approved' ? 'QUIZ_SUBMISSION_EXISTS' : 'QUIZ_SUBMISSION_PENDING');
    }
    const [id] = await db('quiz_submissions')
      .insert({
        seiyuu_id: body.seiyuuId,
        seiyuu_name: body.seiyuuName,
        level: body.level,
        prompt: body.prompt,
        options: JSON.stringify(body.options),
        answer: body.answer,
        explain: body.explain,
        source: body.source,
        submitter_user_id: req.user!.id,
        submitter_name: req.user!.username,
        status: 'pending',
      })
      .returning('id')
      .then((rows: unknown[]) => rows.map((row) => (typeof row === 'object' && row !== null ? (row as { id: number }).id : (row as number))));
    res.status(201).json({ id, status: 'pending' });
  })
);

/** 我在「声优问答」里投过哪些题、审核到哪一步了。 */
router.get(
  '/submissions/mine',
  requireAuth,
  rateLimit({ name: 'quiz-submission-mine', limit: 60, windowSeconds: 60, key: (req) => `quiz-mine:${req.user?.id ?? req.ip}`, failClosed: true }),
  asyncHandler(async (req, res) => {
    const rows = await db('quiz_submissions')
      .where({ submitter_user_id: req.user!.id })
      .orderBy('id', 'desc')
      .limit(50)
      .select('id', 'seiyuu_id', 'seiyuu_name', 'prompt', 'status', 'review_note', 'created_at');
    res.json({ items: rows });
  })
);

/** 审核动作会让 `/community` 立刻变化，审核接口在 routes/admin.ts 里，共用这个失效函数。 */
export async function invalidateCommunityQuestions(): Promise<void> {
  await invalidateCached(COMMUNITY_CACHE_KEY);
}

export default router;
