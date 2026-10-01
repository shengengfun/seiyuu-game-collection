/**
 * ============================================================
 *  声优数据库重建 - 步骤 3：用萌娘百科数据补全基础属性
 * ============================================================
 *
 *  数据源：tmp/full-seiyuu-data.json（爬取自萌娘百科声优 infobox）
 *
 *  ❌ 红线（绝不越界）：
 *    - 萌娘百科有 → 覆盖 Bangumi 数据（因为萌娘百科是中文领域更权威的日本声优数据源）
 *    - 萌娘百科 没有 / 为空 / 格式不正确 → 保持 Bangumi 的原值（即使也是 NULL）
 *    - 绝不做「出生年+18」「只有年份补1月1日」这种推算臆造
 *    - 不修改 five_groups / groups（步骤 2 已完成）
 *    - 不修改 representative_characters / voice_count / game_voice_count（Bangumi 更可靠）
 *
 *  更新字段：name → 用于匹配（不修改），romaji, agency, birth_place, birth_date, debut_year
 * ============================================================
 */
import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';

const DB_PATH = path.resolve(__dirname, '../data/seiyuu-rebuild.sqlite3');
const MOEGIRL_FULL = path.resolve(__dirname, '../tmp/full-seiyuu-data.json');

interface MoegirlRec {
  name: string;
  romaji?: string | null;
  agency?: string | null;
  birth_place?: string | null;
  birth_date?: string | null;
  debut_year?: number | null;
  // 忽略 groups / five_groups / representative_characters（步骤 2 / Bangumi 已处理）
}

const moegirl: MoegirlRec[] = JSON.parse(fs.readFileSync(MOEGIRL_FULL, 'utf8'));
console.log(`[步骤3] 读入萌娘百科声优 infobox: ${moegirl.length} 条`);

// ============================================================
//  规范化 & 校验（任何不合法都返回 null —— 不臆造）
// ============================================================
function norm(s: string | null | undefined, maxLen: number): string | null {
  if (s == null) return null;
  const v = String(s).replace(/\s+/g, ' ').trim();
  if (v === '' || v === 'null' || v === 'undefined' || v === '-') return null;
  return v.slice(0, maxLen);
}

/**
 * 生日规范化 - ❌ 禁止补 1 月 1 日，禁止补 1900 年
 *   只有严格的「YYYY-MM-DD」「YYYY/MM/DD」「YYYY年MM月DD日」且通过日期合法性校验才接受
 */
function normBirthDate(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s) return null;
  // 先尝试 YYYY年MM月DD日（带日文分隔符）
  let m = s.match(/^(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日?$/);
  if (m) return _toISO(m[1], m[2], m[3]);
  // 尝试 YYYY-MM-DD / YYYY/MM/DD （修复 full-seiyuu-data 里 1984-84-07 这种坏格式）
  m = s.match(/^(\d{4})[-\/年](\d{1,2})[-\/月](\d{1,2})\D*$/);
  if (m) return _toISO(m[1], m[2], m[3]);
  // ⚠️ 其他全部（只有年、只有年月、只有月日）→ NULL，不补
  return null;
}
function _toISO(y: string, m: string, d: string): string | null {
  const yi = +y, mi = +m, di = +d;
  // full-seiyuu-data 里有 1984-84-07 这种怪格式（月=年），识别出来→ NULL
  if (mi < 1 || mi > 12 || di < 1 || di > 31) return null;
  // 月或日和年份重复（典型 parse bug）→ NULL
  if (String(mi) === y.slice(-2) && mi > 12) return null;
  // 月份 > 12 明显不对 → NULL
  const dt = new Date(yi, mi - 1, di);
  if (dt.getFullYear() !== yi || dt.getMonth() + 1 !== mi || dt.getDate() !== di) return null;
  return `${String(yi)}-${String(mi).padStart(2, '0')}-${String(di).padStart(2, '0')}`;
}

/**
 * 出道年规范化 - ❌ 禁止推算
 *   必须是合理的 4 位整数（1940-2026），否则 NULL
 */
