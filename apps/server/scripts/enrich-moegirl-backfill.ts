/**
 * 萌娘百科补爬脚本 (阶段2)
 * ------------------------------------------------------------
 * 对新 DB(seiyuu-bangumi.sqlite3)中仍缺失的 birth_date/birth_place/agency,
 * 爬萌娘百科声优详情页补全。
 *
 * 运行:
 *   pnpm tsx scripts/enrich-moegirl-backfill.ts
 *
 * 原则:只补真实数据,不覆盖已有值,不编造。
 */
import { setTimeout as sleep } from 'node:timers/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.resolve(__dirname, '../data/seiyuu-bangumi.sqlite3');

// =============================================================
//  萌娘百科 HTTP 请求(复用 crawl-moegirl3.ts 的逻辑)
// =============================================================
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36';
const REFERENCES = [
  'https://zh.moegirl.org.cn/',
  'https://zh.moegirl.org.cn/Mainpage',
];
let reqCount = 0;

async function mgFetch(raw: string): Promise<{ status: number; html: string }> {
  const url = raw.startsWith('http') ? raw : 'https://zh.moegirl.org.cn' + raw;
  const maxTry = 3;
  reqCount += 1;
  for (let attempt = 1; attempt <= maxTry; attempt += 1) {
    const controller = new AbortController();
    const to = setTimeout(() => controller.abort(), 9000);
    try {
      const r = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': UA,
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.6',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          Referer: REFERENCES[(reqCount + attempt) % REFERENCES.length],
        },
        redirect: 'follow',
      });
      clearTimeout(to);
      if (r.status === 200) {
        const html = await r.text();
        if (html.includes('萌百娘找不到这个页面')) return { status: 404, html: '' };
        return { status: 200, html };
      }
      if (r.status === 404) return { status: 404, html: '' };
      if (r.status === 403 || r.status === 429 || r.status >= 500) {
        await sleep(800 * attempt * attempt);
        continue;
      }
      return { status: r.status, html: '' };
    } catch {
      clearTimeout(to);
      await sleep(400 * attempt);
    }
  }
  return { status: 0, html: '' };
}

