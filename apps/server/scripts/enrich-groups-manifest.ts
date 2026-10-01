/**
 * ============================================================
 *  声优数据库重建 - 步骤 2：补全 groups / sub_groups / five_groups
 * ============================================================
 *
 *  数据来源（全部为声优本人属性，非角色作品推断）：
 *    A. PROJECT_MANIFEST 硬编码白名单（网上查证的权威团体×声优映射）
 *    B. full-seiyuu-data.json 萌娘百科 infobox「所属团体」字段
 *
 *  ❌ 绝对禁止：从代表角色的作品名/角色名「正则匹配」推断团体或五大企划
 *
 *  修正记录（vs 旧版）：
 *    - BanG Dream: Ave Mujica/MyGO!!!!! 之前把角色名当声优名（千早爱音=角色名！），已全部修正
 *    - Afterglow: 之前名单错误（混入富田麻帆等），已修正为 佐仓绫音/三泽纱千香/加藤英美里/日笠阳子/金元寿子
 *    - 新增 sub_groups 小队字段（LoveLife 系列的 Printemps/BiBi/CYaRon! 等）
 *    - 新增世界计划（PJSK）题库
 * ============================================================
 */
import path from 'path';
import Database from 'better-sqlite3';

const DB_PATH = path.resolve(__dirname, '../data/seiyuu-rebuild.sqlite3');

// ============================================================
//  1. 企划×团体×小队 精确白名单
// ============================================================
type SubGroup = { name: string; members: string[] };
type GroupDef = { groupName: string; members: string[]; subGroups?: SubGroup[] };
type ProjectDef = { fiveKey: string; diffKey: string; groups: GroupDef[] };

