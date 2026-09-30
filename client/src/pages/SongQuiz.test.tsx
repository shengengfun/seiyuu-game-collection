import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderAtRoute } from '../test/render';
import { useAuth } from '../store/auth';
import { setAutoAdvance } from '../store/quizFlow';
import { SONG_DIFFICULTIES, createRound, resultCodeOf } from '../config/songQuiz';
import type { SongAnswerMap } from '../config/songQuiz';
import SongQuiz from './SongQuiz';

const apiGet = vi.hoisted(() => vi.fn());
const apiPost = vi.hoisted(() => vi.fn());

vi.mock('../api/client', () => ({
  api: { get: apiGet, post: apiPost },
  errMsg: () => '请求失败',
}));

// 多人页要连 socket；这里只给一个够用的假实现（组件只在挂载时 sync 一次）。
vi.mock('../api/socket', () => ({
  getSocket: () => ({
    on: () => undefined,
    off: () => undefined,
    emit: (_event: string, _payload: unknown, ack?: (result: unknown) => void) =>
      ack?.({ room: null }),
  }),
}));

const EASY_COUNT = SONG_DIFFICULTIES.easy.count ?? 0;

const boardPayload = {
  data: {
    difficulty: 'normal',
    items: [
      {
        rank: 1,
        displayId: '玩家#AAAA',
        score: 1234,
        correct: 10,
        total: 10,
        accuracy: 1,
        avgMs: 3200,
        groupId: 'roselia',
        me: false,
      },
    ],
    currentUser: null,
  },
};

const previewPayload = (config?: { params?: Record<string, string> }) => {
  const ids = String(config?.params?.ids ?? '')
    .split(',')
    .filter(Boolean);
  return {
    data: {
      items: ids.map((id) => ({
        id: Number(id),
        previewUrl: `https://cdn.test/${id}.m4a`,
        audioUrl: `/api/song-quiz/audio?t=${id}`,
        artworkUrl: '',
      })),
    },
  };
};

const resolveGet = async (url: string, config?: { params?: Record<string, string> }) =>
  url === '/song-quiz/leaderboard' ? boardPayload : previewPayload(config);

afterEach(() => {
  // 偏好是模块级状态，跑完一例恢复默认，避免影响后面的用例。
  setAutoAdvance(true);
});

beforeEach(() => {
  useAuth.setState({ user: null, initialized: true });
  apiGet.mockReset();
  apiPost.mockReset();
  apiGet.mockImplementation(resolveGet);
  apiPost.mockResolvedValue({ data: { best: 900, improved: true, rank: 7 } });
  vi.spyOn(window.HTMLMediaElement.prototype, 'play').mockImplementation(function (this: HTMLMediaElement) {
    this.dispatchEvent(new Event('playing'));
    return Promise.resolve();
  });
  vi.spyOn(window.HTMLMediaElement.prototype, 'pause').mockImplementation(function (this: HTMLMediaElement) {
    this.dispatchEvent(new Event('pause'));
  });
});

/**
 * 界面里「难度 / 分组 / 企划」的名字和排行榜的同名筛选按钮会撞车，
 * 所以统一用类名限定范围取元素，而不是全局按可访问名查找。
 */
function pick<T extends HTMLElement>(selector: string, name: RegExp): T {
  const found = [...document.querySelectorAll<T>(selector)].find((node) =>
    name.test((node.textContent ?? '').trim())
  );
  if (!found) throw new Error(`${selector} 里没有匹配 ${name} 的节点`);
  return found;
}

const difficultyButton = (name: RegExp) => pick<HTMLButtonElement>('.sg-diff', name);
const groupButton = (name: RegExp) => pick<HTMLButtonElement>('.sg-group', name);
const franchiseChip = (name: RegExp) => pick<HTMLButtonElement>('.sg-franchise .sg-chip', name);
const optionButtons = () => [...document.querySelectorAll<HTMLButtonElement>('.sg-option')];
const startButton = () => document.querySelector<HTMLButtonElement>('.sg-start')!;
const codeText = () => document.querySelector('.sg-code code')?.textContent ?? '';
const scoreText = () => document.querySelector('.sg-result-score')?.textContent ?? '';
const statValue = (label: string) => {
  const row = [...document.querySelectorAll('.sg-stat-row li')].find((node) =>
    node.textContent?.includes(label)
  );
  return row?.querySelector('.sg-stat-value')?.textContent ?? '';
};

async function startGame(
  user: ReturnType<typeof userEvent.setup>,
  {
    difficulty = /^轻松/,
    faction = /^BanG Dream!/,
    group = /^Roselia/,
  }: { difficulty?: RegExp; faction?: RegExp; group?: RegExp } = {}
) {
  await user.click(franchiseChip(faction));
  await user.click(difficultyButton(difficulty));
  await user.click(groupButton(group));
  await user.click(startButton());
  await screen.findByText(new RegExp(`第 1 / \\d+ 题`));
}

