import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 SeiyuGuess/1.0';
const BASE = 'https://zh.moegirl.org.cn/';
const LIST_FILE = path.resolve(__dirname, '../tmp/full-seiyuu-data.json');
const LIST_FILE_FALLBACK = path.resolve(__dirname, '../tmp/female-seiyuu-list.json');
const OUT_FILE = path.resolve(__dirname, '../tmp/recrawl-data.json');
const _argv = process.argv.slice(2);
const CONCURRENCY = Number((_argv.find((a) => a.startsWith('--concurrency=')) || '=3').split('=')[1]) || 3;
const REQ_INTERVAL_MS = Number((_argv.find((a) => a.startsWith('--interval=')) || '=300').split('=')[1]) || 300;
const PROGRESS_EVERY = 50;
const DEBUG = _argv.includes('--debug');
const TEST_MODE = _argv.includes('--test');

let globalPauseUntil = 0;

const LABELS_MAP: Record<string, string[]> = {
  agency: ['事务所', '所属事务所', '经纪公司', '所属', '配音事务所', '签约公司', '所属公司'],
  birth_place: ['出身地', '出身地区', '出生地区', '出身', '出生地', '籍贯'],
  birth_date: ['出生', '生日', '出生日期', '生年月日', '出生日', '出生年月日'],
  romaji: ['罗马字', '罗马音', '罗马字（罗马音）', '平文式罗马字'],
  debut_year: ['出道作', '出道年份', '出道', '出道年', '声优出道', '出道时间', '出道时期', '活动时期'],
  groups: ['所属团体', '所属组合', '所属乐团', '参与组合', '团体', '所属乐队', '音乐组合', '活动团体', '偶像团体', '所属单元', '参与团体'],
  blood_type: ['血型'],
  height: ['身高'],
  gender: ['性别', '性別'],
  representative_characters: ['代表角色', '代表作・代表角色', '代表角色・代表作', '代表作和代表角色', '代表角色与代表作', '代表'],
  debut_character: ['出道角色'],
  name: ['姓名'],
};

const KEYWORD_LABELS = [
  '事务所', '出生', '出身', '生日', '出道', '罗马字', '所属团体',
  '姓名', '血型', '身高', '昵称', '出道角色', '代表角色', '所属公司', '活动时期',
];

type RecrawlData = {
  name: string;
  romaji: string;
  agency: string;
  birth_place: string;
  birth_date: string | null;
  debut_year: number | null;
  groups: string[];
  representative_characters: { work: string; character: string }[];
};

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

type InfoboxRow = { label: string; valueHtml: string };

function extractTags(html: string, tag: string): string[] {
  const openRe = new RegExp('<' + tag + '\\b', 'gi');
  const closeTag = '</' + tag + '>';
  const results: string[] = [];
  let pos = 0;
  while (pos < html.length) {
    openRe.lastIndex = pos;
    const om = openRe.exec(html);
    if (!om) break;
    const openStart = om.index;
    const afterOpen = openRe.lastIndex;
    let depth = 1;
    let scan = afterOpen;
    let closeIdx = -1;
    const innerOpenRe = new RegExp('<' + tag + '\\b', 'gi');
    while (depth > 0 && scan < html.length) {
      const nextClose = html.indexOf(closeTag, scan);
      innerOpenRe.lastIndex = scan;
      const nextOpen = innerOpenRe.exec(html);
      const nextOpenIdx = nextOpen ? nextOpen.index : -1;
      if (nextClose < 0) {
        closeIdx = html.length;
        break;
      }
      if (nextOpenIdx >= 0 && nextOpenIdx < nextClose) {
        depth += 1;
        scan = nextOpenIdx + tag.length + 2;
      } else {
        depth -= 1;
        if (depth === 0) {
          closeIdx = nextClose;
          break;
        }
        scan = nextClose + closeTag.length;
      }
    }
    if (closeIdx < 0) closeIdx = html.length;
    results.push(html.slice(openStart, closeIdx + closeTag.length));
    pos = closeIdx + closeTag.length;
  }
  return results;
}

