/**
 * ============================================================
 *  声优数据库重建 - 总控脚本（串联 1 + 2 + 3）
 * ============================================================
 *
 *  使用方法：cd server && npx tsx scripts/rebuild-all.ts
 *  输出：    data/seiyuu-rebuild.sqlite3（全新 DB，不覆盖原 seiyuu-bangumi.sqlite3）
 *  切换方法：验证 OK 后，在 .env 里把 DB_URL 改成 ./data/seiyuu-rebuild.sqlite3
 *
 *  设计原则（详见各子脚本文件头注释）：
 *    【步骤1 import-bangumi-clean】 Bangumi dump + 萌娘白名单，只存真实 infobox 值
 *        ❌ 删除：debut_year 作品年-1 / 出生年+18 / 兜底1995
 *        ❌ 删除：birth_date 补 1900 / 补 01-01
 *        ❌ 删除：five_groups / groups 从作品名正则匹配 → 全部 []
 *        ✅ 保留：代表角色 + 配音数 + 二游代表作 + 难度池 beginner/easy（按事务所/角色数）
 *
 *    【步骤2 enrich-groups-manifest】 团体 & 五大企划（声优本人属性 ONLY）
 *        ✅ 来源 A：full-seiyuu-data.json 萌娘 infobox 的「所属团体」字段
 *        ✅ 来源 B：PROJECT_MANIFEST 硬编码五大企划团体 × 声优名单（手动维护权威白名单）
 *        ❌ 绝对禁止：从作品名/角色名正则匹配
 *        ✅ 补：五大企划专项难度（lovelive/bangdream/...）& easy 追加（五大企划声优）
 *
 *    【步骤3 enrich-basics-from-moegirl】 基础属性（萌娘 infobox > Bangumi infobox）
 *        ✅ 覆盖字段：romaji, agency, birth_place, birth_date, debut_year
 *        ❌ 萌娘没有/不合法 → 保持 Bangumi 原值（即使 NULL 也不推算）
 * ============================================================
 */
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';
import Database from 'better-sqlite3';

const SERVER_DIR = path.resolve(__dirname, '..');
const OUT_DB = path.resolve(SERVER_DIR, 'data/seiyuu-rebuild.sqlite3');
const SCRIPTS = [
  'scripts/import-bangumi-clean.ts',
  'scripts/enrich-groups-manifest.ts',
  'scripts/enrich-basics-from-moegirl.ts',
] as const;

function runStep(tsRel: string, stepIdx: number, totalSteps: number) {
  const tag = `\n========== 步骤 ${stepIdx}/${totalSteps} · ${path.basename(tsRel)} ==========`;
  console.log(tag);
  const start = Date.now();
  try {
    execSync(`npx tsx "${tsRel}"`, { cwd: SERVER_DIR, stdio: 'inherit', timeout: 30 * 60 * 1000 });
  } catch (e: any) {
    console.error(`\n❌ ${tsRel} 执行失败，中断重建。错误：`, e.message);
    process.exit(1);
  }
  console.log(`  ⏱  耗时 ${((Date.now() - start) / 1000).toFixed(1)}s`);
}

function printHeader() {
  const total = SCRIPTS.length;
  console.log('\n' + '═'.repeat(80));
  console.log(`🎯 声优数据库重建总控（${total} 步）→ ${OUT_DB}`);
  console.log('═'.repeat(80));
  console.log('注意：本脚本绝不覆盖 ./data/seiyuu-bangumi.sqlite3，输出到 seiyuu-rebuild.sqlite3\n');
}

