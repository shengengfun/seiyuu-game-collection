// 将新爬取数据入库，同时补出道年兜底 + 团体推断 + 难度重分配
import path from 'path';
import fs from 'fs';
import Database from 'better-sqlite3';

const DB_PATH = path.resolve(__dirname, '../data/seiyuu-guess.sqlite3');
const NEW_DATA = path.resolve(__dirname, '../tmp/recrawl-data.json');
const DECADE_LIST = path.resolve(__dirname, '../tmp/female-seiyuu-list.json');
const db = new Database(DB_PATH);

// 1. 读新数据
interface NewRec {
  name: string;
  romaji?: string;
  agency?: string;
  birth_place?: string;
  birth_date?: string;
  debut_year?: number;
  groups?: string[];
  representative_characters?: { work: string; character: string }[];
  five_groups?: string[];
}
const newDataRaw: NewRec[] = JSON.parse(fs.readFileSync(NEW_DATA, 'utf8'));
console.log(`读取新爬数据 ${newDataRaw.length} 条`);

const decadeMap: Record<string, string> = {};
try {
  const list: { name: string; decade: string }[] = JSON.parse(fs.readFileSync(DECADE_LIST, 'utf8'));
  for (const s of list) decadeMap[s.name] = s.decade;
} catch (e) { /* ignore */ }

// 按名字建索引
const newDataByName = new Map<string, NewRec>();
for (const r of newDataRaw) newDataByName.set(r.name, r);

// 2. 遍历现有 seiyuus 表，用新数据 UPDATE 每一行（保留 ID/five_groups）
const allRows = db.prepare('SELECT id, name, five_groups FROM seiyuus').all() as any[];
console.log(`数据库中现有 ${allRows.length} 人`);

const updateSeiyuu = db.prepare(`UPDATE seiyuus SET
  romaji=?, birth_place=?, agency=?, birth_date=?, debut_year=?,
  representative_characters=?, groups=?
  WHERE id=?`);

let updated = 0;
let debutFromInfobox = 0;
let debutFromBirth = 0;
let debutFromDecade = 0;
let debutStillNull = 0;

