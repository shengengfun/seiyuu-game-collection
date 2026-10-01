// 构建主站与所有游戏模块共用的 vendor 产物。
//
// 目的：让主站和小游戏模块用的是**同一份** React / Router / i18n / SDK 实例。
// 做法：把共享依赖打包成一组文件名固定的 ESM（apps/host/public/vendor/*.js），
//       主站与模块在构建时都把它们外置成 `/vendor/<固定名>.js`
//       （见 apps/host/vite-plugins/sharedVendor.ts 与各模块的 shared-deps.mjs）。
//
// 为什么是「显式具名 re-export」而不是 `export * from 'pkg'`：
//   React 18 只有 CJS 产物。esbuild 在 `format: 'esm'` 下无法把 CJS 的具名导出
//   展开进 `export *`（产物里只剩 default，浏览器直接报
//   `does not provide an export named 'useEffect'`）。Rollup + commonjs 同理。
//   所以这里先用 esbuild 自己探测出每个包的真实导出名（esbuild 的 CJS 词法分析
//   能识别 `exports.useEffect = ...`），再据此生成
//   `export { useEffect, useState } from 'react'` 这样的显式垫片 —— esbuild
//   对这种写法能正确产出具名导出。
//
// 产物为什么不放在 apps/host/public/：
//   Vite 6 明确禁止源码 import public 目录里的 JS（"Cannot import non-asset file
//   /vendor/react.js which is inside /public"），而主站源码、dev 的依赖预打包产物、
//   以及运行期加载的游戏模块**都必须** import 同一个 `/vendor/*.js`，否则页面里会
//   出现两份 React。所以产物落在 apps/host/vendor/ —— 它是项目根目录下的普通目录，
//   Vite 会把 `/vendor/*.js` 解析到它（dev 直接当模块提供），
//   构建时再由 vendorDistCopy 插件拷进 dist/vendor/。
//
// 用法： node scripts/build-vendor.mjs [--force]
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { build } from 'esbuild';

const require = createRequire(import.meta.url);

const ROOT = path.resolve(import.meta.dirname, '..');
const HOST_DIR = path.join(ROOT, 'apps/host');
const ENTRY_DIR = path.join(HOST_DIR, '.vendor');
const PROBE_DIR = path.join(HOST_DIR, '.vendor-probe');
const OUT_DIR = path.join(HOST_DIR, 'vendor');
const MANIFEST = path.join(OUT_DIR, 'vendor.json');

/** specifier → 产物文件名。这份映射同时决定运行期 import map 的 URL。 */
const VENDOR_ENTRIES = {
  react: 'react.js',
  'react/jsx-runtime': 'react-jsx-runtime.js',
  'react-dom': 'react-dom.js',
  'react-dom/client': 'react-dom-client.js',
  'react-router-dom': 'react-router-dom.js',
  i18next: 'i18next.js',
  'react-i18next': 'react-i18next.js',
  zustand: 'zustand.js',
  axios: 'axios.js',
  'socket.io-client': 'socket-io-client.js',
  '@seiyuu/shared': 'seiyuu-shared.js',
  '@seiyuu/game-sdk': 'seiyuu-game-sdk.js',
};

const force = process.argv.includes('--force');

/**
 * 自家 workspace 包是纯 ESM，esbuild 能静态解析，`export *` 即可正确展开具名导出，
 * 无需探测（探测要真的执行模块，而这些包带有 window 之类的顶层副作用）。
 */
const STAR_EXPORT = new Set(['@seiyuu/shared', '@seiyuu/game-sdk']);

/**
 * 读取 .env 里的 VITE_* 变量。
 * vendor 产物是浏览器直接加载的静态文件，不经过 Vite 的 define，
 * 所以 `import.meta.env` 必须在这里自己填上（否则 SDK 里
 * `import.meta.env.VITE_QQ_APP_ID` 会在运行期抛错）。
 */
