/**
 * 萌娘百科女声优爬虫
 *
 * 入口: 分类:日本女性声优 (MediaWiki 分类树)
 * 数据: 每位声优详情页的「基本资料」表格 + 「主要出演作品」表格
 * 重点: 拉邦歌偶马 / LoveLive / BanG Dream! / 偶像大师 / 赛马娘 / 偶像活动
 *       匹配到就把对应企划加到 groups 数组里,一个也不落下
 *
 * 运行: pnpm --filter server exec tsx scripts/crawl-moegirl.ts [--limit 200] [--import-db]
 *   --limit N       : 最多爬 N 名声优 (默认 0 = 不限)
 *   --import-db     : 爬完直接写入数据库 (默认只写 JSON 文件)
 *   --only-five     : 只保留五大企划(及旗下)有角色的声优
 *   --resume        : 从上次的中间产物继续 (跳过已爬过的页面)
 *
 * 输出:
 *   server/scripts/moegirl-crawled.json  (原始爬取数据,便于后续处理 / resume)
 *   server/scripts/seiyuus-moegirl.json  (符合项目 seed 格式的声优列表)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

/* ------------------------------------------------------------------ */
/* 命令行参数                                                          */
/* ------------------------------------------------------------------ */
const args = new Set(process.argv.slice(2));
const LIMIT_ARG = process.argv.find((a) => a.startsWith('--limit='));
const LIMIT = LIMIT_ARG ? Number(LIMIT_ARG.split('=')[1]) : 0;
const IMPORT_DB = args.has('--import-db');
const ONLY_FIVE = args.has('--only-five');
const RESUME = args.has('--resume');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const RAW_OUT = path.join(__dirname, 'moegirl-crawled.json');
const SEED_OUT = path.join(__dirname, 'seiyuus-moegirl.json');

/* ------------------------------------------------------------------ */
/* 五大企划关键字白名单: 作品/系列名 -> 企划简称                       */
/* 萌娘百科声优页「主要出演作品」栏出现任意关键词就塞到 groups          */
/* ------------------------------------------------------------------ */
const FIVE_KEYWORDS: Array<{ group: string; patterns: RegExp[] }> = [
  {
    group: 'LoveLive!',
    patterns: [
      /LoveLive!?/i,
      /ラブライブ!/,
      /LoveLive!? Sunshine/i,
      /虹咲学园学园偶像同好会/,
      /虹咲学园/,
      /Liella!/,
      /莲之空女学院学园偶像俱乐部/,
      /莲之空/,
      /超级明星/,
      /School Idol Project/,
      /μ's|缪斯|ミューズ/,
      /Aqours|アクア/,
      /虹咲|Liella|莲ノ空|Hasunosora/,
      /结女|YUIGAOKA/,
    ],
  },
  {
    group: 'BanG Dream!',
    patterns: [
      /BanG Dream!?/i,
      /バンドリ!/,
      /少女乐团派对/,
      /Poppin'Party|Roselia|RAISE A SUILEN|Morfonica|MyGO!!!!!|Ave Mujica/,
      /武士道音乐手游/,
    ],
  },
  {
    group: '偶像大师',
    patterns: [
      /偶像大师|THE IDOLM@STER/i,
      /アイドルマスター/,
      /765 アロースターズ|765PRO|765 Production/,
      /灰姑娘女孩|Cinderella Girls|シンデレラガールズ|デレステ/i,
      /百万现场|Million Live!|ミリオンライブ!/,
      /闪耀色彩|Shiny Colors|シャイニーカラーズ/,
      /SideM/,
      /ポプマ|Poplinks/,
      /学院偶像大师|学マス|Gakuen/,
      /初星学园/,
    ],
  },
  {
    group: '赛马娘 Pretty Derby',
    patterns: [
      /赛马娘|ウマ娘|Uma Musume/i,
      /Pretty Derby/i,
      /特别周|无声铃鹿|东海帝王|丸善斯基|小栗帽/,
      /目白麦昆|米浴|黄金船/,
      /ゲームウマ娘|パカッと/,
    ],
  },
  {
    group: '偶像活动!',
    patterns: [
      /偶像活动!?|アイカツ!?|Aikatsu!/i,
      /星宫莓|大空明里|虹野梦|友希爱音|凑美绪/,
      /偶像活动Stars?!|アイカツ スターズ!/,
      /偶像活动Friends!|アイカツフレンズ!/,
      /偶像活动 on Parade!/,
      /アイカツプラネット!/,
    ],
  },
];

