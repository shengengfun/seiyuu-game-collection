import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';

const VENDOR_DIR = fileURLToPath(new URL('../vendor', import.meta.url));

/**
 * 把共享依赖外置到 `/vendor/*.js`（**只作用于生产构建**）。
 *
 * 主站与每个小游戏模块都各自独立构建，但必须共用**同一份** React / Router / i18n / SDK，
 * 否则模块里的 `useContext` 拿不到主站的上下文、`<Link>` 也不在同一个 Router 树里。
 *
 * 这里读 `scripts/build-vendor.mjs` 产出的清单，把裸包名解析成站点绝对 URL 并标记为
 * external，Rollup 原样保留 `import ... from '/vendor/react.js'`，产物由
 * `vendorDistCopy` 拷到 `dist/vendor/`。
 *
 * dev **不做外置**：Vite 的依赖预打包会给出另一份 React，而把预打包也强制外置又会踩到
 * 「源码不能 import public 目录里的 JS」（`Cannot import non-asset file ... which is inside
 * /public`）。dev 改为直接加载模块源码，由 Vite 保证全局只有一份 React —— 见 `devModules()`。
 *
 * ⚠️ 产物位置：`apps/host/vendor/`（不是 `public/`，理由见上；也不能放在项目根之外，
 *    否则 Vite 会把 `/vendor/react.js` 当根相对路径解析并报 Failed to resolve import）。
 */
export function sharedVendor(): Plugin {
  const imports = loadImports();

  return {
    name: 'seiyuu:shared-vendor',
    apply: 'build',
    enforce: 'pre',
    resolveId(source, importer) {
      const url = imports[source];
      if (!url) return null;
      /*
       * 依赖扫描阶段（vite:dep-scan 用 esbuild 扫描入口）会把这些包名当成
       * 自己的入口去解析，此时返回 external 会直接让 esbuild 报
       * 「The entry point "react" cannot be marked as external」。
       * 用 importer 区分：没有 importer 说明是扫描/入口，交给 Vite 正常处理。
       */
      if (!importer) return null;
      return { id: url, external: true };
    },
  };
}

/** build：把 vendor 整体拷进 dist/vendor，供静态托管 / preview 使用。 */
export function vendorDistCopy(): Plugin {
  return {
    name: 'seiyuu:vendor-dist-copy',
    apply: 'build',
    writeBundle(options) {
      const outDir = options.dir || path.resolve(process.cwd(), 'dist');
      if (!fs.existsSync(VENDOR_DIR)) {
        throw new Error('找不到 apps/host/vendor，请先运行 `node scripts/build-vendor.mjs`');
      }
      const target = path.join(outDir, 'vendor');
      fs.rmSync(target, { recursive: true, force: true });
      fs.cpSync(VENDOR_DIR, target, { recursive: true });
    },
  };
}

function loadImports(): Record<string, string> {
  const manifestPath = findManifest();
  if (!manifestPath) {
    throw new Error(
      '找不到 vendor/vendor.json，请先在仓库根目录运行 `node scripts/build-vendor.mjs`'
    );
  }
  return JSON.parse(fs.readFileSync(manifestPath, 'utf8')).imports ?? {};
}

/**
 * 配置文件在 Vite 里可能被当成 CJS 加载（此时 `import.meta.url` 不可用），
 * 因此这里按「cwd 是仓库根 / cwd 是 apps/host」两种情况依次找清单。
 */
function findManifest(): string | null {
  const candidates = [
    path.join(process.cwd(), 'vendor/vendor.json'),
    path.join(process.cwd(), 'apps/host/vendor/vendor.json'),
    path.resolve(VENDOR_DIR, 'vendor.json'),
  ];
  return candidates.find((candidate) => fs.existsSync(candidate)) ?? null;
}

/** 模块构建脚本复用同一张表（key 为裸包名，value 为站点绝对 URL）。 */
export function sharedVendorImports(): Record<string, string> {
  return loadImports();
}
