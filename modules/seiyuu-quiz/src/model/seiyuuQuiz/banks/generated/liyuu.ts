import type { SeiyuuQuizQuestion } from '../../types';

/**
 * 【自动生成，不用手改】Liyuu 的「出演作品」派生题。
 *
 * 由 `tmp/gen-works-questions.mjs` 从萌娘百科「出演作品」小节生成，
 * 重新跑一遍会覆盖本文件；想手改请改手写题库（`../liyuu.ts`）。
 * 来源：https://zh.moegirl.org.cn/Liyuu
 */
export const worksQuestions: SeiyuuQuizQuestion[] = [
    {
      id: 'w1',
      level: 'normal',
      prompt: '她在《重返未来：1999》里饰演的角色是？',
      options: ['艾咪、雅', 'ユア', 'Z女士（日配）', '金发女、引导员'],
      answer: 2,
      explain: '《重返未来：1999》里她配的是Z女士（日配）。',
    },
    {
      id: 'w2',
      level: 'normal',
      prompt: '《LoveLive!Superstar!!》中，她配音的角色是？',
      options: ['唐可可', 'ユア', '田宫诗织', '艾咪、雅'],
      answer: 0,
      explain: '《LoveLive!Superstar!!》里她配的是唐可可。',
    },
    {
      id: 'w3',
      level: 'normal',
      prompt: '她为《LoveLive!Superstar!! 3期》配的角色是？',
      options: ['金发女、引导员', '田宫诗织', '唐可可', '艾咪、雅'],
      answer: 2,
      explain: '《LoveLive!Superstar!! 3期》里她配的是唐可可。',
    },
    {
      id: 'w4',
      level: 'normal',
      prompt: '她在《甜蜜喂食生活》里饰演的角色是？',
      options: ['Z女士（日配）', '艾咪、雅', '田宫诗织', '金发女、引导员'],
      answer: 2,
      explain: '《甜蜜喂食生活》里她配的是田宫诗织。',
    },
    {
      id: 'w5',
      level: 'normal',
      prompt: '《LoveLive!学园偶像祭2 MIRACLE LIVE!》中，她配音的角色是？',
      options: ['ユア', '艾咪、雅', '唐可可', '金发女、引导员'],
      answer: 2,
      explain: '《LoveLive!学园偶像祭2 MIRACLE LIVE!》里她配的是唐可可。',
    },
    {
      id: 'w6',
      level: 'normal',
      prompt: '以下哪个角色是她饰演过的？',
      options: ['Z女士（日配）', '莉莉', '灵砂', '爱船三春'],
      answer: 0,
      explain: 'Z女士（日配）是她配过的角色，其余三个是其他声优的角色。',
    },
    {
      id: 'w7',
      level: 'normal',
      prompt: '下列角色中，哪一个由她配音？',
      options: ['良子', '佐藤实', '艾咪、雅', '北方飞翔'],
      answer: 2,
      explain: '艾咪、雅是她配过的角色，其余三个是其他声优的角色。',
    },
    {
      id: 'w8',
      level: 'normal',
      prompt: '她配过下面哪个角色？',
      options: ['665', '田宫诗织', '尤莉缇娅', '巴珠绪'],
      answer: 1,
      explain: '田宫诗织是她配过的角色，其余三个是其他声优的角色。',
    },
    {
      id: 'w9',
      level: 'hard',
      prompt: '以下哪部作品她没有出演？',
      options: ['幻想水浒传 STAR LEAP', '捡走被人悔婚的千金，教会她坏坏的幸福生活', 'LoveLive!Superstar!! 2期', '史莱姆与地下城'],
      answer: 1,
      explain: '《捡走被人悔婚的千金，教会她坏坏的幸福生活》与她无关；另外三部她都出演过。',
    },
    {
      id: 'w10',
      level: 'easy',
      prompt: '她出演过下面哪部作品？',
      options: ['为了共同闪耀的明天。', 'Dragon Collection', '总之就是非常可爱', '异常生物见闻录'],
      answer: 3,
      explain: '她出演过《异常生物见闻录》；其余三部与她无关。',
    },
    {
      id: 'w11',
      level: 'easy',
      prompt: '以下哪部作品有她的配音？',
      options: ['魔法禁书目录 幻想收束', 'LoveLive!学园偶像祭', '碧蓝航线 Queen\'s Orders', '龙族II 悼亡者之瞳'],
      answer: 1,
      explain: '她出演过《LoveLive!学园偶像祭》；其余三部与她无关。',
    },
];

export default { id: 'liyuu', questions: worksQuestions };