// ============================================================
//  最终断言报告（重建全部完成后再跑一遍，汇总输出）
// ============================================================
function finalAuditReport() {
  console.log('\n' + '═'.repeat(80));
  console.log('📋 最终审计报告（seiyuu-rebuild.sqlite3）');
  console.log('═'.repeat(80));
  const db = new Database(OUT_DB);
  db.pragma('journal_mode = WAL');
  const total = (db.prepare('SELECT COUNT(*) c FROM seiyuus').get() as any).c;

  // --- 1. 团体错误（旧DB的核心问题）反向校验 ---
  console.log('\n【1. 团体错配修复检查（核心断言）】');
  const badCases: Array<[string, string, string]> = [
    // [声优中文名, 不应属于的 five_groups key, 不应属于的 groups key]
    ['大原沙耶香', 'BanG Dream!（邦邦）', 'Ave Mujica'],
    ['大原沙耶香', 'BanG Dream!（邦邦）', "Poppin'Party"],
    ['由加奈', 'LoveLive!', '虹咲学园学园偶像同好会'],
    ['野上尤加奈', 'LoveLive!', '虹咲学园学园偶像同好会'],
    ['能登麻美子', '赛马娘 Pretty Derby', 'トレセン学園'],
    ['名冢佳织', '少女歌剧 Revue Starlight', '九九组'],
    ['田中敦子（声优）', '偶像大师系列', 'Cinderella Girls'],
    ['田中敦子', '偶像大师系列', 'Cinderella Girls'],
    ['三石琴乃', 'LoveLive!', "μ's"],
    ['矢岛晶子', 'LoveLive!', 'Aqours'],
  ];
  let badFails = 0;
  for (const [name, badFive, badGroup] of badCases) {
    const row = db.prepare(`SELECT name, five_groups, groups FROM seiyuus WHERE name=?`).get(name) as any;
    if (!row) { console.log(`  ⚠️  DB 中未找到: ${name}（跳过）`); continue; }
    const fg: string[] = JSON.parse(row.five_groups || '[]');
    const gs: string[] = JSON.parse(row.groups || '[]');
    if (fg.includes(badFive)) {
      console.log(`  ❌ FAIL: ${name} five_groups 仍包含【${badFive}】→ 团体错配未修复！`);
      badFails++;
    }
    if (gs.includes(badGroup)) {
      console.log(`  ❌ FAIL: ${name} groups 仍包含【${badGroup}】→ 团体错配未修复！`);
      badFails++;
    }
  }
  // 正确的正向案例
  const okCases: Array<[string, string, string]> = [
    ['南条爱乃', 'LoveLive!', "μ's"],
    ['三森铃子', 'LoveLive!', "μ's"],
    ['爱美', 'BanG Dream!（邦邦）', "Poppin'Party"],
    ['伊藤彩沙', 'BanG Dream!（邦邦）', "Poppin'Party"],
    ['伊藤彩沙', '少女歌剧 Revue Starlight', '九九组'],
    ['佐藤日向', '少女歌剧 Revue Starlight', '九九组'],
    ['林鼓子', 'LoveLive!', '虹咲学园学园偶像同好会'],
    ['法元明菜', 'LoveLive!', '虹咲学园学园偶像同好会'],
    ['和气杏未', '赛马娘 Pretty Derby', 'トレセン学園'],
    ['中村绘里子', '偶像大师系列', '765PRO ALLSTARS'],
    // BanG Dream 修正后声优
    ['佐佐木李子', 'BanG Dream!（邦邦）', 'Ave Mujica'],
    ['羊宫妃那', 'BanG Dream!（邦邦）', 'MyGO!!!!!'],
    // PJSK
    ['降幡爱', '世界计划', 'MORE MORE JUMP!'],
    ['佐藤日向', '世界计划', '25时、Nightcord de.'],
  ];
  let okFails = 0;
  for (const [name, wantFive, wantGroup] of okCases) {
    const row = db.prepare(`SELECT name, five_groups, groups FROM seiyuus WHERE name=?`).get(name) as any;
    if (!row) { console.log(`  ⚠️  DB 中未找到: ${name}（跳过）`); continue; }
    const fg: string[] = JSON.parse(row.five_groups || '[]');
    const gs: string[] = JSON.parse(row.groups || '[]');
    if (!fg.includes(wantFive)) {
      console.log(`  ❌ FAIL: ${name} five_groups 应含【${wantFive}】实际 ${row.five_groups}`);
      okFails++;
    }
    if (!gs.includes(wantGroup)) {
      console.log(`  ❌ FAIL: ${name} groups 应含【${wantGroup}】实际 ${row.groups}`);
      okFails++;
    }
  }
  if (badFails + okFails === 0) console.log('  ✅ 20+ 核心团体断言 全部通过！');
  else console.log(`  ⚠️  失败：团体错配=${badFails} 个，正向归属=${okFails} 个`);

  // --- 2. 臆造数据检查 ---
  console.log('\n【2. 禁止臆造 全局检查】');
  const debutNull = (db.prepare('SELECT COUNT(*) c FROM seiyuus WHERE debut_year IS NULL').get() as any).c;
  const birthNull = (db.prepare("SELECT COUNT(*) c FROM seiyuus WHERE birth_date IS NULL OR birth_date=''").get() as any).c;
  // 之前臆造的 debut_year=1995 有 81 人（大量集中），验证现在不再集中于某一年
  const byYear = db.prepare(`SELECT debut_year, COUNT(*) c FROM seiyuus WHERE debut_year IS NOT NULL GROUP BY debut_year ORDER BY c DESC LIMIT 5`).all() as any[];
  console.log(`  debut_year 空: ${debutNull} (${(100 * debutNull / total).toFixed(1)}%) → 允许空，不兜底`);
  console.log(`  birth_date 空: ${birthNull} (${(100 * birthNull / total).toFixed(1)}%) → 允许空，不补 01-01/1900`);
  console.log(`  出道年前5分布（不应某一年奇高，比如旧版1995=81人集中）：`);
  for (const r of byYear) console.log(`    ${r.debut_year}: ${r.c} 人`);
  const birth1900 = (db.prepare("SELECT COUNT(*) c FROM seiyuus WHERE substr(birth_date,1,4)='1900'").get() as any).c;
  console.log(`  birth_date=1900（补年臆造）: ${birth1900}  —— 期望 = 0 ✅`);

  // --- 3. 难度池 & 声优总数 ---
  console.log('\n【3. 难度池分布】');
  const diffs = db.prepare(`SELECT difficulty_key, COUNT(*) c FROM player_difficulties GROUP BY difficulty_key ORDER BY difficulty_key`).all() as any[];
  for (const d of diffs) console.log(`  ${d.difficulty_key.padEnd(20)}: ${String(d.c).padStart(6)}人`);
  console.log(`\n【4. 声优总数】 ${total} 人`);

  // --- 5. 二游覆盖（用户核心需求） ---
  const gvc0 = (db.prepare('SELECT COUNT(*) c FROM seiyuus WHERE game_voice_count=0').get() as any).c;
  const gvcAvg = (db.prepare('SELECT AVG(game_voice_count*1.0) a FROM seiyuus').get() as any).a;
  const vcAvg = (db.prepare('SELECT AVG(voice_count*1.0) a FROM seiyuus').get() as any).a;
  console.log(`\n【5. 二游配音覆盖率】`);
  console.log(`  game_voice_count>0: ${total - gvc0} / ${total} (${(100 * (total - gvc0) / total).toFixed(1)}%)`);
  console.log(`  平均总配音数 voice_count: ${vcAvg.toFixed(1)}`);
  console.log(`  平均游戏配音数 game_voice_count: ${gvcAvg.toFixed(1)}`);

  // --- 6. 小队 sub_groups 检查 ---
  console.log('\n【6. 小队(sub_groups)检查】');
  const subCases: Array<[string, string]> = [
    ['新田惠海', 'Printemps'],
    ['南条爱乃', 'BiBi'],
    ['德井青空', 'BiBi'],
    ['三森铃子', 'lily white'],
    ['降幡爱', 'CYaRon!'],
    ['降幡爱', 'YYY'],
    ['大西亚玖璃', 'A·ZU·NA'],
    ['伊达小百合', 'CatChu!'],
    ['榆井希实', 'Cerise Bouquet'],
    ['绫咲穗音', 'CHAKI!'],
  ];
  let subFails = 0;
  for (const [name, wantSub] of subCases) {
    const row = db.prepare(`SELECT sub_groups FROM seiyuus WHERE name=?`).get(name) as any;
    if (!row) { console.log(`  ⚠️  DB 中未找到: ${name}`); continue; }
    const sg: string[] = JSON.parse(row.sub_groups || '[]');
    if (!sg.includes(wantSub)) { console.log(`  ❌ ${name} sub_groups 应含【${wantSub}】，实际 ${row.sub_groups}`); subFails++; }
  }
  if (subFails === 0) console.log('  ✅ 小队断言全部通过！');

  db.close();
  console.log('\n' + '═'.repeat(80));
  console.log(`🎉 重建完成！DB 路径：${OUT_DB}`);
  console.log('═'.repeat(80));

  // 自动导出 Excel 校对表
  console.log('\n📦 导出 Excel 校对表...');
  try {
    execSync('npx tsx scripts/export-audit-xlsx.ts', { cwd: SERVER_DIR, stdio: 'inherit', timeout: 60 * 1000 });
  } catch (e: any) {
    console.error('  ⚠️ Excel 导出失败:', e.message);
  }

  console.log('\n验证方法：');
  console.log('  1. 打开 server/data/seiyuu-audit.xlsx 校对数据');
  console.log('  2. 临时切换：在 server/.env 里把 DB_URL=./data/seiyuu-rebuild.sqlite3');
  console.log('  3. pnpm dev 启动服务，刷新游戏');
  console.log('  4. 彻底切换（确认OK后）：把 seiyuu-rebuild.sqlite3 重命名为 seiyuu-bangumi.sqlite3 覆盖，恢复 DB_URL 原值');
}

// ============================================================
//  主流程
// ============================================================
printHeader();
SCRIPTS.forEach((s, i) => runStep(s, i + 1, SCRIPTS.length));
finalAuditReport();
process.exit(0);