const PROJECT_MANIFEST: ProjectDef[] = [
  // ============================================================
  //  LoveLive! 系列
  // ============================================================
  {
    fiveKey: 'LoveLive!',
    diffKey: 'lovelive',
    groups: [
      // μ's (9人) + 3小队
      {
        groupName: "μ's",
        members: ['新田惠海', '南条爱乃', '内田彩', '三森铃子', '饭田里穗', 'Pile', '楠田亚衣奈', '久保由利香', '德井青空'],
        subGroups: [
          { name: 'Printemps', members: ['新田惠海', '内田彩', '久保由利香'] },
          { name: 'BiBi', members: ['南条爱乃', 'Pile', '德井青空'] },
          { name: 'lily white', members: ['三森铃子', '饭田里穗', '楠田亚衣奈'] },
        ],
      },
      // Aqours (9人) + 3小队 + YYY广播小队
      {
        groupName: 'Aqours',
        members: ['伊波杏树', '逢田梨香子', '诹访奈奈香', '小宫有纱', '齐藤朱夏', '小林爱香', '高槻加奈子', '铃木爱奈', '降幡爱'],
        subGroups: [
          { name: 'CYaRon!', members: ['伊波杏树', '齐藤朱夏', '降幡爱'] },
          { name: 'AZALEA', members: ['诹访奈奈香', '小宫有纱', '高槻加奈子'] },
          { name: 'Guilty Kiss', members: ['逢田梨香子', '小林爱香', '铃木爱奈'] },
          { name: 'YYY', members: ['齐藤朱夏', '小林爱香', '降幡爱'] },
        ],
      },
      // 虹咲学园学园偶像同好会 (13+1=14声优：12角色含优木雪菜CV更换=13 + 高咲侑=1)
      {
        groupName: '虹咲学园学园偶像同好会',
        members: ['大西亚玖璃', '相良茉优', '前田佳织里', '久保田未梦', '鬼头明里', '楠木灯', '林鼓子', '小泉萌香', '指出毬亚', '田中千惠美', '村上奈津实', '法元明菜', '内田秀', '矢野妃菜喜'],
        subGroups: [
          { name: 'A·ZU·NA', members: ['大西亚玖璃', '前田佳织里', '楠木灯', '林鼓子'] },
          { name: 'QU4RTZ', members: ['相良茉优', '鬼头明里', '指出毬亚', '田中千惠美'] },
          { name: 'DiverDiva', members: ['久保田未梦', '村上奈津实'] },
          { name: 'R3BIRTH', members: ['小泉萌香', '内田秀', '法元明菜'] },
        ],
      },
      // Liella! (11人) + 3小队
      {
        groupName: 'Liella!',
        members: ['伊达小百合', 'Liyuu', '岬奈子', 'Payton尚未', '青山渚', '铃原希实', '大熊和奏', '薮岛朱音', '绘森彩', '结那', '坂仓花'],
        subGroups: [
          { name: 'CatChu!', members: ['伊达小百合', 'Payton尚未', '薮岛朱音'] },
          { name: 'KALEIDOSCORE', members: ['Liyuu', '青山渚', '结那'] },
          { name: '5yncri5e!', members: ['岬奈子', '铃原希实', '大熊和奏', '绘森彩', '坂仓花'] },
        ],
      },
      // 莲之空女学院学园偶像俱乐部 (8人在籍+3人已毕业) + 4小队
      {
        groupName: '莲之空女学院学园偶像俱乐部',
        members: ['榆井希实', '野中心菜', '菅叶和', '樱井阳菜', '叶山风花', '来栖凛', '三宅美羽', '进藤天音', '花宫初奈', '佐佐木琴子', '月音瑚奈'],
        subGroups: [
          { name: 'Cerise Bouquet', members: ['榆井希实', '樱井阳菜', '花宫初奈'] },
          { name: 'DOLLCHESTRA', members: ['野中心菜', '叶山风花', '佐佐木琴子'] },
          { name: 'Mira-Cra Park!', members: ['菅叶和', '来栖凛', '月音瑚奈'] },
          { name: 'Edel Note', members: ['三宅美羽', '进藤天音'] },
        ],
      },
      // 人生不易部！（生如百戏难！LOVELIVE! BLUEBIRD）10人 + 翻唱小队
      {
        groupName: '人生不易部！',
        members: ['绫咲穗音', '远藤璃菜', '宫野芹', '藤野心', '坂野爱羽', '濑古梨爱', '奥村优季', '天泽朱音', '小户森穗花', '凉之濑葵音'],
        subGroups: [
          { name: 'CHAKI!', members: ['绫咲穗音', '远藤璃菜', '宫野芹', '藤野心'] },
          { name: 'Plumina', members: ['奥村优季', '天泽朱音', '小户森穗花'] },
          { name: 'Mi×Nori=Tea', members: ['坂野爱羽', '濑古梨爱'] },
          { name: 'SH1ON', members: ['凉之濑葵音'] },
        ],
      },
      // 学园偶像音乐剧（演员，非声优——不收录）
      // 对手团体
      { groupName: 'A-RISE', members: ['樱川惠', '松永真穗', '大桥步夕'] },
      { groupName: 'Saint Snow', members: ['田野麻美', '佐藤日向'] },
      { groupName: 'Sunny Passion', members: ['结木由奈', '吉武千飒'] },
      // 跨企划组合 AiScReam（独立团体，非小队）
      { groupName: 'AiScReam', members: ['降幡爱', '大西亚玖璃', '大熊和奏'] },
    ],
  },

  // ============================================================
  //  BanG Dream!（邦邦）—— ❌ 之前名单有多处严重错误，已根据萌娘百科全部修正
  // ============================================================
  {
    fiveKey: 'BanG Dream!（邦邦）',
    diffKey: 'bangdream',
    groups: [
      { groupName: "Poppin'Party", members: ['爱美', '大冢纱英', '西本里美', '大桥彩香', '伊藤彩沙'] },
      { groupName: 'Afterglow', members: ['佐仓绫音', '三泽纱千香', '加藤英美里', '日笠阳子', '金元寿子'] },
      { groupName: 'Pastel＊Palettes', members: ['前岛亚美', '小泽亚李', '上坂堇', '中上育实', '秦佐和子'] },
      {
        groupName: 'Roselia',
        members: ['相羽爱奈', '工藤晴香', '中岛由贵', '樱川惠', '志崎桦音', '远藤祐里香', '明坂聪美'],
      },
      { groupName: 'Hello, Happy World!', members: ['伊藤美来', '田所梓', '吉田有里', '丰田萌绘', '黑泽朋世'] },
      { groupName: 'Morfonica', members: ['进藤天音', '直田姬奈', '西尾夕香', 'mika', 'Ayasa'] },
      { groupName: 'RAISE A SUILEN', members: ['Raychell', '小原莉子', '夏芽', '仓知玲凤', '纺木吏佐'] },
      { groupName: 'MyGO!!!!!', members: ['羊宫妃那', '立石凛', '青木阳菜', '小日向美香', '林鼓子'] },
      { groupName: 'Ave Mujica', members: ['佐佐木李子', '渡濑结月', '冈田梦以', '米泽茜', '高尾奏音'] },
      { groupName: 'CRYCHIC', members: ['羊宫妃那', '渡濑结月', '小日向美香', '林鼓子', '高尾奏音'] },
    ],
  },

  // ============================================================
  //  偶像大师系列
  // ============================================================
  {
    fiveKey: '偶像大师系列',
    diffKey: 'idolmaster',
    groups: [
      {
        groupName: '765PRO ALLSTARS',
        members: ['中村绘里子', '今井麻美', '浅仓杏美', '仁后真耶子', '若林直美', '高桥智秋', '钉宫理惠', '平田宏美', '下田麻美', '长谷川明子', '原由实', '沼仓爱美'],
      },
      {
        groupName: 'Cinderella Girls',
        members: [
          '大桥彩香', '福原绫香', '原纱友里', '青木琉璃子', '山崎惠理', '佐藤亚美菜',
          '松嵜丽', '野村香菜子', '涩谷梓希', '金子真由美', '黑泽朋世', '洲崎绫',
          '木村珠莉', '饭田友子', '铃木绘理', '佐藤聪美', '高森奈津美', '杜野真子',
          '大坪由佳', '津田美波', '内田真礼', '木户衣吹', '田所梓', '东山奈央',
          '上坂堇', '藤田茜', '牧野由依', '堀江由衣', '大空直美', '黑泽朋世',
        ],
      },
      {
        groupName: 'Million Live!',
        members: [
          '山崎遥', '田所梓', '麻仓桃', '夏川椎菜', '雨宫天', '伊藤美来', '上田丽奈',
          '角元明日香', '近藤唯', '中村温姬', '松田飒水', '种田梨沙', '早见沙织',
          '户田惠', '野村香菜子', '高桥未奈美', '东山奈央', '沼仓爱美', '诹访彩花',
          '原纱友里', '福原绫香', '滨崎奈奈', '三宅麻理惠', '菊池纱也子', '佐藤利奈',
          '大西沙织', '村上奈津实', '上田瞳', '木户衣吹', '南早纪', '小笠原早纪',
          '郁原优', '野村香菜子', '麻仓桃', '夏川椎菜', '雨宫天',
        ],
      },
      {
        groupName: 'Shiny Colors',
        members: [
          '结川莉子', '菅沼千纱', '峰田茉优', '高辻丽', '杜野真子', '海田朱音',
          '河井晴菜', '野口瑠璃子', '川口莉奈', '永井真里子', '日笠阳子', '早濑莉花',
          '石见舞菜香', '前田佳织里', '田中贵子', '小林优', '本泉莉奈', '丸冈和佳奈',
          '佐藤实季', '松田利冴', '青木阳菜', '星谷美绪', '南条光',
        ],
      },
      {
        groupName: '学园偶像大师',
        members: [
          '菊池纱也子', '日原步美', '小池理子', '中村栞奈', '水野朔', '花宫初奈',
          '矢野妃菜喜', '月音瑚奈', '能家叶月', '北川侑那', '音井结衣', '长谷川育美',
          '菅野真衣', '橘美月', '林鼓子', '小泉萌香', '中岛由贵', '立石凛',
        ],
      },
    ],
  },

  // ============================================================
  //  赛马娘 Pretty Derby
  // ============================================================
  {
    fiveKey: '赛马娘 Pretty Derby',
    diffKey: 'umamusume',
    groups: [
      {
        groupName: 'トレセン学園',
        members: [
          '和气杏未', '高野麻里佳', 'Machico', '大桥彩香', '木村千咲', '上田瞳',
          '大西沙织', '高桥未奈美', '前田玲奈', '鬼头明里', '首藤志奈', '矢野妃菜喜',
          '大和田仁美', '松井惠理子', '三宅麻理惠', '新田日和', '松嵜丽',
          '德井青空', '小山百代', '矢作纱友里', '小林优', '中岛由贵', '藤井雪代',
          '佐藤惠', '大坪由佳', '内田真礼', '日高里菜', '洲崎绫', '伊波杏树',
          '田中爱美', '立花芽惠梦', '风间万裕子', '坂井芳江', '本多真梨子',
          '真野步', '会泽纱弥', '野口瑠璃子', '天城莎莉', '相坂优歌',
          'Lynn', '高柳知叶', '青木瑠璃子', '铃木实里', '大空直美', '桥本千波', '近藤唯',
          '衣川里佳', '巽悠衣子', '田所梓',
        ],
      },
    ],
  },

  // ============================================================
  //  少女歌剧 Revue Starlight（九九组 9人，无小队）
  // ============================================================
  {
    fiveKey: '少女歌剧 Revue Starlight',
    diffKey: 'revuestarlight',
    groups: [
      {
        groupName: '九九组',
        members: ['小山百代', '三森铃子', '富田麻帆', '佐藤日向', '岩田阳葵', '小泉萌香', '相羽爱奈', '生田辉', '伊藤彩沙'],
      },
    ],
  },

  // ============================================================
  //  世界计划 彩色舞台 feat. 初音未来（PJSK）
  //  无小队概念；4名男声优不在萌娘白名单中，单独插入 DB
  // ============================================================
  {
    fiveKey: '世界计划',
    diffKey: 'sekai',
    groups: [
      { groupName: 'Leo/need', members: ['野口瑠璃子', '礒部花凛', '上田丽奈', '中岛由贵'] },
      { groupName: 'MORE MORE JUMP!', members: ['小仓唯', '吉冈茉祐', '降幡爱', '本泉莉奈'] },
      { groupName: 'Vivid BAD SQUAD', members: ['秋奈', '鹫见友美Jiena', '今井文也', '伊东健人'] },
      { groupName: 'Wonderlands×Showtime', members: ['木野日菜', 'Machico', '广濑大介', '土岐隼一'] },
      { groupName: '25时、Nightcord de.', members: ['楠木灯', '田边留依', '铃木实里', '佐藤日向'] },
    ],
  },
];