/** 一题一题选同一个序号（默认选 A），自动换题会自己往下翻，直到交卷。 */
async function playRound(user: ReturnType<typeof userEvent.setup>, option = 0) {
  for (let step = 0; step < EASY_COUNT; step += 1) {
    await waitFor(() => expect(optionButtons().length).toBe(4));
    await user.click(optionButtons()[option]);
    if (step + 1 < EASY_COUNT) {
      await screen.findByText(new RegExp(`第 ${step + 2} / ${EASY_COUNT} 题`));
    }
  }
  await user.click(screen.getByRole('button', { name: /交卷/ }));
  await screen.findByText('本局曲目');
}

describe('SongQuiz 大厅', () => {
  it('有单人 / 多人入口，列出四个难度，默认显示 LoveLive! 的分组', async () => {
    renderAtRoute(<SongQuiz />);

    expect(screen.getByRole('tab', { name: /单人游戏/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /多人对战/ })).toBeInTheDocument();

    const cards = [...document.querySelectorAll('.sg-diff')].map((node) => node.textContent ?? '');
    expect(cards).toHaveLength(4);
    for (const name of ['轻松', '标准', '硬核', '专家']) {
      expect(cards.some((text) => text.includes(name))).toBe(true);
    }
    expect(cards[0]).toContain(`${EASY_COUNT} 首`);
    expect(cards[3]).toContain('全曲库');
    expect(cards[3]).toContain('3 颗红心');

    expect(franchiseChip(/^LoveLive!/)).toBeInTheDocument();
    expect(groupButton(/^虹咲/)).toBeInTheDocument();
  });

  it('换企划会换掉分组列表', async () => {
    const user = userEvent.setup();
    renderAtRoute(<SongQuiz />);

    await user.click(franchiseChip(/^BanG Dream!/));
    expect(groupButton(/^Roselia/)).toBeInTheDocument();
    expect(groupButton(/^Ave Mujica/)).toBeInTheDocument();
    expect(document.querySelectorAll('.sg-group')).toHaveLength(9);
    expect(screen.queryByText('虹咲')).not.toBeInTheDocument();
  });

  it('多人页给出创建 / 匹配 / 房间码三种入口', async () => {
    const user = userEvent.setup();
    renderAtRoute(<SongQuiz />);

    await user.click(screen.getByRole('tab', { name: /多人对战/ }));
    expect(screen.getByRole('button', { name: /创建房间/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /随机匹配/ })).toBeInTheDocument();
    expect(screen.getByLabelText('有房间码？')).toBeInTheDocument();
    // 单人选项在多人页不出现
    expect(document.querySelector('.sg-start')).toBeNull();
  });

  it('全站排行榜会拉数据并渲染榜单', async () => {
    renderAtRoute(<SongQuiz />);

    expect(await screen.findByText('玩家#AAAA')).toBeInTheDocument();
    expect(screen.getByText('1234')).toBeInTheDocument();
    expect(apiGet).toHaveBeenCalledWith('/song-quiz/leaderboard', { params: { difficulty: 'normal' } });
  });
});

