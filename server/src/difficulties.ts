export const DIFFICULTY_LEVELS = [
  { key: 'beginner', sortOrder: 5, isEnabled: true },
  { key: 'easy', sortOrder: 10, isEnabled: true },
  { key: 'normal', sortOrder: 20, isEnabled: true },
  { key: 'lovelive', sortOrder: 30, isEnabled: true },
  { key: 'idolmaster', sortOrder: 40, isEnabled: true },
  { key: 'umamusume', sortOrder: 50, isEnabled: true },
  { key: 'bangdream', sortOrder: 60, isEnabled: true },
  { key: 'revuestarlight', sortOrder: 70, isEnabled: true },
] as const;

const DIFFICULTY_KEYS = new Set<string>(DIFFICULTY_LEVELS.map((difficulty) => difficulty.key));

export function isKnownDifficultyKey(key: string): boolean {
  return DIFFICULTY_KEYS.has(key);
}
