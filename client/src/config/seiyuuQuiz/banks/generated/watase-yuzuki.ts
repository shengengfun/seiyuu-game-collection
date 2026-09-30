import type { SeiyuuQuizQuestion } from '../../types';

/**
 * 【自动生成，不用手改】渡濑结月 的「出演作品」派生题。
 *
 * 由 `tmp/gen-works-questions.mjs` 从萌娘百科「出演作品」小节生成，
 * 重新跑一遍会覆盖本文件；想手改请改手写题库（`../watase-yuzuki.ts`）。
 * 来源：https://zh.moegirl.org.cn/%E6%B8%A1%E6%BF%91%E7%BB%93%E6%9C%88
 */
export const worksQuestions: SeiyuuQuizQuestion[] = [
    {
      id: 'w1',
      level: 'normal',
      prompt: '她在《BanG Dream! Our Notes》里饰演的角色是？',
      options: ['若叶睦 / Mortis', '受伤的Lily等', '雨宫日向', '七盘舞砖、天气卜骨'],
      answer: 0,
      explain: '《BanG Dream! Our Notes》里她配的是若叶睦 / Mortis。',
    },
    {
      id: 'w2',
      level: 'normal',
      prompt: '《黑白双翼ONLINE》中，她配音的角色是？',
      options: ['雨宫日向', '古部巴', 'イセリン', '若叶睦'],
      answer: 0,
      explain: '《黑白双翼ONLINE》里她配的是雨宫日向。',
    },
    {
      id: 'w3',
      level: 'normal',
      prompt: '她为《Assault Lily Last Bullet》配的角色是？',
      options: ['冒险者', '受伤的Lily等', '古部巴', '七盘舞砖、天气卜骨'],
      answer: 1,
      explain: '《Assault Lily Last Bullet》里她配的是受伤的Lily等。',
    },
    {
      id: 'w4',
      level: 'normal',
      prompt: '她在《卡片战斗先导者 DivineZ Season2》里饰演的角色是？',
      options: ['イセリン', '西园寺优奈', '雨宫日向', '若叶睦 / Mortis'],
      answer: 1,
      explain: '《卡片战斗先导者 DivineZ Season2》里她配的是西园寺优奈。',
    },
    {
      id: 'w5',
      level: 'normal',
      prompt: '《卡片战斗先导者 DivineZ DELUXE篇》中，她配音的角色是？',
      options: ['七盘舞砖、天气卜骨', 'ギュギュ', '西园寺优奈', '雨宫日向'],
      answer: 2,
      explain: '《卡片战斗先导者 DivineZ DELUXE篇》里她配的是西园寺优奈。',
    },
    {
      id: 'w6',
      level: 'normal',
      prompt: '以下哪个角色是她饰演过的？',
      options: ['朱莉娅·麦克白·冯盖特', '透子', '井河咲夜', '古部巴'],
      answer: 3,
      explain: '古部巴是她配过的角色，其余三个是其他声优的角色。',
    },
    {
      id: 'w7',
      level: 'normal',
      prompt: '下列角色中，哪一个由她配音？',
      options: ['薇儿卡', '阿尔汉格尔斯克', '露西利亚', 'イセリン'],
      answer: 3,
      explain: 'イセリン是她配过的角色，其余三个是其他声优的角色。',
    },
    {
      id: 'w8',
      level: 'normal',
      prompt: '她配过下面哪个角色？',
      options: ['拉拉·辛', '梅园小牧', '小之星穗波', '若叶睦 / Mortis'],
      answer: 3,
      explain: '若叶睦 / Mortis是她配过的角色，其余三个是其他声优的角色。',
    },
    {
      id: 'w9',
      level: 'hard',
      prompt: '以下哪部作品她没有出演？',
      options: ['BanG Dream! 少女乐团派对！', '星色物语：束棒之下', '星色物语：学生终端', '驭时之轮'],
      answer: 3,
      explain: '《驭时之轮》与她无关；另外三部她都出演过。',
    },
    {
      id: 'w10',
      level: 'hard',
      prompt: '下面哪部作品与她无关？',
      options: ['D4DJ All Mix', 'BanG Dream! Ave Mujica prima aurora', '元祖！BanG Dream Chan', '舞台「歌剧少女！！」'],
      answer: 3,
      explain: '《舞台「歌剧少女！！」》与她无关；另外三部她都出演过。',
    },
    {
      id: 'w11',
      level: 'easy',
      prompt: '她出演过下面哪部作品？',
      options: ['影之诗FLAME', '青春之箱 第2期', '超超超超超喜欢你的100个女朋友', '勇者斗恶龙X'],
      answer: 0,
      explain: '她出演过《影之诗FLAME》；其余三部与她无关。',
    },
    {
      id: 'w12',
      level: 'easy',
      prompt: '以下哪部作品有她的配音？',
      options: ['史莱姆与地下城', '深空之眼', '电影 LoveLive!虹咲学园学园偶像同好会 完结篇 第3章', '明日方舟'],
      answer: 3,
      explain: '她出演过《明日方舟》；其余三部与她无关。',
    },
];

export default { id: 'watase-yuzuki', questions: worksQuestions };
