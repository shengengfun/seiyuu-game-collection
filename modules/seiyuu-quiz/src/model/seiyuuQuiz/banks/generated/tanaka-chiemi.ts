import type { SeiyuuQuizQuestion } from '../../types';

/**
 * 【自动生成，不用手改】田中千惠美 的「出演作品」派生题。
 *
 * 由 `tmp/gen-works-questions.mjs` 从萌娘百科「出演作品」小节生成，
 * 重新跑一遍会覆盖本文件；想手改请改手写题库（`../tanaka-chiemi.ts`）。
 * 来源：https://zh.moegirl.org.cn/%E7%94%B0%E4%B8%AD%E5%8D%83%E6%83%A0%E7%BE%8E
 */
export const worksQuestions: SeiyuuQuizQuestion[] = [
    {
      id: 'w1',
      level: 'normal',
      prompt: '她在《雾尾粉丝后援会》里饰演的角色是？',
      options: ['辻小芽', '毛纲乃彩', '班主任 / 辣妹', '铁贯羽影米西娅尔'],
      answer: 2,
      explain: '《雾尾粉丝后援会》里她配的是班主任 / 辣妹。',
    },
    {
      id: 'w2',
      level: 'normal',
      prompt: '《LoveLive!虹咲学园学园偶像同好会》中，她配音的角色是？',
      options: ['莎莉·布朗', '天王寺璃奈', '工作人员', '辻小芽'],
      answer: 1,
      explain: '《LoveLive!虹咲学园学园偶像同好会》里她配的是天王寺璃奈。',
    },
    {
      id: 'w3',
      level: 'normal',
      prompt: '她为《LoveLive!虹咲学园学园偶像同好会 2期》配的角色是？',
      options: ['栗野', '侍女', '米菈、穆娅', '天王寺璃奈'],
      answer: 3,
      explain: '《LoveLive!虹咲学园学园偶像同好会 2期》里她配的是天王寺璃奈。',
    },
    {
      id: 'w4',
      level: 'normal',
      prompt: '她在《逆转奥赛罗尼亚》里饰演的角色是？',
      options: ['シャーロット', '工作人员', '笑面青江', '班主任 / 辣妹'],
      answer: 0,
      explain: '《逆转奥赛罗尼亚》里她配的是シャーロット。',
    },
    {
      id: 'w5',
      level: 'normal',
      prompt: '《小鸟之翼》中，她配音的角色是？',
      options: ['米菈、穆娅', '女仆B', '向井惠子', '侍女'],
      answer: 2,
      explain: '《小鸟之翼》里她配的是向井惠子。',
    },
    {
      id: 'w6',
      level: 'normal',
      prompt: '以下哪个角色是她饰演过的？',
      options: ['普罗米娅', '卷岛', '立花', '绿川君枝'],
      answer: 2,
      explain: '立花是她配过的角色，其余三个是其他声优的角色。',
    },
    {
      id: 'w7',
      level: 'normal',
      prompt: '下列角色中，哪一个由她配音？',
      options: ['福姬', '尤莉乌丝', '天王寺璃奈', '蕾拉'],
      answer: 2,
      explain: '天王寺璃奈是她配过的角色，其余三个是其他声优的角色。',
    },
    {
      id: 'w8',
      level: 'normal',
      prompt: '她配过下面哪个角色？',
      options: ['涩谷香音', 'ハルジオン', '侍女', '座敷红子'],
      answer: 2,
      explain: '侍女是她配过的角色，其余三个是其他声优的角色。',
    },
    {
      id: 'w9',
      level: 'hard',
      prompt: '以下哪部作品她没有出演？',
      options: ['LoveLive!虹咲学园学园偶像同好会 NEXT SKY', 'アクション対魔忍', '夜樱家的大作战', '电影 LoveLive!虹咲学园学园偶像同好会 完结篇 第1章'],
      answer: 2,
      explain: '《夜樱家的大作战》与她无关；另外三部她都出演过。',
    },
    {
      id: 'w10',
      level: 'hard',
      prompt: '下面哪部作品与她无关？',
      options: ['Zero Project プロデュース 2018 ミュージカル 新☆雪のプリンセス', '4个人各自有着自己的秘密', '最强的职业不是勇者也不是贤者好像是鉴定士(伪)的样子?', 'Love Island'],
      answer: 0,
      explain: '《Zero Project プロデュース 2018 ミュージカル 新☆雪のプリンセス》与她无关；另外三部她都出演过。',
    },
    {
      id: 'w11',
      level: 'easy',
      prompt: '她出演过下面哪部作品？',
      options: ['灰色：集结的百果', '永远的7日之都', '异世界玩家 ～用HP1进行最强最快的迷宫攻略～', 'PROGRESS ORDERS'],
      answer: 1,
      explain: '她出演过《永远的7日之都》；其余三部与她无关。',
    },
    {
      id: 'w12',
      level: 'easy',
      prompt: '以下哪部作品有她的配音？',
      options: ['DistortedCode -生者の残り香-', '魔法少女奈叶 EXCEEDS Gun Blaze Vengeance', '女神的咖啡厅', '电影 LoveLive!虹咲学园学园偶像同好会 完结篇 第2章'],
      answer: 3,
      explain: '她出演过《电影 LoveLive!虹咲学园学园偶像同好会 完结篇 第2章》；其余三部与她无关。',
    },
];

export default { id: 'tanaka-chiemi', questions: worksQuestions };
