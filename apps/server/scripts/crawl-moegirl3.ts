/**
 * 萌娘百科女声优爬虫 v3 (核心思路: 作品配音演员页 → 抓日文声优列 → 爬详情页)
 * ------------------------------------------------------------
 * 五大企划保证不漏:
 *   - 优先尝试 作品/配音 或 作品/声优 页抓取
 *   - 探测失败则直接硬编码声优名单 (LL/BanG Dream/偶像大师/赛马娘/少女歌剧)
 *
 * 运行:
 *   pnpm tsx scripts/crawl-moegirl.ts --limit 40 --out tmp.json
 *   pnpm tsx scripts/crawl-moegirl.ts --in tmp.json --import   # 不爬, 仅导入已有 JSON
 *   pnpm tsx scripts/crawl-moegirl.ts --import                  # 抓取 + 导入
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';
import * as path from 'node:path';
import * as url from 'node:url';

const __filename = url.fileURLToPath(new URL('.', 'file://localhost/' + process.cwd().replace(/\\/g, '/')).href);
// 实际上 import.meta.url 更直接, 但 tsc target 不允许, 我们用 process.cwd() + 相对路径
const __dirname = path.resolve(process.cwd(), 'scripts');

// =============================================================
//  CLI
// =============================================================
const argv = process.argv.slice(2);
const LIMIT = Number((argv.find((a) => a.startsWith('--limit=')) || '=0').split('=')[1]) || 0;
const ONLY_FIVE = argv.includes('--only-five');
const IN_FILE = (argv.find((a) => a.startsWith('--in=')) || '').split('=')[1] || '';
const OUT_FILE = (argv.find((a) => a.startsWith('--out=')) || '').split('=')[1] || '';
const DO_IMPORT = argv.includes('--import');
const SKIP_WORK_PAGES = argv.includes('--skip-work'); // 直接跳过作品页探测(走硬编码)

// =============================================================
//  五大企划定义 & 硬编码声优名单 (保证不漏)
// =============================================================
type GroupDef = {
  groupName: string;
  priority: number;
  /** 命中关键词 (在声优详情页 infobox + 出演作品 + 团体里匹配到即算) */
  keyWorks: RegExp[];
  /** 作品配音演员页候选, 按顺序试, 200 就用 */
  workPageCandidates: { title: string; paths: string[] }[];
  /** 硬编码保底名单 (name 可能带 萌娘百科标题后缀如 "(声优)", 脚本里会自动尝试别名) */
  hardcoded: Array<{ name: string; alsoTry?: string[] }>;
};

// ---------- LoveLive! ----------
const LL: GroupDef = {
  groupName: 'LoveLive!',
  priority: 1,
  keyWorks: [
    /Love\s*Live\!?/i, /ラブライブ!/, /μ's|缪斯/, /Aqours/, /Liella!/i,
    /虹咲|虹学会/, /莲之空/, /Superstar!!/i, /School\s*idol/i, /学园偶像/,
    /高咲侑|优木雪菜|上原步梦|宫下爱|岚千砂都|涩谷香音|唐可可|叶月恋/,
  ],
  workPageCandidates: [
    { title: 'LoveLive! 动画', paths: ['/LoveLive!/声优', '/LoveLive!/配音', '/LoveLive!/配音演员'] },
    { title: 'LoveLive! Sunshine!!', paths: ['/LoveLive! Sunshine!!/配音', '/LoveLive! Sunshine!!/声优', '/LoveLive!_Sunshine!!/配音'] },
    { title: '虹咲学园学园偶像同好会', paths: ['/虹咲学园学园偶像同好会/配音演员', '/虹咲学园学园偶像同好会/配音', '/LoveLive!虹咲学园学园偶像同好会/配音演员'] },
    { title: 'LoveLive! SuperStar!!', paths: ['/LoveLive! Superstar!!/配音演员', '/LoveLive! Superstar!!/配音', '/LoveLive!_Superstar!!/配音演员'] },
    { title: '莲之空女学院', paths: ['/莲之空女学院学园偶像俱乐部/配音演员', '/莲之空女学院学园偶像俱乐部/配音'] },
  ],
  hardcoded: [
    // μ's
    { name: '新田惠海' }, { name: '南条爱乃' }, { name: '内田彩' },
    { name: '三森铃子' }, { name: '饭田里穗' }, { name: '楠田亚衣奈' },
    { name: '德井青空' }, { name: 'pile', alsoTry: ['Pile', '堀绘梨子'] }, { name: '久保由利香' },
    // Aqours
    { name: '伊波杏树' }, { name: '逢田梨香子' }, { name: '诹访奈奈香' },
    { name: '小宫有纱' }, { name: '齐藤朱夏' }, { name: '小林爱香' },
    { name: '高槻加奈子' }, { name: '铃木爱奈' }, { name: '降幡爱' },
    // 虹咲
    { name: '大西亚玖璃' }, { name: '相良茉优' }, { name: '前田佳织里' },
    { name: '久保田未梦' }, { name: '鬼头明里' }, { name: '楠木灯', alsoTry: ['楠木ともり'] },
    { name: '小泉萌香' }, { name: '指出毬亚' }, { name: '田中千惠美' },
    { name: '村上奈津实' }, { name: '佐藤日向' }, { name: '林鼓子' },
    { name: '森奈奈子' },
    // Liella!
    { name: '伊达小百合' }, { name: 'Liyuu' }, { name: '岬奈子' },
    { name: 'Payton尚未', alsoTry: ['payton尚未', 'ペイトン尚未'] }, { name: '青山渚' },
    { name: '铃木Ann', alsoTry: ['鈴木アン', '铃木杏'] }, { name: '夕实', alsoTry: ['ユーミ', '夕実'] },
    { name: '若菜四季' }, { name: '大熊和奏' }, { name: '泷泽·karen·亚须希', alsoTry: ['瀧澤・カレン・亜須希', '泷泽卡莲亚须希'] },
    { name: '夏吉优子' },
    // 莲之空
    { name: '林美澪', alsoTry: ['林美澪(声优)'] }, { name: '花宫初奈' },
    { name: '椿野ゆうこ', alsoTry: ['椿野优子'] }, { name: '日野森雫', alsoTry: ['日野森志歩'] },
    { name: '佐佐木琴子' }, { name: '莲田宁音' }, { name: '月音粉', alsoTry: ['月音こな'] },
    { name: '大段林佑子', alsoTry: ['大段林侑子'] }, { name: '新井彩永' },
    { name: '松永步乃罗', alsoTry: ['松永歩乃羅'] }, { name: '叶山风花' },
  ],
};

// ---------- BanG Dream! ----------
const BGD: GroupDef = {
  groupName: 'BanG Dream!（邦邦）',
  priority: 2,
  keyWorks: [
    /BanG\s*Dream!?/i, /邦邦/, /Poppin'Party|Roselia|RAISE\s*A\s*SUILEN|Morfonica|MyGO|Ave\s*Mujica|Afterglow|Pastel\*Palettes|Hello,\s*Happy\s*World!/i,
    /少女乐团/,
    /户山香澄|花园多英|牛込里美|山吹沙绫|市谷有咲/,
    /凑友希那|冰川纱夜|今井莉莎|宇田川亚子|白金燐子/,
    /美竹兰|青叶摩卡|上原绯玛丽|宇田川巴|羽泽鸫/,
    /丸山彩|冰川日菜|白鹭千圣|松原花音|大冢千圣/,
    /弦卷心|北泽育美|松原花音|濑田薰|米歇尔|奥泽美咲/,
    /仓田真白|桐谷透子|广町七深|二叶筑紫|八潮瑠唯|Morfonica/,
    /和奏瑞依|佐藤益木|小日向美香|要乐奈|千早爱音|高松灯|椎名立希|MyGO|Ave Mujica|三角初华|若叶睦|八幡海铃|丰川祥子|长崎爽世|松平凛| Mortis /i,
  ],
  workPageCandidates: [
    { title: 'BanG Dream! 邦邦', paths: ['/BanG Dream!/配音演员', '/BanG Dream!/配音', '/BanG_Dream!/配音演员', '/BanG_Dream!/声优'] },
    { title: "BanG Dream! It's MyGO!!!!!", paths: ["/BanG Dream! It's MyGO!!!!!/配音演员", "/BanG_Dream!_It's_MyGO!!!!!/配音演员"] },
    { title: 'BanG Dream! Ave Mujica', paths: ['/BanG Dream! Ave Mujica/配音演员', '/BanG_Dream!_Ave_Mujica/配音演员'] },
  ],
  hardcoded: [
    // Poppin'Party
    { name: '爱美', alsoTry: ['愛美'] }, { name: '大冢纱英', alsoTry: ['大塚紗英'] }, { name: '西本里美' },
    { name: '大桥彩香' }, { name: '伊藤彩沙' },
    // Roselia
    { name: '相羽爱奈', alsoTry: ['相羽あいな'] }, { name: '工藤晴香' }, { name: '中岛由贵' },
    { name: '樱川惠' }, { name: '志崎桦音', alsoTry: ['志崎樺音'] },
    // Afterglow
    { name: '佐仓绫音' }, { name: '三泽纱千香' }, { name: '金元寿子' },
    { name: '日笠阳子' }, { name: '春濑夏美' },
    // Pastel*Palettes
    { name: '前岛亚美' }, { name: '小仓唯' }, { name: '上坂堇' },
    { name: '中上育实' }, { name: '秦佐和子' },
    // Hello, Happy World!
    { name: '伊藤美来' }, { name: '丰田萌绘' }, { name: '黑泽朋世' },
    { name: '日高里菜' }, { name: '本多真梨子' },
    // Morfonica
    { name: '进藤天音' }, { name: '直田姬奈' }, { name: '西尾夕香' },
    { name: 'mika', alsoTry: ['Mika', '三谷美佳'] }, { name: 'Ayasa', alsoTry: ['ayasa'] },
    // RAISE A SUILEN
    { name: 'Raychell' }, { name: '小原莉子' }, { name: '夏芽' },
    { name: '仓知玲凤' }, { name: '纺木吏佐' },
    // MyGO!!!!!
    { name: '高松灯', alsoTry: ['高松燈'] }, { name: '千早爱音', alsoTry: ['千早愛音'] },
    { name: '要乐奈', alsoTry: ['要楽奈'] }, { name: '长崎爽世', alsoTry: ['長崎爽世'] },
    { name: '椎名立希', alsoTry: ['椎名立希'] },
    // Ave Mujica
    { name: '丰川祥子', alsoTry: ['豊川祥子'] }, { name: '八幡海铃' },
    { name: '三角初华', alsoTry: ['三角初華'] }, { name: '若叶睦', alsoTry: ['若葉睦'] },
    { name: '松平凛' }, { name: '广町七深' },
  ],
};