// ============================================================
//  2. 构建 名字 → {fiveGroups, groups, subGroups} 映射
// ============================================================
type Enrich = { fiveGroups: Set<string>; groups: Set<string>; subGroups: Set<string> };
const enrichMap = new Map<string, Enrich>();
function getEnrich(name: string): Enrich {
  let e = enrichMap.get(name);
  if (!e) { e = { fiveGroups: new Set(), groups: new Set(), subGroups: new Set() }; enrichMap.set(name, e); }
  return e;
}

// --- A. 来源：PROJECT_MANIFEST ---
for (const proj of PROJECT_MANIFEST) {
  for (const grp of proj.groups) {
    for (const memberName of grp.members) {
      const e = getEnrich(memberName);
      e.fiveGroups.add(proj.fiveKey);
      e.groups.add(grp.groupName);
    }
    // 小队
    if (grp.subGroups) {
      for (const sg of grp.subGroups) {
        for (const memberName of sg.members) {
          const e = getEnrich(memberName);
          e.subGroups.add(sg.name);
        }
      }
    }
  }
}
console.log(`[团体白名单] PROJECT_MANIFEST 覆盖 ${enrichMap.size} 名声优`);

// --- B. 来源已弃用 ---
// 之前会从 full-seiyuu-data.json 的 groups/five_groups 字段灌入数据，
// 但这些字段是旧爬虫通过作品名正则匹配产生的脏数据（配路人=属于团体），
// 现在完全弃用。团体/小队/五大企划只来自 PROJECT_MANIFEST 白名单。
// 萌娘百科数据仅用于步骤3补全基础属性（生日/事务所/出道年等）。
console.log('[来源B已弃用] full-seiyuu-data.json 的 groups/five_groups 不再使用（脏数据源）');
console.log(`[汇总] 最终 enrichMap 覆盖 ${enrichMap.size} 名声优`);

