// 花泽香菜 和 分类:声优 页面是否能访问
const probes = [
  'https://zh.moegirl.org.cn/花泽香菜',
  'https://zh.moegirl.org.cn/Category:声优',
  'https://zh.moegirl.org.cn/分类:日本声优',
];
for (const url of probes) {
  const r = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0 Safari/537.36',
      'Accept-Language': 'zh-CN,zh;q=0.9',
    },
    redirect: 'follow',
  });
  const html = await r.text();
  console.log(`[${r.status}] ${r.url} → len=${html.length}`);
  // 看是否命中了 Cloudflare 保护
  if (html.includes('cf-browser-verification') || html.includes('challenge-platform') || html.includes('Just a moment')) {
    console.log('  → 命中 Cloudflare 验证!');
  }
  if (r.status === 200) {
    const idx = html.indexOf('<title>');
    console.log('  title:', html.slice(idx + 7, idx + 80));
  }
}
