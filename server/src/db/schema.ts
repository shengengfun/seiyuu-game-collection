import { Knex } from 'knex';
import { db } from './knex';
import crypto from 'crypto';
import { config } from '../config';
import { guestNameFromKey, userNameFromUsername } from '../services/identityDisplay';
import { DIFFICULTY_LEVELS } from '../difficulties';
import { winningGuessMetricsByPlayer } from '../services/matchGuessMetrics';

const FIRST_GUESS_BACKFILL_BATCH_SIZE = 1000;
const USER_DISPLAY_ID_BACKFILL_BATCH_SIZE = 1000;
const DISPLAY_ID_FILTER_SYNC_BATCH_SIZE = 1000;
const PLAYER_DIFFICULTIES_BACKFILL_MIGRATION = '20260724-player-difficulties-backfill';
const MULTI_WINNING_GUESSES_BACKFILL_MIGRATION = '20260729-multi-winning-guesses-backfill';
const MULTI_WINNING_GUESSES_BACKFILL_BATCH_SIZE = 200;

export async function backfillLegacyPlayerDifficulties(instance: Knex = db): Promise<void> {
  // 检查旧版 players 表是否有 is_easy 列需要迁移
  if (!(await instance.schema.hasTable('players'))) return;
  if (!(await instance.schema.hasColumn('players', 'is_easy'))) return;
  await instance.transaction(async (trx) => {
    const applied = await trx('app_migrations')
      .where({ name: PLAYER_DIFFICULTIES_BACKFILL_MIGRATION })
      .first();
    if (applied) return;

    const players = await trx('players').select('id', 'is_easy', 'nickname');
    // 通过 nickname 映射到 seiyuus 的 name
    const seiyuus = await trx('seiyuus').select('id', 'name');
    const nameToId = new Map(seiyuus.map((s: { id: number; name: string }) => [s.name, s.id]));

    const memberships = players.flatMap((player) => {
      const seiyuuId = nameToId.get(player.nickname);
      if (!seiyuuId) return [];
      return [
        { player_id: seiyuuId, difficulty_key: 'normal' },
        ...(Boolean(player.is_easy) ? [{ player_id: seiyuuId, difficulty_key: 'easy' }] : []),
      ];
    });
    for (let index = 0; index < memberships.length; index += 500) {
      await trx('player_difficulties')
        .insert(memberships.slice(index, index + 500))
        .onConflict(['player_id', 'difficulty_key'])
        .ignore();
    }
    await trx('app_migrations')
      .insert({ name: PLAYER_DIFFICULTIES_BACKFILL_MIGRATION })
      .onConflict('name')
      .ignore();
  });
}

async function backfillUserDisplayIds(instance: Knex): Promise<void> {
  let cursor = 0;
  while (true) {
    const users = await instance('users')
      .select('id', 'username')
      .where('id', '>', cursor)
      .where((builder) => builder.whereNull('display_id').orWhere('display_id', ''))
      .orderBy('id')
      .limit(USER_DISPLAY_ID_BACKFILL_BATCH_SIZE);
    if (!users.length) return;
    cursor = Number(users[users.length - 1].id);
    await instance.transaction(async (trx) => {
      for (const user of users) {
        await trx('users').where({ id: user.id }).update({
          display_id: userNameFromUsername(user.username),
        });
      }
    });
  }
}

function firstGuessPlayerId(value: unknown): number {
  try {
    const guesses = JSON.parse(String(value));
    if (!Array.isArray(guesses) || !guesses.length) return 0;
    const first = guesses[0];
    const id = Number(
      typeof first === 'object' && first
        ? (first as { playerId?: unknown }).playerId
        : first
    );
    return Number.isInteger(id) && id > 0 ? id : 0;
  } catch {
    return 0;
  }
}

async function backfillFirstGuessPlayerIds(instance: Knex): Promise<void> {
  let cursor = 0;
  while (true) {
    const rows = await instance('games')
      .select('id', 'guesses')
      .where('id', '>', cursor)
      .whereNull('first_guess_player_id')
      .where('guess_count', '>', 0)
      .whereNot('status', 'playing')
      .orderBy('id')
      .limit(FIRST_GUESS_BACKFILL_BATCH_SIZE);
    if (!rows.length) return;
    cursor = Number(rows[rows.length - 1].id);

    const grouped = new Map<number, number[]>();
    for (const row of rows) {
      const playerId = firstGuessPlayerId(row.guesses);
      const ids = grouped.get(playerId) ?? [];
      ids.push(Number(row.id));
      grouped.set(playerId, ids);
    }
    await instance.transaction(async (trx) => {
      for (const [playerId, ids] of grouped) {
        await trx('games').whereIn('id', ids).update({ first_guess_player_id: playerId });
      }
    });
  }
}

async function syncFilteredDisplayIds(instance: Knex): Promise<void> {
  const revision = crypto
    .createHash('sha256')
    .update('display-id-filter-v1\0', 'ascii')
    .update(config.displayIdForbiddenTokens.join('\0'), 'utf8')
    .digest('hex')
    .slice(0, 16);
  const migrationName = `20260801-display-id-filter-${revision}`;
  if (await instance('app_migrations').where({ name: migrationName }).first()) return;

  let userCursor = 0;
  while (true) {
    const users = await instance('users')
      .select('id', 'username', 'display_id')
      .where('id', '>', userCursor)
      .orderBy('id')
      .limit(DISPLAY_ID_FILTER_SYNC_BATCH_SIZE);
    if (!users.length) break;
    userCursor = Number(users[users.length - 1].id);
    await instance.transaction(async (trx) => {
      for (const user of users) {
        const displayId = userNameFromUsername(user.username);
        if (user.display_id !== displayId) {
          await trx('users').where({ id: user.id }).update({ display_id: displayId });
        }
      }
    });
  }

  let guestCursor = 0;
  while (true) {
    const guests = await instance('guest_accounts')
      .select('id', 'guest_key', 'display_id')
      .where('id', '>', guestCursor)
      .orderBy('id')
      .limit(DISPLAY_ID_FILTER_SYNC_BATCH_SIZE);
    if (!guests.length) break;
    guestCursor = Number(guests[guests.length - 1].id);
    await instance.transaction(async (trx) => {
      for (const guest of guests) {
        if (!guest.guest_key) continue;
        const displayId = guestNameFromKey(guest.guest_key);
        if (guest.display_id !== displayId) {
          await trx('guest_accounts').where({ id: guest.id }).update({ display_id: displayId });
        }
      }
    });
  }

  await instance('app_migrations')
    .insert({ name: migrationName })
    .onConflict('name')
    .ignore();
}

