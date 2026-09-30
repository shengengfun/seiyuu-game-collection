/**
 * 判断 Origin 是否与本次请求的 Host 同源(host:port 完全一致)。
 *
 * 为什么需要它：Vite 构建出的 HTML 里是 `<script type="module" crossorigin>`，
 * 浏览器对**同源**的模块脚本请求也会带上 `Origin` 头。若服务端只相信 CORS_ORIGINS 白名单，
 * 那么用 IP 或 localhost 直连（例如 http://localhost:3000）访问自己托管的前端时，
 * 静态资源会被判为非法来源 → 500 → 整站白屏。
 *
 * 参数只依赖 `headers.host`，因此 express 的 Request、node 的 IncomingMessage、
 * cors 包的 CorsRequest 都能直接传进来。
 */
export function isSameHostOrigin(
  req: { headers?: Record<string, unknown> | undefined },
  origin: string | undefined
): boolean {
  if (!origin) return false;
  const host = req.headers?.host;
  if (typeof host !== 'string' || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
