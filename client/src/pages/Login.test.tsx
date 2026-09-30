import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderAtRoute } from '../test/render';
import Login from './Login';

const apiPost = vi.hoisted(() => vi.fn());
const powProgress = vi.hoisted(() => ({ active: false, percent: 0 }));

vi.mock('../api/client', () => ({
  api: { post: apiPost },
  errMsg: vi.fn(() => '请求失败'),
}));
vi.mock('../api/socket', () => ({ closeSocket: vi.fn(), getSocket: vi.fn() }));
vi.mock('../api/session', () => ({ markAuthenticated: vi.fn() }));
vi.mock('../components/Toast', () => ({ toast: { error: vi.fn() } }));
vi.mock('../api/pow', () => ({
  getPowProgress: () => powProgress,
  subscribePowProgress: () => () => undefined,
}));

describe('registration validation', () => {
  beforeEach(() => {
    apiPost.mockReset();
  });

  it('shows actionable errors beside every invalid registration field', async () => {
    const user = userEvent.setup();
    renderAtRoute(<Login />, { route: '/login', path: '/login' });

    await user.click(screen.getByRole('button', { name: '没有账号？去注册' }));
    const username = screen.getByPlaceholderText('用户名');
    await user.type(username, 'bad name');
    await user.type(screen.getByPlaceholderText('密码（至少 10 位）'), 'short');
    await user.type(screen.getByPlaceholderText('确认密码'), 'different');
    await user.type(screen.getByPlaceholderText('邮箱（注册后用于登录与找回密码）'), 'invalid-email');
    await user.type(screen.getByPlaceholderText('6 位邮箱验证码'), '12');
    await user.click(screen.getByRole('button', { name: '注册' }));

    expect(screen.getByText('用户名只能包含字母、数字、下划线、连字符和中文')).toBeInTheDocument();
    expect(screen.getByText('密码长度必须为 10-128 个字符')).toBeInTheDocument();
    expect(screen.getByText('两次输入的密码不一致')).toBeInTheDocument();
    expect(screen.getByText('请输入有效的邮箱地址，例如 name@example.com')).toBeInTheDocument();
    expect(screen.getByText('验证码是 6 位数字')).toBeInTheDocument();
    expect(username).toHaveFocus();
    expect(apiPost).not.toHaveBeenCalled();

    await user.clear(username);
    await user.type(username, 'a');
    await user.click(screen.getByRole('button', { name: '注册' }));
    expect(screen.getByText('用户名长度必须为 2-20 个字符')).toBeInTheDocument();
  });

  it('requires an email code before submitting the registration', async () => {
    const user = userEvent.setup();
    renderAtRoute(<Login />, { route: '/login', path: '/login' });

    await user.click(screen.getByRole('button', { name: '没有账号？去注册' }));
    await user.type(screen.getByPlaceholderText('用户名'), 'akina');
    await user.type(screen.getByPlaceholderText('密码（至少 10 位）'), 'long-enough-password');
    await user.type(screen.getByPlaceholderText('确认密码'), 'long-enough-password');
    await user.type(screen.getByPlaceholderText('邮箱（注册后用于登录与找回密码）'), 'akina@example.com');
    await user.click(screen.getByRole('button', { name: '注册' }));

    expect(screen.getByText('请输入邮箱验证码')).toBeInTheDocument();
    expect(apiPost).not.toHaveBeenCalled();

    apiPost.mockResolvedValueOnce({ data: { user: { id: 1, username: 'akina', role: 'user' } } });
    await user.type(screen.getByPlaceholderText('6 位邮箱验证码'), '246810');
    await user.click(screen.getByRole('button', { name: '注册' }));

    expect(apiPost).toHaveBeenCalledWith('/auth/register', {
      username: 'akina',
      password: 'long-enough-password',
      email: 'akina@example.com',
      code: '246810',
    });
  });
});
