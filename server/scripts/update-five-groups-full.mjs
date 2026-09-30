// 增量更新 five_groups：用 bangumi dump 的全量出演记录重新匹配五大企划
// 不删除现有数据库，只更新 seiyuus.five_groups / seiyuus.groups 和 player_difficulties
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';
import * as OpenCC from 'opencc-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DUMP_DIR = path.resolve(__dirname, '../tmp/bangumi');
const DB_PATH = path.resolve(__dirname, '../data/seiyuu-bangumi.sqlite3');
const MOEGIRL_LIST = path.resolve(__dirname, '../tmp/female-seiyuu-list.json');

const t2s = OpenCC.Converter({ from: 'tw', to: 'cn' });

const moegirlList = JSON.parse(fs.readFileSync(MOEGIRL_LIST, 'utf8'));
const MOEGIRL_WHITELIST = new Set();
for (const m of moegirlList) {
  MOEGIRL_WHITELIST.add(m.name);
  MOEGIRL_WHITELIST.add(t2s(m.name));
}

const FIVE_GROUPS = [
  { key: 'LoveLive!', diff: 'lovelive',
    workRe: /LoveLive!?|ラブライブ!|Liella!?|Aqours|μ'?s|ニジガク|Nijigasaki|虹咲|莲之空|ハスノソラ|蓮ノ空|学マス|学園アイドルマスター|Gakuen\s*Idol|Sunny\s*Passion|Saint\s*Snow|A-RISE|学園アイドルミュージカル/i,
    groupRules: [
      [/μ'?s|缪斯|ミューズ/i, "μ's"],
      [/Aqours|アクア/i, 'Aqours'],
      [/虹咲|ニジガク|nijigasaki|同好会/i, '虹咲学园学园偶像同好会'],
      [/Liella!|リエラ/i, 'Liella!'],
      [/莲之空|ハスノソラ|莲ノ空/i, '莲之空女学院学园偶像俱乐部'],
      [/Sunny\s*Passion/i, 'Sunny Passion'],
      [/学マイ|学園アイドルミュージカル|Gakuen.*Musical/i, '学园偶像音乐剧'],
    ] },
  { key: 'BanG Dream!（邦邦）', diff: 'bangdream',
    workRe: /BanG\s*Dream|バンドリ!?|MyGO|Ave\s*Mujica|Roselia|Poppin|Afterglow|パスパレ|ハロハピ|モルフォニカ|RAS|Raise\s*A\s*Suilen|バンドリ|CRYCHIC|UniCh[Øø]rd|Starry\s*Garden|桃源郷|Togenkyo/i,
    groupRules: [
      [/Poppin\s*Party|ポッピンパーティ|ポピパ/i, "Poppin'Party"],
      [/Afterglow|アフターグロー/i, 'Afterglow'],
      [/Pastel[\s＊]*Palettes?|パスパレ/i, 'Pastel＊Palettes'],
      [/Roselia|ロゼリア/i, 'Roselia'],
      [/Hello,?\s*Happy\s*World|ハロハピ/i, 'Hello, Happy World!'],
      [/Morfonica|モルフォニカ/i, 'Morfonica'],
      [/RAISE\s*A\s*SUILEN|RAS/i, 'RAISE A SUILEN'],
      [/MyGO[\s!]{0,5}|マイゴ/i, 'MyGO!!!!!'],
      [/Ave\s*Mujica|アウェムヒカ/i, 'Ave Mujica'],
      [/CRYCHIC/i, 'CRYCHIC'],
      [/UniCh[Øø]rd|アンニコ|ユニコード/i, 'UniChØrd'],
      [/Starry\s*Garden|スタガ|スターリーガーデン/i, 'Starry Garden'],
      [/桃源郷|Togenkyo|トウゲンキョウ/i, '桃源郷'],
      [/∑Ages|ΣAges/i, '∑Ages'],
    ] },
  { key: '偶像大师系列', diff: 'idolmaster',
    workRe: /偶像大师|Idol\s*Master|アイドルマスター|THE\s*IDOLM@STER|百万现场|ミリオンライブ|闪耀色彩|シャイニーカラーズ|灰姑娘|シンデレラガールズ|SideM|学マス|学園アイドルマスター|765|346|283|961/i,
    groupRules: [
      [/765\s*PRO|765プロ|765production|765\s*ALLSTARS|PRO\s*ALLSTARS/i, '765PRO ALLSTARS'],
      [/Cinderella|灰姑娘|シンデレラ/i, 'Cinderella Girls'],
      [/Million\s*Live|百万现场|ミリオン/i, 'Million Live!'],
      [/Shiny\s*Colors|闪耀色彩|シャイニーカラーズ/i, 'Shiny Colors'],
      [/SideM|サイドエム/i, 'SideM'],
      [/学園アイドルマスター|学マス|Gakuen.*Idol.*Master/i, '学园偶像大师'],
    ] },
  { key: '赛马娘 Pretty Derby', diff: 'umamusume',
    workRe: /赛马娘|ウマ娘|Pretty\s*Derby|トレセン|Uma\s*Musume|ウマプリ|ウマ娘\s*プリティーダービー/i,
    groupRules: [[/ウマ娘|トレセン学園|特雷森学园|赛马娘|Pretty\s*Derby/i, 'トレセン学園']] },
  { key: '少女歌剧 Revue Starlight', diff: 'revuestarlight',
    workRe: /少女☆?歌剧|Revue\s*Starlight|レヴュースタァライト|レヴュー・スタァライト/i,
    groupRules: [[/少女☆?歌剧|レヴュースタァライト|九九組|Revue/i, '九九组']] },
];

const SEX_RE = /\|性别\s*=\s*([^\r\n|\}]+)/;
const ZHNAME_RE = /\|简体中文名\s*=\s*([^\r\n|\}]+)/;
const JPNAME_RE = /\|日文名\s*=\s*([^\r\n|\}]+)/;

