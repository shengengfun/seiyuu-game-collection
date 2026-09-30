import { NextFunction, Request, Response, Router } from 'express';
import { z } from 'zod';
import { db } from '../db/knex';
import {
  clearAuthCookies,
  clearGuestCookie,
  ensureGuestCookie,
  requireAuth,
  setAuthCookies,
  refreshAuthCookies,
  restoreAuthSession,
  invalidateAuthUser,
  userNameFromUsername,
} from '../middleware/auth';
import { validateBody, asyncHandler, HttpError } from '../middleware/common';
import { User } from '../types';
import { rateLimit, requestIdentity } from '../middleware/rateLimit';
import { invalidateCached } from '../services/queryCache';
import { leaderboardCacheKey } from '../services/leaderboardCache';
import { hashPassword, passwordNeedsRehash, verifyPassword } from '../services/password';
import { DIFFICULTY_LEVELS } from '../difficulties';
import { allGlobalStatsCacheKeys, allPersonalStatsCacheKeys } from '../services/statsCache';
import {
  EmailVerificationCooldownError,
  issueEmailVerification,
  normalizeEmail,
  verifyEmailToken,
} from '../services/emailVerification';
import {
  EmailCodeCooldownError,
  EmailCodeError,
  consumeEmailCode,
  hashIpForCode,
  issueEmailCode,
} from '../services/emailCodes';

const router = Router();

const USERNAME_MIN_LENGTH = 2;
const USERNAME_MAX_LENGTH = 20;
const PASSWORD_MIN_LENGTH = 10;
const PASSWORD_MAX_LENGTH = 128;
const USERNAME_PATTERN = /^[\w一-龥-]+$/;

const credentialsSchema = z.object({
  username: z
    .string()
    .min(USERNAME_MIN_LENGTH)
    .max(USERNAME_MAX_LENGTH)
    .regex(USERNAME_PATTERN),
  password: z.string().min(PASSWORD_MIN_LENGTH).max(PASSWORD_MAX_LENGTH),
});
/**
 * 登录用的账号字段比注册宽松：除用户名外还可以直接填邮箱。
 *
 * 形如 `1092628886@qq.com` 的账号不满足 USERNAME_PATTERN（不允许 `@` / `.`），
 * 所以校验只限制长度，具体是用户名还是邮箱由查库时决定（见 /login）。
 */
const loginSchema = z.object({
  username: z.string().trim().min(1).max(320),
  password: z.string().min(PASSWORD_MIN_LENGTH).max(PASSWORD_MAX_LENGTH),
});
/** 邮箱验证码：固定 6 位数字（服务端 `services/emailCodes.ts` 生成）。 */
const emailCodeSchema = z.string().trim().regex(/^\d{6}$/);
/**
 * 注册必须带邮箱与邮箱验证码：验证码在注册前单独索取（`POST /auth/register/code`），
 * 校验通过即认为邮箱所有权已确认，账号直接落 `email_verified_at`。
 */
const registerSchema = credentialsSchema.extend({
  email: z.string().trim().email().max(320),
  code: emailCodeSchema,
});
const emailSchema = z.object({ email: z.string().trim().email().max(320) });
const passwordResetSchema = z.object({
  email: z.string().trim().email().max(320),
  code: emailCodeSchema,
  password: z.string().min(PASSWORD_MIN_LENGTH).max(PASSWORD_MAX_LENGTH),
});

/** 业务错误 → HttpError（`EmailCodeError.code` 就是前端要的 code）。 */
function emailCodeHttpError(error: unknown, fallback = 'EMAIL_SEND_FAILED'): HttpError {
  if (error instanceof EmailCodeError) return new HttpError(error.status, error.code);
  if (error instanceof EmailCodeCooldownError) return new HttpError(429, error.message);
  const code = error instanceof Error ? error.message : fallback;
  if ([
    'INVALID_EMAIL',
    'EMAIL_ALIAS_NOT_SUPPORTED',
    'EMAIL_DOMAIN_NOT_ALLOWED',
    'EMAIL_NOT_CONFIGURED',
    'EMAIL_CODE_INVALID',
  ].includes(code)) {
    return new HttpError(400, code);
  }
  return new HttpError(503, 'EMAIL_SEND_FAILED');
}

