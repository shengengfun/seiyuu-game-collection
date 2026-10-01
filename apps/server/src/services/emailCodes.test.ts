import { describe, expect, it } from 'vitest';
import { buildCodeEmail, generateEmailCode, hashIpForCode } from './emailCodes';

describe('email code generation', () => {
  it('always yields six digits', () => {
    for (let index = 0; index < 200; index += 1) {
      expect(generateEmailCode()).toMatch(/^\d{6}$/);
    }
  });
});

describe('email code template', () => {
  it('states the purpose, code and expiry without leaking account data', () => {
    const mail = buildCodeEmail({ purpose: 'reset', code: '123456', ttlSeconds: 600 });
    expect(mail.subject).toContain('重置密码');
    expect(mail.body).toContain('123456');
    expect(mail.body).toContain('验证码 10 分钟内有效');
    expect(mail.body).not.toContain('@');
  });

  it('uses a distinct subject for registration', () => {
    const register = buildCodeEmail({ purpose: 'register', code: '000001', ttlSeconds: 600 });
    expect(register.subject).toContain('注册');
    expect(register.subject).not.toBe(buildCodeEmail({ purpose: 'reset', code: '000001', ttlSeconds: 600 }).subject);
  });
});

describe('ip hashing for code limits', () => {
  it('is stable and does not keep the raw address', () => {
    const hash = hashIpForCode('203.0.113.7');
    expect(hash).toHaveLength(64);
    expect(hash).toBe(hashIpForCode('203.0.113.7'));
    expect(hash).not.toContain('203.0.113.7');
  });
});
