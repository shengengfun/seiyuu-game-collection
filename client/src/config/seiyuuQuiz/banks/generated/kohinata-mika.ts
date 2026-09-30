import type { SeiyuuQuizQuestion } from '../../types';

/**
 * 【自动生成，不用手改】小日向美香 的「出演作品」派生题。
 *
 * 由 `tmp/gen-works-questions.mjs` 从萌娘百科「出演作品」小节生成，
 * 重新跑一遍会覆盖本文件；想手改请改手写题库（`../kohinata-mika.ts`）。
 * 来源：https://zh.moegirl.org.cn/%E5%B0%8F%E6%97%A5%E5%90%91%E7%BE%8E%E9%A6%99
 */
export const worksQuestions: SeiyuuQuizQuestion[] = [
    {
      id: 'w1',
      level: 'normal',
      prompt: '她在《鬼の陰陽師》里饰演的角色是？',
      options: ['电视台Staff', '乌尔平', 'アナーコット', '火花'],
      answer: 3,
      explain: '《鬼の陰陽師》里她配的是火花。',
    },
    {
      id: 'w2',
      level: 'normal',
      prompt: '《事故物件　身も凍る執念》中，她配音的角色是？',
      options: ['奥罗拉', '黒子と', 'ガヤ', '夏侬'],
      answer: 2,
      explain: '《事故物件　身も凍る執念》里她配的是ガヤ。',
    },
    {
      id: 'w3',
      level: 'normal',
      prompt: '她为《悪夢の淵から》配的角色是？',
      options: ['星野彩花', '玛丽', '紫阳琴花(6/22CAST)', '石原里実'],
      answer: 0,
      explain: '《悪夢の淵から》里她配的是星野彩花。',
    },
    {
      id: 'w4',
      level: 'normal',
      prompt: '她在《元祖！BanG Dream Chan》里饰演的角色是？',
      options: ['长崎爽世', 'シュウジ', 'ガヤ', '黒子と'],
      answer: 0,
      explain: '《元祖！BanG Dream Chan》里她配的是长崎爽世。',
    },
    {
      id: 'w5',
      level: 'normal',
      prompt: '《棕色尘埃》中，她配音的角色是？',
      options: ['レテ', '紫阳琴花(6/22CAST)', '乌尔平', '渋谷泉'],
      answer: 2,
      explain: '《棕色尘埃》里她配的是乌尔平。',
    },
    {
      id: 'w6',
      level: 'normal',
      prompt: '以下哪个角色是她饰演过的？',
      options: ['千早爱音', '夜来', '看护师', '台风'],
      answer: 2,
      explain: '看护师是她配过的角色，其余三个是其他声优的角色。',
    },
    {
      id: 'w7',
      level: 'normal',
      prompt: '下列角色中，哪一个由她配音？',
      options: ['シュウジ', 'イセリン', '姜柔见', '真奈美'],
      answer: 0,
      explain: 'シュウジ是她配过的角色，其余三个是其他声优的角色。',
    },
    {
      id: 'w8',
      level: 'normal',
      prompt: '她配过下面哪个角色？',
      options: ['敖祈', '八幡海铃', '夏侬', '舞伎'],
      answer: 2,
      explain: '夏侬是她配过的角色，其余三个是其他声优的角色。',
    },
    {
      id: 'w9',
      level: 'hard',
      prompt: '以下哪部作品她没有出演？',
      options: ['崩坏学园2', 'BanG Dream! Our Notes', '明日的毕业生', '网球世界巡回赛2完全版'],
      answer: 3,
      explain: '《网球世界巡回赛2完全版》与她无关；另外三部她都出演过。',
    },
    {
      id: 'w10',
      level: 'hard',
      prompt: '下面哪部作品与她无关？',
      options: ['はじまりの一歩', '空之轨迹 the 1st', 'リトル・ノエル', 'シェパードハウス・ホテル'],
      answer: 3,
      explain: '《シェパードハウス・ホテル》与她无关；另外三部她都出演过。',
    },
    {
      id: 'w11',
      level: 'easy',
      prompt: '她出演过下面哪部作品？',
      options: ['重启人生', '灵魂潮汐', '关于帮助迷路幼女后，住在隔壁的美少女留学生就开始经常出入我家这件事', '斗神机G\'s Flame'],
      answer: 0,
      explain: '她出演过《重启人生》；其余三部与她无关。',
    },
    {
      id: 'w12',
      level: 'easy',
      prompt: '以下哪部作品有她的配音？',
      options: ['『少年秘密倶乐部-零-』再演', '前辈有够烦', 'PUZZLE GIRLS', '群马酱'],
      answer: 0,
      explain: '她出演过《『少年秘密倶乐部-零-』再演》；其余三部与她无关。',
    },
];

export default { id: 'kohinata-mika', questions: worksQuestions };