/** 冷却 / 频率超限时把可重试时间一起回给前端（前端据此显示倒计时）。 */
function sendCooldown(res: Response, error: unknown): boolean {
  if (error instanceof EmailCodeCooldownError) {
    res.status(429).json({ code: error.message, retryAt: error.retryAt, serverNow: Date.now() });
    return true;
  }
  return false;
}

function validateRegisterBody(req: Request, res: Response, next: NextFunction) {
  const result = registerSchema.safeParse(req.body);
  if (!result.success) {
    const body = req.body && typeof req.body === 'object'
      ? req.body as Record<string, unknown>
      : {};
    const username = body.username;
    const password = body.password;
    let code = 'VALIDATION_FAILED';
    if (typeof username !== 'string' || username.length === 0) {
      code = 'REGISTER_USERNAME_REQUIRED';
    } else if (username.length < USERNAME_MIN_LENGTH || username.length > USERNAME_MAX_LENGTH) {
      code = 'REGISTER_USERNAME_LENGTH';
    } else if (!USERNAME_PATTERN.test(username)) {
      code = 'REGISTER_USERNAME_CHARACTERS';
    } else if (typeof password !== 'string' || password.length === 0) {
      code = 'REGISTER_PASSWORD_REQUIRED';
    } else if (password.length < PASSWORD_MIN_LENGTH || password.length > PASSWORD_MAX_LENGTH) {
      code = 'REGISTER_PASSWORD_LENGTH';
    } else if (typeof body.email !== 'string' || !body.email.trim() || !/^[^@\s]+@[^@\s]+$/.test(String(body.email).trim())) {
      code = 'INVALID_EMAIL';
    } else if (!emailCodeSchema.safeParse(body.code).success) {
      code = 'REGISTER_CODE_INVALID';
    }
    return res.status(400).json({ code });
  }
  req.body = result.data;
  next();
}

function publicUser(user: { id: number; username: string; role: 'user' | 'admin'; email?: string | null; emailVerified?: boolean }) {
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    email: user.email ?? null,
    emailVerified: Boolean(user.emailVerified),
  };
}

/**
 * 注册第一步：给邮箱发 6 位验证码。
 *
 * 这一步本身不需要会话，因此由 **注册专用 PoW**（`X-Register-PoW-*`）保护，
 * 再叠加 IP / 邮箱维度的发信限流（见 `services/emailCodes.ts`）。
 */
router.post(
  '/register/code',
  rateLimit({ name: 'register-code-ip', limit: 10, windowSeconds: 3600, failClosed: true }),
  validateBody(emailSchema),
  asyncHandler(async (req, res) => {
    let email: string;
    try {
      email = normalizeEmail(req.body.email);
    } catch (error) {
      throw emailCodeHttpError(error, 'INVALID_EMAIL');
    }
    if (await db<User>('users').where({ email }).first('id')) throw new HttpError(409, 'EMAIL_TAKEN');
    try {
      const { retryAt, expiresAt } = await issueEmailCode({
        purpose: 'register',
        email,
        ipHash: hashIpForCode(req.ip || req.socket.remoteAddress || 'unknown'),
      });
      res.json({ ok: true, retryAt, expiresAt, serverNow: Date.now() });
    } catch (error) {
      if (sendCooldown(res, error)) return;
      throw emailCodeHttpError(error);
    }
  })
);

router.post(
  '/register',
  rateLimit({ name: 'register', limit: 3, windowSeconds: 3600, failClosed: true }),
  validateRegisterBody,
  asyncHandler(async (req, res) => {
    const { username, password, email: emailInput, code } = req.body;
    let email: string;
    try {
      email = normalizeEmail(emailInput);
    } catch (error) {
      throw emailCodeHttpError(error, 'INVALID_EMAIL');
    }
    // 先查重（避免验证码被白白消费），再核码。
    if (await db<User>('users').where({ email }).first('id')) throw new HttpError(409, 'EMAIL_TAKEN');
    if (await db<User>('users').where({ username }).first('id')) throw new HttpError(409, 'USERNAME_TAKEN');

    try {
      await consumeEmailCode({ purpose: 'register', email, code });
    } catch (error) {
      throw emailCodeHttpError(error, 'EMAIL_CODE_INVALID');
    }

    const role = 'user' as const;

    const [id] = await db('users')
      .insert({
        username,
        display_id: userNameFromUsername(username),
        password_hash: await hashPassword(password),
        role,
        email,
        email_verified_at: db.fn.now(),
      })
      .returning('id')
      .then((rows) => rows.map((r: any) => (typeof r === 'object' ? r.id : r)));

    const user = { id, username, role, token_version: 0, email, emailVerified: true };
    await invalidateCached(...allGlobalStatsCacheKeys());
    setAuthCookies(res, user);
    res.json({ user: publicUser(user) });
  })
);

