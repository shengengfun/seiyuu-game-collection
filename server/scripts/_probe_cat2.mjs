// 萌娘百科 "分类:配音演员" 下的 子分类里哪些是日本女声优分类? 全爬子分类列表
const r = await fetch('https://zh.moegirl.org.cn/Category:配音演员', {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0 Safari/537.36',
    'Accept-Language': 'zh-CN,zh;q=0.9',
  },
});
const html = await r.text();

// 子分类 + 该分类下的成员页面 (mw-subcategories 和 mw-pages 分块)
function extractCategoryInfo(html) {
  const out = { cats: [], pages: [] };

  // 子分类链接: href="/Category:XXX"
  const subcatRe = /<a[^>]+href="(\/Category:[^"#]+)"[^>]*title="Category:([^"]+)"[^>]*>([\s\S]*?)<\/a>(\s*<span[^>]*>([\s\S]*?)<\/span>)?/g;
  let m;
  while ((m = subcatRe.exec(html)) !== null) {
    const name = m[2];
    const hint = m[5]?.replace(/<[^>]+>/g, '').trim();
    if (/日本|声优|配音/.test(name)) {
      out.cats.push({ name, url: 'https://zh.moegirl.org.cn' + m[1], pageHint: hint });
    }
  }
  return out;
}

console.log('=== 分类:配音演员 下的与日本/声优有关的子分类 ===');
const info = extractCategoryInfo(html);
for (const c of info.cats) {
  console.log(`  ${c.name.padEnd(30)}  hint=${c.pageHint || ''}`);
}

// 再看看 "分类:配音演员列表" 页面 (它写了 50 个页面)
console.log('\n=== 进入 分类:配音演员列表 ===');
const r2 = await fetch('https://zh.moegirl.org.cn/Category:配音演员列表', { headers: { 'User-Agent': 'Mozilla/5.0 Chrome/127', 'Accept-Language': 'zh-CN,zh' } });
const h2 = await r2.text();

const subCats2 = h2.match(/<a[^>]+href="(\/Category:[^"#]+)"[^>]*title="Category:([^"]+)"/g) || [];
console.log('  sub-categories:');
const unique = new Map();
for (const a of subCats2) {
  const u = a.match(/href="([^"]+)"/)![1];
  const t = a.match(/title="Category:([^"]+)"/)![1];
  if (!unique.has(t)) unique.set(t, u);
}
for (const [name, u] of unique) {
  if (/日本|女声优|配音演员|あ行|か行|さ行|た行|な行|は行|ま行|や行|ら行|わ行/.test(name)) {
    // 扫一下数量hint
    console.log(`    ${name.padEnd(30)}  url=https://zh.moegirl.org.cn${u}`);
  }
}

// 再找一页实际的 "分类:日本配音演员列表あ行" (如果有) 看看内容结构
const trialUrls = [
  'https://zh.moegirl.org.cn/Category:日本配音演员列表_あ行',
  'https://zh.moegirl.org.cn/Category:日本女性配音演员',
  'https://zh.moegirl.org.cn/Category:日本声优',
  'https://zh.moegirl.org.cn/Category:日本配音演员',
];
for (const u of trialUrls) {
  const r = await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0 Chrome/127', 'Accept-Language': 'zh-CN,zh' }, redirect: 'follow' });
  const h = await r.text();
  console.log(`\n[${r.status}] ${decodeURIComponent(r.url.split('/').slice(-1)[0])}`);
  // 成员链接数量 (非 Category: 开头的)
  const links = [...h.matchAll(/<a[^>]+href="(\/wiki\/[^":#]+?)"[^>]*title="([^"]+?)"/g)];
  const filtered = links.filter(([, t]) => !t.startsWith('Category:') && !t.startsWith('File:') && !t.startsWith('Template:') && !t.startsWith('Help:') && !t.startsWith('Special:'));
  console.log('  ≈ 成员数量 (非分类/文件/模板):', filtered.length);
  if (filtered.length) {
    console.log('  前 10:', filtered.slice(0, 10).map(([, t]) => t).join(' / '));
  }
}
