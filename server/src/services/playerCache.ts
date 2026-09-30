import { randomInt } from 'crypto';
import { db } from '../db/knex';
import { redis, redisKey, redisPublisher, redisSubscriber } from '../redis';
import { Seiyuu } from '../types';
import { DIFFICULTY_LEVELS } from '../difficulties';

const INVALIDATE_CHANNEL = redisKey('seiyuus:invalidate');
const VERSION_KEY = redisKey('seiyuus:revision:v3');
const REFRESH_DEBOUNCE_MS = 100;

type PublicSeiyuu = { id: number; name: string };
type SearchableSeiyuu = { seiyuu: Seiyuu; search: string };
let seiyuusById = new Map<number, Seiyuu>();
let allSeiyuus: Seiyuu[] = [];
let seiyuusByDifficulty = new Map<string, Seiyuu[]>();
let searchableSeiyuus: SearchableSeiyuu[] = [];
let publicList: { version: string; seiyuus: PublicSeiyuu[] } = { version: '1', seiyuus: [] };
let refreshPromise: Promise<void> | null = null;
let refreshTimer: NodeJS.Timeout | null = null;
let refreshGeneration = 0;
let pendingVersion: string | null = null;

function normalizeSearch(value: string): string {
  return value.trim().toLocaleLowerCase();
}

function parseJsonField<T>(value: unknown, fallback: T): T {
  if (typeof value === 'string') {
    try { return JSON.parse(value) as T; } catch { return fallback; }
  }
  if (Array.isArray(value)) return value as unknown as T;
  return fallback;
}

export async function refreshPlayerCache(): Promise<void> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    let appliedGeneration = -1;
    while (appliedGeneration !== refreshGeneration) {
      const requestedGeneration = refreshGeneration;
      const [rows, memberships, storedVersion] = await Promise.all([
        db<Seiyuu>('seiyuus').orderBy('name'),
        db('player_difficulties').select('player_id', 'difficulty_key'),
        redis()?.get(VERSION_KEY) ?? Promise.resolve(null),
      ]);
      const hydrated = rows.map((seiyuu) => ({
        ...seiyuu,
        voice_types: parseJsonField<string[]>(seiyuu.voice_types, []),
        representative_works: parseJsonField<{ work: string; character: string }[]>(seiyuu.representative_works, []),
        representative_characters: parseJsonField<{ work: string; character: string }[]>(
          seiyuu.representative_characters, []
        ),
        representative_games: parseJsonField<{ work: string; character: string }[]>(
          (seiyuu as any).representative_games, []
        ),
        groups: parseJsonField<string[]>(seiyuu.groups, []),
        five_groups: parseJsonField<string[]>(seiyuu.five_groups, []),
        difficulties: [] as string[],
      }));
      const hydratedById = new Map(hydrated.map((s) => [Number(s.id), s]));
      seiyuusByDifficulty = new Map(
        DIFFICULTY_LEVELS
          .filter((d) => d.isEnabled)
          .map((d) => [d.key, [] as Seiyuu[]])
      );
      for (const membership of memberships) {
        const seiyuu = hydratedById.get(Number(membership.player_id));
        if (!seiyuu) continue;
        const difficultyKey = String(membership.difficulty_key);
        seiyuu.difficulties.push(difficultyKey);
        if (Boolean(seiyuu.is_enabled)) seiyuusByDifficulty.get(difficultyKey)?.push(seiyuu);
      }
      allSeiyuus = hydrated.filter((s) => Boolean(s.is_enabled));
      seiyuusById = new Map(hydrated.map((s) => [s.id, s]));
      searchableSeiyuus = allSeiyuus.map((s) => ({
        seiyuu: s,
        search: normalizeSearch(`${s.name}\0${s.romaji}\0${s.agency}\0${s.birth_place}`),
      }));
      publicList = {
        version: pendingVersion || storedVersion || String(Date.now()),
        seiyuus: allSeiyuus.map((s) => ({ id: s.id, name: s.name })),
      };
      pendingVersion = null;
      appliedGeneration = requestedGeneration;
    }
  })().finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
}

function schedulePlayerCacheRefresh(): void {
  refreshGeneration += 1;
  if (refreshTimer) clearTimeout(refreshTimer);
  refreshTimer = setTimeout(() => {
    refreshTimer = null;
    void refreshPlayerCache().catch((err) => console.error('[seiyuus] refresh failed', err));
  }, REFRESH_DEBOUNCE_MS);
  refreshTimer.unref?.();
}

export async function initPlayerCache(): Promise<void> {
  const client = redis();
  if (client) {
    await client.set(VERSION_KEY, '1', { NX: true });
    const subscriber = redisSubscriber();
    if (subscriber) await subscriber.subscribe(INVALIDATE_CHANNEL, schedulePlayerCacheRefresh);
  }
  await refreshPlayerCache();
}

export function getPlayer(id: number): Seiyuu | undefined {
  return seiyuusById.get(id);
}

export function getEnabledPlayer(id: number): Seiyuu | undefined {
  const seiyuu = seiyuusById.get(id);
  return seiyuu && Boolean(seiyuu.is_enabled) ? seiyuu : undefined;
}

export function getEnabledPlayers(): Seiyuu[] {
  return allSeiyuus.slice();
}

export function getDifficultyPlayers(key: string): Seiyuu[] {
  return seiyuusByDifficulty.get(key) ?? [];
}

export function pickCachedTarget(mode: string, excludedIds: ReadonlySet<number> = new Set()): Seiyuu | null {
  const pool = seiyuusByDifficulty.get(mode) ?? [];
  if (!pool.length) return null;
  const candidates = excludedIds.size
    ? pool.filter((s) => !excludedIds.has(s.id))
    : pool;
  const source = candidates.length ? candidates : pool;
  return source[randomInt(source.length)];
}

export function isDifficultyAvailable(key: string): boolean {
  const difficulty = DIFFICULTY_LEVELS.find((item) => item.key === key);
  return Boolean(difficulty?.isEnabled && (seiyuusByDifficulty.get(key)?.length ?? 0) > 0);
}

export function searchCachedPlayers(search: string, limit: number): Seiyuu[] {
  const normalized = normalizeSearch(search);
  if (!normalized) return allSeiyuus.slice(0, limit);
  const result: Seiyuu[] = [];
  for (const entry of searchableSeiyuus) {
    if (!entry.search.includes(normalized)) continue;
    result.push(entry.seiyuu);
    if (result.length >= limit) break;
  }
  return result;
}

export async function getPublicPlayerList(): Promise<typeof publicList> {
  const storedVersion = await redis()?.get(VERSION_KEY);
  if (storedVersion && storedVersion !== publicList.version) {
    pendingVersion = storedVersion;
    refreshGeneration += 1;
    if (refreshTimer) {
      clearTimeout(refreshTimer);
      refreshTimer = null;
    }
    await refreshPlayerCache();
  }
  return publicList;
}

export async function invalidatePlayerCache(): Promise<void> {
  const client = redis();
  let nextVersion = String(Date.now());
  if (client) {
    try {
      nextVersion = String(await client.incr(VERSION_KEY));
    } catch (err) {
      console.warn('[seiyuus] cache revision update failed', err instanceof Error
        ? err.message
        : err);
    }
  }
  pendingVersion = nextVersion;
  refreshGeneration += 1;
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }
  await refreshPlayerCache();
  if (client) {
    try {
      await redisPublisher()?.publish(INVALIDATE_CHANNEL, nextVersion);
    } catch (err) {
      console.warn('[seiyuus] cache invalidation notification failed', err instanceof Error
        ? err.message
        : err);
    }
  }
}
