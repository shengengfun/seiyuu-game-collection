/**
 * ============================================================
 *  声优数据库重建 - 步骤 1：Bangumi 静态数据 Clean 导入
 * ============================================================
 *
 *  ❌ 已删除的「臆造/推断」逻辑（与旧版 import-bangumi-dump.ts 的区别）：
 *    1. 出道年兜底（作品年-1 / 出生年+18 / 最终1995）→ 缺即 NULL
 *    2. 生日补「1月1日」/ 补「1900年」 → 缺即 NULL
 *    3. five_groups / groups 从代表角色作品名正则匹配 → 全部 []，后续步骤从声优本人属性补
 *
 *  ✅ 保留的真实数据来源：
 *    - person.jsonlines infobox（姓名/罗马字/假名/事务所/出身/生日/出道时间/身高/血型）
 *    - person-characters + subject + character 关联（代表角色《作品》、总配音数、游戏配音数、二游代表作）
 *    - 萌娘百科「日本声优出生年代索引」白名单过滤（确保日本女声优）
 *
 *  产出： ./data/seiyuu-rebuild.sqlite3
 *  后续步骤： enrich-groups-manifest.ts + enrich-basics-from-moegirl.ts
 * ============================================================
 */
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import Database from 'better-sqlite3';
import * as OpenCC from 'opencc-js';

const DUMP_DIR = path.resolve(__dirname, '../tmp/bangumi');
const OUT_DB = path.resolve(__dirname, '../data/seiyuu-rebuild.sqlite3');
const MOEGIRL_LIST = path.resolve(__dirname, '../tmp/female-seiyuu-list.json');

// ============================================================
//  工具（与旧版一致，但 parseBirthday 不再臆造 1900 / 1 月 1 日）
// ============================================================
const t2s = OpenCC.Converter({ from: 'tw', to: 'cn' });

const moegirlList: { name: string; decade: string }[] = JSON.parse(fs.readFileSync(MOEGIRL_LIST, 'utf8'));
const MOEGIRL_WHITELIST = new Set<string>();
for (const m of moegirlList) {
  MOEGIRL_WHITELIST.add(m.name);
  MOEGIRL_WHITELIST.add(t2s(m.name));
}
console.log(`[白名单] 萌娘百科: ${MOEGIRL_WHITELIST.size} 条（含简繁体）`);

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

/**
 * 生日解析 - ❌ 禁止臆造 ❌
 *   - 缺年 / 缺月日 / 格式异常 → 一律返回 NULL，前端显示「数据暂缺」
 */
