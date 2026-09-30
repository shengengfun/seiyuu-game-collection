import { Router } from 'express';
import type { Knex } from 'knex';
import { z } from 'zod';
import { config } from '../config';
import { db } from '../db/knex';
import { optionalAuth, requireAuth } from '../middleware/auth';
import { asyncHandler, HttpError, validateBody, validateParams } from '../middleware/common';
import { rateLimit, requestIdentity } from '../middleware/rateLimit';
import { autoReviewNote, moderationColumns, moderateComment } from '../services/commentModeration';
import {
  COMMENT_MAX_LENGTH,
  SEIYUU_ID_PATTERN,
  VOTE_CHOICES,
  VOTE_PER_PERSON_LIMIT,
  countsOf,
  commentsEnabled,
  invalidateVoteCaches,
  isReasonFor,
  isVoteRange,
  listApprovedComments,
  loadMyVotes,
  loadQuota,
  loadRangeCounts,
  loadReasonStats,
  loadVoteTotals,
  resolveVoter,
  voteDayIndex,
  voterIdentityOf,
  type CommentStatus,
  type VoteChoice,
  type VoteRange,
  type VoterIdentity,
} from '../services/sukikirai';

/**
 * 「喜欢或讨厌」——对站内收录的女声优做喜欢 / 讨厌二元投票，投票后才能看比例与评论。
 *
 * 页面结构：`/seiyuu-sukikirai`（热度排行榜）→ `/seiyuu-sukikirai/:id`（人物页）。
 * 票数聚合见 services/sukikirai.ts；评论审核接口在 routes/admin.ts。
 */
const router = Router();
router.use(optionalAuth);

const seiyuuIdParams = z.object({ id: z.string().trim().regex(SEIYUU_ID_PATTERN) });

const voteBodySchema = z.object({
  seiyuuId: z.string().trim().regex(SEIYUU_ID_PATTERN),
  choice: z.enum(VOTE_CHOICES),
  /** 可选的预设理由 id（见 services/sukikirai.ts 的 VOTE_REASONS）。 */
  reason: z.string().trim().max(32).nullish(),
});

const commentBodySchema = z.object({
  seiyuuId: z.string().trim().regex(SEIYUU_ID_PATTERN),
  body: z.string().trim().min(2).max(COMMENT_MAX_LENGTH),
});

/** 只改 / 清理由：不加票、不消耗当日额度（null = 取消理由）。 */
const reasonBodySchema = z.object({
  seiyuuId: z.string().trim().regex(SEIYUU_ID_PATTERN),
  reason: z.string().trim().max(32).nullable(),
});

const readLimit = rateLimit({
  name: 'sukikirai-read',
  limit: 180,
  windowSeconds: 60,
  key: requestIdentity,
  failClosed: true,
});

const voteLimit = rateLimit({
  name: 'sukikirai-vote',
  limit: 60,
  windowSeconds: 3600,
  key: requestIdentity,
  failClosed: true,
});

const commentLimit = rateLimit({
  name: 'sukikirai-comment',
  limit: 5,
  windowSeconds: 3600,
  key: (req) => `sukikirai-comment:${req.user?.id ?? req.ip}`,
  failClosed: true,
});

/** 突发闸门：即便小时额度没用完，也不允许连点（与库里的冷却互为补充）。 */
const commentBurstLimit = rateLimit({
  name: 'sukikirai-comment-burst',
  limit: 3,
  windowSeconds: 60,
  key: (req) => `sukikirai-comment-burst:${req.user?.id ?? req.ip}`,
  failClosed: false,
});

/** 已投票的下发比例 + 评论；没投票的只回一个「已锁」标记。 */
async function seiyuuPayload(voter: VoterIdentity, seiyuuId: string) {
  const totals = await loadVoteTotals();
  const counts = countsOf(totals, seiyuuId);
  const mine = (await db('seiyuu_votes')
    .where({ seiyuu_id: seiyuuId, voter_key: voter.key })
    .first('choice', 'reason', 'votes', 'day', 'day_votes')) as
    | { choice?: string; reason?: string | null; votes?: number; day?: number; day_votes?: number }
    | undefined;
  const quota = await loadQuota(voter);
  const base = { id: seiyuuId, quota, commentsEnabled: commentsEnabled() };
  if (!mine) {
    return { ...base, voted: false as const };
  }
  // 上限是「每天每人」的：跨天后当日计数归零，按钮重新可用。
  const myDayVotes = Number(mine.day) === voteDayIndex() ? Number(mine.day_votes) || 0 : 0;
  return {
    ...base,
    voted: true as const,
    myVote: mine.choice as VoteChoice,
    myReason: mine.reason ?? null,
    /** 我投给这位的**累计**票数（展示用）。 */
    myVotes: Number(mine.votes) || 1,
    /** 我今天投给这位的票数（上限判断用）。 */
    myDayVotes,
    likes: counts.likes,
    dislikes: counts.dislikes,
    total: counts.total,
    reasons: await loadReasonStats(seiyuuId),
    comments: commentsEnabled() ? await listApprovedComments(seiyuuId) : [],
  };
}

