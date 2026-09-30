import type { SeiyuuQuizQuestion } from '../../types';

/**
 * 【自动生成，不用手改】坂倉花 的「出演作品」派生题。
 *
 * 由 `tmp/gen-works-questions.mjs` 从萌娘百科「出演作品」小节生成，
 * 重新跑一遍会覆盖本文件；想手改请改手写题库（`../sakakura-hana.ts`）。
 * 来源：https://zh.moegirl.org.cn/%E5%9D%82%E5%80%89%E8%8A%B1
 */
export const worksQuestions: SeiyuuQuizQuestion[] = [
    {
      id: 'w1',
      level: 'normal',
      prompt: '以下哪个角色是她饰演过的？',
      options: ['辉伊芙', '鬼冢冬毬', '炽天寺神狩', '维罗妮卡'],
      answer: 1,
      explain: '鬼冢冬毬是她配过的角色，其余三个是其他声优的角色。',
    },
    {
      id: 'w2',
      level: 'easy',
      prompt: '她出演过下面哪部作品？',
      options: ['崩坏：星穹铁道', 'LoveLive!学园偶像祭2 MIRACLE LIVE!', '樱花革命 ～花开的少女们～', '赛博朋克 边缘行者2'],
      answer: 1,
      explain: '她出演过《LoveLive!学园偶像祭2 MIRACLE LIVE!》；其余三部与她无关。',
    },
    {
      id: 'w3',
      level: 'easy',
      prompt: '以下哪部作品有她的配音？',
      options: ['新干线变形机器人 SHINKALION Z THE ANIMATION', 'LoveLive!Superstar!! 3期', '阿尔特斯：超越时空', '生化危机4 重制版'],
      answer: 1,
      explain: '她出演过《LoveLive!Superstar!! 3期》；其余三部与她无关。',
    },
];

export default { id: 'sakakura-hana', questions: worksQuestions };
