import { describe, expect, it } from 'vitest';
import {
  SQ_MULTI_BASE_POINTS,
  SQ_MULTI_QUESTION_MS,
  SQ_MULTI_RANK_BONUS,
  SQ_MULTI_SPEED_BONUS,
  advance,
  beginQuestion,
  canStart,
  createRoom,
  isExpired,
  joinRoom,
  leaveRoom,
  markDisconnected,
  previewSecondsOf,
  publicRoom,
  resetRoom,
  revealQuestion,
  setReady,
  standings,
  startGame,
  submitAnswer,
  type SqMultiRoom,
} from './songQuizRoomStore';

const NOW = 1_700_000_000_000;

function makeRoom(): SqMultiRoom {
  return createRoom({
    id: 'ABCDE',
    host: { key: 'u:1', name: '房主' },
    socketId: 'sock-1',
    mode: 'rush',
    group: 'roselia',
    difficulty: 'normal',
    rounds: 3,
    open: false,
    now: NOW,
  });
}

function withPlayers(): SqMultiRoom {
  const room = makeRoom();
  joinRoom(room, { key: 'u:2', name: '玩家二' }, 'sock-2', NOW + 10);
  return room;
}

describe('猜歌多人房间：进出与准备', () => {
  it('房主创建后是房间里的唯一玩家，并且是 host', () => {
    const room = makeRoom();
    expect(room.players).toHaveLength(1);
    expect(room.players[0]).toMatchObject({ key: 'u:1', host: true, ready: false });
    expect(room.hostKey).toBe('u:1');
    expect(room.status).toBe('waiting');
  });

  it('第二个人加入后不能开局（都没准备）', () => {
    const room = withPlayers();
    expect(room.players).toHaveLength(2);
    expect(canStart(room)).toBe(false);
    expect(setReady(room, 'u:2', true, NOW + 20)).toBe(true);
    expect(canStart(room)).toBe(true);
  });

  it('开局后不能再加入，已开局的房间返回 ROOM_IN_PROGRESS', () => {
    const room = withPlayers();
    setReady(room, 'u:2', true, NOW);
    startGame(room, 123456, NOW);
    const outcome = joinRoom(room, { key: 'u:3', name: '玩家三' }, 'sock-3', NOW);
    expect(outcome.error).toBe('ROOM_IN_PROGRESS');
  });

  it('房间满了（8 人）之后拒绝新玩家', () => {
    const room = makeRoom();
    for (let index = 2; index <= 8; index += 1) {
      expect(joinRoom(room, { key: `u:${index}`, name: `玩家${index}` }, `sock-${index}`, NOW).error)
        .toBeUndefined();
    }
    expect(joinRoom(room, { key: 'u:9', name: '玩家9' }, 'sock-9', NOW).error).toBe('ROOM_FULL');
  });

  it('同一个人重连会复用原来的座位', () => {
    const room = withPlayers();
    markDisconnected(room, 'u:2', NOW + 20);
    const outcome = joinRoom(room, { key: 'u:2', name: '玩家二' }, 'sock-2b', NOW + 30);
    expect(outcome.rejoined).toBe(true);
    expect(room.players).toHaveLength(2);
    expect(room.players[1].socketId).toBe('sock-2b');
    expect(room.players[1].connected).toBe(true);
  });

  it('旧连接还没断时，第二处连接会被判 STALE_CONNECTION', () => {
    const room = withPlayers();
    expect(joinRoom(room, { key: 'u:2', name: '玩家二' }, 'sock-2b', NOW).error).toBe('STALE_CONNECTION');
  });

  it('房主退出后房主转给还在的人', () => {
    const room = withPlayers();
    leaveRoom(room, 'u:1', NOW + 40);
    expect(room.hostKey).toBe('u:2');
    expect(room.players[0]).toMatchObject({ key: 'u:2', host: true });
  });

  it('离线的人不会挡住开局判定', () => {
    const room = withPlayers();
    setReady(room, 'u:2', true, NOW);
    markDisconnected(room, 'u:2', NOW);
    // 只剩房主一个人在线上 → 不够开
    expect(canStart(room)).toBe(false);
  });
});

