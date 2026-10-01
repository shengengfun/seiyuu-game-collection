// 临时数据探查脚本
import Database from 'better-sqlite3';

const db = new Database('./data/seiyuu-bangumi.sqlite3');

console.log('== seiyuus 表结构 ==');
const cols = db.prepare("PRAGMA table_info(seiyuus)").all();
console.log(cols.map(c => `${c.name}:${c.type}`).join('\n'));

console.log('\n== player_difficulties 表结构 ==');
const cols2 = db.prepare("PRAGMA table_info(player_difficulties)").all();
console.log(cols2.map(c => `${c.name}:${c.type}`).join('\n'));

const total = db.prepare("SELECT count(*) as n FROM seiyuus").get();
console.log('\ntotal seiyuus:', total.n);

console.log('\n== by difficulty (player_difficulties) ==');
const cnt = db.prepare("SELECT difficulty, count(*) as n FROM player_difficulties GROUP BY difficulty ORDER BY n DESC").all();
cnt.forEach(r => console.log(`  ${r.difficulty}: ${r.n}`));

console.log('\n== five_groups 分布 (seiyuus) ==');
try {
  const fg = db.prepare("SELECT five_groups, count(*) as n FROM seiyuus WHERE five_groups IS NOT NULL AND five_groups != '' GROUP BY five_groups").all();
  fg.forEach(r => console.log(`  [${r.five_groups}]: ${r.n}`));
} catch (e) {
  console.log('  error:', e.message);
}

console.log('\n== 各企划难度下字段完整度 ==');
const diffs = ['lovelive', 'bangdream', 'idolmaster', 'umamusume', 'revuestarlight'];
for (const d of diffs) {
  const row = db.prepare(`SELECT
    count(*) as total,
    sum(case when s.birthday is not null and s.birthday != '' then 1 else 0 end) as has_birthday,
    sum(case when s.agency is not null and s.agency != '' then 1 else 0 end) as has_agency,
    sum(case when s.groups is not null and s.groups != '' then 1 else 0 end) as has_groups,
    sum(case when s.five_groups is not null and s.five_groups != '' then 1 else 0 end) as has_fivegroups,
    sum(case when s.debut_year is not null then 1 else 0 end) as has_debut,
    sum(case when s.rep_roles is not null and s.rep_roles != '' and s.rep_roles != '[]' then 1 else 0 end) as has_reps
  FROM seiyuus s
  JOIN player_difficulties pd ON pd.seiyuu_id = s.id
  WHERE pd.difficulty = ?`).get(d);
  console.log(`  [${d}]`, row);
}

console.log('\n== 各企划前 3 条样例 ==');
for (const d of diffs) {
  const rows = db.prepare(`SELECT s.name, s.groups, s.five_groups, s.agency, s.debut_year, s.rep_roles
    FROM seiyuus s
    JOIN player_difficulties pd ON pd.seiyuu_id = s.id
    WHERE pd.difficulty = ?
    LIMIT 3`).all(d);
  console.log(`  --- ${d} ---`);
  rows.forEach(r => console.log('   ', JSON.stringify(r)));
}

db.close();
