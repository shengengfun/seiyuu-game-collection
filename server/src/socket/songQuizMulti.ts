/**
 * 「猜歌」多人对战的 socket 层：房间表、定时器、广播。
 *
 * 协议（一问一答，全部带 ack）：
 * - `sq:create` {mode, group, difficulty, rounds} → {room}
 * - `sq:match`  {mode, group, difficulty, rounds} → {room}   随机匹配（房间标 open，进人即准备，满 2 人自动开局）
 * - `sq:join`   {roomId} → {room}
 * - `sq:leave`  {} → {ok}
 * - `sq:sync`   {} → {room|null}                            断线重连 / 刷新页面后找回房间
 * - `sq:ready`  {ready} → {room}
 * - `sq:start`  {} → {ok}                                   房主开局
 * - `sq:answer` {index, pick, correct, ms} → {ok}
 *
 * 服务端 → 客户端只有一条状态事件 `sq:room`（整份房间视图，幂等）：
 * 客户端靠 `questionIndex` / `questionEndsAt` / `status` / `results` 自行推进界面，
 * 这样丢包、重连、重复事件都不会让两边状态打架。
 *
 * 曲库只在客户端：服务端不知道题目内容，也不做正确性判断（`correct` 由客户端上报），
 * 服务端负责的是**计时、排序、算分**，保证所有人拿到同一套题（同一 seed）与同一时间轴。
 */
import { Server, Socket } from 'socket.io';
import { randomInt } from 'crypto';
import { guestNameFromKey, userNameFromUsername } from '../middleware/auth';
import { consumeRateLimit } from '../middleware/rateLimit';
import { logTransientError } from '../services/transientLog';
import {
  SQ_MULTI_DIFFICULTIES,
  SQ_MULTI_MODES,
  SQ_MULTI_QUESTION_MS,
  SQ_MULTI_REVEAL_MS,
  SQ_MULTI_ROUND_OPTIONS,
  advance,
  beginQuestion,
  canStart,
  createRoom,
  isExpired,
  joinRoom,
  leaveRoom as removePlayer,
  markDisconnected,
  playerOf,
  previewSecondsOf,
  publicRoom,
  resetRoom,
  revealQuestion,
  setReady,
  startGame,
  submitAnswer,
  type SqMultiDifficulty,
  type SqMultiMode,
  type SqMultiRoom,
} from '../services/songQuizRoomStore';

const ROOM_ID_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const ROOM_ID_LENGTH = 5;
const MAX_ROOMS = 300;
const SWEEP_INTERVAL_MS = 60_000;

interface SocketIdentity {
  key: string;
  name: string;
  userId: number | null;
}

interface SqBudget {
  questionTimer: NodeJS.Timeout | null;
  nextTimer: NodeJS.Timeout | null;
}

const rooms = new Map<string, SqMultiRoom>();
const roomIdByIdentity = new Map<string, string>();
const timers = new Map<string, SqBudget>();

/** 与声优猜的 `identityDisplayName` 同一套规则：登录用用户名，访客用 `访客#XXXXX`。 */
function displayNameOf(identity: SocketIdentity): string {
  if (identity.userId !== null) {
    return /^用户#[0-9A-Z]{5}$/.test(identity.name) ? identity.name : userNameFromUsername(identity.name);
  }
  if (identity.key.startsWith('g:')) {
    return /^访客#[0-9A-Z]{5}$/.test(identity.name)
      ? identity.name
      : guestNameFromKey(identity.key.slice(2));
  }
  return identity.name;
}

function channelOf(roomId: string): string {
  return `sq:${roomId}`;
}

function makeRoomId(): string {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    let id = '';
    for (let index = 0; index < ROOM_ID_LENGTH; index += 1) {
      id += ROOM_ID_CHARS[randomInt(ROOM_ID_CHARS.length)];
    }
    if (!rooms.has(id)) return id;
  }
  throw new Error('ROOM_ID_EXHAUSTED');
}

function budgetOf(roomId: string): SqBudget {
  const existing = timers.get(roomId);
  if (existing) return existing;
  const created: SqBudget = { questionTimer: null, nextTimer: null };
  timers.set(roomId, created);
  return created;
}

function clearTimers(roomId: string): void {
  const budget = timers.get(roomId);
  if (!budget) return;
  if (budget.questionTimer) clearTimeout(budget.questionTimer);
  if (budget.nextTimer) clearTimeout(budget.nextTimer);
  timers.delete(roomId);
}

function disposeRoom(io: Server, roomId: string): void {
  const room = rooms.get(roomId);
  clearTimers(roomId);
  rooms.delete(roomId);
  if (room) {
    for (const player of room.players) {
      if (roomIdByIdentity.get(player.key) === roomId) roomIdByIdentity.delete(player.key);
    }
  }
  io.in(channelOf(roomId)).disconnectSockets(true);
}

