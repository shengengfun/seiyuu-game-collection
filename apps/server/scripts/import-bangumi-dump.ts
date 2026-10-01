// 导入 Bangumi 官方 wiki dump → 女声优数据库
// 数据源： https://github.com/bangumi/Archive/releases/tag/archive
//
// 用法：
//   cd server && npx tsx scripts/import-bangumi-dump.ts
//
// 产出： data/seiyuu-bangumi.sqlite3 （完整游戏 DB，可通过 .env DB_URL 切换）
//
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import Database from 'better-sqlite3';
import * as OpenCC from 'opencc-js';

const DUMP_DIR = path.resolve(__dirname, '../tmp/bangumi');
const OUT_DB = path.resolve(__dirname, '../data/seiyuu-bangumi.sqlite3');
const MOEGIRL_LIST = path.resolve(__dirname, '../tmp/female-seiyuu-list.json');

// 繁→简 转换器（用于匹配萌娘百科白名单）
const t2s = OpenCC.Converter({ from: 'tw', to: 'cn' });

// 萌娘百科"日本声优出生年代索引"白名单
const moegirlList: { name: string; decade: string }[] = JSON.parse(fs.readFileSync(MOEGIRL_LIST, 'utf8'));
const MOEGIRL_WHITELIST = new Set<string>();
for (const m of moegirlList) {
  MOEGIRL_WHITELIST.add(m.name);
  // 也加入繁体版（以防白名单本身有繁体）
  MOEGIRL_WHITELIST.add(t2s(m.name));
}
console.log(`萌娘百科白名单: ${MOEGIRL_WHITELIST.size} 条（含简繁体）`);

// ========== 工具 ==========
const FEMALE_RE = /^\s*女(性)?\s*$/;
const SEX_RE = /\|性别\s*=\s*([^\r\n|\}]+)/;
const ROMAJI_RE = /\|罗马字\s*=\s*([^\r\n|\}]+)/;
const KANA_RE = /\|纯假名\s*=\s*([^\r\n|\}]+)/;
const BIRTHDAY_RE = /\|生日\s*=\s*([^\r\n|\}]+)/;
const HEIGHT_RE = /\|身高\s*=\s*([^\r\n|\}]+)/;
const BLOOD_RE = /\|血型\s*=\s*([^\r\n|\}]+)/;
const AGENCY_RE = /\|(?:所属公司|所属事务所|事务所|经纪公司|所属|公司)\s*=\s*([^\r\n|\}]+)/;
const ORIGIN_RE = /\|(?:出身地区|出生地)\s*=\s*([^\r\n|\}]+)/;
const DEBUT_RE = /\|出道时间\s*=\s*([^\r\n\|]*?)(?:\||\}|$)/s;
const ZHNAME_RE = /\|简体中文名\s*=\s*([^\r\n|\}]+)/;
const JPNAME_RE = /\|日文名\s*=\s*([^\r\n|\}]+)/;

function strip(s: unknown): string {
  return String(s || '').replace(/^\s+|\s+$/g, '');
}
function trimInfoboxCell(raw: string): string {
  let s = strip(raw);
  // [[目标|显示]] → 显示 ； [[目标]] → 目标
  s = s.replace(/\[\[([^\[\]\|]+)\|([^\[\]]+)\]\]/g, '$2');
  s = s.replace(/\[\[([^\[\]]+)\]\]/g, '$1');
  // 模板 {{}} / ref <ref/> / html tags
  s = s.replace(/<ref[\s\S]*?<\/ref>/gi, '');
  s = s.replace(/<ref\b[^>]*\/>/gi, '');
  s = s.replace(/\{\{[^{}]*\}\}/g, '');
  s = s.replace(/<[^>]+>/g, '');
  s = s.replace(/'''''|'''''|''/g, '');
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}
function parseBirthday(s: string): string | null {
  const clean = trimInfoboxCell(s);
  if (!clean) return null;
  // YYYY年MM月DD日 或 YYYY年MM月 或 YYYY年
  let m = clean.match(/(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日?/);
  if (m) return `${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`;
  m = clean.match(/(\d{4})\s*年\s*(\d{1,2})\s*月?/);
  if (m) return `${m[1]}-${m[2].padStart(2,'0')}-01`;
  m = clean.match(/(\d{4})/);
  if (m) return `${m[1]}-01-01`;
  // MM月DD日（没年份）
  m = clean.match(/^(\d{1,2})\s*月\s*(\d{1,2})\s*日?$/);
  if (m) return `1900-${m[1].padStart(2,'0')}-${m[2].padStart(2,'0')}`;
  return null;
}
function parseHeight(s: string): number | null {
  const m = trimInfoboxCell(s).match(/(\d+(?:\.\d+)?)\s*cm/);
  if (!m) return null;
  const h = Math.round(Number(m[1]));
  return (h >= 100 && h <= 230) ? h : null;
}
function parseBlood(s: string): string | null {
  const m = trimInfoboxCell(s).match(/^([ABO]{1,2})\s*型?\s*$/);
  if (!m) return null;
  return m[1];
}
function parseDebut(raw: string): number | null {
  // infobox 的值可能是 1995，或 {[1995（声优）]\n[1996（歌手）]}
  if (!raw) return null;
  let s = raw;
  const mList = [...s.matchAll(/\[([^\]]+)\]/g)];
  if (mList.length > 0) s = mList.map((m) => m[1]).join(' ');
  const years = [...s.matchAll(/(19\d{2}|20[0-3]\d)/g)].map((x) => Number(x[0])).filter((y) => y >= 1940 && y <= 2026);
  return years.length ? Math.min(...years) : null;
}

