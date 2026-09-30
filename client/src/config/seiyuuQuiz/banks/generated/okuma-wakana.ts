import type { SeiyuuQuizQuestion } from '../../types';

/**
 * 【自动生成，不用手改】大熊和奏 的「出演作品」派生题。
 *
 * 由 `tmp/gen-works-questions.mjs` 从萌娘百科「出演作品」小节生成，
 * 重新跑一遍会覆盖本文件；想手改请改手写题库（`../okuma-wakana.ts`）。
 * 来源：https://zh.moegirl.org.cn/%E5%A4%A7%E7%86%8A%E5%92%8C%E5%A5%8F
 */
export const worksQuestions: SeiyuuQuizQuestion[] = [
    {
      id: 'w1',
      level: 'normal',
      prompt: '她在《LoveLive!学园偶像祭》里饰演的角色是？',
      options: ['佩斯利', 'マリア・アキジャン', '若菜四季', '凯特'],
      answer: 2,
      explain: '《LoveLive!学园偶像祭》里她配的是若菜四季。',
    },
    {
      id: 'w2',
      level: 'normal',
      prompt: '《星色物语：束棒之下》中，她配音的角色是？',
      options: ['若菜四季', '佩斯利', '母主领域', 'マリア・アキジャン'],
      answer: 3,
      explain: '《星色物语：束棒之下》里她配的是マリア・アキジャン。',
    },
    {
      id: 'w3',
      level: 'normal',
      prompt: '她为《剑星》配的角色是？',
      options: ['母主领域', 'マリア・アキジャン', '凯特', '若菜四季'],
      answer: 0,
      explain: '《剑星》里她配的是母主领域。',
    },
    {
      id: 'w4',
      level: 'normal',
      prompt: '她在《龙族II 悼亡者之瞳》里饰演的角色是？',
      options: ['マリア・アキジャン', '黑部奈叶香', '凯特', '苏茜'],
      answer: 3,
      explain: '《龙族II 悼亡者之瞳》里她配的是苏茜。',
    },
    {
      id: 'w5',
      level: 'normal',
      prompt: '《LoveLive!学园偶像祭2 MIRACLE LIVE!》中，她配音的角色是？',
      options: ['母主领域', '凯特', '若菜四季', '苏茜'],
      answer: 2,
      explain: '《LoveLive!学园偶像祭2 MIRACLE LIVE!》里她配的是若菜四季。',
    },
    {
      id: 'w6',
      level: 'normal',
      prompt: '以下哪个角色是她饰演过的？',
      options: ['矢岛加奈', '苏茜', 'マリキュラ', '四谷りん'],
      answer: 1,
      explain: '苏茜是她配过的角色，其余三个是其他声优的角色。',
    },
    {
      id: 'w7',
      level: 'normal',
      prompt: '下列角色中，哪一个由她配音？',
      options: ['凯特', '鹤濑茉莉、猪濑舞', '姬川缘', '鹤木阳渚'],
      answer: 0,
      explain: '凯特是她配过的角色，其余三个是其他声优的角色。',
    },
    {
      id: 'w8',
      level: 'normal',
      prompt: '她配过下面哪个角色？',
      options: ['不明', '朝比奈北斗', 'セツガ', '观光客C'],
      answer: 0,
      explain: '不明是她配过的角色，其余三个是其他声优的角色。',
    },
    {
      id: 'w9',
      level: 'hard',
      prompt: '以下哪部作品她没有出演？',
      options: ['三角洲行动', 'LoveLive!Superstar!! 3期', 'Ivy + Bean', '魔法少女的魔女裁判'],
      answer: 0,
      explain: '《三角洲行动》与她无关；另外三部她都出演过。',
    },
    {
      id: 'w10',
      level: 'hard',
      prompt: '下面哪部作品与她无关？',
      options: ['奇异博士2：疯狂多元宇宙', '龙族', '动画锻炼！EX', 'LoveLive!Superstar!! 2期'],
      answer: 2,
      explain: '《动画锻炼！EX》与她无关；另外三部她都出演过。',
    },
    {
      id: 'w11',
      level: 'easy',
      prompt: '以下哪部作品有她的配音？',
      options: ['舞台剧『派对浪客诸葛孔明』', '影之诗', '神领编年史', '记忆的琴键'],
      answer: 3,
      explain: '她出演过《记忆的琴键》；其余三部与她无关。',
    },
];

export default { id: 'okuma-wakana', questions: worksQuestions };
