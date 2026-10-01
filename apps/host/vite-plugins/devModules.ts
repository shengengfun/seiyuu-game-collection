import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';

/**
 * dev 专用：让主站在开发期直接加载模块源码，而不是构建产物。
 *
 * 为什么不能在 dev 里加载构建产物（apps/host/public/modules 下）：
 *   产物把 React 等依赖外置成了 /vendor 下的固定文件名（与生产一致）。但 dev 下
 *   Vite 的依赖预打包会给出另一份 React，页面里于是出现两个 React 实例，组件一调
 *   hook 就报 Cannot read properties of null (reading 'useContext')；而把预打包也
 *   强制外置到 /vendor 又会踩到 Vite 的一条硬限制：源码不能 import public 目录里的 JS。
 *
 * 所以 dev 走另一条路 —— 直接 import 模块的 TSX 源码：
 *   1. /modules/registry.json 由本插件按 modules 下各 module.json 现场生成
 *   2. 入口请求 /modules/<id>/index.js 返回一行转发到 /@fs/ 下的模块源码
 *   3. 模块源码里对 react / router / i18n / SDK 的裸导入走 Vite 正常解析，
 *      与主站共用同一份实例（同一个模块图，只有一个 React）
 *
 * 副作用是开发期模块支持 HMR，改一行源码立即生效，不用跑 build:modules。
 * 生产仍然加载构建产物 + /vendor，两条路径的模块契约完全一致
 * （module.json + default 导出的组件）。
 */
export function devModules(): Plugin {
  const modulesDir = fileURLToPath(new URL('../../../modules', import.meta.url));

  /** 扫描各模块目录下的 module.json，生成 dev 版注册表（入口与样式都换成源码）。 */
  function buildDevRegistry() {
    if (!fs.existsSync(modulesDir)) return { version: 1, generatedAt: Date.now(), modules: [] };
    const modules = fs
      .readdirSync(modulesDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => ({ id: entry.name, dir: path.join(modulesDir, entry.name) }))
      .filter(({ dir }) => fs.existsSync(path.join(dir, 'module.json')))
      .map(({ id, dir }) => {
        const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'module.json'), 'utf8'));
        return {
          ...manifest,
          /* 版本号只用于缓存失效，dev 下固定即可 */
          version: 'dev',
          /*
           * 样式由模块源码里的 `import './styles.css'` 交给 Vite 注入，
           * 不再走注册表的 <link>，因此这里清空，避免去请求不存在的 style.css。
           */
          styles: [],
        };
      })
      .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
    return { version: 1, generatedAt: Date.now(), modules };
  }

  /** 找到模块源码入口（`src/index.tsx` 优先）。 */
  function sourceEntry(id: string): string | null {
    for (const candidate of ['src/index.tsx', 'src/index.ts']) {
      const file = path.join(modulesDir, id, candidate);
      if (fs.existsSync(file)) return file;
    }
    return null;
  }

  /** Windows 绝对路径 → Vite 的 /@fs URL。 */
  function toFsUrl(file: string): string {
    return `/@fs/${file.replace(/\\/g, '/')}`;
  }

  return {
    name: 'seiyuu:dev-modules',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = decodeURIComponent((req.url || '').split('?')[0]);
        if (!url.startsWith('/modules/')) return next();

        if (url === '/modules/registry.json') {
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.setHeader('Cache-Control', 'no-store');
          res.end(JSON.stringify(buildDevRegistry(), null, 2));
          return;
        }

        const matched = /^\/modules\/([^/]+)\/(.+)$/.exec(url);
        if (!matched) return next();
        const [, id, rest] = matched;
        const moduleDir = path.join(modulesDir, id);

        /* 入口：转成一行转发到模块源码，后续解析全部交给 Vite */
        if (rest === 'index.js') {
          const entry = sourceEntry(id);
          if (!entry) return next();
          const fsUrl = toFsUrl(entry);
          res.setHeader('Content-Type', 'text/javascript; charset=utf-8');
          res.setHeader('Cache-Control', 'no-store');
          res.end(`export { default } from ${JSON.stringify(fsUrl)};\n`);
          return;
        }

        /* 模块自带的静态文件（locales/*.json 等）直接从磁盘读，保持纯 JSON */
        const file = path.join(moduleDir, path.normalize(rest));
        if (!file.startsWith(moduleDir) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
          return next();
        }
        res.setHeader('Content-Type', contentTypeOf(file));
        res.setHeader('Cache-Control', 'no-store');
        res.end(fs.readFileSync(file));
      });
    },
  };
}

function contentTypeOf(file: string): string {
  switch (path.extname(file).toLowerCase()) {
    case '.json':
      return 'application/json; charset=utf-8';
    case '.css':
      return 'text/css; charset=utf-8';
    case '.js':
    case '.mjs':
      return 'text/javascript; charset=utf-8';
    case '.svg':
      return 'image/svg+xml';
    default:
      return 'application/octet-stream';
  }
}
