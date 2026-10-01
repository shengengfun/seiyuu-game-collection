// 探测五大企划作品 + 热门作品的配音演员页真实 URL
import { setTimeout as sleep } from 'node:timers/promises';

const bases = [
  // LL (各种缩写/组合)
  'LoveLive!',
  'LoveLive! School Idol Project',
  'LoveLive! School idol project',
  'LoveLive!_Superstar!!',
  'LoveLive! Superstar!!',
  'LoveLive!_Sunshine!!',
  'LoveLive! Sunshine!!',
  '虹咲学园学园偶像同好会',
  'LoveLive!虹咲学园学园偶像同好会',
  '莲之空女学院学园偶像俱乐部',
  '莲之空女学院',
  // BanG Dream!
  'BanG Dream!',
  'BanG_Dream!',
  "BanG Dream! It's MyGO!!!!!",
  'BanG Dream! MyGO!!!!!',
  'BanG Dream! Ave Mujica',
  // 偶像大师
  '偶像大师',
  '偶像大师_(游戏)',
  '偶像大师 灰姑娘女孩',
  '偶像大师 闪耀色彩',
  '偶像大师 百万现场!',
  '偶像大师 百万现场',
  // 赛马娘
  '赛马娘 Pretty Derby',
  '赛马娘_Pretty Derby',
  '赛马娘',
  // 少女歌剧
  '少女歌剧 Revue Starlight',
  '少女歌剧_Revue Starlight',
  '少女歌剧',
  '少女歌剧 Revue Starlight -Re LIVE-',
  // 热门游戏 / 动画
  '蔚蓝档案',
  'Blue Archive',
  '原神',
  '崩坏3',
  '崩坏：星穹铁道',
  '明日方舟',
  '碧蓝航线',
  '少女前线',
  '公主连结Re:Dive',
  '偶像活动！',
  '光之美少女',
  '光之美少女系列',
  '魔法少女小圆',
  '鬼灭之刃',
  '咒术回战',
  '进击的巨人',
];
const suffixes = ['/配音演员', '/配音', '/声优', '/角色与配音', '/角色声优', '/CAST', '/Cast', '/声优列表', '/配音演员列表'];

const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0 Safari/537.36';
const refs = [
  'https://zh.moegirl.org.cn/',
  'https://zh.moegirl.org.cn/%E5%B4%A9%E5%9D%8F3',
  'https://zh.moegirl.org.cn/Mainpage',
];

let okCount = 0;
const out = [];

async function tryOne(base) {
  const enc = encodeURI(base);
  for (const s of suffixes) {
    const url = 'https://zh.moegirl.org.cn/' + enc + s;
    const ref = refs[Math.floor(Math.random() * refs.length)];
    const r = await fetch(url, {
      headers: {
        'User-Agent': ua,
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.6',
        Referer: ref,
        Accept: 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
    });
    await sleep(180);
    if (r.status === 200) {
      // 再验证一下页面不是重定向到首页或"没有找到这个页面"的软重定向 (萌娘百科有时候 200 但内容是"找不到")
      const html = await r.text();
      if (html.includes('萌百娘找不到这个页面')) continue;
      const finalPath = '/' + decodeURIComponent(r.url.split('/').slice(-1)[0]);
      return finalPath.startsWith('//') ? finalPath.slice(1) : finalPath;
    }
  }
  return null;
}

for (let i = 0; i < bases.length; i += 1) {
  const b = bases[i];
  const hit = await tryOne(b);
  const line = String(i + 1).padStart(2) + '  ' + b.padEnd(36) + ' -> ' + (hit || '(none)');
  console.log(line);
  if (hit) {
    out.push({ name: b, path: hit });
    okCount += 1;
  }
}
console.log('\n=== 最终匹配到的可爬作品页 ===');
for (const o of out) console.log(`  ['${o.name.replace(/'/g, "\\'")}', '${o.path.replace(/'/g, "\\'")}'],`);
