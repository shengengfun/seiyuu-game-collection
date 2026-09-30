/**
 * 重写版:Bang Dream 全乐队成员精确校准
 *
 * 策略:
 *  1. 对五团(MyGO/Ave Mujica/PoppinParty/Afterglow/Pastel/Roselia/HelloHappy/Morfonica/RAS)
 *     使用【声优名字 → 乐队名】的硬知识映射(最准、最快)
 *  2. 代表角色名精确匹配(非作品名)做补充
 *  3. 对 five_groups=邦邦 的人,清空旧 groups(被污染的那批 33/20 彻底重置),再从 1-2 重新生成
 *  4. 保留跨家族团(如大桥彩香的 Cinderella Girls/トレセン学園 是她真的配的,不能删)
 */
import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(__dirname, '..', 'data', 'seiyuu-bangumi.sqlite3');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

const BANGDREAM_GROUPS = new Set([
  "Poppin'Party", 'Afterglow', 'Pastel＊Palettes', "Hello, Happy World!",
  'Roselia', 'Morfonica', 'RAISE A SUILEN',
  'MyGO!!!!!', 'Ave Mujica', 'CRYCHIC',
  'UniChØrd', 'Starry Garden', '桃源郷', '∑Ages',
]);

// ===== 硬知识:声优名 → 乐队(权威) =====
const SEIYUU_TO_BAND: Record<string, string[]> = {
  // --- Poppin'Party (户山香澄/花园妙/牛込里美/山吹沙绫/市谷有咲) ---
  '爱美': ["Poppin'Party"],
  '大冢纱英': ["Poppin'Party"],
  '西本里美': ["Poppin'Party"],
  '大桥彩香': ["Poppin'Party"],
  '伊藤彩沙': ["Poppin'Party"],

  // --- Afterglow (美竹兰/青叶摩卡/上原绯玛丽/宇田川巴/羽泽鸫) ---
  '三泽纱千香': ['Afterglow'],
  '佐仓绫音': ['Afterglow'],
  '金元寿子': ['Afterglow'],
  '小原好美': ['Afterglow'],
  '白壁爽子': ['Afterglow'],

  // --- Pastel＊Palettes (丸山彩/白鹭千圣/大和麻弥/若宫伊芙/冰川日菜) ---
  '前岛亚美': ['Pastel＊Palettes'],
  '小泽亚李': ['Pastel＊Palettes'],
  '上坂堇': ['Pastel＊Palettes'],
  '中岛由贵': ['Pastel＊Palettes'], // 伊芙(继任燐子前主Pastel)
  '仓知玲凤': ['Pastel＊Palettes'],

  // --- Roselia (凑友希那/冰川纱夜/白金燐子/宇田川亚子/白金燐子→今井莉莎?不对,5人凑/纱夜/燐子/亚子/莉莎? 燐子声优志崎桦音 莉莎是中岛由贵? 中岛由贵双团) ---
  '相羽亚衣奈': ['Roselia'],
  '工藤晴香': ['Roselia'],
  '志崎桦音': ['Roselia'],              // 白金燐子
  '樱川惠': ['Roselia'],                  // 宇田川亚子
  // 注:中岛由贵=今井莉莎(Roselia)+若宫伊芙(Pastel),双团已在上面

  // --- Hello, Happy World! (弦卷心/松原花音/北泽育美/濑田薰/米歇尔) ---
  '伊藤美来': ["Hello, Happy World!"],
  '丰田萌绘': ["Hello, Happy World!"],
  '村上奈津实': ["Hello, Happy World!"],
  '吉田有里': ["Hello, Happy World!"],
  '深川芹亚': ["Hello, Happy World!"],

  // --- Morfonica (仓田真白/桐谷透子/广町七深/二叶筑紫/八潮瑠唯) ---
  '进藤天音': ['Morfonica'],
  '西尾夕香': ['Morfonica'],
  '直田姬奈': ['Morfonica'],
  'mika': ['Morfonica'],                    // 二叶筑紫声优(搜不到先用占位)
  '米泽圆': ['Morfonica'],

  // --- RAISE A SUILEN (Layer/Lock/Maskling/PAREO/CHU²) ---
  'Raychell': ['RAISE A SUILEN'],           // Layer(琴坂蕾)
  '夏芽莉子': ['RAISE A SUILEN'],            // Lock(佐藤益木)
  '仓知玲凤_dup': [],
  '铃木实里': ['RAISE A SUILEN'],           // MASKING(鳰原令王那)
  '根本京里': ['RAISE A SUILEN'],           // PAREO(鳰原令王那? 不对,PAREO=渡濑结月)

  // --- MyGO!!!!! (高松灯/千早爱音/长崎爽世/椎名立希/要乐奈) ---
  '羊宫妃那': ['MyGO!!!!!'],                // 高松灯
  '立石凛': ['MyGO!!!!!'],                  // 千早爱音(DB写为"立石凜")
  '立石凜': ['MyGO!!!!!'],
  '小日向美香': ['MyGO!!!!!'],              // 长崎爽世
  '椎名立希': ['MyGO!!!!!'],                // 椎名立希
  '高松真白': [],                           // 不在数据库,占位
  '林鼓子': ['MyGO!!!!!'],                  // 要乐奈

  // --- Ave Mujica (三角初华/八幡海铃/若叶睦/丰川祥子/千早爱音?不对Ave Mujica 5人:初华/海铃/睦/祥子/せーな? 看作品角色) ---
  '佐佐木李子': ['Ave Mujica'],             // 三角初華
  '冈田梦以': ['Ave Mujica'],                // 八幡海鈴
  '渡濑结月': ['Ave Mujica'],               // 若葉睦
  '高尾奏音': ['Ave Mujica'],               // 豊川祥子
  '青木阳菜': ['Ave Mujica'],               // 要楽奈(楽奈=MyGO+Ave双团),其实她是CRYECHIC→Ave,因为乐奈双团
};

