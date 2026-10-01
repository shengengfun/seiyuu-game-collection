/**
 * bangumi 数据回填脚本 (v2 - 面向新 DB seiyuu-bangumi.sqlite3)
 * ------------------------------------------------------------
 * 数据补全顺序(不编造,只填真实数据):
 *   1. 从旧 DB(seiyuu-guess.sqlite3)迁移 birth_place/agency/groups/five_groups/birth_date
 *   2. 从 bangumi person.jsonlines 补 birth_date/birth_place/agency(覆盖旧 DB 未覆盖的)
 *   3. 从 person-characters + subject 聚合 voice_count/game_voice_count/representative_games
 *
 * 运行:
 *   cd d:\Seiyu-guess\server ; pnpm tsx scripts/enrich-seiyuu-data.ts
 *
 * 原则:只填真实数据,匹配不到的保持原状,绝不编造。
 */
import { createReadStream, existsSync } from 'node:fs';
import readline from 'node:readline';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const NEW_DB_PATH = path.resolve(__dirname, '../data/seiyuu-bangumi.sqlite3');
const OLD_DB_PATH = path.resolve(__dirname, '../data/seiyuu-guess.sqlite3');
const BANGUMI_DIR = path.resolve(__dirname, '../tmp/bangumi');

// =============================================================
//  工具函数
// =============================================================

/** 解析 infobox,提取每个字段的实际值 */
function parseInfobox(infobox: string | null): Record<string, string> {
  const result: Record<string, string> = {};
  if (!infobox) return result;
  const regex = /\|([^=\r\n]+)=([^\r\n|]*)/g;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(infobox)) !== null) {
    const key = m[1].trim();
    const val = m[2].trim();
    result[key] = val;
  }
  return result;
}

/** 规范化生日为 YYYY-MM-DD 格式,无法解析返回 null */
function normalizeBirthday(val: string | null | undefined): string | null {
  if (!val) return null;
  const m1 = val.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
  if (m1) {
    const y = m1[1];
    const mo = String(Number(m1[2])).padStart(2, '0');
    const d = String(Number(m1[3])).padStart(2, '0');
    if (Number(y) < 1900 || Number(y) > 2020) return null;
    return `${y}-${mo}-${d}`;
  }
  const m2 = val.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (m2) {
    const y = m2[1];
    const mo = String(Number(m2[2])).padStart(2, '0');
    const d = String(Number(m2[3])).padStart(2, '0');
    if (Number(y) < 1900 || Number(y) > 2020) return null;
    return `${y}-${mo}-${d}`;
  }
  return null;
}

/** 规范化出生地,取第一段(都道府县) */
function normalizeBirthPlace(val: string | null | undefined): string {
  if (!val) return '';
  return val.trim().split(/\s+/)[0].slice(0, 64);
}

/** 规范化事务所,取事务所部分去掉唱片公司等附加说明 */
function normalizeAgency(val: string | null | undefined): string {
  if (!val) return '';
  return val.split('/')[0].replace(/\(.*?\)/g, '').trim().slice(0, 128);
}

interface BangumiPerson {
  id: number;
  name: string;
  cnName: string;
  birth: string | null;
  birthPlace: string;
  agency: string;
}

interface CharacterRelation {
  subject_id: number;
  character_id: number;
}

interface GameSubject {
  id: number;
  name: string;
  name_cn: string;
  score: number;
  collects: number;
  tags: string[];
}

interface EnrichedData {
  voiceCount: number;
  gameVoiceCount: number;
  representativeGames: { work: string; character: string }[];
}

