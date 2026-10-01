export interface DifficultyOption {
  key: string;
  sortOrder: number;
  enabled: boolean;
  recommended?: boolean;
}

export const DIFFICULTIES: DifficultyOption[] = [
  { key: 'beginner', sortOrder: 5, enabled: true, recommended: true },
  { key: 'easy', sortOrder: 10, enabled: true },
  { key: 'normal', sortOrder: 20, enabled: true },
  { key: 'lovelive', sortOrder: 30, enabled: true },
  { key: 'idolmaster', sortOrder: 40, enabled: true },
  { key: 'umamusume', sortOrder: 50, enabled: true },
  { key: 'bangdream', sortOrder: 60, enabled: true },
  { key: 'revuestarlight', sortOrder: 70, enabled: true },
];

export const AVAILABLE_DIFFICULTIES = DIFFICULTIES
  .filter((difficulty) => difficulty.enabled)
  .sort((a, b) => a.sortOrder - b.sortOrder);
