import Database from 'better-sqlite3';
import { writeFileSync } from 'node:fs';

const db = new Database('d:/Seiyu-guess/server/data/seiyuu-bangumi.sqlite3', { readonly: true });
const out = [];

const findByCharacter = (keywords) => {
  for (const keyword of keywords) {
    const rows = db
      .prepare('select name, representative_characters from seiyuus where representative_characters like ? limit 4')
      .all(`%${keyword}%`);
    const hits = rows.map((row) => {
      try {
        const list = JSON.parse(row.representative_characters);
        const works = list.filter((i) => String(i.character ?? '').includes(keyword)).map((i) => i.work);
        return `${row.name}${works.length ? ` (${works[0].slice(0, 24)})` : ''}`;
      } catch {
        return row.name;
      }
    });
    out.push(`  ${keyword} -> ${hits.join(' | ') || '未找到'}`);
  }
};

out.push('--- 赛马娘 ---');
findByCharacter(['特别周', '无声铃鹿', '东海帝皇', '黄金船', '目白麦昆', '北部玄驹', '里见光钻', '优秀素质', '春乌拉拉', '真机伶', '米浴', '待兼诗歌剧']);

out.push('--- LoveLive ---');
findByCharacter(['涩谷香音', '唐可可', '上原步梦', '高海千歌', '樱内梨子', '黑泽露比', '天王寺璃奈', '优木雪菜', '中须霞', '日野下花帆', '平安名堇', '叶月恋', '米女芽衣', '若菜四季', '藤岛慈']);

out.push('--- 少女歌剧 ---');
findByCharacter(['爱城华恋', '神乐光', '天堂真矢', '西条克罗蒂娜', '露崎真昼', '星见纯那', '石动双叶', '花柳香子']);

out.push('--- BanG Dream ---');
findByCharacter(['户山香澄', '凑友希那', '弦卷心', '山吹沙绫', '花园多惠', '丰川祥子', '高松灯', '千早爱音', '要乐奈', '八幡海铃', '若叶睦', '冰川纱夜', '上原绯玛丽', '市谷有咲', '牛込里美', '若宫伊芙', '白金燐子']);

out.push('--- 偶像大师 ---');
findByCharacter(['岛村卯月', '涩谷凛', '本田未央', '天海春香', '如月千早', '星井美希', '樱井桃华', '樋口圆香', '浅仓透', '杜野真子', '大崎甘奈']);

out.push('--- 模糊查名 ---');
for (const pattern of ['%achi%', '%磯部%', '%礒部%', '%望月%', '%花岩%', '%薄井%', '%饭田%', '%長月%', '%长月%']) {
  const rows = db.prepare('select name from seiyuus where name like ? limit 6').all(pattern);
  out.push(`  ${pattern} -> ${rows.map((r) => r.name).join(' | ') || '未找到'}`);
}

writeFileSync('d:/Seiyu-guess/tmp/seiyuu-lookup2.txt', out.join('\n'), 'utf8');
db.close();
console.log('written');
