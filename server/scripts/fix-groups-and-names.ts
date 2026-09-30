/**
 * 修复脚本:
 * 1. 对 five_groups 非空的声优,从 representative_characters 重新推断 groups(子团体)
 *    - 使用作品名映射(Superstar→Liella!, Sunshine→Aqours 等)
 *    - 使用角色名映射(包含日文角色名,如 澁谷かのん→Liella!)
 * 2. 修复被中文名覆盖的拉丁字母名声优(如 Liyuu 被存为"黎狱")
 * 3. 从旧 DB(seiyuu-guess.sqlite3)迁移 groups 数据(萌娘百科来源,更准确)
 * 4. 统计五大企划人数和 groups 覆盖率
 */
import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(__dirname, '..', 'data', 'seiyuu-bangumi.sqlite3');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

// ========== 角色名 → 团体映射(含日文角色名) ==========
const CHAR_TO_GROUP: Array<{ group: string; chars: RegExp }> = [
  { group: "μ's", chars: /高坂穂乃果|高坂穗乃果|絢瀬絵里|绚濑绘里|南ことり|南小鸟|南琴梨|園田海未|园田海未|星空凛|西木野真姫|西木野真姬|小泉花陽|小泉花阳|矢澤にこ|矢泽妮可/i },
  { group: 'Aqours', chars: /高海千歌|桜内梨子|松浦果南|黒澤ダイヤ|黑泽黛雅|渡辺曜|渡边曜|津島善子|津岛善子|国木田花丸|小原鞠莉|黒澤ルビィ|黑泽露比/i },
  { group: '虹咲学园学园偶像同好会', chars: /上原歩夢|上原步梦|中須かなみ|中须霞|桜坂雫|朝香果林|宮下愛|宫下爱|近江彼方|優木せつ菜|优木雪菜|エマ・ヴェールド|艾玛·维尔德|天王寺璃奈|三船栞子|ミア・テイラー|米娅·泰勒|鐘嵐珠|钟岚珠/i },
  { group: 'Liella!', chars: /澁谷かのん|涩谷香音|唐可可|嵐千砂都|岚千砂都|平安名すみれ|平安名堇|葉月恋|叶月恋|桜小路きな子|樱小路希奈子|若菜四季|米女メイ|米女芽衣|藪島朱音|薮岛朱音|鬼塚夏美|ウィーン・マーガレット|维恩·玛格丽特|百田凛|鬼塚冬毬/i },
  { group: '莲之空女学院学园偶像俱乐部', chars: /日野下花帆|安養寺姫芽|安养寺姬芽|狮子神利架|百生吟子|夕霧綴理|夕雾缀理|大澤瑠璃乃|大泽瑠璃乃|藤島慈|藤岛慈|村野さやか|村野沙耶香|出雲咲姫|出云咲姬|花岡夢羽|花冈梦羽|伊戸井十重|伊户井十重|安積永夢|安积永梦|東悠|东悠|村浦かずさ|若柳セリオ/i },
];

