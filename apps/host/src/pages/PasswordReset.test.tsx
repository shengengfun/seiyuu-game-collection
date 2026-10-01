import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderAtRoute } from '../test/render';
import PasswordReset from './PasswordReset';

const apiPost = vi.hoisted(() => vi.fn());
const toastSuccess = vi.hoisted(() => vi.fn());
const toastError = vi.hoisted(() => vi.fn());

vi.mock('../api/client', () => ({
  api: { post: apiPost },
  errMsg: vi.fn(() => '请求失败'),
}));
vi.mock('../components/Toast', () => ({
  toast: { success: toastSuccess, error: toastError },
}));

const EMAIL = 'akina@example.com';

describe('password reset', () => {
  beforeEach(() => {
    apiPost.mockReset();
    toastSuccess.mockReset();
    toastError.mockReset();
  });

  it('sends the code first, then submits the new password with it', async () => {
    const user = userEvent.setup();
    apiPost.mockResolvedValueOnce({ data: { ok: true, retryAt: Date.now() + 60_000, serverNow: Date.now() } });
    renderAtRoute(<PasswordReset />, { route: '/password-reset', path: '/password-reset' });

    await user.type(screen.getByPlaceholderText('邮箱（注册后用于登录与找回密码）'), EMAIL);
    await user.click(screen.getByRole('button', { name: '获取验证码' }));

    expect(apiPost).toHaveBeenNthCalledWith(1, '/auth/password/code', { email: EMAIL });
    await waitFor(() => expect(toastSuccess).toHaveBeenCalled());

    // 发码后进入第二步：验证码 + 新密码 + 确认密码
    await user.type(screen.getByPlaceholderText('6 位邮箱验证码'), '246810');
    await user.type(screen.getByPlaceholderText('新密码（至少 10 位）'), 'new-long-password');
    await user.type(screen.getByPlaceholderText('确认密码'), 'new-long-password');
    apiPost.mockResolvedValueOnce({ data: { ok: true } });
    await user.click(screen.getByRole('button', { name: '设置新密码' }));

    expect(apiPost).toHaveBeenNthCalledWith(2, '/auth/password/reset', {
      email: EMAIL,
      code: '246810',
      password: 'new-long-password',
    });
    await waitFor(() => expect(toastSuccess).toHaveBeenCalledTimes(2));
  });

  it('blocks submission when the confirmation password differs', async () => {
    const user = userEvent.setup();
    apiPost.mockResolvedValueOnce({ data: { ok: true, retryAt: Date.now() + 60_000, serverNow: Date.now() } });
    renderAtRoute(<PasswordReset />, { route: '/password-reset', path: '/password-reset' });

    await user.type(screen.getByPlaceholderText('邮箱（注册后用于登录与找回密码）'), EMAIL);
    await user.click(screen.getByRole('button', { name: '获取验证码' }));
    await waitFor(() => expect(apiPost).toHaveBeenCalledTimes(1));

    await user.type(screen.getByPlaceholderText('6 位邮箱验证码'), '246810');
    await user.type(screen.getByPlaceholderText('新密码（至少 10 位）'), 'new-long-password');
    await user.type(screen.getByPlaceholderText('确认密码'), 'another-password');
    await user.click(screen.getByRole('button', { name: '设置新密码' }));

    expect(screen.getByText('两次输入的密码不一致')).toBeInTheDocument();
    expect(apiPost).toHaveBeenCalledTimes(1);
  });
});