function strip(s) { return String(s || '').replace(/^\s+|\s+$/g, ''); }
function trimInfoboxCell(raw) {
  let s = strip(raw);
  s = s.replace(/\[\[([^\[\]\|]+)\|([^\[\]]+)\]\]/g, '$2');
  s = s.replace(/\[\[([^\[\]]+)\]\]/g, '$1');
  s = s.replace(/<ref[\s\S]*?<\/ref>/gi, '');
  s = s.replace(/<ref\b[^>]*\/>/gi, '');
  s = s.replace(/\{\{[^{}]*\}\}/g, '');
  s = s.replace(/<[^>]+>/g, '');
  s = s.replace(/'''''|'''''|''/g, '');
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}

function streamLines(filePath) {
  return readline.createInterface({
    input: fs.createReadStream(filePath, { encoding: 'utf8', highWaterMark: 1024 * 1024 }),
    crlfDelay: Infinity,
  });
}

async function main() {
  // ========== 阶段 1：加载 sqlite 声优 + bangumi person 名字映射 ==========
  console.log('== 阶段 1：加载现有 sqlite 声优 + bangumi 名字映射 ==');
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  const sqliteSeiyuus = db.prepare("SELECT id, name FROM seiyuus").all();
  console.log(`  sqlite 声优数: ${sqliteSeiyuus.length}`);

  const nameToBangumiId = new Map();
  let scanned = 0;
  for await (const line of streamLines(path.join(DUMP_DIR, 'person.jsonlines'))) {
    if (!line.trim()) continue;
    scanned++;
    try {
      const r = JSON.parse(line);
      if (!Array.isArray(r.career) || !r.career.includes('seiyu')) continue;
      const infobox = r.infobox || '';
      const sexRaw = trimInfoboxCell(infobox.match(SEX_RE)?.[1] || '');
      if (!/^\s*女(性)?\s*$/.test(sexRaw) && !/女(性|の人)/.test(sexRaw) && !/\bshe\b/i.test(sexRaw)) continue;
      const zhName = trimInfoboxCell(infobox.match(ZHNAME_RE)?.[1] || '');
      const jpName = trimInfoboxCell(infobox.match(JPNAME_RE)?.[1] || '');
      const candidates = [zhName, t2s(zhName), jpName, t2s(jpName), String(r.name || ''), t2s(String(r.name || ''))]
        .map(s => s.replace(/[（(].*?[）)]/g, '').trim()).filter(Boolean);
      if (!candidates.some(c => MOEGIRL_WHITELIST.has(c))) continue;
      const displayName = zhName || jpName || String(r.name || '');
      if (!displayName) continue;
      nameToBangumiId.set(displayName, Number(r.id));
    } catch {}
    if (scanned % 100000 === 0) process.stdout.write(`\r  scanned ${scanned.toLocaleString()}...`);
  }
  console.log(`\n  bangumi 白名单声优: ${nameToBangumiId.size}`);

  const sqliteIdToBangumiId = new Map();
  for (const s of sqliteSeiyuus) {
    const bid = nameToBangumiId.get(s.name);
    if (bid) sqliteIdToBangumiId.set(s.id, bid);
  }
  console.log(`  匹配 bangumi id: ${sqliteIdToBangumiId.size} / ${sqliteSeiyuus.length}`);

  // ========== 阶段 2：加载 subjects ==========
  console.log('\n== 阶段 2：加载 subjects ==');
  const SUBJECTS = new Map();
  let sCount = 0;
  for await (const line of streamLines(path.join(DUMP_DIR, 'subject.jsonlines'))) {
    if (!line.trim()) continue;
    try {
      const r = JSON.parse(line);
      SUBJECTS.set(Number(r.id), { name: String(r.name || ''), name_cn: String(r.name_cn || '') });
    } catch {}
    sCount++;
    if (sCount % 200000 === 0) process.stdout.write(`\r  subjects ${sCount.toLocaleString()}...`);
  }
  console.log(`\n  subjects: ${SUBJECTS.size.toLocaleString()}`);

  // ========== 阶段 2.5：加载 characters ==========
  console.log('  加载 characters...');
  const CHARACTERS = new Map();
  for await (const line of streamLines(path.join(DUMP_DIR, 'character.jsonlines'))) {
    if (!line.trim()) continue;
    try {
      const r = JSON.parse(line);
      CHARACTERS.set(Number(r.id), String(r.name || ''));
    } catch {}
  }
  console.log(`  characters: ${CHARACTERS.size.toLocaleString()}`);

  // ========== 阶段 3：全量扫描 person-characters ==========
  console.log('\n== 阶段 3：全量扫描 person-characters ==');
  const targetBangumiIds = new Set(sqliteIdToBangumiId.values());
  const personFiveGroups = new Map();
  const personGroups = new Map();
  let pcCount = 0, kept = 0;

  for await (const line of streamLines(path.join(DUMP_DIR, 'person-characters.jsonlines'))) {
    if (!line.trim()) continue;
    pcCount++;
    try {
      const r = JSON.parse(line);
      const pid = Number(r.person_id);
      if (!targetBangumiIds.has(pid)) continue;
      kept++;
      const subj = SUBJECTS.get(Number(r.subject_id));
      const chrName = CHARACTERS.get(Number(r.character_id)) || '';
      const work = subj?.name_cn || subj?.name || '';
      const workJp = subj?.name || '';
      const blob = `${work} ${workJp} ${chrName}`;

      if (!personFiveGroups.has(pid)) {
        personFiveGroups.set(pid, new Set());
        personGroups.set(pid, new Set());
      }
      for (const fg of FIVE_GROUPS) {
        if (fg.workRe.test(`${work} ${workJp}`)) {
          personFiveGroups.get(pid).add(fg.key);
          for (const [re, groupName] of fg.groupRules) {
            if (re.test(blob)) personGroups.get(pid).add(groupName);
          }
        }
      }
    } catch {}
    if (pcCount % 500000 === 0) process.stdout.write(`\r  pc ${pcCount.toLocaleString()}, kept ${kept.toLocaleString()}...`);
  }
  console.log(`\n  person-characters: ${pcCount.toLocaleString()}, kept: ${kept.toLocaleString()}`);
  console.log(`  有企划标记的声优数: ${personFiveGroups.size}`);

  // ========== 阶段 4：更新 sqlite ==========
  console.log('\n== 阶段 4：更新 sqlite ==');
  const updateStmt = db.prepare('UPDATE seiyuus SET five_groups = ?, groups = ? WHERE id = ?');
  const delDiffStmt = db.prepare("DELETE FROM player_difficulties WHERE player_id = ? AND difficulty_key IN ('lovelive','bangdream','idolmaster','umamusume','revuestarlight')");
  const insDiffStmt = db.prepare('INSERT OR IGNORE INTO player_difficulties (player_id, difficulty_key) VALUES (?, ?)');

  const stats = {};
  for (const fg of FIVE_GROUPS) stats[fg.diff] = 0;

  let updated = 0;
  const tx = db.transaction(() => {
    for (const [sqliteId, bangumiId] of sqliteIdToBangumiId) {
      const fgSet = personFiveGroups.get(bangumiId) || new Set();
      const groupSet = personGroups.get(bangumiId) || new Set();
      const fiveGroupsArr = FIVE_GROUPS.filter(fg => fgSet.has(fg.key)).map(fg => fg.key);
      const groupsArr = [...groupSet];
      updateStmt.run(JSON.stringify(fiveGroupsArr), JSON.stringify(groupsArr), sqliteId);
      delDiffStmt.run(sqliteId);
      for (const fg of FIVE_GROUPS) {
        if (fgSet.has(fg.key)) {
          insDiffStmt.run(sqliteId, fg.diff);
          stats[fg.diff]++;
        }
      }
      updated++;
    }
  });
  tx();
  console.log(`  更新了 ${updated} 个声优`);
  console.log('  各企划难度人数:');
  for (const fg of FIVE_GROUPS) console.log(`    ${fg.diff.padEnd(18)} : ${stats[fg.diff]} 人`);

  // 重新分配 easy
  console.log('\n  重新分配 easy (beginner ∪ 五大企划)...');
  db.prepare("DELETE FROM player_difficulties WHERE difficulty_key = 'easy'").run();
  const easyRes = db.prepare(`INSERT OR IGNORE INTO player_difficulties (player_id, difficulty_key)
    SELECT player_id, 'easy' FROM player_difficulties
    WHERE difficulty_key IN ('beginner','lovelive','bangdream','idolmaster','umamusume','revuestarlight')
    GROUP BY player_id`).run();
  console.log(`  easy: ${easyRes.changes} 人`);

  console.log('\n== 最终难度分布 ==');
  const final = db.prepare("SELECT difficulty_key, count(*) as n FROM player_difficulties GROUP BY difficulty_key ORDER BY difficulty_key").all();
  for (const r of final) console.log(`  ${r.difficulty_key.padEnd(18)} : ${r.n} 人`);

  console.log('\n== 五大企划声优覆盖 ==');
  for (const fg of FIVE_GROUPS) {
    const c = db.prepare(`SELECT count(*) as c FROM seiyuus WHERE EXISTS (SELECT 1 FROM json_each(five_groups) WHERE value = ?)`).get(fg.key).c;
    console.log(`  ${fg.key.padEnd(24)} : ${c} 人`);
  }

  db.close();
  console.log('\nDONE ✅');
}

main().catch(err => {
  console.error('❌ 失败:', err);
  process.exit(1);
});
