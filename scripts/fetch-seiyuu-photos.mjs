/**
 * 抓取候选声优的公式照（Bangumi 人物图片），存到 client/public/seiyuu/<id>.jpg。
 *
 * 名单来自公共库 `shared/src/seiyuu/roster.ts`（`SEIYUU_ROSTER`），不再解析任何前端文件。
 *
 * 用法（需要 Node 22 的类型剥离才能 import .ts）：
 *   node --experimental-strip-types --disable-warning=ExperimentalWarning scripts/fetch-seiyuu-photos.mjs resolve
 *   node --experimental-strip-types --disable-warning=ExperimentalWarning scripts/fetch-seiyuu-photos.mjs download
 *
 *   resolve  搜索候选，输出 tmp/seiyuu-photo-candidates.json 供人工核对
 *   download 按 overrides（缺失则用自动匹配结果）下载图片
 *
 * 说明：
 * - Bangumi 直连在国内不可达，脚本一律走本地代理（PROXY 环境变量可覆盖）。
 * - 图片选 medium（长边 400），足够卡片展示，单张 10~60KB。
 * - 换图后记得清掉 tmp/seiyuu-photo-candidates.json 重跑 resolve。
 */

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SEIYUU_ROSTER } from '../shared/src/seiyuu/roster.ts';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const outputDir = resolve(root, 'client/public/seiyuu');
const reportFile = resolve(root, 'tmp/seiyuu-photo-candidates.json');

const PROXY = process.env.PROXY ?? 'http://127.0.0.1:7897';
const UA = 'SeiyuGuess/1.0 (https://homoto-akina.top)';

/** 人工指定 Bangumi 人物 id：自动匹配不准或搜索不到时填这里。 */
const OVERRIDES = {
  // 'iida-hikaru': 12345,
};