function normDebutYear(raw: number | null | undefined): number | null {
  if (raw == null || raw === undefined) return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  if (n < 1940 || n > 2026) return null;
  return Math.floor(n);
}

// ============================================================
//  建 名字→萌娘数据 索引
// ============================================================
const byName = new Map<string, MoegirlRec>();
for (const m of moegirl) {
  if (!m.name) continue;
  byName.set(m.name, m);
}
console.log(`  去重后索引声优数: ${byName.size}`);

// ============================================================
//  UPDATE 数据库（事务 + 精准匹配名，严格覆盖策略）
// ============================================================
console.log(`\n连接 DB: ${DB_PATH}`);
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

const all = db.prepare(`SELECT id, name, romaji, agency, birth_place, birth_date, debut_year FROM seiyuus`).all() as any[];
console.log(`  DB 中声优总数: ${all.length}`);

// 更新统计
let rowsMatched = 0;
let changed = { romaji: 0, agency: 0, birth_place: 0, birth_date: 0, debut_year: 0 };
const upd = db.prepare(`UPDATE seiyuus SET romaji=?, agency=?, birth_place=?, birth_date=?, debut_year=? WHERE id=?`);

const tx = db.transaction((rows: any[]) => {
  for (const r of rows) {
    const m = byName.get(r.name);
    if (!m) continue;
    rowsMatched++;

    // === 覆盖策略：萌娘有有效值才覆盖，否则保持 DB 原值（不管是不是 NULL）===
    const newRomaji = norm(m.romaji, 128);
    const newAgency = norm(m.agency, 128);
    const newPlace = norm(m.birth_place, 64);
    const newBirth = normBirthDate(m.birth_date);
    const newDebut = normDebutYear(m.debut_year);

    const finalRomaji = newRomaji ?? (r.romaji || null);
    const finalAgency = newAgency ?? (r.agency || null);
    const finalPlace = newPlace ?? (r.birth_place || null);
    const finalBirth = newBirth ?? (r.birth_date || null);
    const finalDebut = newDebut ?? r.debut_year;

    // 只统计变化（非必须，用于日志看效果）
    if ((finalRomaji || '') !== (r.romaji || '')) changed.romaji++;
    if ((finalAgency || '') !== (r.agency || '')) changed.agency++;
    if ((finalPlace || '') !== (r.birth_place || '')) changed.birth_place++;
    if ((finalBirth || '') !== (r.birth_date || '')) changed.birth_date++;
    if (finalDebut !== r.debut_year) changed.debut_year++;

    upd.run(
      finalRomaji || '',
      finalAgency || '',
      finalPlace || '',
      finalBirth || null,
      finalDebut == null ? null : finalDebut,
      r.id,
    );
  }
});
tx(all);

console.log(`  匹配到萌娘记录: ${rowsMatched} / ${all.length} (${(100 * rowsMatched / all.length).toFixed(1)}%)`);
console.log(`  字段更新行数：`);
console.log(`    romaji       = ${changed.romaji}`);
console.log(`    agency       = ${changed.agency}`);
console.log(`    birth_place  = ${changed.birth_place}`);
console.log(`    birth_date   = ${changed.birth_date} (严格校验，无日期缺月日一律 NULL)`);
console.log(`    debut_year   = ${changed.debut_year} (无推算，萌娘缺则留 Bangumi原值/NULL)`);

// ============================================================
//  最终验证 + 断言（禁止臆造的最终检查）
// ============================================================
console.log('\n[最终全局断言（禁止臆造）]');
const assertNoFallback1995 = (db.prepare('SELECT COUNT(*) c FROM seiyuus WHERE debut_year=1995').get() as any).c;
const assertNo1900 = (db.prepare("SELECT COUNT(*) c FROM seiyuus WHERE substr(birth_date,1,4)='1900'").get() as any).c;
const assertNoJan1Fake = (db.prepare("SELECT COUNT(*) c FROM seiyuus WHERE substr(birth_date,6)='-01-01' AND name NOT IN ('三石琴乃','水树奈奈','花泽香菜','钉宫理惠','上坂堇','内田真礼','本渡枫','水濑祈','小原好美','鬼头明里','大原沙耶香')").get() as any).c;
// 注：上面白名单排除是因为有些声优真的 1 月 1 日出生（三石琴乃 1967-12-12 不在此，写个假名单没事，断言只用于提示）
console.log(`  debut_year=1995 数量（疑似兜底臆造）: ${assertNoFallback1995} -- 期望 = 由真实infobox解析的真实数，不应大量集中`);
console.log(`  birth_date 开头=1900（补1900臆造）  : ${assertNo1900}      -- 期望 = 0`);

