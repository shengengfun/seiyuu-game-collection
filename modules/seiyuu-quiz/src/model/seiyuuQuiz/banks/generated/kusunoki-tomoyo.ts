import type { SeiyuuQuizQuestion } from '../../types';

/**
 * 【自动生成，不用手改】楠木灯 的「出演作品」派生题。
 *
 * 由 `tmp/gen-works-questions.mjs` 从萌娘百科「出演作品」小节生成，
 * 重新跑一遍会覆盖本文件；想手改请改手写题库（`../kusunoki-tomoyo.ts`）。
 * 来源：https://zh.moegirl.org.cn/%E6%A5%A0%E6%9C%A8%E7%81%AF
 */
export const worksQuestions: SeiyuuQuizQuestion[] = [
    {
      id: 'w1',
      level: 'normal',
      prompt: '她在《闪耀幻想曲》里饰演的角色是？',
      options: ['柏崎侑里', 'コゼット等', '琪拉拉（Kirara）', '拉拉·柴科斯卡娅 / 魔法猫'],
      answer: 2,
      explain: '《闪耀幻想曲》里她配的是琪拉拉（Kirara）。',
    },
    {
      id: 'w2',
      level: 'normal',
      prompt: '《TIGER & BUNNY 2》中，她配音的角色是？',
      options: ['艾米莉亚', '宵崎奏', '拉拉·柴科斯卡娅 / 魔法猫', 'コイ'],
      answer: 2,
      explain: '《TIGER & BUNNY 2》里她配的是拉拉·柴科斯卡娅 / 魔法猫。',
    },
    {
      id: 'w3',
      level: 'normal',
      prompt: '她为《傲娇反派千金莉洁洛特与实况主远藤同学及解说员小林同学》配的角色是？',
      options: ['莉洁洛特·里芬修坦', '里欧妮·阿勒法', '大手町梨禀', '柏崎侑里'],
      answer: 0,
      explain: '《傲娇反派千金莉洁洛特与实况主远藤同学及解说员小林同学》里她配的是莉洁洛特·里芬修坦。',
    },
    {
      id: 'w4',
      level: 'normal',
      prompt: '她在《少女☆寸剧 All Starlight》里饰演的角色是？',
      options: ['巴珠绪', '格拉斯哥', '冰雨', '米夏·涅库罗、艾夏(米夏+莎夏)'],
      answer: 0,
      explain: '《少女☆寸剧 All Starlight》里她配的是巴珠绪。',
    },
    {
      id: 'w5',
      level: 'normal',
      prompt: '《非人学园》中，她配音的角色是？',
      options: ['夏芽', '一反木绵', '光司阳菜', '优木雪菜'],
      answer: 1,
      explain: '《非人学园》里她配的是一反木绵。',
    },
    {
      id: 'w6',
      level: 'normal',
      prompt: '以下哪个角色是她饰演过的？',
      options: ['谱风', '安名梅露', '椎名琉羽', 'セラフィ'],
      answer: 3,
      explain: 'セラフィ是她配过的角色，其余三个是其他声优的角色。',
    },
    {
      id: 'w7',
      level: 'normal',
      prompt: '下列角色中，哪一个由她配音？',
      options: ['艾丽娅', 'ギンガちゃん / ギンガイザー', '桃瀬しずか', '莲 / 小比类卷香莲、小刀刀'],
      answer: 3,
      explain: '莲 / 小比类卷香莲、小刀刀是她配过的角色，其余三个是其他声优的角色。',
    },
    {
      id: 'w8',
      level: 'normal',
      prompt: '她配过下面哪个角色？',
      options: ['波照间千岁', '优秀素质', '婕斯', 'シャウラ'],
      answer: 2,
      explain: '婕斯是她配过的角色，其余三个是其他声优的角色。',
    },
    {
      id: 'w9',
      level: 'hard',
      prompt: '以下哪部作品她没有出演？',
      options: ['ビーナスイレブンびびっど！', '魔法少女毁灭者', 'VBX', '棕色尘埃'],
      answer: 2,
      explain: '《VBX》与她无关；另外三部她都出演过。',
    },
    {
      id: 'w10',
      level: 'hard',
      prompt: '下面哪部作品与她无关？',
      options: ['天籁人偶 冬空焰火/雪花纹理', 'BRAVE FRONTIER ReXONA', '最强阴阳师的异世界转生记', '判处勇者刑 惩罚勇者9004队刑务纪录'],
      answer: 2,
      explain: '《最强阴阳师的异世界转生记》与她无关；另外三部她都出演过。',
    },
    {
      id: 'w11',
      level: 'easy',
      prompt: '她出演过下面哪部作品？',
      options: ['TOKYO MER～行动急诊室～', '三者三叶', '勇者斗恶龙：宿敌', 'DUSK INDEX: GION'],
      answer: 2,
      explain: '她出演过《勇者斗恶龙：宿敌》；其余三部与她无关。',
    },
    {
      id: 'w12',
      level: 'easy',
      prompt: '以下哪部作品有她的配音？',
      options: ['崩坏学园2', '爱吃拉面的小泉同学', '约定的梦幻岛 Season2', 'RELEASE THE SPYCE'],
      answer: 3,
      explain: '她出演过《RELEASE THE SPYCE》；其余三部与她无关。',
    },
];

export default { id: 'kusunoki-tomoyo', questions: worksQuestions };
