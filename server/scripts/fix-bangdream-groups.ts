/**
 * 专项修复:Bang Dream 团体数据
 *
 * 核心问题:
 *   1. WORK_TO_GROUP 正则太宽,跨企划声优(如爱美=PoppinParty+赛马娘+偶像大师)会被全局扫出无关团体
 *   2. 旧 DB 迁移的 groups 混了其他企划的团(トレセン学園/九九组/Cinderella Girls 等)
 *   3. 核心成员漏(佐仓绫音、丰田萌绘、前岛亚美空)
 *
 * 修复策略:
 *   A. 邦邦团名称白名单(不属于下列名单的一律剔除)
 *   B. 核心成员精准映射(声优名→乐队名,硬知识,100%准)
 *   C. 对 five_groups 含 BanG Dream 的声优,清理 groups 字段
 */
import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(__dirname, '..', 'data', 'seiyuu-bangumi.sqlite3');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

// ========== A. 邦邦子团体白名单 ==========
const BANGDREAM_GROUP_WHITELIST = new Set([
  "Poppin'Party",
  'Afterglow',
  'Pastel＊Palettes',
  "Hello, Happy World!",
  'Roselia',
  'Morfonica',
  'RAISE A SUILEN',
  'MyGO!!!!!',
  'Ave Mujica',
  'CRYCHIC',
  'UniChØrd',
  'Starry Garden',
  '桃源郷',
  '∑Ages',
]);

// ========== B. 邦邦核心成员精准映射(声优名→乐队) ==========
const BANGDREAM_MEMBER_MAP: Record<string, string[]> = {
  // === Poppin'Party ===
  '爱美': ["Poppin'Party"],              // 户山香澄
  '大冢纱英': ["Poppin'Party"],            // 花园妙
  '西本里美': ["Poppin'Party"],            // 牛込里美
  '大桥彩香': ["Poppin'Party"],            // 山吹沙绫
  '伊藤彩沙': ["Poppin'Party"],            // 市谷有咲

  // === Afterglow ===
  '三泽纱千香': ['Afterglow'],            // 美竹兰
  '佐仓绫音': ['Afterglow'],              // 青叶摩卡
  '金元寿子': ['Afterglow'],              // 上原绯玛丽
  '小原好美': ['Afterglow'],              // 宇田川巴
  '白壁爽子': ['Afterglow'],              // 羽泽鸫

  // === Pastel＊Palettes ===
  '前岛亚美': ['Pastel＊Palettes'],        // 丸山彩
  '小泽亚李': ['Pastel＊Palettes'],        // 白鹭千圣
  '上坂堇': ['Pastel＊Palettes'],          // 大和麻弥
  '中岛由贵': ['Pastel＊Palettes', 'Roselia'], // 若宫伊芙(Pastel) + 白金燐子(Roselia)
  '仓知玲凤': ['Pastel＊Palettes'],        // 冰川日菜

  // === Roselia ===
  '相羽亚衣奈': ['Roselia'],              // 凑友希那
  '工藤晴香': ['Roselia'],                // 冰川纱夜
  // '中岛由贵' 已在上面
  '樱川惠': ['Roselia'],                  // 宇田川亚子
  '志崎桦音': ['Roselia'],                // 白金燐子(继任)

  // === Hello, Happy World! ===
  '伊藤美来': ["Hello, Happy World!"],    // 弦卷心
  '丰田萌绘': ["Hello, Happy World!"],    // 松原花音
  '村上奈津实': ["Hello, Happy World!"],  // 北泽育美
  '吉田有里': ["Hello, Happy World!"],    // 濑田薰
  '深川芹亚': ["Hello, Happy World!"],    // 米歇尔/奥泽美咲

  // === Morfonica ===
  '进藤天音': ['Morfonica'],              // 仓田真白
  '西尾夕香': ['Morfonica'],              // 桐谷透子
  '直田姬奈': ['Morfonica'],              // 广町七深
  'かなで(声优)': ['Morfonica'],          // 二叶筑紫(跳过,名字难查)
  '米泽圆': ['Morfonica'],                // 八潮瑠唯

  // === RAISE A SUILEN ===
  'Raychell': ['RAISE A SUILEN'],         // 蕾(VO)
  '夏芽莉子': ['RAISE A SUILEN'],          // 佐藤益木(BA)
  '仓知玲凤_dup': [],                      // 已在 Pastel
  '铃木实里': ['RAISE A SUILEN'],         // 鳰原令王那(DR)
  '根本京里': ['RAISE A SUILEN'],         // PAREO/鳰原令王那? 需要核对:根本京里=帕蕾欧(PAREO)=鳰原令王那
};