describe('猜歌多人房间：答题与算分', () => {
  function playingRoom(): SqMultiRoom {
    const room = withPlayers();
    setReady(room, 'u:2', true, NOW);
    startGame(room, 424242, NOW);
    beginQuestion(room, 0, NOW);
    return room;
  }

  it('开局会清空分数并把题号置为 0', () => {
    const room = playingRoom();
    expect(room.status).toBe('playing');
    expect(room.seed).toBe(424242);
    expect(room.questionIndex).toBe(0);
    expect(room.questionEndsAt).toBe(NOW + SQ_MULTI_QUESTION_MS);
    expect(room.players.every((player) => player.score === 0)).toBe(true);
  });

  it('同一题只能答一次，题号不对或选项越界都会被拒', () => {
    const room = playingRoom();
    expect(submitAnswer(room, 'u:1', { index: 0, pick: 1, correct: true, ms: 1000 }, NOW).accepted).toBe(true);
    expect(submitAnswer(room, 'u:1', { index: 0, pick: 2, correct: false, ms: 900 }, NOW).error)
      .toBe('ALREADY_ANSWERED');
    expect(submitAnswer(room, 'u:2', { index: 0, pick: 9, correct: true, ms: 100 }, NOW).error)
      .toBe('INVALID_ANSWER');
    expect(submitAnswer(room, 'u:2', { index: 1, pick: 0, correct: true, ms: 100 }, NOW).error)
      .toBe('WRONG_QUESTION');
  });

  it('都答完会告诉调用方可以提前揭晓', () => {
    const room = playingRoom();
    expect(submitAnswer(room, 'u:1', { index: 0, pick: 0, correct: true, ms: 2000 }, NOW).allAnswered)
      .toBe(false);
    expect(submitAnswer(room, 'u:2', { index: 0, pick: 1, correct: false, ms: 3000 }, NOW).allAnswered)
      .toBe(true);
  });

  it('答对的按速度排名拿分：第一个答对额外 +50，没答对 0 分', () => {
    const room = withPlayers();
    setReady(room, 'u:2', true, NOW);
    startGame(room, 1, NOW);
    beginQuestion(room, 0, NOW);
    submitAnswer(room, 'u:1', { index: 0, pick: 0, correct: true, ms: 5_000 }, NOW);
    submitAnswer(room, 'u:2', { index: 0, pick: 1, correct: false, ms: 6_000 }, NOW);
    const result = revealQuestion(room, NOW);

    const first = result.rows.find((row) => row.key === 'u:1')!;
    const second = result.rows.find((row) => row.key === 'u:2')!;
    // 5 秒答完 → 速度分剩 (25000-5000)/25000 = 0.8
    const expected = SQ_MULTI_BASE_POINTS + Math.round(SQ_MULTI_SPEED_BONUS * 0.8) + SQ_MULTI_RANK_BONUS[0];
    expect(first.delta).toBe(expected);
    expect(first.score).toBe(expected);
    expect(second.delta).toBe(0);
    expect(room.players.find((player) => player.key === 'u:1')!.score).toBe(expected);
    expect(room.players.find((player) => player.key === 'u:1')!.correct).toBe(1);
  });

  it('第三个之后答对只有基础分，没有排名奖励', () => {
    const room = makeRoom();
    for (let index = 2; index <= 4; index += 1) {
      joinRoom(room, { key: `u:${index}`, name: `玩家${index}` }, `sock-${index}`, NOW);
    }
    for (const player of room.players) if (!player.host) player.ready = true;
    startGame(room, 1, NOW);
    beginQuestion(room, 0, NOW);
    ['u:1', 'u:2', 'u:3', 'u:4'].forEach((key, position) => {
      submitAnswer(room, key, { index: 0, pick: 0, correct: true, ms: 1_000 + position * 1_000 }, NOW);
    });
    const result = revealQuestion(room, NOW);
    const deltas = ['u:1', 'u:2', 'u:3', 'u:4'].map(
      (key) => result.rows.find((row) => row.key === key)!.delta,
    );
    const rankBonuses = [SQ_MULTI_RANK_BONUS[0], SQ_MULTI_RANK_BONUS[1], SQ_MULTI_RANK_BONUS[2], 0];
    deltas.forEach((delta, index) => {
      const speed = Math.round(SQ_MULTI_SPEED_BONUS * (1 - (1_000 + index * 1_000) / SQ_MULTI_QUESTION_MS));
      expect(delta).toBe(SQ_MULTI_BASE_POINTS + speed + rankBonuses[index]);
    });
  });

  it('没作答的人在结果里是 pick: null', () => {
    const room = playingRoom();
    submitAnswer(room, 'u:1', { index: 0, pick: 3, correct: false, ms: 4_000 }, NOW);
    const result = revealQuestion(room, NOW);
    const idle = result.rows.find((row) => row.key === 'u:2')!;
    expect(idle).toMatchObject({ pick: null, correct: false, ms: null, delta: 0 });
  });

  it('揭晓之后到下一题之前不再收答案（防止重复结算）', () => {
    const room = playingRoom();
    submitAnswer(room, 'u:1', { index: 0, pick: 0, correct: true, ms: 1_000 }, NOW);
    submitAnswer(room, 'u:2', { index: 0, pick: 0, correct: true, ms: 2_000 }, NOW);
    const result = revealQuestion(room, NOW);
    expect(result.rows).toHaveLength(2);
    const before = room.players.map((player) => player.score);

    expect(submitAnswer(room, 'u:1', { index: 0, pick: 1, correct: true, ms: 100 }, NOW).error)
      .toBe('ALREADY_REVEALED');
    expect(revealQuestion(room, NOW).rows).toHaveLength(2);
    expect(room.players.map((player) => player.score)).toEqual(before);
    expect(room.results).toHaveLength(2);
  });

  it('走完题量就结束，名次按分数排', () => {
    const room = withPlayers();
    setReady(room, 'u:2', true, NOW);
    startGame(room, 1, NOW);
    for (let index = 0; index < 3; index += 1) {
      beginQuestion(room, index, NOW);
      submitAnswer(room, 'u:2', { index, pick: 0, correct: true, ms: 1_000 }, NOW);
      revealQuestion(room, NOW);
      const { finished } = advance(room, NOW);
      if (index < 2) expect(finished).toBe(false);
      else expect(finished).toBe(true);
    }
    expect(room.status).toBe('finished');
    expect(room.questionEndsAt).toBeNull();
    expect(standings(room)[0].key).toBe('u:2');
  });

  it('再来一局：回到等待状态、分数清零', () => {
    const room = withPlayers();
    setReady(room, 'u:2', true, NOW);
    startGame(room, 1, NOW);
    beginQuestion(room, 0, NOW);
    submitAnswer(room, 'u:1', { index: 0, pick: 0, correct: true, ms: 1_000 }, NOW);
    revealQuestion(room, NOW);
    room.status = 'finished';
    resetRoom(room, NOW);
    expect(room).toMatchObject({ status: 'waiting', seed: null, questionIndex: -1, results: [] });
    expect(room.players.every((player) => player.score === 0 && player.correct === 0)).toBe(true);
  });
});

