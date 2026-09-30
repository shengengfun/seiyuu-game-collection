import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderAtRoute } from '../test/render';
import { createRound } from '../config/songQuiz';
import type { SqMultiRoomView } from '../config/songQuizMulti';
import SongQuizMulti from './SongQuizMulti';

const apiGet = vi.hoisted(() => vi.fn());
const socketMock = vi.hoisted(() => {
  const handlers = new Map<string, Set<(payload: unknown) => void>>();
  const emitted: { event: string; payload: Record<string, unknown> }[] = [];
  const responses = new Map<string, (payload: Record<string, unknown>) => Record<string, unknown>>();
  return {
    handlers,
    emitted,
    responses,
    on(event: string, fn: (payload: unknown) => void) {
      const set = handlers.get(event) ?? new Set();
      set.add(fn);
      handlers.set(event, set);
    },
    off(event: string, fn: (payload: unknown) => void) {
      handlers.get(event)?.delete(fn);
    },
    emit(event: string, payload: Record<string, unknown>, ack?: (result: unknown) => void) {
      emitted.push({ event, payload });
      const responder = responses.get(event);
      ack?.(responder ? responder(payload) : { ok: true });
    },
    push(event: string, payload: unknown) {
      for (const fn of handlers.get(event) ?? []) fn(payload);
    },
    reset() {
      handlers.clear();
      emitted.length = 0;
      responses.clear();
    },
  };
});

vi.mock('../api/client', () => ({
  api: { get: apiGet, post: vi.fn() },
  errMsg: () => '请求失败',
}));

vi.mock('../api/socket', () => ({
  getSocket: () => socketMock,
}));

const SEED = 424242;
const GROUP = 'roselia' as const;
const DIFFICULTY = 'normal' as const;
const ROUNDS = 5;

function roomView(overrides: Partial<SqMultiRoomView> = {}): SqMultiRoomView {
  return {
    id: 'ABCDE',
    mode: 'rush',
    group: GROUP,
    difficulty: DIFFICULTY,
    rounds: ROUNDS,
    status: 'waiting',
    seed: null,
    questionIndex: -1,
    questionEndsAt: null,
    players: [
      {
        key: 'u:1',
        name: '房主',
        host: true,
        ready: false,
        score: 0,
        correct: 0,
        connected: true,
        answered: false,
        me: true,
      },
      {
        key: 'u:2',
        name: '玩家二',
        host: false,
        ready: false,
        score: 0,
        correct: 0,
        connected: true,
        answered: false,
        me: false,
      },
    ],
    results: [],
    questionCount: ROUNDS,
    serverTime: Date.now(),
    ...overrides,
  };
}

beforeEach(() => {
  socketMock.reset();
  apiGet.mockReset();
  apiGet.mockImplementation(async () => ({
    data: {
      items: [{ id: 1, previewUrl: 'https://cdn.test/1.m4a', audioUrl: '/api/song-quiz/audio?t=1', artworkUrl: '' }],
    },
  }));
  vi.spyOn(window.HTMLMediaElement.prototype, 'play').mockImplementation(function (this: HTMLMediaElement) {
    this.dispatchEvent(new Event('playing'));
    return Promise.resolve();
  });
  vi.spyOn(window.HTMLMediaElement.prototype, 'pause').mockImplementation(function (this: HTMLMediaElement) {
    this.dispatchEvent(new Event('pause'));
  });
});

const lastEmit = (event: string) => [...socketMock.emitted].reverse().find((item) => item.event === event);

async function renderMulti() {
  const user = userEvent.setup();
  renderAtRoute(<SongQuizMulti group={GROUP} difficulty={DIFFICULTY} />);
  await waitFor(() => expect(lastEmit('sq:sync')).toBeTruthy());
  return user;
}