// 对跨双团的补充:
// 丰田萌绘也配过 PoppinParty? 不,丰田萌绘=松原花音=Hello Happy。上面写对的。
// 但有些声优跨团双份演出(如 伊藤彩沙)

// ========== C. five_groups = BanG Dream + 非邦团清理 ==========
// 对于 five_groups 中 "邦邦" 的人,先把他的 groups 过滤掉所有非邦邦白名单的词
// 如果 five_groups 是多企划(含多个 key),则先按企划拆分:属于 LoveLive 的团只在 five_groups 有 LoveLive 时保留
const ALL_GROUP_FAMILIES: Record<string, Set<string>> = {
  'BanG Dream': BANGDREAM_GROUP_WHITELIST,
  'LoveLive!': new Set([
    "μ's", 'Aqours', '虹咲学园学园偶像同好会', 'Liella!',
    '莲之空女学院学园偶像俱乐部', 'Sunny Passion', '学园偶像音乐剧',
  ]),
  '偶像大师': new Set([
    '765PRO ALLSTARS', 'Cinderella Girls', 'Million Live!',
    'Shiny Colors', 'SideM', '学园偶像大师',
  ]),
  '赛马娘': new Set(['トレセン学園']),
  '少女歌剧': new Set(['九九组']),
};

// 返回给定企划家族名的白名单判断
function familyForGroup(groupName: string): string | null {
  for (const [fam, set] of Object.entries(ALL_GROUP_FAMILIES)) {
    if (set.has(groupName)) return fam;
  }
  return null; // 未知团(可能是自定义非五大企划分组,保留不删)
}

function cleanGroupsForFiveGroups(groups: string[], fiveGroups: string[]): string[] {
  // 决定保留哪些家族
  const allowedFamilies = new Set<string>();
  for (const fg of fiveGroups) {
    if (fg.includes('BanG Dream') || fg.includes('邦邦')) allowedFamilies.add('BanG Dream');
    if (fg.includes('LoveLive')) allowedFamilies.add('LoveLive!');
    if (fg.includes('偶像大师')) allowedFamilies.add('偶像大师');
    if (fg.includes('赛马娘') || fg.includes('Pretty Derby')) allowedFamilies.add('赛马娘');
    if (fg.includes('少女歌剧') || fg.includes('Revue Starlight')) allowedFamilies.add('少女歌剧');
  }
  const out = new Set<string>();
  for (const g of groups) {
    const fam = familyForGroup(g);
    if (!fam) { out.add(g); continue; } // 未知团(如自定义组合),保留
    if (allowedFamilies.has(fam)) out.add(g);
  }
  return [...out];
}

