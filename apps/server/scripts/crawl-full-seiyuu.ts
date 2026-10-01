/**
 * 萌娘百科女声优全量爬虫
 * ------------------------------------------------------------
 * 数据来源: server/tmp/female-seiyuu-list.json (来自「声优出生年代索引」模板页, 2067 名女声优)
 * 逐个爬取萌娘百科详情页, 复用 crawl-moegirl3.ts 的 HTML 解析逻辑,
 * 并严格过滤虚拟角色 (缺少声优 infobox / 分类为角色 / 数据全空).
 *
 * 运行:
 *   cd d:\Seiyu-guess\server ; pnpm tsx scripts/crawl-full-seiyuu.ts
 * 支持断点续爬: 若 tmp/full-seiyuu-data.json 已存在, 跳过已爬名字.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// =============================================================
//  常量
// =============================================================
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 SeiyuGuess/1.0';
const BASE = 'https://zh.moegirl.org.cn/';
const LIST_FILE = path.resolve(__dirname, '../tmp/female-seiyuu-list.json');
const OUT_FILE = path.resolve(__dirname, '../tmp/full-seiyuu-data.json');
const _argv = process.argv.slice(2);
const CONCURRENCY = Number((_argv.find((a) => a.startsWith('--concurrency=')) || '=3').split('=')[1]) || 3;
const REQ_INTERVAL_MS = Number((_argv.find((a) => a.startsWith('--interval=')) || '=300').split('=')[1]) || 300;
const PROGRESS_EVERY = 50;
const DEBUG = _argv.includes('--debug');
// 全局限流暂停: 任一 worker 遇到 403/429 时, 所有 worker 暂停至此时间, 让限流真正重置
let globalPauseUntil = 0;

// 五大企划定义 (按任务给定的关键词, 搜索范围 = 名字 + groups + representative_characters)
const FIVE_GROUPS_DEF: { name: string; keywords: string[] }[] = [
  {
    name: 'LoveLive!',
    keywords: ['LoveLive!', 'ラブライブ!', '虹咲学园', 'Liella!', '莲之空', 'Aqours', "μ's", 'ニジガク', 'Superstar'],
  },
  {
    name: 'BanG Dream!（邦邦）',
    keywords: ['BanG Dream', 'バンドリ!', 'MyGO', 'Ave Mujica', 'Roselia', "Poppin'Party", 'Pastel', 'Afterglow', 'Hello Happy'],
  },
  {
    name: '偶像大师系列',
    keywords: [
      '偶像大师', 'Idol Master', 'アイドルマスター', 'THE IDOLM@STER', '百万现场', '闪耀色彩', '灰姑娘',
      'SideM', 'Shiny Colors', 'ミリオンライブ', 'シンデレラガールズ',
    ],
  },
  {
    name: '赛马娘 Pretty Derby',
    keywords: ['赛马娘', 'ウマ娘', 'Pretty Derby', 'トレセン学園'],
  },
  {
    name: '少女歌剧 Revue Starlight',
    keywords: ['少女歌剧', 'Revue Starlight', 'レヴュースタァライト', '九九组'],
  },
];

// =============================================================
//  HTML 工具 (复用自 crawl-moegirl3.ts)
// =============================================================
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
  out = out.replace(/<script[\s\S]*?<\/script>/gi, '');
  out = out.replace(/<style[\s\S]*?<\/style>/gi, '');
  out = out.replace(/<sup[\s\S]*?<\/sup>/gi, '');
  out = out.replace(/<[^>]+>/g, ' ');
  out = unescapeHtml(out);
  out = out.replace(/<[^>]+>/g, ' ');
  out = out.replace(/\b(style|class|width|height|alt|title)=("[^"]*"|'[^']*'|[^\s>]+)/gi, ' ');
  out = out.replace(/\b\d+px\b/gi, ' ');
  out = out.replace(/Lua错误[^\n]{0,120}/g, ' ');
  out = out.replace(/Module:[A-Za-z0-9_ /]+第\d+行/g, ' ');
  out = out.replace(/bad argument[^\n]{0,100}/g, ' ');
  out = out.replace(/table expected, got nil[^\n]{0,60}/g, ' ');
  out = out.replace(/\s+/g, ' ').trim();
  return out;
}

function cleanCellNotes(s: string) {
  let out = s;
  out = out.replace(/\([^()]*?(事务所|唱片公司|声优事务所|业务提携|母公司|业务合作|声优业|歌手业|旁白业|配音演员业|配音业|唱片业|经纪)[^()]*?\)/g, ' ');
  out = out.replace(/\[[^\[\]]*?(事务所|唱片公司|经纪|参考|来源|链接|外部)[^\[\]]*?\]/g, ' ');
  out = out.replace(/\s*([、,，;；\/／])\s*\1+/g, '$1');
  out = out.replace(/^[、,，;；\/／\s]+|[、,，;／／\s]+$/g, '');
  out = out.replace(/\s+/g, ' ').trim();
  return out;
}

// =============================================================
//  Infobox 解析 (复用自 crawl-moegirl3.ts)
// =============================================================
/** 找到 <table start> 对应的匹配 </table> (处理嵌套 table) */
function findMatchingTableEnd(html: string, start: number): number {
  let depth = 1;
  let pos = start + 6;
  while (pos < html.length) {
    const nextOpen = html.indexOf('<table', pos);
    const nextClose = html.indexOf('</table>', pos);
    if (nextClose < 0) return html.length;
    if (nextOpen >= 0 && nextOpen < nextClose) {
      depth++;
      pos = nextOpen + 6;
    } else {
      depth--;
      if (depth === 0) return nextClose;
      pos = nextClose + 8;
    }
  }
  return html.indexOf('</table>', start);
}

