// 探测: 萌娘百科里女声优分类的实际入口
const probes = [
  // 直接分类名 (中文前缀)
  'https://zh.moegirl.org.cn/分类:日本女性声优',
  // 分类子页面 (按 50 音/あ行)
  'https://zh.moegirl.org.cn/分类:日本女性声优_あ行',
  'https://zh.moegirl.org.cn/%E5%88%86%E7%B1%BB:%E6%97%A5%E6%9C%AC%E5%A5%B3%E6%80%A7%E5%A3%B0%E4%BC%98',
  // 常见的分类页别名 (有些百科叫"日本女声优")
  'https://zh.moegirl.org.cn/分类:日本女声优',
  // 声优分类下的女声优子分类
  'https://zh.moegirl.org.cn/分类:女性声优',
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
  const hasMembers = html.includes('mw-category-generated') && !html.includes('目前不含有任何页面');
  // 数页面里可能的成员链接数量
  const wikiLinks = (html.match(/<a[^>]+href="\/wiki\/[^":#]+?"[^>]*title="[^"]+?"/g) || []).length;
  console.log(`[${r.status}] ${url}
    → 有成员:${hasMembers}  wiki-links≈${wikiLinks}  finalUrl=${r.url}`);
}
