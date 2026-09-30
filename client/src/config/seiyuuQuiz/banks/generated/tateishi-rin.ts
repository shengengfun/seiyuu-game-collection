import type { SeiyuuQuizQuestion } from '../../types';

/**
 * 【自动生成，不用手改】立石凛 的「出演作品」派生题。
 *
 * 由 `tmp/gen-works-questions.mjs` 从萌娘百科「出演作品」小节生成，
 * 重新跑一遍会覆盖本文件；想手改请改手写题库（`../tateishi-rin.ts`）。
 * 来源：https://zh.moegirl.org.cn/%E7%AB%8B%E7%9F%B3%E5%87%9B
 */
export const worksQuestions: SeiyuuQuizQuestion[] = [
    {
      id: 'w1',
      level: 'normal',
      prompt: '她在《BanG Dream! Our Notes》里饰演的角色是？',
      options: ['星野彩叶', 'アロサウっぴ', 'ライデ', '千早爱音'],
      answer: 3,
      explain: '《BanG Dream! Our Notes》里她配的是千早爱音。',
    },
    {
      id: 'w2',
      level: 'normal',
      prompt: '《PROGRESS ORDERS》中，她配音的角色是？',
      options: ['星野彩叶', '别所爱染', '千早爱音', '诺拉'],
      answer: 3,
      explain: '《PROGRESS ORDERS》里她配的是诺拉。',
    },
    {
      id: 'w3',
      level: 'normal',
      prompt: '她为《棕色尘埃》配的角色是？',
      options: ['诺拉', '樋口もな', 'ライデ', '千早爱音'],
      answer: 2,
      explain: '《棕色尘埃》里她配的是ライデ。',
    },
    {
      id: 'w4',
      level: 'normal',
      prompt: '她在《降临SOUL》里饰演的角色是？',
      options: ['诺拉', '日替嘉宾(天帝)', 'アロサウっぴ', '星野彩叶'],
      answer: 1,
      explain: '《降临SOUL》里她配的是日替嘉宾(天帝)。',
    },
    {
      id: 'w5',
      level: 'normal',
      prompt: '《『异世界转生したら大恐龙时代でオワタ。』》中，她配音的角色是？',
      options: ['星野彩叶', '小幽灵纽特（套装语音）', '日替嘉宾(天帝)', 'アロサウっぴ'],
      answer: 3,
      explain: '《『异世界转生したら大恐龙时代でオワタ。』》里她配的是アロサウっぴ。',
    },
    {
      id: 'w6',
      level: 'normal',
      prompt: '以下哪个角色是她饰演过的？',
      options: ['千早爱音', '萨宾', '山田美美美', '水岛茉莉花'],
      answer: 0,
      explain: '千早爱音是她配过的角色，其余三个是其他声优的角色。',
    },
    {
      id: 'w7',
      level: 'normal',
      prompt: '下列角色中，哪一个由她配音？',
      options: ['多米诺', '玛琪雅·欧蒂利尔', '希露德', '别所爱染'],
      answer: 3,
      explain: '别所爱染是她配过的角色，其余三个是其他声优的角色。',
    },
    {
      id: 'w8',
      level: 'normal',
      prompt: '她配过下面哪个角色？',
      options: ['琪姬塔', '樋口もな', '莉薇尔娜·达克', '浅草多多'],
      answer: 1,
      explain: '樋口もな是她配过的角色，其余三个是其他声优的角色。',
    },
    {
      id: 'w9',
      level: 'hard',
      prompt: '以下哪部作品她没有出演？',
      options: ['少女☆寸剧 All Starlight', 'りーでぃんぐ☆ぱーてぃー vol.10', 'BanG Dream！少女乐团派对！', 'シアター'],
      answer: 0,
      explain: '《少女☆寸剧 All Starlight》与她无关；另外三部她都出演过。',
    },
    {
      id: 'w10',
      level: 'hard',
      prompt: '下面哪部作品与她无关？',
      options: ['恋语 Juliamo -amrilata lingvo-', '元祖！BanG Dream Chan', '星色物语：学生终端', '崩坏学园2'],
      answer: 0,
      explain: '《恋语 Juliamo -amrilata lingvo-》与她无关；另外三部她都出演过。',
    },
    {
      id: 'w11',
      level: 'easy',
      prompt: '她出演过下面哪部作品？',
      options: ['闪耀幻想曲', '剧场版 BanG Dream! It\'s MyGO!!!!! 前篇 春日向阳，迷途野猫', '錬神のアストラル', '少女前线'],
      answer: 1,
      explain: '她出演过《剧场版 BanG Dream! It\'s MyGO!!!!! 前篇 春日向阳，迷途野猫》；其余三部与她无关。',
    },
    {
      id: 'w12',
      level: 'easy',
      prompt: '以下哪部作品有她的配音？',
      options: ['恋语 曾几何时的记忆', '百花ランブル', 'BanG Dream! It\'s MyGO!!!!!', '驭时之轮'],
      answer: 2,
      explain: '她出演过《BanG Dream! It\'s MyGO!!!!!》；其余三部与她无关。',
    },
];

export default { id: 'tateishi-rin', questions: worksQuestions };
