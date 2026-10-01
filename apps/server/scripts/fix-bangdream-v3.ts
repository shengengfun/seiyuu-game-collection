/**
 * v3 修复:
 *  - 修正错误映射:若宮イヴ≠中岛由贵,是秦佐和子
 *  - 补 missing five_groups:村上奈津实(Hello Happy)、铃木实里(RAS)、小原好美(Afterglow)
 *  - 硬知识覆盖:小原好美(Afterglow/宇田川巴)/村上奈津实(Hello Happy/北泽育美)/铃木实里(RAS/MASKING)
 */
import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(__dirname, '..', 'data', 'seiyuu-bangumi.sqlite3');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

// ===== 1. 声优名→邦邦团的硬映射(不管 five_groups 有没有,只要该声优在DB里就追加) =====
const NAME_FIXES: Array<{ name: string; addFive?: string[]; setBangGroups?: string[] }> = [
  // 小原好美 = Afterglow 宇田川巴
  { name: '小原好美', addFive: ['BanG Dream!（邦邦）'], setBangGroups: ['Afterglow'] },
  // 村上奈津实 = Hello Happy 北泽育美
  { name: '村上奈津实', addFive: ['BanG Dream!（邦邦）'], setBangGroups: ["Hello, Happy World!"] },
  // 铃木实里 = RAS MASKING(鳰原令王那)
  { name: '铃木实里', addFive: ['BanG Dream!（邦邦）'], setBangGroups: ['RAISE A SUILEN'] },
];

// ===== 2. 错误清理:中岛由贵 from Pastel → 只保留 Roselia =====
// 中岛由贵 = 今井莉莎 = Roselia, 她不是若宮イヴ(Pastel)
// 若宮イヴ = 秦佐和子 → Pastel (已命中角色匹配,之前已经是 Pastel 了)

function mergeJSON<T>(raw: string | null, adder: (cur: T[]) => T[]): string {
  let cur: T[] = [];
  try { cur = JSON.parse(raw || '[]') as T[]; } catch {}
  if (!Array.isArray(cur)) cur = [];
  return JSON.stringify([...new Set(adder(cur))]);
}

const BANGDREAM_GROUPS = new Set([
  "Poppin'Party", 'Afterglow', 'Pastel＊Palettes', "Hello, Happy World!",
  'Roselia', 'Morfonica', 'RAISE A SUILEN', 'MyGO!!!!!', 'Ave Mujica',
  'CRYCHIC', 'UniChØrd', 'Starry Garden', '桃源郷', '∑Ages',
]);

function main() {
  let upd = 0;
  for (const fix of NAME_FIXES) {
    const row = db.prepare(`SELECT id, five_groups, groups FROM seiyuus WHERE name = ?`).get(fix.name) as any;
    if (!row) { console.log(`⚠ ${fix.name} 不在 DB,跳过`); continue; }
    const newFive = mergeJSON<string>(row.five_groups, (cur) => [...cur, ...(fix.addFive || [])]);
    const newGroups = mergeJSON<string>(row.groups, (cur) => {
      const nonBang = cur.filter((g) => !BANGDREAM_GROUPS.has(g));
      return fix.setBangGroups ? [...nonBang, ...fix.setBangGroups] : cur;
    });
    db.prepare(`UPDATE seiyuus SET five_groups = ?, groups = ? WHERE id = ?`).run(newFive, newGroups, row.id);
    console.log(`${fix.name}: five_groups=${newFive} groups=${newGroups}`);
    upd++;
  }

  // 修正:中岛由贵 → 删除 Pastel,只留 Roselia
  const nk = db.prepare(`SELECT id, groups FROM seiyuus WHERE name = ?`).get('中岛由贵') as any;
  if (nk) {
    const cur: string[] = JSON.parse(nk.groups || '[]');
    const fixed = cur.filter((g) => g !== 'Pastel＊Palettes');
    db.prepare(`UPDATE seiyuus SET groups = ? WHERE id = ?`).run(JSON.stringify(fixed), nk.id);
    console.log(`中岛由贵: ${nk.groups} → ${JSON.stringify(fixed)}`);
    upd++;
  }

  // ===== 再次统计 =====
  console.log(`\n共更新 ${upd} 人`);
  console.log('\n=== BanG Dream 各团(最终) ===');
  const bdRows = db.prepare(`SELECT name, groups FROM seiyuus WHERE five_groups LIKE '%BanG Dream%'`).all() as any[];
  const cnt: Record<string, number> = {};
  let empty = 0;
  for (const r of bdRows) {
    const gs: string[] = JSON.parse(r.groups || '[]');
    const bdOnly = gs.filter((g) => BANGDREAM_GROUPS.has(g));
    if (!bdOnly.length) { empty++; continue; }
    for (const g of bdOnly) cnt[g] = (cnt[g] || 0) + 1;
  }
  for (const [g, c] of Object.entries(cnt).sort((a, b) => b[1] - a[1])) console.log(`  ${g}: ${c}`);
  console.log(`  (邦邦无团标记): ${empty}`);

  // 最终验证:9 个核心乐队按 5 人一行
  console.log('\n=== 9 个乐队完整成员 ===');
  const wants = [
    ["Poppin'Party", ['爱美','大冢纱英','西本里美','大桥彩香','伊藤彩沙']],
    ['Afterglow', ['三泽纱千香','佐仓绫音','金元寿子','小原好美','白壁爽子']],
    ['Pastel＊Palettes', ['前岛亚美','小泽亚李','中上育实','秦佐和子','仓知玲凤']],
    ["Hello, Happy World!", ['伊藤美来','丰田萌绘','村上奈津实','吉田有里','深川芹亚']],
    ['Roselia', ['相羽亚衣奈','工藤晴香','志崎桦音','樱川惠','中岛由贵']],
    ['Morfonica', ['进藤天音','西尾夕香','直田姬奈','mika/二叶筑紫','米泽圆']],
    ['RAISE A SUILEN', ['Raychell','夏芽莉子','Lock?','仓知玲凤？','铃木实里']],
    ['MyGO!!!!!', ['羊宫妃那','立石凛','小日向美香','椎名立希','林鼓子']],
    ['Ave Mujica', ['佐佐木李子','冈田梦以','渡濑结月','高尾奏音','青木阳菜/长崎？']],
  ];
  for (const [band, members] of wants) {
    const have = db.prepare(`SELECT name FROM seiyuus WHERE five_groups LIKE '%BanG Dream%' AND groups LIKE ?`).all(`%${band}%`) as any[];
    console.log(`\n${band}(要求5人,实际${have.length}): ${have.map((h:any)=>h.name).join(',')}`);
    const missing = (members as string[]).filter((m) => !have.some((h:any)=>h.name===m));
    if (missing.length) console.log(`  缺/疑: ${missing.join(',')}`);
  }
  db.close();
}
main();
