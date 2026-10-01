/**
 * 评论审核的「库侧」包装：把 `moderation/engine.ts` 的纯函数判定与账号信誉结合，
 * 给出最终处置（自动通过 / 转人工 / 自动拒绝）。
 *
 * 信誉分的意义：老用户、已验证邮箱、历史被采纳过的人可以更宽容；
 * 有过被驳回记录的人则从严。这样「自动审批」既快又不会让惯犯刷屏。
 */

import { config } from '../config';
import { db } from '../db/knex';
import { contentFingerprint, inspectText, type ModerationAction, type ReputationAdjustment } from './moderation/engine';

export interface CommentModerationOutcome {
  /** 最终处置（已考虑自动审核开关）。 */
  action: ModerationAction;
  /** 引擎原始判定（开关关闭时与 `action` 不同，供后台参考）。 */
  engine: ModerationAction;
  score: number;
  categories: string[];
  /** 命中的词，**仅供后台**。 */
  hits: string[];
  reasons: string[];
  fingerprint: string;
  decidedBy: 'auto' | 'admin';
  /** 是否因为「自动拒绝」被直接拦下（作者可改写后重投）。 */
  rejected: boolean;
}

const HOUR_MS = 60 * 60 * 1000;

/** 同一用户 24 小时内重复同一段内容 → 视为灌水。 */
const DUPLICATE_WINDOW_MS = 24 * HOUR_MS;

export { contentFingerprint };

async function reputationOf(userId: number, fingerprint: string): Promise<ReputationAdjustment[]> {
  const adjustments: ReputationAdjustment[] = [];

  const account = (await db('users')
    .where({ id: userId })
    .first('email_verified_at', 'created_at', 'banned_at')) as
    | { email_verified_at?: string | null; created_at?: string | null; banned_at?: string | null }
    | undefined;

  if (account?.email_verified_at) adjustments.push({ code: 'REP_EMAIL_VERIFIED', delta: -10 });
  if (account?.banned_at) adjustments.push({ code: 'REP_BANNED', delta: 40 });

  const created = account?.created_at ? Date.parse(`${String(account.created_at).replace(' ', 'T')}Z`) : NaN;
  if (Number.isFinite(created) && Date.now() - created >= 7 * 24 * HOUR_MS) {
    adjustments.push({ code: 'REP_ACCOUNT_AGE', delta: -8 });
  }

  const statusRows = (await db('seiyuu_vote_comments')
    .where({ user_id: userId })
    .select('status')
    .count({ count: 'id' })
    .groupBy('status')) as unknown as Array<{ status: string; count: number | string }>;
  const approved = Number(statusRows.find((row) => String(row.status) === 'approved')?.count ?? 0);
  const rejected = Number(statusRows.find((row) => String(row.status) === 'rejected')?.count ?? 0);

  if (approved >= 3) adjustments.push({ code: 'REP_TRUSTED_AUTHOR', delta: -8 });
  if (rejected > 0) adjustments.push({ code: 'REP_PRIOR_REJECT', delta: Math.min(24, rejected * 12) });
  if (rejected >= 3) adjustments.push({ code: 'REP_REPEAT_OFFENDER', delta: 30 });

  const duplicate = await db('seiyuu_vote_comments')
    .where({ user_id: userId, fingerprint })
    .where('created_at', '>', Date.now() - DUPLICATE_WINDOW_MS)
    .first('id');
  if (duplicate) adjustments.push({ code: 'DUPLICATE_CONTENT', delta: 40 });

  return adjustments;
}

/**
 * 审核一条待发表评论。
 *
 * 不写库、不改状态，只给出判定 —— 由调用方（`routes/sukikirai.ts`）决定落库字段。
 */
export async function moderateComment(input: {
  userId: number;
  body: string;
}): Promise<CommentModerationOutcome> {
  const fingerprint = contentFingerprint(input.body);
  const reputation = config.comments.autoModeration
    ? await reputationOf(input.userId, fingerprint)
    : [];
  const inspection = inspectText(input.body, { reputation });

  const autoOff = !config.comments.autoModeration;
  const action: ModerationAction = autoOff
    ? 'review'
    : inspection.action === 'reject' && !config.comments.autoReject
      ? 'review'
      : inspection.action;

  return {
    action,
    engine: inspection.action,
    score: inspection.score,
    categories: inspection.categories,
    hits: inspection.hits.map((hit) => hit.word),
    reasons: inspection.reasons,
    fingerprint,
    decidedBy: autoOff ? 'admin' : 'auto',
    rejected: action === 'reject',
  };
}

/** 判定结果 → `seiyuu_vote_comments` 的审核元数据列。 */
export function moderationColumns(outcome: CommentModerationOutcome) {
  return {
    fingerprint: outcome.fingerprint,
    moderation_action: outcome.action,
    moderation_score: outcome.score,
    moderation_categories: outcome.categories.join(',') || null,
    moderation_hits: outcome.hits.join(',') || null,
    moderation_reasons: outcome.reasons.join(',') || null,
    moderation_at: Date.now(),
    decided_by: outcome.decidedBy,
  };
}

/** 引擎判定 → 审核备注（自动拒绝时写给作者看的机器码，后台可改）。 */
export function autoReviewNote(outcome: CommentModerationOutcome): string | null {
  if (outcome.action === 'approve') return null;
  const head = outcome.rejected ? 'COMMENT_AUTO_REJECTED' : 'COMMENT_NEEDS_REVIEW';
  return [head, `score=${outcome.score}`, ...outcome.reasons].join(' ');
}
