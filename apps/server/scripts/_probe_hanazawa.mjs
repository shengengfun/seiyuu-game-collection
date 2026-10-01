// 探测: 花泽香菜 HTML 里 infobox 是啥结构, 作品表的标题是什么
const r = await fetch('https://zh.moegirl.org.cn/%E8%8A%B1%E6%B3%BD%E9%A6%99%E8%8F%9C', {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0 Safari/537.36',
    'Accept-Language': 'zh-CN,zh;q=0.9',
  },
});
const html = await r.text();

// 1. 找 infobox: 通常 class="infotable" / class="infobox" 等
const infos = [
  ['infotable', html.indexOf('infotable')],
  ['infobox', html.indexOf('infobox')],
  ['声优信息', html.indexOf('声优信息')],
  ['个人资料', html.indexOf('个人资料')],
  ['基本资料', html.indexOf('基本资料')],
  ['配音作品', html.indexOf('配音作品')],
  ['主要出演作品', html.indexOf('主要出演作品')],
  ['代表作品', html.indexOf('代表作品')],
  ['出演作品', html.indexOf('出演作品')],
  ['主要配音作品', html.indexOf('主要配音作品')],
  ['电视动画', html.indexOf('电视动画')],
  ['<th>本名', html.indexOf('<th>本名')],
  ['<th>姓名', html.indexOf('<th>姓名')],
  ['姓名</th>', html.indexOf('姓名</th>')],
  ['所属', html.indexOf('所属')],
  ['事务所', html.indexOf('事务所')],
];
console.log('关键词位置:');
for (const [name, idx] of infos) console.log(`  ${name.padEnd(16)}: ${idx}`);

// 2. 看 "姓名" 附近的 HTML (infobox 示例)
const idx = html.indexOf('事务所');
if (idx !== -1) {
  console.log('\n-- 事务所附近 1200 字 --\n', html.slice(Math.max(0, idx - 300), idx + 900));
}

// 3. 看 "主要出演作品" / "出演作品" / "电视动画" 附近
const idx2 = [
  html.indexOf('主要出演作品'),
  html.indexOf('代表作品'),
  html.indexOf('配音作品'),
  html.indexOf('出演作品'),
  html.indexOf('电视动画'),
].filter((i) => i !== -1).sort((a, b) => a - b)[0];
if (idx2 !== undefined && idx2 !== -1) {
  console.log('\n-- 作品区附近 (2KB) --\n', html.slice(idx2, idx2 + 2000));
}
