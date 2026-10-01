import type { SeiyuuQuizQuestion } from '../../types';

/**
 * 【自动生成，不用手改】鬼头明里 的「出演作品」派生题。
 *
 * 由 `tmp/gen-works-questions.mjs` 从萌娘百科「出演作品」小节生成，
 * 重新跑一遍会覆盖本文件；想手改请改手写题库（`../kito-akari.ts`）。
 * 来源：https://zh.moegirl.org.cn/%E9%AC%BC%E5%A4%B4%E6%98%8E%E9%87%8C
 */
export const worksQuestions: SeiyuuQuizQuestion[] = [
    {
      id: 'w1',
      level: 'normal',
      prompt: '她在《VBX》里饰演的角色是？',
      options: ['炽天寺神狩', '鈴音ちえ', '伊尔诺特、灶门祢豆子※联动角色', 'フェリア'],
      answer: 1,
      explain: '《VBX》里她配的是鈴音ちえ。',
    },
    {
      id: 'w2',
      level: 'normal',
      prompt: '《巴哈姆特之怒》中，她配音的角色是？',
      options: ['三矢雪', '朝比奈北斗', '名木原琴子', 'アイカ'],
      answer: 3,
      explain: '《巴哈姆特之怒》里她配的是アイカ。',
    },
    {
      id: 'w3',
      level: 'normal',
      prompt: '她为《捡走被人悔婚的千金，教会她坏坏的幸福生活》配的角色是？',
      options: ['本庄亚琉', '莉泽萝蒂·克劳福德', '宇津见绘里濑(Avenger)', '三矢雪'],
      answer: 1,
      explain: '《捡走被人悔婚的千金，教会她坏坏的幸福生活》里她配的是莉泽萝蒂·克劳福德。',
    },
    {
      id: 'w4',
      level: 'normal',
      prompt: '她在《最终休止符～无止境的螺旋物语～》里饰演的角色是？',
      options: ['奇卡萨尔', '大泽绫', '安藤希实香', '战斧、金刚、岛风'],
      answer: 0,
      explain: '《最终休止符～无止境的螺旋物语～》里她配的是奇卡萨尔。',
    },
    {
      id: 'w5',
      level: 'normal',
      prompt: '《舰队Collection》中，她配音的角色是？',
      options: ['露希尼', '岛根丸', '米娜', '芙蕾雅、安伦'],
      answer: 1,
      explain: '《舰队Collection》里她配的是岛根丸。',
    },
    {
      id: 'w6',
      level: 'normal',
      prompt: '以下哪个角色是她饰演过的？',
      options: ['技术开发局局员', '娜塔莉', '一之濑未羽', '@娘娘'],
      answer: 3,
      explain: '@娘娘是她配过的角色，其余三个是其他声优的角色。',
    },
    {
      id: 'w7',
      level: 'normal',
      prompt: '下列角色中，哪一个由她配音？',
      options: ['九皋诗乃', '十返舍梨子', '埃里克', '精灵企鹅'],
      answer: 0,
      explain: '九皋诗乃是她配过的角色，其余三个是其他声优的角色。',
    },
    {
      id: 'w8',
      level: 'normal',
      prompt: '她配过下面哪个角色？',
      options: ['女仆B', '蕾欧诺拉', '迪亚·诺特·阳子', '朝比奈北斗'],
      answer: 3,
      explain: '朝比奈北斗是她配过的角色，其余三个是其他声优的角色。',
    },
    {
      id: 'w9',
      level: 'hard',
      prompt: '以下哪部作品她没有出演？',
      options: ['UQ HOLDER! ～魔法老师! 2～', '击浪青春', '鸣潮', '我在意的人不是异性'],
      answer: 2,
      explain: '《鸣潮》与她无关；另外三部她都出演过。',
    },
    {
      id: 'w10',
      level: 'hard',
      prompt: '下面哪部作品与她无关？',
      options: ['GNOSIA', '只有我能进入的隐藏迷宫', '罗密欧与朱丽叶', '婚戒物语'],
      answer: 2,
      explain: '《罗密欧与朱丽叶》与她无关；另外三部她都出演过。',
    },
    {
      id: 'w11',
      level: 'easy',
      prompt: '她出演过下面哪部作品？',
      options: ['格林笔记', '温泉娘 汤之花Collection', '约定的梦幻岛', '梅蒂亚转生物语'],
      answer: 3,
      explain: '她出演过《梅蒂亚转生物语》；其余三部与她无关。',
    },
    {
      id: 'w12',
      level: 'easy',
      prompt: '以下哪部作品有她的配音？',
      options: ['虽然转生为寝取了工口游戏女主角的男角色，但我绝不会下手', '青春歌舞伎', '放学后海堤日记', 'あの日の旅人、ふれあう未来'],
      answer: 3,
      explain: '她出演过《あの日の旅人、ふれあう未来》；其余三部与她无关。',
    },
];

export default { id: 'kito-akari', questions: worksQuestions };
