import type { SeiyuuQuizQuestion } from '../../types';

/**
 * 【自动生成，不用手改】岬なこ 的「出演作品」派生题。
 *
 * 由 `tmp/gen-works-questions.mjs` 从萌娘百科「出演作品」小节生成，
 * 重新跑一遍会覆盖本文件；想手改请改手写题库（`../misaki-nako.ts`）。
 * 来源：https://zh.moegirl.org.cn/%E5%B2%AC%E3%81%AA%E3%81%93
 */
export const worksQuestions: SeiyuuQuizQuestion[] = [
    {
      id: 'w1',
      level: 'normal',
      prompt: '她在《LoveLive!学园偶像祭2 MIRACLE LIVE!》里饰演的角色是？',
      options: ['岚千砂都', 'タキア', '三鸟屋吉野', '拉米'],
      answer: 0,
      explain: '《LoveLive!学园偶像祭2 MIRACLE LIVE!》里她配的是岚千砂都。',
    },
    {
      id: 'w2',
      level: 'normal',
      prompt: '《共斗ことばRPG コトダマン》中，她配音的角色是？',
      options: ['岚千砂都', '雉根田兔留留', '八云龙菜', 'タキア'],
      answer: 3,
      explain: '《共斗ことばRPG コトダマン》里她配的是タキア。',
    },
    {
      id: 'w3',
      level: 'normal',
      prompt: '她为《棋樱》配的角色是？',
      options: ['雉根田兔留留', '三鸟屋吉野', '岚千砂都', '八云龙菜'],
      answer: 3,
      explain: '《棋樱》里她配的是八云龙菜。',
    },
    {
      id: 'w4',
      level: 'normal',
      prompt: '她在《LoveLive!Superstar!! 3期》里饰演的角色是？',
      options: ['拉米', '八云龙菜', '岚千砂都', '三鸟屋吉野'],
      answer: 2,
      explain: '《LoveLive!Superstar!! 3期》里她配的是岚千砂都。',
    },
    {
      id: 'w5',
      level: 'normal',
      prompt: '《LoveLive!学园偶像祭》中，她配音的角色是？',
      options: ['岚千砂都', '八云龙菜', 'タキア', '三鸟屋吉野'],
      answer: 0,
      explain: '《LoveLive!学园偶像祭》里她配的是岚千砂都。',
    },
    {
      id: 'w6',
      level: 'normal',
      prompt: '以下哪个角色是她饰演过的？',
      options: ['雉根田兔留留', '三船栞子', '野中姬乃', '莱克莉丝'],
      answer: 0,
      explain: '雉根田兔留留是她配过的角色，其余三个是其他声优的角色。',
    },
    {
      id: 'w7',
      level: 'normal',
      prompt: '下列角色中，哪一个由她配音？',
      options: ['星野彩叶', '岚千砂都', '強羅かんな', 'アリー'],
      answer: 1,
      explain: '岚千砂都是她配过的角色，其余三个是其他声优的角色。',
    },
    {
      id: 'w8',
      level: 'normal',
      prompt: '她配过下面哪个角色？',
      options: ['拉米', '邪神酱', '蕾拉', 'シャーロット'],
      answer: 0,
      explain: '拉米是她配过的角色，其余三个是其他声优的角色。',
    },
    {
      id: 'w9',
      level: 'hard',
      prompt: '以下哪部作品她没有出演？',
      options: ['信长之野望：霸道', 'Cheers!爱的鼓励', '转生七王子的魔法全解 第2期', 'LoveLive!Superstar!! 2期'],
      answer: 1,
      explain: '《Cheers!爱的鼓励》与她无关；另外三部她都出演过。',
    },
    {
      id: 'w10',
      level: 'easy',
      prompt: '她出演过下面哪部作品？',
      options: ['D4DJ First Mix', '街角魔族', 'Onipan!', 'LoveLive!Superstar!!'],
      answer: 3,
      explain: '她出演过《LoveLive!Superstar!!》；其余三部与她无关。',
    },
    {
      id: 'w11',
      level: 'easy',
      prompt: '以下哪部作品有她的配音？',
      options: ['Revived Witch', '超超超超超喜欢你的100个女朋友 第3期', '蓝色管弦乐', '喜欢的冲绳妹说方言'],
      answer: 1,
      explain: '她出演过《超超超超超喜欢你的100个女朋友 第3期》；其余三部与她无关。',
    },
];

export default { id: 'misaki-nako', questions: worksQuestions };
