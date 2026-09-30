// 去掉 TS 注解版 _probe_cat2
const r = await fetch('https://zh.moegirl.org.cn/Category:配音演员', {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0 Safari/537.36',
    'Accept-Language': 'zh-CN,zh;q=0.9',
  },
});
const html = await r.text();

function extractCategoryInfo(h) {
  const out = { cats: [], pages: [] };
  const subcatRe = /<a[^>]+href="(\/Category:[^"#]+)"[^>]*title="Category:([^"]+)"[^>]*>([\s\S]*?)<\/a>(\s*<span[^>]*>([\s\S]*?)<\/span>)?/g;
  let m;
  while ((m = subcatRe.exec(h)) !== null) {
    const name = m[2];
    const hint = (m[5] || '').replace(/<[^>]+>/g, '').trim();
    if (/日本|声优|配音/.test(name)) {
      out.cats.push({ name, url: 'https://zh.moegirl.org.cn' + m[1], pageHint: hint });
    }
  }
  return out;
}

console.log('=== 分类:配音演员 下的与日本/声优有关的子分类 ===');
const info = extractCategoryInfo(html);
for (const c of info.cats) {
  console.log('  ' + c.name.padEnd(30) + '  hint=' + (c.pageHint || ''));
}

console.log('\n=== 进入 分类:配音演员列表 ===');
const r2 = await fetch('https://zh.moegirl.org.cn/Category:配音演员列表', { headers: { 'User-Agent': 'Mozilla/5.0 Chrome/127', 'Accept-Language': 'zh-CN,zh' } });
const h2 = await r2.text();

const subCats2 = h2.match(/<a[^>]+href="(\/Category:[^"#]+)"[^>]*title="Category:([^"]+)"/g) || [];
console.log('  sub-categories (日本/女声优/あ行…):');
const unique = new Map();
for (const a of subCats2) {
  const u = a.match(/href="([^"]+)"/)[1];
  const t = a.match(/title="Category:([^"]+)"/)[1];
  if (!unique.has(t)) unique.set(t, u);
}
for (const [name, u] of unique) {
  if (/日本|女声优|配音演员|あ行|か行|さ行|た行|な行|は行|ま行|や行|ら行|わ行/.test(name)) {
    console.log('    ' + name.padEnd(30) + '  url=https://zh.moegirl.org.cn' + u);
  }
}

const trialUrls = [
  'https://zh.moegirl.org.cn/Category:日本配音演员列表_あ行',
  'https://zh.moegirl.org.cn/Category:日本女性配音演员',
  'https://zh.moegirl.org.cn/Category:日本声优',
  'https://zh.moegirl.org.cn/Category:日本配音演员',
];
for (const u of trialUrls) {
  const rr = await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0 Chrome/127', 'Accept-Language': 'zh-CN,zh' }, redirect: 'follow' });
  const h = await rr.text();
  const finalName = decodeURIComponent(rr.url.split('/').slice(-1)[0]);
  console.log('\n[' + rr.status + '] ' + finalName);
  const links = [...h.matchAll(/<a[^>]+href="(\/wiki\/[^":#]+?)"[^>]*title="([^"]+?)"/g)];
  const filtered = links.filter(([, t]) => !t.startsWith('Category:') && !t.startsWith('File:') && !t.startsWith('Template:') && !t.startsWith('Help:') && !t.startsWith('Special:'));
  console.log('  ≈ 成员数量 (非分类/文件/模板):', filtered.length);
  if (filtered.length) {
    console.log('  前 10:', filtered.slice(0, 10).map(([, t]) => t).join(' / '));
  }
}
