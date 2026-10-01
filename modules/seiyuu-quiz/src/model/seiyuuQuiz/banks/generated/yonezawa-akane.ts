import type { SeiyuuQuizQuestion } from '../../types';

/**
 * 【自动生成，不用手改】米泽茜 的「出演作品」派生题。
 *
 * 由 `tmp/gen-works-questions.mjs` 从萌娘百科「出演作品」小节生成，
 * 重新跑一遍会覆盖本文件；想手改请改手写题库（`../yonezawa-akane.ts`）。
 * 来源：https://zh.moegirl.org.cn/%E7%B1%B3%E6%B3%BD%E8%8C%9C
 */
export const worksQuestions: SeiyuuQuizQuestion[] = [
    {
      id: 'w1',
      level: 'normal',
      prompt: '以下哪个角色是她饰演过的？',
      options: ['灵砂', '祐天寺若麦', '蔓深翡翠', '绿子、海伦、莉莉奈'],
      answer: 1,
      explain: '祐天寺若麦是她配过的角色，其余三个是其他声优的角色。',
    },
    {
      id: 'w2',
      level: 'normal',
      prompt: '下列角色中，哪一个由她配音？',
      options: ['藤沢アーニャ', '祐天寺若麦 / Amoris', '光明云', '女朋友、猫'],
      answer: 1,
      explain: '祐天寺若麦 / Amoris是她配过的角色，其余三个是其他声优的角色。',
    },
    {
      id: 'w3',
      level: 'normal',
      prompt: '她配过下面哪个角色？',
      options: ['玛格丽特', '水鸟水花', '露比', 'アーカーシャ'],
      answer: 0,
      explain: '玛格丽特是她配过的角色，其余三个是其他声优的角色。',
    },
    {
      id: 'w4',
      level: 'hard',
      prompt: '以下哪部作品她没有出演？',
      options: ['明日方舟', 'BanG Dream! Ave Mujica', 'BanG Dream! Our Notes', '深空之眼'],
      answer: 3,
      explain: '《深空之眼》与她无关；另外三部她都出演过。',
    },
    {
      id: 'w5',
      level: 'hard',
      prompt: '下面哪部作品与她无关？',
      options: ['YGGDRA RESONANCE', 'BanG Dream! It\'s MyGO!!!!!', 'BanG Dream! Ave Mujica prima aurora', 'PROGRESS ORDERS'],
      answer: 0,
      explain: '《YGGDRA RESONANCE》与她无关；另外三部她都出演过。',
    },
    {
      id: 'w6',
      level: 'easy',
      prompt: '她出演过下面哪部作品？',
      options: ['元祖！BanG Dream Chan', '猫耳さばいばー!', '全力回避flag酱！', '樱花革命'],
      answer: 0,
      explain: '她出演过《元祖！BanG Dream Chan》；其余三部与她无关。',
    },
];

export default { id: 'yonezawa-akane', questions: worksQuestions };
