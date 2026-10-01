// 直接读 bh3.html 开头看 table 标签
import { readFileSync, existsSync } from 'node:fs';
const p = process.cwd() + '/tmp/bh3.html';
if (!existsSync(p)) { console.log('no file'); process.exit(0); }
const h = readFileSync(p, 'utf8');
console.log('file len=', h.length);
// 手动数 <table 没写 \b
const re = /<table([^>]*)>/gi;
let m;
const tds = [];
while ((m = re.exec(h)) !== null) {
  tds.push({ cls: m[1].slice(0, 120), i: m.index });
}
console.log('<table> count with re=/<table([^>]*)>/gi:', tds.length);
tds.slice(0, 10).forEach((t, i) => console.log('  ', i, t.cls));

// 再看 mw-content-text 下面有多少 <table
const start = h.indexOf('id="mw-content-text"');
console.log('mw-content-text idx=', start);
const section = h.slice(start, start + 200000);
const tblsInSection = [...section.matchAll(/<table\b([^>]*)>([\s\S]*?)<\/table>/gi)].length;
console.log('table\\b count in mw-content-text via /<table\\b...\\<\\/table>/gi:', tblsInSection);
if (tblsInSection === 0) {
  // 试不带 \b
  console.log('不带 \\b:', [...section.matchAll(/<table([^>]*)>([\s\S]*?)<\/table>/gi)].length);
  // 试 dotAll?
  console.log('带 /s flag (dotAll):', [...section.matchAll(/<table\b([^>]*)>([\s\S]*?)<\/table>/gis)].length);
  // 直接看 2 万字符内的 <table 后面字符
  const first = section.indexOf('<table');
  console.log('first <table at offset', first, '附近 200 字:', section.slice(first, first + 200));
}
