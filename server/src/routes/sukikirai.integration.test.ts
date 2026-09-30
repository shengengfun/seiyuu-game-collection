import http from 'http';
import express from 'express';
import { AddressInfo } from 'net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { config } from '../config';
import { db } from '../db/knex';
import { initDb } from '../db/init';
import { errorHandler } from '../middleware/common';
import { signToken, userNameFromUsername } from '../middleware/auth';
import { initRedis } from '../redis';
import {
  VOTE_DAILY_LIMIT,
  VOTE_PER_PERSON_LIMIT,
  VOTE_VETERAN_THRESHOLD,
  invalidateVoteCaches,
  voteDayIndex,
  voterIdentityOf,
} from '../services/sukikirai';
import adminRoutes from './admin';
import sukikiraiRoutes from './sukikirai';

/**
 * 「喜欢或讨厌」集成测试。
 *
 * 覆盖：投票前拿不到比例 → 投票后解锁；同一人最多 5 票（加票 / 改投 / 每日额度）；
 * 理由的写入 / 沿用 / 单独改（不消耗额度）；日 / 周 / 月 / 总榜的时间窗聚合；
 * 额度分档（匿名 1 / 普通 10 / 老用户 20 / 管理员 50）；短评默认未开放；管理端审核链路。
 *
 * 匿名身份按 IP 计账，测试机所有请求共用同一个 IP，所以匿名额度只在单元层面断言
 * （`voterIdentityOf` / `VOTE_DAILY_LIMIT`），HTTP 层面用登录账号验证额度。
 */
let server: http.Server;
let baseUrl: string;

const stamp = Date.now();
const SEIYUU_A = `test-sukikirai-a-${stamp}`;
const SEIYUU_B = `test-sukikirai-b-${stamp}`;
const SEIYUU_C = `test-sukikirai-c-${stamp}`;
const TEST_SEIYUUS = [SEIYUU_A, SEIYUU_B, SEIYUU_C];

const createdUserIds: number[] = [];

async function createUser(role: 'user' | 'admin' = 'user'): Promise<string> {
  const username = `sukikirai-${role}-${stamp}-${createdUserIds.length}`;
  const [row] = await db('users')
    .insert({
      username,
      display_id: userNameFromUsername(username),
      password_hash: 'test',
      role,
      token_version: 0,
    })
    .returning(['id', 'token_version']);
  createdUserIds.push(Number(row.id));
  return `csgofriberg_session=${signToken(row)}`;
}

async function request(path: string, init: RequestInit = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  });
  return { response, data: await response.json() };
}

function vote(cookie: string, body: Record<string, unknown>) {
  return request('/api/sukikirai/vote', {
    method: 'POST',
    headers: { cookie },
    body: JSON.stringify(body),
  });
}

