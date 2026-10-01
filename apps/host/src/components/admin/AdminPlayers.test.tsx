import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@seiyuu/game-sdk';
import i18n from '../../i18n';
import { renderWithProviders } from '../../test/render';
import { toast } from '@seiyuu/game-sdk';
import AdminPlayers from './AdminPlayers';

vi.mock('../../api/client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
  errMsg: vi.fn(() => 'request failed'),
}));

vi.mock('../Toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('AdminPlayers', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await i18n.changeLanguage('zh');
  });

  it('downloads the complete import-compatible player JSON', async () => {
    const exportedPlayers = [{
      name: 'export-player',
      nationality: '中国',
      region: '亚洲',
      team: 'Test',
      team_history: ['Old Test'],
      age: 24,
      role: 'Rifler',
      major_championships: 0,
      major_appearances: 1,
      difficulties: ['easy', 'normal'],
      is_active: true,
      is_enabled: true,
    }];
    vi.mocked(api.get).mockImplementation(async (url) => {
      if (url === '/admin/players/export') return { data: exportedPlayers } as never;
      return {
        data: { players: [], total: 0, page: 1, pageSize: 50, totalPages: 1 },
      } as never;
    });
    const createObjectURL = vi.fn(() => 'blob:players');
    const revokeObjectURL = vi.fn();
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectURL });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeObjectURL });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

    const user = userEvent.setup();
    renderWithProviders(<AdminPlayers />);
    await screen.findByText('0 条');
    await user.click(screen.getByRole('button', { name: '导出 JSON' }));

    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/admin/players/export'));
    expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(click).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:players');
    expect(toast.success).toHaveBeenCalledWith('已导出 1 位声优');
  });

  it('creates a seiyuu with the seiyuu payload', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: { players: [], total: 0, page: 1, pageSize: 50, totalPages: 1 },
    } as never);
    vi.mocked(api.post).mockResolvedValue({ data: { id: 9 } } as never);

    const user = userEvent.setup();
    renderWithProviders(<AdminPlayers />);
    await screen.findByText('0 条');
    await user.click(screen.getByRole('button', { name: '新增声优' }));

    const dialog = screen.getByRole('dialog');
    await user.type(within(dialog).getByLabelText('姓名 *'), '测试声优');
    await user.type(within(dialog).getByLabelText('事务所'), 'Test Agency');
    await user.type(within(dialog).getByLabelText('出生地'), '东京都');
    await user.type(within(dialog).getByLabelText('出道年份'), '2015');
    await user.click(within(dialog).getByRole('button', { name: '新增声优' }));

    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/admin/players', {
      name: '测试声优',
      romaji: '',
      birth_place: '东京都',
      agency: 'Test Agency',
      birth_date: null,
      debut_year: 2015,
      height: null,
      blood_type: null,
      voice_types: [],
      representative_characters: [],
      difficulties: ['normal'],
      is_enabled: true,
    }));
  });
});