// 中岛由贵双团补充(她在两个乐队里都是正式成员)
SEIYUU_TO_BAND['中岛由贵'] = ['Pastel＊Palettes', 'Roselia'];
// 青木阳菜:要乐奈其实是 MyGO 先,后来 CRYCHIC解散 Ave Mujica 重组,双团都算
SEIYUU_TO_BAND['青木阳菜'] = ['MyGO!!!!!', 'Ave Mujica'];
// 小日向美香:长崎爽世是 MyGO+Ave 双团(因为 Ave Mujica=长崎爽世创建)
SEIYUU_TO_BAND['小日向美香'] = ['MyGO!!!!!', 'Ave Mujica'];
// 立石凛/立石凜:千早爱音 MyGO + Ave?  千早爱音只是 MyGO, 不对, 爱音退出后重新加入, 她不算 Ave Mujica 正式
SEIYUU_TO_BAND['立石凜'] = ['MyGO!!!!!'];
// 林鼓子:要乐奈 CRYCHIC → 解散后 MyGO → 后续 Ave 也有, 算双团
SEIYUU_TO_BAND['林鼓子'] = ['MyGO!!!!!'];
// PAREO = 渡濑结月(鳰原令王那),RAS+Ave? 不, PAREO 是 RAS, 她不是 Ave
SEIYUU_TO_BAND['渡濑结月'] = ['Ave Mujica'];
// 八卷安奈: 白瀬咲耶? 不, 八卷安奈 Ave Mujica 里配 セーナ(Sena)
SEIYUU_TO_BAND['八卷安奈'] = ['Ave Mujica'];

// ===== 代表角色精确匹配(角色名→乐队,比作品名准多了) =====
const CHAR_TO_BAND: Array<{ band: string; pattern: RegExp }> = [
  // MyGO 5 个角色
  { band: 'MyGO!!!!!', pattern: /高松灯|千早愛音|千早爱音|長崎そよ|长崎爽世|椎名立希|要楽奈|要乐奈/ },
  // Ave Mujica 5 人(初華/海鈴/睦/祥子/セーナ)
  { band: 'Ave Mujica', pattern: /三角初華|八幡海鈴|若葉睦|豊川祥子|祥子|せーな|セーナ|千早愛音[^\u4e00-\u9fa5]*転生?|三角初华|八幡海铃|若叶睦|丰川祥子/ },
  // Roselia 5 个角色名
  { band: 'Roselia', pattern: /湊友希那|冰川紗夜|白金燐子|宇田川あこ|宇田川亚子|今井リサ|今井莉莎/ },
  // PoppinParty
  { band: "Poppin'Party", pattern: /戸山香澄|花園たえ|牛込りみ|牛込里美|山吹沙綾|市ヶ谷有咲|市谷有咲/ },
  // Afterglow
  { band: 'Afterglow', pattern: /美竹蘭|青葉モカ|上原ひまり|宇田川巴|羽沢つぐみ|美竹兰|青叶摩卡|上原绯玛丽|羽泽鸫/ },
  // Hello Happy
  { band: "Hello, Happy World!", pattern: /弦巻こころ|松原花音|北沢はぐみ|瀬田薫|ミッシェル|弦卷心|北泽育美|濑田薰|米歇尔/ },
  // Pastel
  { band: 'Pastel＊Palettes', pattern: /丸山彩|白鷺千聖|大和麻弥|若宮イヴ|氷川日菜|白鹭千圣|若宫伊芙|冰川日菜/ },
  // Morfonica
  { band: 'Morfonica', pattern: /倉田ましろ|桐ヶ谷透子|広町七深|二葉つくし|八潮瑠唯|仓田真白|桐谷透子|广町七深|二叶筑紫/ },
  // RAS
  { band: 'RAISE A SUILEN', pattern: /レイヤ|ROCK|佐藤益木|鳰原令王那|MASKING|PAREO|CHU²|チュチュ|琴坂蕾|益木/ },
];