function readViteEnv() {
  const env = {};
  const files = ['.env', '.env.local', '.env.production', '.env.production.local'];
  for (const dir of [ROOT, HOST_DIR]) {
    for (const name of files) {
      const file = path.join(dir, name);
      if (!fs.existsSync(file)) continue;
      for (const raw of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
        const line = raw.trim();
        if (!line || line.startsWith('#')) continue;
        const eq = line.indexOf('=');
        if (eq < 0) continue;
        const key = line.slice(0, eq).trim();
        if (!key.startsWith('VITE_')) continue;
        let value = line.slice(eq + 1).trim();
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }
        env[key] = value;
      }
    }
  }
  return env;
}

/** vendor 产物里 `import.meta.env` 的取值：与 Vite 生产构建保持一致。 */
const VITE_ENV = {
  MODE: 'production',
  DEV: false,
  PROD: true,
  BASE_URL: '/',
  SSR: false,
  ...readViteEnv(),
};

/** 产物齐全且清单匹配时跳过重建。 */
function entriesFresh() {
  if (!fs.existsSync(MANIFEST)) return false;
  const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
  const expected = Object.values(VENDOR_ENTRIES).sort();
  if (JSON.stringify(Object.keys(manifest.imports ?? {}).sort()) !== JSON.stringify(expected.sort())) {
    return false;
  }
  return expected.every((file) => fs.existsSync(path.join(OUT_DIR, file)));
}

if (!force && entriesFresh()) {
  console.log('[vendor] 已是最新，跳过（--force 可强制重建）');
  process.exit(0);
}

fs.rmSync(ENTRY_DIR, { recursive: true, force: true });
fs.rmSync(PROBE_DIR, { recursive: true, force: true });
fs.rmSync(OUT_DIR, { recursive: true, force: true });
fs.mkdirSync(ENTRY_DIR, { recursive: true });
fs.mkdirSync(PROBE_DIR, { recursive: true });

/**
 * 用 esbuild 自己解析并打包该包，得到一个命名空间对象，返回它的导出名数组。
 * 这样拿到的名字与随后真正打包时的解析结果完全一致（含 CJS 互操作）。
 */
async function probeExports(specifier, index) {
  const entry = path.join(PROBE_DIR, `probe-${index}.mjs`);
  const outfile = path.join(PROBE_DIR, `probe-${index}.cjs`);
  fs.writeFileSync(
    entry,
    `import * as ns from ${JSON.stringify(specifier)};\nexport default Object.keys(ns).sort();\n`,
    'utf8'
  );
  await build({
    entryPoints: [entry],
    outfile,
    bundle: true,
    format: 'cjs',
    platform: 'node',
    target: 'node18',
    /* 探测阶段只关心导出名，静态资源与样式一律置空，避免为它们配 loader */
    logLevel: 'error',
    loader: {
      '.jpg': 'empty',
      '.jpeg': 'empty',
      '.png': 'empty',
      '.webp': 'empty',
      '.gif': 'empty',
      '.svg': 'empty',
      '.css': 'empty',
    },
    define: { 'process.env.NODE_ENV': '"production"', 'import.meta.env': JSON.stringify(VITE_ENV), 'import.meta.url': '""' },
  });
  delete require.cache[require.resolve(outfile)];
  const mod = require(outfile);
  const names = mod.default ?? mod;
  return Array.isArray(names) ? names : Object.keys(names);
}

/** JS 保留字不能直接作为 `export { x }` 里的绑定名，需要别名。 */
const RESERVED = new Set([
  'break', 'case', 'catch', 'class', 'const', 'continue', 'debugger', 'default', 'delete', 'do',
  'else', 'enum', 'export', 'extends', 'false', 'finally', 'for', 'function', 'if', 'import',
  'in', 'instanceof', 'new', 'null', 'return', 'super', 'switch', 'this', 'throw', 'true', 'try',
  'typeof', 'var', 'void', 'while', 'with', 'yield', 'await', 'let', 'static', 'implements',
  'interface', 'package', 'private', 'protected', 'public',
]);