describe('SongQuiz 答题', () => {
  it('默认选完就自动翻到下一题，仍可以退回上一题', async () => {
    const user = userEvent.setup();
    renderAtRoute(<SongQuiz />);

    await startGame(user);
    expect(document.querySelector('audio')?.getAttribute('src')).toContain('/api/song-quiz/audio');

    await user.click(optionButtons()[0]);
    expect(await screen.findByText(`第 2 / ${EASY_COUNT} 题`)).toBeInTheDocument();
    expect(screen.getByText(`已答 1 题`)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /上一题/ }));
    expect(await screen.findByText(`第 1 / ${EASY_COUNT} 题`)).toBeInTheDocument();
  });

  it('在设置里关掉自动换题后停在原题，由玩家自己点下一题', async () => {
    setAutoAdvance(false);
    const user = userEvent.setup();
    renderAtRoute(<SongQuiz />);

    await startGame(user);
    await user.click(optionButtons()[0]);
    expect(screen.getByText(`已答 1 题`)).toBeInTheDocument();
    expect(screen.getByText(`第 1 / ${EASY_COUNT} 题`)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /下一题/ }));
    expect(await screen.findByText(`第 2 / ${EASY_COUNT} 题`)).toBeInTheDocument();
  });

  it('交卷后给出分数、速度统计与成绩码', async () => {
    const user = userEvent.setup();
    renderAtRoute(<SongQuiz />);

    await startGame(user);
    await playRound(user);

    expect(Number(scoreText())).toBeGreaterThanOrEqual(0);
    expect(document.querySelectorAll('.sg-review li')).toHaveLength(EASY_COUNT);
    expect(statValue('正确率')).toMatch(/%$/);
    expect(statValue('平均每题')).not.toBe('');
    expect(statValue('最快一题')).not.toBe('');
    expect(codeText()).toMatch(/^S\|E\|roselia\|/);
  });

  it('登录用户结算后自动上报成绩并显示排名', async () => {
    useAuth.setState({ user: { id: 5, username: 'tester', role: 'user' }, initialized: true });
    const user = userEvent.setup();
    renderAtRoute(<SongQuiz />);

    await startGame(user);
    await playRound(user);

    await waitFor(() => expect(apiPost).toHaveBeenCalledTimes(1));
    const [url, payload] = apiPost.mock.calls[0];
    expect(url).toBe('/song-quiz/scores');
    expect(payload.difficulty).toBe('easy');
    expect(payload.groupId).toBe('roselia');
    expect(payload.total).toBe(EASY_COUNT);
    expect(payload.answered).toBe(EASY_COUNT);
    expect(payload.code).toBe(codeText());
    expect(await screen.findByText(/第 7 名/)).toBeInTheDocument();
  });

  it('未登录时不提交成绩，只提示登录', async () => {
    const user = userEvent.setup();
    renderAtRoute(<SongQuiz />);

    await startGame(user);
    await playRound(user);

    expect(screen.getByText('登录后成绩会进入全站排行榜。')).toBeInTheDocument();
    expect(apiPost).not.toHaveBeenCalled();
  });

  it('专家模式：答错立刻扣红心并亮出答案，三颗用完自动结算', async () => {
    // randomSeed() = floor(random * 900000) + 100000，固定成 100000 就能预知正解位置。
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const user = userEvent.setup();
    renderAtRoute(<SongQuiz />);

    await startGame(user, { difficulty: /^专家/ });
    expect(screen.getByLabelText('还剩 3 颗红心')).toBeInTheDocument();

    const round = createRound('roselia', 100000, 'expert');
    for (let step = 0; step < 3; step += 1) {
      const answer = round.questions[step].answer;
      await waitFor(() => expect(optionButtons().length).toBe(4));
      await user.click(optionButtons()[(answer + 1) % 4]);
      expect(await screen.findByText(/答错了/)).toBeInTheDocument();
      const left = 2 - step;
      if (left > 0) {
        expect(screen.getByLabelText(`还剩 ${left} 颗红心`)).toBeInTheDocument();
        await screen.findByText(new RegExp(`第 ${step + 2} / \\d+ 题`), {}, { timeout: 4000 });
      }
    }

    // 三颗红心耗尽 → 自动交卷
    expect(await screen.findByText('本局曲目', {}, { timeout: 5000 })).toBeInTheDocument();
    expect(statValue('剩余红心')).toBe('0 / 3');
    expect(document.querySelectorAll('.sg-review li')).toHaveLength(3);
    vi.restoreAllMocks();
  }, 20000);

  it('查询成绩码能还原整局，且不会提交分数', async () => {
    const user = userEvent.setup();
    renderAtRoute(<SongQuiz />);

    const round = createRound('muse', 654321, 'easy');
    const answers: SongAnswerMap = {};
    for (const question of round.questions) answers[question.song.id] = { picked: question.answer };
    const code = resultCodeOf(round, answers, 66_000);

    await user.type(screen.getByLabelText('查询成绩'), code);
    await user.click(screen.getByRole('button', { name: /^查询$/ }));

    expect(await screen.findByText('本局曲目')).toBeInTheDocument();
    expect(codeText()).toBe(code);
    expect(statValue('正确率')).toBe('100%');
    expect(document.querySelectorAll('.sg-review li')).toHaveLength(EASY_COUNT);
    expect(apiPost).not.toHaveBeenCalled();
  });

  it('成绩码不合法时给出提示', async () => {
    const user = userEvent.setup();
    renderAtRoute(<SongQuiz />);

    await user.type(screen.getByLabelText('查询成绩'), 'S|N|nope|1a|2b|3c');
    await user.click(screen.getByRole('button', { name: /^查询$/ }));
    expect(await screen.findByText('成绩码格式不正确。')).toBeInTheDocument();
  });

  it('拿不到试听时给出提示且播放按钮不可点', async () => {
    apiGet.mockImplementation(async (url: string) =>
      url === '/song-quiz/leaderboard' ? boardPayload : { data: { items: [] } }
    );
    const user = userEvent.setup();
    renderAtRoute(<SongQuiz />);

    await startGame(user);
    expect(await screen.findByText(/这首暂时拿不到试听/)).toBeInTheDocument();
    expect(document.querySelector<HTMLButtonElement>('.sg-play')!.disabled).toBe(true);
  });

  it('试听接口失败时可以重试', async () => {
    apiGet.mockImplementation(async (url: string) => {
      if (url === '/song-quiz/leaderboard') return boardPayload;
      throw new Error('boom');
    });
    const user = userEvent.setup();
    renderAtRoute(<SongQuiz />);

    await startGame(user);
    expect(await screen.findByText(/试听加载失败/)).toBeInTheDocument();

    apiGet.mockImplementation(resolveGet);
    const player = document.querySelector('.sg-player') as HTMLElement;
    await user.click(within(player).getByRole('button', { name: /重试/ }));
    await waitFor(() =>
      expect(document.querySelector<HTMLButtonElement>('.sg-play')!.disabled).toBe(false)
    );
  });
});
