// 导入新的声优数据到数据库（清空旧数据）
import path from 'path';
import fs from 'fs';
import Database from 'better-sqlite3';

const DB_PATH = path.resolve(__dirname, '../data/seiyuu-guess.sqlite3');
const DATA_PATH = path.resolve(__dirname, '../tmp/full-seiyuu-data.json');
const db = new Database(DB_PATH);
db.pragma('foreign_keys = OFF');

interface SeiyuuData {
  name: string;
  romaji?: string;
  agency?: string;
  birth_place?: string;
  birth_date?: string | null;
  debut_year?: number | null;
  groups?: string[];
  representative_characters?: { work: string; character: string }[];
  five_groups?: string[];
}

function isValidDate(s: string | null | undefined): string | null {
  if (!s) return null;
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const y = Number(m[1]); const mo = Number(m[2]); const d = Number(m[3]);
  if (y < 1900 || y > 2020) return null;
  if (mo < 1 || mo > 12) return null;
  if (d < 1 || d > 31) return null;
  return s;
}

const data: SeiyuuData[] = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
console.log(`读取 ${data.length} 条声优数据`);

// 清空旧数据
console.log('清空旧数据...');
db.exec('DELETE FROM player_difficulties');
db.exec('DELETE FROM seiyuus');
db.exec("DELETE FROM sqlite_sequence WHERE name='seiyuus'");
console.log('旧数据已清空');

// 批量插入
const insertSeiyuu = db.prepare(`INSERT INTO seiyuus
  (name, romaji, birth_place, agency, birth_date, debut_year, height, blood_type, voice_types, representative_works, representative_characters, groups, five_groups, is_enabled)
  VALUES (@name, @romaji, @birth_place, @agency, @birth_date, @debut_year, null, null, '[]', '[]', @representative_characters, @groups, @five_groups, 1)`);
const insertDiff = db.prepare('INSERT OR IGNORE INTO player_difficulties (player_id, difficulty_key) VALUES (?, ?)');

const difficulties = ['beginner', 'easy', 'normal'];
let inserted = 0;
let skipped = 0;

const tx = db.transaction(() => {
  for (const s of data) {
    if (!s.name || s.name.length > 128) { skipped++; continue; }
    // 清理代表角色数据
    const reps = (s.representative_characters || []).filter(r => r.character && r.work && r.character.length <= 80 && r.work.length <= 120);
    // 清理 groups
    const groups = (s.groups || []).filter(g => g && g.length <= 60);
    // 清理 five_groups
    const five = (s.five_groups || []).filter(f => f);
    try {
      const info = insertSeiyuu.run({
        name: s.name,
        romaji: (s.romaji || '').slice(0, 128),
        birth_place: (s.birth_place || '').slice(0, 64),
        agency: (s.agency || '').slice(0, 128),
        birth_date: isValidDate(s.birth_date),
        debut_year: s.debut_year || null,
        representative_characters: JSON.stringify(reps),
        groups: JSON.stringify(groups),
        five_groups: JSON.stringify(five),
      });
      const id = Number(info.lastInsertRowid);
      for (const dk of difficulties) insertDiff.run(id, dk);
      inserted++;
    } catch (e) {
      console.log(`  插入失败: ${s.name} - ${(e as Error).message}`);
      skipped++;
    }
  }
});
tx();

console.log(`\n导入完成: ${inserted} 人成功, ${skipped} 人跳过`);

// 验证
const total = (db.prepare('SELECT COUNT(*) AS c FROM seiyuus WHERE is_enabled=1').get() as any).c;
const fiveCnt = (db.prepare('SELECT COUNT(*) AS c FROM seiyuus WHERE json_array_length(five_groups)>0').get() as any).c;
const repCnt = (db.prepare('SELECT COUNT(*) AS c FROM seiyuus WHERE json_array_length(representative_characters)>0').get() as any).c;
const agencyCnt = (db.prepare("SELECT COUNT(*) AS c FROM seiyuus WHERE agency != ''").get() as any).c;

console.log(`\n=== 数据库统计 ===`);
console.log(`总启用声优: ${total}`);
console.log(`有代表角色: ${repCnt}`);
console.log(`有事务所: ${agencyCnt}`);
console.log(`五大企划相关: ${fiveCnt}`);

// 五大企划分布
const fiveBreakdown = db.prepare(`SELECT json_each.value AS g, COUNT(*) AS c
  FROM seiyuus, json_each(five_groups) GROUP BY g ORDER BY c DESC`).all() as any[];
console.log('\n五大企划分布:');
for (const r of fiveBreakdown) console.log(`  ${r.g}: ${r.c}人`);

// 检查是否有已知虚拟角色混入
const knownChars = ['若菜四季', '三角初华', '千早爱音', '要乐奈', '樱小路希奈子', '米女芽衣', '薮岛朱音', '鬼冢夏美', '维恩·玛格丽特', '鬼冢冬毬'];
const ph = knownChars.map(()=>'?').join(',');
const found = db.prepare(`SELECT name FROM seiyuus WHERE name IN (${ph})`).all(...knownChars) as any[];
if (found.length) {
  console.log(`\n⚠️ 仍有虚拟角色混入: ${found.map(r=>r.name).join('、')}`);
} else {
  console.log('\n✅ 无已知虚拟角色混入');
}

// 检查关键声优是否在库
const keySeiyuus = ['花泽香菜', '早见沙织', '水树奈奈', '大熊和奏', '铃原希实', '薮岛朱音', '绘森彩', '结那', '坂仓花'];
const keyFound = db.prepare(`SELECT name, json_array_length(representative_characters) AS rep_cnt, five_groups FROM seiyuus WHERE name IN (${keySeiyuus.map(()=>'?').join(',')})`).all(...keySeiyuus) as any[];
console.log('\n关键声优检查:');
for (const r of keyFound) console.log(`  ${r.name} | rep=${r.rep_cnt} | five=${r.five_groups}`);
const keyMissing = keySeiyuus.filter(n => !keyFound.some(r => r.name === n));
if (keyMissing.length) console.log(`  缺失: ${keyMissing.join('、')}`);

db.close();
try {
  fs.utimesSync(path.resolve(__dirname, '../src/db/schema.ts'), new Date(), new Date());
  console.log('\n已触发 dev server 重启');
} catch (e) { /* ignore */ }
