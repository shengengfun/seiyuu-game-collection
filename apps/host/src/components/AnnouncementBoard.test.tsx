import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { api } from '@seiyuu/game-sdk';
import { renderAtRoute } from '../test/render';
import AnnouncementBoard from './AnnouncementBoard';

vi.mock('../api/client', () => ({
  api: { get: vi.fn() },
}));

const get = vi.mocked(api.get);

const SEEN_KEY = 'csgofriberg.announcement-board-seen';

function localToday(): string {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

describe('AnnouncementBoard', () => {
  beforeEach(() => {
    get.mockReset();
    localStorage.clear();
  });

  it('当天第一次打开时自动展开，并记下当天已看过', async () => {
    get.mockResolvedValue({
      data: [
        { id: 1, title: '第一条公告', content: '公告内容', is_pinned: 1, show_in_board: 1, created_at: '2026-09-22 10:00:00' },
      ],
    } as never);

    const { container } = renderAtRoute(<AnnouncementBoard />);

    expect(await screen.findByText('公告内容')).toBeInTheDocument();
    expect(container.querySelector('.announcement-board-panel')).not.toBeNull();
    expect(localStorage.getItem(SEEN_KEY)).toBe(localToday());
  });

  it('同一天再次打开时默认收起成小胶囊', async () => {
    localStorage.setItem(SEEN_KEY, localToday());
    get.mockResolvedValue({
      data: [
        { id: 1, title: '第一条公告', content: '公告内容', is_pinned: 0, show_in_board: 1, created_at: '2026-09-22 10:00:00' },
      ],
    } as never);

    const user = userEvent.setup();
    const { container } = renderAtRoute(<AnnouncementBoard />);

    const toggle = await screen.findByRole('button', { name: /公告栏/ });
    expect(container.querySelector('.announcement-board-panel')).toBeNull();

    await user.click(toggle);
    expect(await screen.findByText('公告内容')).toBeInTheDocument();

    // 收起按钮把面板关掉
    fireEvent.click(screen.getByRole('button', { name: '收起公告栏' }));
    await waitFor(() => expect(container.querySelector('.announcement-board-panel')).toBeNull());
  });

  it('过滤掉关闭了「显示在公告栏」的公告', async () => {
    get.mockResolvedValue({
      data: [
        { id: 1, title: '只看公告列表', content: '不该出现在公告栏', show_in_board: false },
        { id: 2, title: '正常公告', content: '应该出现', show_in_board: 1 },
      ],
    } as never);

    renderAtRoute(<AnnouncementBoard />);
    expect(await screen.findByText('应该出现')).toBeInTheDocument();
    expect(screen.queryByText('不该出现在公告栏')).not.toBeInTheDocument();
  });

  it('没有公告时整块不渲染', async () => {
    get.mockResolvedValue({ data: [] } as never);
    const { container } = renderAtRoute(<AnnouncementBoard />);

    await waitFor(() => expect(get).toHaveBeenCalledWith('/announcements'));
    expect(container.querySelector('.announcement-board')).toBeNull();
  });

  it('接口失败时不渲染并且不写已读标记', async () => {
    get.mockRejectedValue(new Error('offline'));
    const { container } = renderAtRoute(<AnnouncementBoard />);

    await waitFor(() => expect(get).toHaveBeenCalled());
    expect(container.querySelector('.announcement-board')).toBeNull();
    expect(localStorage.getItem(SEEN_KEY)).toBeNull();
  });
});
