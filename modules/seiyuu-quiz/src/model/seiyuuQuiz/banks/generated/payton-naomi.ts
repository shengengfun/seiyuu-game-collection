import type { SeiyuuQuizQuestion } from '../../types';

/**
 * 【自动生成，不用手改】ペイトン尚未 的「出演作品」派生题。
 *
 * 由 `tmp/gen-works-questions.mjs` 从萌娘百科「出演作品」小节生成，
 * 重新跑一遍会覆盖本文件；想手改请改手写题库（`../payton-naomi.ts`）。
 * 来源：https://zh.moegirl.org.cn/%E3%83%9A%E3%82%A4%E3%83%88%E3%83%B3%E5%B0%9A%E6%9C%AA
 */
export const worksQuestions: SeiyuuQuizQuestion[] = [
    {
      id: 'w1',
      level: 'normal',
      prompt: '她在《YGGDRA RESONANCE》里饰演的角色是？',
      options: ['アサギ', 'デスロ', 'キュウト', '高桥京子'],
      answer: 0,
      explain: '《YGGDRA RESONANCE》里她配的是アサギ。',
    },
    {
      id: 'w2',
      level: 'normal',
      prompt: '《怪物弹珠》中，她配音的角色是？',
      options: ['キュウト', 'デスロ', '高桥京子', '平安名堇'],
      answer: 0,
      explain: '《怪物弹珠》里她配的是キュウト。',
    },
    {
      id: 'w3',
      level: 'normal',
      prompt: '她为《LoveLive!学园偶像祭》配的角色是？',
      options: ['平安名堇', 'デスロ', 'キュウト', '高桥京子'],
      answer: 0,
      explain: '《LoveLive!学园偶像祭》里她配的是平安名堇。',
    },
    {
      id: 'w4',
      level: 'normal',
      prompt: '她在《LoveLive!Superstar!! 3期》里饰演的角色是？',
      options: ['キュウト', 'デスロ', 'アサギ', '平安名堇'],
      answer: 3,
      explain: '《LoveLive!Superstar!! 3期》里她配的是平安名堇。',
    },
    {
      id: 'w5',
      level: 'normal',
      prompt: '《LoveLive!Superstar!!》中，她配音的角色是？',
      options: ['アサギ', 'デスロ', '平安名堇', '高桥京子'],
      answer: 2,
      explain: '《LoveLive!Superstar!!》里她配的是平安名堇。',
    },
    {
      id: 'w6',
      level: 'normal',
      prompt: '以下哪个角色是她饰演过的？',
      options: ['アサギ', 'フラバレット', '由崎司', '笑面青江'],
      answer: 0,
      explain: 'アサギ是她配过的角色，其余三个是其他声优的角色。',
    },
    {
      id: 'w7',
      level: 'normal',
      prompt: '下列角色中，哪一个由她配音？',
      options: ['莎拉萨·菲朵', '平安名堇', '冥美', '罗赛塔'],
      answer: 1,
      explain: '平安名堇是她配过的角色，其余三个是其他声优的角色。',
    },
    {
      id: 'w8',
      level: 'normal',
      prompt: '她配过下面哪个角色？',
      options: ['日替嘉宾(天帝)', '流萤', '阿里雅巴妲、猫', 'デスロ'],
      answer: 3,
      explain: 'デスロ是她配过的角色，其余三个是其他声优的角色。',
    },
    {
      id: 'w9',
      level: 'hard',
      prompt: '以下哪部作品她没有出演？',
      options: ['虚构未来', 'Charamix', 'LoveLive!学园偶像祭2 MIRACLE LIVE!', 'BATON=RELAY'],
      answer: 0,
      explain: '《虚构未来》与她无关；另外三部她都出演过。',
    },
    {
      id: 'w10',
      level: 'easy',
      prompt: '她出演过下面哪部作品？',
      options: ['闪亮美妙☆频道', '声技の英雄', '炽焰天穹', 'LoveLive!Superstar!! 2期'],
      answer: 3,
      explain: '她出演过《LoveLive!Superstar!! 2期》；其余三部与她无关。',
    },
];

export default { id: 'payton-naomi', questions: worksQuestions };