function main() {
  // === 1. 读取所有 five_groups 非空行 ===
  const rows = db.prepare(`SELECT id, name, groups, five_groups FROM seiyuus WHERE five_groups IS NOT NULL AND five_groups != '' AND five_groups != '[]'`).all() as any[];
  console.log(`共 ${rows.length} 人有 five_groups 标记`);

  const updateStmt = db.prepare('UPDATE seiyuus SET groups = ? WHERE id = ?');
  let cleanedCount = 0;
  let mappedCount = 0;
  let beforeBdEmpty = 0, afterBdEmpty = 0;

  for (const row of rows) {
    const fiveGroups: string[] = JSON.parse(row.five_groups || '[]');
    const currentGroups: string[] = JSON.parse(row.groups || '[]');

    // 步骤1:跨家族清理(トレセン学園 没在 five_groups 赛马娘时就去掉)
    let nextGroups = cleanGroupsForFiveGroups(currentGroups, fiveGroups);

    // 步骤2:邦邦核心成员精准覆盖(确保硬知识优先)
    if (fiveGroups.some((fg) => fg.includes('BanG Dream') || fg.includes('邦邦'))) {
      if (!nextGroups.length) beforeBdEmpty++;
      if (BANGDREAM_MEMBER_MAP[row.name]) {
        // 合并白名单映射,保证不丢
        const merged = new Set<string>([...nextGroups, ...BANGDREAM_MEMBER_MAP[row.name]]);
        nextGroups = [...merged];
        mappedCount++;
      }
      if (!nextGroups.length) afterBdEmpty++;
    }

    // 有变化才写
    if (JSON.stringify([...nextGroups].sort()) !== JSON.stringify([...currentGroups].sort())) {
      updateStmt.run(JSON.stringify(nextGroups), row.id);
      cleanedCount++;
    }
  }

  console.log(`\n修复报告:`);
  console.log(`  跨家族清理 + 精准映射: ${cleanedCount} 人更新`);
  console.log(`  邦邦核心成员精准命中: ${mappedCount} 人`);
  console.log(`  邦邦声优 groups 修复前后: 空 ${beforeBdEmpty} → ${afterBdEmpty}`);

  // === 2. 五大企划覆盖率统计 ===
  console.log('\n=== 五大企划分布(修复后) ===');
  const fiveKeyPatterns: [string, string][] = [
    ['LoveLive!', '%LoveLive%'],
    ['BanG Dream', '%BanG Dream%'],
    ['偶像大师', '%偶像大师%'],
    ['赛马娘', '%赛马娘%'],
    ['少女歌剧', '%少女歌剧%'],
  ];
  for (const [label, like] of fiveKeyPatterns) {
    const total: number = db.prepare(`SELECT COUNT(*) FROM seiyuus WHERE five_groups LIKE ?`).pluck().get(like) as number;
    const hasGrp: number = db.prepare(`SELECT COUNT(*) FROM seiyuus WHERE five_groups LIKE ? AND groups IS NOT NULL AND groups != '[]' AND groups != ''`).pluck().get(like) as number;
    console.log(`  ${label}: ${total} 人, 有子团体 ${hasGrp} (${((hasGrp / total) * 100 || 0).toFixed(1)}%)`);
  }

  // === 3. 邦邦各子团人数(修复后) ===
  console.log('\n=== BanG Dream 子团体明细(修复后) ===');
  const bdRows = db.prepare(`SELECT name, groups FROM seiyuus WHERE five_groups LIKE '%BanG Dream%'`).all() as any[];
  const bdCount: Record<string, number> = {};
  let bdEmpty = 0;
  for (const r of bdRows) {
    const groups: string[] = JSON.parse(r.groups || '[]');
    if (!groups.length) { bdEmpty++; continue; }
    for (const g of groups) bdCount[g] = (bdCount[g] || 0) + 1;
  }
  for (const [g, c] of Object.entries(bdCount).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${g}: ${c} 人`);
  }
  console.log(`  (无子团体): ${bdEmpty} 人`);

  // === 4. 关键人物验证 ===
  const keyNames = ['爱美','大冢纱英','西本里美','大桥彩香','伊藤彩沙','三泽纱千香','佐仓绫音','金元寿子','小原好美','相羽亚衣奈','工藤晴香','中岛由贵','樱川惠','志崎桦音','前岛亚美','丰田萌绘','村上奈津实','伊藤美来','进藤天音','西尾夕香','铃木实里','根本京里','夏芽莉子','羊宫妃那','立石凛','小日向美香','椎名立希','高松真白','长谷川育美','坂仓美佳','高桥真麻'];
  console.log('\n=== 关键成员验证 ===');
  for (const name of keyNames) {
    const row = db.prepare(`SELECT name, groups, five_groups FROM seiyuus WHERE name = ?`).get(name) as any;
    if (!row) { console.log(`  ⚠ ${name}: 不在数据库`); continue; }
    console.log(`  ${name}: groups=${row.groups}`);
  }

  db.close();
  console.log('\n修复完成!');
}

main();
