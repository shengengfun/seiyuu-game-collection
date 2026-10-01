import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LinkifiedText } from '@seiyuu/game-sdk';

describe('LinkifiedText', () => {
  it('纯文本原样输出，不产生链接', () => {
    // 注意：JSX 的双引号属性不处理 \n 转义，这里必须写成表达式
    const { container } = render(<LinkifiedText text={'第一行\n第二行'} />);
    expect(container.textContent).toBe('第一行\n第二行');
    expect(container.querySelectorAll('a')).toHaveLength(0);
  });

  it('把 http(s) 链接渲染成新标签页打开的可点链接', () => {
    render(<LinkifiedText text={'欢迎来 B 站找我：https://space.bilibili.com/10521989'} />);

    const link = screen.getByRole('link', { name: 'https://space.bilibili.com/10521989' });
    expect(link).toHaveAttribute('href', 'https://space.bilibili.com/10521989');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });

  it('行尾的中文标点不跟进链接', () => {
    render(<LinkifiedText text="主页 https://space.bilibili.com/10521989。" />);

    expect(screen.getByRole('link')).toHaveAttribute('href', 'https://space.bilibili.com/10521989');
    expect(screen.getByText(/。$/)).toBeInTheDocument();
  });

  it('公告里写的 HTML 只会当文本，不会被解析', () => {
    const { container } = render(<LinkifiedText text={'<b>加粗</b><script>alert(1)</script>'} />);
    expect(container.querySelector('b')).toBeNull();
    expect(container.querySelector('script')).toBeNull();
    expect(container.textContent).toBe('<b>加粗</b><script>alert(1)</script>');
  });
});