async function backfillMultiWinningGuesses(instance: Knex): Promise<void> {
  const applied = await instance('app_migrations')
    .where({ name: MULTI_WINNING_GUESSES_BACKFILL_MIGRATION })
    .first();
  if (applied) return;

  let cursor = 0;
  while (true) {
    const matches = await instance('match_records')
      .select('id', 'replay')
      .where('id', '>', cursor)
      .orderBy('id')
      .limit(MULTI_WINNING_GUESSES_BACKFILL_BATCH_SIZE);
    if (!matches.length) break;
    cursor = Number(matches[matches.length - 1].id);
    await instance.transaction(async (trx) => {
      const matchIds = matches.map((match) => Number(match.id));
      await trx('match_players')
        .whereIn('match_id', matchIds)
        .update({ winning_guess_sum: 0, winning_rounds: 0 });
      for (const match of matches) {
        const metrics = winningGuessMetricsByPlayer(match.replay);
        for (const [playerKey, values] of metrics) {
          await trx('match_players')
            .where({ match_id: match.id, player_key: playerKey })
            .update({
              winning_guess_sum: values.winningGuessSum,
              winning_rounds: values.winningRounds,
            });
        }
      }
    });
  }

  await instance('app_migrations')
    .insert({ name: MULTI_WINNING_GUESSES_BACKFILL_MIGRATION })
    .onConflict('name')
    .ignore();
}