// ========== 作品名 → 团体映射 ==========
const WORK_TO_GROUP: Array<{ group: string; pattern: RegExp }> = [
  // LoveLive! 子团体
  { group: "μ's", pattern: /μ'?s|缪斯|ミューズ|LoveLive![^\w]*$/i },
  { group: 'Aqours', pattern: /Aqours|アクア|Sunshine|サンシャイン/i },
  { group: '虹咲学园学园偶像同好会', pattern: /虹咲|ニジガク|nijigasaki|同好会|Nijigasaki/i },
  { group: 'Liella!', pattern: /Liella!|リエラ|Superstar|スーパースター/i },
  { group: '莲之空女学院学园偶像俱乐部', pattern: /莲之空|ハスノソラ|蓮ノ空/i },
  { group: 'Sunny Passion', pattern: /Sunny\s*Passion/i },
  { group: '学园偶像音乐剧', pattern: /学マイ|学園アイドルミュージカル|Gakuen.*Musical/i },
  // BanG Dream! 子团体
  { group: "Poppin'Party", pattern: /Poppin\s*Party|ポッピンパーティ|ポピパ/i },
  { group: 'Afterglow', pattern: /Afterglow|アフターグロー/i },
  { group: 'Pastel＊Palettes', pattern: /Pastel[\s＊]*Palettes?|パスパレ/i },
  { group: 'Roselia', pattern: /Roselia|ロゼリア/i },
  { group: 'Hello, Happy World!', pattern: /Hello,?\s*Happy\s*World|ハロハピ/i },
  { group: 'Morfonica', pattern: /Morfonica|モルフォニカ/i },
  { group: 'RAISE A SUILEN', pattern: /RAISE\s*A\s*SUILEN|\bRAS\b/i },
  { group: 'MyGO!!!!!', pattern: /MyGO|マイゴ/i },
  { group: 'Ave Mujica', pattern: /Ave\s*Mujica|アウェムヒカ/i },
  { group: 'CRYCHIC', pattern: /CRYCHIC/i },
  // 偶像大师子团体
  { group: '765PRO ALLSTARS', pattern: /765\s*PRO|765プロ|765production|765\s*ALLSTARS/i },
  { group: 'Cinderella Girls', pattern: /Cinderella|灰姑娘|シンデレラ/i },
  { group: 'Million Live!', pattern: /Million\s*Live|百万现场|ミリオン/i },
  { group: 'Shiny Colors', pattern: /Shiny\s*Colors|闪耀色彩|シャイニーカラーズ/i },
  { group: 'SideM', pattern: /SideM|サイドエム/i },
  { group: '学园偶像大师', pattern: /学園アイドルマスター|学マス|Gakuen.*Idol.*Master/i },
  // 赛马娘
  { group: 'トレセン学園', pattern: /ウマ娘|トレセン学園|特雷森学园|赛马娘|Pretty\s*Derby/i },
  // 少女歌剧
  { group: '九九组', pattern: /少女歌剧|レヴュースタァライト|九九組|Revue\s*Starlight/i },
];

// ========== 名字修复表 ==========
const NAME_FIXES: Record<string, string> = {
  '黎狱': 'Liyuu',
};

// ========== 名字 → 团体映射(代表角色列表不包含相关角色时,用名字补充) ==========
const NAME_GROUP_HINTS: Record<string, string[]> = {
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
  // 其他已知团体声优(代表角色列表未覆盖)
  '南条爱乃': ["μ's"],
};

function inferGroups(repChars: { work: string; character: string }[], name?: string): string[] {
  const groupsSet = new Set<string>();
  const blob = repChars.map((r) => `${r.work} ${r.character}`).join(' ');
  // 作品名映射
  for (const rule of WORK_TO_GROUP) {
    if (rule.pattern.test(blob)) groupsSet.add(rule.group);
  }
  // 角色名映射
  for (const rule of CHAR_TO_GROUP) {
    if (rule.chars.test(blob)) groupsSet.add(rule.group);
  }
  // 名字 → 团体映射(代表角色列表未覆盖时的兜底)
  if (name && NAME_GROUP_HINTS[name]) {
    for (const g of NAME_GROUP_HINTS[name]) groupsSet.add(g);
  }
  return [...groupsSet];
}

function main() {
  // === 统计修复前 ===
  const before = db.prepare(
    `SELECT COUNT(*) as total,
     SUM(CASE WHEN groups IS NOT NULL AND groups != '[]' AND groups != '' THEN 1 ELSE 0 END) as has_groups
     FROM seiyuus`
  ).get() as any;
  console.log(`修复前: 总 ${before.total} 人, 有 groups ${before.has_groups} 人 (${(before.has_groups / before.total * 100).toFixed(1)}%)`);

  // === 1. 修复 groups ===
  const rows = db.prepare(
    `SELECT id, name, representative_characters, groups, five_groups FROM seiyuus
     WHERE five_groups IS NOT NULL AND five_groups != '[]' AND five_groups != ''`
  ).all() as any[];

  console.log(`\n五大企划声优数: ${rows.length}`);

  const updateGroups = db.prepare('UPDATE seiyuus SET groups = ? WHERE id = ?');
  let fixed = 0;
  let added = 0;

  for (const row of rows) {
    const repChars: { work: string; character: string }[] = JSON.parse(row.representative_characters || '[]');
    const currentGroups: string[] = JSON.parse(row.groups || '[]');
    const inferred = inferGroups(repChars, row.name);

    // 合并:保留已有的,加入新推断的
    const merged = new Set<string>([...currentGroups, ...inferred]);
    const newGroups = [...merged];

    if (new Set(newGroups).size > new Set(currentGroups).size) {
      updateGroups.run(JSON.stringify(newGroups), row.id);
      fixed++;
      added += newGroups.length - currentGroups.length;
    }
  }
  console.log(`groups 修复: ${fixed} 人更新, 新增 ${added} 个团体标记`);

  // === 2. 修复名字 ===
  const updateName = db.prepare('UPDATE seiyuus SET name = ?, romaji = ? WHERE name = ?');
  let nameFixed = 0;
  for (const [oldName, newName] of Object.entries(NAME_FIXES)) {
    const result = updateName.run(newName, newName, oldName);
    if (result.changes > 0) {
      console.log(`名字修复: "${oldName}" → "${newName}" (${result.changes} 条)`);
      nameFixed += result.changes;
    }
  }
  if (nameFixed === 0) console.log('名字修复: 无需修复');

  // === 3. 从旧 DB 迁移 groups ===
  const OLD_DB_PATH = path.join(__dirname, '..', 'data', 'seiyuu-guess.sqlite3');
  let oldMigrated = 0;
  try {
    const oldDb = new Database(OLD_DB_PATH, { readonly: true });
    const oldRows = oldDb.prepare(
      `SELECT name, groups FROM seiyuus WHERE groups IS NOT NULL AND groups != '[]' AND groups != ''`
    ).all() as any[];
    console.log(`\n旧 DB 有 groups 的声优: ${oldRows.length} 人`);

    const mergeStmt = db.prepare('UPDATE seiyuus SET groups = ? WHERE name = ? AND (groups = ? OR groups = ? OR groups = ?)');
    for (const old of oldRows) {
      const oldGroups: string[] = JSON.parse(old.groups);
      if (!oldGroups.length) continue;
      // 查新 DB 中同名声优的当前 groups
      const newRow = db.prepare('SELECT id, groups FROM seiyuus WHERE name = ?').get(old.name) as any;
      if (!newRow) continue;
      const currentGroups: string[] = JSON.parse(newRow.groups || '[]');
      const merged = [...new Set([...currentGroups, ...oldGroups])];
      if (merged.length > currentGroups.length) {
        db.prepare('UPDATE seiyuus SET groups = ? WHERE id = ?').run(JSON.stringify(merged), newRow.id);
        oldMigrated++;
      }
    }
    oldDb.close();
    console.log(`旧 DB groups 迁移: ${oldMigrated} 人更新`);
  } catch (e) {
    console.log(`旧 DB 迁移跳过: ${e instanceof Error ? e.message : e}`);
  }

  // === 4. 统计修复后 ===
  const after = db.prepare(
    `SELECT COUNT(*) as total,
     SUM(CASE WHEN groups IS NOT NULL AND groups != '[]' AND groups != '' THEN 1 ELSE 0 END) as has_groups
     FROM seiyuus`
  ).get() as any;
  console.log(`\n修复后: 总 ${after.total} 人, 有 groups ${after.has_groups} 人 (${(after.has_groups / after.total * 100).toFixed(1)}%)`);

  // === 4. 五大企划人数统计 ===
  console.log('\n=== 五大企划人数 ===');
  const fiveGroupsList = ['LoveLive!', 'BanG Dream!（邦邦）', '偶像大师系列', '赛马娘 Pretty Derby', '少女歌剧 Revue Starlight'];
  for (const fg of fiveGroupsList) {
    const count = db.prepare(
      `SELECT COUNT(*) FROM seiyuus WHERE five_groups LIKE ?`
    ).get(`%${fg}%`) as any;
    const hasGroups = db.prepare(
      `SELECT COUNT(*) FROM seiyuus WHERE five_groups LIKE ? AND groups IS NOT NULL AND groups != '[]' AND groups != ''`
    ).get(`%${fg}%`) as any;
    console.log(`  ${fg}: ${count['COUNT(*)']} 人 (有子团体 ${hasGroups['COUNT(*)']} 人)`);
  }

  // === 5. LoveLive! 子团体明细 ===
  console.log('\n=== LoveLive! 子团体分布 ===');
  const llRows = db.prepare(
    `SELECT name, groups FROM seiyuus WHERE five_groups LIKE '%LoveLive!%' ORDER BY name`
  ).all() as any[];
  const llGroupCount: Record<string, number> = {};
  let llNoGroup = 0;
  for (const r of llRows) {
    const groups: string[] = JSON.parse(r.groups || '[]');
    if (groups.length === 0) { llNoGroup++; continue; }
    for (const g of groups) {
      llGroupCount[g] = (llGroupCount[g] || 0) + 1;
    }
  }
  for (const [g, c] of Object.entries(llGroupCount).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${g}: ${c} 人`);
  }
  console.log(`  (无子团体): ${llNoGroup} 人`);

  // === 6. 验证伊达小百合 ===
  const sayuri = db.prepare('SELECT name, groups, five_groups FROM seiyuus WHERE name LIKE ? OR name LIKE ?').get('%伊达小百合%', '%伊達小百合%') as any;
  if (sayuri) {
    console.log(`\n=== 验证: 伊达小百合 ===`);
    console.log(`  name: ${sayuri.name}`);
    console.log(`  groups: ${sayuri.groups}`);
    console.log(`  five_groups: ${sayuri.five_groups}`);
  }

  // === 7. 验证 Liyuu ===
  const liyuu = db.prepare('SELECT id, name, romaji, groups, five_groups FROM seiyuus WHERE name = ? OR name = ?').get('Liyuu', '黎狱') as any;
  if (liyuu) {
    console.log(`\n=== 验证: Liyuu ===`);
    console.log(`  id: ${liyuu.id}, name: ${liyuu.name}, romaji: ${liyuu.romaji}`);
    console.log(`  groups: ${liyuu.groups}, five_groups: ${liyuu.five_groups}`);
    // 如果 Liyuu 有 LoveLive 代表角色但 five_groups 为空,补上
    if (!liyuu.five_groups || liyuu.five_groups === '[]') {
      console.log('  ⚠ Liyuu 的 five_groups 为空,需要检查');
    }
  }

  db.close();
  console.log('\n修复完成!');
}

main();
