// 清理 JSON 和数据库中的虚拟角色（误把角色当声优抓进来的）
import path from 'path';
import fs from 'fs';
import Database from 'better-sqlite3';

const INPUT = process.argv[2] || path.resolve(__dirname, '../tmp/moegirl3-only5-limit600.json');
const DB_PATH = path.resolve(__dirname, '../data/seiyuu-guess.sqlite3');

const list = JSON.parse(fs.readFileSync(INPUT, 'utf8')) as any[];
console.log('[clean] 原始条目数:', list.length);

// 虚拟角色特征：romaji/birth_place/agency/debut_year 全空，groups 为空，
// representative_characters 为空或只含垃圾（颜色码、空字符等）
const isLikelyCharacter = (r: any) => {
  const hasBasic = r.romaji || r.birth_place || r.agency || r.debut_year;
  if (hasBasic) return false;
  const groups = r.groups || [];
  if (groups.length > 0) return false; // 有团体的通常是声优
  const reps = r.representative_characters || [];
  // representative_characters 全是垃圾（颜色码、无作品名的空角色）
  const hasRealRep = reps.some((rc: any) => rc.character && rc.character.length > 1 && !/^#[0-9a-fA-F]{3,8}$/.test(rc.character));
  if (hasRealRep) return false;
  return true;
};

const suspects = list.filter(isLikelyCharacter);
const clean = list.filter((r) => !isLikelyCharacter(r));
console.log('[clean] 疑似虚拟角色:', suspects.length);
console.log('[clean] 疑似虚拟角色名:', suspects.map((s) => s.name).join('、'));
console.log('[clean] 清洗后条目数:', clean.length);

// 写回清洗后的 JSON
fs.writeFileSync(INPUT, JSON.stringify(clean, null, 2), 'utf8');
console.log('[clean] 已写回 JSON:', INPUT);

// 清理数据库
const db = new Database(DB_PATH);
db.pragma('foreign_keys = OFF');

// 先看看数据库里有多少条
const before = (db.prepare('SELECT COUNT(*) AS c FROM seiyuus WHERE is_enabled=1').get() as any).c;
console.log('[clean] DB 清理前启用声优数:', before);

// 删除虚拟角色：无 romaji/birth_place/agency/debut_year/groups 且 representative_characters 为空或垃圾
const rows = db.prepare('SELECT id, name, romaji, birth_place, agency, debut_year, groups, representative_characters FROM seiyuus WHERE is_enabled=1').all() as any[];
const toDelete: number[] = [];
for (const r of rows) {
  const hasBasic = r.romaji || r.birth_place || r.agency || r.debut_year;
  if (hasBasic) continue;
  let groups: any[] = [];
  try { groups = JSON.parse(r.groups || '[]'); } catch { /* ignore */ }
  if (groups.length > 0) continue;
  let reps: any[] = [];
  try { reps = JSON.parse(r.representative_characters || '[]'); } catch { /* ignore */ }
  const hasRealRep = reps.some((rc: any) => rc.character && rc.character.length > 1 && !/^#[0-9a-fA-F]{3,8}$/.test(rc.character));
  if (hasRealRep) continue;
  toDelete.push(r.id);
}
console.log('[clean] DB 待删除虚拟角色数:', toDelete.length);
console.log('[clean] DB 待删除名:', toDelete.map((id) => rows.find((r) => r.id === id)?.name).join('、'));

if (toDelete.length > 0) {
  const delTx = db.transaction((ids: number[]) => {
    const delDiff = db.prepare('DELETE FROM player_difficulties WHERE player_id=?');
    const delSeiyuu = db.prepare('DELETE FROM seiyuus WHERE id=?');
    for (const id of ids) {
      delDiff.run(id);
      delSeiyuu.run(id);
    }
  });
  delTx(toDelete);
}

const after = (db.prepare('SELECT COUNT(*) AS c FROM seiyuus WHERE is_enabled=1').get() as any).c;
const five = (db.prepare('SELECT COUNT(*) AS c FROM seiyuus WHERE json_array_length(five_groups)>0').get() as any).c;
console.log('[clean] DB 清理后启用声优数:', after, '五大企划:', five);
db.close();

// 触发 server 重启
try {
  const triggerPath = path.resolve(__dirname, '../src/db/schema.ts');
  const now = new Date();
  fs.utimesSync(triggerPath, now, now);
  console.log('[clean] 已触发 dev server 重启');
} catch (e) {
  console.warn('[clean] 触发重启失败', (e as Error).message);
}
