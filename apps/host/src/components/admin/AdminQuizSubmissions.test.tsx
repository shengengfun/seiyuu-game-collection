import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { api } from '@seiyuu/game-sdk';
import i18n from '../../i18n';
import { renderWithProviders } from '../../test/render';
import AdminQuizSubmissions from './AdminQuizSubmissions';

vi.mock('../../api/client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
  errMsg: vi.fn(() => 'request failed'),
}));

const submission = {
  id: 12,
  seiyuuId: 'kohinata-mika',
  seiyuuName: '小日向美香',
  level: 'normal',
  prompt: '她在《MyGO!!!!!》中为哪位角色配音？',
  options: ['长崎素世', '高松灯', '千早爱音', '要乐奈'],
  answer: 0,
  explain: '她为长崎素世配音。',
  source: '官方主页',
  submitterName: 'aniki',
  status: 'pending',
  reviewNote: null,
  createdAt: '2026-09-22 18:00:00',
};

describe('AdminQuizSubmissions', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await i18n.changeLanguage('zh');
    vi.mocked(api.get).mockResolvedValue({
      data: { items: [submission], total: 1, page: 1, pageSize: 20, totalPages: 1 },
    } as never);
  });

  it('摊开题目并把正确答案标出来', async () => {
    renderWithProviders(<AdminQuizSubmissions />);

    expect(await screen.findByText('她在《MyGO!!!!!》中为哪位角色配音？')).toBeInTheDocument();
    expect(screen.getByText('小日向美香')).toBeInTheDocument();
    expect(screen.getByText('她为长崎素世配音。')).toBeInTheDocument();
    expect(screen.getByText('官方主页')).toBeInTheDocument();

    const options = document.querySelectorAll('.admin-quiz-submission-options > li');
    expect(options).toHaveLength(4);
    // 正答是第 1 项（answer: 0），只有它带 is-answer
    expect(options[0].className).toContain('is-answer');
    expect(document.querySelectorAll('.admin-quiz-submission-options > li.is-answer')).toHaveLength(1);
  });

  it('通过投稿时带上审核备注，并刷新列表', async () => {
    const user = userEvent.setup();
    vi.mocked(api.patch).mockResolvedValue({ data: { id: 12, status: 'approved' } } as never);

    renderWithProviders(<AdminQuizSubmissions />);
    await screen.findByText('她在《MyGO!!!!!》中为哪位角色配音？');

    await user.type(screen.getByPlaceholderText('填写通过或驳回的理由，最多 500 字'), '核实过官方主页');
    await user.click(screen.getByRole('button', { name: '通过并上架' }));

    const dialog = await screen.findByRole('alertdialog');
    expect(within(dialog).getByText('通过这条投稿？')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: '通过并上架' }));

    expect(api.patch).toHaveBeenCalledWith('/admin/quiz-submissions/12', {
      status: 'approved',
      note: '核实过官方主页',
    });
    // 审核成功后要重新拉一次列表
    expect(vi.mocked(api.get).mock.calls.length).toBeGreaterThan(1);
  });

  it('驳回投稿前弹确认框，取消后不发请求', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AdminQuizSubmissions />);
    await screen.findByText('她在《MyGO!!!!!》中为哪位角色配音？');

    await user.click(screen.getByRole('button', { name: '驳回' }));
    const dialog = await screen.findByRole('alertdialog');
    expect(within(dialog).getByText('驳回这条投稿？')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: '取消' }));

    expect(api.patch).not.toHaveBeenCalled();
  });
});