/** 由导出名清单生成 `export { ... } from 'pkg'` 垫片。 */
function shimSource(specifier, names) {
  const lines = [];
  const clauses = [];
  const used = new Set();
  names
    .filter((name) => name !== 'default')
    .forEach((name, i) => {
      if (/^[A-Za-z_$][\w$]*$/.test(name) && !RESERVED.has(name)) {
        clauses.push(name);
        return;
      }
      let local = `_export_${i}`;
      while (used.has(local)) local = `${local}_`;
      used.add(local);
      clauses.push(`${JSON.stringify(name)} as ${local}`);
    });
  if (names.includes('default')) {
    // 不能写 `export { default } from 'pkg'`：探测到的 default 对 CJS 包是 esbuild
    // 互操作合成的，静态检查会报 "No matching export"。运行时从命名空间取即可。
    lines.push(`import * as __ns from ${JSON.stringify(specifier)};`);
  }
  if (clauses.length) lines.push(`export { ${clauses.join(', ')} } from ${JSON.stringify(specifier)};`);
  if (names.includes('default')) lines.push('export default __ns.default;');
  if (!lines.length) lines.push(`export {} from ${JSON.stringify(specifier)};`);
  return `${lines.join('\n')}\n`;
}

const entryPoints = {};
const exportCounts = {};
let entryIndex = 0;
for (const [specifier, file] of Object.entries(VENDOR_ENTRIES)) {
  const entryName = file.replace(/\.js$/, '');
  const shimPath = path.join(ENTRY_DIR, `${entryName}.js`);
  if (STAR_EXPORT.has(specifier)) {
    fs.writeFileSync(shimPath, `export * from ${JSON.stringify(specifier)};\n`, 'utf8');
    exportCounts[specifier] = -1; // -1 表示走 export *，不做名字探测
  } else {
    const names = await probeExports(specifier, entryIndex++);
    if (!names.length) throw new Error(`[vendor] 解析不到 ${specifier} 的导出（模块未安装？）`);
    exportCounts[specifier] = names.length;
    fs.writeFileSync(shimPath, shimSource(specifier, names), 'utf8');
  }
  entryPoints[entryName] = shimPath;
}

const result = await build({
  entryPoints,
  outdir: OUT_DIR,
  bundle: true,
  splitting: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2022',
  minify: true,
  legalComments: 'none',
  entryNames: '[name]',
  chunkNames: 'shared-[hash]',
  assetNames: 'assets/[name]-[hash]',
  /* 共享包里带的图片资源（如 specialThanks 头像）随产物一起落到 public/vendor/assets */
  loader: {
    '.jpg': 'file',
    '.jpeg': 'file',
    '.png': 'file',
    '.webp': 'file',
    '.gif': 'file',
    '.svg': 'file',
  },
  /* 与 Vite 生产构建一致：去掉 React 的开发期警告分支，并把 import.meta.env 填实 */
  define: { 'process.env.NODE_ENV': '"production"', 'import.meta.env': JSON.stringify(VITE_ENV) },
  logLevel: 'warning',
  metafile: true,
});

/* 自检：确认每个产物都真的导出了具名符号（防止再次退化成「只有 default」）。 */
const broken = [];
for (const [specifier, file] of Object.entries(VENDOR_ENTRIES)) {
  const source = fs.readFileSync(path.join(OUT_DIR, file), 'utf8');
  const blocks = source.match(/export\s*\{[^}]*\}/g) ?? [];
  const count = blocks
    .join('')
    .replace(/export\s*\{|\}/g, '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean).length;
  if (count === 0) broken.push(`${file} (${specifier})`);
}
if (broken.length) throw new Error(`[vendor] 产物缺少具名导出：${broken.join(', ')}`);

const manifest = {
  generatedAt: Date.now(),
  /** 裸包名 → 站点绝对 URL，主站与模块构建时按这张表外置依赖 */
  imports: Object.fromEntries(
    Object.entries(VENDOR_ENTRIES).map(([specifier, file]) => [specifier, `/vendor/${file}`])
  ),
  exportCounts,
  outputs: Object.keys(result.metafile.outputs).sort(),
};
fs.writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

fs.rmSync(PROBE_DIR, { recursive: true, force: true });

const files = fs.readdirSync(OUT_DIR);
const total = files.reduce((sum, name) => {
  const full = path.join(OUT_DIR, name);
  return fs.statSync(full).isFile() ? sum + fs.statSync(full).size : sum;
}, 0);
console.log(
  `[vendor] 构建完成：${files.length} 个文件 / ${(total / 1024).toFixed(0)} KB → ${path.relative(ROOT, OUT_DIR)}`
);
