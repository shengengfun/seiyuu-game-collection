// 继续探测: 花泽香菜 页面里的作品表格结构
const r = await fetch('https://zh.moegirl.org.cn/%E8%8A%B1%E6%B3%BD%E9%A6%99%E8%8F%9C', {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0 Safari/537.36',
    'Accept-Language': 'zh-CN,zh;q=0.9',
  },
});
const html = await r.text();

// 看 infobox 起始位置
const ibStart = html.indexOf('infobox');
console.log('=== infobox 起始 (4KB) ===');
console.log(html.slice(ibStart, ibStart + 4000));

console.log('\n\n=== 电视动画 附近 (1.5KB) ===');
const tv = html.indexOf('电视动画');
console.log(html.slice(tv, tv + 1500));

// 数一下 <table 有多少个 class=wikitable
const wc = [...html.matchAll(/class="[^"]*wikitable[^"]*"/g)].length;
console.log(`\n\ntotal wikitables: ${wc}`);
// 找最大的一张作品表
let pos = -1;
let found = 0;
while (true) {
  const next = html.indexOf('wikitable', pos + 1);
  if (next === -1) break;
  pos = next;
  found += 1;
  if (found <= 3) {
    // 看它的 caption/th
    const rowStart = html.indexOf('<tr', next);
    const piece = html.slice(next, rowStart + 400);
    console.log(`\n--- wikitable #${found} caption+head ---\n${piece}`);
  }
}