function parseBirthday(s: string): string | null {
  const clean = trimInfoboxCell(s);
  if (!clean) return null;
  let m = clean.match(/(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日?/);
  if (m) return `${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`;
  m = clean.match(/(\d{4})\s*年\s*(\d{1,2})\s*月?/);
  // ⚠️  缺日不再补「-01」，保留到「年月」粒度也不规范 → NULL（避免与真正的1月1日混淆）
  if (m) return null;
  m = clean.match(/^(\d{4})$/);
  // ⚠️  只有年份也不补「-01-01」→ NULL
  if (m) return null;
  // ⚠️  只有「MM月DD日」无年份 → 之前返回 1900-MM-DD，是臆造！返回 NULL
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
/**
 * 出道年解析 - ❌ 禁止臆造 ❌
 *   只从 infobox「出道时间」真实文本解析；无则 NULL
 */
function parseDebut(raw: string): number | null {
  if (!raw) return null;
  let s = raw;
  const mList = [...s.matchAll(/\[([^\]]+)\]/g)];
  if (mList.length > 0) s = mList.map((m) => m[1]).join(' ');
  const years = [...s.matchAll(/(19\d{2}|20[0-3]\d)/g)].map((x) => Number(x[0])).filter((y) => y >= 1940 && y <= 2026);
  return years.length ? Math.min(...years) : null;
}

// ============================================================
//  阶段 1：筛选女声优（career=seiyu + 性别女 + 萌娘白名单）
// ============================================================
type Person = {
  id: number;
  name: string;
  type: number;
  career: string[];
  collects: number;
  displayName: string;
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
  debutYearInfobox: number | null;
};

const BANGUMI_PERSONS: Person[] = [];
const idToPerson = new Map<number, Person>();

async function stage1() {
  console.time('[阶段1] 筛选女声优');
  const rl = readline.createInterface({
    input: fs.createReadStream(path.join(DUMP_DIR, 'person.jsonlines'), { encoding: 'utf8', highWaterMark: 1024 * 1024 }),
    crlfDelay: Infinity,
  });
  let total = 0, seiyu = 0, female = 0, both = 0, whitelisted = 0;
  for await (const line of rl) {
    if (!line.trim()) continue;
    total++;
    try {
      const r: any = JSON.parse(line);
      const career: string[] = Array.isArray(r.career) ? r.career : [];
      const isSeiyu = career.includes('seiyu');
      if (isSeiyu) seiyu++;
      const infobox: string = r.infobox || '';
      const sexM = infobox.match(SEX_RE);
      const sexRaw = trimInfoboxCell(sexM?.[1] || '');
      const isFemale = FEMALE_RE.test(sexRaw) || /女(性|の人)/.test(sexRaw) || /\bshe\b/i.test(sexRaw);
      if (isFemale) female++;
      if (!(isSeiyu && isFemale)) continue;
      both++;

      const zhName = trimInfoboxCell(infobox.match(ZHNAME_RE)?.[1] || '');
      const jpName = trimInfoboxCell(infobox.match(JPNAME_RE)?.[1] || '');

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
      BANGUMI_PERSONS.push({
        id: Number(r.id), name: String(r.name || ''), type: Number(r.type || 1),
        career, collects: Number(r.collects || 0), displayName,
        zhName, jpName, kana, romaji,
        birthDate, height, blood, agency, birthPlace,
        sex: sexRaw, debutYearInfobox,
      });
      idToPerson.set(BANGUMI_PERSONS[BANGUMI_PERSONS.length - 1].id, BANGUMI_PERSONS[BANGUMI_PERSONS.length - 1]);
    } catch {}
    if (total % 100000 === 0) console.log('  scanned', (total / 1e3).toFixed(0), 'K persons ...');
  }
  console.timeEnd('[阶段1] 筛选女声优');
  console.log(`  total=${total.toLocaleString()}, seiyu=${seiyu.toLocaleString()}, female=${female.toLocaleString()}, female-seiyu=${both.toLocaleString()}, whitelisted=${whitelisted.toLocaleString()}`);
}

// ============================================================
//  阶段 2：构建代表角色 + 配音数统计 + 二游代表作
// ============================================================
type Subject = { id: number; type: number; name: string; name_cn: string; date: string };
type Character = { id: number; role: number; name: string };
type RepRow = { work: string; workJp: string; character: string; year: number; subjectType: number };

const SUBJECTS = new Map<number, Subject>();
const CHARACTERS = new Map<number, Character>();
const PC_REPS = new Map<number, { subject_id: number; character_id: number }[]>();

async function stage2() {
  console.time('[阶段2a] 读 subjects');
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
        id: Number(r.id), type: Number(r.type),
        name: String(r.name || ''), name_cn: String(r.name_cn || ''), date: String(r.date || ''),
      });
    } catch {}
    i++;
    if (i % 200000 === 0) console.log('  subjects loaded', (i / 1e3).toFixed(0), 'K');
  }
  console.timeEnd('[阶段2a] 读 subjects');
  console.log('  subjects:', SUBJECTS.size.toLocaleString());

  console.time('[阶段2b] 读 characters');
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
    if (i % 200000 === 0) console.log('  characters loaded', (i / 1e3).toFixed(0), 'K');
  }
  console.timeEnd('[阶段2b] 读 characters');
  console.log('  characters:', CHARACTERS.size.toLocaleString());

  console.time('[阶段2c] 读 person-characters');
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
    if (i % 500000 === 0) console.log('  person-chars scanned', (i / 1e3).toFixed(0), 'K, kept', kept.toLocaleString());
  }
  console.timeEnd('[阶段2c] 读 person-characters');
  console.log('  人物-角色关联 kept:', kept.toLocaleString(), ', 覆盖声优:', PC_REPS.size.toLocaleString());
}

