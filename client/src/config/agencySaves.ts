/**
 * 「声优事务所经营」的本地存档：每个玩家 3 个手动档 + 1 个自动档。
 *
 * 存档放在 localStorage，按玩家身份分命名空间（登录用 `u:<id>`，访客用 `guest`），
 * 所以同一台机器上不同账号互不干扰，也不需要服务端参与。
 *
 * ⚠️ `AgencyState.rng` 是个闭包函数，没法 JSON 化；存档时丢掉它，
 * 读档时用 `seed + 月份 + 日志长度` 重新播种。也就是说读档之后
 * 随机数序列和原来那局不一样（对单机经营局没有实质影响）。
 */

import { mulberry32Seed, type AgencyState } from './agencySim';

/** 手动档位（3 个）+ 自动档。 */
export const AGENCY_SAVE_SLOTS = ['1', '2', '3'] as const;
export const AGENCY_AUTO_SLOT = 'auto';
export type AgencySaveSlot = (typeof AGENCY_SAVE_SLOTS)[number] | typeof AGENCY_AUTO_SLOT;

/** 全部存档位（3 个手动 + 自动）。 */
export const AGENCY_ALL_SLOTS: AgencySaveSlot[] = [...AGENCY_SAVE_SLOTS, AGENCY_AUTO_SLOT];

export interface AgencySaveMeta {
  /** 合约长度与当前月份。 */
  months: number;
  month: number;
  stage: string;
  origin: string;
  cash: number;
  reputation: number;
  /** 成员（最多记 6 位，存档列表里显示）。 */
  talents: { id: string; fame: number; veteran: boolean }[];
  units: number;
  savedAt: number;
}

interface AgencySaveFile {
  version: 1;
  meta: AgencySaveMeta;
  state: Omit<AgencyState, 'rng'>;
}

const VERSION = 1;

/** 玩家身份 → localStorage 命名空间（登录用 `u:<id>`）。 */
export function saveOwnerKey(userId?: number | string | null): string {
  return userId === undefined || userId === null ? 'guest' : `u:${userId}`;
}

function storageKey(owner: string, slot: AgencySaveSlot): string {
  return `seiyuu-agency.save.${owner}.${slot}`;
}

function readRaw(owner: string, slot: AgencySaveSlot): AgencySaveFile | null {
  try {
    const raw = window.localStorage.getItem(storageKey(owner, slot));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AgencySaveFile;
    if (!parsed || parsed.version !== VERSION || !parsed.state) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** 列表页用的摘要（读不到就是空档）。 */
export function loadSaveMeta(owner: string, slot: AgencySaveSlot): AgencySaveMeta | null {
  return readRaw(owner, slot)?.meta ?? null;
}

/** 存一局。`slot` 用 `AGENCY_AUTO_SLOT` 就是自动档。 */
export function saveGame(owner: string, slot: AgencySaveSlot, state: AgencyState): AgencySaveMeta | null {
  try {
    const { rng: _rng, ...rest } = state;
    const file: AgencySaveFile = {
      version: VERSION,
      meta: {
        months: state.months,
        month: state.month,
        stage: state.stage,
        origin: state.origin,
        cash: state.cash,
        reputation: state.reputation,
        talents: state.talents
          .slice(0, 6)
          .map((talent) => ({ id: talent.id, fame: talent.fame, veteran: talent.veteran })),
        units: state.units.length,
        savedAt: Date.now(),
      },
      state: rest,
    };
    window.localStorage.setItem(storageKey(owner, slot), JSON.stringify(file));
    return file.meta;
  } catch {
    return null;
  }
}

/** 读档（rng 重新播种）。 */
export function loadGame(owner: string, slot: AgencySaveSlot): AgencyState | null {
  const file = readRaw(owner, slot);
  if (!file) return null;
  const seed = (file.state.seed ?? 1) + file.state.month * 977 + file.state.log.length;
  return { ...(file.state as AgencyState), rng: mulberry32Seed(seed) };
}

export function clearSave(owner: string, slot: AgencySaveSlot): void {
  try {
    window.localStorage.removeItem(storageKey(owner, slot));
  } catch {
    /* 隐私模式下写不了，忽略 */
  }
}

/** 有没有任何存档（开局界面用它决定要不要显示「继续游戏」）。 */
export function hasAnySave(owner: string): boolean {
  return AGENCY_ALL_SLOTS.some((slot) => loadSaveMeta(owner, slot) !== null);
}
