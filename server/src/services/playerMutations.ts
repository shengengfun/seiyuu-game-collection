import type { Knex } from 'knex';
import { z } from 'zod';
import { db } from '../db/knex';
import { isKnownDifficultyKey } from '../difficulties';
import { HttpError } from '../middleware/common';
import { invalidatePlayerCache } from './playerCache';

const difficultyKeySchema = z.string().trim().regex(/^[a-z0-9][a-z0-9_-]{0,31}$/);
const difficultyListSchema = z.array(difficultyKeySchema)
  .min(1)
  .max(20)
  .refine((keys) => new Set(keys).size === keys.length);

export const seiyuuSchema = z.object({
  name: z.string().trim().min(1).max(128),
  romaji: z.string().trim().max(128).default(''),
  birth_place: z.string().trim().max(64).default(''),
  agency: z.string().trim().max(128).default(''),
  birth_date: z.string().trim().regex(/^\d{4}(-\d{2}(-\d{2})?)?$/).nullable().default(null),
  debut_year: z.number().int().min(1900).max(2100).nullable().default(null),
  height: z.number().int().min(100).max(250).nullable().default(null),
  blood_type: z.string().trim().max(4).nullable().default(null),
  voice_types: z.array(z.string().trim().min(1).max(64)).max(50).default([]),
  representative_works: z.array(z.object({
    work: z.string().trim().min(1).max(128),
    character: z.string().trim().max(128).default(''),
  })).max(100).default([]),
  representative_characters: z.array(z.string().trim().min(1).max(128)).max(100).default([]),
  is_enabled: z.boolean().default(true),
  difficulties: difficultyListSchema.optional(),
});

export const importedSeiyuuSchema = seiyuuSchema.extend({
  is_enabled: z.boolean().optional(),
  is_easy: z.boolean().optional(),
});

export const seiyuuUpdateSchema = seiyuuSchema.partial().strict()
  .refine((values) => Object.keys(values).length > 0);

export const seiyuuImportSchema = z.object({
  players: z.array(importedSeiyuuSchema)
    .min(1)
    .max(1000)
    .refine((players) => new Set(players.map((s) => s.name)).size === players.length),
});

export type PlayerInput = z.infer<typeof seiyuuSchema>;
export type PlayerUpdateInput = z.infer<typeof seiyuuUpdateSchema>;
export type SeiyuuInput = z.infer<typeof seiyuuSchema>;
export type SeiyuuUpdateInput = z.infer<typeof seiyuuUpdateSchema>;
export type ImportedSeiyuuInput = z.infer<typeof importedSeiyuuSchema>;

export function assertDifficultyKeys(keys: string[]): void {
  const unique = [...new Set(keys)];
  if (unique.some((key) => !isKnownDifficultyKey(key))) {
    throw new HttpError(400, 'INVALID_DIFFICULTY');
  }
}

export async function replacePlayerDifficulties(
  executor: Knex | Knex.Transaction,
  playerId: number,
  keys: string[]
): Promise<void> {
  const unique = [...new Set(keys)];
  await executor('player_difficulties').where({ player_id: playerId }).del();
  if (unique.length) {
    await executor('player_difficulties').insert(
      unique.map((key) => ({ player_id: playerId, difficulty_key: key }))
    );
  }
}

export async function createPlayer(input: SeiyuuInput): Promise<number> {
  const exists = await db('seiyuus').where({ name: input.name }).first('id');
  if (exists) throw new HttpError(409, 'NAME_TAKEN');
  const difficulties = input.difficulties ?? ['normal'];
  assertDifficultyKeys(difficulties);
  const { difficulties: _difficulties, voice_types, representative_works, representative_characters, ...values } = input;
  const id = await db.transaction(async (trx) => {
    const [createdId] = await trx('seiyuus')
      .insert({
        ...values,
        voice_types: JSON.stringify(voice_types),
        representative_works: JSON.stringify(representative_works),
        representative_characters: JSON.stringify(representative_characters),
      })
      .returning('id')
      .then((rows) => rows.map((row: unknown) => (
        typeof row === 'object' && row !== null && 'id' in row ? row.id : row
      )));
    const playerId = Number(createdId);
    await replacePlayerDifficulties(trx, playerId, difficulties);
    return playerId;
  });
  await invalidatePlayerCache();
  return id;
}

export async function updatePlayer(id: number, input: SeiyuuUpdateInput): Promise<void> {
  await db.transaction(async (trx) => {
    const exists = await trx('seiyuus').where({ id }).first('id');
    if (!exists) throw new HttpError(404, 'SEIYUU_NOT_FOUND');
    await applyPlayerUpdate(trx, id, input);
  });
  await invalidatePlayerCache();
}