export async function ensureSchema(instance: Knex = db): Promise<void> {
  if (!(await instance.schema.hasTable('users'))) {
    await instance.schema.createTable('users', (t) => {
      t.increments('id').primary();
      t.string('username', 32).notNullable().unique();
      t.string('display_id', 8).nullable();
      t.string('password_hash', 128).notNullable();
      t.string('role', 16).notNullable().defaultTo('user');
      t.integer('token_version').notNullable().defaultTo(0);
      t.boolean('leaderboard_hidden').notNullable().defaultTo(false);
      t.boolean('matchmaking_restricted').notNullable().defaultTo(false);
      t.string('email', 320).nullable().unique();
      t.timestamp('email_verified_at').nullable();
      t.timestamp('banned_at').nullable();
      t.timestamp('created_at').notNullable().defaultTo(instance.fn.now());
    });
  }
  if (!(await instance.schema.hasColumn('users', 'token_version'))) {
    await instance.schema.alterTable('users', (t) => t.integer('token_version').notNullable().defaultTo(0));
  }
  if (!(await instance.schema.hasColumn('users', 'display_id'))) {
    await instance.schema.alterTable('users', (t) => t.string('display_id', 8).nullable());
  }
  if (!(await instance.schema.hasColumn('users', 'leaderboard_hidden'))) {
    await instance.schema.alterTable('users', (t) => {
      t.boolean('leaderboard_hidden').notNullable().defaultTo(false);
    });
  }
  if (!(await instance.schema.hasColumn('users', 'matchmaking_restricted'))) {
    await instance.schema.alterTable('users', (t) => {
      t.boolean('matchmaking_restricted').notNullable().defaultTo(false);
    });
  }
  if (!(await instance.schema.hasColumn('users', 'email'))) {
    await instance.schema.alterTable('users', (t) => t.string('email', 320).nullable());
  }
  if (!(await instance.schema.hasColumn('users', 'email_verified_at'))) {
    await instance.schema.alterTable('users', (t) => t.timestamp('email_verified_at').nullable());
  }
  if (!(await instance.schema.hasColumn('users', 'banned_at'))) {
    await instance.schema.alterTable('users', (t) => t.timestamp('banned_at').nullable());
  }
  await instance.raw('create unique index if not exists "users_email_unique" on "users" ("email") where "email" is not null');
  if (!(await instance.schema.hasTable('email_verifications'))) {
    await instance.schema.createTable('email_verifications', (t) => {
      t.increments('id').primary();
      t.integer('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
      t.string('email', 320).notNullable();
      t.string('token_hash', 128).notNullable().unique();
      t.timestamp('expires_at').notNullable();
      t.timestamp('created_at').notNullable().defaultTo(instance.fn.now());
      t.index(['user_id', 'expires_at']);
    });
  }
  /**
   * 邮箱验证码：注册与找回密码用（链接式绑定邮箱仍走 `email_verifications`）。
   *
   * 只存 `sha256(purpose:email:code)`，不存明文验证码；`attempts` 记录错误次数，
   * 用满即 `consumed_at` 落时间戳作废，防止暴力猜码。
   */
  if (!(await instance.schema.hasTable('email_codes'))) {
    await instance.schema.createTable('email_codes', (t) => {
      t.increments('id').primary();
      t.string('purpose', 16).notNullable();
      t.string('email', 320).notNullable();
      t.string('code_hash', 128).notNullable();
      t.integer('user_id').nullable().references('id').inTable('users').onDelete('CASCADE');
      t.integer('attempts').notNullable().defaultTo(0);
      t.timestamp('expires_at').notNullable();
      t.timestamp('consumed_at').nullable();
      t.string('ip_hash', 64).nullable();
      /** epoch 毫秒：与 `seiyuu_vote_comments.created_at` 同一种时间口径，便于算冷却。 */
      t.bigInteger('created_at').notNullable();
    });
  }
  await instance.raw(
    'create index if not exists "email_codes_lookup_idx" on "email_codes" ("purpose", "email", "id")'
  );
  await instance.raw(
    'create index if not exists "email_codes_created_idx" on "email_codes" ("created_at")'
  );
  await instance.raw(
    'create index if not exists "email_codes_ip_idx" on "email_codes" ("ip_hash", "created_at")'
  );
  if (!(await instance.schema.hasTable('guest_accounts'))) {
    await instance.schema.createTable('guest_accounts', (t) => {
      t.increments('id').primary();
      t.string('guest_key', 64).notNullable().unique();
      t.string('guest_key_hash', 128).notNullable().unique();
      t.string('display_id', 16).notNullable();
      t.timestamp('banned_at').nullable();
      t.boolean('matchmaking_restricted').notNullable().defaultTo(false);
      t.timestamp('created_at').notNullable().defaultTo(instance.fn.now());
      t.timestamp('last_seen_at').notNullable().defaultTo(instance.fn.now());
      t.index(['banned_at', 'last_seen_at']);
    });
  }
  if (!(await instance.schema.hasColumn('guest_accounts', 'guest_key'))) {
    await instance.schema.alterTable('guest_accounts', (t) => t.string('guest_key', 64).nullable());
  }
  if (!(await instance.schema.hasColumn('guest_accounts', 'matchmaking_restricted'))) {
    await instance.schema.alterTable('guest_accounts', (t) => t.boolean('matchmaking_restricted').notNullable().defaultTo(false));
  }
  await backfillUserDisplayIds(instance);
  const usersIndexConcurrently = instance.client.config.client === 'pg' ? ' concurrently' : '';
  await instance.raw(
    `create index${usersIndexConcurrently} if not exists "users_display_id_idx" on "users" ("display_id")`
  );

  if (!(await instance.schema.hasTable('api_tokens'))) {
    await instance.schema.createTable('api_tokens', (t) => {
      t.increments('id').primary();
      t.string('name', 64).notNullable();
      t.string('token_hash', 64).notNullable().unique();
      t.string('prefix', 16).notNullable();
      t.integer('created_by_user_id')
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE');
      t.timestamp('expires_at').notNullable();
      t.timestamp('created_at').notNullable().defaultTo(instance.fn.now());
    });
  }
  const apiTokensIndexConcurrently = instance.client.config.client === 'pg' ? ' concurrently' : '';
  await instance.raw(
    `create index${apiTokensIndexConcurrently} if not exists "api_tokens_owner_created_idx" on "api_tokens" ("created_by_user_id", "created_at")`
  );

  if (!(await instance.schema.hasTable('app_migrations'))) {
    await instance.schema.createTable('app_migrations', (t) => {
      t.string('name', 128).primary();
      t.timestamp('applied_at').notNullable().defaultTo(instance.fn.now());
    });
  }

  if (!(await instance.schema.hasTable('seiyuus'))) {
    await instance.schema.createTable('seiyuus', (t) => {
      t.increments('id').primary();
      t.string('name', 128).notNullable().unique();
      t.string('romaji', 128).notNullable().defaultTo('');
      t.string('birth_place', 64).notNullable().defaultTo('');
      t.string('agency', 128).notNullable().defaultTo('');
      t.date('birth_date').nullable();
      t.integer('debut_year').nullable();
      t.integer('height').nullable();
      t.string('blood_type', 4).nullable();
      t.text('voice_types').notNullable().defaultTo('[]');
      t.text('representative_works').notNullable().defaultTo('[]');
      t.text('representative_characters').notNullable().defaultTo('[]');
      t.text('groups').notNullable().defaultTo('[]'); // 所属团体/组合/偶像团体
      t.text('five_groups').notNullable().defaultTo('[]'); // 五大企划标记
      t.integer('voice_count').notNullable().defaultTo(0); // 配音角色总数（来自 bangumi）
      t.integer('game_voice_count').notNullable().defaultTo(0); // 配音游戏数（type=4）
      t.text('representative_games').notNullable().defaultTo('[]'); // 配音过的二游代表作 {work, character}
      t.boolean('is_enabled').notNullable().defaultTo(true);
      t.timestamp('created_at').notNullable().defaultTo(instance.fn.now());
    });
  }
  // 旧版 players 表迁移到 seiyuus（新项目可能没有 players 表）
  if (await instance.schema.hasTable('players') && !(await instance.schema.hasTable('seiyuus'))) {
    // 如果存在旧 players 表但还没有 seiyuus 表，跳过自动迁移（由手动数据导入处理）
    console.warn('[schema] 检测到旧 players 表，请手动迁移数据到 seiyuus 表');
  }

  // seiyuus 表字段迁移
  if (!(await instance.schema.hasColumn('seiyuus', 'romaji'))) {
    await instance.schema.alterTable('seiyuus', (t) => t.string('romaji', 128).notNullable().defaultTo(''));
  }
  if (!(await instance.schema.hasColumn('seiyuus', 'birth_date'))) {
    await instance.schema.alterTable('seiyuus', (t) => t.date('birth_date').nullable());
  }
  if (!(await instance.schema.hasColumn('seiyuus', 'height'))) {
    await instance.schema.alterTable('seiyuus', (t) => t.integer('height').nullable());
  }
  if (!(await instance.schema.hasColumn('seiyuus', 'blood_type'))) {
    await instance.schema.alterTable('seiyuus', (t) => t.string('blood_type', 4).nullable());
  }
  if (!(await instance.schema.hasColumn('seiyuus', 'voice_types'))) {
    await instance.schema.alterTable('seiyuus', (t) => t.text('voice_types').notNullable().defaultTo('[]'));
  }
  if (!(await instance.schema.hasColumn('seiyuus', 'representative_works'))) {
    await instance.schema.alterTable('seiyuus', (t) => t.text('representative_works').notNullable().defaultTo('[]'));
  }
  if (!(await instance.schema.hasColumn('seiyuus', 'representative_characters'))) {
    await instance.schema.alterTable('seiyuus', (t) => t.text('representative_characters').notNullable().defaultTo('[]'));
  }
  if (!(await instance.schema.hasColumn('seiyuus', 'groups'))) {
    await instance.schema.alterTable('seiyuus', (t) => t.text('groups').notNullable().defaultTo('[]'));
  }
  if (!(await instance.schema.hasColumn('seiyuus', 'five_groups'))) {
    await instance.schema.alterTable('seiyuus', (t) => t.text('five_groups').notNullable().defaultTo('[]'));
  }
  if (!(await instance.schema.hasColumn('seiyuus', 'voice_count'))) {
    await instance.schema.alterTable('seiyuus', (t) => t.integer('voice_count').notNullable().defaultTo(0));
  }
  if (!(await instance.schema.hasColumn('seiyuus', 'game_voice_count'))) {
    await instance.schema.alterTable('seiyuus', (t) => t.integer('game_voice_count').notNullable().defaultTo(0));
  }
  if (!(await instance.schema.hasColumn('seiyuus', 'representative_games'))) {
    await instance.schema.alterTable('seiyuus', (t) => t.text('representative_games').notNullable().defaultTo('[]'));
  }

  if (instance.client.config.client === 'pg') {
    await instance.raw('create extension if not exists pg_trgm');
    await instance.raw(
      'create index if not exists "seiyuus_name_trgm_idx" on "seiyuus" using gin ("name" gin_trgm_ops)'
    );
    await instance.raw(
      'create index if not exists "seiyuus_agency_trgm_idx" on "seiyuus" using gin ("agency" gin_trgm_ops)'
    );
  }

  // 旧版 games 表 user_id 不可空且无 guest_key;检测到旧结构则重建(开发期数据可丢弃)
  if (
    (await instance.schema.hasTable('games')) &&
    !(await instance.schema.hasColumn('games', 'guest_key'))
  ) {
    await instance.schema.dropTable('games');
  }
  if (!(await instance.schema.hasTable('games'))) {
    await instance.schema.createTable('games', (t) => {
      t.increments('id').primary();
      t.string('session_id', 64).nullable();
      t.integer('user_id').nullable().references('id').inTable('users');
      t.string('guest_key', 64).nullable().index();
      t.integer('target_player_id').notNullable().references('id').inTable('seiyuus');
      t.string('mode', 16).notNullable().defaultTo('easy');
      t.text('guesses').notNullable().defaultTo('[]');
      t.text('guess_times').notNullable().defaultTo('[]');
      t.integer('first_guess_player_id').nullable();
      t.string('status', 16).notNullable().defaultTo('playing');
      t.integer('guess_count').notNullable().defaultTo(0);
      t.timestamp('created_at').notNullable().defaultTo(instance.fn.now());
      t.timestamp('finished_at').nullable();
    });
  }
  if (!(await instance.schema.hasColumn('games', 'session_id'))) {
    await instance.schema.alterTable('games', (t) => t.string('session_id', 64).nullable());
  }
  if (!(await instance.schema.hasColumn('games', 'guess_times'))) {
    await instance.schema.alterTable('games', (t) => t.text('guess_times').notNullable().defaultTo('[]'));
  }
  if (!(await instance.schema.hasTable('difficulty_levels'))) {
    await instance.schema.createTable('difficulty_levels', (t) => {
      t.string('key', 32).primary();
      t.integer('sort_order').notNullable().defaultTo(0);
      t.boolean('is_enabled').notNullable().defaultTo(true);
      t.timestamp('created_at').notNullable().defaultTo(instance.fn.now());
    });
  }
  await instance('difficulty_levels')
    .insert(DIFFICULTY_LEVELS.map((difficulty) => ({
      key: difficulty.key,
      sort_order: difficulty.sortOrder,
      is_enabled: difficulty.isEnabled,
    })))
    .onConflict('key')
    .merge(['sort_order', 'is_enabled']);
  if (!(await instance.schema.hasTable('player_difficulties'))) {
    await instance.schema.createTable('player_difficulties', (t) => {
      t.integer('player_id').notNullable().references('id').inTable('seiyuus').onDelete('CASCADE');
      t.string('difficulty_key', 32).notNullable().references('key').inTable('difficulty_levels').onDelete('CASCADE');
      t.primary(['player_id', 'difficulty_key']);
      t.index(['difficulty_key', 'player_id']);
    });
  }
  await syncFilteredDisplayIds(instance);
  await backfillLegacyPlayerDifficulties(instance);
  if (!(await instance.schema.hasTable('player_change_submissions'))) {
    await instance.schema.createTable('player_change_submissions', (t) => {
      t.increments('id').primary();
      t.integer('api_token_id')
        .nullable()
        .references('id')
        .inTable('api_tokens')
        .onDelete('SET NULL');
      t.string('api_token_name', 64).notNullable();
      t.timestamp('created_at').notNullable().defaultTo(instance.fn.now());
    });
  }
  if (!(await instance.schema.hasTable('player_change_items'))) {
    await instance.schema.createTable('player_change_items', (t) => {
      t.increments('id').primary();
      t.integer('submission_id')
        .notNullable()
        .references('id')
        .inTable('player_change_submissions')
        .onDelete('CASCADE');
      t.integer('player_id')
        .nullable()
        .references('id')
        .inTable('seiyuus')
        .onDelete('SET NULL');
      t.string('player_nickname', 64).notNullable();
      t.string('field', 32).notNullable();
      t.text('old_value').notNullable();
      t.text('new_value').notNullable();
      t.string('status', 16).notNullable().defaultTo('pending');
      t.integer('handled_by_user_id')
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL');
      t.timestamp('handled_at').nullable();
      t.timestamp('created_at').notNullable().defaultTo(instance.fn.now());
      t.index(['status', 'created_at'], 'player_change_items_status_created_idx');
      t.index(['player_id', 'field', 'status'], 'player_change_items_player_field_status_idx');
      t.index(['submission_id'], 'player_change_items_submission_idx');
    });
  }
  if (!(await instance.schema.hasColumn('games', 'first_guess_player_id'))) {
    await instance.schema.alterTable('games', (t) => t.integer('first_guess_player_id').nullable());
  }
  await backfillFirstGuessPlayerIds(instance);
  await instance.raw(
    'create unique index if not exists "games_session_id_unique" on "games" ("session_id")'
  );
  // Active single-player games now live only in Redis and are not historical records.
  await instance('games').where({ status: 'playing' }).del();

  if (
    (await instance.schema.hasTable('match_records')) &&
    !(await instance.schema.hasColumn('match_records', 'bo_type'))
  ) {
    await instance.schema.dropTable('match_records');
  }
  if (!(await instance.schema.hasTable('match_records'))) {
    await instance.schema.createTable('match_records', (t) => {
      t.increments('id').primary();
      t.string('room_id', 64).notNullable();
      t.string('db_type', 16).notNullable().defaultTo('easy');
      t.integer('bo_type').notNullable().defaultTo(3);
      t.integer('winner_id').nullable().references('id').inTable('users');
      t.string('winner_key', 80).nullable();
      t.string('finish_reason', 32).nullable();
      t.string('forfeited_key', 80).nullable();
      t.text('players').notNullable().defaultTo('[]');
      t.text('replay').notNullable().defaultTo('[]');
      t.timestamp('created_at').notNullable().defaultTo(instance.fn.now());
      t.unique(['room_id']);
    });
  }
  if (!(await instance.schema.hasColumn('match_records', 'replay'))) {
    await instance.schema.alterTable('match_records', (t) => {
      t.text('replay').notNullable().defaultTo('[]');
    });
  }
  if (!(await instance.schema.hasColumn('match_records', 'db_type'))) {
    await instance.schema.alterTable('match_records', (t) => {
      t.string('db_type', 16).notNullable().defaultTo('easy');
    });
  }
  if (!(await instance.schema.hasColumn('match_records', 'winner_key'))) {
    await instance.schema.alterTable('match_records', (t) => {
      t.string('winner_key', 80).nullable();
    });
  }
  if (!(await instance.schema.hasColumn('match_records', 'finish_reason'))) {
    await instance.schema.alterTable('match_records', (t) => {
      t.string('finish_reason', 32).nullable();
    });
  }
  if (!(await instance.schema.hasColumn('match_records', 'forfeited_key'))) {
    await instance.schema.alterTable('match_records', (t) => {
      t.string('forfeited_key', 80).nullable();
    });
  }

  if (!(await instance.schema.hasTable('match_players'))) {
    await instance.schema.createTable('match_players', (t) => {
      t.increments('id').primary();
      t.integer('match_id').notNullable().references('id').inTable('match_records').onDelete('CASCADE');
      t.integer('user_id').nullable().references('id').inTable('users');
      t.string('player_key', 80).notNullable();
      t.string('player_name', 32).notNullable().defaultTo('');
      t.integer('score').notNullable().defaultTo(0);
      t.boolean('is_winner').notNullable().defaultTo(false);
      t.integer('winning_guess_sum').notNullable().defaultTo(0);
      t.integer('winning_rounds').notNullable().defaultTo(0);
      t.unique(['match_id', 'player_key']);
      t.index(['user_id', 'is_winner'], 'match_players_user_winner_idx');
    });
  }
  if (!(await instance.schema.hasColumn('match_players', 'winning_guess_sum'))) {
    await instance.schema.alterTable('match_players', (t) => {
      t.integer('winning_guess_sum').notNullable().defaultTo(0);
    });
  }
  if (!(await instance.schema.hasColumn('match_players', 'winning_rounds'))) {
    await instance.schema.alterTable('match_players', (t) => {
      t.integer('winning_rounds').notNullable().defaultTo(0);
    });
  }

  if (!(await instance.schema.hasTable('match_reports'))) {
    await instance.schema.createTable('match_reports', (t) => {
      t.increments('id').primary();
      t.integer('match_id').notNullable().references('id').inTable('match_records').onDelete('CASCADE');
      t.string('reporter_key', 80).notNullable();
      t.string('reported_key', 80).notNullable();
      t.string('description', 50).notNullable().defaultTo('');
      t.string('status', 16).notNullable().defaultTo('pending');
      t.string('admin_note', 500).nullable();
      t.integer('handled_by_user_id').nullable().references('id').inTable('users').onDelete('SET NULL');
      t.timestamp('handled_at').nullable();
      t.timestamp('created_at').notNullable().defaultTo(instance.fn.now());
    });
  } else {
    if (!(await instance.schema.hasColumn('match_reports', 'description'))) {
      await instance.schema.alterTable('match_reports', (t) => t.string('description', 50).notNullable().defaultTo(''));
    }
    if (!(await instance.schema.hasColumn('match_reports', 'status'))) {
      await instance.schema.alterTable('match_reports', (t) => t.string('status', 16).notNullable().defaultTo('pending'));
    }
    if (!(await instance.schema.hasColumn('match_reports', 'admin_note'))) {
      await instance.schema.alterTable('match_reports', (t) => t.string('admin_note', 500).nullable());
    }
    if (!(await instance.schema.hasColumn('match_reports', 'handled_by_user_id'))) {
      await instance.schema.alterTable('match_reports', (t) => t.integer('handled_by_user_id').nullable());
    }
    if (!(await instance.schema.hasColumn('match_reports', 'handled_at'))) {
      await instance.schema.alterTable('match_reports', (t) => t.timestamp('handled_at').nullable());
    }
    if (!(await instance.schema.hasColumn('match_reports', 'created_at'))) {
      await instance.schema.alterTable('match_reports', (t) => t.timestamp('created_at').notNullable().defaultTo(instance.fn.now()));
    }
  }
  await instance.raw(
    'create unique index if not exists "match_reports_match_reporter_unique" on "match_reports" ("match_id", "reporter_key")'
  );
  await instance.raw(
    'create index if not exists "match_reports_status_created_idx" on "match_reports" ("status", "created_at")'
  );

  if (!(await instance.schema.hasTable('report_whitelist'))) {
    await instance.schema.createTable('report_whitelist', (t) => {
      t.string('identity_key', 80).primary();
      t.string('display_name', 64).notNullable().defaultTo('');
      t.string('admin_note', 500).nullable();
      t.integer('created_by_user_id').nullable().references('id').inTable('users').onDelete('SET NULL');
      t.timestamp('created_at').notNullable().defaultTo(instance.fn.now());
    });
  } else {
    if (!(await instance.schema.hasColumn('report_whitelist', 'display_name'))) {
      await instance.schema.alterTable('report_whitelist', (t) => t.string('display_name', 64).notNullable().defaultTo(''));
    }
    if (!(await instance.schema.hasColumn('report_whitelist', 'admin_note'))) {
      await instance.schema.alterTable('report_whitelist', (t) => t.string('admin_note', 500).nullable());
    }
    if (!(await instance.schema.hasColumn('report_whitelist', 'created_by_user_id'))) {
      await instance.schema.alterTable('report_whitelist', (t) => t.integer('created_by_user_id').nullable());
    }
    if (!(await instance.schema.hasColumn('report_whitelist', 'created_at'))) {
      await instance.schema.alterTable('report_whitelist', (t) => t.timestamp('created_at').notNullable().defaultTo(instance.fn.now()));
    }
  }
  await instance.raw(
    'create index if not exists "report_whitelist_created_idx" on "report_whitelist" ("created_at")'
  );

  if (instance.client.config.client === 'pg') {
    await instance.raw(
      'alter table "match_records" alter column "room_id" type varchar(64)'
    );
  }

  const matchPlayerCount = Number(
    (await instance('match_players').count<{ count: number }[]>({ count: '*' }))[0].count
  );
  if (matchPlayerCount === 0) {
    const legacyMatches = await instance('match_records').select('id', 'winner_id', 'players');
    for (const match of legacyMatches) {
      let players: { userId: number | null; name: string; score: number }[] = [];
      try {
        players = JSON.parse(match.players);
      } catch {
        continue;
      }
      if (players.length) {
        await instance('match_players').insert(
          players.map((player, index) => ({
            match_id: match.id,
            user_id: player.userId,
            player_key: player.userId != null ? `u:${player.userId}` : `legacy:${match.id}:${index}`,
            player_name: player.name,
            score: player.score,
            is_winner: player.userId != null && player.userId === match.winner_id,
          }))
        );
      }
    }
  }
  await backfillMultiWinningGuesses(instance);

  const gameIndexes = [
    ['games_user_status_mode_idx', ['user_id', 'status', 'mode']],
    ['games_guest_status_mode_idx', ['guest_key', 'status', 'mode']],
    ['games_user_finished_idx', ['user_id', 'finished_at']],
    ['games_guest_finished_idx', ['guest_key', 'finished_at']],
  ] as const;
  for (const [name, columns] of gameIndexes) {
    const quotedColumns = columns.map((column) => `\"${column}\"`).join(', ');
    await instance.raw(`create index if not exists \"${name}\" on \"games\" (${quotedColumns})`);
  }
  const firstGuessIndexes = [
    ['games_first_guess_idx', ['first_guess_player_id']],
    ['games_user_first_guess_idx', ['user_id', 'first_guess_player_id']],
    ['games_guest_first_guess_idx', ['guest_key', 'first_guess_player_id']],
  ] as const;
  for (const [name, columns] of firstGuessIndexes) {
    const quotedColumns = columns.map((column) => `\"${column}\"`).join(', ');
    const concurrently = instance.client.config.client === 'pg' ? ' concurrently' : '';
    await instance.raw(
      `create index${concurrently} if not exists \"${name}\" on \"games\" (${quotedColumns})`
    );
  }

  await instance.raw(
    'create unique index if not exists "match_records_room_id_unique" on "match_records" ("room_id")'
  );
  await instance.raw(
    'create index if not exists "match_records_created_at_idx" on "match_records" ("created_at", "id")'
  );
  await instance.raw(
    'create index if not exists "match_players_user_match_idx" on "match_players" ("user_id", "match_id")'
  );
  await instance.raw(
    'create index if not exists "match_players_key_match_idx" on "match_players" ("player_key", "match_id")'
  );

  if (!(await instance.schema.hasTable('announcements'))) {
    await instance.schema.createTable('announcements', (t) => {
      t.increments('id').primary();
      t.string('title', 128).notNullable();
      t.text('content').notNullable();
      t.boolean('is_popup').notNullable().defaultTo(false);
      t.boolean('is_pinned').notNullable().defaultTo(false);
      t.boolean('show_in_board').notNullable().defaultTo(true);
      t.timestamp('updated_at').nullable();
      t.timestamp('created_at').notNullable().defaultTo(instance.fn.now());
    });
  }
  if (!(await instance.schema.hasColumn('announcements', 'is_popup'))) {
    await instance.schema.alterTable('announcements', (t) => {
      t.boolean('is_popup').notNullable().defaultTo(false);
    });
  }
  if (!(await instance.schema.hasColumn('announcements', 'is_pinned'))) {
    await instance.schema.alterTable('announcements', (t) => {
      t.boolean('is_pinned').notNullable().defaultTo(false);
    });
  }
  if (!(await instance.schema.hasColumn('announcements', 'show_in_board'))) {
    await instance.schema.alterTable('announcements', (t) => {
      t.boolean('show_in_board').notNullable().defaultTo(true);
    });
  }
  if (!(await instance.schema.hasColumn('announcements', 'updated_at'))) {
    await instance.schema.alterTable('announcements', (t) => {
      t.timestamp('updated_at').nullable();
    });
  }

  /* 「声优问答」玩家投稿的题目：待审核 → 审核通过后前端拉下来并进对应声优的题库。 */
  if (!(await instance.schema.hasTable('quiz_submissions'))) {
    await instance.schema.createTable('quiz_submissions', (t) => {
      t.increments('id').primary();
      t.string('seiyuu_id', 64).notNullable();
      t.string('seiyuu_name', 64).notNullable().defaultTo('');
      t.string('level', 16).notNullable().defaultTo('normal');
      t.string('prompt', 300).notNullable();
      t.text('options').notNullable().defaultTo('[]');
      t.integer('answer').notNullable().defaultTo(0);
      t.text('explain').notNullable().defaultTo('');
      t.string('source', 300).notNullable().defaultTo('');
      t.integer('submitter_user_id').nullable().references('id').inTable('users').onDelete('SET NULL');
      t.string('submitter_name', 32).notNullable().defaultTo('');
      t.string('status', 16).notNullable().defaultTo('pending');
      t.string('review_note', 500).nullable();
      t.integer('reviewed_by_user_id').nullable().references('id').inTable('users').onDelete('SET NULL');
      t.timestamp('reviewed_at').nullable();
      t.timestamp('created_at').notNullable().defaultTo(instance.fn.now());
    });
  }
  await instance.raw(
    'create index if not exists "quiz_submissions_status_created_idx" on "quiz_submissions" ("status", "created_at")'
  );
  await instance.raw(
    'create index if not exists "quiz_submissions_seiyuu_idx" on "quiz_submissions" ("seiyuu_id", "status")'
  );
  // 同一份题库里题干唯一，避免同一个人反复提交同一道题（也顺手挡住刷屏）。
  await instance.raw(
    'create unique index if not exists "quiz_submissions_seiyuu_prompt_unique" on "quiz_submissions" ("seiyuu_id", "prompt")'
  );

  /* 「喜欢或讨厌」：一人一票（同一身份对同一人物只算一票），额度按天重置。
     匿名身份按 IP 记账（每天 1 票），登录账号按账号记账（每天 10 票），额度规则见 services/sukikirai.ts。 */
  if (!(await instance.schema.hasTable('seiyuu_votes'))) {
    await instance.schema.createTable('seiyuu_votes', (t) => {
      t.increments('id').primary();
      t.string('seiyuu_id', 64).notNullable();
      /** `u:<user_id>` 或 `ip:<HMAC>`，不含明文 IP。 */
      t.string('voter_key', 80).notNullable();
      t.string('voter_kind', 16).notNullable().defaultTo('guest');
      t.integer('user_id').nullable().references('id').inTable('users').onDelete('SET NULL');
      t.string('choice', 8).notNullable();
      /** 可选的预设理由 id（见 services/sukikirai.ts 的 VOTE_REASONS），未选为 NULL。 */
      t.string('reason', 32).nullable();
      /** 这一身份投给该人物的累计票数（1 ~ VOTE_PER_PERSON_LIMIT）。 */
      t.integer('votes').notNullable().defaultTo(1);
      /** 其中在 `day` 当天新增的票数，用于计算当日额度。 */
      t.integer('day_votes').notNullable().defaultTo(1);
      /** 首次投票所在的「自然日」序号（Asia/Shanghai），改投不刷新它，也就不额外消耗当日额度。 */
      t.bigInteger('day').notNullable();
      t.bigInteger('created_at').notNullable();
      t.bigInteger('updated_at').notNullable();
    });
  }
  if (!(await instance.schema.hasColumn('seiyuu_votes', 'reason'))) {
    await instance.schema.alterTable('seiyuu_votes', (t) => {
      t.string('reason', 32).nullable();
    });
  }
  if (!(await instance.schema.hasColumn('seiyuu_votes', 'votes'))) {
    await instance.schema.alterTable('seiyuu_votes', (t) => {
      t.integer('votes').notNullable().defaultTo(1);
    });
  }
  if (!(await instance.schema.hasColumn('seiyuu_votes', 'day_votes'))) {
    await instance.schema.alterTable('seiyuu_votes', (t) => {
      t.integer('day_votes').notNullable().defaultTo(1);
    });
  }
  await instance.raw(
    'create unique index if not exists "seiyuu_votes_seiyuu_voter_unique" on "seiyuu_votes" ("seiyuu_id", "voter_key")'
  );
  await instance.raw(
    'create index if not exists "seiyuu_votes_day_voter_idx" on "seiyuu_votes" ("day", "voter_key")'
  );
  await instance.raw(
    'create index if not exists "seiyuu_votes_seiyuu_choice_idx" on "seiyuu_votes" ("seiyuu_id", "choice")'
  );
  await instance.raw(
    'create index if not exists "seiyuu_votes_voter_idx" on "seiyuu_votes" ("voter_key")'
  );

  /* 「喜欢或讨厌」的短评：必须登录 + 必须已投票；发表时先过本地审核引擎
     （`services/moderation/`），判定 approve / review / reject 三档。 */
  if (!(await instance.schema.hasTable('seiyuu_vote_comments'))) {
    await instance.schema.createTable('seiyuu_vote_comments', (t) => {
      t.increments('id').primary();
      t.string('seiyuu_id', 64).notNullable();
      t.integer('user_id').nullable().references('id').inTable('users').onDelete('SET NULL');
      t.string('author_name', 32).notNullable().defaultTo('');
      /** 发表时的立场（喜欢 / 讨厌），评论区按它上色。 */
      t.string('choice', 8).notNullable().defaultTo('like');
      t.string('body', 200).notNullable();
      t.string('status', 16).notNullable().defaultTo('pending');
      t.string('review_note', 500).nullable();
      t.integer('reviewed_by_user_id').nullable().references('id').inTable('users').onDelete('SET NULL');
      t.timestamp('reviewed_at').nullable();
      t.bigInteger('created_at').notNullable();
    });
  }
  /* 自动审核元数据：引擎判定、命中类别 / 词（**只给后台**）与执行者（auto / admin）。 */
  const commentModerationColumns: Array<[string, (table: Knex.AlterTableBuilder) => void]> = [
    ['fingerprint', (t) => t.string('fingerprint', 64).nullable()],
    ['moderation_action', (t) => t.string('moderation_action', 16).nullable()],
    ['moderation_score', (t) => t.integer('moderation_score').nullable()],
    ['moderation_categories', (t) => t.string('moderation_categories', 120).nullable()],
    ['moderation_hits', (t) => t.string('moderation_hits', 300).nullable()],
    ['moderation_reasons', (t) => t.string('moderation_reasons', 300).nullable()],
    ['moderation_at', (t) => t.bigInteger('moderation_at').nullable()],
    ['decided_by', (t) => t.string('decided_by', 16).nullable()],
  ];
  for (const [column, build] of commentModerationColumns) {
    if (!(await instance.schema.hasColumn('seiyuu_vote_comments', column))) {
      await instance.schema.alterTable('seiyuu_vote_comments', (t) => build(t));
    }
  }
  await instance.raw(
    'create unique index if not exists "seiyuu_vote_comments_seiyuu_user_unique" on "seiyuu_vote_comments" ("seiyuu_id", "user_id")'
  );
  await instance.raw(
    'create index if not exists "seiyuu_vote_comments_status_idx" on "seiyuu_vote_comments" ("status", "id")'
  );
  await instance.raw(
    'create index if not exists "seiyuu_vote_comments_seiyuu_status_idx" on "seiyuu_vote_comments" ("seiyuu_id", "status")'
  );
  /* 去重查询：同一用户近 24 小时是否发过同内容（灌水检测）。 */
  await instance.raw(
    'create index if not exists "seiyuu_vote_comments_user_fingerprint_idx" on "seiyuu_vote_comments" ("user_id", "fingerprint")'
  );

  /* 「喜欢或讨厌」的投票流水：**每加一票写一行**（改投只换立场、不写）。
     日 / 周 / 月榜就是按 `day` 做时间窗聚合，所以历史票数必须落在这里。 */
  if (!(await instance.schema.hasTable('seiyuu_vote_events'))) {
    await instance.schema.createTable('seiyuu_vote_events', (t) => {
      t.increments('id').primary();
      t.string('seiyuu_id', 64).notNullable();
      t.string('voter_key', 80).notNullable();
      t.string('voter_kind', 16).notNullable().defaultTo('guest');
      t.integer('user_id').nullable().references('id').inTable('users').onDelete('SET NULL');
      t.string('choice', 8).notNullable();
      /** 固定为 1：每行就是「新增一票」，留着是为了以后能做退票 / 修正。 */
      t.integer('votes_delta').notNullable().defaultTo(1);
      t.bigInteger('day').notNullable();
      t.bigInteger('created_at').notNullable();
    });
  }
  await instance.raw(
    'create index if not exists "seiyuu_vote_events_day_seiyuu_idx" on "seiyuu_vote_events" ("day", "seiyuu_id")'
  );
  await instance.raw(
    'create index if not exists "seiyuu_vote_events_seiyuu_idx" on "seiyuu_vote_events" ("seiyuu_id")'
  );
  await instance.raw(
    'create index if not exists "seiyuu_vote_events_voter_idx" on "seiyuu_vote_events" ("voter_key")'
  );

  /* 「猜歌」单机成绩：全站排行榜按「每人每难度最好成绩」取。
     分数由客户端算出（同站内其它小游戏），服务端只做区间校验 + 存成绩码供人工复盘。 */
  if (!(await instance.schema.hasTable('song_quiz_scores'))) {
    await instance.schema.createTable('song_quiz_scores', (t) => {
      t.increments('id').primary();
      t.integer('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
      /** easy / normal / hard / expert */
      t.string('difficulty', 16).notNullable();
      /** 分组 id（muse / roselia / leoneed …），见前端 config/songQuiz/groups.ts */
      t.string('group_id', 32).notNullable();
      t.integer('score').notNullable();
      t.integer('correct').notNullable().defaultTo(0);
      t.integer('total').notNullable().defaultTo(0);
      t.integer('answered').notNullable().defaultTo(0);
      t.integer('duration_ms').notNullable().defaultTo(0);
      t.integer('avg_ms').nullable();
      t.integer('fastest_ms').nullable();
      /** 专家模式剩几颗红心（其它难度为 NULL）。 */
      t.integer('hearts_left').nullable();
      /** 成绩码：同一 seed 可完整还原整局，便于人工复核可疑分数。 */
      t.string('code', 300).notNullable().defaultTo('');
      t.timestamp('created_at').notNullable().defaultTo(instance.fn.now());
    });
  }
  await instance.raw(
    'create index if not exists "song_quiz_scores_board_idx" on "song_quiz_scores" ("difficulty", "score" desc)'
  );
  await instance.raw(
    'create index if not exists "song_quiz_scores_user_idx" on "song_quiz_scores" ("user_id", "difficulty")'
  );

  /* 站点流量统计（管理后台「流量管理」）：
     - traffic_stats：按本地小时桶聚合的请求计数（路由 / 用户类型 / 状态码三维）。
     - traffic_visitors：访客去重明细，day 桶（10 位）与 hour 桶（13 位）并存，
       天级 UV = day 桶去重计数，小时趋势 UV = hour 桶去重计数。 */
  if (!(await instance.schema.hasTable('traffic_stats'))) {
    await instance.schema.createTable('traffic_stats', (t) => {
      /** 本地小时 `YYYY-MM-DDTHH` */
      t.string('bucket', 16).notNullable();
      /** 归一化路由，见 services/trafficStats.ts normalizeRoute */
      t.string('route', 200).notNullable();
      /** user | guest | anon */
      t.string('user_type', 10).notNullable();
      /** 2xx | 3xx | 4xx | 5xx */
      t.string('status_class', 8).notNullable();
      t.integer('requests').notNullable().defaultTo(0);
      t.bigInteger('bytes').notNullable().defaultTo(0);
      t.primary(['bucket', 'route', 'user_type', 'status_class']);
    });
  }
  await instance.raw(
    'create index if not exists "traffic_stats_route_idx" on "traffic_stats" ("route")'
  );
  if (!(await instance.schema.hasTable('traffic_visitors'))) {
    await instance.schema.createTable('traffic_visitors', (t) => {
      /** `YYYY-MM-DD`（天桶）或 `YYYY-MM-DDTHH`（小时桶） */
      t.string('bucket', 16).notNullable();
      /** u:{id} / g:{key} / anon:{hash}，不存原始 IP */
      t.string('visitor', 100).notNullable();
      t.primary(['bucket', 'visitor']);
    });
  }
}