describe('喜欢或讨厌（投票）', () => {
  let userA = '';
  let userB = '';
  let admin = '';

  beforeAll(async () => {
    await initDb();
    await initRedis();
    const app = express();
    app.use(express.json());
    app.use('/api/sukikirai', sukikiraiRoutes);
    app.use('/api/admin', adminRoutes);
    app.use(errorHandler);
    server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    userA = await createUser();
    userB = await createUser();
    admin = await createUser('admin');
  });

  afterAll(async () => {
    await db('seiyuu_vote_comments').whereIn('seiyuu_id', TEST_SEIYUUS).del();
    await db('seiyuu_vote_events').whereIn('seiyuu_id', TEST_SEIYUUS).del();
    await db('seiyuu_votes').whereIn('seiyuu_id', TEST_SEIYUUS).del();
    if (createdUserIds.length) {
      await db('seiyuu_vote_events').whereIn('user_id', createdUserIds).del();
      await db('seiyuu_vote_comments').whereIn('user_id', createdUserIds).del();
      await db('seiyuu_votes').whereIn('user_id', createdUserIds).del();
      await db('users').whereIn('id', createdUserIds).del();
    }
    if (!server) return;
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('没投票时不下发比例，投票后才解锁，而且只对本人解锁', async () => {
    const before = await request(`/api/sukikirai/seiyuu/${SEIYUU_A}`, {
      headers: { cookie: userA },
    });
    expect(before.data.voted).toBe(false);
    expect(before.data.likes).toBeUndefined();
    expect(before.data.dislikes).toBeUndefined();
    expect(before.data.comments).toBeUndefined();

    const voted = await vote(userA, { seiyuuId: SEIYUU_A, choice: 'like', reason: 'voice' });
    expect(voted.response.status).toBe(200);
    expect(voted.data.voted).toBe(true);
    expect(voted.data.myVote).toBe('like');
    expect(voted.data.myReason).toBe('voice');
    expect(voted.data.likes).toBe(1);
    expect(voted.data.dislikes).toBe(0);
    expect(voted.data.total).toBe(1);
    expect(voted.data.reasons.likes).toEqual([{ id: 'voice', count: 1 }]);
    expect(voted.data.isNew).toBe(true);

    const after = await request(`/api/sukikirai/seiyuu/${SEIYUU_A}`, {
      headers: { cookie: userA },
    });
    expect(after.data.voted).toBe(true);
    expect(after.data.likes).toBe(1);

    // 换一个身份看：没投过票，只能拿到「已锁定」
    const other = await request(`/api/sukikirai/seiyuu/${SEIYUU_A}`, {
      headers: { cookie: userB },
    });
    expect(other.data.voted).toBe(false);
    expect(other.data.total).toBeUndefined();
  });

  it('同一人每天最多 5 票：当天第 6 次被拦，隔天可以继续投', async () => {
    for (let index = 1; index <= 5; index += 1) {
      const result = await vote(userB, { seiyuuId: SEIYUU_B, choice: 'like' });
      expect(result.response.status, `第 ${index} 票`).toBe(200);
      expect(result.data.myVotes).toBe(index);
      expect(result.data.myDayVotes).toBe(index);
      expect(result.data.likes).toBe(index);
      expect(result.data.total).toBe(index);
    }

    const blocked = await vote(userB, { seiyuuId: SEIYUU_B, choice: 'like' });
    expect(blocked.response.status).toBe(429);
    expect(blocked.data.code).toBe('VOTE_LIMIT_REACHED');

    // 改投：票数不变，只是全部换成另一边
    const flipped = await vote(userB, { seiyuuId: SEIYUU_B, choice: 'dislike' });
    expect(flipped.response.status).toBe(200);
    expect(flipped.data.myVote).toBe('dislike');
    expect(flipped.data.myVotes).toBe(5);
    expect(flipped.data.likes).toBe(0);
    expect(flipped.data.dislikes).toBe(5);
    expect(flipped.data.total).toBe(5);

    // 把这条票改成「昨天投的 5 票」：今天应该能重新投（上限是天数，不是终身）
    await db('seiyuu_votes')
      .where({ seiyuu_id: SEIYUU_B, voter_key: `u:${createdUserIds[1]}` })
      .update({ day: voteDayIndex() - 1, day_votes: 5 });
    const nextDay = await vote(userB, { seiyuuId: SEIYUU_B, choice: 'dislike' });
    expect(nextDay.response.status).toBe(200);
    expect(nextDay.data.myDayVotes).toBe(1);
    expect(nextDay.data.myVotes).toBe(6);
    expect(nextDay.data.total).toBe(6);
    expect(nextDay.data.quota.used).toBe(1);
  });

  it('不传理由时沿用原来的理由，显式传 null 才清空；换立场会丢掉旧理由', async () => {
    const cookie = await createUser();
    const first = await vote(cookie, { seiyuuId: SEIYUU_C, choice: 'like', reason: 'voice' });
    expect(first.data.myReason).toBe('voice');
    expect(first.data.myVotes).toBe(1);

    const kept = await vote(cookie, { seiyuuId: SEIYUU_C, choice: 'like' });
    expect(kept.data.myReason).toBe('voice');
    expect(kept.data.myVotes).toBe(2);

    const cleared = await vote(cookie, { seiyuuId: SEIYUU_C, choice: 'like', reason: null });
    expect(cleared.data.myReason).toBeNull();
    expect(cleared.data.myVotes).toBe(3);

    const invalid = await vote(cookie, { seiyuuId: SEIYUU_C, choice: 'like', reason: 'nope' });
    expect(invalid.data.myReason).toBeNull();

    const restored = await vote(cookie, { seiyuuId: SEIYUU_C, choice: 'like', reason: 'acting' });
    expect(restored.data.myReason).toBe('acting');
    expect(restored.data.myVotes).toBe(5);

    // 换个立场时旧理由要丢掉（预设理由是按立场分组的），票数保持不变
    const flipped = await vote(cookie, { seiyuuId: SEIYUU_C, choice: 'dislike' });
    expect(flipped.data.myVote).toBe('dislike');
    expect(flipped.data.myVotes).toBe(5);
    expect(flipped.data.myReason).toBeNull();
  });

  it('榜单只下发总票数，不下发喜欢 / 讨厌拆分，但会带自己的票数', async () => {
    const board = await request('/api/sukikirai/board', { headers: { cookie: userA } });
    expect(board.data.counts[SEIYUU_A]).toBe(1);
    expect(board.data.myVotes[SEIYUU_A]).toEqual({ choice: 'like', votes: 1, dayVotes: 1, reason: 'voice' });
    expect(board.data.myVotes[SEIYUU_B]).toBeUndefined();
    expect(board.data.quota.limit).toBe(VOTE_DAILY_LIMIT.user);
    expect(board.data.perPersonLimit).toBe(VOTE_PER_PERSON_LIMIT);
    expect(board.data.commentsEnabled).toBe(config.sukikiraiCommentsEnabled);
    expect(JSON.stringify(board.data.counts)).not.toContain('likes');
  });

  it('登录账号每天 10 票，用完之后 429', async () => {
    const cookie = await createUser();
    const seiyuuIds = Array.from({ length: 12 }, (_, index) => `test-sukikirai-quota-${stamp}-${index}`);
    try {
      for (let index = 0; index < VOTE_DAILY_LIMIT.user; index += 1) {
        const result = await vote(cookie, { seiyuuId: seiyuuIds[index], choice: 'like' });
        expect(result.response.status, `第 ${index + 1} 票`).toBe(200);
      }
      const blocked = await vote(cookie, { seiyuuId: seiyuuIds[VOTE_DAILY_LIMIT.user], choice: 'like' });
      expect(blocked.response.status).toBe(429);
      expect(blocked.data.code).toBe('VOTE_QUOTA_EXCEEDED');

      // 额度用完后改投已有票仍然允许（不加票、不消耗额度）
      const changed = await vote(cookie, { seiyuuId: seiyuuIds[0], choice: 'dislike' });
      expect(changed.response.status).toBe(200);
      expect(changed.data.myVotes).toBe(1);
      expect(changed.data.quota.remaining).toBe(0);
      expect(changed.data.quota.used).toBe(VOTE_DAILY_LIMIT.user);
    } finally {
      await db('seiyuu_vote_events').whereIn('seiyuu_id', seiyuuIds).del();
      await db('seiyuu_votes').whereIn('seiyuu_id', seiyuuIds).del();
    }
  });

  it('理由可以单独改：不加票、不消耗额度，投过一票就能选（满 5 票也只能挂一个）', async () => {
    const cookie = await createUser();
    const seiyuuId = `test-sukikirai-reason-${stamp}`;
    try {
      // 没投过票不能选理由
      const before = await request('/api/sukikirai/vote/reason', {
        method: 'POST',
        headers: { cookie },
        body: JSON.stringify({ seiyuuId, reason: 'voice' }),
      });
      expect(before.response.status).toBe(403);
      expect(before.data.code).toBe('VOTE_REQUIRED');

      // 投一票后就能选理由
      const voted = await vote(cookie, { seiyuuId, choice: 'like' });
      expect(voted.data.myVotes).toBe(1);
      const picked = await request('/api/sukikirai/vote/reason', {
        method: 'POST',
        headers: { cookie },
        body: JSON.stringify({ seiyuuId, reason: 'voice' }),
      });
      expect(picked.response.status).toBe(200);
      expect(picked.data.myReason).toBe('voice');
      expect(picked.data.myVotes).toBe(1);
      expect(picked.data.quota.used).toBe(1);

      // 先把 5 票投满，再改理由：依然能点，且票数 / 额度都不变
      for (let index = 2; index <= VOTE_PER_PERSON_LIMIT; index += 1) {
        await vote(cookie, { seiyuuId, choice: 'like' });
      }
      const full = await request(`/api/sukikirai/seiyuu/${seiyuuId}`, { headers: { cookie } });
      expect(full.data.myVotes).toBe(VOTE_PER_PERSON_LIMIT);
      const quotaUsed = full.data.quota.used;

      const changed = await request('/api/sukikirai/vote/reason', {
        method: 'POST',
        headers: { cookie },
        body: JSON.stringify({ seiyuuId, reason: 'acting' }),
      });
      expect(changed.response.status).toBe(200);
      expect(changed.data.myReason).toBe('acting');
      expect(changed.data.myVotes).toBe(VOTE_PER_PERSON_LIMIT);
      expect(changed.data.quota.used).toBe(quotaUsed);

      // 量词非法 / 不属于该立场 -> 当作没选；显式 null -> 清空
      const invalid = await request('/api/sukikirai/vote/reason', {
        method: 'POST',
        headers: { cookie },
        body: JSON.stringify({ seiyuuId, reason: 'nonsense' }),
      });
      expect(invalid.data.myReason).toBeNull();
      const restored = await request('/api/sukikirai/vote/reason', {
        method: 'POST',
        headers: { cookie },
        body: JSON.stringify({ seiyuuId, reason: 'acting' }),
      });
      expect(restored.data.myReason).toBe('acting');
      const cleared = await request('/api/sukikirai/vote/reason', {
        method: 'POST',
        headers: { cookie },
        body: JSON.stringify({ seiyuuId, reason: null }),
      });
      expect(cleared.data.myReason).toBeNull();
      expect(cleared.data.myVotes).toBe(VOTE_PER_PERSON_LIMIT);
    } finally {
      await db('seiyuu_vote_events').where({ seiyuu_id: seiyuuId }).del();
      await db('seiyuu_votes').where({ seiyuu_id: seiyuuId }).del();
    }
  });

  it('日/周/月/总榜分别按时间窗聚合流水', async () => {
    const cookie = await createUser();
    const seiyuuId = `test-sukikirai-range-${stamp}`;
    const today = voteDayIndex();
    const inWeek = today - 3;
    const inMonthOnly = today - 20;
    const beforeMonth = today - 40;
    try {
      await db('seiyuu_votes').insert({
        seiyuu_id: seiyuuId,
        voter_key: `u:${createdUserIds[createdUserIds.length - 1]}`,
        voter_kind: 'user',
        choice: 'like',
        votes: 4,
        day: today,
        day_votes: 3,
        created_at: Date.now(),
        updated_at: Date.now(),
      });
      // 今天 1 票、3 天前 1 票、20 天前 1 票、40 天前 1 票（已超出所有窗口）
      const events = [
        { day: today, delta: 1 },
        { day: inWeek, delta: 1 },
        { day: inMonthOnly, delta: 1 },
        { day: beforeMonth, delta: 1 },
      ];
      for (const event of events) {
        await db('seiyuu_vote_events').insert({
          seiyuu_id: seiyuuId,
          voter_key: 'test-range-voter',
          voter_kind: 'guest',
          choice: 'like',
          votes_delta: event.delta,
          day: event.day,
          created_at: Date.now(),
        });
      }
      // 直接写库绕过了投票接口，手动失效票数缓存（否则会读到上一个用例留下的 30 秒缓存）
      await invalidateVoteCaches();

      const board = async (range: string) => {
        const result = await request(`/api/sukikirai/board?range=${range}`, { headers: { cookie } });
        expect(result.response.status).toBe(200);
        expect(result.data.range).toBe(range);
        return Number(result.data.counts[seiyuuId] ?? 0);
      };
      expect(await board('day')).toBe(1);
      expect(await board('week')).toBe(2);
      expect(await board('month')).toBe(3);
      // 总榜看 seiyuu_votes 的累计票数（4 票，含 40 天前那票）
      expect(await board('all')).toBe(4);
      // 非法值回落到总榜
      const fallback = await request('/api/sukikirai/board?range=década', { headers: { cookie } });
      expect(fallback.data.range).toBe('all');
    } finally {
      await db('seiyuu_vote_events').where({ seiyuu_id: seiyuuId }).del();
      await db('seiyuu_votes').where({ seiyuu_id: seiyuuId }).del();
    }
  });

  it('额度分档：管理员 50 票，累计满 100 票的老用户 20 票', async () => {
    const adminBoard = await request('/api/sukikirai/board', { headers: { cookie: admin } });
    expect(adminBoard.data.quota.tier).toBe('admin');
    expect(adminBoard.data.quota.limit).toBe(VOTE_DAILY_LIMIT.admin);

    const veteran = await createUser();
    const userId = createdUserIds[createdUserIds.length - 1];
    const seiyuuId = `test-sukikirai-veteran-${stamp}`;
    try {
      await db('seiyuu_votes').insert({
        seiyuu_id: seiyuuId,
        voter_key: `u:${userId}`,
        voter_kind: 'user',
        choice: 'like',
        votes: VOTE_VETERAN_THRESHOLD,
        day: voteDayIndex() - 5,
        day_votes: 0,
        created_at: Date.now(),
        updated_at: Date.now(),
      });
      const board = await request('/api/sukikirai/board', { headers: { cookie: veteran } });
      expect(board.data.quota.tier).toBe('veteran');
      expect(board.data.quota.limit).toBe(VOTE_DAILY_LIMIT.veteran);
      expect(board.data.quota.cumulativeVotes).toBe(VOTE_VETERAN_THRESHOLD);
      expect(board.data.quota.used).toBe(0);
    } finally {
      await db('seiyuu_votes').where({ seiyuu_id: seiyuuId }).del();
    }
  });

  it('彩蛋人物也能正常投票（服务端不认名册，只看 id 格式）', async () => {
    const cookie = await createUser();
    const eggId = `test-sukikirai-egg-${stamp}`;
    try {
      const voted = await vote(cookie, { seiyuuId: eggId, choice: 'like', reason: 'vibe' });
      expect(voted.response.status).toBe(200);
      expect(voted.data.myVote).toBe('like');
      expect(voted.data.myReason).toBe('vibe');
      const board = await request('/api/sukikirai/board', { headers: { cookie } });
      expect(board.data.counts[eggId]).toBe(1);
      expect(board.data.myVotes[eggId]).toEqual({
        choice: 'like',
        votes: 1,
        dayVotes: 1,
        reason: 'vibe',
      });
      // 累计票数会进 quota（彩蛋开关按它解锁，匿名也算）
      expect(board.data.quota.cumulativeVotes).toBe(1);
    } finally {
      await db('seiyuu_vote_events').where({ seiyuu_id: eggId }).del();
      await db('seiyuu_votes').where({ seiyuu_id: eggId }).del();
    }
  });

  it('非法声优 id 被参数校验挡住', async () => {
    const bad = await vote(userA, { seiyuuId: 'Not Valid!', choice: 'like' });
    expect(bad.response.status).toBe(400);
  });

  it('短评开关：关着就是 FEATURE_DISABLED，开着则直接进自动审核链路', async () => {
    const posted = await request('/api/sukikirai/comments', {
      method: 'POST',
      headers: { cookie: userA },
      body: JSON.stringify({ seiyuuId: SEIYUU_A, body: '测试短评内容' }),
    });
    if (!config.sukikiraiCommentsEnabled) {
      expect(posted.response.status).toBe(403);
      expect(posted.data.code).toBe('FEATURE_DISABLED');
      return;
    }
    // 已投票的账号应能发表；干净文案由本地引擎直接通过。
    expect(posted.response.status).toBe(201);
    expect(['approved', 'pending', 'rejected']).toContain(posted.data.status);
    expect(['approve', 'review', 'reject']).toContain(posted.data.action);
    if (posted.data.status === 'approved') {
      const listed = await request(`/api/sukikirai/seiyuu/${SEIYUU_A}`, { headers: { cookie: userA } });
      expect(listed.data.comments.some((item: { body: string }) => item.body === '测试短评内容')).toBe(true);
    }
    await db('seiyuu_vote_comments').where({ user_id: createdUserIds[0] }).del();
  });

  it('高风险短评会被自动拒绝（不消耗人工口子）', async () => {
    if (!config.sukikiraiCommentsEnabled || !config.comments.autoReject) return;
    // 先给 userB 补一张票（短评要求「必须已投票」），用直接写库避免影响别的额度断言。
    await db('seiyuu_votes').insert({
      seiyuu_id: SEIYUU_A,
      voter_key: `u:${createdUserIds[1]}`,
      choice: 'like',
      votes: 1,
      day: voteDayIndex(),
      day_votes: 0,
      created_at: Date.now(),
      updated_at: Date.now(),
    });
    try {
      const posted = await request('/api/sukikirai/comments', {
        method: 'POST',
        headers: { cookie: userB },
        body: JSON.stringify({ seiyuuId: SEIYUU_A, body: '加微信 13800001111 领福利' }),
      });
      expect(posted.response.status).toBe(201);
      expect(posted.data.status).toBe('rejected');
      expect(posted.data.action).toBe('reject');
      expect(posted.data.auto).toBe(true);
    } finally {
      await db('seiyuu_vote_comments').where({ user_id: createdUserIds[1] }).del();
      await db('seiyuu_votes').where({ seiyuu_id: SEIYUU_A, voter_key: `u:${createdUserIds[1]}` }).del();
      await invalidateVoteCaches();
    }
  });

  it('匿名身份按 IP 记账，每天 1 票', () => {
    expect(VOTE_DAILY_LIMIT.guest).toBe(1);
    const one = voterIdentityOf({ ip: '203.0.113.9' });
    const again = voterIdentityOf({ ip: '203.0.113.9' });
    const other = voterIdentityOf({ ip: '203.0.113.10' });
    expect(one.kind).toBe('guest');
    expect(one.limit).toBe(1);
    expect(one.userId).toBeNull();
    // 键里不能出现明文 IP，且同一 IP 稳定、不同 IP 不同
    expect(one.key.startsWith('ip:')).toBe(true);
    expect(one.key).not.toContain('203.0.113');
    expect(again.key).toBe(one.key);
    expect(other.key).not.toBe(one.key);
    // IPv4-mapped IPv6 归一成同一个身份，避免换写法拿到第二份额度
    expect(voterIdentityOf({ ip: '::ffff:203.0.113.9' }).key).toBe(one.key);
    expect(voterIdentityOf({ user: { id: 42 } }).limit).toBe(VOTE_DAILY_LIMIT.user);
  });

  it('管理端可以列出、通过、驳回、删除短评', async () => {
    const [inserted] = await db('seiyuu_vote_comments')
      .insert({
        seiyuu_id: SEIYUU_A,
        user_id: createdUserIds[0],
        author_name: 'tester',
        choice: 'like',
        body: `集成测试短评 ${stamp}`,
        status: 'pending',
        created_at: Date.now(),
      })
      .returning(['id']);
    const id = Number(inserted?.id ?? inserted);

    const list = await request('/api/admin/sukikirai-comments?status=pending', {
      headers: { cookie: admin },
    });
    expect(list.response.status).toBe(200);
    expect(list.data.commentsEnabled).toBe(config.sukikiraiCommentsEnabled);
    expect(list.data.autoSummary).toBeTruthy();
    expect(list.data.items.some((item: { id: number }) => item.id === id)).toBe(true);

    const approved = await request(`/api/admin/sukikirai-comments/${id}`, {
      method: 'PATCH',
      headers: { cookie: admin },
      body: JSON.stringify({ status: 'approved', note: '集成测试' }),
    });
    expect(approved.response.status).toBe(200);
    expect(approved.data.status).toBe('approved');

    const rejected = await request(`/api/admin/sukikirai-comments/${id}`, {
      method: 'PATCH',
      headers: { cookie: admin },
      body: JSON.stringify({ status: 'rejected' }),
    });
    expect(rejected.data.status).toBe('rejected');

    const removed = await request(`/api/admin/sukikirai-comments/${id}`, {
      method: 'DELETE',
      headers: { cookie: admin },
    });
    expect(removed.response.status).toBe(200);
    expect(removed.data.ok).toBe(true);

    const missing = await request(`/api/admin/sukikirai-comments/${id}`, {
      method: 'DELETE',
      headers: { cookie: admin },
    });
    expect(missing.response.status).toBe(404);
  });
});