describe('猜歌多人对战：大厅', () => {
  it('默认渲染创建 / 匹配 / 房间码三种入口', async () => {
    await renderMulti();

    expect(screen.getByRole('button', { name: /创建房间/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /随机匹配/ })).toBeInTheDocument();
    expect(screen.getByLabelText('有房间码？')).toBeInTheDocument();
    expect(screen.getByText(/开房分组：/)).toBeInTheDocument();
  });

  /** 大厅里的企划 / 分组选择器（与单人页同一样式，按类名限定躲开同名按钮）。 */
  const franchiseChip = (name: RegExp) =>
    [...document.querySelectorAll<HTMLButtonElement>('.sg-franchise .sg-chip')].find((node) =>
      name.test(node.textContent ?? '')
    )!;
  const groupButton = (name: RegExp) =>
    [...document.querySelectorAll<HTMLButtonElement>('.sg-group')].find((node) =>
      name.test(node.textContent ?? '')
    );

  it('开房前先选企划再选分组，创建房间用的是选中的分组', async () => {
    const user = await renderMulti();

    // 默认列出的是传进来的分组所属企划（邦邦）
    expect(groupButton(/Roselia/)).toBeTruthy();

    await user.click(franchiseChip(/车万/));
    expect(groupButton(/Roselia/)).toBeUndefined();
    expect(groupButton(/Yonder Voice/)).toBeTruthy();

    await user.click(groupButton(/IOSYS/)!);
    expect(screen.getByText(/开房分组：IOSYS/)).toBeInTheDocument();

    socketMock.responses.set('sq:create', () => ({ room: roomView({ group: 'iosys' }) }));
    await user.click(screen.getByRole('button', { name: /创建房间/ }));
    expect(lastEmit('sq:create')?.payload).toMatchObject({ group: 'iosys' });
  });

  it('创建房间带上当前分组、难度、模式与题量', async () => {
    const user = await renderMulti();

    await user.click(screen.getByRole('button', { name: /渐进揭示/ }));
    await user.click(screen.getByRole('button', { name: /10 首/ }));
    socketMock.responses.set('sq:create', () => ({ room: roomView({ mode: 'reveal', rounds: 10 }) }));
    await user.click(screen.getByRole('button', { name: /创建房间/ }));

    expect(lastEmit('sq:create')?.payload).toMatchObject({
      mode: 'reveal',
      group: GROUP,
      difficulty: DIFFICULTY,
      rounds: 10,
    });
    expect(await screen.findByText('ABCDE')).toBeInTheDocument();
    expect(screen.getByText('房主')).toBeInTheDocument();
  });

  it('随机匹配走 sq:match', async () => {
    const user = await renderMulti();
    await user.click(franchiseChip(/车万/));
    await user.click(groupButton(/Yonder Voice/)!);
    await user.click(screen.getByRole('button', { name: /随机匹配/ }));
    expect(lastEmit('sq:match')?.payload).toMatchObject({ group: 'yondervoice', difficulty: DIFFICULTY });
  });

  it('房间码非法时本地先拦下来', async () => {
    const user = await renderMulti();
    await user.type(screen.getByLabelText('有房间码？'), 'AB');
    await user.click(screen.getByRole('button', { name: /^加入房间$/ }));
    expect(await screen.findByText(/房间码是 5 位/)).toBeInTheDocument();
    expect(lastEmit('sq:join')).toBeUndefined();
  });

  it('服务端错误码会翻成提示', async () => {
    const user = await renderMulti();
    socketMock.responses.set('sq:create', () => ({ code: 'TOO_MANY_ROOMS' }));
    await user.click(screen.getByRole('button', { name: /创建房间/ }));
    expect(await screen.findByText(/服务器房间太多/)).toBeInTheDocument();
  });

  it('刷新页面后能把还在的房间找回来', async () => {
    socketMock.responses.set('sq:sync', () => ({ room: roomView() }));
    await renderMulti();
    expect(await screen.findByText('ABCDE')).toBeInTheDocument();
  });
});

describe('猜歌多人对战：等待开局', () => {
  const hostView = (guestReady: boolean) =>
    roomView({
      players: [
        { key: 'u:1', name: '房主', host: true, ready: false, score: 0, correct: 0, connected: true, answered: false, me: true },
        { key: 'u:2', name: '玩家二', host: false, ready: guestReady, score: 0, correct: 0, connected: true, answered: false, me: false },
      ],
    });
  const guestView = () =>
    roomView({
      players: [
        { key: 'u:1', name: '房主', host: true, ready: false, score: 0, correct: 0, connected: true, answered: false, me: false },
        { key: 'u:2', name: '玩家二', host: false, ready: false, score: 0, correct: 0, connected: true, answered: false, me: true },
      ],
    });

  it('房主视角：有人没准备时开不了局，都准备好了才能开', async () => {
    await renderMulti();
    socketMock.push('sq:room', hostView(false));
    expect(await screen.findByRole('button', { name: /开始对战/ })).toBeDisabled();

    socketMock.push('sq:room', hostView(true));
    await waitFor(() => expect(screen.getByRole('button', { name: /开始对战/ })).toBeEnabled());
  });

  it('客人视角：准备按钮会把状态发给服务端，并显示离线的人', async () => {
    const user = await renderMulti();
    socketMock.push('sq:room', guestView());

    await user.click(await screen.findByRole('button', { name: /^准备$/ }));
    expect(lastEmit('sq:ready')?.payload).toEqual({ ready: true });

    socketMock.push('sq:room', {
      ...guestView(),
      players: guestView().players.map((player) =>
        player.host
          ? { ...player, connected: false }
          : { ...player, ready: true },
      ),
    });
    expect(await screen.findByText('已离线')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /取消准备/ })).toBeInTheDocument();
  });
});