/** 某个身份在指定自然日已经用掉的额度（按“当天新增的票数”算，不是按人头）。 */
async function sumDayVotes(trx: Knex, voterKey: string, day: number): Promise<number> {
  const row = (await trx('seiyuu_votes')
    .where({ voter_key: voterKey, day })
    .sum({ count: 'day_votes' })
    .first()) as { count?: number | string } | undefined;
  return Number(row?.count ?? 0);
}

/**
 * 排行榜数据（`?range=day|week|month|all`，默认总榜）。
 *
 * 只下发**每个字的总票数**（热度），不下发喜欢/讨厌的拆分——
 * 否则排行榜本身就泄露了「必须先投票才能看」的比例。
 */
router.get(
  '/board',
  readLimit,
  asyncHandler(async (req, res) => {
    const requested = String(req.query.range ?? 'all');
    const range: VoteRange = isVoteRange(requested) ? requested : 'all';
    const voter = await resolveVoter(req);
    const [counts, myVotes, quota] = await Promise.all([
      loadRangeCounts(range),
      loadMyVotes(voter.key),
      loadQuota(voter),
    ]);
    res.json({
      range,
      counts,
      myVotes: Object.fromEntries(myVotes),
      quota,
      commentsEnabled: commentsEnabled(),
      perPersonLimit: VOTE_PER_PERSON_LIMIT,
      day: voteDayIndex(),
      updatedAt: Date.now(),
    });
  })
);

router.get(
  '/seiyuu/:id',
  readLimit,
  validateParams(seiyuuIdParams),
  asyncHandler(async (req, res) => {
    const { id } = req.params as unknown as z.infer<typeof seiyuuIdParams>;
    res.json(await seiyuuPayload(await resolveVoter(req), id));
  })
);

/**
 * 只改 / 清理由（**不加票、不消耗额度**）。
 *
 * 必须已经投过票（哪怕是 1 票）；一个人物只有一个理由，5 票也只能选一个。
 */
router.post(
  '/vote/reason',
  voteLimit,
  validateBody(reasonBodySchema),
  asyncHandler(async (req, res) => {
    const { seiyuuId, reason } = req.body as z.infer<typeof reasonBodySchema>;
    const voter = await resolveVoter(req);
    const existing = (await db('seiyuu_votes')
      .where({ seiyuu_id: seiyuuId, voter_key: voter.key })
      .first('id', 'choice')) as { id: number; choice: string } | undefined;
    if (!existing) throw new HttpError(403, 'VOTE_REQUIRED');
    const choice = String(existing.choice) as VoteChoice;
    // 理由必须属于当前立场的预设列表，否则当作没选。
    const nextReason = isReasonFor(choice, reason) ? reason : null;
    await db('seiyuu_votes')
      .where({ id: existing.id })
      .update({ reason: nextReason, updated_at: Date.now() });
    res.json({ ...(await seiyuuPayload(voter, seiyuuId)), reasonOnly: true });
  })
);

/**
 * 投票。
 *
 * - 同一身份对同一人物**每天**累计最多 `VOTE_PER_PERSON_LIMIT` 票（跨天重新计数）；点同一边就是
 *   「再加一票」，点另一边则是改投（只换立场，票数不变）。
 * - 每人每天额度按档位：匿名 1 / 普通账号 10 / 累计满 100 票的账号 20 / 管理员 50；
 *   **只有真的加了票才会消耗额度**，改投不消耗，改理由走 `/vote/reason` 不消耗。
 */