export async function applyPlayerUpdate(
  executor: Knex | Knex.Transaction,
  id: number,
  input: SeiyuuUpdateInput
): Promise<void> {
  const { difficulties, voice_types, representative_works, representative_characters, ...values } = input;
  if (difficulties) assertDifficultyKeys(difficulties);
  const updates: Record<string, unknown> = { ...values };
  if (voice_types !== undefined) updates.voice_types = JSON.stringify(voice_types);
  if (representative_works !== undefined) updates.representative_works = JSON.stringify(representative_works);
  if (representative_characters !== undefined) updates.representative_characters = JSON.stringify(representative_characters);
  if (Object.keys(updates).length) await executor('seiyuus').where({ id }).update(updates);
  if (difficulties) await replacePlayerDifficulties(executor, id, difficulties);
}

export async function deletePlayer(id: number): Promise<void> {
  const seiyuu = await db('seiyuus').where({ id }).first('id', 'is_enabled');
  if (!seiyuu) throw new HttpError(404, 'SEIYUU_NOT_FOUND');
  if (Boolean(seiyuu.is_enabled)) throw new HttpError(409, 'SEIYUU_MUST_BE_DISABLED');
  const used = await db('games').where({ target_player_id: id }).first('id');
  if (used) throw new HttpError(409, 'SEIYUU_HAS_HISTORY');
  const count = await db('seiyuus').where({ id }).del();
  if (!count) throw new HttpError(404, 'SEIYUU_NOT_FOUND');
  await invalidatePlayerCache();
}

export async function importPlayers(
  players: ImportedSeiyuuInput[]
): Promise<{ created: number; updated: number }> {
  let created = 0;
  let updated = 0;
  await db.transaction(async (trx) => {
    const names = players.map((s) => s.name);
    const existing = await trx('seiyuus')
      .whereIn('name', names)
      .select('id', 'name', 'is_enabled');
    const existingNames = new Set(existing.map((s) => String(s.name)));
    const existingEnabled = new Map(
      existing.map((s) => [String(s.name), Boolean(s.is_enabled)])
    );
    updated = players.filter((s) => existingNames.has(s.name)).length;
    created = players.length - updated;
    const desiredDifficulties = new Map<string, string[] | null>();
    const importedSeiyuus = players.map((s) => {
      const { difficulties, is_easy, voice_types, representative_works, representative_characters, ...values } = s;
      const desired = difficulties
        ?? (is_easy !== undefined
          ? ['normal', ...(is_easy ? ['easy', 'beginner'] : [])]
          : null)
        ?? (existingNames.has(s.name) ? null : ['normal']);
      desiredDifficulties.set(s.name, desired);
      return {
        ...values,
        voice_types: JSON.stringify(voice_types ?? []),
        representative_works: JSON.stringify(representative_works ?? []),
        representative_characters: JSON.stringify(representative_characters ?? []),
        is_enabled: s.is_enabled ?? existingEnabled.get(s.name) ?? true,
      };
    });
    assertDifficultyKeys([...new Set(
      [...desiredDifficulties.values()].flatMap((keys) => keys ?? [])
    )]);
    const chunkSize = 200;
    for (let index = 0; index < importedSeiyuus.length; index += chunkSize) {
      await trx('seiyuus')
        .insert(importedSeiyuus.slice(index, index + chunkSize))
        .onConflict('name')
        .merge();
    }
    const savedSeiyuus = await trx('seiyuus')
      .whereIn('name', names)
      .select('id', 'name');
    const replacementIds: number[] = [];
    const replacementMemberships: Array<{ player_id: number; difficulty_key: string }> = [];
    for (const s of savedSeiyuus) {
      const difficulties = desiredDifficulties.get(String(s.name));
      if (!difficulties) continue;
      const playerId = Number(s.id);
      replacementIds.push(playerId);
      replacementMemberships.push(
        ...[...new Set(difficulties)].map((difficultyKey) => ({
          player_id: playerId,
          difficulty_key: difficultyKey,
        }))
      );
    }
    if (replacementIds.length) {
      await trx('player_difficulties').whereIn('player_id', replacementIds).del();
      for (let index = 0; index < replacementMemberships.length; index += 500) {
        await trx('player_difficulties').insert(replacementMemberships.slice(index, index + 500));
      }
    }
  });
  await invalidatePlayerCache();
  return { created, updated };
}