// ============================================================
//  3. UPDATE 数据库
// ============================================================
console.log(`\n[步骤2] 连接 DB: ${DB_PATH}`);
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

// 检查 sub_groups 列是否存在，不存在则加
try {
  db.prepare('SELECT sub_groups FROM seiyuus LIMIT 1').get();
} catch {
  console.log('  sub_groups 列不存在，正在添加...');
  db.exec("ALTER TABLE seiyuus ADD COLUMN sub_groups TEXT NOT NULL DEFAULT '[]'");
}

// --- 插入不在萌娘白名单中的声优（PJSK男声优 + BanG Dream非白名单声优）---
const PJSK_MALES = [
  { name: '今井文也', romaji: 'Imai Fumiya', group: 'Vivid BAD SQUAD' },
  { name: '伊东健人', romaji: 'Ito Kento', group: 'Vivid BAD SQUAD' },
  { name: '广濑大介', romaji: 'Hirose Daisuke', group: 'Wonderlands×Showtime' },
  { name: '土岐隼一', romaji: 'Toki Junichi', group: 'Wonderlands×Showtime' },
];
// BanG Dream 中不在萌娘白名单的女声优
const BANGDREAM_EXTRA = [
  { name: '立石凛', romaji: 'Tateishi Rin', group: 'MyGO!!!!!' },
  { name: '米泽茜', romaji: 'Yonezawa Akane', group: 'Ave Mujica' },
  { name: '夏芽', romaji: 'Natsume', group: 'RAISE A SUILEN' },
  { name: 'Ayasa', romaji: 'Ayasa', group: 'Morfonica' },
];
const insExtraStmt = db.prepare(`INSERT OR IGNORE INTO seiyuus (name, romaji, representative_works, representative_characters, groups, sub_groups, five_groups, voice_count, game_voice_count, representative_games, collects, is_enabled) VALUES (?, ?, '[]', '[]', ?, '[]', ?, 0, 0, '[]', 0, 1)`);
const insExtraDiff = db.prepare('INSERT OR IGNORE INTO player_difficulties (player_id, difficulty_key) VALUES (?, ?)');
let extraInserted = 0;

