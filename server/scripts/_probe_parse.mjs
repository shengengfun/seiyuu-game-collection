// 小步测试: 抓 崩坏3/配音 HTML 到本地, 然后解析声优名单 (验证 scrape 函数 bug)
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';
import * as path from 'node:path';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36';
const TMP = process.cwd() + '/tmp';
import { mkdirSync } from 'node:fs';
if (!existsSync(TMP)) mkdirSync(TMP, { recursive: true });

async function saveLocal(u, f) {
  if (existsSync(f)) return readFileSync(f, 'utf8');
  const r = await fetch(u, { headers: { 'User-Agent': UA, 'Accept-Language': 'zh-CN,zh;q=0.9', Referer: 'https://zh.moegirl.org.cn/', Accept: 'text/html' } });
  const h = await r.text();
  await sleep(300);
  writeFileSync(f, h, 'utf8');
  console.log('saved', f, 'len=', h.length, 'status=', r.status);
  return h;
}

const stripHtml = (s) => s.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&#?[a-zA-Z0-9]+;/g, '').replace(/\s+/g, ' ').trim();

const h3 = await saveLocal('https://zh.moegirl.org.cn/%E5%B4%A9%E5%9D%8F3/%E9%85%8D%E9%9F%B3', TMP + '/bh3.html');
const hxq = await saveLocal('https://zh.moegirl.org.cn/%E5%B4%A9%E5%9D%8F%EF%BC%9A%E6%98%9F%E7%A9%B9%E9%93%81%E9%81%93/%E9%85%8D%E9%9F%B3', TMP + '/xqtd.html');
const hwl = await saveLocal('https://zh.moegirl.org.cn/%E8%93%9D%E8%94%9A%E6%A1%A3%E6%A1%88/%E9%85%8D%E9%9F%B3', TMP + '/wl.html');
const hmfz = await saveLocal('https://zh.moegirl.org.cn/%E6%98%8E%E6%97%A5%E6%96%B9%E8%88%9F/%E5%A3%B0%E4%BC%98', TMP + '/mfz.html');

function diagnose(html, name) {
  console.log('\n=== ', name, ' ===');
  const LINK_RE = /<a\s+(?:[^>]*?\s+)?href="(\/wiki\/[^":#]+?)"(?:[^>]*?\s+)?title="([^":#]+?)"\s*(?:[^>]*)>/g;
  const re = /<table\b([^>]*)>([\s\S]*?)<\/table>/gi;
  let mm;
  let i = 0;
  const matches = Array.from(html.matchAll(re));
  console.log('  wikitable + 表 总数=', matches.length);
  for (const m of matches) {
    i += 1;
    const clsAttr = m[1];
    const tableHtml = m[2];
    if (!/wikitable/.test(clsAttr) && !/wikitable/.test(tableHtml.slice(0, 300))) continue;
    console.log(`  ** table #${i} class="${clsAttr.replace(/[\s\S]*class="([^"]*)"[\s\S]*/, '$1')}" rows=${(tableHtml.match(/<tr/g) || []).length}`);
    const rows = tableHtml.match(/<tr[\s\S]*?<\/tr>/gi) || [];
    const row0Cols = (rows[0] || '').match(/<t[hd][\s\S]*?<\/t[hd]>/gi) || [];
    const row1Cols = rows[1] ? (rows[1].match(/<t[hd][\s\S]*?<\/t[hd]>/gi) || []) : [];
    console.log('     row0 headers=', row0Cols.map(stripHtml).join(' | '));
    if (row1Cols.length) console.log('     row1 headers=', row1Cols.map(stripHtml).join(' | '));
    // 打印前 4 行数据 cells
    for (let r = 2; r < Math.min(6, rows.length); r += 1) {
      const cells = (rows[r] || '').match(/<t[hd][\s\S]*?<\/t[hd]>/gi) || [];
      console.log('     data row', r, ':', cells.map((c) => stripHtml(c).slice(0, 20)).join(' | '));
    }
  }
}
diagnose(h3, '崩坏3');
diagnose(hxq, '星穹铁道');
diagnose(hwl, '蔚蓝档案');
diagnose(hmfz, '明日方舟');
