import Database from 'better-sqlite3';
import { writeFileSync } from 'node:fs';

const db = new Database('d:/Seiyu-guess/server/data/seiyuu-bangumi.sqlite3', { readonly: true });
const out = [];

// 赛马娘：列出成员及其第一个代表角色（角色名是日文原文，能看出谁配谁）
const rows = db
  .prepare("select name, groups, collects, representative_characters from seiyuus where five_groups like '%トレセン学園%' and groups like '%トレセン学園%' order by collects desc limit 70")
  .all();
out.push('--- 赛马娘 成员（含角色）---');
for (const row of rows) {
  let chars = '';
  try {
    chars = JSON.parse(row.representative_characters).filter((i) => /トレセン|ウマ|競馬|馬娘|Pretty Derby|ROAD TO THE TOP|うまゆる/.test(i.work)).map((i) => i.character).join('、');
  } catch {}
  out.push(`  ${row.name} | ${chars || '(无马娘角色)'}`);
}

// 花岩香奈 / 薄井友里 / 长月葵 等学园偶像大师成员
out.push('\n--- 学园偶像大师相关（按名字）---');
for (const name of ['花岩香奈', '薄井友里', '长月葵', '小鹿奈绪', '饭田光', '川村玲奈', '礒部花凛', '西尾夕香', '纺木吏佐', '志崎桦音', '入江麻衣子']) {
  const row = db.prepare('select name, romaji, agency, representative_characters from seiyuus where name = ?').get(name);
  if (!row) {
    out.push(`  ${name} -> 未找到`);
    continue;
  }
  let chars = '';
  try {
    chars = JSON.parse(row.representative_characters).map((i) => i.character).slice(0, 6).join('、');
  } catch {}
  out.push(`  ${row.name} | ${row.romaji} | ${row.agency} | ${chars}`);
}

// 桃井愛莉/望月穂波 等 PJSK 角色用日文原名再查一次
out.push('\n--- PJSK 角色日文名反查 ---');
for (const keyword of ['望月穂波', '小豆沢こはね', '星乃一歌', '花里みのり', '東雲絵名', '草薙寧々', '朝比奈まふゆ', '宵崎奏', '暁山瑞希', '日野森志歩', '桐谷遥', '天馬咲希', '鳳えむ']) {
  const hits = db.prepare('select name, representative_characters from seiyuus where representative_characters like ? limit 3').all(`%${keyword}%`);
  out.push(`  ${keyword} -> ${hits.map((h) => h.name).join(' | ') || '未找到'}`);
}

writeFileSync('d:/Seiyu-guess/tmp/seiyuu-lookup3.txt', out.join('\n'), 'utf8');
db.close();
console.log('written');
