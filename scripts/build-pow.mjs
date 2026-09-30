#!/usr/bin/env node
/**
 * PoW 的 WASM 产物准备脚本。
 *
 * 浏览器侧（client/src/api/pow.worker.ts）直接 fetch `/pow/csgofriberg_pow.wasm`，
 * 这份 9KB 的预编译产物**已随仓库提交**在 client/public/pow/ 下，日常构建不需要 Rust 工具链。
 *
 * 因此本脚本默认只做校验：产物在就直接跳过，保证 `pnpm build` 在任何机器上都能跑通
 * （Rust/cargo 缺失、离线环境都不影响发版）。
 * 需要真正重新编译时加 --force（要求已安装 cargo + wasm32-unknown-unknown 目标）：
 *
 *   node scripts/build-pow.mjs --force
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// 本仓库根目录与「整合包」_package/ 下各有一份 client/public，两边都要同步。
const artifactTargets = [rootDir, path.join(rootDir, '_package')]
  .map((base) => path.join(base, 'client', 'public', 'pow', 'csgofriberg_pow.wasm'))
  .filter((file, index) => index === 0 || fs.existsSync(path.dirname(path.dirname(file))));
const builtWasm = path.join(
  rootDir,
  'pow-wasm',
  'target',
  'wasm32-unknown-unknown',
  'release',
  'csgofriberg_pow.wasm'
);

const force = process.argv.includes('--force');
const existing = artifactTargets.filter((file) => fs.existsSync(file));

if (existing.length && !force) {
  console.log('[build-pow] 复用已提交的预编译产物（需要重编译请加 --force）:');
  for (const file of existing) {
    console.log(`[build-pow]   ${path.relative(rootDir, file)} ${fs.statSync(file).size} bytes`);
  }
  process.exit(0);
}

const build = spawnSync(
  'cargo',
  ['build', '--release', '--target', 'wasm32-unknown-unknown', '--manifest-path', path.join(rootDir, 'pow-wasm', 'Cargo.toml')],
  { stdio: 'inherit', shell: process.platform === 'win32' }
);

if (build.error || build.status !== 0) {
  if (existing.length) {
    console.warn('[build-pow] 编译失败，继续使用已提交的预编译产物。');
    process.exit(0);
  }
  console.error('[build-pow] 编译失败且没有可用的预编译产物。');
  process.exit(1);
}

for (const target of artifactTargets) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(builtWasm, target);
  console.log(`[build-pow] 已更新 ${path.relative(rootDir, target)} (${fs.statSync(target).size} bytes)`);
}