function broadcast(io: Server, room: SqMultiRoom, now = Date.now()): void {
  const payload = publicRoom(room, '', now);
  for (const socket of io.sockets.adapter.rooms.get(channelOf(room.id)) ?? []) {
    const socketId = socket.toString();
    const player = room.players.find((item) => item.socketId === socketId);
    io.to(socketId).emit('sq:room', {
      ...publicRoom(room, player?.key ?? '', now),
      players: payload.players.map((view) => ({ ...view, me: view.key === (player?.key ?? '') })),
    });
  }
}

function scheduleReveal(io: Server, room: SqMultiRoom, delay = SQ_MULTI_QUESTION_MS): void {
  const budget = budgetOf(room.id);
  if (budget.questionTimer) clearTimeout(budget.questionTimer);
  budget.questionTimer = setTimeout(() => {
    budget.questionTimer = null;
    reveal(io, room);
  }, Math.max(0, delay));
  budget.questionTimer.unref?.();
}

function scheduleNext(io: Server, room: SqMultiRoom): void {
  const budget = budgetOf(room.id);
  if (budget.nextTimer) clearTimeout(budget.nextTimer);
  budget.nextTimer = setTimeout(() => {
    budget.nextTimer = null;
    const { finished } = advance(room, Date.now());
    if (finished) {
      broadcast(io, room);
      return;
    }
    broadcast(io, room);
    scheduleReveal(io, room, SQ_MULTI_QUESTION_MS);
  }, SQ_MULTI_REVEAL_MS);
  budget.nextTimer.unref?.();
}

function reveal(io: Server, room: SqMultiRoom): void {
  if (room.status !== 'playing') return;
  // 同一题只揭晓一次（答卷清空后的迟到答案不得再触发一次结算）
  if (room.questionEndsAt === null) return;
  const budget = budgetOf(room.id);
  if (budget.questionTimer) {
    clearTimeout(budget.questionTimer);
    budget.questionTimer = null;
  }
  revealQuestion(room, Date.now());
  broadcast(io, room);
  scheduleNext(io, room);
}

function startRound(io: Server, room: SqMultiRoom, seed: number): void {
  startGame(room, seed, Date.now());
  beginQuestion(room, 0, Date.now());
  broadcast(io, room);
  scheduleReveal(io, room, SQ_MULTI_QUESTION_MS);
}

function maybeAutoStart(io: Server, room: SqMultiRoom): void {
  if (!room.open || room.status !== 'waiting') return;
  if (!canStart(room)) return;
  startRound(io, room, randomInt(100_000, 999_999));
}

function sweepExpired(io: Server): void {
  const now = Date.now();
  for (const [roomId, room] of [...rooms.entries()]) {
    if (isExpired(room, now)) disposeRoom(io, roomId);
  }
}

/** 启动空房间回收定时器，返回句柄供关闭流程清理。 */
export function startSongQuizRoomSweeper(io: Server): NodeJS.Timeout {
  const worker = setInterval(() => sweepExpired(io), SWEEP_INTERVAL_MS);
  worker.unref?.();
  return worker;
}

/** 房间数（给在线人数/监控用）。 */
export function songQuizRoomCount(): number {
  return rooms.size;
}

export function countSongQuizRoomsForIdentity(key: string): number {
  let count = 0;
  for (const room of rooms.values()) {
    if (room.hostKey === key) count += 1;
  }
  return count;
}

type Ack = ((payload: Record<string, unknown>) => void) | undefined;

