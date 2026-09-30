/**
 * 通用验证:对五大企划声优的 groups 做角色名交叉验证
 * 如果 groups 里有某团体标记,但代表角色列表(character 字段)里找不到该团体的任何已知角色名,
 * 则认为该标记是脏数据(通常来自旧DB迁移或作品名正则误匹配),删除它。
 *
 * 同时补充"高咲侑"等容易遗漏的主角名。
 */
import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(__dirname, '..', 'data', 'seiyuu-bangumi.sqlite3');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

// ===== 每个团体对应的已知角色名(日文+中文) =====
const GROUP_CHAR_NAMES: Array<{ group: string; chars: RegExp }> = [
  // μ's
  { group: "μ's", chars: /高坂穂乃果|高坂穗乃果|絢瀬絵里|绚濑绘里|南ことり|南小鸟|南琴梨|園田海未|园田海未|星空凛|西木野真姫|西木野真姬|小泉花陽|小泉花阳|矢澤にこ|矢泽妮可|高坂雪穂|高坂穗乃果?/ },
  // Aqours
  { group: 'Aqours', chars: /高海千歌|桜内梨子|松浦果南|黒澤ダイヤ|黑泽黛雅|渡辺曜|渡边曜|津島善子|津岛善子|国木田花丸|小原鞠莉|黒澤ルビィ|黑泽露比|高海千歌|テニア|渡辺曜?/ },
  // 虹咲
  { group: '虹咲学园学园偶像同好会', chars: /上原歩夢|上原步梦|中須かなみ|中须霞|桜坂雫|朝香果林|宮下愛|宫下爱|近江彼方|優木せつ菜|优木雪菜|エマ・ヴェールド|艾玛·维尔德|天王寺璃奈|三船栞子|ミア・テイラー|米娅·泰勒|鐘嵐珠|钟岚珠|高咲侑/ },
  // Liella!
  { group: 'Liella!', chars: /澁谷かのん|涩谷香音|唐可可|嵐千砂都|岚千砂都|平安名すみれ|平安名堇|葉月恋|叶月恋|桜小路きな子|樱小路希奈子|若菜四季|米女メイ|米女芽衣|藪島朱音|薮岛朱音|鬼塚夏美|ウィーン・マーガレット|百田凛|鬼塚冬毬|鬼塚冬毬?/ },
  // 莲之空
  { group: '莲之空女学院学园偶像俱乐部', chars: /日野下花帆|安養寺姫芽|安养寺姬芽|狮子神利架|百生吟子|夕霧綴理|夕雾缀理|大澤瑠璃乃|大泽瑠璃乃|藤島慈|藤岛慈|村野さやか|村野沙耶香|出雲咲姫|出云咲姬|花岡夢羽|花冈梦羽|伊戸井十重|伊户井十重|安積永夢|安积永梦|東悠|东悠|村浦かずさ|若柳セリオ|大賀美沙知|桂城泉/ },
  // Sunny Passion
  { group: 'Sunny Passion', chars: /唐可可|韋新|維新|唐?/ },
  // 学园偶像音乐剧
  { group: '学园偶像音乐剧', chars: /学園アイドルマスター|学マス/ },

  // BanG Dream
  { group: "Poppin'Party", chars: /戸山香澄|花园たえ|花園たえ|牛込りみ|山吹沙綾|市ヶ谷有咲|市谷有咲/ },
  { group: 'Afterglow', chars: /美竹蘭|青葉モカ|上原ひまり|宇田川巴|羽沢つぐみ|美竹兰|青叶摩卡|上原绯玛丽|羽泽鸫/ },
  { group: 'Pastel＊Palettes', chars: /丸山彩|白鷺千聖|大和麻弥|若宮イヴ|若宫伊芙|氷川日菜|冰川日菜/ },
  { group: "Hello, Happy World!", chars: /弦巻こころ|松原花音|北沢はぐみ|北泽育美|瀬田田薫|濑田薰|ミッシェル|米歇尔/ },
  { group: 'Roselia', chars: /湊友希那|冰川紗夜|白金燐子|宇田川あこ|宇田川亚子|今井リサ|今井莉莎/ },
  { group: 'Morfonica', chars: /倉田ましろ|桐ヶ谷透子|広町七深|二葉つくし|八潮瑠唯|仓田真白|桐谷透子|广町七深|二叶筑紫/ },
  { group: 'RAISE A SUILEN', chars: /レイヤ|ROCK|佐藤益木|鳰原令王那|MASKING|PAREO|CHU²|チュチュ|琴坂蕾|益木/ },
  { group: 'MyGO!!!!!', chars: /高松灯|千早愛音|千早爱音|長崎そよ|长崎爽世|椎名立希|要楽奈|要乐奈/ },
  { group: 'Ave Mujica', chars: /三角初華|三角初华|八幡海鈴|八幡海铃|若葉睦|若叶睦|豊川祥子|丰川祥子|セーナ|せーな|千早愛音?/ },
  { group: 'CRYCHIC', chars: /豊川祥子|丰川祥子|長崎そよ|长崎爽世|若葉睦|若叶睦|椎名立希|要楽奈|要乐奈|三角初華|三角初华/ },

  // 偶像大师
  { group: '765PRO ALLSTARS', chars: /天海春香|如月千早|星井美希|萩原雪歩|高槻やよい|菊池真|水瀬伊織|四条貴音|秋月律子|三浦あずさ|双海亜美|双海真美|我那覇響|音無小鳥/ },
  { group: 'Cinderella Girls', chars: /島村卯月|涩谷凛|渋谷凛|本田未央|赤城みりあ|安部菜々|安部菜菜|双葉杏|双叶杏|三村かな子|神崎蘭子|城崎美嘉|一ノ瀬志希|渋谷凛?/ },
  { group: 'Million Live!', chars: /春日未来|最上静香|伊吹翼|田中琴葉|田中琴叶|七尾百合子|佐竹美奈子|望月杏奈|高坂海美|エミリー| Stella| Julia|ジュリア|北上麗花|北上丽花|野々原茜|野野原茜|箱崎星梨花|望月杏奈?/ },
  { group: 'Shiny Colors', chars: /櫻木真乃|風野灯織|八宮めぐる|月岡恋鐘|田中摩美々|白瀬咲耶|三峰結華|幽谷霧子|小宮果穂|園田智代子|西城樹里|有馬つばき|黛冬優子|芹沢あさひ|芹泽朝日|和泉瑞希| trump/ },
  { group: 'SideM', chars: /天道輝|天道辉|若里春名|鷹城恭二|ピエール|神谷幸広|東雲荘一郎|阿斯蘭|アスラン|大河タケル|大河武|冬美旬|榊夏来|橘志狼|舞田類/ },
  { group: '学园偶像大师', chars: /花海咲季|月村手毬|月村手毬|藤田ことね|有馬つばき|有马つばき|紫雲清夏|園田智代子|茱莉亚|ジェン|ルカ/ },

  // 赛马娘
  { group: 'トレセン学園', chars: /スペシャルウィーク|サイレンススズカ|トウカイテイオー|シンボリルドルフ|ゴールドシップ|メジロマックイーン|オグリキャップ|タマモクロス|ライスシャワー|スーパークリーク|ウイニングチケット|ナリタブライアン|ビワハヤヒデ|マヤノトップガン|マチカネタンホイザ|マチカネフクキタル|メジロライアン|メジロドーベル|ミホノブルボン|ハルウララ|アグネスデジタル|セイウンスカイ|エアシャカール|サトノダイヤモンド|キタサンブラック|サクラチヨノオー|ツルマルツヨシ|ナイスネイチャ|シンコウウインディ|ゴールドシップ?/ },

  // 少女歌剧
  { group: '九九组', chars: /愛城華恋|爱城华恋|露崎まひる|露崎真昼|神楽ひかり|神乐光|レヴュースタァライト|天堂真矢|星見純那|星见纯那|露崎まひる|大場なな|大场奈奈|西條クロディーヌ|西条克洛迪娜|石動双葉|石动双叶|花香ゆの|花香结乃|実は|劇場|レヴュー|スタァライト|スタァライト九九組/ },
];

