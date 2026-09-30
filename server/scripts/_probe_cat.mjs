// 探测分类入口: 萌娘百科 "分类:配音演员" 或 "分类:日本配音演员" 里,子分类到底叫啥
const probs = [
  'https://zh.moegirl.org.cn/Category:日本配音演员',
  'https://zh.moegirl.org.cn/Category:日本女声优',
  'https://zh.moegirl.org.cn/Category:日本女性配音演员',
  'https://zh.moegirl.org.cn/Category:配音演员',
];

for (const url of probs) {
  const r = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0 Safari/537.36',
      'Accept-Language': 'zh-CN,zh;q=0.9',
    },
    redirect: 'follow',
  });
  const html = await r.text();
  console.log(`\n[${r.status}] ${decodeURIComponent(r.url.split('/').slice(-1)[0])}`);
  // 分类页底部通常是 "分类:xxx 下的 123 个页面"
  const total = html.match(/[^\n]{0,40}(分类|页面|成员)[^\n]{0,60}/g)?.slice(0, 3);
  if (total) console.log('  分类信息提示:', total);
  // mw-category 里的子分类和成员链接数
  const memberLinks = html.match(/<a[^>]+href="\/wiki\/[^":#]+?"[^>]*class="(mw-category[^"]+|[^"]*mw-redirect[^"]*)"[^>]*>/g)?.length ?? 0;
  const anyLinks = html.match(/<a[^>]+href="\/wiki\/[^":#]+?"/g)?.length ?? 0;
  // mw-category-group div (萌娘分类页常用的是 mw-category-generated 下的 3 列 grid)
  const categoryGrid = html.match(/mw-category-[a-z0-9-]+/gi)?.slice(0, 5);
  console.log(`  category-grid classes: ${categoryGrid?.join(', ') ?? '无'}`);
  console.log(`  member-links≈${memberLinks}  any-links≈${anyLinks}`);
  // 是否有 "下一页" 的 "第2页" 或 pagefrom 链接
  if (r.status === 200) {
    console.log(`  有 "分类成员" 表: ${html.includes('mw-prefixindex-list') || html.includes('mw-category-generated')}`);
  }
}

// 直接看 Category:配音演员 内容结构
const r = await fetch('https://zh.moegirl.org.cn/Category:配音演员', {
  headers: { 'User-Agent': 'Mozilla/5.0 Chrome/127', 'Accept-Language': 'zh-CN' },
});
const h = await r.text();
const pos = h.indexOf('mw-category-generated');
if (pos !== -1) {
  console.log('\n=== mw-category-generated 附近 2KB ===\n', h.slice(pos, pos + 2000));
}
