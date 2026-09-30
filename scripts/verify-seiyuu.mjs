/**
 * 声优身份档案校验：对照服务端 SQLite 声优库与 Bangumi，输出人工可读的差异清单。
 *
 * 用法：
 *   node --experimental-strip-types --disable-warning=ExperimentalWarning scripts/verify-seiyuu.mjs
 *   node --experimental-strip-types --disable-warning=ExperimentalWarning scripts/verify-seiyuu.mjs --no-bangumi
 *
 * 输出：tmp/seiyuu-verify-report.md
 *
 * 检查项：
 *   1. 公式照是否齐（client/public/seiyuu/<id>.jpg）
 *   2. 名字能否在服务端声优库（seiyuus.name）里精确检索到
 *   3. 企划与库里的 five_groups 是否对得上（同时看 alsoIn，跨企划声优不误报）
 *   4. 代表角色：比对 `characters[].nameJa`（日文名）与库里的日文角色名，
 *      中文译名对不上属正常，不做自动判定
 *   5. 代表角色的日文名（`characters[].nameJa`）是否出现在库的 representative_characters 里
 *   5. Bangumi 人物检索：日文官方表记是否吻合
 *   5. 代表角色：语言（简中/日文）对不上，不做自动判定，只列在明细表里供人工看
 *
 * 说明：服务端库的 `romaji` 列基本是空的（1782 行里只有 1 行有值），
 * 所以罗马字只能靠 Bangumi 与人工核对，脚本不拿它做比对基准。
 */

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SEIYUU_ROSTER } from '../shared/src/seiyuu/roster.ts';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const photoDir = resolve(root, 'client/public/seiyuu');
const reportFile = resolve(root, 'tmp/seiyuu-verify-report.md');
const dbFile = resolve(root, 'server/data/seiyuu-guess.sqlite3');

const PROXY = process.env.PROXY ?? 'http://127.0.0.1:7897';
const UA = 'SeiyuGuess/1.0 (https://homoto-akina.top)';
const useBangumi = !process.argv.includes('--no-bangumi');
/** 我们的企划 id -> 服务端库 five_groups 里可接受的取值。 */
const PROJECT_TO_FIVE = {
  lovelive: ['LoveLive!'],
  bangdream: ['BanG Dream!（邦邦）'],
  idolmaster: ['偶像大师系列'],
  gakuen: ['偶像大师系列'],
  umamusume: ['赛马娘 Pretty Derby'],
  revuestar: ['少女歌剧 Revue Starlight'],
  // pjsk / d4dj 没有被服务端库收进 five_groups，跳过该项比对
};

const require = createRequire(resolve(root, 'server/package.json'));
const Database = require('better-sqlite3');

const issues = [];
const notes = [];
const rows = [];

