/**
 * 邮箱验证码（6 位数字）服务。
 *
 * 与 `emailVerification.ts`（链接式绑定邮箱）的区别：
 * - 链接式用于「已登录用户绑定 / 换绑邮箱」；
 * - 验证码用于 **注册** 与 **忘记密码** —— 这两处用户还没有会话（或已丢失），
 *   把验证码填进同一个表单比跳转链接更顺，也便于前端做倒计时与错误提示。
 *
 * 存储与限流都在数据库里（不依赖 Redis，站点降级为内存模式时依然可用）：
 * - 只存 `sha256(purpose:email:code)`，**不存明文验证码**；
 * - 同邮箱 60 秒冷却、每小时 5 封、每天 10 封；
 * - 同一 IP 每小时 10 封（哈希后存，不留明文 IP）；
 * - 单个验证码最多错 5 次，用满即作废，防止暴力猜。
 */

import crypto from 'crypto';
import { config } from '../config';
import { db } from '../db/knex';
import { sendEmail } from './emailVerification';

export type EmailCodePurpose = 'register' | 'reset';

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const HOURLY_PER_EMAIL = 5;
const DAILY_PER_EMAIL = 10;
const HOURLY_PER_IP = 10;

export class EmailCodeCooldownError extends Error {
  constructor(public retryAt: number) {
    super('EMAIL_CODE_COOLDOWN');
  }
}

/** 频率超限 / 邮箱不存在等业务错误（message 即前端用的 code）。 */
export class EmailCodeError extends Error {
  constructor(public code: string, public status = 400) {
    super(code);
  }
}

export function hashIpForCode(ip: string): string {
  return crypto.createHmac('sha256', config.guestIdSalt).update(`email-code:${ip}`).digest('hex');
}

function hashCode(purpose: EmailCodePurpose, email: string, code: string): string {
  return crypto.createHash('sha256').update(`${purpose}:${email}:${code}`).digest('hex');
}

/**
 * 验证码哈希（`sha256(purpose:email:code)`）。
 *
 * 导出是为了让集成测试能用同一种算法造出“合法验证码”，避免测试里再抄一份实现。
 */
export function hashEmailCode(purpose: EmailCodePurpose, email: string, code: string): string {
  return hashCode(purpose, email, code);
}

export function generateEmailCode(): string {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
}

export function buildCodeEmail(input: {
  purpose: EmailCodePurpose;
  code: string;
  ttlSeconds: number;
}): { subject: string; body: string } {
  const minutes = Math.max(1, Math.round(input.ttlSeconds / 60));
  const action = input.purpose === 'register' ? '注册账号' : '重置密码';
  const subject = input.purpose === 'register'
    ? '注册验证码｜弗一把'
    : '重置密码验证码｜弗一把';
  const body = [
    '您好：',
    '',
    `您正在${action}，验证码是：`,
    '',
    `    ${input.code}`,
    '',
    `验证码 ${minutes} 分钟内有效，每个验证码最多尝试 ${config.email.codeMaxAttempts} 次。`,
    '为保障账号安全，请勿将验证码转发给他人。',
    '',
    '如果您没有进行此操作，请忽略本邮件。',
    '此邮件由系统自动发送，请勿直接回复。',
    '',
    '------------------------------',
    '弗一把',
    'CS/声优情报站',
  ].join('\n');
  return { subject, body };
}

/**
 * 生成并发送验证码。
 *
 * @throws EmailCodeCooldownError 冷却中（`retryAt` 为可重试的毫秒时间戳）
 * @throws EmailCodeError        频率超限 / 邮件服务未配置 / 发信失败
 */