// PJSK 男声优：只进 sekai 难度
for (const m of PJSK_MALES) {
  const exist = db.prepare('SELECT id FROM seiyuus WHERE name = ?').get(m.name) as any;
  if (exist) continue;
  const info = insExtraStmt.run(m.name, m.romaji, JSON.stringify([m.group]), JSON.stringify(['世界计划']));
  insExtraDiff.run(info.lastInsertRowid, 'sekai');
  extraInserted++;
}
// BanG Dream 额外声优：进 bangdream 难度
for (const m of BANGDREAM_EXTRA) {
  const exist = db.prepare('SELECT id FROM seiyuus WHERE name = ?').get(m.name) as any;
  if (exist) continue;
  const info = insExtraStmt.run(m.name, m.romaji, JSON.stringify([m.group]), JSON.stringify(['BanG Dream!（邦邦）']));
  insExtraDiff.run(info.lastInsertRowid, 'bangdream');
  extraInserted++;
}
console.log(`  额外声优插入: ${extraInserted} 人（PJSK男声优→sekai, BanG Dream→bangdream）`);

const updateStmt = db.prepare(`UPDATE seiyuus SET five_groups = ?, groups = ?, sub_groups = ? WHERE id = ?`);
const allRows = db.prepare(`SELECT id, name, five_groups AS oldFive, groups AS oldGroups, sub_groups AS oldSub FROM seiyuus`).all() as any[];
console.log(`  DB 中声优总数: ${allRows.length}`);

