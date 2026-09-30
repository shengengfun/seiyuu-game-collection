// 继续探测: 找到 "出演作品" 章节下的作品表格 (通常在页面中部)
const r = await fetch('https://zh.moegirl.org.cn/%E8%8A%B1%E6%B3%BD%E9%A6%99%E8%8F%9C', {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0 Safari/537.36',
    'Accept-Language': 'zh-CN,zh;q=0.9',
  },
});
let html = await r.text();

// 1. 找出所有 h2 / h3 标题 (section 划分)
const headings = [...html.matchAll(/<h([2-4])[^>]*>([\s\S]*?)<\/h\1>/g)].map((m) => {
  // 纯文本 (去除标签)
  const txt = m[2].replace(/<[^>]+>/g, '').trim();
  return { level: +m[1], text: txt, pos: m.index };
});
console.log('=== 页面章节标题 ===');
for (const h of headings) {
  if (/出演|作品|配音|动画|游戏|广播|角色|代表/.test(h.text)) {
    console.log(`  H${h.level} @${h.pos} -> ${h.text}`);
  }
}

// 2. 找 "出演作品" / "配音作品" / "代表角色" 章节下, 包含 wikitable 且有 "作品名" / "角色名" / "饰演" / "备注" 的表格
const targets = headings.filter((h) => /出演|配音作品|代表角色|主な出演|テレビアニメ|TVアニメ/.test(h.text));
console.log('\n目标章节:', targets.map((t) => t.text));

for (const t of targets.slice(0, 2)) {
  const nextH2 = headings.find((h) => h.pos > t.pos && (h.level === t.level || h.level < t.level));
  const end = nextH2 ? nextH2.pos : t.pos + 200_000;
  const section = html.slice(t.pos, end);
  // 找所有 wikitable
  const wts = [...section.matchAll(/<table[^>]*class="[^"]*wikitable[^"]*"[\s\S]*?<\/table>/g)];
  console.log(`\n--- 章节 "${t.text}" 下找到 ${wts.length} 张 wikitable ---`);
  for (const [wi, wt] of wts.entries()) {
    const table = wt[0];
    // 头部列名
    const ths = [...table.matchAll(/<th[^>]*>([\s\S]*?)<\/th>/g)].map((x) => x[1].replace(/<[^>]+>/g, '').trim());
    console.log(`  wikitable #${wi}: 列=${ths.join(' | ')}   len=${table.length}`);
    // 如果有"作品"或"角色"或"饰演"就截前 3 行数据看看
    if (/作品|角色|饰演|年/.test(ths.join('，'))) {
      // 抽 3 行 tr
      const rows = [...table.matchAll(/<tr>[\s\S]*?<\/tr>/g)].slice(1, 4);
      for (const row of rows) {
        const tds = [...row[0].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((x) => x[1].replace(/<[^>]+>/g, '').trim());
        console.log('    row:', tds.join(' ║ '));
      }
    }
  }
}

// 3. infobox 的 "代表角色" 字段
console.log('\n=== infobox 中 "代表角色" 内容 ===');
const rridx = html.indexOf('代表角色');
if (rridx !== -1) {
  // 抓 800 字
  console.log(html.slice(rridx, rridx + 900).replace(/[\s\n]+/g, ' '));
}
