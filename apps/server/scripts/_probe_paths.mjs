import { setTimeout as sleep } from 'node:timers/promises';
// 先探测萌娘百科真实的 "XXX/配音演员" 的正确命名
// 策略: 拿一个已知大页 (崩坏3) 看它的 infobox/tab 里是哪种命名
const commonSuffixes = [
  '/配音演员',
  '/配音',
  '/声优',
  '/声优列表',
  '/配音演员列表',
  '/Cast',
];
const candidates = [
  // LoveLive! 家族
  ['LoveLive! School Idol Project (动画)', '/LoveLive!'],
  ['LoveLive!', '/LoveLive!'],
  ['LoveLive! Superstar!!', '/LoveLive!_Superstar!!'],
  ['LoveLive! Sunshine!!', '/LoveLive!_Sunshine!!'],
  ['虹咲学园学园偶像同好会', '/虹咲学园学园偶像同好会'],
  ['莲之空女学院学园偶像俱乐部', '/莲之空女学院学园偶像俱乐部'],
  // BanG Dream!
  ['BanG Dream!', '/BanG_Dream!'],
  ['BanG Dream! It\'s MyGO!!!!!', '/BanG_Dream!_It\'s_MyGO!!!!!'],
  // 偶像大师
  ['偶像大师', '/偶像大师'],
  ['偶像大师 灰姑娘女孩', '/偶像大师_灰姑娘女孩'],
  ['偶像大师 闪耀色彩', '/偶像大师_闪耀色彩'],
  // 赛马娘
  ['赛马娘 Pretty Derby', '/赛马娘_Pretty_Derby'],
  // 少女歌剧
  ['少女歌剧 Revue Starlight', '/少女歌剧_Revue_Starlight'],
  // 米哈游/热门
  ['原神', '/原神'],
  ['崩坏3', '/崩坏3'],
  ['崩坏：星穹铁道', '/崩坏：星穹铁道'],
  ['碧蓝档案', '/蔚蓝档案'],
  ['明日方舟', '/明日方舟'],
  ['蔚蓝档案 Blue Archive', '/Blue_Archive'],
  ['公主连结Re:Dive', '/公主连结Re:Dive'],
  ['偶像活动！', '/偶像活动！'],
  ['光之美少女', '/光之美少女系列'],
];

const results = [];
for (const [name, base] of candidates) {
  let firstOk = '';
  for (const suf of commonSuffixes) {
    const url = 'https://zh.moegirl.org.cn' + base + suf;
    const r = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 Chrome/127', 'Accept-Language': 'zh-CN,zh' },
      redirect: 'follow',
    });
    if (r.status === 200) {
      firstOk = base + suf;
      break;
    }
    await sleep(150);
  }
  const line = (name.padEnd(26) + '  ->  ' + (firstOk || '(none found)'));
  console.log(line);
  results.push(line);
}

// 再看主页面 (不带后缀) 是否有 "配音演员" section, 并打印结构
console.log('\n\n=== 原神 主页, 有没有 "配音演员/声优" 相关链接/章节 ===');
const r = await fetch('https://zh.moegirl.org.cn/原神', { headers: { 'User-Agent': 'Mozilla/5.0 Chrome/127', 'Accept-Language': 'zh-CN,zh' } });
const h = await r.text();
const links = [...h.matchAll(/<a[^>]+href="(\/wiki\/[^"#]+?)"[^>]*title="([^"#]+?)"[^>]*>([\s\S]*?)<\/a>/g)];
const hits = links.filter(([, , t]) => stripHtml(t).includes('配音') || stripHtml(t).includes('声优'));
for (const [, href, title, text] of hits.slice(0, 20)) {
  console.log('  link:', stripHtml(text).slice(0, 40), '  href=', href, '  title=', title);
}

// "崩坏3" 页面结构探测 (之前解析出 0, 因为不是 wikitable 格式)
console.log('\n\n=== 崩坏3/配音 前 5KB (看看是不是真正的配音演员页, 用什么结构) ===');
const r2 = await fetch('https://zh.moegirl.org.cn/崩坏3/配音', { headers: { 'User-Agent': 'Mozilla/5.0 Chrome/127', 'Accept-Language': 'zh-CN,zh' } });
const h2 = await r2.text();
console.log('status=', r2.status);
if (r2.status === 200) {
  // 有没有 wikitable 或者 含"声优"的列
  const tableCount = (h2.match(/<table[^>]+class="[^"]*wikitable/g) || []).length;
  const hasTables = h2.includes('wikitable');
  console.log(' 包含 wikitable 表:', hasTables, '  数量=', tableCount);
  console.log(' 页面前 5KB:');
  console.log(h2.slice(h2.indexOf('<div id="mw-content-text"'), h2.indexOf('<div id="mw-content-text"') + 5000));
}

function stripHtml(s) {
  return s.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&#?[a-zA-Z0-9]+;/g, '').replace(/\s+/g, ' ').trim();
}
