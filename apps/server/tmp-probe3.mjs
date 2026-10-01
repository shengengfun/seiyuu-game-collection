import Database from 'better-sqlite3';
import { writeFileSync } from 'node:fs';

const db = new Database('d:/Seiyu-guess/server/data/seiyuu-bangumi.sqlite3', { readonly: true });
const groups = ['LoveLive!', 'BanG Dream!（邦邦）', '偶像大师系列', '赛马娘 Pretty Derby', '少女歌剧 Revue Starlight'];

const lines = [];
for (const group of groups) {
  const rows = db
    .prepare('select name, collects, groups from seiyuus where five_groups like ? order by collects desc limit 40')
    .all(`%${group}%`);
  lines.push(`===== ${group} (top40 by collects) =====`);
  for (const row of rows) {
    lines.push(`${String(row.collects).padStart(5)}  ${row.name}  [${String(row.groups).slice(0, 90)}]`);
  }
  lines.push('');
}

// 声优库总人数与 collects 分布
lines.push('== collects 分位 ==');
const stat = db.prepare('select min(collects) as mn, max(collects) as mx, count(*) as c from seiyuus').get();
lines.push(JSON.stringify(stat));
writeFileSync('d:/Seiyu-guess/tmp/seiyuu-groups.txt', lines.join('\n'), 'utf8');
db.close();
console.log('written');
