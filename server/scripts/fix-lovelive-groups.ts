/**
 * LoveLive! 全企划团体权威修正
 * 数据来源: Wikipedia (英文) 官方角色-声优对照
 *
 * 覆盖团体:
 *   μ's (9), A-RISE (3), Aqours (9), Saint Snow (2),
 *   虹咲 (12+1=13), Liella! (11), Sunny Passion (2)
 */
import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(__dirname, '..', 'data', 'seiyuu-bangumi.sqlite3');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

// ===== 权威映射: 声优名(日文/中文变体) → 团体 =====
// 一个声优可以属于多个团体(如久保田未梦=虹咲+MyGO!!!林鼓子继任せつ菜)
const LOVE_LIVE_MAP: Array<{ names: string[]; group: string; five: string }> = [
  // === μ's (9人) ===
  { names: ['新田恵海', '新田惠海'], group: "μ's", five: 'LoveLive!' },
  { names: ['南条愛乃', '南条爱乃'], group: "μ's", five: 'LoveLive!' },
  { names: ['内田彩'], group: "μ's", five: 'LoveLive!' },
  { names: ['三森すずこ', '三森铃子'], group: "μ's", five: 'LoveLive!' },
  { names: ['飯田里穂', '饭田里穗'], group: "μ's", five: 'LoveLive!' },
  { names: ['Pile'], group: "μ's", five: 'LoveLive!' },
  { names: ['楠田亜衣奈', '楠田亚衣奈'], group: "μ's", five: 'LoveLive!' },
  { names: ['久保ユリカ', '久保田未梦', '久保由利香'], group: "μ's", five: 'LoveLive!' },
  { names: ['徳井青空', '德井青空'], group: "μ's", five: 'LoveLive!' },

  // === A-RISE (3人, 对手团) ===
  { names: ['桜川めぐ', '樱川惠'], group: 'A-RISE', five: 'LoveLive!' },
  { names: ['松永真穂', '松永真穗'], group: 'A-RISE', five: 'LoveLive!' },
  { names: ['大橋歩夕', '大桥步夕', 'Ayuru Ohashi', '大橋歩'], group: 'A-RISE', five: 'LoveLive!' },

  // === Aqours (9人) ===
  { names: ['伊波杏樹', '伊波杏树'], group: 'Aqours', five: 'LoveLive!' },
  { names: ['逢田梨香子'], group: 'Aqours', five: 'LoveLive!' },
  { names: ['諏訪ななか', '诹访奈奈香'], group: 'Aqours', five: 'LoveLive!' },
  { names: ['小宮有紗', '小宫有纱'], group: 'Aqours', five: 'LoveLive!' },
  { names: ['斉藤朱夏', '齐藤朱夏'], group: 'Aqours', five: 'LoveLive!' },
  { names: ['小林愛香', '小林爱香'], group: 'Aqours', five: 'LoveLive!' },
  { names: ['高槻かなこ'], group: 'Aqours', five: 'LoveLive!' },
  { names: ['鈴木愛奈', '铃木爱奈'], group: 'Aqours', five: 'LoveLive!' },
  { names: ['降幡愛', '降幡爱'], group: 'Aqours', five: 'LoveLive!' },

  // === Saint Snow (2人, 对手团) ===
  { names: ['田野アサミ', '田野麻美'], group: 'Saint Snow', five: 'LoveLive!' },
  { names: ['佐藤日向'], group: 'Saint Snow', five: 'LoveLive!' },

  // === 虹咲学园学园偶像同好会 (12+1=13人, 含主角高咲侑) ===
  { names: ['矢野妃菜喜'], group: '虹咲学园学园偶像同好会', five: 'LoveLive!' },
  { names: ['大西亚玖璃'], group: '虹咲学园学园偶像同好会', five: 'LoveLive!' },
  { names: ['相良茉優', '相良茉优'], group: '虹咲学园学园偶像同好会', five: 'LoveLive!' },
  { names: ['前田佳織里', '前田佳织里'], group: '虹咲学园学园偶像同好会', five: 'LoveLive!' },
  { names: ['久保田未夢', '久保田未梦'], group: '虹咲学园学园偶像同好会', five: 'LoveLive!' },
  { names: ['村上奈津実', '村上奈津实'], group: '虹咲学园学园偶像同好会', five: 'LoveLive!' },
  { names: ['鬼頭明里', '鬼头明里'], group: '虹咲学园学园偶像同好会', five: 'LoveLive!' },
  { names: ['楠木灯'], group: '虹咲学园学园偶像同好会', five: 'LoveLive!' }, // 初代せつ菜(2017-2023)
  { names: ['指出毬亜', '指出毬亚'], group: '虹咲学园学园偶像同好会', five: 'LoveLive!' },
  { names: ['田中ちえ美'], group: '虹咲学园学园偶像同好会', five: 'LoveLive!' },
  { names: ['小泉萌香'], group: '虹咲学园学园偶像同好会', five: 'LoveLive!' },
  { names: ['内田秀'], group: '虹咲学园学园偶像同好会', five: 'LoveLive!' },
  { names: ['本渡楓', '本渡枫'], group: '虹咲学园学园偶像同好会', five: 'LoveLive!' },
  { names: ['法元明菜'], group: '虹咲学园学园偶像同好会', five: 'LoveLive!' }, // 鐘嵐珠

  // === Liella! (11人) ===
  { names: ['伊達さゆり', '伊达小百合', 'Date Sayuri'], group: 'Liella!', five: 'LoveLive!' },
  { names: ['Liyuu', '黎狱'], group: 'Liella!', five: 'LoveLive!' },
  { names: ['岬奈子'], group: 'Liella!', five: 'LoveLive!' },
  { names: ['ペイトン尚未', 'Naomi Payton'], group: 'Liella!', five: 'LoveLive!' },
  { names: ['青山渚', 'Nagisa Aoyama'], group: 'Liella!', five: 'LoveLive!' },
  { names: ['鈴原希実', '铃原希实', 'Nozomi Suzuhara'], group: 'Liella!', five: 'LoveLive!' },
  { names: ['薮島朱音', '薮岛朱音', 'Akane Yabushima'], group: 'Liella!', five: 'LoveLive!' },
  { names: ['大熊和奏', 'Wakana Okuma'], group: 'Liella!', five: 'LoveLive!' },
  { names: ['絵森彩', '绘森彩', 'Aya Emori'], group: 'Liella!', five: 'LoveLive!' },
  { names: ['結那', 'Yuina'], group: 'Liella!', five: 'LoveLive!' },
  { names: ['坂倉花', '坂仓花', 'Sakura Sakakura'], group: 'Liella!', five: 'LoveLive!' },

  // === Sunny Passion (2人) ===
  { names: ['吉武千颯', '吉武千飒', 'Chihaya Yoshitake'], group: 'Sunny Passion', five: 'LoveLive!' },
  { names: ['結木ゆな', '结木由奈', 'Yuna Yuki'], group: 'Sunny Passion', five: 'LoveLive!' },
];