// ---------- 偶像大师系列 ----------
const IMAS: GroupDef = {
  groupName: '偶像大师系列',
  priority: 3,
  keyWorks: [
    /偶像大师/i, /THE\s*IDOLM@STER/i, /Idolmaster/i, /765PRO|346PRO|283PRO|315PRO|876PRO|961PRO/i,
    /灰姑娘女孩|Cinderella\s*Girls/i, /百万现场|Million\s*Live!/i,
    /闪耀色彩|Shiny\s*Colors/i, /SideM/,
    /天海春香|如月千早|星井美希|荻原雪步|高槻弥生|秋月律子|三浦梓|水濑伊织|菊地真|双海亚美|双海真美|四条贵音|我那霸响|音无小鸟/,
    /岛村卯月|涩谷凛|本田未央|神崎兰子|前川未来|小日向美穗|佐久间麻由|星辉子|白坂小梅|安娜斯塔西娅|新田美波|高垣枫|多田李衣菜|盐见周子|宫本芙蕾德莉卡|森久保乃乃|五十岚响子|松本沙理奈|梦见璃亚梦|久川凪|久川飒|桐生司|乙仓悠贵/,
    /春日未来|最上静香|伊吹翼|田中琴叶|真壁瑞希|北上丽花|野野原茜|木下日向|佐竹美奈子|高坂海美|篠宫可怜|矢吹可奈|永吉昴|夏木香苗|舞滨步|宫尾美也|白石紬|青羽美波|北上·藤吉|四条贵音|大神环|稻原英里子|七尾百合子|高山纱代子|松田亚利沙|岛原埃琳娜|丰川风花|绪方智绘里|天空桥朋花|如月千早|周防桃子|野村奈绪|萩原雪步|真壁瑞希|望月圣|诗花|酒寄枫|真崎爱美|中谷育|艾米莉·斯图亚特|瑞凤|水泽彩佳|茉莉|横山奈绪|稻叶瑞希|佐伯丽子|玲音|奈央|亚夜|真那|木下日向|飞鸟|莉绪|遥|伊吹翼|春日未来|最上静香|田中琴叶|真壁瑞希|北上丽花|野野原茜|篠宫可怜|佐竹美奈子|高坂海美|矢吹可奈|永吉昴|白石紬|夏木香苗|舞滨步|宫尾美也|青羽美波|北上·藤吉|大神环|稻原英里子|七尾百合子|高山纱代子|松田亚利沙|岛原埃琳娜|丰川风花|绪方智绘里|天空桥朋花|周防桃子|野村奈绪|萩原雪步|望月圣|诗花|酒寄枫|真崎爱美|中谷育|艾米莉·斯图亚特|瑞凤|水泽彩佳|茉莉|横山奈绪|稻叶瑞希|佐伯丽子|玲音|奈央|亚夜|真那|飞鸟|莉绪|遥/,
    /白濑咲耶|黛冬优子|和久井留美|八宫惠留|幽谷雾子|一之濑志希|酸素好子|月冈恋钟|田中摩美美|真白透子|樋口圆香|杜野凛世|有栖川夏叶|晴真|漫才咖哩|黛冬优子|美琴|和泉爱依|西村惠理|小宫果穂|风野灯织|八宫惠留|森茧|咲耶|幽谷雾子|莉嘉|和久井留美|白石䌷|艾莉莎|智绘里|佐久间|美智|麻里|菜绪|铃音|美奈子|美晴|朱里|纱里奈|沙织|千鹤|美帆|朋花|雪步|志保|理绪|莉绪|杏奈|亚弥|真美|亚美|梓|响|弥生|伊织|真|千早|春香|律子|贵音|小鸟/,
  ],
  workPageCandidates: [
    { title: '偶像大师 (本家)', paths: ['/偶像大师/配音演员', '/偶像大师/声优', '/偶像大师_(游戏)/配音演员'] },
    { title: '偶像大师 灰姑娘女孩', paths: ['/偶像大师 灰姑娘女孩/配音', '/偶像大师 灰姑娘女孩/配音演员', '/偶像大师_灰姑娘女孩/配音'] },
    { title: '偶像大师 闪耀色彩', paths: ['/偶像大师 闪耀色彩/配音演员', '/偶像大师 闪耀色彩/配音', '/偶像大师_闪耀色彩/配音演员'] },
    { title: '偶像大师 百万现场', paths: ['/偶像大师 百万现场!/配音演员', '/偶像大师 百万现场/配音'] },
  ],
  hardcoded: [
    // 765 本家 (13 人 + 音无小鸟)
    { name: '中村绘里子' }, { name: '长谷川明子' }, { name: '浅川悠' },
    { name: '今井麻美' }, { name: '高桥智秋' }, { name: '下田麻美' },
    { name: '平田宏美' }, { name: '钉宫理惠' }, { name: '喜多村英梨' },
    { name: '沼仓爱美' }, { name: '仁后真耶子' }, { name: '原纱友里' },
    { name: '浅仓杏美' }, { name: '滝田树里' },
    // 灰姑娘女孩 (主要 cast, 不全 190+, 挑主要的)
    { name: '大桥彩香' }, { name: '福原绫香' }, { name: '原优子' },
    { name: '松嵜丽' }, { name: '牧野由依' }, { name: '洲崎绫' },
    { name: '三宅麻理惠' }, { name: '佐藤利奈' }, { name: '内田真礼' },
    { name: '饭田友子' }, { name: '野村香菜子' }, { name: '安部菜菜美', alsoTry: ['安部菜々美'] },
    { name: '东山奈央' }, { name: '佳村遥' }, { name: '五十岚裕美' },
    { name: '松井惠理子' }, { name: '田中爱美' }, { name: '河濑茉希' },
    { name: '白石晴香' }, { name: '日高里菜' }, { name: '金子真由美' },
    { name: '三泽纱千香' }, { name: '荒川美穗' }, { name: '森嶋优花' },
    { name: '杜野真子' }, { name: '久野美咲' }, { name: '和多田美咲' },
    { name: '嘉山未纱' }, { name: '新田日和' },
    // 百万现场
    { name: '山崎遥' }, { name: '田所梓' }, { name: 'Machico', alsoTry: ['machico'] },
    { name: '香里有佐', alsoTry: ['香里有佐'] }, { name: '藤井雪代' },
    { name: '中村温姬' }, { name: '诹访彩花' }, { name: '渡部优衣' },
    { name: '水濑祈' }, { name: '赤崎千夏' }, { name: '南条光' },
    { name: '伊藤美来' }, { name: '幸村惠理' }, { name: '角元明日香' },
    { name: '白石凉子' }, { name: '松田飒水' }, { name: '菊池纱矢香' },
    { name: '高桥未奈美' }, { name: '长妻树里' },
    // 闪耀色彩
    { name: '菅沼千纱' }, { name: '河合明日菜', alsoTry: ['河合ひかる'] }, { name: '峰田茉优' },
    { name: '凉本秋穗' }, { name: '广濑世华' }, { name: '前川凉子' },
    { name: '近藤玲奈' }, { name: '礒部花凛' }, { name: '结名美月' },
    { name: '田中贵子' }, { name: '高柳知叶' }, { name: '日高范子' },
    { name: '川口莉奈' }, { name: '天野聪美' }, { name: '纺木吏佐' },
    { name: '林鼓子' }, { name: '羊宫妃那' }, { name: '白石晴香' },
    { name: '星谷美绪' }, { name: '花井美春' },
  ],
};

// ---------- 赛马娘 ----------
const UMA: GroupDef = {
  groupName: '赛马娘 Pretty Derby',
  priority: 4,
  keyWorks: [
    /ウマ娘|赛马娘|賽馬娘|Pretty\s*Derby/i,
    /特别周|无声铃鹿|东海帝王|黄金船|目白麦昆|目白多伯|草上飞|丸善斯基|伏特加|大和赤骥|樱花千代王|樱花进王|星云天空|美浦波旁|里见光钻|曼城茶座|空中神宫|中山庆典|第一红宝石|大拓太阳神|北部玄驹|真机伶|胜利奖券|米浴|千明代表|目白赖恩|雪之美人|荣进闪耀|超级小海湾|莱茵力量|春丽|小栗帽|鲁道夫象征|气槽|皇帝|神鹰|大树快车|好歌剧|黄金巨匠|无声铃鹿|东海帝王|星(无?)/i,
  ],
  workPageCandidates: [
    { title: '赛马娘 Pretty Derby', paths: ['/赛马娘 Pretty Derby/配音演员', '/赛马娘 Pretty Derby/声优', '/赛马娘_Pretty_Derby/配音演员', '/赛马娘/配音演员'] },
  ],
  hardcoded: [
    { name: '和气杏未', alsoTry: ['和氣あず未'] }, { name: '高野麻里佳' },
    { name: 'Machico' }, { name: '大桥彩香' }, { name: '木村千咲' },
    { name: '田所梓' }, { name: '高桥未奈美' }, { name: '大坪由佳' },
    { name: '大桥步夕' }, { name: '松井惠理子' }, { name: '三宅麻理惠' },
    { name: '内田真礼' }, { name: '上坂堇' }, { name: '洲崎绫' },
    { name: '五十岚裕美' }, { name: '大西沙织' }, { name: '高桥李依' },
    { name: '水濑祈' }, { name: '村川梨衣' }, { name: '相坂优歌' },
    { name: '竹达彩奈' }, { name: '悠木碧' }, { name: '德井青空' },
    { name: '日高里菜' }, { name: '丰口惠美' }, { name: '钉宫理惠' },
    { name: '小仓唯' }, { name: '石原夏织' }, { name: 'M·A·O', alsoTry: ['M.A.O', '市道真央'] },
    { name: '巽悠衣子' }, { name: '前田玲奈' }, { name: '大地叶' },
    { name: '立花芽惠梦', alsoTry: ['立花 芽恵夢'] }, { name: '野口瑠璃子' },
    { name: '杉浦诗织' }, { name: '矢野妃菜喜' }, { name: '羊宫妃那' },
    { name: '薮岛猫子' }, { name: '佐藤日向' }, { name: '久井优' },
    { name: '铃代纱弓' }, { name: '会泽纱弥' }, { name: '夏吉优子' },
  ],
};