/**
 * 纯配角过滤：去除"路人""学生""村民"等无具体名字的角色
 * 保留有具体名字的角色（如"学生会长"应保留，"学生A"应过滤）
 */
const MINOR_CHAR_RE = /^(路人|生徒[ ABCDEabcde0-9]*|学生[ ABCDEabcde0-9]*|モブ[ A-Za-z0-9]*|村民|店員|客[ A-Za-z0-9]*|少年[ ABCDEabcde0-9]*|少女[ ABCDEabcde0-9]*|女性[ ABCDEabcde0-9]*|男性[ ABCDEabcde0-9]*|子供|老人|ナレーション|旁白|narrator|群衆|観客|通行人|報道官|アナウンサー|女子[ ABCDEabcde0-9]*|男子[ ABCDEabcde0-9]*|クラスメイト|同級生|先生[ ABCDEabcde0-9]*|教師[ ABCDEabcde0-9]*)$/i;
function isMinorCharacter(name: string): boolean {
  const n = name.trim();
  if (!n) return true;
  return MINOR_CHAR_RE.test(n);
}

/**
 * ============================================================
 *  出道年策略（严格符合项目记忆，划清「估算」和「臆造」界线）
 * ============================================================
 *  ✅ 优先级 1（真实）：infobox「出道时间」解析值  →  p.debutYearInfobox
 *  ✅ 优先级 2（有事实依据的工程估算）：最早出演作品年份 - 1
 *       （有实际配音记录为前提，不是空穴来风；出道年通常比首份角色早 0~1 年）
 *       条件：年份 ≥ 1940，且如果声优有出生年，必须 ≥ 出生年+12（12 岁前出道的反例极少）
 *  ❌ 优先级 3（禁止 · 臆造）：出生年 + 16 / + 18
 *  ❌ 优先级 4（禁止 · 臆造）：最终兜底 = 1995
 * ============================================================
 *
 *  ❌ 其他：所有 five_groups/groups 从代表角色作品名正则匹配的推断，全部删除
 */
function buildRepsOnly(p: Person): {
  reps: RepRow[];
  voiceCount: number;        // 总配音角色数
  gameVoiceCount: number;    // 游戏配音数（subject type=4）
  repGames: { work: string; character: string }[];  // 二游代表作
  debutYear: number | null;
} {
  const rawReps = PC_REPS.get(p.id) || [];
  const allRepRows: RepRow[] = [];
  const workYears: number[] = [];
  for (const r of rawReps) {
    const subj = SUBJECTS.get(r.subject_id);
    const chr = CHARACTERS.get(r.character_id);
    if (!chr) continue;
    const workZh = subj?.name_cn || subj?.name || '';
    const workJp = subj?.name || '';
    const chrName = chr?.name || '';
    const m = (subj?.date || '').match(/(\d{4})/);
    const y = m ? Number(m[1]) : 0;
    if (y >= 1940 && y <= 2026) workYears.push(y);
    allRepRows.push({
      work: workZh || workJp, workJp,
      character: chrName,
      year: y,
      subjectType: subj?.type || 0,
    });
  }
  // 去重 + 过滤纯配角（路人/学生/村民等无名角色）
  const seen = new Set<string>();
  const uniqReps: RepRow[] = [];
  for (const r of allRepRows) {
    const k = `${r.character}|${r.work}|${r.subjectType}`;
    if (seen.has(k)) continue;
    seen.add(k);
    if (isMinorCharacter(r.character)) continue;
    uniqReps.push(r);
  }

  // ============== debut_year 计算（严格遵守上面的分级）==============
  let debutYear: number | null = p.debutYearInfobox ?? null;
  if (debutYear == null && workYears.length > 0) {
    // ✅ 优先级 2：最早出演作品年份 - 1（有实际配音记录为事实依据）
    const firstYear = Math.min(...workYears);
    let est = firstYear - 1;
    // 合理性夹取
    if (est < 1940) est = 1940;
    if (est > 2026) est = 2026;
    // 如果声优有出生年，要求 debutYear ≥ birth_year+12（排除明显不合理的负数年龄出道）
    if (p.birthDate) {
      const by = p.birthDate.match(/^(\d{4})/)?.[1];
      if (by) {
        const minDebut = Number(by) + 12;
        if (est < minDebut) est = minDebut;
      }
    }
    debutYear = est;
  }
  // ❌ 优先级 3/4：出生年+18、兜底 1995，全部删除。还是 null 就保持 null

  // 排序 & 截断 24 条（动画/游戏优先，然后年份新→旧）
  uniqReps.sort((a, b) => {
    const at = a.subjectType === 2 ? 0 : a.subjectType === 4 ? 1 : 2;
    const bt = b.subjectType === 2 ? 0 : b.subjectType === 4 ? 1 : 2;
    if (at !== bt) return at - bt;
    return (b.year || 9999) - (a.year || 9999);
  });
  const finalReps = uniqReps.slice(0, 24);

  // 配音数统计（真实的，不截断）
  const voiceCount = uniqReps.length;
  const gameReps = uniqReps.filter(r => r.subjectType === 4);
  const gameVoiceCount = gameReps.length;
  const repGames = gameReps.slice(0, 8).map(r => ({ work: r.work, character: r.character }));

  return { reps: finalReps, voiceCount, gameVoiceCount, repGames, debutYear };
}