let fiveUpdated = 0, groupsUpdated = 0, subUpdated = 0;
const tx = db.transaction((rows: any[]) => {
  for (const row of rows) {
    const e = enrichMap.get(row.name);
    if (!e) continue;
    const newFive = JSON.stringify([...e.fiveGroups]);
    const newGroups = JSON.stringify([...e.groups]);
    const newSub = JSON.stringify([...e.subGroups]);
    if (newFive !== row.oldFive) fiveUpdated++;
    if (newGroups !== row.oldGroups) groupsUpdated++;
    if (newSub !== row.oldSub) subUpdated++;
    updateStmt.run(newFive, newGroups, newSub, row.id);
  }
});
tx(allRows);
console.log(`  five_groups 更新: ${fiveUpdated} 行`);
console.log(`  groups 更新: ${groupsUpdated} 行`);
console.log(`  sub_groups 更新: ${subUpdated} 行`);

// ============================================================
//  4. 补 五大企划+世界计划 专项难度 + 补 easy
// ============================================================
console.log('\n[难度池补充]');
const insDiff = db.prepare('INSERT OR IGNORE INTO player_difficulties (player_id, difficulty_key) VALUES (?, ?)');
for (const proj of PROJECT_MANIFEST) {
  const list = db.prepare(`SELECT id FROM seiyuus WHERE EXISTS(SELECT 1 FROM json_each(five_groups) WHERE value=?)`).all(proj.fiveKey) as any[];
  for (const r of list) insDiff.run(r.id, proj.diffKey);
  console.log(`  ${proj.fiveKey.padEnd(24)} -> ${proj.diffKey.padEnd(16)} ${list.length} 人`);
}
// 补 easy
const easyAdded = db.prepare(`
  INSERT OR IGNORE INTO player_difficulties (player_id, difficulty_key)
  SELECT id, 'easy' FROM seiyuus WHERE json_array_length(five_groups) > 0
`).run().changes;
console.log(`  easy 补充（含五大企划+世界计划声优）: ${easyAdded} 人`);

// ============================================================
//  5. 验证断言
// ============================================================
console.log('\n[断言验证]');
const asserts: Array<[string, { groups?: string[]; subGroups?: string[]; fiveGroups?: string[]; noGroups?: string[]; noFiveGroups?: string[] }]> = [
  // LoveLive 小队
  ['南条爱乃', { fiveGroups: ['LoveLive!'], groups: ["μ's"], subGroups: ['BiBi'] }],
  ['降幡爱', { fiveGroups: ['LoveLive!', '世界计划'], groups: ['Aqours', 'AiScReam', 'MORE MORE JUMP!'], subGroups: ['CYaRon!', 'YYY'] }],
  ['新田惠海', { fiveGroups: ['LoveLive!'], groups: ["μ's"], subGroups: ['Printemps'] }],
  ['德井青空', { fiveGroups: ['LoveLive!'], groups: ["μ's"], subGroups: ['BiBi'] }],
  ['大西亚玖璃', { fiveGroups: ['LoveLive!'], groups: ['虹咲学园学园偶像同好会', 'AiScReam'], subGroups: ['A·ZU·NA'] }],
  ['林鼓子', { fiveGroups: ['LoveLive!'], groups: ['虹咲学园学园偶像同好会'], subGroups: ['A·ZU·NA'] }],
  ['楠木灯', { fiveGroups: ['LoveLive!'], groups: ['虹咲学园学园偶像同好会'], subGroups: ['A·ZU·NA'] }],
  // Bluebird
  ['绫咲穗音', { fiveGroups: ['LoveLive!'], groups: ['人生不易部！'], subGroups: ['CHAKI!'] }],
  // BanG Dream 修正后
  ['佐佐木李子', { fiveGroups: ['BanG Dream!（邦邦）'], groups: ['Ave Mujica'] }],
  ['渡濑结月', { fiveGroups: ['BanG Dream!（邦邦）'], groups: ['Ave Mujica', 'CRYCHIC'] }],
  ['羊宫妃那', { fiveGroups: ['BanG Dream!（邦邦）'], groups: ['MyGO!!!!!', 'CRYCHIC'] }],
  ['相羽爱奈', { fiveGroups: ['BanG Dream!（邦邦）'], groups: ['Roselia'] }],
  // 跨企划
  ['佐藤日向', { fiveGroups: ['LoveLive!', '少女歌剧 Revue Starlight', '世界计划'], groups: ['Saint Snow', '九九组', '25时、Nightcord de.'] }],
  ['中岛由贵', { fiveGroups: ['BanG Dream!（邦邦）', '偶像大师系列', '世界计划'], groups: ['Roselia', 'Leo/need'] }],
  // PJSK 男声优
  ['今井文也', { fiveGroups: ['世界计划'], groups: ['Vivid BAD SQUAD'] }],
  ['土岐隼一', { fiveGroups: ['世界计划'], groups: ['Wonderlands×Showtime'] }],
  // 反向验证（配过但不属于）
  ['大原沙耶香', { noFiveGroups: ['BanG Dream!（邦邦）'], noGroups: ['Ave Mujica'] }],
  ['能登麻美子', { noFiveGroups: ['赛马娘 Pretty Derby'], noGroups: ['トレセン学園'] }],
  ['名冢佳织', { noFiveGroups: ['少女歌剧 Revue Starlight'], noGroups: ['九九组'] }],
];

