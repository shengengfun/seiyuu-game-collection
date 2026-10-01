import Database from 'better-sqlite3';
const db = new Database('./data/seiyuu-rebuild.sqlite3', { readonly: true });

const BANGDREAM_MEMBERS = [
  // Poppin'Party
  '爱美', '大冢纱英', '西本里美', '大桥彩香', '伊藤彩沙',
  // Afterglow
  '佐仓绫音', '三泽纱千香', '加藤英美里', '日笠阳子', '金元寿子',
  // Pastel＊Palettes
  '前岛亚美', '小泽亚李', '上坂堇', '中上育实', '秦佐和子',
  // Roselia
  '相羽爱奈', '工藤晴香', '中岛由贵', '樱川惠', '志崎桦音', '远藤祐里香', '明坂聪美',
  // Hello, Happy World!
  '伊藤美来', '田所梓', '吉田有里', '丰田萌绘', '黑泽朋世',
  // Morfonica
  '进藤天音', '直田姬奈', '西尾夕香', 'mika', 'Ayasa',
  // RAISE A SUILEN
  'Raychell', '小原莉子', '夏芽', '仓知玲凤', '纺木吏佐',
  // MyGO!!!!!
  '羊宫妃那', '立石凛', '青木阳菜', '小日向美香', '林鼓子',
  // Ave Mujica
  '佐佐木李子', '渡濑结月', '冈田梦以', '米泽茜', '高尾奏音',
  // CRYCHIC
  '羊宫妃那', '渡濑结月', '小日向美香', '林鼓子', '高尾奏音',
];

const found: string[] = [];
const missing: string[] = [];
for (const name of BANGDREAM_MEMBERS) {
  const row = db.prepare('SELECT id FROM seiyuus WHERE name = ?').get(name) as any;
  if (row) {
    if (!found.includes(name)) found.push(name);
  } else {
    if (!missing.includes(name)) missing.push(name);
  }
}
console.log(`已匹配: ${found.length} 人`);
console.log(found.join(', '));
console.log(`\n未匹配: ${missing.length} 人`);
console.log(missing.join(', '));

// 模糊搜索未匹配的
console.log('\n--- 模糊搜索未匹配的声优 ---');
for (const name of missing) {
  const rows = db.prepare("SELECT id, name, romaji FROM seiyuus WHERE name LIKE ? OR romaji LIKE ?").all(`%${name}%`, `%${name}%`) as any[];
  console.log(`  ${name}: ${rows.length > 0 ? rows.map(r => `${r.name}(${r.romaji})`).join(', ') : '完全找不到'}`);
}
db.close();
