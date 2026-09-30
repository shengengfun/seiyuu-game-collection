import Database from 'better-sqlite3';
import { writeFileSync } from 'node:fs';

const db = new Database('d:/Seiyu-guess/server/data/seiyuu-bangumi.sqlite3', { readonly: true });
const out = [];

const findByName = (names) => {
  out.push(`--- 直接查名: ${names.join(' / ')} ---`);
  for (const name of names) {
    const rows = db.prepare('select name, romaji, agency, collectS from (select name, romaji, agency, collects as collectS from seiyuus where name = ?)').all(name);
    // fallback: 模糊
    const hit = rows.length ? rows : db.prepare('select name, romaji, agency from seiyuus where name like ? limit 5').all(`%${name}%`);
    out.push(`  ${name} -> ${hit.map((r) => r.name).join(' | ') || '未找到'}`);
  }
};

/** 按角色名反查 CV：代表角色 JSON 里包含该角色名 */
const findByCharacter = (keywords) => {
  out.push(`--- 反查角色: ${keywords.join(' / ')} ---`);
  for (const keyword of keywords) {
    const rows = db
      .prepare('select name, representative_characters from seiyuus where representative_characters like ? limit 6')
      .all(`%${keyword}%`);
    const hits = rows.map((row) => {
      let found = '';
      try {
        const list = JSON.parse(row.representative_characters);
        found = list.filter((item) => String(item.character ?? '').includes(keyword)).map((item) => `${item.work}`).join(',');
      } catch {}
      return `${row.name}${found ? ` (${found})` : ''}`;
    });
    out.push(`  ${keyword} -> ${hits.join(' | ') || '未找到'}`);
  }
};

/** 列出某企划 tag 下的成员（按 collects 降序） */
const listGroup = (group) => {
  const rows = db
    .prepare('select name, groups, collects from seiyuus where five_groups like ? order by collects desc limit 25')
    .all(`%${group}%`);
  out.push(`--- 企划 ${group} ---`);
  for (const row of rows) out.push(`  ${row.name} [${String(row.groups).slice(0, 70)}]`);
};

listGroup('学园偶像大师');

findByCharacter([
  '小豆沢こはね', '星乃一歌', '花里みのり', '桐谷遥', '桃井愛莉', '日野森志歩',
  '望月穂波', '天馬咲希', '東雲絵名', '暁山瑞希', '朝比奈まふゆ', '宵崎奏',
  '鳳えむ', '草薙寧々',
  '藤田ことね', '篠澤広', '葛城リーリヤ', '花海咲季', '月村手毬', '姫崎莉波',
  '愛本りんく', '山手響子', '出雲咲姫', '渡月麗',
]);

findByName([
  '伊达小百合', 'Liyuu', '大西亚玖璃', '小泉萌香', '伊波杏树', '降幡爱', '逢田梨香子', '小原好美', '楠木灯',
  '爱美', '相羽爱奈', '伊藤美来', '大桥彩香', '高尾奏音', '羊宫妃那', '立石凜', '青木阳菜', '小日向美香', '中岛由贵', '三泽纱千香', '佐佐木李子',
  '野口瑠璃子', '秋奈', '礒部花凜', '上田丽奈', '高野麻里佳', 'Machico', '和气杏未', '小山百代', '伊藤彩沙', '佐藤日向', '富田美忧', '岩田阳葵',
  '古贺葵', '芹泽优', '田中美海',
]);

writeFileSync('d:/Seiyu-guess/tmp/seiyuu-lookup.txt', out.join('\n'), 'utf8');
db.close();
console.log('written', out.length);
