// 用萌娘百科"日本声优出生年代索引"白名单过滤 Bangumi 数据库
// 不在白名单的（含模糊匹配后仍不匹配的）一律删除
import path from 'path';
import fs from 'fs';
import Database from 'better-sqlite3';

const DB_PATH = path.resolve(__dirname, '../data/seiyuu-bangumi.sqlite3');
const MOEGIRL_LIST = path.resolve(__dirname, '../tmp/female-seiyuu-list.json');

const moegirl: { name: string; decade: string }[] = JSON.parse(fs.readFileSync(MOEGIRL_LIST, 'utf8'));
const mSet = new Set(moegirl.map((x) => x.name));
console.log(`萌娘百科白名单: ${mSet.size} 人`);

const db = new Database(DB_PATH);

// 获取所有声优
const all = db.prepare('SELECT id, name FROM seiyuus').all() as { id: number; name: string }[];
console.log(`Bangumi 库当前: ${all.length} 人`);

// 匹配策略：精确匹配 → 去括号匹配
function normalize(s: string): string {
  // 去掉括号及括号内内容：（...）(...)（声优）等
  return s.replace(/[（(].*?[）)]/g, '').trim();
}

let matched = 0;
const toDelete: number[] = [];
for (const s of all) {
  if (mSet.has(s.name)) {
    matched++;
    continue;
  }
  const norm = normalize(s.name);
  if (norm !== s.name && mSet.has(norm)) {
    matched++;
    continue;
  }
  toDelete.push(s.id);
}

console.log(`匹配（含去括号）: ${matched} 人`);
console.log(`待删除: ${toDelete.length} 人`);

// 删除不在白名单的声优（player_difficulties 有 ON DELETE CASCADE 会自动清理）
const delStmt = db.prepare('DELETE FROM seiyuus WHERE id = ?');
const tx = db.transaction((ids: number[]) => {
  for (const id of ids) delStmt.run(id);
});
tx(toDelete);

// 验证
const remaining = (db.prepare('SELECT COUNT(*) AS c FROM seiyuus').get() as any).c;
console.log(`\n过滤后剩余: ${remaining} 人`);

const stats = db.prepare(`SELECT difficulty_key, COUNT(*) AS c FROM player_difficulties
  GROUP BY difficulty_key ORDER BY difficulty_key`).all() as any[];
console.log('难度分布:');
for (const r of stats) console.log(`  ${r.difficulty_key.padEnd(16)} : ${String(r.c).padStart(5)}人`);

// 验证知名声优
const samples = ['花泽香菜', '悠木碧', '早见沙织', '钉宫理惠', '水树奈奈', '上坂堇', '立石凛', '大熊和奏', '堀江由衣', '种田梨沙', '林鼓子', '爱美'];
const ph = samples.map(() => '?').join(',');
const rs = db.prepare(`SELECT name FROM seiyuus WHERE name IN (${ph})`).all(...samples) as any[];
console.log(`\n知名声优验证: ${rs.length}/${samples.length} 保留`);
for (const r of rs) console.log(`  ✓ ${r.name}`);
const missing = samples.filter(n => !rs.some(r => r.name === n));
if (missing.length) console.log(`  ✗ 缺失: ${missing.join(', ')}`);

// 检查是否还有非日本名
const foreign = db.prepare(`SELECT name FROM seiyuus WHERE name GLOB '[A-Z]*' LIMIT 20`).all() as any[];
if (foreign.length) {
  console.log(`\n剩余英文名开头（可能有遗漏）:`);
  for (const r of foreign) console.log(`  ${r.name}`);
}

db.close();
console.log('\n过滤完成 ✅');
