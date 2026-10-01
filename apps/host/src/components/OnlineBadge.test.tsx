import { screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderAtRoute } from '../test/render';
import { OnlineBadge } from '@seiyuu/game-sdk';

describe('OnlineBadge', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('显示接口返回的在线人数', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ online: 7, sockets: 7 }) }),
    );
    renderAtRoute(<OnlineBadge />);

    expect(await screen.findByText('当前在线人数：7')).toBeInTheDocument();
  });

  it('接口失败时整块隐藏', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('offline'));
    vi.stubGlobal('fetch', fetchMock);
    const { container } = renderAtRoute(<OnlineBadge />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(container.querySelector('.online-badge')).toBeNull();
  });

  it('返回非法数值时不渲染', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ online: 'many' }) }),
    );
    const { container } = renderAtRoute(<OnlineBadge />);

    await waitFor(() => expect(fetch).toHaveBeenCalled());
    expect(container.querySelector('.online-badge')).toBeNull();
  });

  it('底部有输入栏时使用抬高样式', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ online: 3 }) }),
    );
    const { container } = renderAtRoute(<OnlineBadge raised />);

    await screen.findByText('当前在线人数：3');
    expect(container.querySelector('.online-badge.is-raised')).not.toBeNull();
  });
});