/** 额外补充: 其他偶像 / 动画 / 企划团体(可选,不强求) */
const EXTRA_GROUP_KEYWORDS: Array<{ group: string; patterns: RegExp[] }> = [
  { group: '少女☆歌剧 Revue Starlight', patterns: [/Revue Starlight|少女☆歌剧|スタァライト/, /少女歌剧/] },
  { group: '世界计划 彩色舞台', patterns: [/プロセカ|Project SEKAI|世界计划|プロジェクトセカイ/] },
  { group: 'D4DJ', patterns: [/D4DJ/i] },
  { group: '东京七姐妹', patterns: [/Tokyo 7th シスターズ|东京七姐妹|t7s/i] },
  { group: 'Wake Up, Girls!', patterns: [/Wake Up, Girls!?/i] },
  { group: '偶像事变', patterns: [/偶像事变|アイドル事変/] },
];

const GROUP_DEFS = [...FIVE_KEYWORDS, ...EXTRA_GROUP_KEYWORDS];

/* ------------------------------------------------------------------ */
/* MediaWiki 客户端                                                   */
/* ------------------------------------------------------------------ */
const MW_BASE = 'https://zh.moegirl.org.cn';
const API = `${MW_BASE}/api.php`;
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Seiyuu-guess-crawler/1.0 (+https://github.com/seiyuu-guess)';

async function mwGet(params: Record<string, unknown>): Promise<any> {
  const url =
    API +
    '?' +
    Object.entries({ format: 'json', ...params })
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join('&');
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, 'Accept': 'application/json' },
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${url}`);
  }
  return res.json();
}

async function getCategoryMembers(category: string): Promise<{ pageid: number; title: string }[]> {
  const out: { pageid: number; title: string }[] = [];
  let cmcontinue: string | undefined;
  do {
    const data = await mwGet({
      action: 'query',
      list: 'categorymembers',
      cmtitle: category,
      cmtype: 'page',
      cmlimit: 500,
      ...(cmcontinue ? { cmcontinue } : {}),
    });
    const batch = data?.query?.categorymembers ?? [];
    out.push(...batch);
    cmcontinue = data?.continue?.cmcontinue;
    if (cmcontinue) {
      console.log(`  [cat] 已收集 ${out.length} 条,继续...`);
      await sleep(300);
    }
  } while (cmcontinue);
  return out;
}

async function getParsedPage(pageid: number): Promise<{ title: string; html: string; wikitext: string }> {
  const data = await mwGet({
    action: 'parse',
    pageid,
    prop: 'text|wikitext|displaytitle|categories',
    disablelimitreport: true,
  });
  return {
    title: data?.parse?.title ?? '',
    html: data?.parse?.text?.['*'] ?? '',
    wikitext: data?.parse?.wikitext?.['*'] ?? '',
  };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* ------------------------------------------------------------------ */
/* 解析: 基本资料表格 (infobox)                                        */
/* ------------------------------------------------------------------ */
interface RawSeiyuu {
  title: string;
  name: string;
  romaji: string;
  birth_place: string;
  agency: string;
  birth_date: string | null;
  debut_year: number | null;
  height: number | null;
  blood_type: string | null;
  groups_raw: string[];
  works_raw: Array<{ work: string; character: string; note: string }>;
  representative_works: { work: string; character: string }[];
  representative_characters: string[];
  groups: string[];
  categories: string[];
}

/** 从 wikitext 里抠 infobox 标签值:{{声优信息|xxx=yyy|...}} */
function parseInfobox(wikitext: string): Map<string, string> {
  const out = new Map<string, string>();
  // 找到 {{声优信息 ... }} 的整块
  const start = wikitext.indexOf('{{声优信息');
  if (start === -1) return out;
  // 成对匹配花括号
  let depth = 0;
  let end = -1;
  for (let i = start; i < wikitext.length; i += 1) {
    if (wikitext[i] === '{') depth += 1;
    else if (wikitext[i] === '}') {
      depth -= 1;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  if (end === -1) return out;
  const block = wikitext.slice(start + 2, end - 1).replace(/\r/g, '');
  const lines = block.split(/\n(?=\s*\|)/); // 按"|key=value"换行切
  for (const raw of lines) {
    const line = raw.trim();
    if (!line.startsWith('|')) continue;
    const kv = line.replace(/^\|/, '');
    const eq = kv.indexOf('=');
    if (eq === -1) continue;
    const k = kv.slice(0, eq).trim();
    const v = stripWikitextMarkup(kv.slice(eq + 1)).trim();
    if (k && v) out.set(k, v);
  }
  return out;
}

/** 剥去 [[链接|显示]] / [[链接]] / {{lang|...|xxx}} / <ref> 等维基标记 */
function stripWikitextMarkup(s: string): string {
  let t = s;
  t = t.replace(/<ref[^>]*>.*?<\/ref>/gis, '');
  t = t.replace(/<ref[^/>]*\/>/gi, '');
  t = t.replace(/<br\s*\/?>/gi, ' / ');
  t = t.replace(/<[^>]+>/g, '');
  // {{lang|ja|xxx}} -> xxx
  t = t.replace(/\{\{lang\|[^|]*\|([^}]*)\}\}/gi, '$1');
  t = t.replace(/\{\{lang-[^|]+\|([^}]*)\}\}/gi, '$1');
  // {{nihongo|汉字|假名|romaji}} -> 汉字
  t = t.replace(/\{\{nihongo\|([^}|]*)(?:\|[^}]*)?\}\}/gi, '$1');
  // 其他简单模板: {{xxx|yyy|zzz}} 保留最后一个参数
  t = t.replace(/\{\{[^{}]*?\}\}/g, (m) => {
    const parts = m.slice(2, -2).split('|');
    return parts[parts.length - 1].trim();
  });
  // [[Page|显示文本]] -> 显示文本
  t = t.replace(/\[\[[^\]|]+\|([^\]]+)\]\]/g, '$1');
  // [[Page]] -> Page
  t = t.replace(/\[\[([^\]]+)\]\]/g, '$1');
  // '''粗体''' / ''斜体''
  t = t.replace(/'{2,}/g, '');
  return t.trim();
}

/** 从 HTML / wikitext 里抠主要出演作品表 (按电视动画 / OVA / 剧场 / 游戏 等 tab) */
function parseWorks(wikitext: string, title: string): RawSeiyuu['works_raw'] {
  // 按二级/三级标题分段,找到 "主要出演作品" / "代表作品" 之类标题
  const headings = [
    '主要出演作品', '主要作品', '代表作品', '出演作品', '主要配音作品',
    '主な出演作品', 'TV动画', '电视动画',
  ];
  // 取一个大段:从 "== 主要出演作品 ==" 开始,到下一个 "== XXX ==" 之间
  const block = grabSectionBetweenLevel2(wikitext, headings);
  if (!block) return [];
  const works: RawSeiyuu['works_raw'] = [];

  // 每一行形式  ; 年份 / 作品名 / 角色名 / 备注 的 wikitext 列表,分多种常见格式
  // 最常见两种:
  //   1) 纯列表: * ''[[作品名]]'' — [[角色名]]
  //   2) 表格: {| class="wikitable" ... |- | 年份 || 作品 || 角色 || 备注
  const tableRe = /\{\|\s*class="[^\"]*wikitable[^\"]*"([\s\S]*?)\|\}/gi;
  let m: RegExpExecArray | null;
  while ((m = tableRe.exec(block)) !== null) {
    works.push(...parseWorkTable(m[1]));
  }

  // 再扫列表形式 (没有表格的页面)
  if (works.length < 3) {
    const listRe = /^\s*\*\s*.*$/gm;
    let lm: RegExpExecArray | null;
    while ((lm = listRe.exec(block)) !== null) {
      const line = stripWikitextMarkup(lm[0]).replace(/^\*\s*/, '');
      if (!line || line.length < 2) continue;
      const parsed = parseWorkLine(line);
      if (parsed && parsed.work) works.push({ ...parsed, note: '' });
    }
  }
  return works;
}

function grabSectionBetweenLevel2(wikitext: string, headingNames: string[]): string | null {
  const lines = wikitext.split('\n');
  let startIdx = -1;
  for (let i = 0; i < lines.length; i += 1) {
    const m = lines[i].match(/^={2,6}\s*([^=]+?)\s*={2,6}\s*$/);
    if (!m) continue;
    const name = m[1].trim();
    if (headingNames.includes(name)) { startIdx = i; break; }
  }
  if (startIdx === -1) return null;
  let endIdx = lines.length;
  for (let i = startIdx + 1; i < lines.length; i += 1) {
    if (/^={2}\s*[^=]+?\s*={2}\s*$/.test(lines[i])) { endIdx = i; break; }
  }
  return lines.slice(startIdx + 1, endIdx).join('\n');
}

function parseWorkTable(block: string): RawSeiyuu['works_raw'] {
  const rows = block.split(/\s*\|-\s*/).slice(1);
  const out: RawSeiyuu['works_raw'] = [];
  for (const row of rows) {
    if (!row.trim()) continue;
    const cells = row.split(/\n?\s*\|\s*/)
      .map((c) => c.replace(/^\|/, '').trim())
      .filter((c) => c && !/^!/.test(c) && !/^class=/.test(c));
    if (cells.length < 2) continue;
    let work = '';
    let character = '';
    let note = '';
    // 通常列: (年份) || 作品 || 角色 || 备注
    // 取出现角色名那列(含角色/主人公这种关键词或者是第 2/3 列)
    const cleaned = cells.map(stripWikitextMarkup);
    for (let i = 0; i < cleaned.length; i += 1) {
      if (/^\d{4}年?$/.test(cleaned[i])) continue;
      if (!work) { work = cleaned[i]; continue; }
      if (!character) { character = cleaned[i]; continue; }
      if (!note) note = cleaned[i];
    }
    if (work && character) {
      out.push({ work, character, note });
    }
  }
  return out;
}

function parseWorkLine(line: string): { work: string; character: string } | null {
  // "xxx  —  yyy"  / "xxx-yyy" / "xxx 役 yyy"  / "「xxx」yyy"
  const splitRe = /[—–\-~～:：]+|\s+役\s+|\s+角色\s*[:：]?/;
  const parts = line.split(splitRe).map((s) => s.trim()).filter(Boolean);
  if (parts.length >= 2) return { work: parts[0], character: parts[parts.length - 1] };
  const m = line.match(/^[「『](.+?)[」』]\s*(.+)$/);
  if (m) return { work: m[1], character: m[2] };
  return null;
}

/* ------------------------------------------------------------------ */
/* 字段提取                                                            */
/* ------------------------------------------------------------------ */
function pickInfo(info: Map<string, string>, keys: string[]): string {
  for (const k of keys) {
    const v = info.get(k);
    if (v != null && v !== '') return v;
  }
  return '';
}

function parseBirthDate(s: string): string | null {
  if (!s) return null;
  const m = s.match(/(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日/);
  if (m) return `${m[1]}-${pad(m[2])}-${pad(m[3])}`;
  const m2 = s.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m2) return `${m2[1]}-${pad(m2[2])}-${pad(m2[3])}`;
  const m3 = s.match(/(\d{4})年/);
  if (m3) return `${m3[1]}-01-01`;
  return null;
}

function parseDebutYear(s: string): number | null {
  if (!s) return null;
  const m = s.match(/\b(19|20)\d{2}\b/);
  return m ? Number(m[0]) : null;
}

function parseHeight(s: string): number | null {
  if (!s) return null;
  const m = s.match(/\b(\d{2,3})\s*cm\b/);
  return m ? Number(m[1]) : null;
}

function parseBlood(s: string): string | null {
  if (!s) return null;
  const m = s.toUpperCase().match(/\b([ABO][AB]?)\s*型?\b/);
  return m ? m[1] : null;
}

function pad(s: string) { return s.length === 1 ? '0' + s : s; }

/* ------------------------------------------------------------------ */
/* 团体 groups 识别                                                    */
/* ------------------------------------------------------------------ */
function detectGroups(
  works: RawSeiyuu['works_raw'],
  groupsRaw: string[],
  pageCategories: string[],
): string[] {
  const haystacks = [
    ...works.map((w) => `${w.work} ${w.character}`),
    ...groupsRaw,
    ...pageCategories,
  ];
  const joined = haystacks.join('\n');
  const out = new Set<string>();
  for (const def of GROUP_DEFS) {
    for (const pat of def.patterns) {
      if (pat.test(joined)) { out.add(def.group); break; }
    }
  }
  return [...out];
}

/* ------------------------------------------------------------------ */
/* 把 works_raw 压缩成代表作品 & 代表角色                               */
/* ------------------------------------------------------------------ */
function pickRepresentative(
  works: RawSeiyuu['works_raw'],
  groups: string[],
): { representative_works: { work: string; character: string }[]; representative_characters: string[] } {
  // 优先把属于五大企划的角色排前面,取前 10 个作为代表作品
  const scored = works.map((w) => {
    let score = 0;
    const joined = `${w.work} ${w.character}`;
    for (const def of FIVE_KEYWORDS) {
      if (def.patterns.some((p) => p.test(joined))) { score += 100; break; }
    }
    // 若角色或作品名较长更像主角
    score += w.character.length + w.work.length * 0.1;
    return { w, score };
  });
  scored.sort((a, b) => b.score - a.score);
  // 去重
  const seen = new Set<string>();
  const picked: { work: string; character: string }[] = [];
  for (const { w } of scored) {
    const key = `${w.work}||${w.character}`;
    if (seen.has(key)) continue;
    seen.add(key);
    picked.push({ work: w.work, character: w.character });
    if (picked.length >= 10) break;
  }
  // 代表角色(纯角色名数组)
  const representative_characters = Array.from(
    new Set(picked.map((p) => p.character).filter(Boolean))
  ).slice(0, 10);
  return { representative_works: picked, representative_characters };
}

/* ------------------------------------------------------------------ */
/* 解析一整页                                                          */
/* ------------------------------------------------------------------ */
function parsePage(
  title: string,
  html: string,
  wikitext: string,
  categories: string[],
): RawSeiyuu {
  const info = parseInfobox(wikitext);
  const name = pickInfo(info, ['姓名', '艺名', '名称', '名字']) || title.replace(/\(.*\)$/, '').trim();
  const romaji = pickInfo(info, ['罗马字', '罗马音', '日文假名', '假名', '英文']);
  const birth_place = pickInfo(info, ['出身', '出身地', '出生地', '出身地区', '籍贯']);
  const agency = pickInfo(info, ['所属', '所属公司', '经纪公司', '事务所', '唱片公司']);
  const birth_date = parseBirthDate(pickInfo(info, ['出生', '出生日期', '生日', '出生年月日', '生年月日']));
  const debut_year = parseDebutYear(pickInfo(info, ['出道', '出道年份', '出道作', '出道日期', '活动时期', '活动开始']));
  const height = parseHeight(pickInfo(info, ['身高', '身长']));
  const blood_type = parseBlood(pickInfo(info, ['血型', '血液型']));
  const groups_raw = pickInfo(info, ['参与团体', '团体', '所属团体', '组合', '乐队'])
    .split(/[,、，\/；;\n]/)
    .map((s) => s.trim())
    .filter(Boolean);

  const works_raw = parseWorks(wikitext, title);
  const groups = detectGroups(works_raw, groups_raw, categories);
  const { representative_works, representative_characters } = pickRepresentative(works_raw, groups);

  return {
    title,
    name,
    romaji,
    birth_place,
    agency,
    birth_date,
    debut_year,
    height,
    blood_type,
    groups_raw,
    works_raw,
    representative_works,
    representative_characters,
    groups,
    categories,
  };
}

/* ------------------------------------------------------------------ */
/* 转成 seed 格式                                                      */
/* ------------------------------------------------------------------ */
interface SeedSeiyuu {
  name: string;
  romaji: string;
  birth_place: string;
  agency: string;
  birth_date: string | null;
  debut_year: number | null;
  height: number | null;
  blood_type: string | null;
  voice_types: string[];
  representative_works: { work: string; character: string }[];
  representative_characters: string[];
  groups: string[];
  difficulties: string[];
  is_enabled: boolean;
}

function toSeed(raw: RawSeiyuu): SeedSeiyuu {
  const isFive = raw.groups.some((g) => FIVE_KEYWORDS.some((f) => f.group === g));
  const workCount = raw.representative_works.length;
  // 难度分档: 五大企划有角色 → beginner / easy 全入 (简单池);
  //           作品 >= 8 或知名度高 → normal(完整版) 全入
  //           其他仅 normal (如果代表作品足够多)
  const difficulties: string[] = [];
  if (isFive) {
    difficulties.push('beginner', 'easy', 'normal');
  } else if (workCount >= 6 || raw.representative_characters.length >= 6) {
    difficulties.push('easy', 'normal');
  } else if (workCount >= 3) {
    difficulties.push('normal');
  }
  if (!difficulties.length) difficulties.push('normal');
  return {
    name: raw.name,
    romaji: raw.romaji,
    birth_place: raw.birth_place,
    agency: raw.agency,
    birth_date: raw.birth_date,
    debut_year: raw.debut_year,
    height: raw.height,
    blood_type: raw.blood_type,
    voice_types: [], // 已不关心声线
    representative_works: raw.representative_works,
    representative_characters: raw.representative_characters,
    groups: raw.groups,
    difficulties: [...new Set(difficulties)],
    is_enabled: true,
  };
}

/* ------------------------------------------------------------------ */
/* 数据库写入 (可选)                                                   */
/* ------------------------------------------------------------------ */
async function importIntoDb(seeds: SeedSeiyuu[]) {
  // 动态 import: 避免跑纯爬虫时也去连数据库
  const { db } = await import('../src/db/knex.js');
  try {
    console.log(`\n[db] 准备入库 ${seeds.length} 条...`);
    let upserted = 0;
    for (let i = 0; i < seeds.length; i += 50) {
      const batch = seeds.slice(i, i + 50);
      await db.transaction(async (trx) => {
        for (const s of batch) {
          const exists = await trx('seiyuus').where({ name: s.name }).first('id');
          let id: number;
          const payload = {
            name: s.name,
            romaji: s.romaji ?? '',
            birth_place: s.birth_place ?? '',
            agency: s.agency ?? '',
            birth_date: s.birth_date ?? null,
            debut_year: s.debut_year ?? null,
            height: s.height ?? null,
            blood_type: s.blood_type ?? null,
            voice_types: JSON.stringify(s.voice_types ?? []),
            representative_works: JSON.stringify(s.representative_works ?? []),
            representative_characters: JSON.stringify(s.representative_characters ?? []),
            groups: JSON.stringify(s.groups ?? []),
            is_enabled: s.is_enabled ? 1 : 0,
          } as any;
          if (exists) {
            await trx('seiyuus').where({ id: exists.id }).update(payload);
            id = Number(exists.id);
          } else {
            const [row] = await trx('seiyuus').insert(payload).returning('id');
            id = Number((row as any)?.id ?? row);
          }
          await trx('player_difficulties').where({ player_id: id }).del();
          if (s.difficulties?.length) {
            await trx('player_difficulties').insert(
              s.difficulties.map((dk) => ({ player_id: id, difficulty_key: dk }))
            );
          }
          upserted += 1;
        }
      });
      process.stdout.write(`\r  [db] 已写入 ${Math.min(i + 50, seeds.length)} / ${seeds.length}`);
    }
    console.log(`\n[db] 完成,共 ${upserted} 条。`);
    // 触发刷新 Redis 版本号
    try {
      const { invalidatePlayerCache } = await import('../src/services/playerCache.js');
      await invalidatePlayerCache();
      console.log('[db] 缓存版本号已刷新');
    } catch {
      /* Redis 未开时忽略 */
    }
  } finally {
    await db.destroy();
  }
}

/* ------------------------------------------------------------------ */
/* 主入口                                                              */
/* ------------------------------------------------------------------ */
async function main() {
  console.log('=== 萌娘百科女声优爬虫 ===');
  console.log(`limit=${LIMIT || '∞'}  only-five=${ONLY_FIVE}  import-db=${IMPORT_DB}  resume=${RESUME}`);

  let rawCache: Record<string, any> = {};
  if (RESUME && fs.existsSync(RAW_OUT)) {
    try { rawCache = JSON.parse(fs.readFileSync(RAW_OUT, 'utf8')); }
    catch { rawCache = {}; }
    console.log(`[resume] 从 ${RAW_OUT} 恢复,已有 ${Object.keys(rawCache).length} 条缓存`);
  }

  console.log('\n[1/3] 收集分类:日本女性声优 的成员...');
  const members = await getCategoryMembers('分类:日本女性声优');
  console.log(`  共 ${members.length} 个页面`);
  if (LIMIT > 0 && members.length > LIMIT) {
    console.log(`  按 --limit 只爬前 ${LIMIT} 条`);
    members.length = LIMIT;
  }

  console.log('\n[2/3] 逐页爬取基本资料+出演作品...');
  const results: RawSeiyuu[] = [];
  let skipped = 0;
  for (let i = 0; i < members.length; i += 1) {
    const { pageid, title } = members[i];
    const cacheKey = String(pageid);
    try {
      let parsed;
      if (rawCache[cacheKey] && RESUME) {
        parsed = rawCache[cacheKey].data;
        skipped += 1;
      } else {
        const page = await getParsedPage(pageid);
        // 顺便拿 categories
        const data2 = await mwGet({
          action: 'query',
          pageids: pageid,
          prop: 'categories',
          cllimit: 50,
          clshow: '!hidden',
        });
        const cats: string[] =
          (data2?.query?.pages?.[pageid]?.categories ?? []).map((c: any) => String(c.title));
        parsed = parsePage(page.title, page.html, page.wikitext, cats);
        rawCache[cacheKey] = { title, data: parsed };
        await sleep(350); // 对萌娘友好点,别打爆
      }
      // 过滤掉明显不是声优 (重定向/页面没基本资料)
      if (!parsed.agency && !parsed.birth_place && parsed.representative_works.length === 0) {
        // 无任何字段,可能是 stub 页面,跳过入库
      } else {
        results.push(parsed);
      }
      if ((i + 1) % 50 === 0) {
        console.log(`  [${i + 1}/${members.length}] 完成(跳过缓存 ${skipped}),已有效 ${results.length} 条`);
        fs.writeFileSync(RAW_OUT, JSON.stringify(rawCache, null, 0), 'utf8');
      }
    } catch (e) {
      console.warn(`  页面 ${title} (pageid=${pageid}) 失败: ${(e as Error).message}`);
    }
  }
  fs.writeFileSync(RAW_OUT, JSON.stringify(rawCache, null, 0), 'utf8');
  console.log(`  完成: 有效结果 ${results.length} 条`);

  console.log('\n[3/3] 转换为项目 seed 格式...');
  const seeded = results.map(toSeed);
  let final = seeded;
  if (ONLY_FIVE) {
    final = seeded.filter((s) =>
      s.groups.some((g) => FIVE_KEYWORDS.some((f) => f.group === g))
    );
    console.log(`  --only-five: 过滤出五大企划成员 ${final.length} / ${seeded.length}`);
  }
  // 去重
  const uniq = new Map<string, SeedSeiyuu>();
  for (const s of final) {
    if (!uniq.has(s.name)) uniq.set(s.name, s);
  }
  final = [...uniq.values()];
  fs.writeFileSync(SEED_OUT, JSON.stringify(final, null, 2), 'utf8');

  const groupCounts = new Map<string, number>();
  for (const s of final) for (const g of s.groups) groupCounts.set(g, (groupCounts.get(g) ?? 0) + 1);

  console.log(`\n======= 爬取完成 =======`);
  console.log(`  声优总数:      ${final.length}`);
  console.log(`  含五大企划:    ${final.filter((s) => s.groups.some((g) => FIVE_KEYWORDS.some((f) => f.group === g))).length}`);
  console.log(`  五大企划分档:`);
  for (const f of FIVE_KEYWORDS) {
    console.log(`    ${f.group.padEnd(25)}: ${groupCounts.get(f.group) ?? 0}`);
  }
  console.log(`  其他企划分档:`);
  for (const g of EXTRA_GROUP_KEYWORDS) {
    const c = groupCounts.get(g.group);
    if (c) console.log(`    ${g.group.padEnd(25)}: ${c}`);
  }
  console.log(`\n  原始数据: ${RAW_OUT}`);
  console.log(`  Seed JSON: ${SEED_OUT}`);

  if (IMPORT_DB) {
    await importIntoDb(final);
  }
}

main().catch((e) => {
  console.error('\n爬虫失败:', e);
  process.exit(1);
});
