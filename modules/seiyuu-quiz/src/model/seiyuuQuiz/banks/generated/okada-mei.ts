import type { SeiyuuQuizQuestion } from '../../types';

/**
 * 【自动生成，不用手改】冈田梦以 的「出演作品」派生题。
 *
 * 由 `tmp/gen-works-questions.mjs` 从萌娘百科「出演作品」小节生成，
 * 重新跑一遍会覆盖本文件；想手改请改手写题库（`../okada-mei.ts`）。
 * 来源：https://zh.moegirl.org.cn/%E5%86%88%E7%94%B0%E6%A2%A6%E4%BB%A5
 */
export const worksQuestions: SeiyuuQuizQuestion[] = [
    {
      id: 'w1',
      level: 'normal',
      prompt: '她在《ROAD59 -新时代任侠特区- 摩天楼黑白抗争》里饰演的角色是？',
      options: ['水岛茉莉花', '柊彩爱', '珍妮', '最上罗巫'],
      answer: 1,
      explain: '《ROAD59 -新时代任侠特区- 摩天楼黑白抗争》里她配的是柊彩爱。',
    },
    {
      id: 'w2',
      level: 'normal',
      prompt: '《Puchimiku♪ D4DJ Petit Mix》中，她配音的角色是？',
      options: ['柊彩爱', '八幡海铃 / Timoris', '热川灯', '水岛茉莉花'],
      answer: 3,
      explain: '《Puchimiku♪ D4DJ Petit Mix》里她配的是水岛茉莉花。',
    },
    {
      id: 'w3',
      level: 'normal',
      prompt: '她为《温泉娘》配的角色是？',
      options: ['柊彩爱', '珍妮', '八幡海铃 / Timoris', '热川灯'],
      answer: 3,
      explain: '《温泉娘》里她配的是热川灯。',
    },
    {
      id: 'w4',
      level: 'normal',
      prompt: '她在《BanG Dream! Ave Mujica prima aurora》里饰演的角色是？',
      options: ['最上罗巫', '珍妮', '热川灯', '八幡海铃 / Timoris'],
      answer: 3,
      explain: '《BanG Dream! Ave Mujica prima aurora》里她配的是八幡海铃 / Timoris。',
    },
    {
      id: 'w5',
      level: 'normal',
      prompt: '《元祖！BanG Dream Chan》中，她配音的角色是？',
      options: ['八幡海铃', '热川灯', '水岛茉莉花', '柚羽'],
      answer: 0,
      explain: '《元祖！BanG Dream Chan》里她配的是八幡海铃。',
    },
    {
      id: 'w6',
      level: 'normal',
      prompt: '以下哪个角色是她饰演过的？',
      options: ['蕾蒂', '客4', '珍妮', '平冈优'],
      answer: 2,
      explain: '珍妮是她配过的角色，其余三个是其他声优的角色。',
    },
    {
      id: 'w7',
      level: 'normal',
      prompt: '下列角色中，哪一个由她配音？',
      options: ['八幡海铃 / Timoris', '茉茉', '裸奔女', '十返舍梨子'],
      answer: 0,
      explain: '八幡海铃 / Timoris是她配过的角色，其余三个是其他声优的角色。',
    },
    {
      id: 'w8',
      level: 'normal',
      prompt: '她配过下面哪个角色？',
      options: ['水岛茉莉花', '小日向彩羽', '黄莺女', 'ミナ'],
      answer: 0,
      explain: '水岛茉莉花是她配过的角色，其余三个是其他声优的角色。',
    },
    {
      id: 'w9',
      level: 'hard',
      prompt: '以下哪部作品她没有出演？',
      options: ['LuvFor The stage-DIVINE 爆诞！-', 'BanG Dream! Our Notes', '风都侦探', 'D4DJ First Mix'],
      answer: 2,
      explain: '《风都侦探》与她无关；另外三部她都出演过。',
    },
    {
      id: 'w10',
      level: 'hard',
      prompt: '下面哪部作品与她无关？',
      options: ['D4DJ Groovy Mix', 'バンドやろうぜ!', 'ROAD59 -新时代任侠特区-', 'BanG Dream! 少女乐团派对！'],
      answer: 1,
      explain: '《バンドやろうぜ!》与她无关；另外三部她都出演过。',
    },
    {
      id: 'w11',
      level: 'easy',
      prompt: '她出演过下面哪部作品？',
      options: ['恋语 曾几何时的记忆', 'BanG Dream! Ave Mujica', '魔都精兵的奴隶2', '迷宫饭 Season2'],
      answer: 1,
      explain: '她出演过《BanG Dream! Ave Mujica》；其余三部与她无关。',
    },
    {
      id: 'w12',
      level: 'easy',
      prompt: '她出演过下面哪部作品？',
      options: ['开始当青梅竹马的妹妹的家庭教师之后', 'D4DJ Double Mix', '巫女笔记 第“0”话 -前日谭-', '寒蝉鸣泣之时 命'],
      answer: 1,
      explain: '她出演过《D4DJ Double Mix》；其余三部与她无关。',
    },
];

export default { id: 'okada-mei', questions: worksQuestions };