function curl(args) {
  const command = ['--ssl-no-revoke', '-sS', '-m', '40', '-x', PROXY, ...args];
  let lastError;
  // schannel 偶发握手失败，重试几次即可
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      return execFileSync('curl.exe', command, {
        encoding: 'utf8',
        maxBuffer: 32 * 1024 * 1024,
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

function searchPersons(keyword) {
  const raw = curl([
    '-H',
    `User-Agent: ${UA}`,
    '-H',
    'Content-Type: application/json',
    '-X',
    'POST',
    '-d',
    JSON.stringify({ keyword }),
    'https://api.bgm.tv/v0/search/persons',
  ]);
  try {
    return JSON.parse(raw).data ?? [];
  } catch {
    return [];
  }
}

function download(url, target) {
  curl(['-o', target, url]);
  return existsSync(target) && statSync(target).size > 1024;
}

function loadProfiles() {
  return SEIYUU_ROSTER.map(({ id, name, nameJa }) => ({ id, name, nameJa }));
}

function scoreCandidate(profile, candidate) {
  // Bangumi 用日文原名，所以中日两种写法都比一遍，命中哪个都算数。
  const keys = [profile.name, profile.nameJa].filter(Boolean);
  const name = candidate.name ?? '';
  let score = 0;
  if (keys.includes(name)) score += 100;
  else if (keys.some((key) => name.includes(key) || key.includes(name))) score += 40;
  if (candidate.gender === 'female') score += 30;
  if ((candidate.career ?? []).includes('seiyu')) score += 25;
  if (candidate.images?.medium || candidate.img) score += 10;
  return score;
}

/**
 * 搜索候选并写报告。
 *
 * - 默认**只处理还没有图片的**（已有图的不再联网搜，省时间）；`--force` 才全量重搜。
 * - 单人搜索失败只跳过那一个并继续，最后一次性写报告——避免一个网络抖动让整轮白跑。
 * - 会与已有报告合并，不会丢掉之前的结果。
 */
function resolveCandidates(profiles, force) {
  const previous = existsSync(reportFile)
    ? JSON.parse(readFileSync(reportFile, 'utf8'))
    : [];
  const merged = new Map(previous.map((item) => [item.id, item]));
  const todo = profiles.filter(
    (profile) => force || !existsSync(resolve(outputDir, `${profile.id}.jpg`)),
  );
  console.log(`需要搜索 ${todo.length} 位（共 ${profiles.length} 位，其余已有图片）\n`);

  let failed = 0;
  for (const profile of todo) {
    const keyword = profile.nameJa || profile.name;
    let candidates = [];
    try {
      candidates = searchPersons(keyword).slice(0, 6).map((candidate) => ({
        id: candidate.id,
        name: candidate.name,
        gender: candidate.gender,
        career: candidate.career ?? [],
        image: candidate.images?.medium ?? candidate.img ?? '',
        score: scoreCandidate(profile, candidate),
      }));
      candidates.sort((a, b) => b.score - a.score);
    } catch (error) {
      failed += 1;
      console.log(
        `${profile.id.padEnd(20)} ${profile.name.padEnd(10)} -> 搜索失败：${String(error.message)
          .split('\n')[0]
          .slice(0, 80)}`,
      );
      continue;
    }
    merged.set(profile.id, {
      id: profile.id,
      query: keyword,
      pick: OVERRIDES[profile.id] ?? candidates[0]?.id ?? null,
      candidates,
    });
    console.log(
      `${profile.id.padEnd(20)} ${profile.name.padEnd(10)} -> ${
        candidates[0] ? `#${candidates[0].id} ${candidates[0].name}` : '未找到'
      }`,
    );
  }

  const report = profiles
    .map((profile) => merged.get(profile.id))
    .filter(Boolean);
  mkdirSync(dirname(reportFile), { recursive: true });
  writeFileSync(reportFile, JSON.stringify(report, null, 2), 'utf8');
  console.log(`\n报告已写入 ${reportFile}（${report.length} 条）`);
  if (failed) console.log(`有 ${failed} 位搜索失败，网络恢复后重跑 resolve 即可补上`);
}

function downloadImages(profiles) {
  if (!existsSync(reportFile)) {
    throw new Error('请先运行 resolve');
  }
  const report = JSON.parse(readFileSync(reportFile, 'utf8'));
  mkdirSync(outputDir, { recursive: true });
  const failed = [];
  let skipped = 0;
  for (const profile of profiles) {
    const entry = report.find((item) => item.id === profile.id);
    const target = resolve(outputDir, `${profile.id}.jpg`);
    // 默认只补缺的，已有图片不动；要换图加 --force 或先删掉对应文件。
    if (!force && existsSync(target) && statSync(target).size > 1024) {
      skipped += 1;
      continue;
    }
    const candidate =
      entry?.candidates?.find((item) => item.id === (OVERRIDES[profile.id] ?? entry?.pick)) ??
      entry?.candidates?.[0];
    if (!candidate?.image) {
      failed.push(`${profile.id} (${profile.name}) 无候选图片`);
      continue;
    }
    const url = candidate.image.replace('/r/400/', '/r/400/');
    try {
      if (download(url, target)) {
        console.log(`ok   ${profile.id.padEnd(20)} <- #${candidate.id} ${candidate.name}`);
      } else {
        failed.push(`${profile.id} (${profile.name}) 下载失败`);
      }
    } catch (error) {
      failed.push(`${profile.id} (${profile.name}) ${error.message}`);
    }
  }
  console.log(`\n完成：新下 ${profiles.length - failed.length - skipped}，跳过已有 ${skipped}，失败 ${failed.length}`);
  if (failed.length) {
    console.log('失败清单：');
    failed.forEach((item) => console.log(`  - ${item}`));
  }
}

const profiles = loadProfiles();
const command = process.argv[2] ?? 'resolve';
const force = process.argv.includes('--force');
if (command === 'resolve') {
  resolveCandidates(profiles, force);
} else if (command === 'download') {
  downloadImages(profiles);
} else {
  console.log(
    '用法：node --experimental-strip-types scripts/fetch-seiyuu-photos.mjs resolve|download',
  );
}