describe('猜歌多人房间：视图与回收', () => {
  it('视图里带 me 标记与「本题是否已答」，但不泄露别人选了什么', () => {
    const room = withPlayers();
    setReady(room, 'u:2', true, NOW);
    startGame(room, 1, NOW);
    beginQuestion(room, 0, NOW);
    submitAnswer(room, 'u:1', { index: 0, pick: 3, correct: false, ms: 1_000 }, NOW);
    const view = publicRoom(room, 'u:2', NOW);
    const mine = view.players.find((player) => player.me)!;
    const other = view.players.find((player) => !player.me)!;
    expect(mine.key).toBe('u:2');
    expect(mine.answered).toBe(false);
    expect(other.answered).toBe(true);
    expect(Object.keys(other)).not.toContain('pick');
    expect(view.serverTime).toBe(NOW);
    expect(view.questionCount).toBe(3);
  });

  it('渐进揭示的试听秒数逐题增长并封顶', () => {
    const room = makeRoom();
    room.mode = 'reveal';
    expect([0, 1, 2, 3, 9].map((index) => previewSecondsOf(room, index))).toEqual([5, 8, 11, 14, 20]);
    room.mode = 'rush';
    expect(previewSecondsOf(room, 3)).toBe(30);
  });

  it('没人且超时就该被回收', () => {
    const room = withPlayers();
    markDisconnected(room, 'u:1', NOW);
    markDisconnected(room, 'u:2', NOW);
    expect(isExpired(room, NOW + 60_000)).toBe(false);
    expect(isExpired(room, NOW + 3 * 60_000)).toBe(true);
  });
});
