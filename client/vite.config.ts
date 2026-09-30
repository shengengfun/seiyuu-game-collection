/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const configuredVersion = process.env.RESOURCE_VERSION?.trim();
if (configuredVersion && !/^\d{13}$/.test(configuredVersion)) {
  throw new Error('RESOURCE_VERSION must be a 13-digit Unix timestamp in milliseconds');
}
const resourceVersion = configuredVersion || String(Date.now());
process.env.VITE_RESOURCE_VERSION = resourceVersion;

export default defineConfig({
  plugins: [
    react(),
    {
      /**
       * dev 服务器的源码资源（含 /src/**.css）默认带 max-age=14400，
       * 经 Cloudflare 隧道对外时会被浏览器与边缘缓存 4 小时：
       * 表现为「JS 是新的、CSS 是旧的」，样式看起来整体失效。
       * 这里在 dev 下把所有响应钉成 no-store，改动即时可见。
       */
      name: 'dev-no-store-cache',
      apply: 'serve',
      configureServer(server) {
        server.middlewares.use((_req, res, next) => {
          const original = res.setHeader.bind(res);
          res.setHeader = (name: string, value: number | string | readonly string[]) => {
            if (String(name).toLowerCase() === 'cache-control') {
              return res;
            }
            return original(name, value);
          };
          original('Cache-Control', 'no-store');
          next();
        });
      },
    },
    {
      /**
       * `vite preview` 是「公网入口」时使用的静态服务器(Cloudflare 隧道的源站端口固定
       * 为 5173,见 cloudflared/)。它默认不给任何响应写 Cache-Control,浏览器只能靠 ETag
       * 逐个回源做 304 校验——站点有 100+ 张声优头像,弱网下光校验就要好几秒。
       * 这里按资源类型补上头:
       *   /assets/**  文件名带内容哈希 → 永久不可变
       *   图片/字体    不带哈希,但极少改动 → 缓存 7 天
       *   HTML         必须每次校验,保证发版后能立刻拿到新的资源引用
       */
      name: 'preview-static-cache',
      configurePreviewServer(server) {
        server.middlewares.use((req, res, next) => {
          const url = (req.url || '').split('?')[0];
          const cacheControl = /^\/assets\//.test(url)
            ? 'public, max-age=31536000, immutable'
            : /\.(?:avif|gif|ico|jpe?g|png|svg|webp|woff2?|wasm)$/i.test(url)
              ? 'public, max-age=604800, stale-while-revalidate=86400'
              : /\.[A-Za-z0-9]{1,16}$/.test(url)
                ? null
                : 'no-cache';
          if (!cacheControl) return next();
          const original = res.setHeader.bind(res);
          res.setHeader = (name: string, value: number | string | readonly string[]) => {
            if (String(name).toLowerCase() === 'cache-control') return res;
            return original(name, value);
          };
          original('Cache-Control', cacheControl);
          next();
        });
      },
    },
    {
      // 把 Vite 注入 head 的 CSS(如 *.module.css 的产物)搬进 body 的样式表组,
      // 保证首绘只依赖 head 内联启动屏样式,不被任何外链 CSS 阻塞
      name: 'move-injected-css-to-body',
      apply: 'build',
      transformIndexHtml: {
        order: 'post',
        handler(html: string) {
          const moved: string[] = [];
          const stripped = html.replace(
            /[ \t]*<link rel="stylesheet" crossorigin[^>]*>\r?\n?/g,
            (match) => {
              moved.push(match.trim());
              return '';
            }
          );
          if (!moved.length) return html;
          return stripped.replace(
            /<link rel="stylesheet"(?![^>]*crossorigin)[^>]*data-blast-theme[^>]*>/,
            (firstBlastLink) => `${moved.join('\n    ')}\n    ${firstBlastLink}`
          );
        },
      },
    },
  ],
  server: {
    host: '0.0.0.0',
    port: 5173,
    // 彻底关闭 Host 校验:樱花FRP等穿透工具域名不固定,
    // 用 allowedHosts: true 等价于允许所有 Host (Vite 5 文档推荐写法)
    allowedHosts: true,
    proxy: {
      '/api': 'http://localhost:3000',
      '/socket.io': { target: 'http://localhost:3000', ws: true },
    },
  },
  /**
   * 生产预览服务:端口必须与 dev 一致(5173)。
   * Cloudflare 隧道的源站是远程托管的、写死 http://localhost:5173,本地改不了;
   * 因此对外提供构建产物时,就在同一个端口上用 preview 顶上,隧道侧无需改动。
   * strictPort 不能省:端口被占用时宁可启动失败,也不能悄悄换到 5174 让公网 502。
   */
  preview: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    allowedHosts: true,
    proxy: {
      '/api': 'http://localhost:3000',
      '/socket.io': { target: 'http://localhost:3000', ws: true },
    },
  },
  build: {
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        // 路由保持静态导入,所有 chunk 首屏即加载;拆分只为长缓存:
        // 业务代码变更时 vendor chunk 的 hash 不变,老用户无需重新下载。
        // 注意:所有依赖 React 的包必须同在 vendor 内,单独拆出的 chunk
        // 只能是确定不依赖 React 的包,否则 chunk 间会形成循环引用,
        // 运行时报 "Cannot read properties of undefined (reading 'createContext')"
        manualChunks(id: string) {
          if (!id.includes('node_modules')) return undefined;
          if (/socket\.io|engine\.io/.test(id)) return 'realtime';
          if (/[\\/]node_modules[\\/]i18next[\\/]/.test(id)) return 'i18n';
          return 'vendor';
        },
      },
    },
    // CSP style-src is 'self' (+ unsafe-inline); data: stylesheet URLs are blocked.
    assetsInlineLimit(filePath, content) {
      if (/\.(?:avif|gif|jpe?g|png|svg|webp)$/i.test(filePath) || filePath.endsWith('.css')) {
        return false;
      }
      return content.length < 4096;
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    restoreMocks: true,
    clearMocks: true,
  },
});
