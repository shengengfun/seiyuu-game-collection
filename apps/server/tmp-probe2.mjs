import Database from 'better-sqlite3';

const db = new Database('d:/Seiyu-guess/server/data/seiyuu-bangumi.sqlite3', { readonly: true });

console.log('== five_groups 取值分布 ==');
for (const row of db.prepare('select five_groups as g, count(*) as c from seiyuus group by five_groups order by c desc limit 30').all()) {
  console.log(`  ${JSON.stringify(row.g)} -> ${row.c}`);
}

console.log('\n== groups 样例（前 20 条非空）==');
for (const row of db.prepare("select name, groups from seiyuus where groups is not null and groups != '' limit 20").all()) {
  console.log(`  ${row.name}: ${String(row.groups).slice(0, 120)}`);
}

console.log('\n== 抽样：代表性角色字段 ==');
for (const row of db.prepare('select name, romaji, agency, representative_characters, representative_works, groups from seiyuus where name in (?,?,?,?,?,?,?,?)').all(
  '伊达小百合', '羊宫妃那', '高尾奏音', '立石凜', '和气杏未', 'Machico', '小山百代', '爱美',
)) {
  console.log(`  ${row.name} | ${row.romaji} | ${row.agency}`);
  console.log(`     角色: ${String(row.representative_characters ?? '').slice(0, 150)}`);
  console.log(`     作品: ${String(row.representative_works ?? '').slice(0, 150)}`);
  console.log(`     分组: ${String(row.groups ?? '').slice(0, 150)}`);
}
db.close();