// 名字→团体硬知识(覆盖角色列表不完整的情况)
const NAME_OVERRIDE: Record<string, string[]> = {
  // μ's
  '新田惠海': ["μ's"],
  '南条爱乃': ["μ's"],
  '内田彩': ["μ's"],
  '三森铃子': ["μ's"],
  '饭田里穗': ["μ's"],
  '久保田未梦': ["μ's"],
  '楠田亚衣奈': ["μ's"],
  // Aqours
  '伊波杏树': ['Aqours'],
  // 楠木灯 = 优木雪菜初代(虹咲)
  '楠木灯': ['虹咲学园学园偶像同好会'],
  // BanG Dream 核心成员(代表角色列表可能没有邦邦角色)
  '爱美': ["Poppin'Party"],
  '大冢纱英': ["Poppin'Party"],
  '西本里美': ["Poppin'Party"],
  '大桥彩香': ["Poppin'Party"],
  '伊藤彩沙': ["Poppin'Party"],
  '三泽纱千香': ['Afterglow'],
  '佐仓绫音': ['Afterglow'],
  '金元寿子': ['Afterglow'],
  '小原好美': ['Afterglow'],
  '前岛亚美': ['Pastel＊Palettes'],
  '小泽亚李': ['Pastel＊Palettes'],
  '上坂堇': ['Pastel＊Palettes'],
  '中岛由贵': ['Roselia', 'Pastel＊Palettes'],
  '仓知玲凤': ['Pastel＊Palettes'],
  '相羽亚衣奈': ['Roselia'],
  '相羽爱奈': ['Roselia'],
  '工藤晴香': ['Roselia'],
  '志崎桦音': ['Roselia'],
  '樱川惠': ['Roselia'],
  '伊藤美来': ["Hello, Happy World!"],
  '丰田萌绘': ["Hello, Happy World!"],
  '村上奈津实': ["Hello, Happy World!"],
  '吉田有里': ["Hello, Happy World!"],
  '深川芹亚': ["Hello, Happy World!"],
  '进藤天音': ['Morfonica'],
  '西尾夕香': ['Morfonica'],
  '直田姬奈': ['Morfonica'],
  '米泽圆': ['Morfonica'],
  'Raychell': ['RAISE A SUILEN'],
  '夏芽莉子': ['RAISE A SUILEN'],
  '铃木实里': ['RAISE A SUILEN'],
  '根本京里': ['RAISE A SUILEN'],
  '羊宫妃那': ['MyGO!!!!!'],
  '立石凛': ['MyGO!!!!!'],
  '立石凜': ['MyGO!!!!!'],
  '小日向美香': ['MyGO!!!!!', 'Ave Mujica'],
  '林鼓子': ['MyGO!!!!!'],
  '佐佐木李子': ['Ave Mujica'],
  '冈田梦以': ['Ave Mujica'],
  '渡濑结月': ['Ave Mujica'],
  '高尾奏音': ['Ave Mujica'],
  '青木阳菜': ['MyGO!!!!!', 'Ave Mujica'],
  '八卷安奈': ['Ave Mujica'],
};

