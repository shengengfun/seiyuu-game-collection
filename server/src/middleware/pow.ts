import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { config } from '../config';
import {
  consumeAndVerifyChallenge,
  getRequestPow,
  PowVerificationError,
} from '../services/pow';

const registerPowSchema = z.object({
  id: z.string().uuid(),
  nonce: z.string().regex(/^\d{1,20}$/),
});

function requireFreshRegistrationPow(req: Request, res: Response, next: NextFunction): void {
  const proof = registerPowSchema.safeParse({
    id: req.headers['x-register-pow-id'],
    nonce: req.headers['x-register-pow-nonce'],
  });
  if (!proof.success) {
    res.status(428).json({ code: 'POW_REQUIRED', requiredDifficulty: config.powRegisterDifficulty });
    return;
  }
  void consumeAndVerifyChallenge(
    proof.data.id,
    proof.data.nonce,
    req.headers['user-agent'],
    req.ip,
    'register'
  ).then((difficulty) => {
    if (difficulty < config.powRegisterDifficulty) {
      res.status(428).json({ code: 'POW_REQUIRED', requiredDifficulty: config.powRegisterDifficulty });
      return;
    }
    next();
  }).catch((error) => {
    if (error instanceof PowVerificationError) {
      res.status(428).json({ code: 'POW_REQUIRED', requiredDifficulty: config.powRegisterDifficulty });
      return;
    }
    next(error);
  });
}

/** 走「注册档」PoW 的路径：注册与两个发信端点（都会触发真实邮件投递）。 */
const REGISTRATION_POW_PATHS = new Set([
  '/auth/register',
  '/auth/register/code',
  '/auth/password/code',
]);

export function requirePow(req: Request, res: Response, next: NextFunction) {
  if (req.method === 'OPTIONS') return next();
  // Verification links are bearer tokens delivered through email and must work
  // when opened directly without a JavaScript PoW client.
  if (req.method === 'GET' && req.path === '/auth/email/verify') return next();
  // Skip PoW when difficulty is 0 (local development)
  if (config.powDifficulty <= 0) return next();
  if (req.method === 'POST' && REGISTRATION_POW_PATHS.has(req.path)) {
    requireFreshRegistrationPow(req, res, next);
    return;
  }
  const access = getRequestPow(req);
  const requiredDifficulty = config.powDifficulty;
  if (!access || access.difficulty < requiredDifficulty) {
    return res.status(428).json({ code: 'POW_REQUIRED', requiredDifficulty });
  }
  res.setHeader('X-PoW-Expires-At', String(access.expiresAt));
  res.setHeader('X-PoW-Expires-In', String(Math.max(0, access.expiresAt - Date.now())));
  next();
}