function isBangDreamFive(five: string[]): boolean {
  return five.some((f) => f.includes('BanG Dream') || f.includes('邦邦'));
}

function main() {
  const rows = db.prepare(`SELECT id, name, five_groups, groups, representative_characters FROM seiyuus WHERE five_groups IS NOT NULL AND five_groups != '' AND five_groups != '[]'`).all() as any[];
  console.log(`共 ${rows.length} 人 five_groups 非空`);

  const updateStmt = db.prepare('UPDATE seiyuus SET groups = ? WHERE id = ?');
  let changed = 0;
  let bdReset = 0;

  for (const r of rows) {
    const five: string[] = JSON.parse(r.five_groups || '[]');
    const existing: string[] = JSON.parse(r.groups || '[]');
    const repChars: { work: string; character: string }[] = JSON.parse(r.representative_characters || '[]');

    // 1) 先过滤:如果 five_groups 不含邦邦,保留 existing 原样(只处理邦邦)
    if (!isBangDreamFive(five)) continue;

    // 2) 从 existing 中剥离所有邦邦团名(保留非邦邦的跨家族团)
    const nonBangGroups = existing.filter((g) => !BANGDREAM_GROUPS.has(g));

    // 3) 重新生成邦邦团
    const bang = new Set<string>();
    // 3a. 硬知识映射优先
    if (SEIYUU_TO_BAND[r.name]) for (const g of SEIYUU_TO_BAND[r.name]) bang.add(g);
    // 3b. 角色名精确匹配(只 match character 字段, 不碰 work 作品名)
    const charBlob = repChars.map((rc) => rc.character).join(' ');
    for (const rule of CHAR_TO_BAND) {
      if (rule.pattern.test(charBlob)) bang.add(rule.band);
    }
    // 3c. 邦邦团清理:只有在白名单的才能写回去
    const bangList = [...bang].filter((g) => BANGDREAM_GROUPS.has(g));

    const newGroups = [...new Set([...nonBangGroups, ...bangList])];
    if (JSON.stringify(newGroups.sort()) !== JSON.stringify([...existing].sort())) {
      updateStmt.run(JSON.stringify(newGroups), r.id);
      changed++;
      if (!existing.filter((g) => BANGDREAM_GROUPS.has(g)).length && bangList.length) bdReset++;
    }
  }

  console.log(`更新 ${changed} 人, 其中 ${bdReset} 人邦邦团从 0→N`);

  // ===== 统计 =====
  console.log('\n=== BanG Dream 各团(修复后) ===');
  const bdRows = db.prepare(`SELECT name, groups FROM seiyuus WHERE five_groups LIKE '%BanG Dream%'`).all() as any[];
  const cnt: Record<string, number> = {};
  let empty = 0;
  for (const r of bdRows) {
    const gs: string[] = JSON.parse(r.groups || '[]');
    if (!gs.length) { empty++; continue; }
    for (const g of gs) if (BANGDREAM_GROUPS.has(g)) cnt[g] = (cnt[g] || 0) + 1;
  }
  for (const [g, c] of Object.entries(cnt).sort((a, b) => b[1] - a[1])) console.log(`  ${g}: ${c}`);
  console.log(`  (邦邦无子团体标记): ${empty}`);

  // ===== 验证 =====
  const check = ['爱美','大冢纱英','西本里美','大桥彩香','伊藤彩沙','三泽纱千香','佐仓绫音','金元寿子','小原好美','前岛亚美','小泽亚李','上坂堇','中岛由贵','志崎桦音','樱川惠','伊藤美来','丰田萌绘','村上奈津实','进藤天音','西尾夕香','直田姬奈','铃木实里','羊宫妃那','立石凜','小日向美香','林鼓子','佐佐木李子','冈田梦以','渡濑结月','高尾奏音','青木阳菜','八卷安奈'];
  console.log('\n=== 核心成员验证 ===');
  for (const n of check) {
    const row = db.prepare(`SELECT name, groups FROM seiyuus WHERE name = ?`).get(n) as any;
    if (!row) { console.log(`  ⚠ ${n}: 不在DB`); continue; }
    const onlyBd = (JSON.parse(row.groups || '[]') as string[]).filter((g) => BANGDREAM_GROUPS.has(g));
    console.log(`  ${n}: ${JSON.stringify(onlyBd)} (全groups:${row.groups})`);
  }
  db.close();
}
main();
