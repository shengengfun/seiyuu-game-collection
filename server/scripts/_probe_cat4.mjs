// "分类:配音演员列表" 下的 50 个 普通 wiki 页面在哪 (不是子分类, 而是 members of the category)
const r = await fetch('https://zh.moegirl.org.cn/Category:配音演员列表', {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0 Safari/537.36',
    'Accept-Language': 'zh-CN,zh;q=0.9',
  },
});
const html = await r.text();

// mw-category-generated 下的 mw-pages section, 或 members list
console.log('页面中所有 div id:');
for (const m of html.matchAll(/\sid="([a-zA-Z0-9\u4e00-\u9fa5-]+)"/g)) {
  console.log('  #' + m[1]);
}

// 找 "分类下的页面" 或 members section: 通常 id="mw-pages"
const pagesSec = html.indexOf('id="mw-pages"');
console.log('\nid=mw-pages 位置:', pagesSec);
if (pagesSec !== -1) {
  const section = html.slice(pagesSec, pagesSec + 6000);
  console.log(section);
} else {
  // 可能 id 没那么标准, 找 "该分类共有" 或 "本分类以下X个页面" 附近
  const m = html.match(/(本分类|该分类|分类)[^\n<]{0,30}(\d+)(个页面|个条目)/);
  if (m) {
    const i = m.index || 0;
    console.log('\n"本分类共有 X 个页面" 附近 6KB:\n', html.slice(i, i + 6000));
  } else {
    console.log('\n 找 CategoryTreeSection 的所有条目 (可能是页面而不是子分类):');
    // 找所有 CategoryTreeSection title 不以 Category: 开头 的
    const re = /<a[^>]+href="(\/(wiki|w)\/([^":#]+?))"[^>]*title="([^":#]+?)"/g;
    const found = [];
    let mm;
    while ((mm = re.exec(html)) !== null) {
      const title = mm[4];
      if (!/^(Category|File|Template|Help|Special|Module|MediaWiki|Wikipedia):/.test(title)) {
        // 排除萌娘百科主页面 / 首页 / 帮助页
        if (!/(首页|帮助|沙盒|公告|方针|讨论|讨论版)/.test(title)) {
          if (!found.some((f) => f.title === title)) found.push({ title, url: 'https://zh.moegirl.org.cn' + mm[1] });
        }
      }
    }
    console.log('  非命名空间的普通页面数:', found.length);
    console.log('  前 50 个:', found.slice(0, 50).map((f) => f.title).join(' / '));
  }
}