function parseInfoboxRows(infobox: string): InfoboxRow[] {
  const rows: InfoboxRow[] = [];
  const trs = extractTags(infobox, 'tr');
  for (const tr of trs) {
    const tds = extractTags(tr, 'td');
    if (tds.length >= 2) {
      const labelText = stripHtml(tds[0]);
      if (labelText.length > 0 && labelText.length <= 30) {
        const isKeywordHit = KEYWORD_LABELS.some((k) => labelText.includes(k));
        if (isKeywordHit || /^[\u4e00-\u9fa5A-Za-z]{1,12}$/.test(labelText)) {
          const valueHtml = tds.slice(1).join(' ');
          rows.push({ label: labelText, valueHtml });
        }
      }
    }
  }
  return rows;
}

function findFieldByLabel(rows: InfoboxRow[], field: string): string | null {
  const labels = LABELS_MAP[field] || [field];
  for (const row of rows) {
    const hit = labels.some((lab) => row.label.includes(lab));
    if (hit) return row.valueHtml;
  }
  return null;
}

function parseBirthDateFromValue(valueHtml: string): string | null {
  const txt = stripHtml(valueHtml);
  const full = txt.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
  if (full) {
    return `${full[1]}-${full[2].padStart(2, '0')}-${full[3].padStart(2, '0')}`;
  }
  const y = txt.match(/(19|20)\d{2}/);
  const md = txt.match(/(\d{1,2})[.月\-\/日年](\d{1,2})(日|号)?/);
  if (y && md) {
    return `${y[0]}-${md[1].padStart(2, '0')}-${md[2].padStart(2, '0')}`;
  }
  if (y) {
    return `${y[0]}-01-01`;
  }
  return null;
}

function parseAgencyFromValue(valueHtml: string): string {
  const htmlSegments = valueHtml.split(/<br\s*\/?>/gi);
  const segments = htmlSegments.map((h) => stripHtml(h).trim()).filter(Boolean);
  const recordAgency = segments.find((seg) =>
    /声优事务所/.test(seg) || /[（(]事务所[)）]/.test(seg)
  );
  if (recordAgency) {
    let name = recordAgency
      .replace(/[（(]声优事务所[)）]/g, '')
      .replace(/[（(]事务所[)）]/g, '')
      .trim();
    name = name.replace(/[（(][^（）()]*[)）]$/g, '').trim();
    return name;
  }
  const nonRecord = segments.filter((seg) => !/唱片公司/.test(seg));
  if (nonRecord.length > 0) {
    let name = nonRecord[0];
    name = name.replace(/[（(][^（）()]*[)）]$/g, '').trim();
    return name;
  }
  const txt = stripHtml(valueHtml);
  let name = txt;
  name = name.replace(/[（(][^（）()]*[)）]$/g, '').trim();
  return name;
}

function parseBirthPlaceFromValue(valueHtml: string): string {
  let txt = stripHtml(valueHtml);
  txt = txt.replace(/^日本/, '').trim();
  txt = txt.replace(/^[、,，.。\s]+/, '').trim();
  return txt;
}

