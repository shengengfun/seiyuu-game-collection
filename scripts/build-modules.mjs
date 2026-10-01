// 构建所有小游戏模块，并把产物同步到主站的 public/modules/ 下，同时生成 registry.json。
//
// 用法：
//   node scripts/build-modules.mjs                 全部构建
//   node scripts/build-modules.mjs --only=seiyuu-life,song-quiz
//   node scripts/build-modules.mjs --skip-build    只重新同步产物 + 生成注册表
//   node scripts/build-modules.mjs --check         只做类型检查
//   node scripts/build-modules.mjs --test          只跑各模块的测试
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

const ROOT = path.resolve(import.meta.dirname, '..');
const MODULES_DIR = path.join(ROOT, 'modules');
const HOST_MODULES_DIR = path.join(ROOT, 'apps/host/public/modules');

const args = process.argv.slice(2);
const only = args
  .filter((arg) => arg.startsWith('--only='))
  .flatMap((arg) => arg.slice('--only='.length).split(','))
  .map((value) => value.trim())
  .filter(Boolean);
const skipBuild = args.includes('--skip-build');
const checkOnly = args.includes('--check');
const testOnly = args.includes('--test');

const PNPM = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';

function run(command, cwd) {
  const result = spawnSync(command, {
    cwd,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (result.status !== 0) {
    throw new Error(`命令失败（${command}）：${cwd}`);
  }
}

function readManifest(moduleDir) {
  const manifestPath = path.join(moduleDir, 'module.json');
  if (!fs.existsSync(manifestPath)) return null;
  return JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
}

function listModules() {
  if (!fs.existsSync(MODULES_DIR)) return [];
  return fs
    .readdirSync(MODULES_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => ({
      id: entry.name,
      dir: path.join(MODULES_DIR, entry.name),
    }))
    .filter(({ id, dir }) => {
      if (only.length && !only.includes(id)) return false;
      return Boolean(readManifest(dir));
    });
}

/** 校验清单字段，早失败早发现。 */
function validateManifest(id, manifest) {
  const problems = [];
  if (manifest.id !== id) problems.push(`module.json 的 id（${manifest.id}）与目录名（${id}）不一致`);
  if (!manifest.path?.startsWith('/')) problems.push('path 必须以 / 开头');
  for (const lang of ['zh', 'en', 'ja']) {
    if (!manifest.title?.[lang]) problems.push(`title.${lang} 缺失`);
    if (!manifest.description?.[lang]) problems.push(`description.${lang} 缺失`);
  }
  if (typeof manifest.order !== 'number') problems.push('order 必须是数字');
  if (!manifest.icon) problems.push('icon 缺失');
  if (problems.length) {
    throw new Error(`模块 ${id} 的 module.json 有问题：\n  - ${problems.join('\n  - ')}`);
  }
}

/** 目录内容的 sha1（相对路径 + 文件内容），用来给产物打版本号。 */
function hashDir(dir) {
  const hash = crypto.createHash('sha1');
  const walk = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true }).sort((a, b) =>
      a.name.localeCompare(b.name)
    )) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) walk(full);
      else {
        hash.update(path.relative(dir, full).replace(/\\/g, '/'));
        hash.update(fs.readFileSync(full));
      }
    }
  };
  walk(dir);
  return hash.digest('hex').slice(0, 12);
}

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const source = path.join(from, entry.name);
    const target = path.join(to, entry.name);
    if (entry.isDirectory()) copyDir(source, target);
    else fs.copyFileSync(source, target);
  }
}

const modules = listModules();
if (!modules.length) {
  console.log('[modules] 没有找到任何模块（modules/*/module.json）');
}

const built = [];

for (const { id, dir } of modules) {
  const manifest = readManifest(dir);
  validateManifest(id, manifest);

  const pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));
  const label = `${id} (${pkg.name})`;

  if (checkOnly) {
    console.log(`[modules] typecheck ${label}`);
    run(`${PNPM} --filter ${pkg.name} run typecheck`, ROOT);
    continue;
  }
  if (testOnly) {
    console.log(`[modules] test ${label}`);
    run(`${PNPM} --filter ${pkg.name} run test`, ROOT);
    continue;
  }

  if (!skipBuild) {
    console.log(`[modules] build ${label}`);
    run(`${PNPM} --filter ${pkg.name} run build`, ROOT);
  }

  const distDir = path.join(dir, 'dist');
  if (!fs.existsSync(distDir)) {
    throw new Error(`模块 ${id} 没有构建产物（${path.relative(ROOT, distDir)} 不存在）`);
  }

  const target = path.join(HOST_MODULES_DIR, id);
  fs.rmSync(target, { recursive: true, force: true });
  copyDir(distDir, target);

  // 文案是纯 JSON，不参与打包，直接原样拷贝
  const localesDir = path.join(dir, 'locales');
  if (fs.existsSync(localesDir)) {
    copyDir(localesDir, path.join(target, 'locales'));
  }

  manifest.version = hashDir(target);
  built.push(manifest);
  console.log(`[modules]   → ${path.relative(ROOT, target)} (v${manifest.version})`);
}

if (!checkOnly && !testOnly) {
  // 只重建了部分模块时，把没重建的旧清单也带上，保证注册表完整
  const all = fs.existsSync(MODULES_DIR)
    ? fs
        .readdirSync(MODULES_DIR, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => ({ id: entry.name, dir: path.join(MODULES_DIR, entry.name) }))
        .filter(({ dir }) => fs.existsSync(path.join(dir, 'module.json')))
    : [];

  const registryModules = [];
  for (const { id, dir } of all) {
    const existing = built.find((item) => item.id === id);
    if (existing) {
      registryModules.push(existing);
      continue;
    }
    const manifest = readManifest(dir);
    validateManifest(id, manifest);
    const target = path.join(HOST_MODULES_DIR, id);
    if (!fs.existsSync(target)) {
      console.log(`[modules] ! 跳过 ${id}：还没有产物，先跑一次完整构建`);
      continue;
    }
    manifest.version = hashDir(target);
    registryModules.push(manifest);
  }

  registryModules.sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));

  const registry = {
    version: 1,
    generatedAt: Date.now(),
    modules: registryModules,
  };
  fs.mkdirSync(HOST_MODULES_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(HOST_MODULES_DIR, 'registry.json'),
    `${JSON.stringify(registry, null, 2)}\n`,
    'utf8'
  );
  console.log(
    `[modules] registry.json：${registryModules.length} 个模块 → ${path.relative(
      ROOT,
      path.join(HOST_MODULES_DIR, 'registry.json')
    )}`
  );
}
