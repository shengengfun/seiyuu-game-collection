/**
 * LoveLive 最终清理:
 * 1. 删除非正式成员的 LL 团体标签(堀绘梨子/法元明菜等)
 * 2. 补上漏匹配的(结那→Liella!)
 * 3. 最终统计
 */
import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(__dirname, '..', 'data', 'seiyuu-bangumi.sqlite3');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

// LL 系所有团体名(包括子团)
const LL_GROUPS = new Set([
  "μ's", 'A-RISE', 'Aqours', 'Saint Snow',
  '虹咲学园学园偶像同好会', 'Liella!', 'Sunny Passion',
  '莲之空女学院学园偶像俱乐部', '学园偶像音乐剧',
  'CYaRon!', 'AZALEA', 'Guilty Kiss',
  'DiverDiva', 'A・Zu・Na', 'Qu4rtz', 'R3birth',
]);

// 权威成员名单(已在 fix-lovelive-groups.ts 中设置过)
const AUTHORITATIVE_MEMBERS = new Set([
  // μ's
  '新田惠海', '南条爱乃', '内田彩', '三森铃子', '饭田里穗', 'Pile', '楠田亚衣奈', '久保田未梦', '德井青空',
  // A-RISE
  '樱川惠', '松永真穗', '大桥步夕',
  // Aqours
  '伊波杏树', '逢田梨香子', '诹访奈奈香', '小宫有纱', '齐藤朱夏', '小林爱香', '高槻加奈子', '铃木爱奈', '降幡爱',
  // Saint Snow
  '田野麻美', '佐藤日向',
  // 虹咲
  '矢野妃菜喜', '大西亚玖璃', '相良茉优', '前田佳织里', '久保田未梦', '村上奈津实', '鬼头明里', '楠木灯', '指出毬亚', '田中千惠美', '小泉萌香', '内田秀', '本渡枫', '法元明菜',
  // Liella!
  '伊达小百合', 'Liyuu', '岬奈子', 'Payton尚未', '青山渚', '铃原希实', '大熊和奏', '绘森彩', '结那', '坂仓花',
  // Sunny Passion
  '吉武千飒', '结木由奈',
  // 莲之空(已在DB里,不动)
  '佐佐木琴子', '野中心菜', '榆井希实', '月音瑚奈', '来栖凛', '樱井阳菜',
]);

// 手动补充:结那→Liella!(DB里名字是"结那"不是"結那")
const EXTRA_ADD: Array<{ name: string; group: string }> = [
  { name: '结那', group: 'Liella!' },
];

function main() {
  const upd = db.prepare('UPDATE seiyuus SET groups = ?, five_groups = ? WHERE id = ?');
  let cleaned = 0;
  let added = 0;

  // 1. 补充漏匹配的
  for (const e of EXTRA_ADD) {
    const row = db.prepare(`SELECT id, groups, five_groups FROM seiyuus WHERE name = ?`).get(e.name) as any;
    if (!row) { console.log(`⚠ ${e.name} 不在DB`); continue; }
    const groups: string[] = JSON.parse(row.groups || '[]');
    const five: string[] = JSON.parse(row.five_groups || '[]');
    if (!groups.includes(e.group)) {
      const newGroups = [...groups, e.group];
      const newFive = five.includes('LoveLive!') ? five : [...five, 'LoveLive!'];
      upd.run(JSON.stringify(newGroups), JSON.stringify(newFive), row.id);
      console.log(`补充: ${e.name} → ${e.group}`);
      added++;
    }
  }

  // 2. 清理非正式成员
  const llRows = db.prepare(`SELECT id, name, groups, five_groups FROM seiyuus WHERE five_groups LIKE '%LoveLive%'`).all() as any[];
  console.log(`\nLoveLive 标记共 ${llRows.length} 人`);

  for (const row of llRows) {
    if (AUTHORITATIVE_MEMBERS.has(row.name)) continue; // 正式成员跳过

    const groups: string[] = JSON.parse(row.groups || '[]');
    const llInGroups = groups.filter((g) => LL_GROUPS.has(g));
    if (!llInGroups.length) continue; // 没有LL团体标签,跳过

    // 非正式成员有LL团体标签 → 删除
    const cleanedGroups = groups.filter((g) => !LL_GROUPS.has(g));
    console.log(`清理: ${row.name} 删除 ${JSON.stringify(llInGroups)}`);
    upd.run(JSON.stringify(cleanedGroups), row.five_groups, row.id);
    cleaned++;
  }

  console.log(`\n补充 ${added} 人, 清理 ${cleaned} 人`);

  // 3. 最终统计
  console.log('\n=== LoveLive! 最终团体分布 ===');
  const final = db.prepare(`SELECT name, groups FROM seiyuus WHERE five_groups LIKE '%LoveLive%'`).all() as any[];
  const cnt: Record<string, string[]> = {};
  let empty = 0;
  for (const r of final) {
    const gs: string[] = JSON.parse(r.groups || '[]');
    if (!gs.length) { empty++; continue; }
    for (const g of gs) {
      if (LL_GROUPS.has(g)) {
        if (!cnt[g]) cnt[g] = [];
        cnt[g].push(r.name);
      }
    }
  }
  for (const [g, members] of Object.entries(cnt).sort((a, b) => b[1].length - a[1].length)) {
    console.log(`  ${g} (${members.length}): ${members.join(', ')}`);
  }
  console.log(`  (无子团体): ${empty}`);

  // 4. 缺失检查
  console.log('\n=== 不在数据库的正式成员 ===');
  const allNames = db.prepare(`SELECT name FROM seiyuus`).all().map((r: any) => r.name);
  const missing = [
    { name: 'Pile', group: "μ's" },
    { name: '绘森彩', group: 'Liella!' },
    { name: '吉武千飒', group: 'Sunny Passion' },
  ];
  for (const m of missing) {
    if (!allNames.includes(m.name)) console.log(`  ⚠ ${m.name} (${m.group})`);
  }

  db.close();
  console.log('\n完成!');
}
main();