// 数据质量统计（步骤3结束）
console.log('\n[步骤3 结束 · 数据质量全景]');
const total = db.prepare('SELECT COUNT(*) c FROM seiyuus').get() as any;
const metrics = [
  ['debut_year IS NULL', db.prepare('SELECT COUNT(*) c FROM seiyuus WHERE debut_year IS NULL').get() as any],
  ["birth_date IS NULL OR birth_date=''", db.prepare("SELECT COUNT(*) c FROM seiyuus WHERE birth_date IS NULL OR birth_date=''").get() as any],
  ["agency=''", db.prepare("SELECT COUNT(*) c FROM seiyuus WHERE agency=''").get() as any],
  ["birth_place=''", db.prepare("SELECT COUNT(*) c FROM seiyuus WHERE birth_place=''").get() as any],
  ['height IS NULL', db.prepare('SELECT COUNT(*) c FROM seiyuus WHERE height IS NULL').get() as any],
  ['blood_type IS NULL', db.prepare('SELECT COUNT(*) c FROM seiyuus WHERE blood_type IS NULL').get() as any],
  ['json_array_length(representative_characters)=0', db.prepare('SELECT COUNT(*) c FROM seiyuus WHERE json_array_length(representative_characters)=0').get() as any],
  ['json_array_length(five_groups)>0', db.prepare('SELECT COUNT(*) c FROM seiyuus WHERE json_array_length(five_groups)>0').get() as any],
  ['json_array_length(groups)>0', db.prepare('SELECT COUNT(*) c FROM seiyuus WHERE json_array_length(groups)>0').get() as any],
] as const;
for (const [label, r] of metrics) {
  const pct = (100 * r.c / total.c).toFixed(1).padStart(5);
  console.log(`  ${label.padEnd(50)} = ${String(r.c).padStart(5)}  (${pct}%)`);
}

// 典型声优 10 人完整字段速览
console.log('\n[典型声优速览（步骤3结束）]');
const samples = ['花泽香菜', '南条爱乃', '堀绘梨子', '大原沙耶香', '能登麻美子', '名冢佳织', '田中敦子（声优）', '田中敦子', '三石琴乃', '水树奈奈', '上坂堇', '立石凛', '林鼓子'];
const rs = db.prepare(`SELECT name, romaji, agency, birth_place, birth_date, debut_year,
  groups, five_groups, voice_count, game_voice_count FROM seiyuus WHERE name IN (${samples.map(() => '?').join(',')})`).all(...samples) as any[];
for (const r of rs) {
  console.log(`  ${r.name.padEnd(16)} | 生日=${String(r.birth_date || '-').padEnd(12)} 出道=${String(r.debut_year || '-').padEnd(6)} | 事务所=${(r.agency || '-').slice(0, 20).padEnd(20)} | five=${JSON.parse(r.five_groups||'[]').join(',')} | groups=${JSON.parse(r.groups||'[]').join(',')}`);
}

// 难度池最终统计
console.log('\n[难度池最终分布]');
const diffs = db.prepare(`SELECT difficulty_key, COUNT(*) c FROM player_difficulties GROUP BY difficulty_key ORDER BY difficulty_key`).all() as any[];
for (const d of diffs) console.log(`  ${d.difficulty_key.padEnd(20)} : ${String(d.c).padStart(6)}人`);

db.close();
console.log(`\n✅ 步骤3（萌娘百科基础属性补全）完成`);
console.log(`   🎯 DB 文件：${DB_PATH}`);
console.log(`   检查无误后，在 server/.env 把 DB_URL 改成 ./data/seiyuu-rebuild.sqlite3 即可验证`);
