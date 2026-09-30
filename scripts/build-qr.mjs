/**
 * 生成海报底部的二维码（静态 PNG，前端不引二维码库）。
 *
 * 用法（仓库根目录）：
 *   node scripts/build-qr.mjs
 * 换域名：QR_ORIGIN=https://example.com node scripts/build-qr.mjs
 *
 * 首次运行会用 npx 下载 qrcode CLI（需要网络，本机走系统代理即可）。
 * 产物提交到 client/public/qr/，海报运行时只做一次同源图片加载。
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = resolve(root, 'client/public/qr');
const ORIGIN = (process.env.QR_ORIGIN ?? 'https://homoto-akina.top').replace(/\/$/, '');

/** 文件名 -> 站点路径。文件名就是页面里 `qr/<name>.png` 的 name。 */
const TARGETS = {
  home: '/',
  'seiyu-guess': '/seiyu-guess',
  seivalue: '/seivalue',
  'who-you-are': '/seiyu-who-you-are',
  'seiyuu-quiz': '/seiyuu-quiz',
  sukikirai: '/seiyuu-sukikirai',
  'song-quiz': '/song-quiz',
  'like-you': '/seiyu-like-you',
  bingo: '/seiyuu-bingo',
  network: '/seiyuu-network',
  life: '/seiyuu-life',
  agency: '/seiyuu-agency',
  resume: '/seiyuu-resume',
};

const SIZE = '512';
const MARGIN = '2';

mkdirSync(outDir, { recursive: true });

for (const [name, path] of Object.entries(TARGETS)) {
  const url = `${ORIGIN}${path}`;
  const out = resolve(outDir, `${name}.png`);
  execFileSync(
    'cmd.exe',
    ['/c', 'npx', '-y', 'qrcode@1.5.4', '-o', out, '-w', SIZE, '-m', MARGIN, url],
    { stdio: ['ignore', 'pipe', 'inherit'], cwd: root },
  );
  console.log(`${name.padEnd(14)} ${String(statSync(out).size).padStart(6)} B  ${url}`);
}
console.log(`共 ${Object.keys(TARGETS).length} 张 → client/public/qr/`);