/**
 * 忘记密码第一步：给邮箱发验证码。
 *
 * **不泄漏账号是否存在**：邮箱没注册时也返回 `{ ok: true }`（只是不发信），
 * 否则这个接口就成了账号枚举工具。
 */
router.post(
  '/password/code',
  rateLimit({ name: 'password-code-ip', limit: 10, windowSeconds: 3600, failClosed: true }),
  validateBody(emailSchema),
  asyncHandler(async (req, res) => {
    let email: string;
    try {
      email = normalizeEmail(req.body.email);
    } catch (error) {
      throw emailCodeHttpError(error, 'INVALID_EMAIL');
    }
    const user = await db<User>('users').where({ email }).first('id', 'banned_at');
    if (!user) return res.json({ ok: true, retryAt: Date.now(), serverNow: Date.now() });
    if (user.banned_at) throw new HttpError(403, 'USER_BANNED');
    try {
      const { retryAt, expiresAt } = await issueEmailCode({
        purpose: 'reset',
        email,
        userId: Number(user.id),
        ipHash: hashIpForCode(req.ip || req.socket.remoteAddress || 'unknown'),
      });
      res.json({ ok: true, retryAt, expiresAt, serverNow: Date.now() });
    } catch (error) {
      if (sendCooldown(res, error)) return;
      throw emailCodeHttpError(error);
    }
  })
);

/**
 * 忘记密码第二步：验证码换新密码。
 *
 * 成功后**踢掉所有既有会话**（`token_version + 1`）——密码重置往往意味着账号可能已被他人掌握。
 */
router.post(
  '/password/reset',
  rateLimit({ name: 'password-reset', limit: 10, windowSeconds: 3600, failClosed: true }),
  validateBody(passwordResetSchema),
  asyncHandler(async (req, res) => {
    const { code, password } = req.body;
    let email: string;
    try {
      email = normalizeEmail(req.body.email);
    } catch (error) {
      throw emailCodeHttpError(error, 'INVALID_EMAIL');
    }
    const user = await db<User>('users').where({ email }).first();
    // 邮箱不存在时同样走一遍「验证码无效」的错误路径，避免暴露账号是否存在。
    if (!user) {
      try {
        await consumeEmailCode({ purpose: 'reset', email, code });
      } catch { /* 忽略：本来就不该有码 */ }
      throw new HttpError(400, 'EMAIL_CODE_INVALID');
    }
    if (user.banned_at) throw new HttpError(403, 'USER_BANNED');
    try {
      await consumeEmailCode({ purpose: 'reset', email, code });
    } catch (error) {
      throw emailCodeHttpError(error, 'EMAIL_CODE_INVALID');
    }
    await db('users')
      .where({ id: user.id })
      .update({ password_hash: await hashPassword(password) })
      .increment('token_version', 1);
    await invalidateAuthUser(user.id);
    clearAuthCookies(res);
    ensureGuestCookie(req, res);
    res.json({ ok: true });
  })
);

router.post(
  '/login',
  rateLimit({
    name: 'login',
    limit: 5,
    windowSeconds: 60,
    failClosed: true,
    key: (req) => `${req.ip}:${String(req.body?.username ?? '').toLowerCase()}`,
  }),
  validateBody(loginSchema),
  asyncHandler(async (req, res) => {
    const { username, password } = req.body;
    const account = String(username).trim();
    // 先按用户名精确匹配（保持原行为），没命中且长得像邮箱时再按邮箱匹配。
    let user = await db<User>('users').where({ username: account }).first();
    if (!user && account.includes('@')) {
      user = await db<User>('users').where({ email: account.toLowerCase() }).first();
    }
    if (!user || !(await verifyPassword(password, user.password_hash))) {
      throw new HttpError(401, 'INVALID_CREDENTIALS');
    }
    if (user.banned_at) throw new HttpError(403, 'USER_BANNED');
    if (passwordNeedsRehash(user.password_hash)) {
      const previousHash = user.password_hash;
      const passwordHash = await hashPassword(password);
      await db('users')
        .where({ id: user.id, password_hash: previousHash })
        .update({ password_hash: passwordHash });
    }
    setAuthCookies(res, user);
    res.json({ user: publicUser({ id: user.id, username: user.username, role: user.role, email: user.email, emailVerified: Boolean(user.email_verified_at) }) });
  })
);