router.post(
  '/vote',
  voteLimit,
  validateBody(voteBodySchema),
  asyncHandler(async (req, res) => {
    const { seiyuuId, choice, reason } = req.body as z.infer<typeof voteBodySchema>;
    const voter = await resolveVoter(req);
    const now = Date.now();
    const day = voteDayIndex(now);
    // 未传 reason = 「保持原样」（只改立场 / 再加一票时不会把已选的理由抹掉）；
    // 显式传 null = 「清空理由」；传了不合法 / 不属于该立场的 id = 当作没选。
    const explicitReason = reason === undefined ? undefined : isReasonFor(choice, reason) ? reason : null;

    const result = await db.transaction(async (trx) => {
      const existing = (await trx('seiyuu_votes')
        .where({ seiyuu_id: seiyuuId, voter_key: voter.key })
        .first('id', 'choice', 'reason', 'votes', 'day', 'day_votes')) as
        | { id: number; choice: string; reason: string | null; votes: number; day: number; day_votes: number }
        | undefined;

      if (existing) {
        const choiceChanged = String(existing.choice) !== choice;
        // 显式给了理由就用它；没给时——同一立场保留原理由，换立场就丢掉
        // （预设理由是按立场分组的，like 的理由挂在 dislike 上是无意义的）。
        const nextReason =
          explicitReason !== undefined
            ? explicitReason
            : choiceChanged
              ? null
              : (existing.reason ?? null);
        const reasonChanged = (existing.reason ?? null) !== nextReason;
        // 只有「同一立场再投一次」才是加票；改投不增减票数。
        const adding = !choiceChanged;

        if (adding) {
          const sameDay = Number(existing.day) === day;
          const dayVotes = sameDay ? Number(existing.day_votes) || 0 : 0;
          // 上限是「每天每人」的：昨天把 5 票投满，今天照样能继续投。
          if (dayVotes + 1 > VOTE_PER_PERSON_LIMIT) throw new HttpError(429, 'VOTE_LIMIT_REACHED');
          const usedToday = await sumDayVotes(trx, voter.key, day);
          if (usedToday + 1 > voter.limit) throw new HttpError(429, 'VOTE_QUOTA_EXCEEDED');
          await trx('seiyuu_votes').where({ id: existing.id }).update({
            reason: nextReason,
            votes: (Number(existing.votes) || 1) + 1,
            day,
            day_votes: dayVotes + 1,
            voter_kind: voter.kind,
            user_id: voter.userId,
            updated_at: now,
          });
          // 日 / 周 / 月榜靠这条流水做时间窗聚合（改投不写）。
          await trx('seiyuu_vote_events').insert({
            seiyuu_id: seiyuuId,
            voter_key: voter.key,
            voter_kind: voter.kind,
            user_id: voter.userId,
            choice,
            votes_delta: 1,
            day,
            created_at: now,
          });
          return { changed: true, isNew: false, added: true };
        }

        // 改投：只换立场（以及可能的理由），票数不变、不消耗当日额度。
        if (!choiceChanged && !reasonChanged) return { changed: false, isNew: false, added: false };
        await trx('seiyuu_votes').where({ id: existing.id }).update({
          choice,
          reason: nextReason,
          voter_kind: voter.kind,
          user_id: voter.userId,
          updated_at: now,
        });
        return { changed: true, isNew: false, added: false };
      }

      const usedToday = await sumDayVotes(trx, voter.key, day);
      if (usedToday + 1 > voter.limit) throw new HttpError(429, 'VOTE_QUOTA_EXCEEDED');
      await trx('seiyuu_votes').insert({
        seiyuu_id: seiyuuId,
        voter_key: voter.key,
        voter_kind: voter.kind,
        user_id: voter.userId,
        choice,
        reason: explicitReason ?? null,
        votes: 1,
        day,
        day_votes: 1,
        created_at: now,
        updated_at: now,
      });
      // 日 / 周 / 月榜靠这条流水做时间窗聚合。
      await trx('seiyuu_vote_events').insert({
        seiyuu_id: seiyuuId,
        voter_key: voter.key,
        voter_kind: voter.kind,
        user_id: voter.userId,
        choice,
        votes_delta: 1,
        day,
        created_at: now,
      });
      return { changed: true, isNew: true, added: true };
    });

    if (result.changed) await invalidateVoteCaches();
    res.json({
      ...(await seiyuuPayload(voter, seiyuuId)),
      changed: result.changed,
      isNew: result.isNew,
      added: result.added,
    });
  })
);

/**
 * 短评：必须登录 + 必须已经投过票。
 *
 * 发表时先过本地轻量审核引擎（`services/commentModeration.ts`）：
 * - `approve` → 直接公开（`status=approved`，`decided_by=auto`）
 * - `review`  → 进人工队列（`status=pending`）
 * - `reject`  → 自动拒绝（`status=rejected`，作者可改写后重投）
 *
 * 功能开关见 `SUKIKIRAI_COMMENTS_ENABLED`；自动审核开关见 `COMMENT_AUTO_MODERATION`
 * / `COMMENT_AUTO_REJECT`。
 */