export function registerSongQuizMulti(io: Server, socket: Socket, identity: SocketIdentity): void {
  const me = { key: identity.key, name: displayNameOf(identity) };
  const ip = String(socket.data.ip ?? '');

  const allow = async (action: string, limit: number, seconds: number): Promise<boolean> =>
    consumeRateLimit(`sq:${action}`, `${ip}:${me.key}`, limit, seconds);

  const currentRoom = (): SqMultiRoom | null => {
    const roomId = roomIdByIdentity.get(me.key);
    if (!roomId) return null;
    const room = rooms.get(roomId);
    if (!room) {
      roomIdByIdentity.delete(me.key);
      return null;
    }
    return room;
  };

  const attach = (room: SqMultiRoom): void => {
    socket.join(channelOf(room.id));
    roomIdByIdentity.set(me.key, room.id);
  };

  const modeSchema = (value: unknown): SqMultiMode | null =>
    SQ_MULTI_MODES.includes(value as SqMultiMode) ? (value as SqMultiMode) : null;
  const difficultySchema = (value: unknown): SqMultiDifficulty | null =>
    SQ_MULTI_DIFFICULTIES.includes(value as SqMultiDifficulty) ? (value as SqMultiDifficulty) : null;
  const groupSchema = (value: unknown): string | null =>
    typeof value === 'string' && /^[a-z0-9]{3,24}$/.test(value) ? value : null;
  const roundsSchema = (value: unknown): number | null =>
    SQ_MULTI_ROUND_OPTIONS.includes(Number(value) as (typeof SQ_MULTI_ROUND_OPTIONS)[number])
      ? Number(value)
      : null;

  const createAndJoin = async (
    payload: unknown,
    open: boolean,
    ack: Ack,
  ): Promise<void> => {
    const input = (payload ?? {}) as Record<string, unknown>;
    const mode = modeSchema(input.mode) ?? 'rush';
    const difficulty = difficultySchema(input.difficulty) ?? 'normal';
    const group = groupSchema(input.group);
    const rounds = roundsSchema(input.rounds) ?? 5;
    if (!group) return ack?.({ code: 'INVALID_PAYLOAD' });
    if (!(await allow('create', 6, 60))) return ack?.({ code: 'RATE_LIMITED' });
    if (rooms.size >= MAX_ROOMS) return ack?.({ code: 'TOO_MANY_ROOMS' });
    const existing = currentRoom();
    if (existing) {
      // 已经在房间里：直接返回那一间（前端自己决定要不要退）
      return ack?.({ code: 'ALREADY_IN_ROOM', room: publicRoom(existing, me.key, Date.now()) });
    }
    const now = Date.now();
    const room = createRoom({
      id: makeRoomId(),
      host: me,
      socketId: socket.id,
      mode,
      group,
      difficulty,
      rounds,
      open,
      now,
    });
    rooms.set(room.id, room);
    attach(room);
    if (open) setReady(room, me.key, true, now);
    ack?.({ room: publicRoom(room, me.key, Date.now()) });
    broadcast(io, room);
    maybeAutoStart(io, room);
  };

  socket.on('sq:create', (payload, ack) => {
    void createAndJoin(payload, false, ack).catch((err) => {
      logTransientError('[sq:create]', err);
      ack?.({ code: 'INTERNAL_ERROR' });
    });
  });

  socket.on('sq:match', (payload, ack) => {
    void (async () => {
      const existing = currentRoom();
      if (existing) return ack?.({ room: publicRoom(existing, me.key, Date.now()) });
      const input = (payload ?? {}) as Record<string, unknown>;
      const mode = modeSchema(input.mode) ?? 'rush';
      const difficulty = difficultySchema(input.difficulty) ?? 'normal';
      const group = groupSchema(input.group);
      if (!group) return ack?.({ code: 'INVALID_PAYLOAD' });
      if (!(await allow('match', 12, 60))) return ack?.({ code: 'RATE_LIMITED' });
      // 找一个还等着人的公开房间（同一分组/难度/模式才配到一起）
      const waiting = [...rooms.values()].find(
        (room) =>
          room.open &&
          room.status === 'waiting' &&
          room.group === group &&
          room.difficulty === difficulty &&
          room.mode === mode &&
          room.players.length < 4,
      );
      if (waiting) {
        const outcome = joinRoom(waiting, me, socket.id, Date.now());
        if (outcome.error) return ack?.({ code: outcome.error });
        attach(waiting);
        setReady(waiting, me.key, true, Date.now());
        broadcast(io, waiting);
        ack?.({ room: publicRoom(waiting, me.key, Date.now()) });
        maybeAutoStart(io, waiting);
        return;
      }
      await createAndJoin(payload, true, ack);
    })().catch((err) => {
      logTransientError('[sq:match]', err);
      ack?.({ code: 'INTERNAL_ERROR' });
    });
  });

  socket.on('sq:join', (payload, ack) => {
    void (async () => {
      const input = (payload ?? {}) as Record<string, unknown>;
      const roomId = typeof input.roomId === 'string' ? input.roomId.trim().toUpperCase() : '';
      if (!new RegExp(`^[${ROOM_ID_CHARS}]{${ROOM_ID_LENGTH}}$`).test(roomId)) {
        return ack?.({ code: 'INVALID_PAYLOAD' });
      }
      if (!(await allow('join', 20, 60))) return ack?.({ code: 'RATE_LIMITED' });
      const room = rooms.get(roomId);
      if (!room) return ack?.({ code: 'ROOM_NOT_FOUND' });
      const existing = currentRoom();
      if (existing && existing.id !== room.id) {
        return ack?.({ code: 'ALREADY_IN_ROOM', room: publicRoom(existing, me.key, Date.now()) });
      }
      const outcome = joinRoom(room, me, socket.id, Date.now());
      if (outcome.error) return ack?.({ code: outcome.error });
      attach(room);
      ack?.({ room: publicRoom(room, me.key, Date.now()), rejoined: Boolean(outcome.rejoined) });
      broadcast(io, room);
    })().catch((err) => {
      logTransientError('[sq:join]', err);
      ack?.({ code: 'INTERNAL_ERROR' });
    });
  });

  socket.on('sq:sync', (_payload, ack) => {
    try {
      const room = currentRoom();
      if (!room) return ack?.({ room: null });
      const outcome = joinRoom(room, me, socket.id, Date.now());
      if (outcome.error === 'STALE_CONNECTION') return ack?.({ code: outcome.error });
      attach(room);
      ack?.({ room: publicRoom(room, me.key, Date.now()) });
      broadcast(io, room);
    } catch (err) {
      logTransientError('[sq:sync]', err);
      ack?.({ code: 'INTERNAL_ERROR' });
    }
  });

  socket.on('sq:ready', (payload, ack) => {
    try {
      const room = currentRoom();
      if (!room) return ack?.({ code: 'ROOM_NOT_FOUND' });
      const ready = Boolean((payload as Record<string, unknown> | undefined)?.ready);
      if (!setReady(room, me.key, ready, Date.now())) return ack?.({ code: 'NOT_WAITING' });
      broadcast(io, room);
      ack?.({ ok: true });
      maybeAutoStart(io, room);
    } catch (err) {
      logTransientError('[sq:ready]', err);
      ack?.({ code: 'INTERNAL_ERROR' });
    }
  });

  socket.on('sq:start', (_payload, ack) => {
    void (async () => {
      const room = currentRoom();
      if (!room) return ack?.({ code: 'ROOM_NOT_FOUND' });
      if (room.hostKey !== me.key) return ack?.({ code: 'FORBIDDEN' });
      if (!canStart(room)) return ack?.({ code: 'NOT_READY' });
      if (!(await allow('start', 12, 60))) return ack?.({ code: 'RATE_LIMITED' });
      startRound(io, room, randomInt(100_000, 999_999));
      ack?.({ ok: true });
    })().catch((err) => {
      logTransientError('[sq:start]', err);
      ack?.({ code: 'INTERNAL_ERROR' });
    });
  });

  socket.on('sq:answer', (payload, ack) => {
    try {
      const room = currentRoom();
      if (!room) return ack?.({ code: 'ROOM_NOT_FOUND' });
      const input = (payload ?? {}) as Record<string, unknown>;
      const outcome = submitAnswer(
        room,
        me.key,
        {
          index: Number(input.index),
          pick: Number(input.pick),
          correct: Boolean(input.correct),
          ms: Number(input.ms),
        },
        Date.now(),
      );
      if (outcome.error) return ack?.({ code: outcome.error });
      broadcast(io, room);
      ack?.({ ok: true });
      if (outcome.allAnswered) reveal(io, room);
    } catch (err) {
      logTransientError('[sq:answer]', err);
      ack?.({ code: 'INTERNAL_ERROR' });
    }
  });

  socket.on('sq:rematch', (_payload, ack) => {
    try {
      const room = currentRoom();
      if (!room) return ack?.({ code: 'ROOM_NOT_FOUND' });
      if (room.hostKey !== me.key) return ack?.({ code: 'FORBIDDEN' });
      if (room.status !== 'finished') return ack?.({ code: 'NOT_FINISHED' });
      resetRoom(room, Date.now());
      broadcast(io, room);
      ack?.({ ok: true });
      maybeAutoStart(io, room);
    } catch (err) {
      logTransientError('[sq:rematch]', err);
      ack?.({ code: 'INTERNAL_ERROR' });
    }
  });

  socket.on('sq:leave', (_payload, ack) => {
    try {
      const room = currentRoom();
      if (!room) {
        ack?.({ ok: true });
        return;
      }
      socket.leave(channelOf(room.id));
      roomIdByIdentity.delete(me.key);
      removePlayer(room, me.key, Date.now());
      ack?.({ ok: true });
      if (!room.players.length) {
        disposeRoom(io, room.id);
        return;
      }
      // 开局中途走人：剩下的题目按缺人继续（分数不作废）
      broadcast(io, room);
      if (room.status === 'playing') {
        const waiting = room.players.some((player) => player.answeredIndex !== room.questionIndex);
        if (!waiting) reveal(io, room);
      }
    } catch (err) {
      logTransientError('[sq:leave]', err);
      ack?.({ code: 'INTERNAL_ERROR' });
    }
  });

  socket.on('disconnect', () => {
    const room = currentRoom();
    if (!room) return;
    const player = playerOf(room, me.key);
    if (!player || player.socketId !== socket.id) return;
    markDisconnected(room, me.key, Date.now());
    broadcast(io, room);
    if (room.status === 'playing') {
      const waiting = room.players.some(
        (item) => item.connected && item.answeredIndex !== room.questionIndex,
      );
      if (!waiting && room.players.some((item) => item.answeredIndex === room.questionIndex)) {
        reveal(io, room);
      }
    }
  });
}