// =============================================================
//  HTML 解析工具(从 crawl-moegirl3.ts 精简复用)
// =============================================================
function stripHtml(s: string): string {
  const unescapeHtml = (t: string) =>
    t.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
      .replace(/&#(\d+);/g, (_m, d) => String.fromCharCode(Number(d)))
      .replace(/&#x([0-9a-fA-F]+);/g, (_m, h) => String.fromCharCode(parseInt(h, 16)))
      .replace(/&amp;/g, '&');
  let out = s.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<sup[\s\S]*?<\/sup>/gi, '').replace(/<[^>]+>/g, ' ');
  out = unescapeHtml(out).replace(/<[^>]+>/g, ' ');
  out = out.replace(/\b(style|class|width|height|alt|title)=("[^"]*"|'[^']*'|[^\s>]+)/gi, ' ');
  out = out.replace(/\s+/g, ' ').trim();
  return out;
}

function cleanCellNotes(s: string): string {
  let out = s.replace(/\([^()]*?(事务所|唱片公司|声优事务所|业务提携|母公司|业务合作|声优业|歌手业|旁白业|配音演员业|配音业|唱片业|经纪)[^()]*?\)/g, ' ');
  out = out.replace(/\[[^\[\]]*?(事务所|唱片公司|经纪|参考|来源|链接|外部)[^\[\]]*?\]/g, ' ');
  out = out.replace(/\s*([、,，;；\/／])\s*\1+/g, '$1');
  out = out.replace(/^[、,，;；\/／\s]+|[、,，;／／\s]+$/g, '');
  return out.replace(/\s+/g, ' ').trim();
}

function extractInfobox(html: string): string {
  let start = -1;
  const trMatch = html.search(/<tr\b[^>]*class="[^"]*infobox-title[^"]*"/i);
  if (trMatch > 0) start = html.lastIndexOf('<table', trMatch);
  if (start < 0) {
    const root = html.indexOf('id="mw-content-text"');
    const searchFrom = root > 0 ? root : 0;
    const tableRe = /<table\b/gi;
    let m: RegExpExecArray | null;
    while ((m = tableRe.exec(html.slice(searchFrom))) !== null) {
      const idx = searchFrom + m.index;
      const next = html.indexOf('<table', idx + 9);
      const end = next > 0 ? next : idx + 20000;
      const slice = html.slice(idx, end);
      const keys = ['事务所', '出身', '出生', '生日', '出道', '罗马字', '所属团体', '性别', '血型', '身高'];
      let hit = 0;
      for (const k of keys) if (slice.includes(k)) { hit += 1; if (hit >= 3) break; }
      if (hit >= 3 || /infobox-title/i.test(slice)) { start = idx; break; }
      if (next > 0) tableRe.lastIndex = next + 9;
    }
  }
  if (start < 0) return '';
  const end = html.indexOf('</table>', start);
  const inf = end > 0 ? html.slice(start, end + 9) : html.slice(start, start + 120000);
  if (inf.length < 400) return '';
  return inf;
}

const FIELD_LABELS: Record<string, string[]> = {
  agency: ['事务所', '所属事务所', '经纪公司', '所属', '配音事务所', '签约公司', '所属公司'],
  birth_place: ['出身地', '出身地区', '出生地区', '出身', '出生地', '籍贯'],
  birth_date: ['出生', '生日', '出生日期', '生年月日', '出生日', '出生年月日'],
};

function parseInfoboxField(infobox: string, label: string): string | null {
  const arr = FIELD_LABELS[label] || [label];
  const trs = infobox.match(/<tr[\s\S]*?<\/tr>/gi) || [];
  for (const tr of trs) {
    const ths = tr.match(/<th[\s\S]*?<\/th>/gi) || [];
    const tds = tr.match(/<td[\s\S]*?<\/td>/gi) || [];
    if (tds.length >= 2) {
      for (let i = 0; i < tds.length - 1; i += 1) {
        const left = stripHtml(tds[i]);
        if (left.length > 16) continue;
        if (arr.some((lab) => left.includes(lab))) {
          const rest = tds.slice(i + 1).join(' ');
          if (rest) return rest;
        }
      }
    }
    if (!ths.length || !tds.length) continue;
    for (let i = 0; i < ths.length; i += 1) {
      const thText = stripHtml(ths[i]);
      if (arr.some((lab) => thText.includes(lab))) {
        const td = tds[i] || tds[tds.length - 1];
        if (td) return td;
      }
    }
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
  // 提取年份 (19xx 或 20xx)
  const yMatch = txt.match(/(?:19|20)\d{2}/);
  const y = yMatch ? yMatch[0] : null;
  if (!y) return null;
  // 把年份从文本中移除,避免 "1988年8月10日" 中的 "88" 被识别为月份
  const txtNoYear = txt.replace(y, ' ');
  // 匹配月日: "M月D日"、"M.D"、"M-D"、"M/D"、"M月D号"
  const mdMatch = txtNoYear.match(/(\d{1,2})\s*[.月\-\/]\s*(\d{1,2})\s*(?:日|号)?/);
  if (mdMatch) {
    const m = Number(mdMatch[1]);
    const d = Number(mdMatch[2]);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
  }
  // 仅匹配月份: "M月"
  const mOnly = txtNoYear.match(/(\d{1,2})\s*月/);
  if (mOnly) {
    const m = Number(mOnly[1]);
    if (m >= 1 && m <= 12) return `${y}-${String(m).padStart(2, '0')}`;
  }
  return y;
}

// =============================================================
//  主流程
// =============================================================
async function main() {
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');

  // 查询缺失数据的声优(测试用 TEST_LIMIT 环境变量,验证通过后去掉)
  // 注意:birth_date LIKE '%-01-01' (非 1900 年) 视为 bangumi 占位值,需要重爬真实月日
  // 环境变量:
  //   TEST_LIMIT=N          只处理前 N 条 (测试用)
  //   PRIORITY_DIFFICULTY=key  优先处理指定难度池 (如 lovelive)
  //   ONLY_BIRTH_PLACEHOLDER=1  只处理 birth_date 占位值的声优
  const TEST_LIMIT = Number(process.env.TEST_LIMIT || '0');
  const limitClause = TEST_LIMIT > 0 ? `LIMIT ${TEST_LIMIT}` : '';
  const PRIORITY_DIFFICULTY = process.env.PRIORITY_DIFFICULTY || '';
  const ONLY_BIRTH_PLACEHOLDER = process.env.ONLY_BIRTH_PLACEHOLDER === '1';
  console.log('TEST_LIMIT =', TEST_LIMIT, 'limitClause =', limitClause || '(无)');
  console.log('PRIORITY_DIFFICULTY =', PRIORITY_DIFFICULTY || '(无)');
  console.log('ONLY_BIRTH_PLACEHOLDER =', ONLY_BIRTH_PLACEHOLDER);

  // 优先按难度池排序(把指定难度的声优排前面)
  const priorityJoin = PRIORITY_DIFFICULTY
    ? `LEFT JOIN (SELECT player_id, 1 AS is_priority FROM player_difficulties WHERE difficulty_key = '${PRIORITY_DIFFICULTY}') pd ON pd.player_id = seiyuus.id`
    : '';
  const priorityOrder = PRIORITY_DIFFICULTY
    ? `is_priority DESC, id ASC`
    : `id ASC`;

  // 构建 WHERE 子句
  const conditions: string[] = [];
  if (ONLY_BIRTH_PLACEHOLDER) {
    // 只处理 birth_date 占位值(YYYY-01-01,非 1900 年)
    conditions.push(`(birth_date LIKE '____-01-01' AND birth_date NOT LIKE '1900-%')`);
  } else {
    conditions.push(`birth_date IS NULL`);
    conditions.push(`birth_date = ''`);
    conditions.push(`(birth_date LIKE '____-01-01' AND birth_date NOT LIKE '1900-%')`);
    conditions.push(`birth_place = ''`);
    conditions.push(`agency = ''`);
  }
  const whereSql = conditions.map(c => `(${c})`).join(' OR ');

  const missing = db.prepare(`SELECT id, name, romaji, birth_date, birth_place, agency FROM seiyuus
    ${priorityJoin}
    WHERE ${whereSql}
    ORDER BY ${priorityOrder}
    ${limitClause}`).all() as any[];

  console.log(`=== 阶段2:萌娘百科补爬 ===`);
  console.log(`需补全的声优数: ${missing.length}`);

  const updateStmt = db.prepare(`UPDATE seiyuus
    SET birth_date = @birth_date,
        birth_place = @birth_place,
        agency = @agency
    WHERE id = @id`);

  let processed = 0;
  let fillBirth = 0;
  let fillPlace = 0;
  let fillAgency = 0;
  let notFound = 0;
  const startTime = Date.now();

  for (const s of missing) {
    processed += 1;

    // 判断 birth_date 是否需要重爬:
    //   1. 完全为空
    //   2. 是 bangumi 占位值 YYYY-01-01 (非 1900 年),月日是默认占位值不是真实数据
    function isPlaceholderBirth(d: string | null | undefined): boolean {
      if (!d) return true;
      // YYYY-01-01 视为占位值 (排除 1900-XX-XX 这种已经被识别为完全无效的数据)
      return /^\d{4}-01-01$/.test(d) && !d.startsWith('1900');
    }
    const needBirth = isPlaceholderBirth(s.birth_date);
    const needPlace = !s.birth_place;
    const needAgency = !s.agency;
    if (!needBirth && !needPlace && !needAgency) continue;

    // 构造候选 URL(从简到繁)
    const candidates: string[] = [];
    const addCandidates = (name: string) => {
      if (!name) return;
      const enc = encodeURIComponent(name);
      candidates.push('/' + enc);
      candidates.push('/' + enc + '(声优)');
      candidates.push('/' + enc + '_(声优)');
      candidates.push('/wiki/' + enc);
    };
    addCandidates(s.name);
    if (s.romaji && s.romaji !== s.name) addCandidates(s.romaji);

    let success = false;
    for (const p of candidates) {
      const r = await mgFetch(p);
      if (r.status !== 200 || !r.html) {
        await sleep(80);
        continue;
      }
      const infobox = extractInfobox(r.html);
      if (!infobox) {
        await sleep(80);
        continue;
      }

      const newBirth = needBirth ? parseBirthDate(infobox) : null;
      const newPlace = needPlace ? parseBirthPlace(infobox) : '';
      const newAgency = needAgency ? parseAgency(infobox) : '';

      // 至少要拿到一个字段才算成功
      if (!newBirth && !newPlace && !newAgency) {
        await sleep(80);
        continue;
      }

      // birth_date 决策:
      //   - 新爬到完整生日 (带月日,长度>=8) → 用 newBirth 覆盖占位值
      //   - 否则保留原值 (即使是占位值 YYYY-01-01,有总比没有强)
      //   - 若原本为 NULL 且 newBirth 也有,则用 newBirth
      const isCompleteBirth = (d: string | null | undefined): boolean =>
        Boolean(d) && (d as string).length >= 8 && !/^\d{4}-01-01$/.test(d as string);
      let finalBirth = s.birth_date || null;
      if (isCompleteBirth(newBirth)) {
        finalBirth = newBirth;
      } else if (!s.birth_date && newBirth) {
        finalBirth = newBirth;
      }

      // 事务内更新
      updateStmt.run({
        id: s.id,
        birth_date: finalBirth,
        birth_place: s.birth_place || newPlace || '',
        agency: s.agency || newAgency || '',
      });

      if (needBirth && newBirth) fillBirth++;
      if (needPlace && newPlace) fillPlace++;
      if (needAgency && newAgency) fillAgency++;
      success = true;
      break;
    }

    if (!success) notFound++;
    await sleep(120); // 礼貌延迟,防止被封

    if (processed % 50 === 0) {
      const elapsed = (Date.now() - startTime) / 1000;
      const speed = processed / Math.max(0.5, elapsed);
      console.log(`  进度 ${processed}/${missing.length}  补生日=${fillBirth}  出生地=${fillPlace}  事务所=${fillAgency}  未找到=${notFound}  速度=${speed.toFixed(1)}/s`);
      await sleep(500);
    }
  }

  // 最终覆盖率
  console.log(`\n=== 补爬完成 ===`);
  console.log(`处理: ${processed}/${missing.length}`);
  console.log(`补 birth_date: ${fillBirth}`);
  console.log(`补 birth_place: ${fillPlace}`);
  console.log(`补 agency: ${fillAgency}`);
  console.log(`未找到: ${notFound}`);

  console.log('\n=== 最终覆盖率 ===');
  const total = (db.prepare('SELECT COUNT(*) AS c FROM seiyuus').get() as any).c;
  const withBirth = (db.prepare("SELECT COUNT(*) AS c FROM seiyuus WHERE birth_date IS NOT NULL AND birth_date != ''").get() as any).c;
  const withPlace = (db.prepare("SELECT COUNT(*) AS c FROM seiyuus WHERE birth_place != ''").get() as any).c;
  const withAgency = (db.prepare("SELECT COUNT(*) AS c FROM seiyuus WHERE agency != ''").get() as any).c;
  console.log(`总数: ${total}`);
  console.log(`birth_date: ${withBirth} (${(withBirth / total * 100).toFixed(1)}%)`);
  console.log(`birth_place: ${withPlace} (${(withPlace / total * 100).toFixed(1)}%)`);
  console.log(`agency: ${withAgency} (${(withAgency / total * 100).toFixed(1)}%)`);

  db.close();
}

main().catch(err => {
  console.error('脚本执行失败:', err);
  process.exit(1);
});
