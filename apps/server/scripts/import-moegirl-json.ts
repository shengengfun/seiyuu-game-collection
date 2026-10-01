// 从 moegirl3-xxx.json 导入 seiyuu-guess.sqlite3
import path from 'path';
import fs from 'fs';
import Database from 'better-sqlite3';

const INPUT = process.argv[2] || path.resolve(__dirname, '../tmp/moegirl3-only5-limit600.json');
const DB_PATH = path.resolve(__dirname, '../data/seiyuu-guess.sqlite3');

if (!fs.existsSync(INPUT)) {
  console.error('Input not found:', INPUT);
  process.exit(1);
}

console.log('[import] 读取 JSON:', INPUT);
const list = JSON.parse(fs.readFileSync(INPUT, 'utf8')) as any[];
console.log('[import] 条目数:', list.length);

console.log('[import] 打开 DB:', DB_PATH);
const db = new Database(DB_PATH);
// 临时关闭外键约束检查，避免 difficulty_levels 不完整时 player_difficulties 插入失败
db.pragma('foreign_keys = OFF');

// 确保 seiyuus 表 + groups/five_groups 列
try {
  db.exec(`CREATE TABLE IF NOT EXISTS seiyuus (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(128) NOT NULL UNIQUE,
    romaji VARCHAR(128) NOT NULL DEFAULT '',
    birth_place VARCHAR(64) NOT NULL DEFAULT '',
    agency VARCHAR(128) NOT NULL DEFAULT '',
    birth_date DATE NULL,
    debut_year INTEGER NULL,
    groups TEXT NOT NULL DEFAULT '[]',
    blood_type VARCHAR(4) NULL,
    voice_types TEXT NOT NULL DEFAULT '[]',
    representative_works TEXT NOT NULL DEFAULT '[]',
    representative_characters TEXT NOT NULL DEFAULT '[]',
    five_groups TEXT NOT NULL DEFAULT '[]',
    is_enabled BOOLEAN NOT NULL DEFAULT 1
  )`);
} catch (e) { /* ignore */ }
const addCol = (sql: string) => { try { db.exec(sql); } catch { /* ignore */ } };
addCol('ALTER TABLE seiyuus ADD COLUMN groups TEXT NOT NULL DEFAULT \'[]\'');
addCol('ALTER TABLE seiyuus ADD COLUMN five_groups TEXT NOT NULL DEFAULT \'[]\'');
addCol('ALTER TABLE seiyuus ADD COLUMN romaji VARCHAR(128) NOT NULL DEFAULT \'\'');
addCol('ALTER TABLE seiyuus ADD COLUMN birth_place VARCHAR(64) NOT NULL DEFAULT \'\'');

// 清掉旧数据？不清，upsert 就行。
const upsert = db.prepare(`INSERT INTO seiyuus
  (name, romaji, birth_place, agency, birth_date, debut_year, groups, blood_type, representative_works, representative_characters, five_groups, is_enabled)
  VALUES (@name, @romaji, @birth_place, @agency, @birth_date, @debut_year, @groups, @blood_type, @representative_works, @representative_characters, @five_groups, 1)
  ON CONFLICT(name) DO UPDATE SET
    romaji=excluded.romaji,
    birth_place=excluded.birth_place,
    agency=excluded.agency,
    birth_date=excluded.birth_date,
    debut_year=excluded.debut_year,
    groups=excluded.groups,
    representative_works=excluded.representative_works,
    representative_characters=excluded.representative_characters,
    five_groups=excluded.five_groups,
    is_enabled=1`);

const tx = db.transaction((rows: any[]) => {
  for (const r of rows) {
    upsert.run({
      name: r.name,
      romaji: r.romaji || '',
      birth_place: r.birth_place || '',
      agency: r.agency || '',
      birth_date: r.birth_date,
      debut_year: r.debut_year,
      groups: JSON.stringify(r.groups || []),
      blood_type: null,
      representative_works: JSON.stringify(r.representative_works || []),
      representative_characters: JSON.stringify(r.representative_characters || []),
      five_groups: JSON.stringify(r.five_groups || []),
    });
  }
});
tx(list);

// player_difficulties: 全 enabled -> beginner/easy/full
try {
  db.exec(`CREATE TABLE IF NOT EXISTS player_difficulties (
    player_id INTEGER NOT NULL,
    difficulty_key VARCHAR(32) NOT NULL,
    PRIMARY KEY (player_id, difficulty_key)
  )`);
} catch (e) { /* ignore */ }
const allIds = db
  .prepare('SELECT id, five_groups, representative_characters, agency, birth_place, debut_year FROM seiyuus WHERE is_enabled=1')
  .all() as any[];
const insertDiff = db.prepare('INSERT OR IGNORE INTO player_difficulties (player_id, difficulty_key) VALUES (?, ?)');
const txDiffs = db.transaction((ids: any[]) => {
  for (const s of ids) {
    let repLen = 0;
    try {
      const arr = JSON.parse(s.representative_characters || '[]');
      repLen = Array.isArray(arr) ? arr.length : 0;
    } catch { /* ignore */ }
    let fiveOk = false;
    try {
      const arr = JSON.parse(s.five_groups || '[]');
      fiveOk = Array.isArray(arr) && arr.length > 0;
    } catch {
      fiveOk = (s.five_groups || '[]').length > 4;
    }
    const basicOk = Boolean(s.agency || s.birth_place || s.debut_year);
    const beginner = true;
    const easy = fiveOk || repLen >= 3 || (basicOk && repLen >= 1);
    const full = true;
    if (beginner) insertDiff.run(s.id, 'beginner');
    if (easy) insertDiff.run(s.id, 'easy');
    if (full) insertDiff.run(s.id, 'full');
  }
});
txDiffs(allIds);

const count = (db.prepare('SELECT COUNT(*) AS c FROM seiyuus WHERE is_enabled=1').get() as any).c;
const five = (db.prepare('SELECT COUNT(*) AS c FROM seiyuus WHERE json_array_length(five_groups)>0').get() as any).c;
console.log(`[import] 导入完成。启用声优=${count}, 五大企划相关=${five}`);
const FIVE = ['LoveLive!', 'BanG Dream!（邦邦）', '偶像大师系列', '赛马娘 Pretty Derby', '少女歌剧 Revue Starlight'];
for (const g of FIVE) {
  const n = (db.prepare('SELECT COUNT(*) AS c FROM seiyuus WHERE instr(five_groups, ?) > 0').get(JSON.stringify(g).slice(1, -1)) as any).c;
  console.log('   -', g, '=', n);
}
const diffCount = (q: string) => (db.prepare('SELECT COUNT(*) AS c FROM player_difficulties WHERE difficulty_key=?').get(q) as any).c;
console.log(`[import] difficulty: beginner=${diffCount('beginner')}, easy=${diffCount('easy')}, full=${diffCount('full')}`);
db.close();

// 触发 server 重启
try {
  const triggerPath = path.resolve(__dirname, '../src/db/schema.ts');
  const now = new Date();
  fs.utimesSync(triggerPath, now, now);
  console.log('[import] 已触发 dev server 重启');
} catch (e) {
  console.warn('[import] 触发重启失败', (e as Error).message);
}