// ========== 阶段 1：筛选女声优 ==========
console.log('== 阶段 1：筛选女声优（career:seiyu + 性别女）==');

type Person = {
  id: number;
  name: string;        // 原始 name（通常日文/原名）
  type: number;
  career: string[];
  collects: number;
  // 解析后的字段
  displayName: string; // 优先中文名 → 日文 → 原名
  zhName: string;
  jpName: string;
  kana: string;
  romaji: string;
  birthDate: string | null;
  height: number | null;
  blood: string | null;
  agency: string;
  birthPlace: string;
  sex: string;
  debutYearInfobox: number | null; // 从 infobox 出道时间直接提取
};

const BANGUMI_PERSONS: Person[] = [];
const idToPerson = new Map<number, Person>();

async function stage1() {
  console.time('stage1');
  const rl = readline.createInterface({
    input: fs.createReadStream(path.join(DUMP_DIR, 'person.jsonlines'), { encoding: 'utf8', highWaterMark: 1024 * 1024 }),
    crlfDelay: Infinity,
  });
  let total = 0, seiyu = 0, female = 0, both = 0, whitelisted = 0;
  for await (const line of rl) {
    if (!line.trim()) continue;
    total++;
    try {
      // 用 JSON.parse 一次过解析 career/infobox 等字段，10w 条没问题
      const r: any = JSON.parse(line);
      const career: string[] = Array.isArray(r.career) ? r.career : [];
      const isSeiyu = career.includes('seiyu');
      if (isSeiyu) seiyu++;
      // 性别识别
      const infobox: string = r.infobox || '';
      const sexM = infobox.match(SEX_RE);
      const sexRaw = trimInfoboxCell(sexM?.[1] || '');
      const isFemale = FEMALE_RE.test(sexRaw) || /女(性|の人)/.test(sexRaw) || /\bshe\b/i.test(sexRaw);
      // 另外：中文名含 "小姐/女士" 不做判断
      if (isFemale) female++;

      if (!(isSeiyu && (isFemale || !sexRaw))) {
        // 严格保留：明确女声优 + 没标性别但 career=seiyu 且名字疑似女性（用 collects 筛选也可以，但暂仅 seiyu+明确女性）
        if (!(isSeiyu && isFemale)) continue;
      }
      // 最终只收 seiyu+明确 female 的
      if (!(isSeiyu && isFemale)) continue;
      both++;

      const zhName = trimInfoboxCell(infobox.match(ZHNAME_RE)?.[1] || '');
      const jpName = trimInfoboxCell(infobox.match(JPNAME_RE)?.[1] || '');

      // ========== 萌娘百科白名单过滤 ==========
      // 用 zhName 的简体和繁体、以及原始 name 做匹配
      const candidates = [zhName, t2s(zhName), jpName, t2s(jpName), String(r.name || ''), t2s(String(r.name || ''))]
        .map(s => s.replace(/[（(].*?[）)]/g, '').trim())
        .filter(Boolean);
      const inWhitelist = candidates.some(c => MOEGIRL_WHITELIST.has(c));
      if (!inWhitelist) continue;
      whitelisted++;

      const kana = trimInfoboxCell(infobox.match(KANA_RE)?.[1] || '');
      const romaji = trimInfoboxCell(infobox.match(ROMAJI_RE)?.[1] || '');
      const birthDate = parseBirthday(infobox.match(BIRTHDAY_RE)?.[1] || '');
      const height = parseHeight(infobox.match(HEIGHT_RE)?.[1] || '');
      const blood = parseBlood(infobox.match(BLOOD_RE)?.[1] || '');
      const agency = trimInfoboxCell(infobox.match(AGENCY_RE)?.[1] || '');
      const birthPlace = trimInfoboxCell(infobox.match(ORIGIN_RE)?.[1] || '');
      const debutYearInfobox = parseDebut(infobox.match(DEBUT_RE)?.[1] || '');

      const displayName = zhName || jpName || String(r.name || '');
      const person: Person = {
        id: Number(r.id),
        name: String(r.name || ''),
        type: Number(r.type || 1),
        career,
        collects: Number(r.collects || 0),
        displayName,
        zhName, jpName, kana, romaji,
        birthDate, height, blood,
        agency, birthPlace,
        sex: sexRaw,
        debutYearInfobox,
      };
      BANGUMI_PERSONS.push(person);
      idToPerson.set(person.id, person);
    } catch (e) {
      // ignore malformed lines
    }
    if (total % 100000 === 0) console.log('  scanned', (total/1e3).toFixed(0), 'K persons ...');
  }
  console.timeEnd('stage1');
  console.log(`  total=${total.toLocaleString()}, seiyu=${seiyu.toLocaleString()}, female persons=${female.toLocaleString()}, female seiyu=${both.toLocaleString()}, whitelisted(萌娘百科)=${whitelisted.toLocaleString()}`);
}

