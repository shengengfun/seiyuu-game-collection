import type { SeiyuuQuizQuestion } from '../../types';

/**
 * 【自动生成，不用手改】結那 的「出演作品」派生题。
 *
 * 由 `tmp/gen-works-questions.mjs` 从萌娘百科「出演作品」小节生成，
 * 重新跑一遍会覆盖本文件；想手改请改手写题库（`../yuina.ts`）。
 * 来源：https://zh.moegirl.org.cn/%E7%B5%90%E9%82%A3
 */
export const worksQuestions: SeiyuuQuizQuestion[] = [
    {
      id: 'w1',
      level: 'normal',
      prompt: '她在《ダディフー》里饰演的角色是？',
      options: ['绿川君枝', '里纱', '泽田奈奈子', '秋本千砂'],
      answer: 0,
      explain: '《ダディフー》里她配的是绿川君枝。',
    },
    {
      id: 'w2',
      level: 'normal',
      prompt: '《舞台剧 炽焰天穹》中，她配音的角色是？',
      options: ['泽田奈奈子', '秋本千砂', '茅森月歌', '里纱'],
      answer: 2,
      explain: '《舞台剧 炽焰天穹》里她配的是茅森月歌。',
    },
    {
      id: 'w3',
      level: 'normal',
      prompt: '她为《哦我的天啊！神的礼物》配的角色是？',
      options: ['薇恩·玛格丽特', '野原亜紀', '金本響子', '贡根小姐'],
      answer: 3,
      explain: '《哦我的天啊！神的礼物》里她配的是贡根小姐。',
    },
    {
      id: 'w4',
      level: 'normal',
      prompt: '她在《流山三铳士》里饰演的角色是？',
      options: ['金本響子', '佐佐木真绪', '秋本千砂', '茅森月歌'],
      answer: 2,
      explain: '《流山三铳士》里她配的是秋本千砂。',
    },
    {
      id: 'w5',
      level: 'normal',
      prompt: '《ヴァンダフルワールド》中，她配音的角色是？',
      options: ['薇恩·玛格丽特', '良子', '里纱', '笑美'],
      answer: 3,
      explain: '《ヴァンダフルワールド》里她配的是笑美。',
    },
    {
      id: 'w6',
      level: 'normal',
      prompt: '以下哪个角色是她饰演过的？',
      options: ['刷子@自由人', '野原亜紀', 'マリー', '春待姬'],
      answer: 1,
      explain: '野原亜紀是她配过的角色，其余三个是其他声优的角色。',
    },
    {
      id: 'w7',
      level: 'normal',
      prompt: '下列角色中，哪一个由她配音？',
      options: ['贝蒂·阿弗雷德', '一反木绵', '茨木真纪', '里纱'],
      answer: 3,
      explain: '里纱是她配过的角色，其余三个是其他声优的角色。',
    },
    {
      id: 'w8',
      level: 'normal',
      prompt: '她配过下面哪个角色？',
      options: ['古手梨花', 'ウェラジーモフ', '日向今日子', '佐佐木真绪'],
      answer: 3,
      explain: '佐佐木真绪是她配过的角色，其余三个是其他声优的角色。',
    },
    {
      id: 'w9',
      level: 'hard',
      prompt: '以下哪部作品她没有出演？',
      options: ['演剧偶像', 'アイディール・セミナー/Final session', 'RELEASE THE SPYCE', 'どぎまぎメモリアル'],
      answer: 2,
      explain: '《RELEASE THE SPYCE》与她无关；另外三部她都出演过。',
    },
    {
      id: 'w10',
      level: 'hard',
      prompt: '下面哪部作品与她无关？',
      options: ['愤怒火暴猴的观察日记', 'LoveLive!Superstar!! 3期', '青春フルスロットル', '美妙☆频道 Winter Live 2022'],
      answer: 3,
      explain: '《美妙☆频道 Winter Live 2022》与她无关；另外三部她都出演过。',
    },
    {
      id: 'w11',
      level: 'easy',
      prompt: '以下哪部作品有她的配音？',
      options: ['新人炼金术师的店铺经营', 'JK☆ROCK', '水果篮子 The Final', '请吃红小豆吧！'],
      answer: 1,
      explain: '她出演过《JK☆ROCK》；其余三部与她无关。',
    },
    {
      id: 'w12',
      level: 'easy',
      prompt: '以下哪部作品有她的配音？',
      options: ['恋爱漫画家', '紫阳花传奇 苍之骑士团', '鬼灭之刃 血风剑戟大逃杀', 'Lostorage incited WIXOSS'],
      answer: 0,
      explain: '她出演过《恋爱漫画家》；其余三部与她无关。',
    },
];

export default { id: 'yuina', questions: worksQuestions };