function main() {
  // 先处理 NAME_OVERRIDE(不受 groups 为空过滤,直接按名字查)
  const updateStmt = db.prepare('UPDATE seiyuus SET groups = ? WHERE id = ?');
  let cleaned = 0;
  const cleanedNames: string[] = [];

  // 查所有声优(不管 groups 是否为空)
  const allRows = db.prepare(`SELECT id, name, groups, representative_characters FROM seiyuus`).all() as any[];
  console.log(`共 ${allRows.length} 条记录`);

  // 第一遍:NAME_OVERRIDE 硬覆盖
  for (const row of allRows) {
    if (!NAME_OVERRIDE[row.name]) continue;
    const override = NAME_OVERRIDE[row.name];
    const groups: string[] = JSON.parse(row.groups || '[]');
    // 保留非五大企划的团,用 override 覆盖五大企划的团
    const nonFive = groups.filter((g) => !GROUP_CHAR_NAMES.some((r) => r.group === g));
    const newGroups = [...new Set([...override, ...nonFive])];
    if (JSON.stringify(newGroups.sort()) !== JSON.stringify(groups.sort())) {
      updateStmt.run(JSON.stringify(newGroups), row.id);
      cleaned++;
      cleanedNames.push(`${row.name}: ${JSON.stringify(groups)} → ${JSON.stringify(newGroups)}`);
    }
  }

  // 第二遍:角色名验证(只处理有 groups 且不在 NAME_OVERRIDE 里的)
  const rows = db.prepare(`SELECT id, name, groups, representative_characters FROM seiyuus WHERE groups IS NOT NULL AND groups != '[]' AND groups != ''`).all() as any[];
  for (const row of rows) {
    if (NAME_OVERRIDE[row.name]) continue; // 已处理
    const groups: string[] = JSON.parse(row.groups || '[]');
    if (!groups.length) continue;
    const repChars: { work: string; character: string }[] = JSON.parse(row.representative_characters || '[]');
    const charBlob = repChars.map((r) => r.character).join(' ');

    const validated: string[] = [];
    const removed: string[] = [];
    for (const g of groups) {
      const rule = GROUP_CHAR_NAMES.find((r) => r.group === g);
      if (!rule) { validated.push(g); continue; }
      if (rule.chars.test(charBlob)) { validated.push(g); }
      else { removed.push(g); }
    }
    if (removed.length) {
      updateStmt.run(JSON.stringify(validated), row.id);
      cleaned++;
      cleanedNames.push(`${row.name}: 删除 ${JSON.stringify(removed)} → ${JSON.stringify(validated)}`);
    }
  }

  console.log(`\n共清理 ${cleaned} 人:`);
  for (const n of cleanedNames) console.log(`  ${n}`);

  // 验证伊波杏树
  const check = db.prepare(`SELECT name, groups FROM seiyuus WHERE name = '伊波杏树'`).get() as any;
  if (check) console.log(`\n伊波杏树: ${check.groups}`);

  // 最终统计
  console.log('\n=== LoveLive 子团体分布(清理后) ===');
  const llRows = db.prepare(`SELECT name, groups FROM seiyuus WHERE five_groups LIKE '%LoveLive%'`).all() as any[];
  const cnt: Record<string, number> = {};
  let empty = 0;
  for (const r of llRows) {
    const gs: string[] = JSON.parse(r.groups || '[]');
    if (!gs.length) { empty++; continue; }
    for (const g of gs) cnt[g] = (cnt[g] || 0) + 1;
  }
  for (const [g, c] of Object.entries(cnt).sort((a, b) => b[1] - a[1])) console.log(`  ${g}: ${c}`);
  console.log(`  (无子团体): ${empty}`);

  db.close();
  console.log('\n完成!');
}
main();