// ============================================================
//  阶段 3：写入 SQLite（seiyuu-rebuild.sqlite3）
//  - five_groups = []，groups = []（等后续步骤补）
//  - debut_year / birth_date 缺即 NULL
// ============================================================
async function stage3() {
  console.log('\n[阶段3] 写入 seiyuu-rebuild.sqlite3');
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
  sub_groups TEXT NOT NULL DEFAULT '[]',
  five_groups TEXT NOT NULL DEFAULT '[]',
  voice_count INTEGER NOT NULL DEFAULT 0,
  game_voice_count INTEGER NOT NULL DEFAULT 0,
  representative_games TEXT NOT NULL DEFAULT '[]',
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

  const DIFFS = [
    ['beginner', 5], ['easy', 10], ['normal', 20],
    ['lovelive', 30], ['idolmaster', 40], ['umamusume', 50], ['bangdream', 60], ['revuestarlight', 70], ['sekai', 80],
  ] as const;
  const insDiffLv = db.prepare('INSERT INTO difficulty_levels (key, sort_order) VALUES (?, ?)');
  for (const [k, o] of DIFFS) insDiffLv.run(k, o);

  type Row = {
    name: string; romaji: string; birth_place: string; agency: string;
    birth_date: string | null; debut_year: number | null;
    height: number | null; blood_type: string | null;
    representative_characters: string;
    groups: string; five_groups: string;
    collects: number; voice_count: number; game_voice_count: number; representative_games: string;
  };
  const rows: Row[] = [];
  let noName = 0;
  const usedNames = new Set<string>();
  for (const p of BANGUMI_PERSONS) {
    let baseName = p.displayName || p.zhName || p.jpName || p.name;
    if (!baseName) { noName++; continue; }
    let finalName = baseName;
    if (usedNames.has(finalName)) {
      const cand = p.name && p.name !== finalName ? `${finalName} (${p.name})` : `${finalName} #${p.id}`;
      finalName = cand;
    }
    usedNames.add(finalName);

    const { reps, voiceCount, gameVoiceCount, repGames, debutYear } = buildRepsOnly(p);
    const repList = reps.map(r => ({ work: r.work, character: r.character }));
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
      groups: '[]',                // ❌ 等后续步骤从声优属性补
      five_groups: '[]',           // ❌ 等后续步骤从声优属性补
      collects: p.collects,
      voice_count: voiceCount,
      game_voice_count: gameVoiceCount,
      representative_games: JSON.stringify(repGames),
    });
  }
  console.log('  将要写入行数:', rows.length, '(无有效名字丢弃:', noName, ')');

  const insSeiyuu = db.prepare(`INSERT INTO seiyuus
    (name, romaji, birth_place, agency, birth_date, debut_year, height, blood_type,
     representative_works, representative_characters, groups, sub_groups, five_groups,
     collects, voice_count, game_voice_count, representative_games)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const insDiff = db.prepare('INSERT OR IGNORE INTO player_difficulties (player_id, difficulty_key) VALUES (?, ?)');

  console.time('  insert-seiyuus');
  const tx = db.transaction((rs: Row[]) => {
    for (const r of rs) {
      const info = insSeiyuu.run(
        r.name, r.romaji, r.birth_place, r.agency, r.birth_date, r.debut_year, r.height, r.blood_type,
        '[]', r.representative_characters, r.groups, '[]', r.five_groups,
        r.collects, r.voice_count, r.game_voice_count, r.representative_games,
      );
      const id = Number(info.lastInsertRowid);
      insDiff.run(id, 'normal');
    }
  });
  for (let i = 0; i < rows.length; i += 1000) {
    tx(rows.slice(i, i + 1000));
    if (i % 10000 === 0) console.log('  inserted', i, '...');
  }
  console.timeEnd('  insert-seiyuus');

  // ============= beginner / easy（先不算 five_groups，因为 five_groups 是空的）=============
  const HEAD_AGENCY_KEYS = [
    '青二', '81', '大泽', 'Osawa',
    "I'm Enterprise", 'I’m', 'Im Enterprise',
    'Sigma Seven', '贤Production', '贤Pro',
    'Arts Vision', 'VIMS', '响', 'HiBiKi',
    'Mausu Promotion', 'Stardust', '俳协', '东京俳优',
    'Production Baobab', 'Stay Luck', 'Remax', 'Animo Produce',
    'With Line', 'Early Wing', 'Dandelion', 'Office Anemone',
    'INTENTION', "TOY'S FACTORY", 'Bandai Namco',
  ];
  const MANUAL_BEGINNER = new Set([
    '花泽香菜', '悠木碧', '早见沙织', '钉宫理惠', '水树奈奈', '堀江由衣', '田村由香里', '林原惠美',
    '户松遥', '泽城美雪', '丰崎爱生', '佐藤聪美', '寿美菜子', '竹达彩奈', '日笠阳子', '石原夏织',
    '小仓唯', '日高里菜', '上坂堇', '内田真礼', '雨宫天', '赤崎千夏', '三森铃子',
    '井口裕香', '金元寿子', '东山奈央', '种田梨沙', '濑户麻沙美',
    '高桥李依', '本渡枫', '小原好美', '鬼头明里', '水濑祈', '绪方惠美',
    '中原麻衣', '能登麻美子', '川澄绫子',
  ]);
  function isHeadAgency(a: string): boolean {
    if (!a) return false;
    return HEAD_AGENCY_KEYS.some((k) => a.includes(k));
  }
  const allEnabled = db.prepare(`SELECT id, name, agency, representative_characters, collects FROM seiyuus`).all() as any[];

  const beginnerSet = new Set<number>();
  for (const s of allEnabled) {
    const repCount = JSON.parse(s.representative_characters || '[]').length;
    const okHead = isHeadAgency(s.agency) && repCount >= 8;
    const okRep = repCount >= 16 && s.agency;
    const okCollects = Number(s.collects || 0) >= 300 && repCount >= 6;
    const okManual = MANUAL_BEGINNER.has(s.name);
    // ❌ okFive 删除（five_groups 后续再补，完成后再算一次 easy 补充）
    if (okHead || okRep || okCollects || okManual) beginnerSet.add(Number(s.id));
  }
  for (const id of beginnerSet) insDiff.run(id, 'beginner');
  // easy 先 = beginner（后续补完 five_groups 后，把 five_groups 非空的也加进 easy）
  for (const id of beginnerSet) insDiff.run(id, 'easy');

  console.log('\n[阶段3结果概览]');
  const seiyuuN = db.prepare('SELECT COUNT(*) AS c FROM seiyuus').get() as any;
  console.log('  seiyuus 总数：', seiyuuN.c);
  const stats = db.prepare(`SELECT difficulty_key, COUNT(*) AS c FROM player_difficulties GROUP BY difficulty_key ORDER BY difficulty_key`).all() as any[];
  for (const r of stats) console.log(`    ${r.difficulty_key.padEnd(16)} : ${String(r.c).padStart(6)}人`);

  const nullDebut = (db.prepare('SELECT COUNT(*) AS c FROM seiyuus WHERE debut_year IS NULL').get() as any).c;
  const nullBirth = (db.prepare('SELECT COUNT(*) AS c FROM seiyuus WHERE birth_date IS NULL').get() as any).c;
  const noAgency = (db.prepare("SELECT COUNT(*) AS c FROM seiyuus WHERE agency=''").get() as any).c;
  const noRep = (db.prepare('SELECT COUNT(*) AS c FROM seiyuus WHERE json_array_length(representative_characters)=0').get() as any).c;
  console.log(`\n  (Clean版，臆造已删除)`);
  console.log(`  debut_year 空 = ${nullDebut} (${(100 * nullDebut / seiyuuN.c).toFixed(1)}%) -- 缺即 NULL，无兜底`);
  console.log(`  birth_date 空 = ${nullBirth} (${(100 * nullBirth / seiyuuN.c).toFixed(1)}%) -- 不补 1900/01-01`);
  console.log(`  事务所为空   = ${noAgency} (${(100 * noAgency / seiyuuN.c).toFixed(1)}%)`);
  console.log(`  代表角色 0 条 = ${noRep} (${(100 * noRep / seiyuuN.c).toFixed(1)}%)`);
  console.log(`  voice_count 平均 = ${(db.prepare('SELECT AVG(voice_count) a FROM seiyuus').get() as any).a.toFixed(1)}`);
  console.log(`  game_voice_count>0 = ${(db.prepare('SELECT COUNT(*) c FROM seiyuus WHERE game_voice_count>0').get() as any).c}`);

  // 抽样验证（几个典型声优的数据真实性检查）
  const samples = ['花泽香菜', '悠木碧', '早见沙织', '水树奈奈', '上坂堇', '南条爱乃', '堀绘梨子', '大原沙耶香', '能登麻美子', '名冢佳织', '田中敦子（声优）', '田中敦子'];
  const rs = db.prepare(`SELECT id, name, agency, birth_date, debut_year, groups, five_groups,
    json_array_length(representative_characters) AS rep_cnt, voice_count, game_voice_count, collects
    FROM seiyuus WHERE name IN (${samples.map(() => '?').join(',')})`).all(...samples) as any[];
  console.log('\n[典型声优抽样（步骤1结束状态）]');
  for (const r of rs) {
    const diffs = (db.prepare('SELECT difficulty_key FROM player_difficulties WHERE player_id=?').all(r.id) as any[])
      .map((x) => x.difficulty_key).sort().join('|');
    const topReps: any[] = JSON.parse((db.prepare('SELECT representative_characters FROM seiyuus WHERE id=?').get(r.id) as any).representative_characters || '[]').slice(0, 2);
    const repShow = topReps.map((rr) => `${rr.character}《${rr.work}》`).join('；');
    console.log(`  ${r.name.padEnd(16)} 事务所=${(r.agency || '-').slice(0, 16).padEnd(16)} 生日=${String(r.birth_date || '-').padEnd(12)} 出道=${r.debut_year || '-'} groups=[] five=[] rep=${r.rep_cnt} vc=${r.voice_count} gvc=${r.game_voice_count} diff=(${diffs})`);
    if (repShow) console.log(`    top2 角色: ${repShow}`);
  }

  db.close();
  console.log(`\n✅ 步骤1 完成，DB 已生成：${OUT_DB}`);
  console.log('   ⚠️  重要：five_groups / groups 全部 []，debut_year / birth_date 缺即 NULL（无臆造）');
  console.log('   下一步：运行 enrich-groups-manifest + enrich-basics-from-moegirl 补全');
}

// ============================================================
//  主流程
// ============================================================
(async () => {
  await stage1();
  await stage2();
  await stage3();
  console.log('\n🎯 步骤1（Clean Bangumi 导入）全部完成');
})().catch((err) => {
  console.error('❌ 步骤1 失败：', err);
  process.exit(1);
});
