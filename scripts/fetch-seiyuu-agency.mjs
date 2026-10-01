/**
 * 从 Bangumi 抓 roster 里每位声优的「事务所」，产出待整理的 JSON。
 *
 * 用法（仓库根目录）：
 *   node --experimental-strip-types --disable-warning=ExperimentalWarning scripts/fetch-seiyuu-agency.mjs
 *
 * 产出：tmp/seiyuu-agency-raw.json
 *   [{ id, name, nameJa, agency, source, linkDomains }]
 *   - source='infobox'：条目 infobox 里直接写了「事务所」
 *   - source='link'：没写事务所，但「引用来源」指向某家事务所官网（域名可反推）
 *   - source=null：两样都没有，需要人工补
 *
 * 抓完请人工核对一遍，再把结果写进 shared/src/seiyuu/agencies.ts。
 */
import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SEIYUU_ROSTER } from '../shared/src/seiyuu/roster.ts';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const outFile = resolve(root, 'tmp/seiyuu-agency-raw.json');

const PROXY = process.env.PROXY ?? 'http://127.0.0.1:7897';
const UA = 'SeiyuGuess/1.0 (https://homoto-akina.top)';
const DELAY = 700;

const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

function curl(args) {
  let lastError;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return execFileSync(
        'curl.exe',
        ['--ssl-no-revoke', '-sS', '-m', '30', '-x', PROXY, ...args],
        { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] },
      );
    } catch (error) {
      lastError = error;
      execFileSync('cmd.exe', ['/c', 'timeout', '/t', '2', '/nobreak'], { stdio: 'ignore' });
    }
  }
  throw lastError;
}

function searchPerson(keyword) {
  const raw = curl([
    '-H', `User-Agent: ${UA}`,
    '-H', 'Content-Type: application/json',
    '-X', 'POST',
    '-d', JSON.stringify({ keyword }),
    'https://api.bgm.tv/v0/search/persons',
  ]);
  const list = JSON.parse(raw).data ?? [];
  return list.filter((item) => (item.career ?? []).includes('seiyu')).concat(list);
}

function personDetail(id) {
  const raw = curl(['-H', `User-Agent: ${UA}`, `https://api.bgm.tv/v0/persons/${id}`]);
  return JSON.parse(raw);
}

/** 把 infobox 的某个键拍平成纯文本数组。 */
function boxValues(infobox, keys) {
  const out = [];
  for (const item of infobox ?? []) {
    if (!keys.some((key) => String(item.key).includes(key))) continue;
    const value = item.value;
    if (typeof value === 'string') out.push(value);
    else if (Array.isArray(value)) for (const entry of value) out.push(String(entry.v ?? ''));
  }
  return out.map((text) => text.trim()).filter(Boolean);
}

function domainsOf(infobox) {
  const urls = boxValues(infobox, ['引用来源', '引用', '官网', '官方']);
  const domains = new Set();
  for (const text of urls) {
    const match = text.match(/https?:\/\/([^/\s]+)/);
    if (match) domains.add(match[1].replace(/^www\./, ''));
  }
  return [...domains];
}

/** 名字归一化：去掉空格与间隔符，全角括号统一。 */
function norm(value) {
  return String(value ?? '')
    .replace(/[\s　・·]/g, '')
    .toLowerCase();
}

const results = [];
for (const entry of SEIYUU_ROSTER) {
  const row = {
    id: entry.id,
    name: entry.name,
    nameJa: entry.nameJa,
    agencyRaw: null,
    source: null,
    linkDomains: [],
    matchedName: null,
    nameOk: false,
  };
  try {
    const wantJa = norm(entry.nameJa);
    const wantCn = norm(entry.name);
    let hit = null;
    for (const keyword of [entry.nameJa, entry.name, entry.romaji]) {
      if (!keyword) continue;
      const list = searchPerson(keyword);
      // 必须真的是本人：日文名或中文名归一化后相等（含“鈴原 希実”这种带空格的写法）
      hit = list.find((item) => norm(item.name) === wantJa || norm(item.name_cn) === wantCn) ?? null;
      if (hit) break;
      await sleep(DELAY);
    }
    if (!hit) {
      results.push(row);
      continue;
    }
    row.matchedName = hit.name;
    row.nameOk = true;
    await sleep(DELAY);
    const detail = personDetail(hit.id);
    const infobox = detail.infobox ?? [];
    const agency = boxValues(infobox, ['事务所', '所属']);
    row.linkDomains = domainsOf(infobox);
    if (agency.length) {
      row.agencyRaw = agency.join(' | ');
      row.source = 'infobox';
    } else if (row.linkDomains.length) {
      row.source = 'link';
    }
    console.log(
      `${entry.name.padEnd(8)} ${row.source ?? 'miss'}\t${row.agencyRaw ?? row.linkDomains.join(',')}`,
    );
  } catch (error) {
    console.log(`${entry.name.padEnd(8)} ERROR ${error.message.slice(0, 80)}`);
  }
  results.push(row);
  await sleep(DELAY);
}

mkdirSync(dirname(outFile), { recursive: true });
writeFileSync(outFile, `${JSON.stringify(results, null, 2)}\n`, 'utf8');
const bySource = results.reduce((acc, row) => {
  const key = row.source ?? 'miss';
  acc[key] = (acc[key] ?? 0) + 1;
  return acc;
}, {});
console.log('统计:', JSON.stringify(bySource), '→', outFile);