async function main() {
  const db = new Database(NEW_DB_PATH);
  db.pragma('journal_mode = WAL');

  // =============================================================
  //  阶段 A:从旧 DB 迁移 birth_place/agency/groups/five_groups/birth_date
  // =============================================================
  console.log('=== 阶段A:从旧 DB 迁移数据 ===');

  let oldMigrated = { place: 0, agency: 0, groups: 0, five: 0, birth: 0, matched: 0 };

  if (existsSync(OLD_DB_PATH)) {
    const oldDb = new Database(OLD_DB_PATH, { readonly: true });
    const oldRows = oldDb.prepare('SELECT name, romaji, birth_place, agency, groups, five_groups, birth_date FROM seiyuus').all() as any[];

    const oldByName = new Map<string, any>();
    const oldByRomaji = new Map<string, any>();
    for (const s of oldRows) {
      if (s.name) oldByName.set(s.name, s);
      if (s.romaji) oldByRomaji.set(s.romaji.toLowerCase(), s);
    }

    const newRows = db.prepare('SELECT id, name, romaji, birth_place, agency, groups, five_groups, birth_date FROM seiyuus').all() as any[];
    const updateOld = db.prepare(`UPDATE seiyuus
      SET birth_place = @birth_place,
          agency = @agency,
          groups = @groups,
          five_groups = @five_groups,
          birth_date = @birth_date
      WHERE id = @id`);

    const tx = db.transaction(() => {
      for (const s of newRows) {
        let old = oldByName.get(s.name);
        if (!old && s.romaji) old = oldByRomaji.get(s.romaji.toLowerCase());
        if (!old) continue;
        oldMigrated.matched++;

        const newPlace = s.birth_place || old.birth_place || '';
        const newAgency = s.agency || old.agency || '';
        const newGroups = (s.groups && s.groups !== '[]') ? s.groups : (old.groups || '[]');
        const newFive = (s.five_groups && s.five_groups !== '[]') ? s.five_groups : (old.five_groups || '[]');
        const newBirth = s.birth_date || old.birth_date || null;

        if (!s.birth_place && old.birth_place) oldMigrated.place++;
        if (!s.agency && old.agency) oldMigrated.agency++;
        if ((!s.groups || s.groups === '[]') && old.groups && old.groups !== '[]') oldMigrated.groups++;
        if ((!s.five_groups || s.five_groups === '[]') && old.five_groups && old.five_groups !== '[]') oldMigrated.five++;
        if ((!s.birth_date || s.birth_date === '') && old.birth_date) oldMigrated.birth++;

        updateOld.run({
          id: s.id,
          birth_place: newPlace,
          agency: newAgency,
          groups: newGroups,
          five_groups: newFive,
          birth_date: newBirth,
        });
      }
    });
    tx();
    oldDb.close();

    console.log(`旧 DB 匹配: ${oldMigrated.matched} 人`);
    console.log(`补 birth_place: ${oldMigrated.place}`);
    console.log(`补 agency: ${oldMigrated.agency}`);
    console.log(`补 groups: ${oldMigrated.groups}`);
    console.log(`补 five_groups: ${oldMigrated.five}`);
    console.log(`补 birth_date: ${oldMigrated.birth}`);
  } else {
    console.log('旧 DB 不存在,跳过迁移');
  }

  // =============================================================
  //  阶段 B:加载 bangumi person 数据,建立名字索引
  // =============================================================
  console.log('\n=== 阶段B:加载 bangumi person 数据 ===');

  const personsByCnName = new Map<string, BangumiPerson>();
  const personsByJpName = new Map<string, BangumiPerson>();
  const personById = new Map<number, BangumiPerson>();

  const personFile = path.join(BANGUMI_DIR, 'person.jsonlines');
  const personStream = createReadStream(personFile, { encoding: 'utf8' });
  const personRl = readline.createInterface({ input: personStream, crlfDelay: Infinity });

  let seiyuuCount = 0;
  for await (const line of personRl) {
    if (!line.trim()) continue;
    let p: any;
    try { p = JSON.parse(line); } catch { continue; }
    if (!Array.isArray(p.career) || !p.career.includes('seiyu')) continue;
    seiyuuCount++;

    const fields = parseInfobox(p.infobox);
    const person: BangumiPerson = {
      id: p.id,
      name: p.name || '',
      cnName: fields['简体中文名'] || '',
      birth: normalizeBirthday(fields['生日']),
      birthPlace: normalizeBirthPlace(fields['出身地区'] || fields['出身地'] || fields['出生地']),
      agency: normalizeAgency(fields['所属公司'] || fields['事务所'] || fields['所属事务所']),
    };
    personById.set(p.id, person);
    if (person.cnName) personsByCnName.set(person.cnName, person);
    if (person.name) personsByJpName.set(person.name, person);
  }
  personRl.close();
  console.log(`加载 bangumi 声优: ${seiyuuCount} 人`);

  // =============================================================
  //  阶段 C:聚合 person-characters,统计 voice_count 和游戏配音
  // =============================================================
  console.log('\n=== 阶段C:聚合配音关系 ===');

  const personCharacters = new Map<number, CharacterRelation[]>();
  const pcFile = path.join(BANGUMI_DIR, 'person-characters.jsonlines');
  const pcStream = createReadStream(pcFile, { encoding: 'utf8' });
  const pcRl = readline.createInterface({ input: pcStream, crlfDelay: Infinity });

  let pcTotal = 0;
  for await (const line of pcRl) {
    if (!line.trim()) continue;
    let r: any;
    try { r = JSON.parse(line); } catch { continue; }
    pcTotal++;
    const arr = personCharacters.get(r.person_id) ?? [];
    arr.push({ subject_id: r.subject_id, character_id: r.character_id });
    personCharacters.set(r.person_id, arr);
  }
  pcRl.close();
  console.log(`person-characters 关系数: ${pcTotal}`);
  console.log(`有配音的 person: ${personCharacters.size}`);

  // =============================================================
  //  阶段 D:流式加载 subject.jsonlines,只保留游戏(type=4)
  // =============================================================
  console.log('\n=== 阶段D:加载游戏作品 ===');

  const gameById = new Map<number, GameSubject>();
  const subFile = path.join(BANGUMI_DIR, 'subject.jsonlines');
  const subStream = createReadStream(subFile, { encoding: 'utf8' });
  const subRl = readline.createInterface({ input: subStream, crlfDelay: Infinity });

  let subTotal = 0;
  let gameTotal = 0;
  for await (const line of subRl) {
    if (!line.trim()) continue;
    let s: any;
    try { s = JSON.parse(line); } catch { continue; }
    subTotal++;
    if (s.type !== 4) continue;
    gameTotal++;
    gameById.set(s.id, {
      id: s.id,
      name: s.name || '',
      name_cn: s.name_cn || '',
      score: typeof s.score === 'number' ? s.score : 0,
      collects: s.favorite?.done || 0,
      tags: Array.isArray(s.tags) ? s.tags.map((t: any) => t.name || '').filter(Boolean) : [],
    });
  }
  subRl.close();
  console.log(`subject 总数: ${subTotal}`);
  console.log(`游戏作品(type=4): ${gameTotal}`);

  // =============================================================
  //  阶段 E:加载 character.jsonlines,建立 character_id → 角色名
  // =============================================================
  console.log('\n=== 阶段E:加载角色数据 ===');

  const charById = new Map<number, string>();
  const charFile = path.join(BANGUMI_DIR, 'character.jsonlines');
  const charStream = createReadStream(charFile, { encoding: 'utf8' });
  const charRl = readline.createInterface({ input: charStream, crlfDelay: Infinity });

  for await (const line of charRl) {
    if (!line.trim()) continue;
    let c: any;
    try { c = JSON.parse(line); } catch { continue; }
    const name = c.name || '';
    const fields = parseInfobox(c.infobox);
    const displayName = fields['简体中文名'] || name;
    charById.set(c.id, displayName);
  }
  charRl.close();
  console.log(`角色数: ${charById.size}`);

  // =============================================================
  //  阶段 F:对每个 bangumi person 计算最终数据
  // =============================================================
  console.log('\n=== 阶段F:计算声优聚合数据 ===');

  const enrichedByPersonId = new Map<number, EnrichedData>();
  for (const [personId, relations] of personCharacters) {
    const voiceCount = relations.length;
    const gameRelations = relations.filter(r => gameById.has(r.subject_id));
    const gameVoiceCount = gameRelations.length;

    // 选代表作:按作品收藏数排序,取前5
    const gameRepList = gameRelations
      .map(r => {
        const game = gameById.get(r.subject_id)!;
        const charName = charById.get(r.character_id) || '';
        return {
          work: game.name_cn || game.name,
          character: charName,
          collects: game.collects,
        };
      })
      .filter(g => g.work && g.character)
      .sort((a, b) => b.collects - a.collects)
      .slice(0, 5)
      .map(g => ({ work: g.work.slice(0, 120), character: g.character.slice(0, 80) }));

    enrichedByPersonId.set(personId, {
      voiceCount,
      gameVoiceCount,
      representativeGames: gameRepList,
    });
  }
  console.log(`已计算 ${enrichedByPersonId.size} 个声优的聚合数据`);

  // =============================================================
  //  阶段 G:回填新 DB(bangumi 数据 + 聚合数据)
  // =============================================================
  console.log('\n=== 阶段G:回填新 DB ===');

  const allSeiyuus = db.prepare('SELECT id, name, romaji, birth_date, birth_place, agency FROM seiyuus').all() as any[];

  const updateStmt = db.prepare(`UPDATE seiyuus
    SET birth_date = @birth_date,
        birth_place = @birth_place,
        agency = @agency,
        voice_count = @voice_count,
        game_voice_count = @game_voice_count,
        representative_games = @representative_games
    WHERE id = @id`);

  let fillBirth = 0;
  let fillPlace = 0;
  let fillAgency = 0;
  let fillVoiceCount = 0;
  let fillGameData = 0;
  let matched = 0;
  const unmatched: string[] = [];

  const tx = db.transaction(() => {
    for (const s of allSeiyuus) {
      // 优先用中文名匹配,再试日文名
      let bgPerson = personsByCnName.get(s.name) || personsByJpName.get(s.name);
      // 也试罗马字
      if (!bgPerson && s.romaji) {
        const romajiLower = s.romaji.toLowerCase();
        for (const p of personById.values()) {
          if (p.cnName && p.cnName.toLowerCase() === romajiLower) { bgPerson = p; break; }
        }
      }

      if (!bgPerson) {
        unmatched.push(s.name);
        continue;
      }
      matched++;

      // 只在原值为空时填入(不覆盖已有数据)
      const newBirth = s.birth_date || bgPerson.birth;
      const newPlace = s.birth_place || bgPerson.birthPlace;
      const newAgency = s.agency || bgPerson.agency;
      if (!s.birth_date && bgPerson.birth) fillBirth++;
      if (!s.birth_place && bgPerson.birthPlace) fillPlace++;
      if (!s.agency && bgPerson.agency) fillAgency++;

      // 聚合数据(按 person_id 查)
      const enriched = enrichedByPersonId.get(bgPerson.id);
      const voiceCount = enriched?.voiceCount || 0;
      const gameVoiceCount = enriched?.gameVoiceCount || 0;
      const representativeGames = enriched?.representativeGames || [];
      if (voiceCount > 0) fillVoiceCount++;
      if (representativeGames.length > 0) fillGameData++;

      updateStmt.run({
        id: s.id,
        birth_date: newBirth,
        birth_place: newPlace,
        agency: newAgency,
        voice_count: voiceCount,
        game_voice_count: gameVoiceCount,
        representative_games: JSON.stringify(representativeGames),
      });
    }
  });
  tx();

  console.log(`匹配 bangumi 成功: ${matched} / ${allSeiyuus.length}`);
  console.log(`未匹配: ${unmatched.length} 人`);
  console.log(`\n回填统计:`);
  console.log(`  birth_date 新增: ${fillBirth}`);
  console.log(`  birth_place 新增: ${fillPlace}`);
  console.log(`  agency 新增: ${fillAgency}`);
  console.log(`  voice_count 填充: ${fillVoiceCount}`);
  console.log(`  representative_games 填充: ${fillGameData}`);

  // =============================================================
  //  阶段 H:验证最终覆盖率
  // =============================================================
  console.log('\n=== 最终覆盖率 ===');
  const total = (db.prepare('SELECT COUNT(*) AS c FROM seiyuus').get() as any).c;
  const withBirth = (db.prepare("SELECT COUNT(*) AS c FROM seiyuus WHERE birth_date IS NOT NULL AND birth_date != ''").get() as any).c;
  const withPlace = (db.prepare("SELECT COUNT(*) AS c FROM seiyuus WHERE birth_place != ''").get() as any).c;
  const withAgency = (db.prepare("SELECT COUNT(*) AS c FROM seiyuus WHERE agency != ''").get() as any).c;
  const withVoiceCount = (db.prepare('SELECT COUNT(*) AS c FROM seiyuus WHERE voice_count > 0').get() as any).c;
  const withGameVoice = (db.prepare('SELECT COUNT(*) AS c FROM seiyuus WHERE game_voice_count > 0').get() as any).c;
  const withGameData = (db.prepare("SELECT COUNT(*) AS c FROM seiyuus WHERE json_array_length(representative_games) > 0").get() as any).c;
  console.log(`总数: ${total}`);
  console.log(`birth_date: ${withBirth} (${(withBirth / total * 100).toFixed(1)}%)`);
  console.log(`birth_place: ${withPlace} (${(withPlace / total * 100).toFixed(1)}%)`);
  console.log(`agency: ${withAgency} (${(withAgency / total * 100).toFixed(1)}%)`);
  console.log(`voice_count: ${withVoiceCount} (${(withVoiceCount / total * 100).toFixed(1)}%)`);
  console.log(`game_voice_count: ${withGameVoice} (${(withGameVoice / total * 100).toFixed(1)}%)`);
  console.log(`representative_games: ${withGameData} (${(withGameData / total * 100).toFixed(1)}%)`);

  // 缺失 birth_date 的声优名单(留给阶段2爬萌娘百科)
  const missingBirth = db.prepare("SELECT name FROM seiyuus WHERE birth_date IS NULL OR birth_date = '' ORDER BY name").all() as any[];
  console.log(`\n仍缺失 birth_date: ${missingBirth.length} 人`);

  // 缺失 birth_place
  const missingPlace = db.prepare("SELECT name FROM seiyuus WHERE birth_place = '' ORDER BY name").all() as any[];
  console.log(`仍缺失 birth_place: ${missingPlace.length} 人`);

  // 缺失 agency
  const missingAgency = db.prepare("SELECT name FROM seiyuus WHERE agency = '' ORDER BY name").all() as any[];
  console.log(`仍缺失 agency: ${missingAgency.length} 人`);

  // 输出未匹配 bangumi 名单(前30)
  if (unmatched.length) {
    console.log(`\n未匹配 bangumi 的声优(前30):`, unmatched.slice(0, 30).join('、'));
  }

  db.close();
  console.log('\n=== 阶段1完成 ===');
}

main().catch(err => {
  console.error('脚本执行失败:', err);
  process.exit(1);
});
