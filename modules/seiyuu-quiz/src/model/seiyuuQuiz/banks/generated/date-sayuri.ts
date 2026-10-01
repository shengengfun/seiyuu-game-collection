import type { SeiyuuQuizQuestion } from '../../types';

/**
 * 【自动生成，不用手改】伊達さゆり 的「出演作品」派生题。
 *
 * 由 `tmp/gen-works-questions.mjs` 从萌娘百科「出演作品」小节生成，
 * 重新跑一遍会覆盖本文件；想手改请改手写题库（`../date-sayuri.ts`）。
 * 来源：https://zh.moegirl.org.cn/%E4%BC%8A%E9%81%94%E3%81%95%E3%82%86%E3%82%8A
 */
export const worksQuestions: SeiyuuQuizQuestion[] = [
    {
      id: 'w1',
      level: 'normal',
      prompt: '她在《灰烬战线》里饰演的角色是？',
      options: ['カエデ', '丹羽茜渚', '台风', '石冢藤乃'],
      answer: 2,
      explain: '《灰烬战线》里她配的是台风。',
    },
    {
      id: 'w2',
      level: 'normal',
      prompt: '《LoveLive!学园偶像祭2 MIRACLE LIVE!》中，她配音的角色是？',
      options: ['福姬', '涩谷香音', '石冢藤乃', '丹羽茜渚'],
      answer: 1,
      explain: '《LoveLive!学园偶像祭2 MIRACLE LIVE!》里她配的是涩谷香音。',
    },
    {
      id: 'w3',
      level: 'normal',
      prompt: '她为《LoveLive!学园偶像祭》配的角色是？',
      options: ['石冢藤乃', '台风', '涩谷香音', '丹羽茜渚'],
      answer: 2,
      explain: '《LoveLive!学园偶像祭》里她配的是涩谷香音。',
    },
    {
      id: 'w4',
      level: 'normal',
      prompt: '她在《SANADA XI》里饰演的角色是？',
      options: ['カエデ', '石冢藤乃', '宫泽', '福姬'],
      answer: 3,
      explain: '《SANADA XI》里她配的是福姬。',
    },
    {
      id: 'w5',
      level: 'normal',
      prompt: '《LoveLive!Superstar!! 2期》中，她配音的角色是？',
      options: ['涩谷香音', '福姬', 'コーシュ', '台风'],
      answer: 0,
      explain: '《LoveLive!Superstar!! 2期》里她配的是涩谷香音。',
    },
    {
      id: 'w6',
      level: 'normal',
      prompt: '以下哪个角色是她饰演过的？',
      options: ['西岛佐理', '大道寺伽耶', 'カエデ', '薇丝·空瞳'],
      answer: 2,
      explain: 'カエデ是她配过的角色，其余三个是其他声优的角色。',
    },
    {
      id: 'w7',
      level: 'normal',
      prompt: '下列角色中，哪一个由她配音？',
      options: ['讨伐队B', '秽地露梅莉', '台风', '山新'],
      answer: 2,
      explain: '台风是她配过的角色，其余三个是其他声优的角色。',
    },
    {
      id: 'w8',
      level: 'normal',
      prompt: '她配过下面哪个角色？',
      options: ['月冈椛', '高桥千夏', '涩谷香音', '鉴纯夏'],
      answer: 2,
      explain: '涩谷香音是她配过的角色，其余三个是其他声优的角色。',
    },
    {
      id: 'w9',
      level: 'hard',
      prompt: '以下哪部作品她没有出演？',
      options: ['LoveLive!Superstar!!', '突击莉莉 终结之弹', '共闘ことばRPG コトダマン', '灰色：集结的百果'],
      answer: 3,
      explain: '《灰色：集结的百果》与她无关；另外三部她都出演过。',
    },
    {
      id: 'w10',
      level: 'hard',
      prompt: '下面哪部作品与她无关？',
      options: ['英杰大战', '星色物语：学生终端', '苍蓝境界', '棕色尘埃'],
      answer: 2,
      explain: '《苍蓝境界》与她无关；另外三部她都出演过。',
    },
    {
      id: 'w11',
      level: 'easy',
      prompt: '以下哪部作品有她的配音？',
      options: ['音楽朗読劇 READING HIGH 5周年記念公演『YOUNG WIZARDS〜Story from蘆屋道満大内鑑〜』', '下克上球儿', '灰色 -CHRONOS REBELLION-', '我的可爱对黑岩目高不管用'],
      answer: 1,
      explain: '她出演过《下克上球儿》；其余三部与她无关。',
    },
    {
      id: 'w12',
      level: 'easy',
      prompt: '以下哪部作品有她的配音？',
      options: ['日本朗读学院 朗读剧〈推理要在晚餐后〉', '罗密欧与朱丽叶', '忍不住了！加密忍者咲耶 叁之卷', 'LoveLive!Superstar!! 3期'],
      answer: 3,
      explain: '她出演过《LoveLive!Superstar!! 3期》；其余三部与她无关。',
    },
];

export default { id: 'date-sayuri', questions: worksQuestions };
