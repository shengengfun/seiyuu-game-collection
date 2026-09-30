// 继续探测: 花泽香菜 的 "出演作品" H2 下面到底是什么结构?
const r = await fetch('https://zh.moegirl.org.cn/%E8%8A%B1%E6%B3%BD%E9%A6%99%E8%8F%9C', {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0 Safari/537.36',
    'Accept-Language': 'zh-CN,zh;q=0.9',
  },
});
let html = await r.text();

// 找 H2 "出演作品"
const h2Match = [...html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/g)].find((m) =>
  m[1].replace(/<[^>]+>/g, '').trim() === '出演作品'
);
if (!h2Match) { console.log('没找到 H2 出演作品'); process.exit(0); }

const h2End = h2Match.index + h2Match[0].length;
// 找下一个 H2
let nextH2 = html.length;
const h2s = [...html.matchAll(/<h2[^>]*>[\s\S]*?<\/h2>/g)];
for (const h of h2s) {
  if (h.index > h2End) { nextH2 = h.index; break; }
}
const section = html.slice(h2End, nextH2);

console.log('出演作品 section 长度:', section.length);

// 找 H3 子标题
const h3s = [...section.matchAll(/<h3[^>]*>([\s\S]*?)<\/h3>/g)].map((m) => ({
  t: m[1].replace(/<[^>]+>/g, '').trim(),
  i: m.index,
}));
console.log('\nH3 子标题:', h3s.map((h) => h.t).join(' / '));

// 看每个 H3 子段里有什么元素
for (let i = 0; i < h3s.length; i += 1) {
  const from = h3s[i].i + 1;
  const to = i + 1 < h3s.length ? h3s[i + 1].i : section.length;
  const sub = section.slice(from, to);
  const hasWikitable = /<table[^>]*class="[^"]*wikitable[^"]*"/.test(sub);
  const hasUl = sub.includes('<ul');
  const hasDl = sub.includes('<dl');
  const hasDd = sub.includes('<dd');
  const liCount = (sub.match(/<li/g) || []).length;
  console.log(`  H3="${h3s[i].t}" len=${sub.length}  wikitable=${hasWikitable}  <ul>=${hasUl}  <dl>=${hasDl}  <li>=${liCount}`);
  if (h3s[i].t.includes('电视') || h3s[i].t.includes('TV')) {
    // 看前 3000 字结构
    console.log('    前 1800 字:');
    console.log(sub.slice(0, 1800));
  }
}