// ========== 阶段 2：读 character/subject + person-characters 构建代表角色 ==========
console.log('\n== 阶段 2：人物 → 角色 → 作品 关联 ==');

type Subject = {
  id: number;
  type: number;
  name: string;        // 原名
  name_cn: string;     // 简体中文名
  date: string;        // 发行/播出日期 YYYY-MM-DD 或 YYYY-MM 或 YYYY
  tags: { name: string; count: number }[];
};
type Character = {
  id: number;
  role: number;
  name: string;
};
const SUBJECTS = new Map<number, Subject>();
const CHARACTERS = new Map<number, Character>();
// 每个声优的代表角色列表
const PC_REPS = new Map<number, { subject_id: number; character_id: number }[]>();

async function stage2() {
  console.time('stage2a-subjects');
  let srl = readline.createInterface({
    input: fs.createReadStream(path.join(DUMP_DIR, 'subject.jsonlines'), { encoding: 'utf8', highWaterMark: 1024 * 1024 }),
    crlfDelay: Infinity,
  });
  let i = 0;
  for await (const line of srl) {
    if (!line.trim()) continue;
    try {
      const r: any = JSON.parse(line);
      SUBJECTS.set(Number(r.id), {
        id: Number(r.id),
        type: Number(r.type),
        name: String(r.name || ''),
        name_cn: String(r.name_cn || ''),
        date: String(r.date || ''),
        tags: Array.isArray(r.tags) ? r.tags : [],
      });
    } catch {}
    i++;
    if (i % 200000 === 0) console.log('  subjects loaded', (i/1e3).toFixed(0), 'K');
  }
  console.timeEnd('stage2a-subjects');
  console.log('  subjects count:', SUBJECTS.size.toLocaleString());

  console.time('stage2b-characters');
  srl = readline.createInterface({
    input: fs.createReadStream(path.join(DUMP_DIR, 'character.jsonlines'), { encoding: 'utf8', highWaterMark: 1024 * 1024 }),
    crlfDelay: Infinity,
  });
  i = 0;
  for await (const line of srl) {
    if (!line.trim()) continue;
    try {
      const r: any = JSON.parse(line);
      CHARACTERS.set(Number(r.id), { id: Number(r.id), role: Number(r.role), name: String(r.name || '') });
    } catch {}
    i++;
    if (i % 200000 === 0) console.log('  characters loaded', (i/1e3).toFixed(0), 'K');
  }
  console.timeEnd('stage2b-characters');
  console.log('  characters count:', CHARACTERS.size.toLocaleString());

  console.time('stage2c-pc');
  srl = readline.createInterface({
    input: fs.createReadStream(path.join(DUMP_DIR, 'person-characters.jsonlines'), { encoding: 'utf8', highWaterMark: 1024 * 1024 }),
    crlfDelay: Infinity,
  });
  i = 0;
  let kept = 0;
  for await (const line of srl) {
    if (!line.trim()) continue;
    try {
      const r: any = JSON.parse(line);
      const pid = Number(r.person_id);
      if (!idToPerson.has(pid)) { i++; continue; }
      const arr = PC_REPS.get(pid) || [];
      arr.push({ subject_id: Number(r.subject_id), character_id: Number(r.character_id) });
      PC_REPS.set(pid, arr);
      kept++;
    } catch {}
    i++;
    if (i % 500000 === 0) console.log('  person-chars scanned', (i/1e3).toFixed(0), 'K, kept', kept.toLocaleString());
  }
  console.timeEnd('stage2c-pc');
  console.log('  person-char relations kept:', kept.toLocaleString(), 'covered persons:', PC_REPS.size);
}

