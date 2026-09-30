import type { Knex } from 'knex';
import { db } from './knex';
import seiyuusData from './seeds/seiyuus.json';

interface SeedSeiyuu {
  name: string;
  romaji?: string;
  birth_place?: string;
  agency?: string;
  birth_date?: string;
  debut_year?: number;
  height?: number;
  blood_type?: string;
  voice_types?: string[];
  representative_works?: { work: string; character: string }[];
  representative_characters?: string[];
  difficulties?: string[];
  is_enabled?: boolean;
}

const seedSeiyuus = seiyuusData as SeedSeiyuu[];
const normalizeName = (value: string) => value.trim();

function difficulties(seiyuu: SeedSeiyuu): string[] {
  return seiyuu.difficulties?.length ? [...new Set(seiyuu.difficulties)] : ['normal'];
}

export async function insertMissingSeedSeiyuus(instance: Knex = db): Promise<number> {
  const existing = new Set(
    (await instance('seiyuus').select('name'))
      .map((s) => normalizeName(String(s.name)))
  );
  const additions = seedSeiyuus.filter(
    (seiyuu) => !existing.has(normalizeName(seiyuu.name))
  );
  if (!additions.length) return 0;

  await instance.transaction(async (trx) => {
    const inserted = await trx('seiyuus')
      .insert(additions.map((seiyuu) => ({
        name: seiyuu.name,
        romaji: seiyuu.romaji ?? '',
        birth_place: seiyuu.birth_place ?? '',
        agency: seiyuu.agency ?? '',
        birth_date: seiyuu.birth_date ?? null,
        debut_year: seiyuu.debut_year ?? null,
        height: seiyuu.height ?? null,
        blood_type: seiyuu.blood_type ?? null,
        voice_types: JSON.stringify(seiyuu.voice_types ?? []),
        representative_works: JSON.stringify(seiyuu.representative_works ?? []),
        representative_characters: JSON.stringify(seiyuu.representative_characters ?? []),
        is_enabled: seiyuu.is_enabled ?? true,
      })))
      .returning(['id', 'name']);
    const seedByName = new Map(
      additions.map((seiyuu) => [normalizeName(seiyuu.name), seiyuu])
    );
    const memberships = inserted.flatMap((seiyuu) => {
      const seed = seedByName.get(normalizeName(String(seiyuu.name)));
      return seed
        ? difficulties(seed).map((difficultyKey) => ({
            player_id: seiyuu.id,
            difficulty_key: difficultyKey,
          }))
        : [];
    });
    if (memberships.length) {
      await trx('player_difficulties')
        .insert(memberships)
        .onConflict(['player_id', 'difficulty_key'])
        .ignore();
    }
  });
  return additions.length;
}

export async function seedPlayersIfEmpty(instance: Knex = db): Promise<number> {
  const row = await instance('seiyuus').count<{ count: number | string }[]>({ count: '*' });
  if (Number(row[0]?.count ?? 0) > 0) return 0;
  return insertMissingSeedSeiyuus(instance);
}