router.get('/me', requireAuth, rateLimit({
  name: 'auth-me',
  limit: 60,
  windowSeconds: 60,
  key: requestIdentity,
  failClosed: true,
}), (req, res) => {
  res.json({ user: req.user });
});

router.post(
  '/refresh',
  rateLimit({ name: 'auth-refresh', limit: 60, windowSeconds: 60, failClosed: true }),
  asyncHandler(async (req, res) => {
    const user = await refreshAuthCookies(req.headers.cookie, res);
    if (!user) {
      clearAuthCookies(res);
      throw new HttpError(401, 'AUTH_REQUIRED');
    }
    res.json({ user });
  })
);

router.post(
  '/session',
  rateLimit({ name: 'session', limit: 60, windowSeconds: 60, failClosed: true }),
  asyncHandler(async (req, res) => {
    const user = await restoreAuthSession(req.headers.cookie, res, true);
    if (user) return res.json({ authenticated: true, user });
    const guest = ensureGuestCookie(req, res);
    res.json({ authenticated: false, guest: { name: guest.name } });
  })
);

router.post(
  '/logout',
  requireAuth,
  rateLimit({
    name: 'logout',
    limit: 30,
    windowSeconds: 60,
    key: requestIdentity,
    failClosed: true,
  }),
  asyncHandler(async (req, res) => {
    await db('users').where({ id: req.user!.id }).increment('token_version', 1);
    await invalidateAuthUser(req.user!.id);
    clearAuthCookies(res);
    ensureGuestCookie(req, res);
    res.json({ ok: true });
  })
);

router.post(
  '/email/request',
  requireAuth,
  rateLimit({ name: 'email-request', limit: 3, windowSeconds: 3600, key: requestIdentity, failClosed: true }),
  validateBody(emailSchema),
  asyncHandler(async (req, res) => {
    try {
      const { retryAt } = await issueEmailVerification(req.user!.id, req.body.email, { enforceCooldown: true });
      return res.json({ ok: true, retryAt, serverNow: Date.now() });
    } catch (error) {
      if (error instanceof EmailVerificationCooldownError) {
        return res.status(429).json({
          code: error.message,
          retryAt: error.retryAt,
          serverNow: Date.now(),
        });
      }
      const code = error instanceof Error ? error.message : 'EMAIL_SEND_FAILED';
      if (code === 'EMAIL_TAKEN' || code === 'EMAIL_ALREADY_VERIFIED') throw new HttpError(409, code);
      if (['INVALID_EMAIL', 'EMAIL_ALIAS_NOT_SUPPORTED', 'EMAIL_DOMAIN_NOT_ALLOWED', 'EMAIL_NOT_CONFIGURED'].includes(code)) {
        throw new HttpError(400, code);
      }
      throw error;
    }
  })
);

router.get(
  '/email/verify',
  rateLimit({ name: 'email-verify', limit: 30, windowSeconds: 3600, failClosed: false }),
  asyncHandler(async (req, res) => {
    const token = typeof req.query.token === 'string' ? req.query.token : '';
    const ok = await verifyEmailToken(token);
    res.status(ok ? 200 : 400).json({ ok });
  })
);

/** 登录后认领匿名期间的对局记录,实现本地进度同步到账号 */
router.post(
  '/claim',
  requireAuth,
  rateLimit({
    name: 'claim',
    limit: 3,
    windowSeconds: 3600,
    key: requestIdentity,
    failClosed: true,
  }),
  asyncHandler(async (req, res) => {
    if (!req.guestKey) throw new HttpError(400, 'GUEST_KEY_REQUIRED');
    const guestKey = req.guestKey;
    const claimed = await db('games')
      .where({ guest_key: guestKey })
      .whereNull('user_id')
      .update({ user_id: req.user!.id, guest_key: null });
    clearGuestCookie(res);
    await invalidateCached(
      ...DIFFICULTY_LEVELS.map((difficulty) => leaderboardCacheKey('single', difficulty.key)),
      ...allPersonalStatsCacheKeys(`g:${guestKey}`),
      ...allPersonalStatsCacheKeys(`u:${req.user!.id}`),
      `room-player-performance:g:${guestKey}`,
      `room-player-performance:u:${req.user!.id}`
    );
    res.json({ claimed });
  })
);

export default router;
