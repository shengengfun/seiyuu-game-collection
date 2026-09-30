// 小步探测: 只测崩坏3/蔚蓝档案/明日方舟 3个已知页, 并打印实际 status + html include 找不到吗?
import { setTimeout as sleep } from 'node:timers/promises';
const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0 Safari/537.36';
const pages = ['/崩坏3/配音', '/蔚蓝档案/配音', '/明日方舟/声优', '/崩坏：星穹铁道/配音', '/原神/配音演员'];
for (const p of pages) {
  const url = 'https://zh.moegirl.org.cn' + p;
  const r = await fetch(url, {
    headers: {
      'User-Agent': ua,
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.6',
      Referer: 'https://zh.moegirl.org.cn/',
      Accept: 'text/html,application/xhtml+xml',
      'Sec-Ch-Ua': '"Not)A;Brand";v="99", "Google Chrome";v="127", "Chromium";v="127"',
    },
    redirect: 'follow',
  });
  const h = await r.text();
  const notfound = h.includes('萌百娘找不到这个页面') || h.includes('找不到这个页面');
  console.log(`[${r.status}] ${p.padEnd(24)} notfound=${notfound}  len=${h.length}`);
  if (r.status === 403) {
    console.log('  403 body start:', h.slice(0, 500));
  }
  await sleep(500);
}