// ---------- 少女歌剧 Revue Starlight ----------
const RSL: GroupDef = {
  groupName: '少女歌剧 Revue Starlight',
  priority: 5,
  keyWorks: [
    /少女歌剧|Revue\s*Starlight|スタァライト|レヴュースタァライト/i,
    /爱城华恋|神乐光|天堂真矢|星见纯那|露崎真昼|大场奈奈|西条克洛迪娜|石动双叶|花柳香子|八卷朔也|秋风塁|凤美帆|野野村菫|雪代晶|梦大路文|穗波冰结|南风梦|一本木枫|双叶风莉|美空翼|雨森小夜|美鹰美音/i,
    /Starlight九九组|长颈鹿/,
  ],
  workPageCandidates: [
    { title: '少女歌剧 Revue Starlight', paths: ['/少女歌剧 Revue Starlight/配音演员', '/少女歌剧 Revue Starlight/配音', '/少女歌剧_Revue_Starlight/配音演员', '/少女歌剧/配音演员'] },
    { title: '少女歌剧 ReLIVE', paths: ['/少女歌剧 Revue Starlight -Re LIVE-/配音演员', '/少女歌剧_Revue_Starlight_-Re_LIVE-/配音演员'] },
  ],
  hardcoded: [
    // 九九组 (主要)
    { name: '小山百代' }, { name: '三森铃子' }, { name: '富田麻帆' },
    { name: '佐藤日向' }, { name: '岩田阳葵' }, { name: '小泉萌香' },
    { name: '相羽爱奈' }, { name: '工藤晴香' }, { name: '尾崎由香' },
    // 凛明馆 (Revue Starlight -Re LIVE-)
    { name: '梦大路文', alsoTry: ['夢大路文'] }, { name: '八卷朔也' },
    { name: '秋风塁' }, { name: '凤美帆', alsoTry: ['鳳美帆'] },
    { name: '野野村菫' },
    // 英兰学院
    { name: '雪代晶' }, { name: '穗波冰结' }, { name: '南风梦' },
    // 栄冠
    { name: '一本木枫' }, { name: '双叶风莉', alsoTry: ['双葉風莉'] },
    // 其他
    { name: '美空翼' }, { name: '雨森小夜' }, { name: '美鹰美音' },
  ],
};

const FIVE_GROUPS: GroupDef[] = [LL, BGD, IMAS, UMA, RSL];

// ---------- 其他作品 (声优密度高, 用于扩充) ----------
const EXTRA_WORK_PAGES: Array<{ title: string; paths: string[] }> = [
  { title: '崩坏3', paths: ['/崩坏3/配音'] },
  { title: '崩坏：星穹铁道', paths: ['/崩坏：星穹铁道/配音'] },
  { title: '蔚蓝档案', paths: ['/蔚蓝档案/配音'] },
  { title: '明日方舟', paths: ['/明日方舟/声优'] },
  { title: '碧蓝航线', paths: ['/碧蓝航线/声优', '/碧蓝航线/配音演员'] },
  { title: '魔法少女小圆', paths: ['/魔法少女小圆/配音演员', '/魔法少女小圆/声优'] },
  { title: '鬼灭之刃', paths: ['/鬼灭之刃/配音演员'] },
  { title: '咒术回战', paths: ['/咒术回战/配音演员'] },
  { title: '进击的巨人', paths: ['/进击的巨人/配音演员'] },
  { title: '光之美少女系列', paths: ['/光之美少女系列/配音演员'] },
  { title: '偶像活动！', paths: ['/偶像活动！/配音演员'] },
  { title: '少女前线', paths: ['/少女前线/配音演员', '/少女前线/声优'] },
  { title: '公主连结Re:Dive', paths: ['/公主连结Re:Dive/配音演员', '/公主连结Re:Dive/声优'] },
  { title: '原神', paths: ['/原神/配音', '/原神/配音演员'] },
];

// =============================================================
//  工具
// =============================================================
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36';
const REFERENCES = [
  'https://zh.moegirl.org.cn/',
  'https://zh.moegirl.org.cn/Mainpage',
  'https://zh.moegirl.org.cn/%E5%B4%A9%E5%9D%8F3',
  'https://zh.moegirl.org.cn/%E8%93%9D%E8%94%9A%E6%A1%A3%E6%A1%88',
];
let reqCount = 0;

async function mgFetch(raw: string, opts?: { retry5?: boolean }): Promise<{ status: number; url: string; html: string }> {
  const url = raw.startsWith('http') ? raw : 'https://zh.moegirl.org.cn' + raw;
  const maxTry = opts?.retry5 ? 4 : 2;
  reqCount += 1;
  for (let attempt = 1; attempt <= maxTry; attempt += 1) {
    const controller = new AbortController();
    const to = setTimeout(() => controller.abort(), 9000);
    try {
      const r = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': UA,
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.6',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          Referer: REFERENCES[(reqCount + attempt) % REFERENCES.length],
          'sec-ch-ua': '"Not)A;Brand";v="99", "Google Chrome";v="127", "Chromium";v="127"',
          'sec-ch-ua-platform': '"Windows"',
        },
        redirect: 'follow',
      });
      clearTimeout(to);
      if (r.status === 200) {
        const html = await r.text();
        if (html.includes('萌百娘找不到这个页面')) return { status: 404, url: r.url, html };
        return { status: 200, url: r.url, html };
      }
      if (r.status === 404) return { status: 404, url: r.url, html: '' };
      if (r.status === 403 || r.status === 429 || r.status === 502 || r.status === 503 || r.status === 500) {
        await sleep(600 * attempt * attempt);
        continue;
      }
      return { status: r.status, url: r.url, html: '' };
    } catch (e: any) {
      clearTimeout(to);
      if (e?.name === 'AbortError') {
        await sleep(800 * attempt);
        continue;
      }
      await sleep(400 * attempt);
      continue;
    }
  }
  return { status: 0, url, html: '' };
}