for (const row of allRows) {
  const n = newDataByName.get(row.name);
  const fiveGroups: string[] = JSON.parse(row.five_groups || '[]');
  const reps: { work: string; character: string }[] = n?.representative_characters ?? [];
  let groups: string[] = n?.groups ?? [];

  // ========= 团体推断（从 five_groups + 代表角色推断）=========
  if (groups.length === 0) {
    const repText = reps.map((r) => `${r.work || ''} ${r.character || ''}`).join(' ');
    if (fiveGroups.includes('LoveLive!')) {
      if (/μ's|缪斯/.test(repText)) groups.push("μ's");
      if (/Aqours|アクア/i.test(repText)) groups.push('Aqours');
      if (/虹咲|ニジガク|nijigasaki/i.test(repText)) groups.push('虹咲学园学园偶像同好会');
      if (/Liella!|リエラ/i.test(repText)) groups.push('Liella!');
      if (/莲之空|ハスノソラ|莲ノ空/i.test(repText)) groups.push('莲之空女学院学园偶像俱乐部');
      if (/Sunny\s*Passion/i.test(repText)) groups.push('Sunny Passion');
      if (/学マイ|学园偶像音乐剧|Gakuen/i.test(repText)) groups.push('学园偶像音乐剧');
    }
    if (fiveGroups.includes('BanG Dream!（邦邦）')) {
      if (/Poppin\s*Party|ポッピンパーティ|ポピパ/i.test(repText)) groups.push("Poppin'Party");
      if (/Afterglow|アフターグロー/i.test(repText)) groups.push('Afterglow');
      if (/Pastel[\s＊]*Palettes?|パスパレ/i.test(repText)) groups.push('Pastel＊Palettes');
      if (/Roselia|ロゼリア/i.test(repText)) groups.push('Roselia');
      if (/Hello,?\s*Happy\s*World|ハロハピ/i.test(repText)) groups.push('Hello, Happy World!');
      if (/Morfonica|モルフォニカ/i.test(repText)) groups.push('Morfonica');
      if (/RAISE\s*A\s*SUILEN|RAS/i.test(repText)) groups.push('RAISE A SUILEN');
      if (/MyGO[\s!]{0,5}|マイゴ/i.test(repText)) groups.push('MyGO!!!!!');
      if (/Ave\s*Mujica|アウェムヒカ/i.test(repText)) groups.push('Ave Mujica');
      if (/CRYCHIC/i.test(repText)) groups.push('CRYCHIC');
      if (/UniCh[Øø]rd|アンニコ|ユニコード/i.test(repText)) groups.push('UniChØrd');
      if (/Starry\s*Garden|スタガ|スターリーガーデン/i.test(repText)) groups.push('Starry Garden');
      if (/桃源郷|Togenkyo|トウゲンキョウ/i.test(repText)) groups.push('桃源郷');
      if (/∑Ages|ΣAges/i.test(repText)) groups.push('∑Ages');
      if (/FLY\s*HIGH!/i.test(repText)) groups.push('FLY HIGH!');
    }
    if (fiveGroups.includes('偶像大师系列')) {
      if (/765\s*PRO|765プロ|765production/i.test(repText)) groups.push('765PRO ALLSTARS');
      if (/Cinderella|灰姑娘|シンデレラ/i.test(repText)) groups.push('Cinderella Girls');
      if (/Million\s*Live|百万现场|ミリオン/i.test(repText)) groups.push('Million Live!');
      if (/Shiny\s*Colors|闪耀色彩|シャイニーカラーズ/i.test(repText)) groups.push('Shiny Colors');
      if (/SideM|サイドエム/i.test(repText)) groups.push('SideM');
      if (/学園アイドルマスター|学イマス|Gakuen/i.test(repText)) groups.push('学园偶像大师');
    }
    if (fiveGroups.includes('赛马娘 Pretty Derby')) {
      if (/トレセン学園|特雷森学园|ウマ娘プロジェクト/i.test(repText) || fiveGroups.includes('赛马娘 Pretty Derby')) {
        groups.push('トレセン学園');
      }
    }
    if (fiveGroups.includes('少女歌剧 Revue Starlight')) {
      groups.push('九九组');
    }
  }

  // ========= 出道年补全 =========
  let debutYear = n?.debut_year ?? null;
  if (!debutYear) {
    // 从代表角色作品名提取年份（取最早）
    const years: number[] = [];
    for (const r of reps) {
      const m = (r.work || '').match(/(19[5-9]\d|20[0-3]\d)/);
      if (m) years.push(Number(m[1]));
    }
    if (years.length) debutYear = Math.min(...years);
  }
  if (!debutYear) {
    // 从 birth_date 估计
    const bd = (n?.birth_date || '') + '';
    const bm = bd.match(/^(\d{4})/);
    if (bm) {
      const by = Number(bm[1]);
      if (by >= 1940 && by <= 2010) debutYear = by >= 2000 ? by + 15 : by + 18;
    }
  }
  if (!debutYear) {
    // 从年代分组估计
    const decade = decadeMap[row.name];
    if (decade) {
      const dm = decade.match(/(\d{4})/);
      if (dm) debutYear = Number(dm[1]);
      else if (decade.includes('1950年以前')) debutYear = 1945;
    }
  }
  if (!debutYear) {
    debutYear = 1995; // 最终兜底
  }

  if (debutYear > 2025) debutYear = 2025;
  if (debutYear < 1930) debutYear = 1930;

  // 归类统计
  // birth_date 规范化
  let bd = (n?.birth_date || '') + '';
  if (bd) {
    const m = bd.match(/^(\d{4})-(\d{1,2})(-(\d{1,2}))?$/);
    if (m) {
      const y = m[1]; const mo = m[2].padStart(2, '0');
      bd = m[4] ? `${y}-${mo}-${m[4].padStart(2, '0')}` : `${y}-${mo}-01`;
    } else {
      const m2 = (n?.birth_date || '').match(/(\d{4})/);
      if (m2) bd = `${m2[1]}-01-01`; else bd = '';
    }
  }

  // 归类统计（bd 在上面已初始化）
  if (n?.debut_year) debutFromInfobox++;
  else if (bd) debutFromBirth++;
  else if (decadeMap[row.name] && decadeMap[row.name].match(/\d{4}/)) debutFromDecade++;
  else debutStillNull++;

  updateSeiyuu.run(
    (n?.romaji || '').slice(0, 128),
    (n?.birth_place || '').slice(0, 64),
    (n?.agency || '').slice(0, 128),
    bd || null,
    debutYear,
    JSON.stringify(reps),
    JSON.stringify(groups),
    row.id,
  );
  updated++;
}
console.log(`\nUPDATE ${updated} 行`);
console.log(`出道年来源: infobox=${debutFromInfobox} birth+18=${debutFromBirth} decade=${debutFromDecade}兜底=${debutStillNull}`);

// ========== 难度重分配 ==========
console.log('\n=== 难度重分配 ===');

// 1. 清理所有旧难度
db.exec('DELETE FROM player_difficulties');

// 定义五大企划 → 难度 key
const FIVE_TO_DIFF: Record<string, string> = {
  'LoveLive!': 'lovelive',
  '偶像大师系列': 'idolmaster',
  '赛马娘 Pretty Derby': 'umamusume',
  'BanG Dream!（邦邦）': 'bangdream',
  '少女歌剧 Revue Starlight': 'revuestarlight',
};

const insertDiff = db.prepare('INSERT OR IGNORE INTO player_difficulties (player_id, difficulty_key) VALUES (?, ?)');

// 先给所有声优加入 normal 难度
const allEnabled = db.prepare(`SELECT id, name, five_groups, groups, agency, representative_characters
  FROM seiyuus WHERE is_enabled=1`).all() as any[];

for (const s of allEnabled) insertDiff.run(s.id, 'normal');

// 给五大企划相关声优加企划难度
let fiveAssign = 0;
for (const s of allEnabled) {
  const five: string[] = JSON.parse(s.five_groups || '[]');
  for (const f of five) {
    const dk = FIVE_TO_DIFF[f];
    if (dk) { insertDiff.run(s.id, dk); fiveAssign++; }
  }
}
console.log(`五大企划难度分配: ${fiveAssign} 条`);

// ========== 定义 beginner = 热门常见女声优 ==========
// 判定标准（满足任一）：
// A. 事务所为头部大所（青二、81Produce、大泽、I'm Enterprise、Sigma Seven、贤Pro、Arts Vision、VIMS、响、Mausu、Stardust 等）
// B. 代表角色 >= 10 条 且 事务所非空
// C. 属于五大企划且在五大企划里有 >= 3 个代表角色 （主要企划声优）
const HEAD_AGENCIES = [
  '青二', '81', '大泽', "I'm Enterprise", 'I’m Enterprise', 'Im Enterprise',
  'Sigma Seven', 'シグマ・セブン',
  '贤Production', '贤Pro', '贤プロダクション',
  'Arts Vision', 'アーツビジョン',
  'VIMS', 'ヴィムス',
  '响', 'HiBiKi', 'ひびき',
  'Mausu Promotion', 'マウスプロモーション',
  'Stardust', 'スターダスト',
  'Office Osawa',
  '东映',
  'TMS',
  '东京俳优生活协同组合', '俳协',
  'Production Baobab', 'Baobab',
  'シンクチュー', 'THREE TREE', 'ThinkTech',
  'Stay Luck',
  'Remax',
];

function isHeadAgency(agency: string): boolean {
  if (!agency) return false;
  return HEAD_AGENCIES.some((a) => agency.includes(a));
}

function fiveGroupRepCount(s: any): Record<string, number> {
  const reps: any[] = JSON.parse(s.representative_characters || '[]');
  const five: string[] = JSON.parse(s.five_groups || '[]');
  const res: Record<string, number> = {};
  for (const fg of five) {
    const re: RegExp = {
      'LoveLive!': /LoveLive!?|ラブライブ!|Liella!|Aqours|μ's|ニジガク|Superstar|虹咲|莲之空|ハスノソラ/i,
      'BanG Dream!（邦邦）': /BanG\s*Dream|バンドリ!|MyGO|Ave\s*Mujica|Roselia|Poppin|Afterglow|パスパレ|ハロハピ|モルフォニカ|RAS|Raise\s*A\s*Suilen/i,
      '偶像大师系列': /偶像大师|Idol\s*Master|アイドルマスター|THE\s*IDOLM@STER|百万现场|闪耀色彩|灰姑娘|ミリオン|シンデレラ|シャイニー|SideM|学マス/i,
      '赛马娘 Pretty Derby': /赛马娘|ウマ娘|Pretty\s*Derby|トレセン/i,
      '少女歌剧 Revue Starlight': /少女歌剧|Revue\s*Starlight|レヴュースタァライト|九九組/i,
    }[fg] || /__no__/;
    for (const r of reps) {
      const blob = `${r.work || ''} ${r.character || ''}`;
      if (re.test(blob)) res[fg] = (res[fg] || 0) + 1;
    }
  }
  return res;
}

const beginnerSet = new Set<number>();
const easySet = new Set<number>();

// 手动定义的热门声优（知名 + 五大企划主力）
const MANUAL_BEGINNER = new Set([
  '花泽香菜', '悠木碧', '早见沙织', '钉宫理惠', '水树奈奈', '堀江由衣', '田村由香里', '林原惠美',
  '户松遥', '泽城美雪', '丰崎爱生', '佐藤聪美', '寿美菜子', '竹达彩奈', '日笠阳子', '石原夏织',
  '小仓唯', '小仓唯', '日高里菜', '上坂堇', '内田真礼', '雨宫天', '赤崎千夏', '三森铃子',
  '楠田亚衣奈', '南条爱乃', '德井青空', '三上枝织', '大坪由佳', '大桥彩香', '茅野爱衣',
  '井口裕香', '小岩井小鸟', '金元寿子', '松井惠理子', '东山奈央', '种田梨沙', '濑户麻沙美',
  '三泽纱千香', '洲崎绫', '内田彩', '饭田里穗', '久保由利香', '高垣彩阳',
  '高桥李依', '本渡枫', '小原好美', '鬼头明里', '水濑祈', '绪方惠美',
  '松冈由贵', '桑谷夏子', '野中蓝', '白石凉子', '小林优', '中原麻衣', '雪野五月',
  '高桥美佳子', '丰口惠美', '浅川悠', '川澄绫子', '能登麻美子',
  // 五大企划主力
  '新田惠海', '内田彩', '三森铃子', '南条爱乃', '楠田亚衣奈', '饭田里穗', 'Pile', '德井青空', '久保由利香',
  '伊波杏树', '逢田梨香子', '诹访奈奈香', '小宫有纱', '齐藤朱夏', '小林爱香', '高槻加奈子', '铃木爱奈', '降幡爱',
  '矢野妃菜喜', '大西亚玖璃', '相良茉优', '村上奈津实', '田中千惠美', '前田佳织里', '指出毬亚', '矢野优美华',
  '小泉萌香', '林鼓子', '佐藤日向', '妃奈',
  '青山渚', '铃原希实', '大熊和奏', '薮岛朱音', '绘森彩', '结那', '坂仓花', '结木由奈',
  '爱美', '佐佐木未来', '大桥彩香', '大冢纱英', '西本里美', '小原莉子', '夏芽',
  'Raychell', '小原莉子', '工藤晴香', '中岛由贵', '志崎桦音', '进藤天音', 'mika',
  '立石凛', '青木阳菜', '小日向美香', '林鼓子', '要乐奈', '千早爱音',
  '中村绘里子', '今井麻美', '原纱友里', '浅仓杏美', '沼仓爱美', '山崎遥', '木户衣吹',
  '大桥彩香', '福原绫香', '藤田茜', '洲崎绫', '牧野由依',
  '和气杏未', '高野麻里佳', '高桥未奈美', '上田瞳', '大西沙织',
]);

for (const s of allEnabled) {
  const reps: any[] = JSON.parse(s.representative_characters || '[]');
  const five: string[] = JSON.parse(s.five_groups || '[]');
  const repCount = reps.length;

  // 条件 A: 头部事务所
  let okHead = isHeadAgency(s.agency) && repCount >= 6;
  // 条件 B: 代表角色很多
  let okRep = repCount >= 12 && s.agency !== '';
  // 条件 C: 五大企划主力声优（企划内代表角色多）
  const fgCnt = fiveGroupRepCount(s);
  let okFive = Object.values(fgCnt).some((c) => c >= 3);
  // 条件 D: 手动热门名单
  let okManual = MANUAL_BEGINNER.has(s.name);

  if (okHead || okRep || okFive || okManual) {
    beginnerSet.add(s.id);
  }

  // easy = beginner ∪ 五大企划所有声优
  if (beginnerSet.has(s.id) || five.length > 0) {
    easySet.add(s.id);
  }
}

// 写入 beginner 和 easy
for (const id of beginnerSet) insertDiff.run(id, 'beginner');
for (const id of easySet) insertDiff.run(id, 'easy');

console.log(`beginner 难度: ${beginnerSet.size} 人`);
console.log(`easy 难度: ${easySet.size} 人 (beginner ∪ 五大企划)`);

// 验证
console.log('\n=== 验证 ===');
const diffFinal = db.prepare(`SELECT difficulty_key, COUNT(*) AS c FROM player_difficulties
  GROUP BY difficulty_key ORDER BY difficulty_key`).all() as any[];
for (const r of diffFinal) console.log(`  ${r.difficulty_key}: ${r.c}人`);

const nullNow = (db.prepare('SELECT COUNT(*) AS c FROM seiyuus WHERE debut_year IS NULL').get() as any).c;
const noAgency = (db.prepare("SELECT COUNT(*) AS c FROM seiyuus WHERE agency=''").get() as any).c;
console.log(`\ndebut_year null: ${nullNow}`);
console.log(`agency 为空: ${noAgency}`);

// 知名声优验证
const names = ['花泽香菜', '悠木碧', '早见沙织', '钉宫理惠', '水树奈奈', '上坂堇', '立石凛', '大熊和奏', '堀江由衣', '种田梨沙'];
const ph = names.map(() => '?').join(',');
const rs = db.prepare(`SELECT name, agency, birth_date, debut_year, groups, five_groups, json_array_length(representative_characters) AS rep_cnt FROM seiyuus WHERE name IN (${ph})`).all(...names) as any[];
console.log('\n知名声优:');
for (const r of rs) {
  const diffs = (db.prepare('SELECT difficulty_key FROM player_difficulties WHERE player_id=?').all(r.id) as any[]).map(x => x.difficulty_key).join(',');
  console.log(`  ${r.name}: agency=${r.agency} birth=${r.birth_date} debut=${r.debut_year} groups=${r.groups} rep=${r.rep_cnt} five=${r.five_groups} diffs=(${diffs})`);
}
// 检查 beginner 是否包含全部
const beginNames = db.prepare(`SELECT name FROM seiyuus s
  INNER JOIN player_difficulties d ON s.id=d.player_id AND d.difficulty_key='beginner'
  ORDER BY s.name`).all() as any[];
console.log(`\nbeginner 声优名单（前50个）:`);
for (let i = 0; i < Math.min(50, beginNames.length); i++) {
  process.stdout.write(beginNames[i].name + (i % 5 === 4 ? '\n' : '、'));
}
console.log();

db.close();
try {
  fs.utimesSync(path.resolve(__dirname, '../src/db/schema.ts'), new Date(), new Date());
} catch (e) { /* ignore */ }
console.log('\n✅ 完成');