function curl(args) {
  const command = ['--ssl-no-revoke', '-sS', '-m', '30', '-x', PROXY, ...args];
  let lastError;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return execFileSync('curl.exe', command, {
        encoding: 'utf8',
        maxBuffer: 16 * 1024 * 1024,
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

function bangumiPerson(keyword) {
  const raw = curl([
    '-H', `User-Agent: ${UA}`,
    '-H', 'Content-Type: application/json',
    '-X', 'POST',
    '-d', JSON.stringify({ keyword }),
    'https://api.bgm.tv/v0/search/persons',
  ]);
  const parsed = JSON.parse(raw);
  const list = parsed.data ?? [];
  const seiyuu = list.filter((item) => (item.career ?? []).includes('seiyu'));
  return (seiyuu.length ? seiyuu : list).slice(0, 3).map((item) => ({
    id: item.id,
    name: item.name,
    nameCn: item.name_cn ?? '',
    gender: item.gender ?? '',
  }));
}

/**
 * 两个名字是否「长得很像」（长度相同且共用 2 个及以上字符）。
 *
 * 用来区分两种情况：我们写错了一个字（像）vs 库根本没收录这个角色（不像）。
 * 要求长度相同是为了避开片假名长名字之间的巧合重复。
 */
function similarName(a, b) {
  if (a.length !== b.length || a === b) return false;
  const setB = new Set([...b]);
  let shared = 0;
  for (const ch of new Set([...a])) {
    if (setB.has(ch)) shared += 1;
  }
  return shared >= 2;
}

function main() {
  if (!existsSync(dbFile)) {
    throw new Error(`找不到服务端声优库：${dbFile}`);
  }
  const db = new Database(dbFile, { readonly: true });
  const byName = db.prepare(
    'SELECT name, groups, five_groups, representative_characters FROM seiyuus WHERE name = ?',
  );
  const loose = db.prepare('SELECT name FROM seiyuus WHERE name LIKE ? LIMIT 6');

  let bangumiOffline = false;
  const bangumiCache = new Map();

  for (const entry of SEIYUU_ROSTER) {
    const row = {
      id: entry.id,
      name: entry.name,
      nameJa: entry.nameJa,
      romaji: entry.romaji,
      project: entry.project,
      ourChars: entry.characters.map((item) => `${item.name}（${item.work}）`),
      photo: existsSync(resolve(photoDir, `${entry.id}.jpg`)),
      dbFound: false,
      projectOk: null,
      dbTopChars: [],
    };

    // 1. 公式照
    if (!row.photo) {
      issues.push(`${entry.id}（${entry.name}）：缺少 client/public/seiyuu/${entry.id}.jpg`);
    }

    // 2. 服务端库检索
    const hit = byName.get(entry.name);
    if (!hit) {
      const guesses = loose.all(`%${entry.name.slice(0, 2)}%`).map((item) => item.name);
      issues.push(
        `${entry.id}（${entry.name}）：服务端声优库精确查不到（结果页搜不到 ta）` +
          (guesses.length ? `；近似条目：${guesses.join('、')}` : '；无近似条目'),
      );
    } else {
      row.dbFound = true;
      let five = [];
      try {
        five = JSON.parse(hit.five_groups || '[]');
      } catch {
        five = [];
      }

      // 3. 企划（主要企划 + alsoIn 都算符）
      const accepted = [entry.project, ...(entry.alsoIn ?? [])]
        .map((project) => PROJECT_TO_FIVE[project])
        .filter(Boolean)
        .flat();
      if (accepted.length) {
        row.projectOk = accepted.some((value) => five.includes(value));
        if (!row.projectOk) {
          issues.push(
            `${entry.id}（${entry.name}）：我们记为 ${[entry.project, ...(entry.alsoIn ?? [])].join(
              ' + ',
            )}，库里的 five_groups = ${five.length ? five.join('、') : '（空）'}`,
          );
        }
      }

      // 4. 代表角色：逐条比对日文名是否出现在库里
      let chars = [];
      try {
        chars = JSON.parse(hit.representative_characters || '[]');
      } catch {
        chars = [];
      }
      const dbCharNames = chars.map((item) => item.character).filter(Boolean);
      row.dbTopChars = dbCharNames.slice(0, 3);

      const checked = entry.characters.filter((item) => item.nameJa);
      row.charChecked = checked.length;
      row.charHit = checked.filter((item) =>
        dbCharNames.some((have) => have.includes(item.nameJa) || item.nameJa.includes(have)),
      ).length;
      if (checked.length && row.charHit === 0) {
        // 库里完全没有该角色——可能是我们写错字，也可能只是库没收录这个角色。
        // 用「库里有没有长得像的名字」区分：像 = 很可能是笔误；不像 = 库就是没收录。
        const near = dbCharNames.filter((have) =>
          checked.some((item) => similarName(have, item.nameJa)),
        );
        const detail = `库里角色（前 5）：${dbCharNames.slice(0, 5).join('、') || '（空）'}`;
        if (near.length) {
          issues.push(
            `${entry.id}（${entry.name}）：代表角色日文名「${checked
              .map((item) => item.nameJa)
              .join('、')}」库里找不到，但库里有相近的「${near.join('、')}」——很像写错字，请核对`,
          );
        } else {
          notes.push(
            `${entry.id}（${entry.name}）：代表角色日文名「${checked
              .map((item) => item.nameJa)
              .join('、')}」未在库中出现，${detail}——库里存的是近年作品，早期经典角色很可能没收录`,
          );
        }
      } else if (row.charHit < checked.length) {
        const missed = checked.filter(
          (item) =>
            !dbCharNames.some((have) => have.includes(item.nameJa) || item.nameJa.includes(have)),
        );
        notes.push(
          `${entry.id}（${entry.name}）：${missed
            .map((item) => `「${item.nameJa}」`)
            .join('、')} 未出现在库里（库里角色数 ${dbCharNames.length}），可能只是库没收录，也可能写错了`,
        );
      }
    }

    // 5. Bangumi
    if (useBangumi && !bangumiOffline) {
      try {
        if (!bangumiCache.has(entry.name)) {
          bangumiCache.set(entry.name, bangumiPerson(entry.name));
        }
        row.bangumi = bangumiCache.get(entry.name);
        const exact = row.bangumi.some((item) => item.name === entry.nameJa);
        if (!exact && row.bangumi.length) {
          notes.push(
            `${entry.id}（${entry.name}）：我们的日文表记「${entry.nameJa}」，` +
              `Bangumi 返回「${row.bangumi.map((item) => item.name).join('、')}」`,
          );
        }
      } catch (error) {
        bangumiOffline = true;
        notes.push(`Bangumi 不可达（${String(error.message).split('\n')[0]}），已跳过全部 Bangumi 核对`);
      }
    }

    rows.push(row);
  }

  db.close();

  const problemIds = new Set(issues.map((item) => item.split('（')[0]));
  const bangumiStatus = () => {
    if (!useBangumi) return '已跳过（--no-bangumi）';
    return bangumiOffline ? '**未执行（代理不可达）**' : '已执行';
  };
  const lines = [];
  lines.push('# 声优身份档案校验报告');
  lines.push('');
  lines.push(`- 档案总数：**${SEIYUU_ROSTER.length}**`);
  lines.push(`- 硬性问题：**${issues.length}** 条，涉及 **${problemIds.size}** 人`);
  lines.push(`- 待人工确认（日文表记）：**${notes.length}** 条`);
  lines.push(`- Bangumi 核对：${bangumiStatus()}`);
  lines.push('');
  lines.push('## 硬性问题');
  lines.push('');
  if (issues.length) {
    issues.forEach((item) => lines.push(`- ${item}`));
  } else {
    lines.push('无。');
  }
  lines.push('');
  lines.push('## 待人工确认（日文表记）');
  lines.push('');
  if (notes.length) {
    notes.forEach((item) => lines.push(`- ${item}`));
  } else {
    lines.push('无。');
  }
  lines.push('');
  lines.push('## 全量明细');
  lines.push('');
  lines.push('代表角色一栏为「命中数/已填日文名数」，未填日文名的角色不纳入自动比对。');
  lines.push('中文译名与库里的日文原名无法直接串对，属正常，以日文名比对结果为准。');
  lines.push('');
  lines.push('| id | 中文名 | 日文表记 | 罗马字 | 企划 | 照片 | 库中可查 | 企划符 | 角色 | 我们的代表角色 | 库中角色（前 3） |');
  lines.push('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const row of rows) {
    const mark = (value) => (value === true ? '✓' : value === false ? '✗' : '—');
    const charMark = row.dbFound
      ? `${row.charHit}/${row.charChecked}`
      : '—';
    lines.push(
      `| \`${row.id}\` | ${row.name} | ${row.nameJa} | ${row.romaji} | ${row.project} | ${
        row.photo ? '✓' : '✗'
      } | ${row.dbFound ? '✓' : '✗'} | ${mark(row.projectOk)} | ${charMark} | ${row.ourChars.join(
        '、',
      )} | ${row.dbTopChars.join('、') || '—'} |`,
    );
  }
  lines.push('');

  mkdirSync(dirname(reportFile), { recursive: true });
  writeFileSync(reportFile, lines.join('\n'), 'utf8');

  console.log(`档案 ${SEIYUU_ROSTER.length} 条`);
  console.log(`硬性问题 ${issues.length} 条，待人工确认 ${notes.length} 条`);
  issues.forEach((item) => console.log(`  [问题] ${item}`));
  console.log(`\n报告已写入 ${reportFile}`);

  return issues.length > 0 ? 1 : 0;
}

process.exitCode = main();
