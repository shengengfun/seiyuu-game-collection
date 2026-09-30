import { useSyncExternalStore } from 'react';

/**
 * 「选完自动换题」偏好。
 *
 * 默认**开启**：选项点下去就翻到下一题（猜歌的多人对战由服务端统一推进，不受这里影响）。
 * 关掉之后各小游戏恢复手动：答完点「下一题 / 查看结果 / 交卷」再走。
 * 存在 localStorage，跟主题、动效偏好一个路子，登录与否都生效。
 */
const STORAGE_KEY = 'quiz-auto-advance';
const listeners = new Set<() => void>();

function storedAutoAdvance(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== 'off';
  } catch {
    return true;
  }
}

let autoAdvance = storedAutoAdvance();

export function getAutoAdvance(): boolean {
  return autoAdvance;
}

export function subscribeAutoAdvance(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setAutoAdvance(enabled: boolean): void {
  if (enabled === autoAdvance) return;
  autoAdvance = enabled;
  try {
    localStorage.setItem(STORAGE_KEY, enabled ? 'on' : 'off');
  } catch {
    // 存储不可用时当前页面仍然生效
  }
  for (const listener of listeners) listener();
}

/** 组件里直接用：`const autoAdvance = useAutoAdvance();` */
export function useAutoAdvance(): boolean {
  return useSyncExternalStore(subscribeAutoAdvance, getAutoAdvance, () => true);
}

window.addEventListener('storage', (event) => {
  if (event.key !== STORAGE_KEY) return;
  const enabled = event.newValue !== 'off';
  if (enabled === autoAdvance) return;
  autoAdvance = enabled;
  for (const listener of listeners) listener();
});

/** 选项按下到翻页之间留一点时间，让玩家看见自己选了哪个。 */
export const AUTO_ADVANCE_DELAY_MS = 240;