function assertOne(name: string, rule: typeof asserts[0][1]): number {
  const row = db.prepare(`SELECT name, five_groups, groups, sub_groups FROM seiyuus WHERE name = ?`).get(name) as any;
  if (!row) { console.log(`  ⚠️  DB 里没找到 ${name}`); return 0; }
  let fail = 0;
  const fg: string[] = JSON.parse(row.five_groups || '[]');
  const gs: string[] = JSON.parse(row.groups || '[]');
  const sg: string[] = JSON.parse(row.sub_groups || '[]');
  for (const req of rule.fiveGroups || []) if (!fg.includes(req)) { console.log(`  ❌ ${name} five 应含 ${req}，实际 ${row.five_groups}`); fail++; }
  for (const req of rule.groups || []) if (!gs.includes(req)) { console.log(`  ❌ ${name} groups 应含 ${req}，实际 ${row.groups}`); fail++; }
  for (const req of rule.subGroups || []) if (!sg.includes(req)) { console.log(`  ❌ ${name} sub_groups 应含 ${req}，实际 ${row.sub_groups}`); fail++; }
  for (const f of rule.noFiveGroups || []) if (fg.includes(f)) { console.log(`  ❌ ${name} five 不应含 ${f}，实际 ${row.five_groups}`); fail++; }
  for (const f of rule.noGroups || []) if (gs.includes(f)) { console.log(`  ❌ ${name} groups 不应含 ${f}，实际 ${row.groups}`); fail++; }
  if (fail === 0) console.log(`  ✅ ${name.padEnd(12)} five=${fg.join('/')} groups=${gs.join('/')} sub=${sg.join('/')}`);
  return fail;
}

let totalFail = 0;
for (const [name, rule] of asserts) totalFail += assertOne(name, rule);
if (totalFail === 0) console.log('  🎉 全部断言通过！');
else console.log(`  ⚠️  失败 ${totalFail} 个`);

// 统计
console.log('\n[最终统计]');
const total = db.prepare('SELECT COUNT(*) c FROM seiyuus').get() as any;
const hasFive = db.prepare('SELECT COUNT(*) c FROM seiyuus WHERE json_array_length(five_groups)>0').get() as any;
const hasGroups = db.prepare('SELECT COUNT(*) c FROM seiyuus WHERE json_array_length(groups)>0').get() as any;
const hasSub = db.prepare('SELECT COUNT(*) c FROM seiyuus WHERE json_array_length(sub_groups)>0').get() as any;
console.log(`  声优总数         = ${total.c}`);
console.log(`  有五大企划标签   = ${hasFive.c}`);
console.log(`  有所属团体(groups)= ${hasGroups.c}`);
console.log(`  有小队(sub_groups)= ${hasSub.c}`);
const diffs = db.prepare(`SELECT difficulty_key, COUNT(*) c FROM player_difficulties GROUP BY difficulty_key ORDER BY difficulty_key`).all() as any[];
for (const d of diffs) console.log(`    ${d.difficulty_key.padEnd(18)}: ${String(d.c).padStart(6)}人`);

db.close();
console.log('\n✅ 步骤2（团体/小队/五大企划+世界计划补全）完成');