// ========== 阶段 3：五大企划标记 + 团体 + 出道年估算 ==========
type RepRow = { work: string; workJp: string; character: string; characterJp: string; year: number; subjectType: number };

const FIVE_GROUPS = [
  { key: 'LoveLive!',
    diff: 'lovelive',
    workRe: /LoveLive!?|ラブライブ!|Liella!|Aqours|μ's|ニジガク|Superstar|虹咲|莲之空|ハスノソラ|学マス|Gakuen\s*Idol|Musical/i,
    groupRules: [
      [/μ'?s|缪斯|ミューズ/i, "μ's"],
      [/Aqours|アクア/i, 'Aqours'],
      [/虹咲|ニジガク|nijigasaki|同好会/i, '虹咲学园学园偶像同好会'],
      [/Liella!|リエラ/i, 'Liella!'],
      [/莲之空|ハスノソラ|莲ノ空/i, '莲之空女学院学园偶像俱乐部'],
      [/Sunny\s*Passion/i, 'Sunny Passion'],
      [/学マイ|学園アイドルミュージカル|Gakuen.*Musical/i, '学园偶像音乐剧'],
    ] as [RegExp, string][],
  },
  { key: 'BanG Dream!（邦邦）',
    diff: 'bangdream',
    workRe: /BanG\s*Dream|バンドリ!|MyGO|Ave\s*Mujica|Roselia|Poppin|Afterglow|パスパレ|ハロハピ|モルフォニカ|RAS|Raise\s*A\s*Suilen|バンドリ/i,
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
    ] as [RegExp, string][],
  },
  { key: '偶像大师系列',
    diff: 'idolmaster',
    workRe: /偶像大师|Idol\s*Master|アイドルマスター|THE\s*IDOLM@STER|百万现场|闪耀色彩|灰姑娘|ミリオン|シンデレラ|シャイニー|SideM|学マス|学園アイドルマスター/i,
    groupRules: [
      [/765\s*PRO|765プロ|765production|765\s*ALLSTARS|PRO\s*ALLSTARS/i, '765PRO ALLSTARS'],
      [/Cinderella|灰姑娘|シンデレラ/i, 'Cinderella Girls'],
      [/Million\s*Live|百万现场|ミリオン/i, 'Million Live!'],
      [/Shiny\s*Colors|闪耀色彩|シャイニーカラーズ/i, 'Shiny Colors'],
      [/SideM|サイドエム/i, 'SideM'],
      [/学園アイドルマスター|学マス|Gakuen.*Idol.*Master/i, '学园偶像大师'],
    ] as [RegExp, string][],
  },
  { key: '赛马娘 Pretty Derby',
    diff: 'umamusume',
    workRe: /赛马娘|ウマ娘|Pretty\s*Derby|トレセン|UmaMusume|Umamusume|ウマプリ/i,
    groupRules: [[/ウマ娘|トレセン学園|特雷森学园|赛马娘|Pretty\s*Derby/i, 'トレセン学園']] as [RegExp, string][],
  },
  { key: '少女歌剧 Revue Starlight',
    diff: 'revuestarlight',
    workRe: /少女歌剧|Revue\s*Starlight|レヴュースタァライト|九九組|スタァライト/i,
    groupRules: [[/少女歌剧|レヴュースタァライト|九九組|Revue/i, '九九组']] as [RegExp, string][],
  },
] as const;