function parseRomajiFromNameValue(valueHtml: string): string {
  const txt = stripHtml(valueHtml);
  const m = txt.match(/[（(]([A-Za-zōūēīäöü\-\u2019’ ' .・ー]{2,80})[)）]/);
  if (m) return m[1].trim();
  return '';
}

function parseGroupsFromValue(valueHtml: string): string[] {
  const htmlSegments = valueHtml.split(/<br\s*\/?>/gi);
  const result: string[] = [];
  for (const hs of htmlSegments) {
    const txt = stripHtml(hs);
    const subs = txt
      .split(/\n|\r|、|,|，|;|；|\//)
      .map((s) => s.trim())
      .filter(Boolean);
    for (const seg of subs) {
      const cleaned = seg.replace(/[（(][^（）()]{0,60}[)）]$/g, '').trim();
      if (cleaned && cleaned.length <= 60) result.push(cleaned);
    }
  }
  return result;
}

function parseRepCharsFromValue(valueHtml: string): { work: string; character: string }[] {
  const rawSegments = valueHtml.split(/<br\s*\/?>/gi);
  const out: { work: string; character: string }[] = [];
  for (const seg of rawSegments) {
    const txt = stripHtml(seg);
    if (!txt) continue;
    let m: RegExpMatchArray | null = txt.match(/(.+?)《(.+?)》/);
    if (!m) m = txt.match(/(.+?)[「【](.+?)[」】]/);
    if (m) {
      const character = m[1].trim();
      const work = m[2].trim();
      if (character) out.push({ character, work });
    }
  }
  if (out.length === 0) {
    const allText = stripHtml(valueHtml);
    const reBlock = /([^《「【（(]{1,40}?)[《「【]([^》」】]*)[》」】]/g;
    let mb: RegExpExecArray | null;
    while ((mb = reBlock.exec(allText)) !== null) {
      const char = mb[1].replace(/^[\s、,，。；;：:·・]+/, '').replace(/[\s、,，。；;：:·・]+$/, '').trim();
      if (!char) continue;
      out.push({ character: char, work: mb[2].trim() });
    }
  }
  return out;
}

function parseDebutCharacterYear(valueHtml: string): number | null {
  const txt = stripHtml(valueHtml);
  const y = txt.match(/(19|20)\d{2}/);
  if (y) return Number(y[0]);
  return null;
}

function parseDebutYearFromBody(html: string): number | null {
  const root = html.indexOf('id="mw-content-text"');
  if (root < 0) return null;
  const searchStart = Math.max(0, root);
  const searchEnd = Math.min(html.length, searchStart + 200000);
  const bodyHtml = html.slice(searchStart, searchEnd);
  const bodyText = stripHtml(bodyHtml);
  const re = /((?:19|20)\d{2})年[^。\n]{0,80}?出道/;
  const m = bodyText.match(re);
  if (m) return Number(m[1]);
  return null;
}

function extractMainContentText(html: string): string {
  const m = html.match(/id="mw-content-text"[^>]*>([\s\S]{1,500000}?)(?=<div[^>]*class="catlinks"|<div[^>]*id="catlinks"|$)/i);
  if (m) return stripHtml(m[1]);
  return stripHtml(html);
}

async function fetchPage(url: string): Promise<{ status: number; html: string }> {
  for (let attempt = 0; attempt < 4; attempt += 1) {
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
      if (res.status === 429 || res.status === 403) {
        globalPauseUntil = Date.now() + 15000;
        console.log(`  [${res.status}] 速率限制, 全局暂停 15s 重试 (${attempt + 1}/3) ${url.slice(BASE.length, BASE.length + 40)}`);
        await sleep(15000);
        continue;
      }
      await sleep(2000 * (attempt + 1));
      continue;
    } catch (e) {
      clearTimeout(timeout);
      await sleep(1500 * (attempt + 1));
      continue;
    }
  }
  return { status: 0, html: '' };
}

function isDisambiguationPage(html: string): boolean {
  if (/消歧义|消歧義|disambiguation/i.test(html)) return true;
  const catLinks = Array.from(html.matchAll(/\/Category:([^"'>]+)/gi)).map((m) => decodeURIComponent(m[1]));
  return catLinks.some((c) => /消歧义|消歧義/.test(c));
}

type CrawlResult =
  | { kind: 'ok'; data: RecrawlData }
  | { kind: 'not_found' }
  | { kind: 'disambiguation' }
  | { kind: 'error' };

function parseOne(name: string, html: string): CrawlResult {
  if (isDisambiguationPage(html)) return { kind: 'disambiguation' };
  const infobox = extractInfobox(html);
  const rows = parseInfoboxRows(infobox);

  const nameValue = findFieldByLabel(rows, 'name');
  const romaji = nameValue ? parseRomajiFromNameValue(nameValue) : '';

  const agencyValue = findFieldByLabel(rows, 'agency');
  const agency = agencyValue ? parseAgencyFromValue(agencyValue) : '';

  const bpValue = findFieldByLabel(rows, 'birth_place');
  const birth_place = bpValue ? parseBirthPlaceFromValue(bpValue) : '';

  const bdValue = findFieldByLabel(rows, 'birth_date');
  const birth_date = bdValue ? parseBirthDateFromValue(bdValue) : null;

  let debut_year: number | null = null;
  const debutValue = findFieldByLabel(rows, 'debut_year');
  if (debutValue) {
    const dy = stripHtml(debutValue).match(/(19|20)\d{2}/);
    if (dy) debut_year = Number(dy[0]);
  }
  if (!debut_year) {
    const dcValue = findFieldByLabel(rows, 'debut_character');
    if (dcValue) debut_year = parseDebutCharacterYear(dcValue);
  }
  if (!debut_year) {
    debut_year = parseDebutYearFromBody(html);
  }

  const groupsValue = findFieldByLabel(rows, 'groups');
  const groups = groupsValue ? parseGroupsFromValue(groupsValue) : [];

  const repValue = findFieldByLabel(rows, 'representative_characters');
  const representative_characters = repValue ? parseRepCharsFromValue(repValue) : [];

  const data: RecrawlData = {
    name,
    romaji,
    agency,
    birth_place,
    birth_date,
    debut_year,
    groups,
    representative_characters,
  };

  return { kind: 'ok', data };
}

async function crawlOne(name: string): Promise<CrawlResult> {
  const candidates = [
    BASE + encodeURIComponent(name),
    BASE + encodeURIComponent(name + '_(声优)'),
  ];
  let lastStatus = 0;
  for (let ci = 0; ci < candidates.length; ci += 1) {
    const url = candidates[ci];
    const { status, html } = await fetchPage(url);
    await sleep(REQ_INTERVAL_MS);
    if (status !== 200 || !html) {
      if (status === 404) lastStatus = 404;
      if (DEBUG) console.log(`  [debug] ${name} candidate#${ci} status=${status}`);
      continue;
    }
    const r = parseOne(name, html);
    if (DEBUG) console.log(`  [debug] ${name} candidate#${ci} parse=${r.kind}`);
    if (r.kind === 'ok') return r;
    if (r.kind === 'disambiguation') return r;
  }
  if (lastStatus === 404) return { kind: 'not_found' };
  return { kind: 'error' };
}

async function testSample(name: string, debugFile: string): Promise<void> {
  console.log(`\n========== 测试样本: ${name} ==========`);
  if (existsSync(debugFile)) {
    const html = readFileSync(debugFile, 'utf8');
    const r = parseOne(name, html);
    if (r.kind === 'ok') {
      console.log(JSON.stringify(r.data, null, 2));
    } else {
      console.log('解析失败:', r.kind);
    }
  } else {
    const r = await crawlOne(name);
    if (r.kind === 'ok') {
      console.log(JSON.stringify(r.data, null, 2));
    } else {
      console.log('爬取失败:', r.kind);
    }
  }
}

async function main() {
  if (TEST_MODE) {
    console.log('=== 测试模式 ===');
    await testSample('花泽香菜', path.resolve(__dirname, '../tmp/_debug_花泽香菜.html'));
    await testSample('悠木碧', path.resolve(__dirname, '../tmp/_debug_悠木碧.html'));
    await testSample('立石凛', path.resolve(__dirname, '../tmp/_debug_立石凛.html'));
    return;
  }

  let list: { name: string }[] = [];
  if (existsSync(LIST_FILE)) {
    const raw = JSON.parse(readFileSync(LIST_FILE, 'utf8'));
    list = raw.map((x: any) => ({ name: x.name }));
  } else if (existsSync(LIST_FILE_FALLBACK)) {
    const raw = JSON.parse(readFileSync(LIST_FILE_FALLBACK, 'utf8'));
    list = raw.map((x: any) => ({ name: x.name }));
  } else {
    console.error('找不到名单文件');
    process.exit(1);
  }
  console.log(`[list] 声优名单: ${list.length} 名`);

  const results: RecrawlData[] = existsSync(OUT_FILE)
    ? JSON.parse(readFileSync(OUT_FILE, 'utf8'))
    : [];
  const doneNames = new Set(results.map((r) => r.name));
  console.log(`[resume] 已有结果: ${results.length} 名, 将跳过`);

  const queue = list.filter((x) => !doneNames.has(x.name));
  console.log(`[queue] 待爬取: ${queue.length} 名, 并发=${CONCURRENCY}, 间隔=${REQ_INTERVAL_MS}ms\n`);

  let cursor = 0;
  let success = 0;
  let notFound = 0;
  let disambiguation = 0;
  let errors = 0;
  const startTime = Date.now();

  const saveAll = () => {
    writeFileSync(OUT_FILE, JSON.stringify(results, null, 2), 'utf8');
  };

  function printProgress(processed: number) {
    const total = queue.length;
    const speed = processed / Math.max(0.5, (Date.now() - startTime) / 1000);
    const current = results.slice(Math.max(0, results.length - PROGRESS_EVERY));
    const ag = current.filter((r) => r.agency).length;
    const bd = current.filter((r) => r.birth_date).length;
    const dy = current.filter((r) => r.debut_year).length;
    const gr = current.filter((r) => r.groups.length > 0).length;
    const rc = current.filter((r) => r.representative_characters.length > 0).length;
    const base = current.length || 1;
    console.log(
      `[进度] ${processed}/${total}  成功=${success}  404=${notFound}  消歧义=${disambiguation}  错误=${errors}  累计=${results.length}  speed=${speed.toFixed(1)}/s`
    );
    console.log(
      `  命中率（最近${current.length}条）: 事务所=${(ag / base * 100).toFixed(0)}%  生日=${(bd / base * 100).toFixed(0)}%  出道年=${(dy / base * 100).toFixed(0)}%  团体=${(gr / base * 100).toFixed(0)}%  代表角色=${(rc / base * 100).toFixed(0)}%`
    );
  }

  async function worker(workerId: number) {
    while (true) {
      const i = cursor;
      cursor += 1;
      if (i >= queue.length) break;
      const item = queue[i];
      try {
        const r = await crawlOne(item.name);
        if (r.kind === 'ok') {
          results.push(r.data);
          doneNames.add(item.name);
          success += 1;
        } else if (r.kind === 'not_found') {
          notFound += 1;
        } else if (r.kind === 'disambiguation') {
          disambiguation += 1;
        } else {
          errors += 1;
        }
      } catch (e) {
        errors += 1;
        console.error(`[err] ${item.name}:`, (e as Error).message);
      }

      const processed = success + notFound + disambiguation + errors;
      if (processed > 0 && processed % PROGRESS_EVERY === 0) {
        printProgress(processed);
        saveAll();
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, (_, i) => worker(i + 1)));
  saveAll();

  const total = results.length;
  const agencyHit = results.filter((r) => r.agency).length;
  const birthDateHit = results.filter((r) => r.birth_date).length;
  const debutYearHit = results.filter((r) => r.debut_year).length;
  const groupsHit = results.filter((r) => r.groups.length > 0).length;
  const repCharHit = results.filter((r) => r.representative_characters.length > 0).length;

  console.log('\n========== 完成 ==========');
  console.log(`总爬取数: ${success + notFound + disambiguation + errors}`);
  console.log(`成功数: ${success}`);
  console.log(`失败数:`);
  console.log(`  - 404/不存在: ${notFound}`);
  console.log(`  - 消歧义页: ${disambiguation}`);
  console.log(`  - 其他错误: ${errors}`);
  console.log(`\n字段提取率（共 ${total} 条成功数据）:`);
  console.log(`  - 事务所 agency: ${agencyHit}/${total} (${(agencyHit / total * 100).toFixed(1)}%)`);
  console.log(`  - 出生日 birth_date: ${birthDateHit}/${total} (${(birthDateHit / total * 100).toFixed(1)}%)`);
  console.log(`  - 出道年 debut_year: ${debutYearHit}/${total} (${(debutYearHit / total * 100).toFixed(1)}%)`);
  console.log(`  - 团体 groups: ${groupsHit}/${total} (${(groupsHit / total * 100).toFixed(1)}%)`);
  console.log(`  - 代表角色 representative_characters: ${repCharHit}/${total} (${(repCharHit / total * 100).toFixed(1)}%)`);

  const knownNames = ['花泽香菜', '悠木碧', '立石凛'];
  console.log('\n========== 样本验证 ==========');
  for (const kn of knownNames) {
    const found = results.find((r) => r.name === kn);
    if (found) {
      console.log(`\n[${kn}]`);
      console.log(JSON.stringify(found, null, 2));
    } else {
      console.log(`\n[${kn}] 未在结果中找到`);
    }
  }
  console.log(`\n已输出: ${OUT_FILE}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