function extractInfobox(html: string): string {
  let start = -1;
  const trMatch = html.search(/<tr\b[^>]*class="[^"]*infobox-title[^"]*"/i);
  if (trMatch > 0) {
    start = html.lastIndexOf('<table', trMatch);
  }
  if (start < 0) {
    const root = html.indexOf('id="mw-content-text"');
    const searchFrom = root > 0 ? root : 0;
    const tableRe = /<table\b/gi;
    let tm: RegExpExecArray | null;
    tableRe.lastIndex = searchFrom;
    while ((tm = tableRe.exec(html)) !== null) {
      const idx = tm.index;
      const next = findMatchingTableEnd(html, idx);
      const slice = next > 0 ? html.slice(idx, Math.min(next + 9, idx + 120000)) : html.slice(idx, idx + 120000);
      const keys = ['事务所', '出身', '出生', '生日', '出道', '罗马字', '所属团体', '性别', '血型', '身高', '活动时期'];
      let hit = 0;
      for (const k of keys) if (slice.includes(k)) { hit += 1; if (hit >= 3) break; }
      if (hit >= 3 || /infobox-title/i.test(slice)) { start = idx; break; }
      if (next > 0) tableRe.lastIndex = next + 9;
    }
  }
  if (start < 0) return html.slice(0, 60000);
  const end = findMatchingTableEnd(html, start);
  const inf = end > 0 ? html.slice(start, end + 9) : html.slice(start, start + 120000);
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
    if (tds.length >= 2) {
      for (let i = 0; i < tds.length - 1; i += 1) {
        const left = stripHtml(tds[i]);
        if (left.length > 16) continue;
        const hit = arr.some((lab) => left.includes(lab));
        if (!hit) continue;
        const rest = tds.slice(i + 1).join(' ');
        if (rest) return rest;
      }
    }
    if (!ths.length || !tds.length) continue;
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
  for (const lab of arr) {
    const re = new RegExp(
      '<th[^>]*>\\s*<[^>]*>\\s*' + lab.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[\\s\\S]{0,60}?<\\/th>\\s*(<td[^>]*>[\\s\\S]{0,8000}?<\\/td>)',
      'i'
    );
    const m = infobox.match(re);
    if (m) return m[1];
  }
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

function guessRomajiFromInfobox(html: string, name: string): string {
  const infobox = extractInfobox(html);
  const trs = infobox.match(/<tr[\s\S]*?<\/tr>/gi) || [];
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

function parseRepCharsFromInfobox(infobox: string): { work: string; character: string }[] {
  let raw: string | null = parseInfoboxField(infobox, 'representative_characters');
  if (!raw) {
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
  const blocks: string[] = [];
  const reBlock = /([^《「【（(]{1,40}?)[《「【]([^》」】]*)[》」】]/g;
  let mb: RegExpExecArray | null;
  while ((mb = reBlock.exec(text)) !== null) {
    const char = mb[1].replace(/^[\s、,，。；;：:·・]+/, '').replace(/[\s、,，。；;：:·・]+$/, '').trim();
    if (!char) continue;
    blocks.push(char + '《' + mb[2].trim() + '》');
  }
  if (!blocks.length) {
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

// 根据代表角色推断所属偶像团体/企划子组合 (复用自 crawl-moegirl3.ts)
const LL_CHAR_TO_GROUP: Array<{ group: string; chars: RegExp }> = [
  { group: "μ's", chars: /高坂穗乃果|绚濑绘里|南小鸟|南琴梨|园田海未|星空凛|西木野真姬|东条希|小泉花阳|矢泽妮可/i },
  { group: 'Aqours', chars: /高海千歌|樱内梨子|松浦果南|黑泽黛雅|渡边曜|津岛善子|国木田花丸|小原鞠莉|黑泽露比/i },
  { group: '虹咲学园学园偶像同好会', chars: /上原步梦|中须霞|樱坂雫|朝香果林|宫下爱|近江彼方|优木雪菜|艾玛·维尔德|天王寺璃奈|三船栞子|米娅·泰勒|钟岚珠/i },
  { group: 'Liella!', chars: /涩谷香音|唐可可|岚千砂都|平安名堇|叶月恋|樱小路希奈子|若菜四季|米女芽衣|薮岛朱音|鬼冢夏美|维恩·玛格丽特|百田凛|鬼冢冬毬/i },
  { group: '莲之空女学院学园偶像俱乐部', chars: /日野下花帆|安养寺姬芽|狮子神利架|百生吟子|夕雾缀理|大泽瑠璃乃|藤岛慈|村野沙耶香|出云咲姬|花冈梦羽|伊户井十重|安积永梦|东悠|村浦かずさ|若柳セリオ|安藤づ|莲之空/i },
];

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
  return Array.from(set).filter((g) => g && g.length <= 40);
}

// =============================================================
//  过滤 & 五大企划检测 (新增)
// =============================================================
type SeiyuuData = {
  name: string;
  romaji: string;
  agency: string;
  birth_place: string;
  birth_date: string | null;
  debut_year: number | null;
  groups: string[];
  representative_characters: { work: string; character: string }[];
  five_groups: string[];
};

/** 统计 infobox 中声优关键字出现数 (事务所/出生/出道/代表角色) */
function countSeiyuuInfoboxKeys(infobox: string): number {
  const checks = [
    /事务所|经纪公司|所属公司/,
    /出生|出身|生日/,
    /出道/,
    /代表角色|代表作/,
  ];
  let present = 0;
  for (const re of checks) if (re.test(infobox)) present += 1;
  return present;
}

/** 分类里包含"角色"/"登场人物"/"虚拟角色"且不含"声优"/"配音演员" → 是角色页 */
function isCharacterCategory(html: string): boolean {
  // 萌娘百科分类以 /Category:xxx 链接形式存在于 HTML (catlinks div 不易定位)
  const catLinks = Array.from(html.matchAll(/\/Category:([^"'>]+)/gi)).map((m) =>
    decodeURIComponent(m[1])
  );
  if (catLinks.length === 0) return false; // 找不到分类, 不据此过滤
  const cats = catLinks.join(' ');
  const hasSeiyuu = /声优|配音演员|配音/.test(cats);
  const hasChar = /角色|登场人物|虚拟角色/.test(cats);
  return hasChar && !hasSeiyuu;
}

/** 五大企划检测: 搜索范围 = 名字 + groups + representative_characters(work+character) */
function detectFiveGroups(
  name: string,
  groups: string[],
  repChars: { work: string; character: string }[]
): string[] {
  const hay = (
    name +
    '\n' +
    groups.join('\n') +
    '\n' +
    repChars.map((c) => c.work + ' ' + c.character).join('\n')
  ).toLowerCase();
  const hits: string[] = [];
  for (const g of FIVE_GROUPS_DEF) {
    for (const kw of g.keywords) {
      if (hay.includes(kw.toLowerCase())) {
        hits.push(g.name);
        break;
      }
    }
  }
  return hits;
}

/** 解析详情页 + 过滤虚拟角色. 返回 'ok' | 'not_seiyuu' | 'sparse' */
function parseAndFilter(name: string, html: string): { kind: 'ok'; data: SeiyuuData } | { kind: 'not_seiyuu' } | { kind: 'sparse' } {
  const infobox = extractInfobox(html);

  // 过滤1: 缺少声优 infobox. 4 个关键字(事务所/出生/出道/代表角色)中出现数 < 2 → 非声优页
  // (虚拟角色 infobox 通常只有"出生/生日", present<=1; 真实声优至少有"出生"+另一项, present>=2)
  if (countSeiyuuInfoboxKeys(infobox) < 2) return { kind: 'not_seiyuu' };

  // 过滤2: 分类是角色/人物而非声优
  if (isCharacterCategory(html)) return { kind: 'not_seiyuu' };

  // 解析字段
  const agency = parseAgency(infobox);
  const birth_place = parseBirthPlace(infobox);
  const repCharsIB = parseRepCharsFromInfobox(infobox);
  const works = parseWorksSection(html);

  // 合并代表角色 (infobox 优先, 再补作品区加粗项, 再补其他)
  const repChars: { work: string; character: string }[] = [];
  const seen = new Set<string>();
  const push = (c: { work: string; character: string }) => {
    const k = (c.work || '') + '|' + c.character;
    if (seen.has(k) || !c.character) return;
    seen.add(k);
    repChars.push(c);
  };
  for (const c of repCharsIB) push(c);
  for (const w of works.filter((w) => w.bold)) {
    if (repChars.length >= 20) break;
    push({ work: w.work, character: w.character });
  }
  for (const w of works) {
    if (repChars.length >= 25) break;
    push({ work: w.work, character: w.character });
  }

  const groups = inferAllGroups(infobox, repChars, name);
  const five_groups = detectFiveGroups(name, groups, repChars);

  // 过滤3: 数据全空 (没有事务所/出生地/代表角色/团体)
  if (!agency && !birth_place && repChars.length === 0 && groups.length === 0) {
    return { kind: 'sparse' };
  }

  return {
    kind: 'ok',
    data: {
      name,
      romaji: guessRomajiFromInfobox(html, name),
      agency,
      birth_place,
      birth_date: parseBirthDate(infobox),
      debut_year: parseDebutYear(infobox),
      groups,
      representative_characters: repChars.slice(0, 30),
      five_groups,
    },
  };
}

// =============================================================
//  网络抓取
// =============================================================
async function fetchPage(url: string): Promise<{ status: number; html: string }> {
  // 429/403 等待 15s 重试, 最多重试 3 次 (共 4 次尝试); 命中时触发全局限流暂停
  for (let attempt = 0; attempt < 4; attempt += 1) {
    // 全局限流暂停: 其他 worker 遇到 403/429 时, 本请求也等待, 让限流重置
    if (Date.now() < globalPauseUntil) await sleep(globalPauseUntil - Date.now());
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': UA,
          'Accept-Language': 'zh-CN,zh;q=0.9,ja;q=0.8',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          Referer: 'https://zh.moegirl.org.cn/',
        },
        redirect: 'follow',
      });
      clearTimeout(timeout);
      if (res.status === 200) {
        const html = await res.text();
        if (html.includes('萌百娘找不到这个页面')) return { status: 404, html: '' };
        return { status: 200, html };
      }
      if (res.status === 404) return { status: 404, html: '' };
      // 429 / 403: 萌娘百科速率限制 (403 也常为限流), 等待 15s 重试, 最多 3 次
      if (res.status === 429 || res.status === 403) {
        // 触发全局限流暂停: 所有 worker 都暂停 15s, 让限流真正重置
        globalPauseUntil = Date.now() + 15000;
        console.log(`  [${res.status}] 速率限制, 全局暂停 15s 重试 (${attempt + 1}/3) ${url.slice(BASE.length, BASE.length + 40)}`);
        await sleep(15000);
        continue;
      }
      // 其他错误: 退避重试
      await sleep(2000 * (attempt + 1));
      continue;
    } catch (e) {
      clearTimeout(timeout);
      // 超时/网络错误: 退避重试
      await sleep(1500 * (attempt + 1));
      continue;
    }
  }
  return { status: 0, html: '' };
}

/** 爬取单个声优: 先试主 URL, 失败/非声优页再试 (声优) 后缀 */
async function crawlOne(name: string): Promise<SeiyuuData | null> {
  const candidates = [
    BASE + encodeURIComponent(name),
    BASE + encodeURIComponent(name) + '_(声优)',
  ];
  for (let ci = 0; ci < candidates.length; ci += 1) {
    const url = candidates[ci];
    const { status, html } = await fetchPage(url);
    await sleep(REQ_INTERVAL_MS);
    if (status !== 200 || !html) {
      if (DEBUG) console.log(`  [debug] ${name} candidate#${ci} status=${status}`);
      continue;
    }
    const r = parseAndFilter(name, html);
    if (DEBUG) console.log(`  [debug] ${name} candidate#${ci} filter=${r.kind}`);
    if (r.kind === 'ok') return r.data;
    if (r.kind === 'not_seiyuu') continue; // 主页可能是角色页, 尝试 (声优) 后缀
    // sparse: 是声优页但无可用数据, 不再尝试后缀
    return null;
  }
  return null;
}

// =============================================================
//  主流程
// =============================================================
async function main() {
  // 读取名单
  if (!existsSync(LIST_FILE)) {
    console.error('找不到名单文件:', LIST_FILE);
    process.exit(1);
  }
  const list: { name: string; decade: string }[] = JSON.parse(readFileSync(LIST_FILE, 'utf8'));
  console.log(`[list] 女声优名单: ${list.length} 名`);

  // 断点续爬: 读取已有结果
  const results: SeiyuuData[] = existsSync(OUT_FILE)
    ? JSON.parse(readFileSync(OUT_FILE, 'utf8'))
    : [];
  const doneNames = new Set(results.map((r) => r.name));
  console.log(`[resume] 已有结果: ${results.length} 名, 将跳过`);

  const queue = list.filter((x) => !doneNames.has(x.name));
  console.log(`[queue] 待爬取: ${queue.length} 名, 并发=${CONCURRENCY}, 间隔=${REQ_INTERVAL_MS}ms\n`);

  let cursor = 0;
  let success = 0;
  let fail = 0;
  const startTime = Date.now();

  const saveAll = () => {
    writeFileSync(OUT_FILE, JSON.stringify(results, null, 2), 'utf8');
  };

  async function worker(workerId: number) {
    while (true) {
      const i = cursor;
      cursor += 1;
      if (i >= queue.length) break;
      const item = queue[i];
      try {
        const data = await crawlOne(item.name);
        if (data) {
          results.push(data);
          doneNames.add(item.name);
          success += 1;
        } else {
          fail += 1;
        }
      } catch (e) {
        fail += 1;
        console.error(`[err] ${item.name}:`, (e as Error).message);
      }

      const processed = success + fail;
      if (processed % PROGRESS_EVERY === 0) {
        const total = queue.length;
        const speed = processed / Math.max(0.5, (Date.now() - startTime) / 1000);
        const five = results.filter((r) => r.five_groups.length > 0).length;
        console.log(
          `[w${workerId}] 进度 ${processed}/${total}  成功=${success}  失败=${fail}  累计=${results.length}  五大=${five}  speed=${speed.toFixed(1)}/s`
        );
        saveAll();
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, (_, i) => worker(i + 1)));

  saveAll();

  // 最终统计
  const fiveTotal = results.filter((r) => r.five_groups.length > 0).length;
  console.log('\n========== 完成 ==========');
  console.log(`总成功数: ${results.length} (本次新增 ${success})`);
  console.log(`失败/跳过数: ${fail}`);
  console.log(`五大企划相关人数: ${fiveTotal}`);
  console.log('五大企划分布:');
  for (const g of FIVE_GROUPS_DEF) {
    const n = results.filter((r) => r.five_groups.includes(g.name)).length;
    console.log(`  - ${g.name}: ${n}`);
  }
  console.log(`\n已输出: ${OUT_FILE}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