describe('猜歌多人对战：对局中', () => {
  function playingRoom(overrides: Partial<SqMultiRoomView> = {}) {
    const round = createRound(GROUP, SEED, DIFFICULTY, ROUNDS);
    return {
      round,
      view: roomView({
        status: 'playing',
        seed: SEED,
        questionIndex: 0,
        questionEndsAt: Date.now() + 20_000,
        ...overrides,
      }),
    };
  }

  it('拿到同一 seed 后本地生成题目，选项与单机一致', async () => {
    const user = await renderMulti();
    const { round, view } = playingRoom();
    socketMock.push('sq:room', view);

    await waitFor(() => expect(document.querySelectorAll('.sg-option')).toHaveLength(4));
    expect(screen.getByText('第 1 / 5 题')).toBeInTheDocument();
    const first = round.questions[0];
    for (const option of first.options) {
      expect(screen.getByText(option)).toBeInTheDocument();
    }
    expect(screen.getByText(/本题可听 30 秒/)).toBeInTheDocument();
    expect(screen.getByText('房主')).toBeInTheDocument();
  });

  it('作答时把「对错」一起报给服务端，并且不能再改', async () => {
    const user = await renderMulti();
    const { round, view } = playingRoom();
    socketMock.push('sq:room', view);
    await waitFor(() => expect(document.querySelectorAll('.sg-option')).toHaveLength(4));

    const correctIndex = round.questions[0].answer;
    const options = [...document.querySelectorAll<HTMLButtonElement>('.sg-option')];
    await user.click(options[correctIndex]);

    const emitted = lastEmit('sq:answer');
    expect(emitted?.payload).toMatchObject({ index: 0, pick: correctIndex, correct: true });
    expect(typeof emitted?.payload.ms).toBe('number');
    expect(document.querySelectorAll<HTMLButtonElement>('.sg-option')[0].disabled).toBe(true);
    expect(screen.getByText(/已提交，等其他人作答/)).toBeInTheDocument();
  });

  it('答错也会如实上报，揭晓后能看到答案与每人得分', async () => {
    const user = await renderMulti();
    const { round, view } = playingRoom();
    socketMock.push('sq:room', view);
    await waitFor(() => expect(document.querySelectorAll('.sg-option')).toHaveLength(4));

    const question = round.questions[0];
    const wrongIndex = (question.answer + 1) % 4;
    await user.click([...document.querySelectorAll<HTMLButtonElement>('.sg-option')][wrongIndex]);
    expect(lastEmit('sq:answer')?.payload).toMatchObject({ pick: wrongIndex, correct: false });

    socketMock.push('sq:room', {
      ...view,
      questionEndsAt: null,
      results: [
        {
          index: 0,
          rows: [
            { key: 'u:1', name: '房主', pick: wrongIndex, correct: false, ms: 3000, delta: 0, score: 0 },
            { key: 'u:2', name: '玩家二', pick: question.answer, correct: true, ms: 2500, delta: 158, score: 158 },
          ],
        },
      ],
      players: view.players.map((player) => ({
        ...player,
        answered: true,
        score: player.me ? 0 : 158,
        correct: player.me ? 0 : 1,
      })),
    });

    expect(await screen.findByText(/答错了/)).toBeInTheDocument();
    expect(screen.getByText('+158')).toBeInTheDocument();
    expect(screen.getByText(/几秒后进入下一题/)).toBeInTheDocument();
  });

  it('结算后显示名次，房主可以再来一局', async () => {
    const user = await renderMulti();
    socketMock.push('sq:room', roomView({
      status: 'finished',
      seed: SEED,
      questionIndex: ROUNDS - 1,
      players: [
        { key: 'u:1', name: '房主', host: true, ready: false, score: 300, correct: 2, connected: true, answered: true, me: true },
        { key: 'u:2', name: '玩家二', host: false, ready: false, score: 480, correct: 3, connected: true, answered: true, me: false },
      ],
    }));

    expect(await screen.findByText('对战结果')).toBeInTheDocument();
    const rows = [...document.querySelectorAll('.sgm-standings li')];
    expect(rows[0].textContent).toContain('玩家二');
    expect(rows[0].textContent).toContain('480');
    await user.click(screen.getByRole('button', { name: /再来一局/ }));
    expect(lastEmit('sq:rematch')).toBeTruthy();
  });

  it('退出房间会发 sq:leave 并回到大厅', async () => {
    const user = await renderMulti();
    socketMock.push('sq:room', roomView());
    await screen.findByText('ABCDE');

    await user.click(screen.getByRole('button', { name: /退出房间/ }));
    expect(lastEmit('sq:leave')).toBeTruthy();
    expect(await screen.findByRole('button', { name: /创建房间/ })).toBeInTheDocument();
  });
});
