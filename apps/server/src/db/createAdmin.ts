import { db } from './knex';
import { initDb } from './init';
import { closeRedis, initRedis } from '../redis';
import { invalidateAuthUser } from '../middleware/auth';
import { closePasswordWorkers, hashPassword } from '../services/password';
import { userNameFromUsername } from '../services/identityDisplay';

/**
 * 创建/更新管理员账号。
 *
 * 用法（PowerShell，仓库根目录）：
 *   $env:ADMIN_USERNAME='admin'; $env:ADMIN_EMAIL='1092628886@qq.com'; $env:ADMIN_PASSWORD='...'; pnpm --filter server create-admin
 *
 * 也支持把这几个变量写进根目录 `.env`（.env 已被 .gitignore 忽略），然后直接 `pnpm --filter server create-admin`。
 * `ADMIN_EMAIL` 可选：填了以后就能在登录页直接用邮箱登录（登录接口按 用户名 → 邮箱 依次匹配），
 * 并且会把邮箱标成已验证，免得顶栏一直提示「邮箱未验证」。
 */

/** 与 routes/auth.ts 的 PASSWORD_MIN_LENGTH 保持一致：门槛只取登录真正会用到的长度。 */
const PASSWORD_MIN_LENGTH = 10;

async function main() {
  const username = process.env.ADMIN_USERNAME?.trim();
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase() || null;
  const password = process.env.ADMIN_PASSWORD;
  if (!username || !password || password.length < PASSWORD_MIN_LENGTH) {
    throw new Error(`Set ADMIN_USERNAME and ADMIN_PASSWORD (at least ${PASSWORD_MIN_LENGTH} characters)`);
  }
  if (email && !/^[^@\s]+@[^@\s]+$/.test(email)) {
    throw new Error('ADMIN_EMAIL is not a valid email address');
  }
  await initDb();
  await initRedis();
  const passwordHash = await hashPassword(password);
  // 先按用户名找，找不到再按邮箱找（便于把已有账号提升为管理员）。
  const existing = (await db('users').where({ username }).first())
    ?? (email ? await db('users').where({ email }).first() : undefined);
  if (existing && existing.username !== username) {
    const taken = await db('users').where({ username }).first('id');
    if (taken) throw new Error(`Username ${username} is already taken by user #${taken.id}`);
  }
  if (existing && email) {
    const taken = await db('users').where({ email }).first('id');
    if (taken && taken.id !== existing.id) throw new Error(`Email ${email} is already taken by user #${taken.id}`);
  }
  const patch = {
    username,
    display_id: userNameFromUsername(username),
    password_hash: passwordHash,
    role: 'admin' as const,
    ...(email ? { email, email_verified_at: db.fn.now() } : {}),
  };
  if (existing) {
    await db('users').where({ id: existing.id }).update({
      ...patch,
      token_version: Number(existing.token_version ?? 0) + 1,
    });
  } else {
    await db('users').insert(patch);
  }
  const user = await db('users').where({ username }).first();
  if (user) await invalidateAuthUser(user.id);
  console.log(`[admin] ${username}${email ? ` <${email}>` : ''} is ready (id ${user?.id ?? '?'})`);
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closePasswordWorkers();
    await closeRedis();
    await db.destroy();
  });
