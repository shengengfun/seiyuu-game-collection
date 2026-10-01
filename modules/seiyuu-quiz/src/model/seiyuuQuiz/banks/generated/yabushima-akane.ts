import type { SeiyuuQuizQuestion } from '../../types';

/**
 * 【自动生成，不用手改】薮島朱音 的「出演作品」派生题。
 *
 * 由 `tmp/gen-works-questions.mjs` 从萌娘百科「出演作品」小节生成，
 * 重新跑一遍会覆盖本文件；想手改请改手写题库（`../yabushima-akane.ts`）。
 * 来源：https://zh.moegirl.org.cn/%E8%96%AE%E5%B3%B6%E6%9C%B1%E9%9F%B3
 */
export const worksQuestions: SeiyuuQuizQuestion[] = [
    {
      id: 'w1',
      level: 'normal',
      prompt: '她在《棕色尘埃》里饰演的角色是？',
      options: ['高年级生', 'キマリス', '姬川缘', '村民'],
      answer: 1,
      explain: '《棕色尘埃》里她配的是キマリス。',
    },
    {
      id: 'w2',
      level: 'normal',
      prompt: '《明日同学的水手服》中，她配音的角色是？',
      options: ['米女芽衣', '高年级生', '保育士', 'キマリス'],
      answer: 1,
      explain: '《明日同学的水手服》里她配的是高年级生。',
    },
    {
      id: 'w3',
      level: 'normal',
      prompt: '她为《LoveLive!学园偶像祭2 MIRACLE LIVE!》配的角色是？',
      options: ['保育士', '村民', '米女芽衣', '高年级生'],
      answer: 2,
      explain: '《LoveLive!学园偶像祭2 MIRACLE LIVE!》里她配的是米女芽衣。',
    },
    {
      id: 'w4',
      level: 'normal',
      prompt: '她在《LoveLive!Superstar!! 2期》里饰演的角色是？',
      options: ['村民', '姬川缘', '米女芽衣', '高年级生'],
      answer: 2,
      explain: '《LoveLive!Superstar!! 2期》里她配的是米女芽衣。',
    },
    {
      id: 'w5',
      level: 'normal',
      prompt: '《Re:从零开始的异世界生活 2nd season》中，她配音的角色是？',
      options: ['高年级生', '姬川缘', '村民', 'キマリス'],
      answer: 2,
      explain: '《Re:从零开始的异世界生活 2nd season》里她配的是村民。',
    },
    {
      id: 'w6',
      level: 'normal',
      prompt: '以下哪个角色是她饰演过的？',
      options: ['山田彩子', '讨伐队B', 'キマリス', '安西娅'],
      answer: 2,
      explain: 'キマリス是她配过的角色，其余三个是其他声优的角色。',
    },
    {
      id: 'w7',
      level: 'normal',
      prompt: '下列角色中，哪一个由她配音？',
      options: ['姬川缘', '野岛圣', '若叶睦', 'シャーロット·ベネット'],
      answer: 0,
      explain: '姬川缘是她配过的角色，其余三个是其他声优的角色。',
    },
    {
      id: 'w8',
      level: 'normal',
      prompt: '她配过下面哪个角色？',
      options: ['静山麻白', '米女芽衣', '星歌姫 リリ・ラブリア', '婕斯'],
      answer: 1,
      explain: '米女芽衣是她配过的角色，其余三个是其他声优的角色。',
    },
    {
      id: 'w9',
      level: 'hard',
      prompt: '以下哪部作品她没有出演？',
      options: ['少女☆歌剧 Revue Starlight -The LIVE-#4 Climax', 'フェアリーエイド', 'LoveLive!学园偶像祭', '公司的小小前辈'],
      answer: 0,
      explain: '《少女☆歌剧 Revue Starlight -The LIVE-#4 Climax》与她无关；另外三部她都出演过。',
    },
    {
      id: 'w10',
      level: 'easy',
      prompt: '以下哪部作品有她的配音？',
      options: ['雷索纳斯「列车长的一天」', '请问您今天要来点兔子吗？BLOOM', 'BASTARD!!-暗黑的破坏神-', '夜樱家的大作战'],
      answer: 1,
      explain: '她出演过《请问您今天要来点兔子吗？BLOOM》；其余三部与她无关。',
    },
    {
      id: 'w11',
      level: 'easy',
      prompt: '以下哪部作品有她的配音？',
      options: ['圣女因太过完美不够可爱而被废除婚约并卖到邻国', 'LoveLive!Superstar!! 3期', '希维司：英雄之声', '用这场恋爱来止住鼻血（《无聊就完结'],
      answer: 1,
      explain: '她出演过《LoveLive!Superstar!! 3期》；其余三部与她无关。',
    },
];

export default { id: 'yabushima-akane', questions: worksQuestions };
