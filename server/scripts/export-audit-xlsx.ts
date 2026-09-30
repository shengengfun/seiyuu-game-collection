/**
 * 导出 Excel 校对表
 * 数据源：seiyuu-rebuild.sqlite3
 * 输出：  data/seiyuu-audit.xlsx
 *
 * Sheet 结构：
 *   - 全部声优        （全量，按 id 排序）
 *   - LoveLive!       （five_groups 含 LoveLive!）
 *   - BanG Dream!     （five_groups 含 BanG Dream!（邦邦））
 *   - 偶像大师系列     （five_groups 含 偶像大师系列）
 *   - 赛马娘          （five_groups 含 赛马娘 Pretty Derby）
 *   - 少女歌剧        （five_groups 含 少女歌剧 Revue Starlight）
 *   - 世界计划        （five_groups 含 世界计划）
 *
 * 每个 Sheet 末尾留「校对结果」「备注」两列供手动填写。
 */
import path from 'path';
import Database from 'better-sqlite3';
import * as XLSX from 'xlsx';

const DB_PATH = path.resolve(__dirname, '../data/seiyuu-rebuild.sqlite3');
const OUT_PATH = path.resolve(__dirname, '../data/seiyuu-audit-v2.xlsx');

interface SeiyuuRow {
  id: number;
  name: string;
  romaji: string;
  birth_date: string | null;
  debut_year: number | null;
  agency: string;
  birth_place: string;
  height: number | null;
  blood_type: string | null;
  groups: string;
  sub_groups: string;
  five_groups: string;
  representative_characters: string;
  representative_games: string;
  voice_count: number;
  game_voice_count: number;
  collects: number;
  difficulties: string;
}

function loadAll(): SeiyuuRow[] {
  const db = new Database(DB_PATH, { readonly: true });
  const rows = db.prepare(`
    SELECT s.id, s.name, s.romaji, s.birth_date, s.debut_year, s.agency,
           s.birth_place, s.height, s.blood_type,
           s.groups, s.sub_groups, s.five_groups,
           s.representative_characters, s.representative_games,
           s.voice_count, s.game_voice_count, s.collects,
           (SELECT GROUP_CONCAT(d.difficulty_key, ' | ') FROM player_difficulties d WHERE d.player_id = s.id) AS difficulties
    FROM seiyuus s
    ORDER BY s.id
  `).all() as SeiyuuRow[];
  db.close();
  return rows;
}

function parseArr(json: string): any[] {
  try { return JSON.parse(json || '[]'); } catch { return []; }
}

function repsToStr(arr: any[], max: number): string {
  return arr.slice(0, max).map((r: any) => `${r.character}《${r.work}》`).join('；');
}

function gamesToStr(arr: any[], max: number): string {
  return arr.slice(0, max).map((r: any) => `${r.character}《${r.work}》`).join('；');
}

function toExcelRow(r: SeiyuuRow) {
  const reps = parseArr(r.representative_characters);
  const games = parseArr(r.representative_games);
  const groups = parseArr(r.groups);
  const subGroups = parseArr(r.sub_groups);
  const five = parseArr(r.five_groups);
  return {
    'ID': r.id,
    '姓名': r.name,
    '罗马字': r.romaji || '',
    '生日': r.birth_date || '',
    '出道年': r.debut_year ?? '',
    '事务所': r.agency || '',
    '出身地': r.birth_place || '',
    '身高': r.height ?? '',
    '血型': r.blood_type || '',
    '所属团体': groups.join(' / '),
    '小队': subGroups.join(' / '),
    '五大企划': five.join(' / '),
    '代表角色(前5)': repsToStr(reps, 5),
    '二游代表作(前3)': gamesToStr(games, 3),
    '总配音数': r.voice_count,
    '游戏配音数': r.game_voice_count,
    '收藏数': r.collects,
    '难度池': r.difficulties || '',
    '校对结果': '',
    '备注': '',
  };
}

const HEADER = [
  'ID', '姓名', '罗马字', '生日', '出道年', '事务所', '出身地', '身高', '血型',
  '所属团体', '小队', '五大企划', '代表角色(前5)', '二游代表作(前3)',
  '总配音数', '游戏配音数', '收藏数', '难度池', '校对结果', '备注',
];

const COLS = [
  { wch: 6 }, { wch: 14 }, { wch: 18 }, { wch: 12 }, { wch: 8 },
  { wch: 22 }, { wch: 14 }, { wch: 6 }, { wch: 6 },
  { wch: 24 }, { wch: 20 }, { wch: 20 }, { wch: 50 }, { wch: 36 },
  { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 20 }, { wch: 10 }, { wch: 30 },
];

function buildSheet(rows: SeiyuuRow[]): XLSX.WorkSheet {
  const data = rows.map(toExcelRow);
  const ws = XLSX.utils.json_to_sheet(data, { header: HEADER });
  ws['!cols'] = COLS;
  return ws;
}

// ============================================================
//  主流程
// ============================================================
console.log('读取 DB:', DB_PATH);
const all = loadAll();
console.log('声优总数:', all.length);

const wb = XLSX.utils.book_new();

// Sheet 1: 全部声优
const ws1 = buildSheet(all);
XLSX.utils.book_append_sheet(wb, ws1, '全部声优');

// Sheet 2~7: 五大企划+世界计划
const fiveKeys = [
  ['LoveLive!', 'LoveLive'],
  ['BanG Dream!（邦邦）', 'BanG Dream'],
  ['偶像大师系列', '偶像大师'],
  ['赛马娘 Pretty Derby', '赛马娘'],
  ['少女歌剧 Revue Starlight', '少女歌剧'],
  ['世界计划', '世界计划'],
] as const;

for (const [key, label] of fiveKeys) {
  const filtered = all.filter(r => {
    const five = parseArr(r.five_groups);
    return five.includes(key);
  });
  const ws = buildSheet(filtered);
  XLSX.utils.book_append_sheet(wb, ws, label);
  console.log(`  ${label}: ${filtered.length} 人`);
}

XLSX.writeFile(wb, OUT_PATH, { cellStyles: true });
console.log(`\n✅ Excel 已生成: ${OUT_PATH}`);
console.log('   打开后可按 sheet 校对，末尾两列「校对结果」「备注」留空供手动填写。');
