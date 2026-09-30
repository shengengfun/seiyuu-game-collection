import type { SeiyuuQuizQuestion } from '../../types';

/**
 * 【自动生成，不用手改】内田秀 的「出演作品」派生题。
 *
 * 由 `tmp/gen-works-questions.mjs` 从萌娘百科「出演作品」小节生成，
 * 重新跑一遍会覆盖本文件；想手改请改手写题库（`../uchida-shuu.ts`）。
 * 来源：https://zh.moegirl.org.cn/%E5%86%85%E7%94%B0%E7%A7%80
 */
export const worksQuestions: SeiyuuQuizQuestion[] = [
    {
      id: 'w1',
      level: 'normal',
      prompt: '她在《D4DJ All Mix》里饰演的角色是？',
      options: ['シーナ・プブレリウム', '皇家方舟', '萝拉·布拉德利', '露卡·罗森·E'],
      answer: 2,
      explain: '《D4DJ All Mix》里她配的是萝拉·布拉德利。',
    },
    {
      id: 'w2',
      level: 'normal',
      prompt: '《蜡笔小新》中，她配音的角色是？',
      options: ['灰色的孩子', '皇家方舟', '露卡·罗森·E', '狗主人'],
      answer: 3,
      explain: '《蜡笔小新》里她配的是狗主人。',
    },
    {
      id: 'w3',
      level: 'normal',
      prompt: '她为《吉伊卡哇》配的角色是？',
      options: ['灰色的朋友、岛民', '狗主人', '灰色的孩子', '格蕾丝·马蒂拉斯'],
      answer: 2,
      explain: '《吉伊卡哇》里她配的是灰色的孩子。',
    },
    {
      id: 'w4',
      level: 'normal',
      prompt: '她在《电影 LoveLive!虹咲学园学园偶像同好会 完结篇 第1章》里饰演的角色是？',
      options: ['灰色的朋友、岛民', '藤原', '吉尔·萨维尔', '米娅·泰勒'],
      answer: 3,
      explain: '《电影 LoveLive!虹咲学园学园偶像同好会 完结篇 第1章》里她配的是米娅·泰勒。',
    },
    {
      id: 'w5',
      level: 'normal',
      prompt: '《LoveLive!学园偶像祭ALL STARS》中，她配音的角色是？',
      options: ['新入生', '操作员C', '米娅·泰勒', '莫小方'],
      answer: 2,
      explain: '《LoveLive!学园偶像祭ALL STARS》里她配的是米娅·泰勒。',
    },
    {
      id: 'w6',
      level: 'normal',
      prompt: '以下哪个角色是她饰演过的？',
      options: ['篠之木圆', '俄罗斯兵飞行员', '黑井津灯香', '偶像'],
      answer: 1,
      explain: '俄罗斯兵飞行员是她配过的角色，其余三个是其他声优的角色。',
    },
    {
      id: 'w7',
      level: 'normal',
      prompt: '下列角色中，哪一个由她配音？',
      options: ['新入生', '夏芽', '姜柔见', '铃原·胡桃'],
      answer: 0,
      explain: '新入生是她配过的角色，其余三个是其他声优的角色。',
    },
    {
      id: 'w8',
      level: 'normal',
      prompt: '她配过下面哪个角色？',
      options: ['黛奥娜', '狗主人', '蕾切尔', '汪汪预备队 点点'],
      answer: 1,
      explain: '狗主人是她配过的角色，其余三个是其他声优的角色。',
    },
    {
      id: 'w9',
      level: 'hard',
      prompt: '以下哪部作品她没有出演？',
      options: ['恋语 曾几何时的记忆', '电影 蜡笔小新 新婚旅行飓风～丢失的广志～', '魔法少女特殊战明日香', 'YAKITORI 行星轨道敢死队'],
      answer: 3,
      explain: '《YAKITORI 行星轨道敢死队》与她无关；另外三部她都出演过。',
    },
    {
      id: 'w10',
      level: 'hard',
      prompt: '下面哪部作品与她无关？',
      options: ['LoveLive!虹咲学园学园偶像同好会 心动闪耀的未来蓝图', 'ラグナドール 妖しき皇帝と終焉の夜叉姫', '舰队Collection 总有一天在那片海', '明日方舟：终末地'],
      answer: 1,
      explain: '《ラグナドール 妖しき皇帝と終焉の夜叉姫》与她无关；另外三部她都出演过。',
    },
    {
      id: 'w11',
      level: 'easy',
      prompt: '她出演过下面哪部作品？',
      options: ['哦我的天啊！神的礼物', 'MF GHOST', '绝地求生:移动版', '1999！神秘学对策部'],
      answer: 3,
      explain: '她出演过《1999！神秘学对策部》；其余三部与她无关。',
    },
    {
      id: 'w12',
      level: 'easy',
      prompt: '以下哪部作品有她的配音？',
      options: ['符文工厂5', '圣女因太过完美不够可爱而被废除婚约并卖到邻国', '麻雀 斗牌竞技场', '怪兽大涩滞KURODA'],
      answer: 1,
      explain: '她出演过《圣女因太过完美不够可爱而被废除婚约并卖到邻国》；其余三部与她无关。',
    },
];

export default { id: 'uchida-shuu', questions: worksQuestions };