function buildRepsAndInfer(p: Person): { reps: RepRow[]; fiveGroups: string[]; groups: string[]; debutYear: number | null } {
  const rawReps = PC_REPS.get(p.id) || [];
  const allRepRows: RepRow[] = [];
  for (const r of rawReps) {
    const subj = SUBJECTS.get(r.subject_id);
    const chr = CHARACTERS.get(r.character_id);
    if (!chr) continue;
    const workZh = subj?.name_cn || subj?.name || '';
    const workJp = subj?.name || '';
    const chrName = chr?.name || '';
    const year = (() => {
      const m = (subj?.date || '').match(/(\d{4})/);
      return m ? Number(m[1]) : 0;
    })();
    allRepRows.push({
      work: workZh || workJp,
      workJp,
      character: chrName,
      characterJp: chrName,
      year,
      subjectType: subj?.type || 0,
    });
  }
  // 去重
  const seen = new Set<string>();
  const uniqReps: RepRow[] = [];
  for (const r of allRepRows) {
    const k = `${r.character}|${r.work}|${r.subjectType}`;
    if (seen.has(k)) continue;
    seen.add(k);
    uniqReps.push(r);
  }

  // ========= 出道年：优先级 =========
  // 1) infobox |出道时间=
  // 2) 所有 代表角色作品年份 取 最早 year - 1 （第一次接配音 ≈ 出道年）
  // 3) birth_date 年份 + 18 (+16 for >= 2002)
  let debutYear: number | null = p.debutYearInfobox ?? null;
  if (!debutYear) {
    const workYears = uniqReps.map((r) => r.year).filter((y) => y >= 1950 && y <= 2026);
    if (workYears.length) debutYear = Math.min(...workYears) - 1;
  }
  if (!debutYear && p.birthDate) {
    const m = p.birthDate.match(/^(\d{4})/);
    if (m) {
      const by = Number(m[1]);
      debutYear = by >= 2002 ? by + 16 : by + 18;
    }
  }
  if (debutYear) {
    if (debutYear < 1950) debutYear = 1950;
    if (debutYear > 2026) debutYear = 2026;
  }

  // ========= 排序显示用：动画(type=2) / 游戏(type=4) 优先；年份新 → 旧 =========
  uniqReps.sort((a, b) => {
    const at = a.subjectType === 2 ? 0 : a.subjectType === 4 ? 1 : 2;
    const bt = b.subjectType === 2 ? 0 : b.subjectType === 4 ? 1 : 2;
    if (at !== bt) return at - bt;
    return (b.year || 9999) - (a.year || 9999);
  });
  const finalReps = uniqReps.slice(0, 24);

  // 五大企划标记 + 团体（对 finalReps 做匹配不影响出道年）
  const fiveGroups: string[] = [];
  const groupsSet = new Set<string>();
  for (const fg of FIVE_GROUPS) {
    let matched = false;
    for (const r of finalReps) {
      if (fg.workRe.test(`${r.work} ${r.workJp}`)) { matched = true; break; }
    }
    if (matched) {
      fiveGroups.push(fg.key);
      const blob = finalReps.map((rr) => `${rr.work} ${rr.workJp} ${rr.character}`).join(' ');
      for (const [re, groupName] of fg.groupRules) {
        if (re.test(blob)) groupsSet.add(groupName);
      }
    }
  }

  return { reps: finalReps, fiveGroups, groups: [...groupsSet], debutYear };
}

