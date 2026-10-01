import type { SeiyuuQuizQuestion } from '../../types';

/**
 * 【自动生成，不用手改】法元明菜 的「出演作品」派生题。
 *
 * 由 `tmp/gen-works-questions.mjs` 从萌娘百科「出演作品」小节生成，
 * 重新跑一遍会覆盖本文件；想手改请改手写题库（`../houmoto-akina.ts`）。
 * 来源：https://zh.moegirl.org.cn/%E6%B3%95%E5%85%83%E6%98%8E%E8%8F%9C
 */
export const worksQuestions: SeiyuuQuizQuestion[] = [
    {
      id: 'w1',
      level: 'normal',
      prompt: '她在《LoveLive!学园偶像祭ALL STARS》里饰演的角色是？',
      options: ['プレンティア等', '钟岚珠', 'アリー', '哈尔滨(滨江)'],
      answer: 1,
      explain: '《LoveLive!学园偶像祭ALL STARS》里她配的是钟岚珠。',
    },
    {
      id: 'w2',
      level: 'normal',
      prompt: '《LoveLive!虹咲学园学园偶像同好会 NEXT SKY》中，她配音的角色是？',
      options: ['發坂マコ', 'プレンティア等', '钟岚珠', '春雨'],
      answer: 2,
      explain: '《LoveLive!虹咲学园学园偶像同好会 NEXT SKY》里她配的是钟岚珠。',
    },
    {
      id: 'w3',
      level: 'normal',
      prompt: '她为《雀皇》配的角色是？',
      options: ['春雨', '钟岚珠', '讨伐队B', '麟麟'],
      answer: 0,
      explain: '《雀皇》里她配的是春雨。',
    },
    {
      id: 'w4',
      level: 'normal',
      prompt: '她在《麻雀 昇龍神》里饰演的角色是？',
      options: ['發坂マコ', '麟麟', '灰色的朋友、岛民', '灰色的孩子'],
      answer: 0,
      explain: '《麻雀 昇龍神》里她配的是發坂マコ。',
    },
    {
      id: 'w5',
      level: 'normal',
      prompt: '《群马酱 Season 2》中，她配音的角色是？',
      options: ['アリー', '發坂マコ', 'ハニワD、达尔玛D、乳杆菌', '哈尔滨(滨江)'],
      answer: 2,
      explain: '《群马酱 Season 2》里她配的是ハニワD、达尔玛D、乳杆菌。',
    },
    {
      id: 'w6',
      level: 'normal',
      prompt: '以下哪个角色是她饰演过的？',
      options: ['十四行诗', '灰色的朋友、岛民', '帕埃娜', '渡铃白、佐清、优子、亚纪的孩子'],
      answer: 1,
      explain: '灰色的朋友、岛民是她配过的角色，其余三个是其他声优的角色。',
    },
    {
      id: 'w7',
      level: 'normal',
      prompt: '下列角色中，哪一个由她配音？',
      options: ['讨伐队B', '贵族', 'クゥエル', '米蕾娜'],
      answer: 0,
      explain: '讨伐队B是她配过的角色，其余三个是其他声优的角色。',
    },
    {
      id: 'w8',
      level: 'normal',
      prompt: '她配过下面哪个角色？',
      options: ['市桥绿', '刚田魔法桃铃', 'アリー', '三谷真奈'],
      answer: 2,
      explain: 'アリー是她配过的角色，其余三个是其他声优的角色。',
    },
    {
      id: 'w9',
      level: 'hard',
      prompt: '以下哪部作品她没有出演？',
      options: ['MONSTER CRY 2', '灵魂潮汐', '电影 LoveLive!虹咲学园学园偶像同好会 完结篇 第2章', 'LoveLive!学园偶像祭'],
      answer: 1,
      explain: '《灵魂潮汐》与她无关；另外三部她都出演过。',
    },
    {
      id: 'w10',
      level: 'hard',
      prompt: '下面哪部作品与她无关？',
      options: ['LoveLive!虹咲学园学园偶像同好会 2期', '电影 LoveLive!虹咲学园学园偶像同好会 完结篇 最终章', 'LoveLive!学园偶像祭2 MIRACLE LIVE!', '100%帕斯卡老师'],
      answer: 3,
      explain: '《100%帕斯卡老师》与她无关；另外三部她都出演过。',
    },
    {
      id: 'w11',
      level: 'easy',
      prompt: '她出演过下面哪部作品？',
      options: ['千绪的通学路', '麟犀AI韵律第二季', '消灭都市', '最终休止符'],
      answer: 1,
      explain: '她出演过《麟犀AI韵律第二季》；其余三部与她无关。',
    },
    {
      id: 'w12',
      level: 'easy',
      prompt: '她出演过下面哪部作品？',
      options: ['第38期 蓝本女子高等学校生徒会活动日志 あいぽん', '吉伊卡哇', 'BASTARD!!-暗黑的破坏神-', '史莱姆与地下城'],
      answer: 1,
      explain: '她出演过《吉伊卡哇》；其余三部与她无关。',
    },
];

export default { id: 'houmoto-akina', questions: worksQuestions };
