const r = await fetch('https://zh.moegirl.org.cn/%E5%88%86%E7%B1%BB:%E6%97%A5%E6%9C%AC%E5%A5%B3%E6%80%A7%E5%A3%B0%E4%BC%98', {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0 Safari/537.36',
    'Accept-Language': 'zh-CN,zh;q=0.9',
    'Accept': 'text/html,application/xhtml+xml',
  }
});
const html = await r.text();
console.log('status:', r.status, 'len:', html.length);
console.log('has mw-category:', html.includes('mw-category'));
console.log('has 分类成员:', html.includes('分类成员') || html.includes('分类：'));
// 截取一些关键词位置
const idx = html.indexOf('mw-category');
if (idx !== -1) console.log('sample around mw-category:', html.slice(idx, idx + 600));
