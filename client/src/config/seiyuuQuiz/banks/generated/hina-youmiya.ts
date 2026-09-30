import type { SeiyuuQuizQuestion } from '../../types';

/**
 * 【自动生成，不用手改】羊宫妃那 的「出演作品」派生题。
 *
 * 由 `tmp/gen-works-questions.mjs` 从萌娘百科「出演作品」小节生成，
 * 重新跑一遍会覆盖本文件；想手改请改手写题库（`../hina-youmiya.ts`）。
 * 来源：https://zh.moegirl.org.cn/%E7%BE%8A%E5%AE%AB%E5%A6%83%E9%82%A3
 */
export const worksQuestions: SeiyuuQuizQuestion[] = [
    {
      id: 'w1',
      level: 'normal',
      prompt: '她在《莱莎的炼金工房3 ～终结之炼金术士与秘密钥匙～》里饰演的角色是？',
      options: ['乌羽绯色', '卡菈·伊迪亚斯', '花咲兔冥', '谷干城'],
      answer: 1,
      explain: '《莱莎的炼金工房3 ～终结之炼金术士与秘密钥匙～》里她配的是卡菈·伊迪亚斯。',
    },
    {
      id: 'w2',
      level: 'normal',
      prompt: '《和封印了3000年的邪龙酱成为了朋友》中，她配音的角色是？',
      options: ['尤莉乌丝', '格拉菲娅', '邪龙酱', 'VP9'],
      answer: 2,
      explain: '《和封印了3000年的邪龙酱成为了朋友》里她配的是邪龙酱。',
    },
    {
      id: 'w3',
      level: 'normal',
      prompt: '她为《我心里危险的东西》配的角色是？',
      options: ['山田杏奈', '小花', '灵羽', '平井城、石山本愿寺'],
      answer: 0,
      explain: '《我心里危险的东西》里她配的是山田杏奈。',
    },
    {
      id: 'w4',
      level: 'normal',
      prompt: '她在《随兴旅 -That\'s Journey-》里饰演的角色是？',
      options: ['乾心寿', '年轻女仆A', '乌尔德', '坂本'],
      answer: 3,
      explain: '《随兴旅 -That\'s Journey-》里她配的是坂本。',
    },
    {
      id: 'w5',
      level: 'normal',
      prompt: '《DATE WARS 时空旅乐团》中，她配音的角色是？',
      options: ['田中三子', '山田杏奈', '克拉丽丝·法伦海特', '爱丽丝'],
      answer: 0,
      explain: '《DATE WARS 时空旅乐团》里她配的是田中三子。',
    },
    {
      id: 'w6',
      level: 'normal',
      prompt: '以下哪个角色是她饰演过的？',
      options: ['水泽聪美', '十返舍梨子', '普罗米娅', '青沼宁瑠、青沼爱瑠'],
      answer: 0,
      explain: '水泽聪美是她配过的角色，其余三个是其他声优的角色。',
    },
    {
      id: 'w7',
      level: 'normal',
      prompt: '下列角色中，哪一个由她配音？',
      options: ['小佛珍子', '冥美', 'Tulika Singh', '小满'],
      answer: 2,
      explain: 'Tulika Singh是她配过的角色，其余三个是其他声优的角色。',
    },
    {
      id: 'w8',
      level: 'normal',
      prompt: '她配过下面哪个角色？',
      options: ['べル', 'アロサウっぴ', '伐罪狙击手', '月见里真结希'],
      answer: 0,
      explain: 'べル是她配过的角色，其余三个是其他声优的角色。',
    },
    {
      id: 'w9',
      level: 'hard',
      prompt: '以下哪部作品她没有出演？',
      options: ['魔法纪录 魔法少女小圆外传', '灰色：集结的百果', '杜鹃婚约 Season2', 'エンゲージプリンセス〜眠れる姫君と夢の魔法使い〜'],
      answer: 3,
      explain: '《エンゲージプリンセス〜眠れる姫君と夢の魔法使い〜》与她无关；另外三部她都出演过。',
    },
    {
      id: 'w10',
      level: 'hard',
      prompt: '下面哪部作品与她无关？',
      options: ['【我推的孩子】 第3期', '怪物弹珠立方体之星', '龙珠：超宇宙3', '邪神与厨二病少女 第2期'],
      answer: 3,
      explain: '《邪神与厨二病少女 第2期》与她无关；另外三部她都出演过。',
    },
    {
      id: 'w11',
      level: 'easy',
      prompt: '她出演过下面哪部作品？',
      options: ['决战之魂', 'Love Island', '勇者斗恶龙1&2 HD-2D 重制版', '结城友奈是勇者'],
      answer: 2,
      explain: '她出演过《勇者斗恶龙1&2 HD-2D 重制版》；其余三部与她无关。',
    },
    {
      id: 'w12',
      level: 'easy',
      prompt: '以下哪部作品有她的配音？',
      options: ['LuvFor The stage-DIVINE 爆诞！-', '元祖！BanG Dream Chan', '樱花任务', 'LIAR GAME murder mystery'],
      answer: 1,
      explain: '她出演过《元祖！BanG Dream Chan》；其余三部与她无关。',
    },
];

export default { id: 'hina-youmiya', questions: worksQuestions };
