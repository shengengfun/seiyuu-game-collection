import type { SeiyuuQuizQuestion } from '../../types';

/**
 * 【自动生成，不用手改】指出毬亚 的「出演作品」派生题。
 *
 * 由 `tmp/gen-works-questions.mjs` 从萌娘百科「出演作品」小节生成，
 * 重新跑一遍会覆盖本文件；想手改请改手写题库（`../sashide-maria.ts`）。
 * 来源：https://zh.moegirl.org.cn/%E6%8C%87%E5%87%BA%E6%AF%AC%E4%BA%9A
 */
export const worksQuestions: SeiyuuQuizQuestion[] = [
    {
      id: 'w1',
      level: 'normal',
      prompt: '她在《孤单一人的异世界攻略》里饰演的角色是？',
      options: ['鹤濑茉莉、猪濑舞', '裸奔女', 'リーザ', '森阳万里'],
      answer: 1,
      explain: '《孤单一人的异世界攻略》里她配的是裸奔女。',
    },
    {
      id: 'w2',
      level: 'normal',
      prompt: '《LoveLive!学园偶像祭》中，她配音的角色是？',
      options: ['艾玛·维尔德', '草莓麻薯饼干', '克劳恩皮丝', '菲莉娅'],
      answer: 0,
      explain: '《LoveLive!学园偶像祭》里她配的是艾玛·维尔德。',
    },
    {
      id: 'w3',
      level: 'normal',
      prompt: '她为《星之终途》配的角色是？',
      options: ['菲莉娅', 'リーザ', 'マーシャ', '吉崎花乃'],
      answer: 0,
      explain: '《星之终途》里她配的是菲莉娅。',
    },
    {
      id: 'w4',
      level: 'normal',
      prompt: '她在《タワーオブスカイ》里饰演的角色是？',
      options: ['冰室拉比', 'フラクシヌス＝ルクス', 'ナモ', 'メモライア'],
      answer: 2,
      explain: '《タワーオブスカイ》里她配的是ナモ。',
    },
    {
      id: 'w5',
      level: 'normal',
      prompt: '《摇曳露营△ SEASON3》中，她配音的角色是？',
      options: ['璐璐卡', '瑞浪绘真', '白咲花', 'フレデリカ'],
      answer: 1,
      explain: '《摇曳露营△ SEASON3》里她配的是瑞浪绘真。',
    },
    {
      id: 'w6',
      level: 'normal',
      prompt: '以下哪个角色是她饰演过的？',
      options: ['大叶妃子', '吉妮·芬·德·萨尔凡', '埃尔卡·维尔索', '八丈、石垣'],
      answer: 0,
      explain: '大叶妃子是她配过的角色，其余三个是其他声优的角色。',
    },
    {
      id: 'w7',
      level: 'normal',
      prompt: '下列角色中，哪一个由她配音？',
      options: ['莎菲雅', '御灵', '樱田花火', 'ツクヨミ'],
      answer: 3,
      explain: 'ツクヨミ是她配过的角色，其余三个是其他声优的角色。',
    },
    {
      id: 'w8',
      level: 'normal',
      prompt: '她配过下面哪个角色？',
      options: ['矢岛加奈', 'エルフィ・クロイツ', '修女莉莉', '游奈'],
      answer: 3,
      explain: '游奈是她配过的角色，其余三个是其他声优的角色。',
    },
    {
      id: 'w9',
      level: 'hard',
      prompt: '以下哪部作品她没有出演？',
      options: ['突击莉莉 终结之弹', '青春特调蜂蜜柠檬苏打', 'Chaos Dragon 混沌战争', '擅长捉弄人的高木同学2'],
      answer: 3,
      explain: '《擅长捉弄人的高木同学2》与她无关；另外三部她都出演过。',
    },
    {
      id: 'w10',
      level: 'hard',
      prompt: '下面哪部作品与她无关？',
      options: ['SHOW BY ROCK!! Fes A Live', 'ブレイブソード×ブレイズソウル', '锁链战记～绊之新大陆～', '夜樱家的大作战 第2期'],
      answer: 3,
      explain: '《夜樱家的大作战 第2期》与她无关；另外三部她都出演过。',
    },
    {
      id: 'w11',
      level: 'easy',
      prompt: '她出演过下面哪部作品？',
      options: ['天使降临到了我身边！', 'ひみつ×戦士 ファントミラージュ!', '罗密欧与朱丽叶', '鬼灭之刃'],
      answer: 0,
      explain: '她出演过《天使降临到了我身边！》；其余三部与她无关。',
    },
    {
      id: 'w12',
      level: 'easy',
      prompt: '以下哪部作品有她的配音？',
      options: ['虹四', 'Love Island', 'アイディール・セミナー/Final session', '魔法少女毁灭者'],
      answer: 0,
      explain: '她出演过《虹四》；其余三部与她无关。',
    },
];

export default { id: 'sashide-maria', questions: worksQuestions };