// ========== 阶段 4：写入 SQLite DB ==========
async function stage4() {
  console.log('\n== 阶段 4：写入 seiyuu-bangumi.sqlite3 ==');
  if (fs.existsSync(OUT_DB)) fs.unlinkSync(OUT_DB);
  const db = new Database(OUT_DB);
  db.pragma('journal_mode = WAL');
  db.exec(`
CREATE TABLE seiyuus (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  romaji TEXT NOT NULL DEFAULT '',
  birth_place TEXT NOT NULL DEFAULT '',
  agency TEXT NOT NULL DEFAULT '',
  birth_date TEXT NULL,
  debut_year INTEGER NULL,
  height INTEGER NULL,
  blood_type TEXT NULL,
  voice_types TEXT NOT NULL DEFAULT '[]',
  representative_works TEXT NOT NULL DEFAULT '[]',
  representative_characters TEXT NOT NULL DEFAULT '[]',
  groups TEXT NOT NULL DEFAULT '[]',
  five_groups TEXT NOT NULL DEFAULT '[]',
  is_enabled INTEGER NOT NULL DEFAULT 1,
  collects INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE difficulty_levels (
  key TEXT PRIMARY KEY,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE player_difficulties (
  player_id INTEGER NOT NULL REFERENCES seiyuus(id) ON DELETE CASCADE,
  difficulty_key TEXT NOT NULL REFERENCES difficulty_levels(key) ON DELETE CASCADE,
  PRIMARY KEY (player_id, difficulty_key)
);
CREATE INDEX idx_pd_diff ON player_difficulties(difficulty_key, player_id);
  `);

  // 插入难度
  const DIFFS = [
    ['beginner', 5], ['easy', 10], ['normal', 20],
    ['lovelive', 30], ['idolmaster', 40], ['umamusume', 50], ['bangdream', 60], ['revuestarlight', 70],
  ] as const;
  const insDiffLv = db.prepare('INSERT INTO difficulty_levels (key, sort_order) VALUES (?, ?)');
  for (const [k, o] of DIFFS) insDiffLv.run(k, o);

  // 先构建数据
  type Row = {
    name: string; romaji: string; birth_place: string; agency: string;
    birth_date: string | null; debut_year: number | null; height: number | null; blood_type: string | null;
    representative_characters: string; groups: string; five_groups: string;
    collects: number; repCount: number;
  };
  const rows: Row[] = [];
  let noName = 0;
  // 中文名/日文名冲突时重名处理：同名追加 " (JP)"
  const usedNames = new Set<string>();
  for (const p of BANGUMI_PERSONS) {
    let baseName = p.displayName || p.zhName || p.jpName || p.name;
    if (!baseName) { noName++; continue; }
    let finalName = baseName;
    // 如果只有一个纯日文名并且有 zhName 但为空（通常是台湾地区人等），确保 unique 即可
    if (usedNames.has(finalName)) {
      // 加一个后缀，优先日文原名作区分
      const cand = p.name && p.name !== finalName ? `${finalName} (${p.name})` : `${finalName} #${p.id}`;
      finalName = cand;
    }
    usedNames.add(finalName);

    const { reps, fiveGroups, groups, debutYear } = buildRepsAndInfer(p);
    const repList = reps.map((r) => ({ work: r.work, character: r.character }));
    const repWorks = [...new Set(reps.map((r) => r.work).filter(Boolean))];
    rows.push({
      name: finalName,
      romaji: p.romaji.slice(0, 128),
      birth_place: p.birthPlace.slice(0, 64),
      agency: p.agency.slice(0, 128),
      birth_date: p.birthDate,
      debut_year: debutYear,
      height: p.height,
      blood_type: p.blood,
      representative_characters: JSON.stringify(repList),
      groups: JSON.stringify(groups),
      five_groups: JSON.stringify(fiveGroups),
      collects: p.collects,
      repCount: repList.length,
    });
  }
  console.log('  rows to insert:', rows.length, '(no usable name dropped:', noName, ')');

  const insSeiyuu = db.prepare(`INSERT INTO seiyuus
    (name, romaji, birth_place, agency, birth_date, debut_year, height, blood_type, representative_works, representative_characters, groups, five_groups, collects)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const beginIns = db.prepare('INSERT OR IGNORE INTO player_difficulties (player_id, difficulty_key) VALUES (?, ?)');

  // 插入 seiyuus 和 normal 难度
  console.time('insert-seiyuus');
  const tx = db.transaction((rs: Row[]) => {
    for (const r of rs) {
      const info = insSeiyuu.run(
        r.name, r.romaji, r.birth_place, r.agency, r.birth_date, r.debut_year, r.height, r.blood_type,
        '[]', r.representative_characters, r.groups, r.five_groups, r.collects,
      );
      const id = Number(info.lastInsertRowid);
      beginIns.run(id, 'normal');
    }
  });
  // 1000 一批
  for (let i = 0; i < rows.length; i += 1000) {
    tx(rows.slice(i, i + 1000));
    if (i % 10000 === 0) console.log('  inserted', i, '...');
  }
  console.timeEnd('insert-seiyuus');

  // === 五大企划专项难度 ===
  const assignFive = db.prepare(`INSERT OR IGNORE INTO player_difficulties (player_id, difficulty_key)
    SELECT s.id, ? FROM seiyuus s WHERE json_array_length(s.five_groups) > 0
      AND EXISTS (SELECT 1 FROM json_each(s.five_groups) WHERE value = ?)`);
  console.log('\n分配五大企划难度:');
  for (const fg of FIVE_GROUPS) {
    const info = assignFive.run(fg.diff, fg.key);
    console.log(`  ${fg.key} → ${fg.diff}: ${info.changes} 人`);
  }

  // === beginner 难度定义：热门常见女声优 ===
  // 条件（满足任一）：
  //   A. 代表角色 >= 8 条 且 事务所为头部大所（基于 Bangumi 事务所名匹配常见关键词）
  //   B. 代表角色 >= 16 条 且 事务所非空
  //   C. 五大企划里某个企划内代表角色 >= 4 条
  //   D. collects(收藏数) >= 300 且 代表角色 >= 6
  //   E. 手动名单（与 apply-recrawl.ts 保持一致，中文用中文名）
  const HEAD_AGENCY_KEYS = [
    '青二', '81', '大泽', 'Osawa',
    "I'm Enterprise", 'I’m', 'Im Enterprise',
    'Sigma Seven', 'シグマ・セブン',
    '贤Production', '贤Pro', '贤プロ',
    'Arts Vision', 'アーツビジョン',
    'VIMS', 'ヴィムス',
    '响', 'HiBiKi', 'ひびき',
    'Mausu Promotion', 'マウスプロ',
    'Stardust', 'スターダスト',
    '俳协', '东京俳优', 'Haikyo',
    'Production Baobab', 'Baobab',
    'シンクチュー', 'THREE TREE', 'ThinkTech',
    'Stay Luck',
    'Remax', 'Réalis',
    'Animo Produce',
    'With Line',
    'Early Wing',
    'Dandelion',
    'Office Anemone',
    'INTENTION',
    "TOY'S FACTORY",
    'King Records',
    'Columbia',
    'Pony Canyon',
    'Bandai Namco',
    'Sun Music',
    'JTB Entertainment',
  ];
  const MANUAL_BEGINNER = new Set([
    '花泽香菜', '悠木碧', '早见沙织', '钉宫理惠', '水树奈奈', '堀江由衣', '田村由香里', '林原惠美',
    '户松遥', '泽城美雪', '丰崎爱生', '佐藤聪美', '寿美菜子', '竹达彩奈', '日笠阳子', '石原夏织',
    '小仓唯', '日高里菜', '上坂堇', '内田真礼', '雨宫天', '赤崎千夏', '三森铃子',
    '楠田亚衣奈', '南条爱乃', '德井青空', '三上枝织', '大坪由佳', '大桥彩香', '茅野爱衣',
    '井口裕香', '小岩井小鸟', '金元寿子', '松井惠理子', '东山奈央', '种田梨沙', '濑户麻沙美',
    '三泽纱千香', '洲崎绫', '内田彩', '饭田里穗', '久保由利香', '高垣彩阳',
    '高桥李依', '本渡枫', '小原好美', '鬼头明里', '水濑祈', '绪方惠美',
    '松冈由贵', '桑谷夏子', '野中蓝', '白石凉子', '小林优', '中原麻衣', '雪野五月',
    '高桥美佳子', '丰口惠美', '浅川悠', '川澄绫子', '能登麻美子',
    // LoveLive! 主力
    '新田惠海', '三森铃子', '楠田亚衣奈', '饭田里穗', 'Pile', '德井青空', '久保由利香',
    '伊波杏树', '逢田梨香子', '诹访奈奈香', '小宫有纱', '齐藤朱夏', '小林爱香', '高槻加奈子', '铃木爱奈', '降幡爱',
    '矢野妃菜喜', '大西亚玖璃', '相良茉优', '村上奈津实', '田中千惠美', '前田佳织里', '指出毬亚', '矢野优美华',
    '小泉萌香', '林鼓子', '佐藤日向',
    '青山渚', '铃原希实', '大熊和奏', '薮岛朱音', '绘森彩', '结那', '坂仓花', '结木由奈',
    // BanG Dream! 主力
    '爱美', '佐佐木未来', '大冢纱英', '西本里美', '小原莉子', '夏芽',
    'Raychell', '工藤晴香', '中岛由贵', '志崎桦音', '进藤天音', 'mika',
    '立石凛', '青木阳菜', '小日向美香', '要乐奈', '千早爱音',
    // 偶像大师 主力
    '中村绘里子', '今井麻美', '原纱友里', '浅仓杏美', '沼仓爱美', '山崎遥', '木户衣吹',
    '福原绫香', '藤田茜', '牧野由依',
    '和气杏未', '高野麻里佳', '高桥未奈美', '上田瞳', '大西沙织',
  ]);

  const allEnabled = db.prepare(`SELECT id, name, agency, groups, five_groups, representative_characters, collects
    FROM seiyuus`).all() as any[];
  function fiveGroupRepCount(row: any): Record<string, number> {
    const reps: any[] = JSON.parse(row.representative_characters || '[]');
    const five: string[] = JSON.parse(row.five_groups || '[]');
    const res: Record<string, number> = {};
    for (const fg of five) {
      const conf = FIVE_GROUPS.find((x) => x.key === fg);
      if (!conf) continue;
      for (const r of reps) {
        if (conf.workRe.test(`${r.work || ''}`)) res[fg] = (res[fg] || 0) + 1;
      }
    }
    return res;
  }
  function isHeadAgency(a: string): boolean {
    if (!a) return false;
    return HEAD_AGENCY_KEYS.some((k) => a.includes(k));
  }

  const beginnerSet = new Set<number>();
  const easySet = new Set<number>();
  for (const s of allEnabled) {
    const reps = JSON.parse(s.representative_characters || '[]');
    const repCount = reps.length;
    const five = JSON.parse(s.five_groups || '[]');
    const okHead = isHeadAgency(s.agency) && repCount >= 6;
    const okRep = repCount >= 14 && s.agency;
    const fgCnt = fiveGroupRepCount(s);
    const okFive = Object.values(fgCnt).some((c) => c >= 4);
    const okCollects = Number(s.collects || 0) >= 300 && repCount >= 6;
    const okManual = MANUAL_BEGINNER.has(s.name);
    if (okHead || okRep || okFive || okCollects || okManual) beginnerSet.add(Number(s.id));
    if (beginnerSet.has(Number(s.id)) || five.length > 0) easySet.add(Number(s.id));
  }

  console.log('\n难度分配：');
  console.log(`  beginner = ${beginnerSet.size} 人 (热门)`);
  console.log(`  easy     = ${easySet.size} 人 (beginner ∪ 五大企划)`);
  for (const id of beginnerSet) beginIns.run(id, 'beginner');
  for (const id of easySet) beginIns.run(id, 'easy');

  // 统计输出
  console.log('\n== 结果概览 ==');
  const seiyuuN = db.prepare('SELECT COUNT(*) AS c FROM seiyuus').get() as any;
  console.log('  seiyuus 总数：', seiyuuN.c);
  const stats = db.prepare(`SELECT difficulty_key, COUNT(*) AS c FROM player_difficulties
    GROUP BY difficulty_key ORDER BY difficulty_key`).all() as any[];
  for (const r of stats) console.log(`    ${r.difficulty_key.padEnd(16)} : ${String(r.c).padStart(6)}人`);

  const nullDebut = (db.prepare('SELECT COUNT(*) AS c FROM seiyuus WHERE debut_year IS NULL').get() as any).c;
  const noAgency = (db.prepare("SELECT COUNT(*) AS c FROM seiyuus WHERE agency=''").get() as any).c;
  const noRep = (db.prepare('SELECT COUNT(*) AS c FROM seiyuus WHERE json_array_length(representative_characters)=0').get() as any).c;
  const withFive = (db.prepare('SELECT COUNT(*) AS c FROM seiyuus WHERE json_array_length(five_groups)>0').get() as any).c;
  console.log(`\n  debut_year 空 = ${nullDebut} (${(100 * nullDebut / seiyuuN.c).toFixed(1)}%)`);
  console.log(`  事务所为空   = ${noAgency} (${(100 * noAgency / seiyuuN.c).toFixed(1)}%)`);
  console.log(`  代表角色 0 条 = ${noRep} (${(100 * noRep / seiyuuN.c).toFixed(1)}%)`);
  console.log(`  五大企划声优 = ${withFive} (${(100 * withFive / seiyuuN.c).toFixed(1)}%)`);

  // 抽样验证
  const samples = ['花泽香菜', '悠木碧', '早见沙织', '钉宫理惠', '水树奈奈', '上坂堇', '立石凛', '大熊和奏', '堀江由衣', '种田梨沙', '爱美', '楠木灯', '林鼓子'];
  const rs = db.prepare(`SELECT id, name, agency, birth_date, debut_year, groups, five_groups,
    json_array_length(representative_characters) AS rep_cnt, collects
    FROM seiyuus WHERE name IN (${samples.map(()=>'?').join(',')})`).all(...samples) as any[];
  console.log('\n抽样验证：');
  for (const r of rs) {
    const diffs = (db.prepare('SELECT difficulty_key FROM player_difficulties WHERE player_id=?').all(r.id) as any[])
      .map((x) => x.difficulty_key).sort().join('|');
    const topReps: any[] = JSON.parse((db.prepare('SELECT representative_characters FROM seiyuus WHERE id=?').get(r.id) as any).representative_characters || '[]').slice(0, 3);
    const repShow = topReps.map((rr) => `${rr.character}《${rr.work}》`).join('；');
    console.log(`  ${r.name.padEnd(12)} 事务所=${(r.agency||'-').slice(0,14).padEnd(14)} 生日=${String(r.birth_date||'-').padEnd(12)} 出道=${r.debut_year||'-'} 团体=${r.groups} five=${r.five_groups} rep=${r.rep_cnt} collects=${r.collects} diff=(${diffs})`);
    console.log(`    top3 代表角色：${repShow || '-'}`);
  }

  // 五大企划覆盖检查
  console.log('\n五大企划声优计数：');
  for (const fg of FIVE_GROUPS) {
    const c = (db.prepare(`SELECT COUNT(*) AS c FROM seiyuus WHERE EXISTS (
      SELECT 1 FROM json_each(five_groups) WHERE value = ?)`).get(fg.key) as any).c;
    console.log(`  ${fg.key.padEnd(24)} : ${String(c).padStart(5)}人`);
  }

  db.close();
  console.log(`\n数据库已生成：${OUT_DB}`);
  console.log('切换方法：在 server/.env 里设置 DB_URL=./data/seiyuu-bangumi.sqlite3 或者覆盖原 ./data/seiyuu-guess.sqlite3');
}

// ========== 主流程 ==========
(async () => {
  await stage1();
  await stage2();
  await stage4();
  console.log('\nDONE ✅');
})().catch((err) => {
  console.error('❌ 导入失败：', err);
  process.exit(1);
});
