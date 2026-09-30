import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderAtRoute } from '../test/render';
import Portal from './Portal';

describe('Portal', () => {
  it('把每个小游戏都列成二级页面入口', () => {
    renderAtRoute(<Portal />);

    expect(screen.getByRole('heading', { level: 1, name: '声优情报站' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /声优猜/ })).toHaveAttribute('href', '/seiyu-guess');
    expect(screen.getByRole('link', { name: /SeiValue 测试/ })).toHaveAttribute(
      'href',
      '/seivalue'
    );
  });
});