function stripHtml(s: string) {
  const unescapeHtml = (t: string) =>
    t
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .replace(/&#(\d+);/g, (_m, d) => String.fromCharCode(Number(d)))
      .replace(/&#x([0-9a-fA-F]+);/g, (_m, h) => String.fromCharCode(parseInt(h, 16)))
      .replace(/&amp;/g, '&');
  let out = s;
  // 先去 script/style/sup
  out = out.replace(/<script[\s\S]*?<\/script>/gi, '');
  out = out.replace(/<style[\s\S]*?<\/style>/gi, '');
  out = out.replace(/<sup[\s\S]*?<\/sup>/gi, '');
  // 第一轮：直接 <...> 标签
  out = out.replace(/<[^>]+>/g, ' ');
  // unescape HTML entity，把 &lt;...&gt; 变真实 <...>
  out = unescapeHtml(out);
  // 第二轮：因为 unescape 可能又产生了新的标签，再去一次
  out = out.replace(/<[^>]+>/g, ' ');
  // 第三轮：如果还有属性残片 (e.g. span style="color")，直接去掉 style="..." / class="..." 片段
  out = out.replace(/\b(style|class|width|height|alt|title)=("[^"]*"|'[^']*'|[^\s>]+)/gi, ' ');
  out = out.replace(/\b\d+px\b/gi, ' ');
  // 清除 Lua 错误
  out = out.replace(/Lua错误[^\n]{0,120}/g, ' ');
  out = out.replace(/Module:[A-Za-z0-9_ /]+第\d+行/g, ' ');
  out = out.replace(/bad argument[^\n]{0,100}/g, ' ');
  out = out.replace(/table expected, got nil[^\n]{0,60}/g, ' ');
  out = out.replace(/\s+/g, ' ').trim();
  return out;
}

function cleanCellNotes(s: string) {
  let out = s;
  // 去掉括注里的 (事务所/唱片公司/声优事务所/业务提携/母公司/业务合作/声优业/歌手业/旁白业/配音演员业) 等多余标注
  out = out.replace(/\([^()]*?(事务所|唱片公司|声优事务所|业务提携|母公司|业务合作|声优业|歌手业|旁白业|配音演员业|配音业|唱片业|经纪)[^()]*?\)/g, ' ');
  // 方括号里的说明
  out = out.replace(/\[[^\[\]]*?(事务所|唱片公司|经纪|参考|来源|链接|外部)[^\[\]]*?\]/g, ' ');
  // 多余的分隔符
  out = out.replace(/\s*([、,，;；\/／])\s*\1+/g, '$1');
  out = out.replace(/^[、,，;；\/／\s]+|[、,，;／／\s]+$/g, '');
  out = out.replace(/\s+/g, ' ').trim();
  return out;
}

// =============================================================
//  声优详情页 Infobox 解析
// =============================================================
function extractInfobox(html: string): string {
  // 新版萌百 infobox 表 <table> 自身不一定带 class, 但会有 tr class="infobox-title", 或 table 内嵌 Tabs 控件且紧接着"南条爱乃"这种标题
  // 策略1: 找第一个 tr.infobox-title 所属表
  let start = -1;
  const trMatch = html.search(/<tr\b[^>]*class="[^"]*infobox-title[^"]*"/i);
  if (trMatch > 0) {
    // 向前找最近的 <table
    start = html.lastIndexOf('<table', trMatch);
  }
  if (start < 0) {
    // 策略2: 找 mw-content-text 后的第一张 包含 3+ infobox 关键字 的 table
    const root = html.indexOf('id="mw-content-text"');
    const searchFrom = root > 0 ? root : 0;
    const tableRe = /<table\b/gi;
    let tm: RegExpExecArray | null;
    tableRe.lastIndex = searchFrom;
    while ((tm = tableRe.exec(html)) !== null) {
      const idx = tm.index;
      const next = html.indexOf('</table>', idx);
      const slice = next > 0 ? html.slice(idx, Math.min(next + 9, idx + 120000)) : html.slice(idx, idx + 120000);
      const keys = ['事务所', '出身', '出生', '生日', '出道', '罗马字', '所属团体', '性别', '血型', '身高', '活动时期'];
      let hit = 0;
      for (const k of keys) if (slice.includes(k)) { hit += 1; if (hit >= 3) break; }
      if (hit >= 3 || /infobox-title/i.test(slice)) { start = idx; break; }
      if (next > 0) tableRe.lastIndex = next + 9;
    }
  }
  if (start < 0) return html.slice(0, 60000);
  const end = html.indexOf('</table>', start);
  const inf = end > 0 ? html.slice(start, end + 9) : html.slice(start, start + 120000);
  // 如果表太短, 往后再找下一张 (可能误匹配到普通 wikitable)
  if (inf.length < 400) return html.slice(0, 60000);
  return inf;
}

function parseInfoboxField(infobox: string, label: string): string | null {
  const labels: Record<string, string[]> = {
    agency: ['事务所', '所属事务所', '经纪公司', '所属', '配音事务所', '签约公司', '所属公司'],
    birth_place: ['出身地', '出身地区', '出生地区', '出身', '出生地', '籍贯'],
    birth_date: ['出生', '生日', '出生日期', '生年月日', '出生日', '出生年月日'],
    romaji: ['罗马字', '罗马音', '罗马字（罗马音）', '平文式罗马字'],
    debut_year: ['出道作', '出道年份', '出道', '出道年', '声优出道', '出道时间', '出道时期'],
    groups: ['所属团体', '所属组合', '所属乐团', '参与组合', '团体', '所属乐队', '音乐组合', '活动团体', '偶像团体', '所属单元', '参与团体'],
    blood_type: ['血型'],
    height: ['身高'],
    gender: ['性别', '性別'],
    representative_characters: ['代表角色', '代表作・代表角色', '代表角色・代表作', '代表作和代表角色', '代表角色与代表作', '代表'],
  };
  const arr = labels[label] || [label];
  const trs = infobox.match(/<tr[\s\S]*?<\/tr>/gi) || [];
  for (const tr of trs) {
    const ths = tr.match(/<th[\s\S]*?<\/th>/gi) || [];
    const tds = tr.match(/<td[\s\S]*?<\/td>/gi) || [];
    // 新版萌百 infobox 常用: <td>姓名</td><td>南条爱乃</td> (两 td, 无 th)
    // 也可能混有: <td>姓名</td><td>值1</td><td>值2</td> (多对字段)
    if (tds.length >= 2) {
      // 每两个 td 配对 (i 和 i+1)
      for (let i = 0; i < tds.length - 1; i += 1) {
        const left = stripHtml(tds[i]);
        if (left.length > 16) continue;
        // 只允许 left.includes(lab)，不要 lab.includes(left)，否则 "出生" 会被 "出生地区"(lab) 的 includes(left) 误匹配
        const hit = arr.some((lab) => left.includes(lab));
        if (!hit) continue;
        const rest = tds.slice(i + 1).join(' ');
        if (rest) return rest;
      }
    }
    if (!ths.length || !tds.length) continue;
    // 旧版 th/td 结构
    for (let i = 0; i < ths.length; i += 1) {
      const thText = stripHtml(ths[i]);
      const hit = arr.some((lab) => thText.includes(lab));
      if (!hit) continue;
      const td = tds[i] || tds[tds.length - 1];
      if (!td) continue;
      return td;
    }
    const firstTh = stripHtml(ths[0]);
    if (arr.some((lab) => firstTh.includes(lab))) {
      return tds.join(' ');
    }
  }
  // 退化: 任意 <th>文本</th>\n*<td>内容</td>
  for (const lab of arr) {
    const re = new RegExp(
      '<th[^>]*>\\s*<[^>]*>\\s*' + lab.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[\\s\\S]{0,60}?<\\/th>\\s*(<td[^>]*>[\\s\\S]{0,8000}?<\\/td>)',
      'i'
    );
    const m = infobox.match(re);
    if (m) return m[1];
  }
  // 退化: td/td 跨行 (新版 infobox)
  for (const lab of arr) {
    const re2 = new RegExp(
      '<td[^>]*>\\s*<[^>]*>\\s*' + lab.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[\\s\\S]{0,60}?<\\/td>\\s*(<td[^>]*>[\\s\\S]{0,8000}?<\\/td>)',
      'i'
    );
    const m2 = infobox.match(re2);
    if (m2) return m2[1];
  }
  return null;
}
function scrapeSeiyuuNamesFromWorkPage(html: string): { name: string; path: string; lang: string }[] {
  const out: { name: string; path: string; lang: string }[] = [];
  const seen = new Set<string>();
  // 修复: 萌娘百科有些链接是 "/黑泽朋世" (percent-encode 中文根路径), 不一定带 /wiki/ 前缀
  const LINK_RE = /<a\s+(?:[^>]*?\s+)?href="(\/(?:wiki\/)?[^":#]+?)"(?:[^>]*?\s+)?title="([^":#]+?)"\s*(?:[^>]*)>/g;
  const tables = Array.from(html.matchAll(/<table\b([^>]*)>([\s\S]*?)<\/table>/gi));
  for (const [, clsAttr, tableHtml] of tables) {
    const sample = clsAttr + ' ' + tableHtml.slice(0, 800);
    if (!/wikitable|mw[-_]?sortable|seiyuu|cast|配音|声优|声優|日文配音|日本語配音/i.test(sample)) continue;
    const rows = tableHtml.match(/<tr[\s\S]*?<\/tr>/gi) || [];
    if (rows.length < 3) continue;

    // Step 1: 用 rows[2..11] 众数确定真实列数 N
    const colCounts = rows.slice(2, Math.min(12, rows.length)).map(r => (r.match(/<t[hd]\b/g) || []).length).filter(x => x > 0);
    if (!colCounts.length) continue;
    const freq = new Map<number, number>();
    for (const c of colCounts) freq.set(c, (freq.get(c) || 0) + 1);
    let N = colCounts[0];
    { let best = -1; for (const [k, v] of freq) if (v > best) { best = v; N = k; } }
    if (N < 2) continue;

    // Step 2: 识别 row1 是否真的是子 header
    const row0 = rows[0] ? (rows[0].match(/<t[hd][\s\S]*?<\/t[hd]>/gi) || []) : [];
    const row1 = rows[1] ? (rows[1].match(/<t[hd][\s\S]*?<\/t[hd]>/gi) || []) : [];
    const row0T = row0.map(c => stripHtml(c));
    const row1T = row1.map(c => stripHtml(c));
    const anyAnchor = (cells: string[]) => cells.some(c => /<a\s/i.test(c));
    const looksHeader = (texts: string[]) => {
      const allShort = texts.every(t => t.length <= 24);
      const keywords = /(角色|配音|声优|声優|CV|Cast|日语|日本語|JP|汉语|中文|EN|英语|韩文|方言|罗马字|假名|仮名|原名|英文名|德文|法文|俄文|意大利|西班牙|地区|出演|作品|备注|演员|配音员|日文|中文名|姓名|名称)/i;
      const keys = texts.filter(t => keywords.test(t)).length;
      return allShort && keys >= Math.min(1, Math.max(1, texts.length >> 1));
    };

    let firstDataRow = 1;
    const row1IsHeader = (row1.length > 0 && !anyAnchor(row1) && looksHeader(row1T));
    type HCol = { top: string; sub: string };
    const headerCols: HCol[] = [];
    if (row1IsHeader) {
      firstDataRow = 2;
      // 把 row1 补到 N 列 (前面补空, 用 row0 对应位置的 header 作补充 top)
      const r1 = row1.slice();
      const r1T = row1T.slice();
      while (r1.length < N) { r1.unshift('<th></th>'); r1T.unshift(row0T[N - r1.length - 1] || '角色'); }
      if (r1.length > N) r1.length = N, r1T.length = N;
      if (row0.length === N) {
        for (let i = 0; i < N; i += 1) headerCols.push({ top: row0T[i] ?? '', sub: r1T[i] ?? '' });
      } else if (row0.length <= N) {
        // 用"首列 1 + 末列吃满"策略 (崩坏3式: row0=[角色,配音], N=3 → 角色占 col0, 配音占 col1+col2)
        const m = row0.length;
        if (m === 0) {
          for (const s of r1T) headerCols.push({ top: '', sub: s });
        } else {
          const sizes: number[] = new Array(m).fill(1);
          // 多余的列给最后一个 header
          const remain = N - m;
          sizes[m - 1] += remain;
          let p = 0;
          for (let i = 0; i < m; i += 1) {
            for (let k = 0; k < sizes[i]; k += 1) {
              headerCols.push({ top: row0T[i] ?? '', sub: r1T[p] ?? '' });
              p += 1;
            }
          }
          while (headerCols.length < N) headerCols.push({ top: '', sub: r1T[headerCols.length] ?? '' });
          headerCols.length = N;
        }
      }
    } else {
      firstDataRow = 1;
      if (row0.length >= N) {
        for (let i = 0; i < N; i += 1) headerCols.push({ top: stripHtml(row0[i]), sub: '' });
      } else {
        for (const c of row0) headerCols.push({ top: stripHtml(c), sub: '' });
        while (headerCols.length < N) headerCols.push({ top: '', sub: '' });
      }
    }

    // Step 3: 选择声优列
    const LANG_SUB_RE = /(日语|日本語|日文|JP|日本語配音|日本語音声)/i;
    const LANG_NAME_RE = /(日文名|日语原文|仮名|假名|かな|カナ|罗马字|罗马音|英文名|韩文名|俄文名|德文名|法文名|西班牙文名|方言|意大利文名|原文)/i;
    const CAST_RE = /(声优|配音演员|配音|CV|Cast|声優|出演|日本配音|配音员|演员)/i;
    const ROLE_RE = /(角色名|角色|人物|登场人物|人物名)/i;
    let pickIdx = -1;
    const headerText = (i: number) => ((headerCols[i]?.top ?? '') + ' ' + (headerCols[i]?.sub ?? '')).trim();
    pickIdx = headerCols.findIndex((_h, i) => CAST_RE.test(headerText(i)) && LANG_SUB_RE.test(headerText(i)));
    if (pickIdx === -1) pickIdx = headerCols.findIndex((_h, i) => CAST_RE.test(headerText(i)) && !ROLE_RE.test(headerText(i)) && !(LANG_NAME_RE.test(headerText(i))));
    if (pickIdx === -1) pickIdx = headerCols.findIndex((_h, i) => LANG_SUB_RE.test(headerText(i)));
    if (pickIdx === -1) {
      for (let i = headerCols.length - 1; i >= 0; i -= 1) {
        if (ROLE_RE.test(headerText(i))) continue;
        if (LANG_NAME_RE.test(headerText(i)) && !/日文|日语|日本語/.test(headerText(i))) continue;
        pickIdx = i; break;
      }
    }
    if (pickIdx < 0) pickIdx = headerCols.length - 1;
    if (pickIdx >= headerCols.length) pickIdx = headerCols.length - 1;

    // Step 4: 扫数据 (只扫 cell 长度正好=N 的行, 避免 section/subtotal 行干扰)
    for (let ri = firstDataRow; ri < rows.length; ri += 1) {
      const cells = rows[ri].match(/<t[hd][\s\S]*?<\/t[hd]>/gi) || [];
      if (cells.length !== N) continue;
      const cell = cells[pickIdx];
      if (!cell) continue;
      let m: RegExpExecArray | null;
      LINK_RE.lastIndex = 0;
      while ((m = LINK_RE.exec(cell)) !== null) {
        const title = stripHtml(m[2]);
        if (!title) continue;
        if (/^(Category|File|Template|Help|Special|Module|User|MediaWiki|Wikipedia):/.test(title)) continue;
        if (/(声优|配音演员|CAST|Cast|配音|列表|一览|名单|角色|参考|外部|系列|动画|游戏|漫画|小说|视觉|乐队|企划|设定|画集|音乐|活动|用语|梗|联动|手游|卡牌|图鉴|设定集|封面|BD|DVD|特典|目录|主题曲|片尾曲|片头曲|插入曲|原声集|广播剧|Drama|CD|舞台|真人|电影|电视剧|节目|广播|活动|访谈|杂志|书籍|同人|周边)$/.test(title)) continue;
        if (seen.has(title)) continue;
        seen.add(title);
        out.push({ name: title, path: m[1], lang: /日语|日本語|日文|JP/.test(headerText(pickIdx)) ? 'jp' : 'cn' });
      }
    }
  }

  // 兜底: 全文本扫 声优/配音/CV 附近的链接
  if (out.length === 0) {
    LINK_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    const ctx = html.slice(Math.max(0, html.indexOf('id="mw-content-text"')));
    while ((m = LINK_RE.exec(ctx)) !== null) {
      const title = stripHtml(m[2]);
      if (!title) continue;
      if (/^(Category|File|Template|Help|Special|Module|User|MediaWiki|Wikipedia):/.test(title)) continue;
      if (/(声优|配音演员|CAST|Cast|配音|列表|一览|名单|角色|参考|外部)$/.test(title)) continue;
      if (seen.has(title)) continue;
      const start = Math.max(0, (m.index || 0) - 80);
      const end = Math.min(ctx.length, (m.index || 0) + m[0].length + 80);
      const near = ctx.slice(start, end);
      if (!/(役|配音|声优|\bCV\b|Cast|出演)[^\n]{0,40}/.test(near)) continue;
      seen.add(title);
      out.push({ name: title, path: m[1], lang: 'unknown' });
    }
  }
  return out;
}

// =============================================================
//  声优详情页解析
// =============================================================
type SeiyuuDetail = {
  name: string;
  romaji: string;
  birth_place: string;
  agency: string;
  birth_date: string | null;
  debut_year: number | null;
  groups: string[];
  representative_works: string[];
  representative_characters: { work: string; character: string }[];
  five_groups: string[];
  is_female: boolean;
  source_page?: string;
};

function guessRomajiFromInfobox(html: string, name: string): string {
  const infobox = extractInfobox(html);
  // 优先: infobox 姓名行 格式 "南條（なんじょう） 愛乃（よしの）(Nanjō Yoshino)" 里最后一个 (...) 里的罗马字
  const trs = infobox.match(/<tr[\s\S]*?<\/tr>/gi) || [];
  // 允许 macron (ōū 等) 和 日文罗马字常用字符
  const RJI_RE = /[（(]([A-Za-zōūēīäöüǎǒǔǚǖǘǚǜǹẁỳṹỳ\-\u0027\u2019’ .・ーー\s]{1,90})[)）]/;
  const ASCII_RE = /[A-Za-zōūēīäöüǎǒǔǚǖǘǚǜǹẁỳṹỳ\-\u2019’ .・ーー]{2,90}/;
  for (const tr of trs) {
    const tds = tr.match(/<td[\s\S]*?<\/td>/gi) || [];
    if (tds.length >= 2) {
      for (let i = 0; i < tds.length - 1; i += 1) {
        const left = stripHtml(tds[i]);
        if (/姓名|罗马字|原名|日文名|平文式/.test(left) && left.length < 12) {
          const rest = stripHtml(tds.slice(i + 1).join(' '));
          const m = rest.match(RJI_RE);
          if (m) return m[1].trim();
          const ascii = rest.match(ASCII_RE);
          if (ascii) return ascii[0].trim();
        }
      }
    }
  }
  const v = parseInfoboxField(infobox, 'romaji');
  if (v) {
    const s = stripHtml(v);
    const ascii = s.match(ASCII_RE);
    if (ascii) return ascii[0].trim();
    return s;
  }
  const h1 = html.match(/<h1[^>]*id="firstHeading"[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1) {
    const t = stripHtml(h1[1]);
    const m = t.match(RJI_RE);
    if (m) return m[1].trim();
  }
  const title = html.match(/<title>([\s\S]*?)<\/title>/i);
  if (title) {
    const t = stripHtml(title[1]);
    const m = t.match(RJI_RE);
    if (m) return m[1].trim();
  }
  return '';
}

function parseAgency(infobox: string): string {
  const v = parseInfoboxField(infobox, 'agency');
  return v ? cleanCellNotes(stripHtml(v)).slice(0, 120) : '';
}
function parseBirthPlace(infobox: string): string {
  const v = parseInfoboxField(infobox, 'birth_place');
  return v ? cleanCellNotes(stripHtml(v)).slice(0, 60) : '';
}
function parseBirthDate(infobox: string): string | null {
  const v = parseInfoboxField(infobox, 'birth_date');
  if (!v) return null;
  const txt = stripHtml(v);
  const y = txt.match(/(19|20)\d{2}/);
  const md = txt.match(/(\d{1,2})[.月\-\/日年](\d{1,2})(日|号)?/);
  if (y && md) return `${y[0]}-${md[1].padStart(2, '0')}-${md[2].padStart(2, '0')}`;
  if (y) return y[0];
  return null;
}
function parseDebutYear(infobox: string): number | null {
  const v = parseInfoboxField(infobox, 'debut_year');
  if (v) {
    const y = stripHtml(v).match(/(19|20)\d{2}/);
    if (y) return Number(y[0]);
  }
  return null;
}
function parseGroups(infobox: string): string[] {
  const v = parseInfoboxField(infobox, 'groups');
  if (!v) return [];
  const txt = stripHtml(v);
  return txt
    .split(/\s*[、,，;；\/／]\s*|\n+|和|及|与|・|·/)
    .map((s) => s.trim().replace(/[()（）\[].*?[)）\]]/g, '').trim())
    .filter((s) => s && s.length <= 60);
}

// 根据代表角色推断所属偶像团体/企划子组合
const LL_CHAR_TO_GROUP: Array<{ group: string; chars: RegExp }> = [
  // LoveLive!
  { group: "μ's", chars: /高坂穗乃果|绚濑绘里|南小鸟|南琴梨|园田海未|星空凛|西木野真姬|东条希|小泉花阳|矢泽妮可/i },
  { group: 'Aqours', chars: /高海千歌|樱内梨子|松浦果南|黑泽黛雅|渡边曜|津岛善子|国木田花丸|小原鞠莉|黑泽露比/i },
  { group: '虹咲学园学园偶像同好会', chars: /上原步梦|中须霞|樱坂雫|朝香果林|宫下爱|近江彼方|优木雪菜|艾玛·维尔德|天王寺璃奈|三船栞子|米娅·泰勒|钟岚珠/i },
  { group: 'Liella!', chars: /涩谷香音|唐可可|岚千砂都|平安名堇|叶月恋|樱小路希奈子|若菜四季|米女芽衣|薮岛朱音|鬼冢夏美|维恩·玛格丽特|百田凛|鬼冢冬毬/i },
  { group: '莲之空女学院学园偶像俱乐部', chars: /日野下花帆|安养寺姬芽|狮子神利架|百生吟子|夕雾缀理|大泽瑠璃乃|藤岛慈|村野沙耶香|出云咲姬|花冈梦羽|伊户井十重|安积永梦|东悠|村浦かずさ|若柳セリオ|安藤づ|莲之空/i },
  // BanG Dream! 企划的子团 (Poppin'Party/Afterglow/Pastel*Palettes/Roselia/Hello, Happy World! 先靠角色名映射也可以，我简化：如果邦邦角色出现在代表角色里，默认算「BanG Dream! 企划」(five_groups 里会有)。
  // 偶像大师百万现场/闪耀色彩/shinnycolors 靠企划名，不用单独列角色了。
  // 赛马娘 Pretty Derby：每个角色有大量人名，但赛马娘不算组合，直接归五大企划分组。
];

// 常见硬编码: 部分个人/团体（声优常见组合
const NAME_GROUP_HINTS: Record<string, string[]> = {
  '南条爱乃': ['fripSide'],
  '三森铃子': ['ミルキーホームズ', '少女福尔摩斯队'],
  '德井青空': ['ミルキーホームズ', '少女福尔摩斯队'],
  '佐佐木未来': ['ミルキーホームズ', '少女福尔摩斯队'],
  '橘田泉': ['ミルキーホームズ', '少女福尔摩斯队'],
  '新田惠海': ['ミルキーホームズ', '少女福尔摩斯队'],
};

function inferAllGroups(
  infobox: string,
  five_groups: string[],
  repChars: { work: string; character: string }[],
  name: string
): string[] {
  const base = parseGroups(infobox);
  const set = new Set<string>(base);
  for (const hint of NAME_GROUP_HINTS[name] || []) set.add(hint);
  const chars = repChars.map((r) => r.character + ' ' + r.work).join(' | ');
  for (const rule of LL_CHAR_TO_GROUP) {
    if (rule.chars.test(chars)) set.add(rule.group);
  }
  // five_groups 是五大企划分组，默认加入 groups 里（它本身是 groups，所以 groups 可能重复没关系，groups 里可以包括企划小分组和企划本身）：不，groups 是小组合，不是企划；但五个本身是企划不需要。
  // 返回并清理。
  return Array.from(set).filter((g) => g && g.length <= 40);
}
function parseBloodType(infobox: string): string | null {
  const v = parseInfoboxField(infobox, 'blood_type');
  if (!v) return null;
  const m = stripHtml(v).match(/[ABO][ABO]?/);
  return m ? m[0] : null;
}

function parseRepCharsFromInfobox(infobox: string): { work: string; character: string }[] {
  let raw: string | null = parseInfoboxField(infobox, 'representative_characters');
  if (!raw) {
    // 退化: 手动扫代表角色相关 th/td 行
    const labels = ['代表角色', '代表作・代表角色', '代表角色・代表作', '代表作和代表角色', '代表角色与代表作'];
    for (const lab of labels) {
      const re = new RegExp(
        '<(th|td)[^>]*>[^<]*' + lab.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[^<]*</(th|td)>\\s*<td[^>]*>([\\s\\S]{1,12000}?)</td>',
        'i'
      );
      const m = infobox.match(re);
      if (m) { raw = m[3] ?? m[2]; break; }
    }
  }
  if (!raw) return [];
  const text = stripHtml(raw);
  if (!text) return [];
  // 分割: 先按 <br> (stripHtml 后会变成空格, 所以这里用正则直接切 "角色名《作品》" 块)
  const blocks: string[] = [];
  const reBlock = /([^《「【（(]{1,40}?)[《「【]([^》」】]*)[》」】]/g;
  let mb: RegExpExecArray | null;
  while ((mb = reBlock.exec(text)) !== null) {
    const char = mb[1].replace(/^[\s、,，。；;：:·・]+/, '').replace(/[\s、,，。；;：:·・]+$/, '').trim();
    if (!char) continue;
    blocks.push(char + '《' + mb[2].trim() + '》');
  }
  if (!blocks.length) {
    // fallback: 按 <br> 切 (stripHtml 后如果剩下的有分隔符)
    const tmp = raw.split(/<br\s*\/?>/gi).map(stripHtml).filter(Boolean);
    for (const b of tmp) if (b.length) blocks.push(b);
  }
  const out: { work: string; character: string }[] = [];
  for (const e of blocks) {
    let m: RegExpMatchArray | null = e.match(/^(.+?)《(.+?)》$/);
    if (!m) m = e.match(/^(.+?)[「【](.+?)[」】]$/);
    if (!m) m = e.match(/^(.+?)\s*\((.+?)\)\s*$/);
    if (!m) m = e.match(/^(.+?)\s*[—\-–]\s*(.+)$/);
    if (m) out.push({ character: cleanRepChar(m[1].trim()), work: cleanRepChar(m[2].trim()) });
    else if (e && e.length <= 40) {
      const c = cleanRepChar(e.trim());
      if (c && c.length <= 40) out.push({ character: c, work: '' });
    }
  }
  return out;
}
function cleanRepChar(s: string): string {
  return s
    .replace(/<[^>]+>/g, ' ')
    .replace(/&lt;\/?[a-zA-Z][^&]{0,200}?&gt;/gi, ' ')
    .replace(/span\s*(?:style|class)\s*=\s*"[^"]*"[^>]*>?/gi, ' ')
    .replace(/style\s*=\s*"[^"]*"/gi, ' ')
    .replace(/class\s*=\s*"[^"]*"/gi, ' ')
    .replace(/&#?[a-zA-Z0-9]+;/g, ' ')
    .replace(/[、,，。；;：:·・\s]+$/g, '')
    .replace(/^[、,，。；;：:·・\s]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseWorksSection(html: string): { work: string; character: string; section: string; bold: boolean }[] {
  const h2s = Array.from(html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/g));
  const target = h2s.find((m) => {
    const t = stripHtml(m[1]);
    return t === '出演作品' || t === '作品' || t === '主要出演作品';
  });
  if (!target) return [];
  const sectionStart = (target.index || 0) + target[0].length;
  let sectionEnd = html.length;
  for (const h of h2s) {
    if ((h.index || 0) > sectionStart) {
      sectionEnd = h.index || 0;
      break;
    }
  }
  const sec = html.slice(sectionStart, sectionEnd);
  const h3s = Array.from(sec.matchAll(/<h3[^>]*>([\s\S]*?)<\/h3>/g)).map((m) => ({
    t: stripHtml(m[1]),
    i: (m.index || 0) + m[0].length,
  }));
  const out: { work: string; character: string; section: string; bold: boolean }[] = [];
  const slices = h3s.length
    ? h3s.map((h, i) => ({
        t: h.t,
        html: sec.slice(h.i, i + 1 < h3s.length ? h3s[i + 1].i : sec.length),
      }))
    : [{ t: '其他', html: sec }];
  for (const sl of slices) {
    const liRe = /<li[^>]*>([\s\S]*?)<\/li>/g;
    let lm;
    while ((lm = liRe.exec(sl.html)) !== null) {
      const liHtml = lm[1];
      const hasBold = /<b[^>]*>|<strong[^>]*>/.test(liHtml);
      const txt = stripHtml(liHtml);
      let m = txt.match(/^(.+?)\s*[—\-–ー]{2,}\s*《(.+?)》/);
      if (!m) m = txt.match(/^(.+?)\s*[—\-–ー]\s*《(.+?)》/);
      if (!m) m = txt.match(/^(.+?)《(.+?)》/);
      if (!m) m = txt.match(/^(.+?)[「【](.+?)[」】]/);
      if (!m) m = txt.match(/^([^：:]{1,35})[：:]\s*(.+)$/);
      if (!m) continue;
      const character = m[1].trim().replace(/^\s*\([^)]*\)\s*/, '').replace(/^\s*（[^)]*）\s*/, '').trim();
      const work = m[2].trim();
      if (!character || !work) continue;
      out.push({ character, work, section: sl.t, bold: hasBold });
    }
  }
  return out;
}

function guessIsFemale(
  html: string,
  name: string,
  representativeCharacters: { work: string; character: string }[],
  groups: string[]
): boolean {
  const infobox = extractInfobox(html);
  // infobox 性别
  const gLabels = ['性别', '性別'];
  let g: string | null = null;
  for (const lab of gLabels) {
    const re = new RegExp(
      '<th[^>]*>[^<]*' + lab + '[^<]*</th>\\s*<td[^>]*>([\\s\\S]*?)</td>',
      'i'
    );
    const m = infobox.match(re);
    if (m) {
      g = stripHtml(m[1]);
      break;
    }
  }
  if (g) {
    if (/女|女性|female|woman/i.test(g)) return true;
    if (/男|男性|male|man/i.test(g)) return false;
  }
  // 分类
  const catBox = html.slice(html.indexOf('catlinks') >>> 0);
  if (/日本女性|女声优|女性配音演员|日本.*女.*配音/.test(catBox)) return true;
  if (/日本男性|男声优|男性配音演员/.test(catBox)) return false;
  // 第一段
  const p = html.match(/<p>([\s\S]*?)<\/p>/i);
  if (p) {
    const t = stripHtml(p[1]);
    if (/日本女性配音演员|日本女声优|女性声优|女.*配音演员/.test(t)) return true;
    if (/日本男性配音演员|日本男声优|男性声优|男.*配音演员/.test(t)) return false;
  }
  // 人名末尾 + 团体名 (女性团体会让我们先假设女)
  const femaleGroups = /(Poppin|Roselia|Aqours|μ's|Liella|Morfonica|Pastel|Hello.*Happy|少女歌剧|Starlight九九组|赛马娘|偶像大师.*女孩|Cinderella|百万现场|闪耀色彩|莲之空|虹咲|光之美少女|魔法少女|偶像活动)/i;
  if (groups.some((x) => femaleGroups.test(x))) return true;
  const works = representativeCharacters.map((c) => c.work).join(' ');
  if (femaleGroups.test(works)) return true;

  // 典型女性名后缀 (粗筛, 错杀 5% 左右, 但前面五大企划 + 团体 已兜住了)
  const femaleTail =
    /(子|美|菜|乃|香|里|莉|芽|衣|奈|江|恵|代|枝|音|花|梨|織|冴|彩|緒|実|來|結|愛|優|希|咲|菜乃|美桜|実桜|春香|秋乃|奈緒|瑞希|沙織|由衣|千尋|明里|麻衣|杏奈|莉子|理緒|美羽|風花|莉音|結菜|夏希|美憂|麗奈|智代|沙羅|真緒|亜美|愛子|桃子|春菜|美緒|美奈|愛佳|美海|日菜|美来|桜|良|葵|芹|蓮|楓|茜|渚|雫|菫|雪|穗|月|星|花|華|蘭|樹|奏|鞠|音|世|良|葉|都|来|那|希|乃|子|美|菜|香|里|莉|枝|衣|奈|江|恵|代|織|冴|彩|緒)$/;
  if (femaleTail.test(name.replace(/\([^)]*\)$/, ''))) {
    const maleTail = /(夫|郎|彦|之介|男|太|樹|輝|康|馬|騎|大|介|太朗|浩|健|隆|也|哉|斗|翔|悟|志|光|一|利|行|朗|人|平|栄|善|勝|典|明|稔|紀|修|章|周|高|竜|誠|裕|幸|正|吉|良|弘|元|作|聖|真|和|雅|臣)$/;
    if (!maleTail.test(name.replace(/\([^)]*\)$/, ''))) return true;
  }
  return false;
}

function detectFiveGroups(
  works: { work: string; character: string }[],
  groups: string[],
  pageText: string,
  alsoFromWorkPage: string[] = []
): string[] {
  const hay =
    pageText +
    '\n' +
    works.map((w) => w.work + ' / ' + w.character).join('\n') +
    '\n' +
    groups.join('\n');
  const hits = new Set<string>(alsoFromWorkPage);
  for (const g of FIVE_GROUPS) {
    for (const re of g.keyWorks) if (re.test(hay)) hits.add(g.groupName);
  }
  return FIVE_GROUPS.filter((g) => hits.has(g.groupName))
    .sort((a, b) => a.priority - b.priority)
    .map((g) => g.groupName);
}

async function parseSeiyuuPage(
  name: string,
  paths: string[],
  fiveGroupsFromWorkPage: string[] = []
): Promise<SeiyuuDetail | null> {
  let html = '';
  let srcPath = '';
  for (const p of paths) {
    const r = await mgFetch(p);
    if (r.status === 200 && r.html) {
      html = r.html;
      srcPath = p;
      break;
    }
    await sleep(200);
  }
  if (!html) return null;
  const infobox = extractInfobox(html);
  const groupsBase = parseGroups(infobox);
  const repCharsIB = parseRepCharsFromInfobox(infobox);
  const works = parseWorksSection(html);

  const isFemale = guessIsFemale(html, name, repCharsIB, groupsBase);
  if (!isFemale) return null;

  let repChars: { work: string; character: string }[] = [...repCharsIB];
  const seen = new Set<string>();
  repChars = repChars.filter((c) => {
    const k = (c.work || '') + '|' + c.character;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  for (const w of works.filter((w) => w.bold)) {
    if (repChars.length >= 20) break;
    const k = (w.work || '') + '|' + w.character;
    if (seen.has(k)) continue;
    seen.add(k);
    repChars.push({ work: w.work, character: w.character });
  }
  for (const w of works) {
    if (repChars.length >= 25) break;
    const k = (w.work || '') + '|' + w.character;
    if (seen.has(k) || !w.work || !w.character) continue;
    seen.add(k);
    repChars.push({ work: w.work, character: w.character });
  }
  const repWorks: string[] = [];
  for (const c of repChars) if (c.work && !repWorks.includes(c.work)) repWorks.push(c.work);

  const pageIntro = stripHtml(html.slice(html.indexOf('<p'), html.indexOf('<p') + 4000));
  const five_groups_draft = detectFiveGroups(
    repChars,
    groupsBase,
    pageIntro,
    fiveGroupsFromWorkPage
  );
  // infobox 里的"所属团体"命中企划关键词也算
  for (const g of FIVE_GROUPS) {
    for (const grp of groupsBase) {
      if (g.keyWorks.some((re) => re.test(grp)) && !five_groups_draft.includes(g.groupName)) {
        five_groups_draft.push(g.groupName);
      }
    }
  }
  // groups 要用到 five_groups_draft (因为 inferAllGroups 需要 five_groups_draft来辅助推断，groups 是最终的 groups（含小分组)
  const groups = inferAllGroups(infobox, five_groups_draft, repChars, name);

  return {
    name,
    romaji: guessRomajiFromInfobox(html, name),
    birth_place: parseBirthPlace(infobox),
    agency: parseAgency(infobox),
    birth_date: parseBirthDate(infobox),
    debut_year: parseDebutYear(infobox),
    groups,
    representative_works: repWorks.slice(0, 30),
    representative_characters: repChars.slice(0, 30),
    five_groups: FIVE_GROUPS.filter((g) => five_groups_draft.includes(g.groupName)).map((g) => g.groupName),
    is_female: true,
    source_page: srcPath,
  };
}

// =============================================================
//  主流程
// =============================================================
type ScrapedSeiyuu = SeiyuuDetail;

async function tryWorkPagePathList(pathList: string[]): Promise<{ path: string; html: string } | null> {
  for (const p of pathList) {
    const r = await mgFetch(p, { retry5: true });
    if (r.status === 200) return { path: p, html: r.html };
    await sleep(250);
  }
  return null;
}

async function main() {
  if (IN_FILE && existsSync(IN_FILE)) {
    const list: ScrapedSeiyuu[] = JSON.parse(readFileSync(IN_FILE, 'utf8'));
    console.log('读取输入:', IN_FILE, '条目数=', list.length);
    if (DO_IMPORT) await importIntoDb(list);
    return;
  }

  // ---------- Phase 1: 作品配音演员页抓声优名 ----------
  type NameSlot = { name: string; paths: string[]; fromGroups: string[] };
  const byName = new Map<string, NameSlot>();
  const addName = (n: string, p: string, fromGroup?: string) => {
    if (!byName.has(n)) byName.set(n, { name: n, paths: [], fromGroups: [] });
    const s = byName.get(n)!;
    if (p && !s.paths.includes(p)) s.paths.push(p);
    if (fromGroup && !s.fromGroups.includes(fromGroup)) s.fromGroups.push(fromGroup);
  };

  // Phase 1a: 本地 tmp 已下载 HTML 文件 (崩坏3/明日方舟 等) 作种子
  const localSeeds: Array<{ file: string; group?: string }> = [
    { file: path.resolve(process.cwd(), 'tmp', 'bh3.html') },
    { file: path.resolve(process.cwd(), 'tmp', 'mfz.html') },
    { file: path.resolve(process.cwd(), 'tmp', 'xqtd.html') },
    { file: path.resolve(process.cwd(), 'tmp', 'wl.html') },
  ];
  for (const ls of localSeeds) if (existsSync(ls.file)) {
    try {
      const names = scrapeSeiyuuNamesFromWorkPage(readFileSync(ls.file, 'utf8'));
      console.log('[local-seed ]', path.basename(ls.file), '->', names.length);
      for (const n of names) addName(n.name, n.path, ls.group);
    } catch (e) {
      console.error('[local-seed err]', ls.file, (e as Error).message);
    }
  }

  if (!SKIP_WORK_PAGES) {
    const pagesToCrawl: Array<{ group?: GroupDef; title: string; paths: string[] }> = [];
    for (const g of FIVE_GROUPS) {
      for (const p of g.workPageCandidates) pagesToCrawl.push({ group: g, title: p.title, paths: p.paths });
    }
    if (!ONLY_FIVE) {
      for (const p of EXTRA_WORK_PAGES) pagesToCrawl.push({ title: p.title, paths: p.paths });
    }

    const workOk: string[] = [];
    for (const page of pagesToCrawl) {
      const got = await tryWorkPagePathList(page.paths);
      if (!got) {
        console.log('[work miss ]', page.title, page.paths[0]);
        continue;
      }
      const names = scrapeSeiyuuNamesFromWorkPage(got.html);
      workOk.push(page.title + '→' + names.length);
      for (const n of names) addName(n.name, n.path, page.group?.groupName);
      await sleep(250);
    }
    console.log('[work page summary]', workOk.join(' ; '));
  }

  // Phase 1b: 硬编码五大企划保底 (就算作品页命中了, 也要把名单补进来, 保证每个企划 hardcoded 名单里的名字都尝试过)
  for (const g of FIVE_GROUPS) {
    for (const h of g.hardcoded) {
      const tryNames = [h.name, ...(h.alsoTry ?? [])];
      const tryPaths: string[] = tryNames
        .map((n) => ['/' + encodeURIComponent(n), '/' + n, '/' + encodeURIComponent(n) + '(声优)', '/' + n + '_(声优)'])
        .flat();
      const slot = byName.get(h.name) ?? { name: h.name, paths: [], fromGroups: [] };
      if (!slot.fromGroups.includes(g.groupName)) slot.fromGroups.push(g.groupName);
      for (const p of tryPaths) if (!slot.paths.includes(p)) slot.paths.push(p);
      byName.set(h.name, slot);
      for (const alias of h.alsoTry ?? []) {
        if (!byName.has(alias)) {
          byName.set(alias, {
            name: alias,
            paths: tryPaths,
            fromGroups: slot.fromGroups.slice(),
          });
        }
      }
    }
  }

  console.log(`\n[Phase 1 DONE] 候选声优名: ${byName.size} 名，开始爬详情页 (LIMIT=${LIMIT || '∞'})`);

  // ---------- Phase 2: 详情页 + 过滤男声优 ----------
  const queue = Array.from(byName.values());
  // 优先排五大企划 fromGroups 的, 保证 limit 时先凑齐 5 大
  queue.sort((a, b) => {
    const pa = a.fromGroups.length ? FIVE_GROUPS.findIndex((g) => g.groupName === a.fromGroups[0]) : 999;
    const pb = b.fromGroups.length ? FIVE_GROUPS.findIndex((g) => g.groupName === b.fromGroups[0]) : 999;
    return pa - pb;
  });

  const results: ScrapedSeiyuu[] = [];
  let processed = 0;
  const startTime = Date.now();
  for (const item of queue) {
    processed += 1;
    if (LIMIT && results.length >= LIMIT) break;
    try {
      const d = await parseSeiyuuPage(item.name, item.paths, item.fromGroups);
      if (!d) continue;
      // 不是女声优也没在五大企划里的，或者啥代表作都没有的，且不是五大保底，就扔了
      const fiveOk = d.five_groups.length > 0;
      const hasRep = d.representative_characters.length > 0 || d.agency || d.birth_place || d.debut_year;
      if (!fiveOk && !hasRep) continue;
      results.push(d);
    } catch (e) {
      console.error('[err]', item.name, (e as Error).message);
    }
    if (processed % 50 === 0) {
      const speed = processed / Math.max(0.5, (Date.now() - startTime) / 1000);
      console.log(
        `  进度 ${processed}/${queue.length}  保留女声优=${results.length}  五大企划=${results.filter((r) => r.five_groups.length).length}  speed=${speed.toFixed(1)}/s`
      );
      await sleep(400);
    } else {
      await sleep(100);
    }
  }

  // Phase 3: 去重 + 排序
  const uniq = new Map<string, ScrapedSeiyuu>();
  for (const r of results) {
    const bare = r.name.replace(/\([^)]*\)$/, '');
    const exist = uniq.get(bare);
    if (!exist || (exist.five_groups.length === 0 && r.five_groups.length > 0) || exist.representative_characters.length < r.representative_characters.length) {
      uniq.set(bare, { ...r, name: bare });
    }
  }
  const final = Array.from(uniq.values()).sort((a, b) => {
    const pa = a.five_groups.length ? FIVE_GROUPS.findIndex((g) => g.groupName === a.five_groups[0]) : 999;
    const pb = b.five_groups.length ? FIVE_GROUPS.findIndex((g) => g.groupName === b.five_groups[0]) : 999;
    if (pa !== pb) return pa - pb;
    return b.representative_characters.length - a.representative_characters.length;
  });

  console.log(
    `\n[Done] 抓取完成: ${final.length} 名女声优；五大企划相关=${final.filter((r) => r.five_groups.length).length}`
  );
  console.log('  五大企划分布:');
  for (const g of FIVE_GROUPS) {
    console.log('   -', g.groupName, '=', final.filter((r) => r.five_groups.includes(g.groupName)).length);
  }
  console.log('\n=== 前 10 条样例 ===');
  for (const r of final.slice(0, 10)) {
    console.log(
      `- ${r.name}(${r.romaji}) 事务所=${r.agency} 出生地=${r.birth_place} 团体=[${r.groups.slice(0, 3).join(',')}] 五大=[${r.five_groups.join(',')}]`
    );
    console.log(
      '  代表角色: ' +
        r.representative_characters
          .slice(0, 5)
          .map((c) => (c.work ? `${c.character}《${c.work}》` : c.character))
          .join(' / ')
    );
  }

  if (OUT_FILE) {
    const dir = path.dirname(OUT_FILE);
    if (dir && !existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(OUT_FILE, JSON.stringify(final, null, 2), 'utf8');
    console.log('\n已输出 JSON:', OUT_FILE);
  }
  if (DO_IMPORT) await importIntoDb(final);
}

// =============================================================
//  导入 DB
// =============================================================
async function importIntoDb(list: ScrapedSeiyuu[]) {
  const mod = await import('better-sqlite3');
  const Database = (mod as any).default ?? mod;
  const DB_PATH = path.resolve(__dirname, '../data/seiyuu-guess.sqlite3');
  console.log('\n[import] 打开 DB:', DB_PATH);
  const db = new Database(DB_PATH);

  db.exec(`CREATE TABLE IF NOT EXISTS seiyuus (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(128) NOT NULL UNIQUE,
    romaji VARCHAR(128) NOT NULL DEFAULT '',
    birth_place VARCHAR(64) NOT NULL DEFAULT '',
    agency VARCHAR(128) NOT NULL DEFAULT '',
    birth_date DATE NULL,
    debut_year INTEGER NULL,
    groups TEXT NOT NULL DEFAULT '[]',
    blood_type VARCHAR(4) NULL,
    voice_types TEXT NOT NULL DEFAULT '[]',
    representative_works TEXT NOT NULL DEFAULT '[]',
    representative_characters TEXT NOT NULL DEFAULT '[]',
    five_groups TEXT NOT NULL DEFAULT '[]',
    is_enabled BOOLEAN NOT NULL DEFAULT 1
  )`);
  const addCol = (sql: string) => { try { db.exec(sql); } catch { /* ignore */ } };
  addCol('ALTER TABLE seiyuus ADD COLUMN groups TEXT NOT NULL DEFAULT \'[]\'');
  addCol('ALTER TABLE seiyuus ADD COLUMN five_groups TEXT NOT NULL DEFAULT \'[]\'');
  addCol('ALTER TABLE seiyuus ADD COLUMN romaji VARCHAR(128) NOT NULL DEFAULT \'\'');
  addCol('ALTER TABLE seiyuus ADD COLUMN birth_place VARCHAR(64) NOT NULL DEFAULT \'\'');

  const upsert = db.prepare(`INSERT INTO seiyuus
    (name, romaji, birth_place, agency, birth_date, debut_year, groups, blood_type, representative_works, representative_characters, five_groups, is_enabled)
    VALUES (@name, @romaji, @birth_place, @agency, @birth_date, @debut_year, @groups, @blood_type, @representative_works, @representative_characters, @five_groups, 1)
    ON CONFLICT(name) DO UPDATE SET
      romaji=excluded.romaji,
      birth_place=excluded.birth_place,
      agency=excluded.agency,
      birth_date=excluded.birth_date,
      debut_year=excluded.debut_year,
      groups=excluded.groups,
      representative_works=excluded.representative_works,
      representative_characters=excluded.representative_characters,
      five_groups=excluded.five_groups,
      is_enabled=1`);

  const tx = db.transaction((rows: ScrapedSeiyuu[]) => {
    for (const r of rows) {
      upsert.run({
        name: r.name,
        romaji: r.romaji || '',
        birth_place: r.birth_place || '',
        agency: r.agency || '',
        birth_date: r.birth_date,
        debut_year: r.debut_year,
        groups: JSON.stringify(r.groups || []),
        blood_type: null,
        representative_works: JSON.stringify(r.representative_works || []),
        representative_characters: JSON.stringify(r.representative_characters || []),
        five_groups: JSON.stringify(r.five_groups || []),
      });
    }
  });
  tx(list);

  // 处理 difficulty 会员: 全 enabled 入库; 五大企划或代表角色≥3 的入 easy; 代表角色≥1 或五大企划或事务所/出生地/出道年有信息的入 beginner; full 全 enabled
  try {
    db.exec(`CREATE TABLE IF NOT EXISTS player_difficulties (
      player_id INTEGER NOT NULL,
      difficulty_key VARCHAR(32) NOT NULL,
      PRIMARY KEY (player_id, difficulty_key)
    `);
  } catch (e) { /* ignore */ }
  const allIds = db.prepare('SELECT id, five_groups, representative_characters, agency, birth_place, debut_year FROM seiyuus WHERE is_enabled=1').all() as any[];
  const insertDiff = db.prepare('INSERT OR IGNORE INTO player_difficulties (player_id, difficulty_key) VALUES (?, ?)');
  const txDiffs = db.transaction((ids: any[]) => {
    for (const s of ids) {
      let repLen = 0;
      try { repLen = (JSON.parse(s.representative_characters || '[]')?.length ?? 0; } catch { /* ignore */ }
      const fiveOk = (s.five_groups || '[]').length > 4; // '[]' length===2 无内容; '[...]' 有内容时会 > 4
      const basicOk = Boolean(s.agency || s.birth_place || s.debut_year);
      const full = true;
      const beginner = true; // 完整版和入门版全员入库
      const easy = fiveOk || repLen >= 3 || (basicOk && repLen >= 1);
      if (beginner) insertDiff.run(s.id, 'beginner');
      if (easy) insertDiff.run(s.id, 'easy');
      if (full) insertDiff.run(s.id, 'full');
    }
  });
  txDiffs(allIds);
  console.log('[import] player_difficulties 已刷新');
  const diffCount = (q: string) => (db.prepare('SELECT COUNT(*) AS c FROM player_difficulties WHERE difficulty_key=?').get(q) as any).c;
  console.log(`[import] difficulty 难度池：beginner=${diffCount('beginner')}, easy=${diffCount('easy')}, full=${diffCount('full')}`);

  const count = (db.prepare('SELECT COUNT(*) AS c FROM seiyuus WHERE is_enabled=1').get() as any).c;
  const five = (db.prepare('SELECT COUNT(*) AS c FROM seiyuus WHERE json_array_length(five_groups)>0').get() as any).c;
  console.log(`[import] 导入完成。启用声优=${count}, 五大企划相关=${five}`);
  for (const g of FIVE_GROUPS) {
    const n = (db.prepare('SELECT COUNT(*) AS c FROM seiyuus WHERE instr(five_groups, ?) > 0').get(JSON.stringify(g.groupName).slice(1, -1)) as any).c;
    console.log('   -', g.groupName, '=', n);
  }
  db.close();

  // 触发开发服务器 tsx watch 重启，刷新内存中的 playerCache
  try {
    const triggerPath = path.resolve(__dirname, '../src/db/schema.ts');
    const now = new Date();
    await fs.promises.utimes(triggerPath, now, now);
    console.log('[import] 已触发 dev server 重启以刷新缓存');
  } catch (e) {
    console.warn('[import] 刷新缓存失败：', (e as Error).message);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
