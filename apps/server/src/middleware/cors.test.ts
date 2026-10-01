import { describe, expect, it } from 'vitest';
import { buildCorsOptions, isRequestOriginAllowed } from './cors';

const req = (host: string) => ({ headers: { host } });

/** 直接调 cors 的 origin 回调，拿到 (err, allow) —— 不依赖真实请求。 */
function evaluate(options: ReturnType<typeof buildCorsOptions>, origin: string | undefined) {
  const originFn = options.origin as (
    origin: string | undefined,
    cb: (err: Error | null, allow?: boolean | string) => void
  ) => void;
  let err: Error | null = null;
  let allow: boolean | string | undefined;
  originFn(origin, (e, a) => {
    err = e;
    allow = a;
  });
  return { err, allow };
}

const options = buildCorsOptions(req('homoto-akina.top'));
const localOptions = buildCorsOptions(req('localhost:3000'));

describe('buildCorsOptions', () => {
  it('没有 Origin 时放行（curl / 健康检查）', () => {
    const { err, allow } = evaluate(localOptions, undefined);
    expect(err).toBeNull();
    expect(allow).toBe(true);
  });
  it('同源（Origin 的 host 与请求 Host 一致）放行', () => {
    expect(evaluate(localOptions, 'http://localhost:3000').allow).toBe('http://localhost:3000');
  });

  it('被拒绝的来源**不抛错**，只是不下发 CORS 头', () => {
    // 这条是回归测试：过去这里 throw，socket.io 握手路径会把进程带崩。
    const { err, allow } = evaluate(buildCorsOptions(req('localhost:3000')), 'http://evil.example');
    expect(err).toBeNull();
    expect(allow).toBe(false);
  });

  it('被拒绝多次也只回调 false，不会累积异常', () => {
    for (let i = 0; i < 5; i += 1) {
      expect(evaluate(buildCorsOptions(req('localhost:3000')), 'http://evil.example').err).toBeNull();
    }
  });
});

describe('isRequestOriginAllowed', () => {
  it('Origin 缺失时交给后续中间件', () => {
    expect(isRequestOriginAllowed(req('localhost:3000'), undefined)).toBe(true);
  });

  it('host 相同（协议 / 端口一致）放行', () => {
    expect(isRequestOriginAllowed(req('localhost:3000'), 'http://localhost:3000')).toBe(true);
  });

  it('跨站的陌生来源拒绝', () => {
    expect(isRequestOriginAllowed(req('localhost:3000'), 'http://evil.example')).toBe(false);
  });

  it('白名单里的 host 换协议也算（http 页面访问 https 白名单站点）', () => {
    // 默认 CORS_ORIGINS 含 http://localhost:5173；https 形式同 host 应放行，
    // 否则访客从 http 入口进来时接口会被 CORS 拦死。
    expect(isRequestOriginAllowed(req('tunnel.example'), 'https://localhost:5173')).toBe(true);
    expect(isRequestOriginAllowed(req('tunnel.example'), 'https://localhost:9999')).toBe(false);
  });
});
