import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import i18n from '../i18n';
import { renderWithProviders } from '../test/render';
import GameRules from './GameRules';

describe('GameRules', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('zh');
  });

  it('explains seiyuu field feedback and birth place regions', async () => {
    const user = userEvent.setup();
    renderWithProviders(<GameRules />);

    await user.click(screen.getByRole('button', { name: '游戏规则' }));

    expect(screen.getByText('事务所完全一致才是绿色，不一致是灰色。')).toBeInTheDocument();
    expect(screen.getByText('与答案相差 3 年以内显示黄色')).toBeInTheDocument();
    expect(screen.getByText('有共同代表角色显示黄色')).toBeInTheDocument();
    expect(screen.getByText('出生地按日本都道府县所在地区划分。')).toBeInTheDocument();
    expect(screen.getByText('关东地区')).toBeInTheDocument();
  });
});
