import type { SeiyuuQuizQuestion } from '../../types';

/**
 * 【自动生成，不用手改】絵森彩 的「出演作品」派生题。
 *
 * 由 `tmp/gen-works-questions.mjs` 从萌娘百科「出演作品」小节生成，
 * 重新跑一遍会覆盖本文件；想手改请改手写题库（`../emori-aya.ts`）。
 * 来源：https://zh.moegirl.org.cn/%E7%B5%B5%E6%A3%AE%E5%BD%A9
 */
export const worksQuestions: SeiyuuQuizQuestion[] = [
    {
      id: 'w1',
      level: 'normal',
      prompt: '以下哪个角色是她饰演过的？',
      options: ['森田水织', '邻居', '鬼冢夏美', '阿里雅巴妲、猫'],
      answer: 2,
      explain: '鬼冢夏美是她配过的角色，其余三个是其他声优的角色。',
    },
    {
      id: 'w2',
      level: 'hard',
      prompt: '以下哪部作品她没有出演？',
      options: ['LoveLive!学园偶像祭2 MIRACLE LIVE!', '家庭教师寅子', 'LoveLive!学园偶像祭', 'LoveLive!Superstar!! 3期'],
      answer: 1,
      explain: '《家庭教师寅子》与她无关；另外三部她都出演过。',
    },
    {
      id: 'w3',
      level: 'easy',
      prompt: '她出演过下面哪部作品？',
      options: ['隔夜茶', 'LoveLive!Superstar!! 2期', '自称恶役千金的未婚妻观察记录。', '女高网球部 8期'],
      answer: 1,
      explain: '她出演过《LoveLive!Superstar!! 2期》；其余三部与她无关。',
    },
];

export default { id: 'emori-aya', questions: worksQuestions };
