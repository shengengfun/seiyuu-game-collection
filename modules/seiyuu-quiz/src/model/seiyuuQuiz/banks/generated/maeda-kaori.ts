import type { SeiyuuQuizQuestion } from '../../types';

/**
 * 【自动生成，不用手改】前田佳织里 的「出演作品」派生题。
 *
 * 由 `tmp/gen-works-questions.mjs` 从萌娘百科「出演作品」小节生成，
 * 重新跑一遍会覆盖本文件；想手改请改手写题库（`../maeda-kaori.ts`）。
 * 来源：https://zh.moegirl.org.cn/%E5%89%8D%E7%94%B0%E4%BD%B3%E7%BB%87%E9%87%8C
 */
export const worksQuestions: SeiyuuQuizQuestion[] = [
    {
      id: 'w1',
      level: 'normal',
      prompt: '她在《强者的新传说》里饰演的角色是？',
      options: ['桃园桃', '小桨', '爱列欧诺拉·卡夏利', '米蕾娜'],
      answer: 3,
      explain: '《强者的新传说》里她配的是米蕾娜。',
    },
    {
      id: 'w2',
      level: 'normal',
      prompt: '《突击莉莉 终结之弹》中，她配音的角色是？',
      options: ['今叶星', '真帆', '灵砂', '诗织'],
      answer: 0,
      explain: '《突击莉莉 终结之弹》里她配的是今叶星。',
    },
    {
      id: 'w3',
      level: 'normal',
      prompt: '她为《LoveLive!虹咲学园学园偶像同好会 2期》配的角色是？',
      options: ['艾泽雷亚·维根', '樱坂雫', '灵砂', '美奈妹'],
      answer: 1,
      explain: '《LoveLive!虹咲学园学园偶像同好会 2期》里她配的是樱坂雫。',
    },
    {
      id: 'w4',
      level: 'normal',
      prompt: '她在《LoveLive!学园偶像祭ALL STARS》里饰演的角色是？',
      options: ['真帆', '樱坂雫', '千惠', '东麻衣亚'],
      answer: 1,
      explain: '《LoveLive!学园偶像祭ALL STARS》里她配的是樱坂雫。',
    },
    {
      id: 'w5',
      level: 'normal',
      prompt: '《憧憬成为魔法少女》中，她配音的角色是？',
      options: ['桃园桃', '黎恩·赛拉·班菲尔德(幼年)', '花菱春香 / 魔法品红', '武田信玄、前田庆次'],
      answer: 2,
      explain: '《憧憬成为魔法少女》里她配的是花菱春香 / 魔法品红。',
    },
    {
      id: 'w6',
      level: 'normal',
      prompt: '以下哪个角色是她饰演过的？',
      options: ['アーカーシャ', '定安', '草莓猫', '丹羽茜渚'],
      answer: 2,
      explain: '草莓猫是她配过的角色，其余三个是其他声优的角色。',
    },
    {
      id: 'w7',
      level: 'normal',
      prompt: '下列角色中，哪一个由她配音？',
      options: ['宫尾时雨', '来栖朱莉', '莎菲雅', '新居目安里'],
      answer: 2,
      explain: '莎菲雅是她配过的角色，其余三个是其他声优的角色。',
    },
    {
      id: 'w8',
      level: 'normal',
      prompt: '她配过下面哪个角色？',
      options: ['高雄树', '唐林弦叶', '塔夏', '阿美莉卡·查维兹 / 美国小姐'],
      answer: 0,
      explain: '高雄树是她配过的角色，其余三个是其他声优的角色。',
    },
    {
      id: 'w9',
      level: 'hard',
      prompt: '以下哪部作品她没有出演？',
      options: ['空と海が、ふれあう彼方', 'バドミントンガールズ', '令和妖神斑小姐', '最狂辅助职业【话术士】世界最强战团听我号令'],
      answer: 0,
      explain: '《空と海が、ふれあう彼方》与她无关；另外三部她都出演过。',
    },
    {
      id: 'w10',
      level: 'hard',
      prompt: '下面哪部作品与她无关？',
      options: ['魔法药水救救我', '我决定和班上最讨厌的女生结婚了', '魔都精兵的奴隶2', 'VIVANT 2'],
      answer: 3,
      explain: '《VIVANT 2》与她无关；另外三部她都出演过。',
    },
    {
      id: 'w11',
      level: 'easy',
      prompt: '她出演过下面哪部作品？',
      options: ['难以启"齿"之恋', '血污：夜之仪式', '你原来不是我的妹妹而是我的未婚妻啊!?', '电影 LoveLive!虹咲学园学园偶像同好会 完结篇 第3章'],
      answer: 3,
      explain: '她出演过《电影 LoveLive!虹咲学园学园偶像同好会 完结篇 第3章》；其余三部与她无关。',
    },
    {
      id: 'w12',
      level: 'easy',
      prompt: '以下哪部作品有她的配音？',
      options: ['温泉むすめ ゆのはなこれくしょん', '最终休止符～无止境的螺旋物语～', '测不准的阿波连同学', '『异世界转生したら大恐龙时代でオワタ。』'],
      answer: 0,
      explain: '她出演过《温泉むすめ ゆのはなこれくしょん》；其余三部与她无关。',
    },
];

export default { id: 'maeda-kaori', questions: worksQuestions };
