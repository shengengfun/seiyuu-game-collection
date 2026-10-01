import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AUTO_ADVANCE_DELAY_MS,
  getAutoAdvance,
  setAutoAdvance,
  subscribeAutoAdvance,
} from './quizFlow';

describe('quizFlow（选完自动换题）', () => {
  beforeEach(() => {
    localStorage.clear();
    setAutoAdvance(true);
  });

  it('默认开启', () => {
    localStorage.clear();
    expect(getAutoAdvance()).toBe(true);
  });

  it('关掉后写入 localStorage，订阅者收到通知', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeAutoAdvance(listener);

    setAutoAdvance(false);
    expect(getAutoAdvance()).toBe(false);
    expect(localStorage.getItem('quiz-auto-advance')).toBe('off');
    expect(listener).toHaveBeenCalledTimes(1);

    setAutoAdvance(true);
    expect(localStorage.getItem('quiz-auto-advance')).toBe('on');
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
    setAutoAdvance(false);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('值没变时不会重复通知', () => {
    const listener = vi.fn();
    subscribeAutoAdvance(listener);
    setAutoAdvance(true);
    expect(listener).not.toHaveBeenCalled();
  });

  it('翻页前留一点时间给玩家看清选项', () => {
    expect(AUTO_ADVANCE_DELAY_MS).toBeGreaterThan(0);
    expect(AUTO_ADVANCE_DELAY_MS).toBeLessThan(1_000);
  });
});
