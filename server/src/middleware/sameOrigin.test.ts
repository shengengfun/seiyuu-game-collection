import { describe, expect, it } from 'vitest';
import { isSameHostOrigin } from './sameOrigin';

const req = (host: string) => ({ headers: { host } });

describe('isSameHostOrigin', () => {
  it('host 与请求 Host 相同时视为同源', () => {
    expect(isSameHostOrigin(req('localhost:3000'), 'http://localhost:3000')).toBe(true);
    expect(isSameHostOrigin(req('192.168.0.108:3000'), 'http://192.168.0.108:3000')).toBe(true);
    // 默认端口会省略,80 与显式 :80 等价
    expect(isSameHostOrigin(req('example.com'), 'http://example.com')).toBe(true);
  });

  it('端口或主机不同则不算同源', () => {
    expect(isSameHostOrigin(req('localhost:3000'), 'http://localhost:5173')).toBe(false);
    expect(isSameHostOrigin(req('localhost:3000'), 'http://evil.com')).toBe(false);
  });

  it('Origin 缺失或非法时为 false', () => {
    expect(isSameHostOrigin(req('localhost:3000'), undefined)).toBe(false);
    expect(isSameHostOrigin(req('localhost:3000'), 'not a url')).toBe(false);
  });

  it('请求没有 Host 头时为 false', () => {
    expect(isSameHostOrigin({ headers: {} }, 'http://localhost:3000')).toBe(false);
  });
});