router.post(
  '/comments',
  requireAuth,
  commentLimit,
  commentBurstLimit,
  validateBody(commentBodySchema),
  asyncHandler(async (req, res) => {
    if (!commentsEnabled()) throw new HttpError(403, 'FEATURE_DISABLED');
    const { seiyuuId, body } = req.body as z.infer<typeof commentBodySchema>;
    const userId = req.user!.id;

    const vote = (await db('seiyuu_votes')
      .where({ seiyuu_id: seiyuuId, voter_key: `u:${userId}` })
      .first('choice')) as { choice?: string } | undefined;
    if (!vote) throw new HttpError(403, 'VOTE_REQUIRED');

    // 频率闸门：两次发表之间的间隔 + 每日总量（按提交次数算，被拒的也计数）。
    const latest = await db('seiyuu_vote_comments')
      .where({ user_id: userId })
      .orderBy('created_at', 'desc')
      .first('created_at');
    if (latest) {
      const elapsed = Date.now() - (Number(latest.created_at) || 0);
      const cooldownMs = config.comments.cooldownSeconds * 1000;
      if (elapsed < cooldownMs) {
        return res.status(429).json({
          code: 'COMMENT_COOLDOWN',
          retryAt: (Number(latest.created_at) || 0) + cooldownMs,
          serverNow: Date.now(),
        });
      }
    }
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayCount = await db('seiyuu_vote_comments')
      .where({ user_id: userId })
      .where('created_at', '>=', todayStart.getTime())
      .count({ count: 'id' })
      .first();
    if (Number(todayCount?.count ?? 0) >= config.comments.dailyLimit) {
      return res.status(429).json({ code: 'COMMENT_DAILY_LIMIT', limit: config.comments.dailyLimit });
    }

    const outcome = await moderateComment({ userId, body });
    const moderation = moderationColumns(outcome);
    const status: CommentStatus = outcome.action === 'approve'
      ? 'approved'
      : outcome.action === 'reject'
        ? 'rejected'
        : 'pending';
    const note = autoReviewNote(outcome);
    const choice = String(vote.choice) === 'dislike' ? 'dislike' : 'like';
    const payload = {
      status,
      review_note: note,
      reviewed_by_user_id: null,
      reviewed_at: (status === 'pending' ? null : db.fn.now()) as unknown as string | null,
      created_at: Date.now(),
      ...moderation,
    };

    const existing = await db('seiyuu_vote_comments')
      .where({ seiyuu_id: seiyuuId, user_id: userId })
      .first('id', 'status');
    if (existing) {
      if (String(existing.status) === 'pending' && status === 'pending') {
        // 已有一条待审，重复提交直接拒绝（与旧行为一致，避免刷队列）。
        throw new HttpError(409, 'COMMENT_PENDING');
      }
      if (String(existing.status) === 'approved' && status === 'approved') {
        throw new HttpError(409, 'COMMENT_ALREADY_SUBMITTED');
      }
      // 其余情况（被驳回 / 被自动拒绝 / 审核中改稿）走覆盖重投。
      await db('seiyuu_vote_comments').where({ id: existing.id }).update({
        body,
        choice,
        ...payload,
      });
      return res.status(201).json({
        id: Number(existing.id),
        status,
        action: outcome.action,
        score: outcome.score,
        reasons: outcome.reasons,
        auto: outcome.decidedBy === 'auto',
        resubmitted: true,
      });
    }

    const [inserted] = await db('seiyuu_vote_comments')
      .insert({
        seiyuu_id: seiyuuId,
        user_id: userId,
        author_name: req.user!.username,
        choice,
        body,
        ...payload,
      })
      .returning('id')
      .then((rows: Array<number | { id: number }>) => rows.map((row) => (typeof row === 'object' ? row.id : row)));

    res.status(201).json({
      id: Number(inserted ?? 0),
      status,
      action: outcome.action,
      score: outcome.score,
      reasons: outcome.reasons,
      auto: outcome.decidedBy === 'auto',
    });
  })
);

/** 我在这个板块里的状态：投过哪些人、评论审核到哪一步。 */
router.get(
  '/mine',
  readLimit,
  asyncHandler(async (req, res) => {
    const voter = voterIdentityOf(req);
    const [myVotes, quota] = await Promise.all([loadMyVotes(voter.key), loadQuota(voter)]);
    const comments = req.user
      ? await db('seiyuu_vote_comments')
          .where({ user_id: req.user.id })
          .orderBy('id', 'desc')
          .limit(50)
          .select('id', 'seiyuu_id', 'body', 'choice', 'status', 'review_note', 'decided_by', 'created_at')
      : [];
    res.json({
      myVotes: Object.fromEntries(myVotes),
      quota,
      comments: comments.map((row) => ({
        id: Number(row.id),
        seiyuuId: String(row.seiyuu_id),
        body: String(row.body ?? ''),
        choice: String(row.choice),
        status: String(row.status),
        /**
         * 自动审核写进去的备注是「引擎线索」（命中类别 / 词），只给后台看；
         * 对作者一律隐藏，避免把词库反向喂给想绕过审核的人。
         */
        reviewNote:
          row.review_note == null || String(row.decided_by) === 'auto'
            ? null
            : String(row.review_note),
        createdAt: Number(row.created_at) || 0,
      })),
    });
  })
);

export default router;