// LoveLive 系列所有团体(用于清理:不属于这些的就是脏数据)
const LL_GROUPS = new Set([
  "μ's", 'A-RISE', 'Aqours', 'Saint Snow',
  '虹咲学园学园偶像同好会', 'Liella!', 'Sunny Passion',
  '莲之空女学院学园偶像俱乐部', '学园偶像音乐剧',
  // 子团保留(不在上述主团但也是LL的)
  'CYaRon!', 'AZALEA', 'Guilty Kiss',
  'DiverDiva', 'A・Zu・Na', 'Qu4rtz', 'R3birth',
]);

function main() {
  // 先建一个 name→{group, five} 的查找表
  const nameLookup = new Map<string, { group: string; five: string }>();
  for (const entry of LOVE_LIVE_MAP) {
    for (const n of entry.names) {
      nameLookup.set(n, { group: entry.group, five: entry.five });
    }
  }

  // 取所有声优
  const all = db.prepare(`SELECT id, name, groups, five_groups FROM seiyuus`).all() as any[];
  console.log(`数据库共 ${all.length} 人`);

  const upd = db.prepare('UPDATE seiyuus SET groups = ?, five_groups = ? WHERE id = ?');
  let changed = 0;
  const log: string[] = [];

  for (const row of all) {
    const lookup = nameLookup.get(row.name);
    if (!lookup) continue;

    const groups: string[] = JSON.parse(row.groups || '[]');
    const five: string[] = JSON.parse(row.five_groups || '[]');

    // 1. 清理:从 groups 中删除所有 LL 系团体(防止脏数据)
    const nonLL = groups.filter((g) => !LL_GROUPS.has(g));
    // 2. 加入权威团体
    const newGroups = [...new Set([...nonLL, lookup.group])];
    // 3. 确保 five_groups 包含 LoveLive!
    const newFive = five.includes(lookup.five) ? five : [...five, lookup.five];

    if (JSON.stringify(newGroups.sort()) !== JSON.stringify(groups.sort()) ||
        JSON.stringify(newFive.sort()) !== JSON.stringify(five.sort())) {
      upd.run(JSON.stringify(newGroups), JSON.stringify(newFive), row.id);
      changed++;
      log.push(`  ${row.name}: groups ${JSON.stringify(groups)} → ${JSON.stringify(newGroups)}`);
    }
  }

  console.log(`\n更新 ${changed} 人:`);
  for (const l of log) console.log(l);

  // ===== 统计 =====
  console.log('\n=== LoveLive! 子团体分布(最终) ===');
  const llRows = db.prepare(`SELECT name, groups FROM seiyuus WHERE five_groups LIKE '%LoveLive%'`).all() as any[];
  const cnt: Record<string, string[]> = {};
  let empty = 0;
  for (const r of llRows) {
    const gs: string[] = JSON.parse(r.groups || '[]');
    if (!gs.length) { empty++; continue; }
    for (const g of gs) {
      if (!cnt[g]) cnt[g] = [];
      cnt[g].push(r.name);
    }
  }
  for (const [g, members] of Object.entries(cnt).sort((a, b) => b[1].length - a[1].length)) {
    console.log(`  ${g} (${members.length}): ${members.join(', ')}`);
  }
  console.log(`  (无子团体): ${empty}`);

  // ===== 验证:检查是否有人在映射表里但不在数据库 =====
  console.log('\n=== 缺失声优检查 ===');
  for (const entry of LOVE_LIVE_MAP) {
    for (const n of entry.names) {
      const found = all.some((r) => r.name === n);
      if (!found) {
        console.log(`  ⚠ ${n} (${entry.group}) 不在数据库`);
        break;
      }
    }
  }

  db.close();
  console.log('\n完成!');
}
main();