export async function issueEmailCode(input: {
  purpose: EmailCodePurpose;
  email: string;
  userId?: number | null;
  ipHash?: string | null;
}): Promise<{ retryAt: number; expiresAt: number }> {
  const { purpose, email } = input;
  const now = Date.now();
  void pruneOpportunistically(now);

  const last = await db('email_codes')
    .where({ purpose, email })
    .orderBy('id', 'desc')
    .first('created_at');
  if (last) {
    const createdAt = Number(last.created_at) || 0;
    const retryAt = createdAt + config.email.codeCooldownSeconds * 1000;
    if (retryAt > now) throw new EmailCodeCooldownError(retryAt);
  }

  const [hourly, daily] = await Promise.all([
    db('email_codes').where({ purpose, email }).where('created_at', '>', now - HOUR_MS).count({ count: 'id' }).first(),
    db('email_codes').where({ purpose, email }).where('created_at', '>', now - DAY_MS).count({ count: 'id' }).first(),
  ]);
  if (Number(hourly?.count ?? 0) >= HOURLY_PER_EMAIL) throw new EmailCodeError('EMAIL_CODE_RATE_LIMITED', 429);
  if (Number(daily?.count ?? 0) >= DAILY_PER_EMAIL) throw new EmailCodeError('EMAIL_CODE_RATE_LIMITED', 429);

  if (input.ipHash) {
    const perIp = await db('email_codes')
      .where({ ip_hash: input.ipHash })
      .where('created_at', '>', now - HOUR_MS)
      .count({ count: 'id' })
      .first();
    if (Number(perIp?.count ?? 0) >= HOURLY_PER_IP) throw new EmailCodeError('EMAIL_CODE_RATE_LIMITED', 429);
  }

  const code = generateEmailCode();
  const expiresAt = now + config.email.codeTtlSeconds * 1000;

  // 同一邮箱旧验证码立刻作废：只保留最新一条有效。
  await db('email_codes').where({ purpose, email }).whereNull('consumed_at').update({ consumed_at: new Date() });
  await db('email_codes').insert({
    purpose,
    email,
    code_hash: hashCode(purpose, email, code),
    user_id: input.userId ?? null,
    attempts: 0,
    expires_at: new Date(expiresAt),
    consumed_at: null,
    ip_hash: input.ipHash ?? null,
    created_at: now,
  });

  const mail = buildCodeEmail({ purpose, code, ttlSeconds: config.email.codeTtlSeconds });
  if (!config.email.host || !config.email.from) {
    // 本地联调：没配 SMTP 时把验证码打到服务端日志（生产环境默认关闭）。
    if (config.email.logCodes) {
      console.warn(`[email:code] SMTP 未配置，${purpose} 验证码 ${code} → ${email}`);
      return { retryAt: now + config.email.codeCooldownSeconds * 1000, expiresAt };
    }
    throw new EmailCodeError('EMAIL_NOT_CONFIGURED', 503);
  }

  try {
    await sendEmail(email, mail.subject, mail.body);
  } catch (error) {
    // 发信失败就把这条验证码作废，避免用户拿着收不到的码干等。
    await db('email_codes').where({ purpose, email, code_hash: hashCode(purpose, email, code) }).update({ consumed_at: new Date() });
    console.warn('[email:code]', error);
    throw new EmailCodeError('EMAIL_SEND_FAILED', 503);
  }

  return { retryAt: now + config.email.codeCooldownSeconds * 1000, expiresAt };
}

/**
 * 校验验证码。成功即消费（一次性），失败累加尝试次数。
 *
 * @throws EmailCodeError `EMAIL_CODE_INVALID`（错误 / 过期 / 已用过 / 次数用尽）
 */
export async function consumeEmailCode(input: {
  purpose: EmailCodePurpose;
  email: string;
  code: string;
}): Promise<void> {
  const { purpose, email, code } = input;
  const row = await db('email_codes')
    .where({ purpose, email })
    .whereNull('consumed_at')
    .orderBy('id', 'desc')
    .first('id', 'code_hash', 'attempts', 'expires_at');
  if (!row) throw new EmailCodeError('EMAIL_CODE_INVALID');

  if (new Date(row.expires_at as string | Date).getTime() <= Date.now()) {
    await db('email_codes').where({ id: row.id }).update({ consumed_at: new Date() });
    throw new EmailCodeError('EMAIL_CODE_INVALID');
  }

  const attempts = Number(row.attempts) || 0;
  if (attempts >= config.email.codeMaxAttempts) {
    await db('email_codes').where({ id: row.id }).update({ consumed_at: new Date() });
    throw new EmailCodeError('EMAIL_CODE_INVALID');
  }

  const expected = Buffer.from(String(row.code_hash), 'utf8');
  const actual = Buffer.from(hashCode(purpose, email, code), 'utf8');
  const matches = expected.length === actual.length && crypto.timingSafeEqual(expected, actual);

  if (!matches) {
    const next = attempts + 1;
    await db('email_codes')
      .where({ id: row.id })
      .update({ attempts: next, ...(next >= config.email.codeMaxAttempts ? { consumed_at: new Date() } : {}) });
    throw new EmailCodeError('EMAIL_CODE_INVALID');
  }

  const updated = await db('email_codes')
    .where({ id: row.id })
    .whereNull('consumed_at')
    .update({ consumed_at: new Date() });
  if (!updated) throw new EmailCodeError('EMAIL_CODE_INVALID');
}

/** 清理过期验证码（发码时顺手做，最多每小时一次，避免表无限增长）。 */
let lastPruneAt = 0;
async function pruneOpportunistically(now: number): Promise<void> {
  if (now - lastPruneAt < HOUR_MS) return;
  lastPruneAt = now;
  await pruneEmailCodes(now).catch(() => undefined);
}

export async function pruneEmailCodes(now: number = Date.now()): Promise<number> {
  return db('email_codes').where('created_at', '<', now - DAY_MS).del();
}
