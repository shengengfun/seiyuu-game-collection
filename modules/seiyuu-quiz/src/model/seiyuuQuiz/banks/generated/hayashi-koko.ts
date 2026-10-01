import type { SeiyuuQuizQuestion } from '../../types';

/**
 * 【自动生成，不用手改】林鼓子 的「出演作品」派生题。
 *
 * 由 `tmp/gen-works-questions.mjs` 从萌娘百科「出演作品」小节生成，
 * 重新跑一遍会覆盖本文件；想手改请改手写题库（`../hayashi-koko.ts`）。
 * 来源：https://zh.moegirl.org.cn/%E6%9E%97%E9%BC%93%E5%AD%90
 */
export const worksQuestions: SeiyuuQuizQuestion[] = [
    {
      id: 'w1',
      level: 'normal',
      prompt: '她在《突击莉莉 终结之弹》里饰演的角色是？',
      options: ['多田紫惠乐', '佐藤真美', '白泽', '索菲娜'],
      answer: 0,
      explain: '《突击莉莉 终结之弹》里她配的是多田紫惠乐。',
    },
    {
      id: 'w2',
      level: 'normal',
      prompt: '《天网炎上迦具土》中，她配音的角色是？',
      options: ['日向、弗莱彻级', '戌井京子', '江头美佳', 'ステラ'],
      answer: 1,
      explain: '《天网炎上迦具土》里她配的是戌井京子。',
    },
    {
      id: 'w3',
      level: 'normal',
      prompt: '她为《Muv-Luv Alternative》配的角色是？',
      options: ['早乙女圆', '波罗罗', '江头美佳', '（嘉宾出演）'],
      answer: 0,
      explain: '《Muv-Luv Alternative》里她配的是早乙女圆。',
    },
    {
      id: 'w4',
      level: 'normal',
      prompt: '她在《深空之眼》里饰演的角色是？',
      options: ['ヴェネト、阿賀野', 'ステラ', 'アン王女', '白泽'],
      answer: 3,
      explain: '《深空之眼》里她配的是白泽。',
    },
    {
      id: 'w5',
      level: 'normal',
      prompt: '《ボイスト10 〜Voice & Stories 予選Bブロック『Peek a Boo! vs.UNDERCΦDE』〜》中，她配音的角色是？',
      options: ['蜂堅耀子', 'アーカーシャ', 'ステラ', '远藤步'],
      answer: 0,
      explain: '《ボイスト10 〜Voice & Stories 予選Bブロック『Peek a Boo! vs.UNDERCΦDE』〜》里她配的是蜂堅耀子。',
    },
    {
      id: 'w6',
      level: 'normal',
      prompt: '以下哪个角色是她饰演过的？',
      options: ['古手梨花', '冴岛真希', 'メイリーン / レヴィナ', '速志步'],
      answer: 3,
      explain: '速志步是她配过的角色，其余三个是其他声优的角色。',
    },
    {
      id: 'w7',
      level: 'normal',
      prompt: '下列角色中，哪一个由她配音？',
      options: ['花咲兔冥', '犀牛面具人', '蚊贺桃香', '爱夏'],
      answer: 1,
      explain: '犀牛面具人是她配过的角色，其余三个是其他声优的角色。',
    },
    {
      id: 'w8',
      level: 'normal',
      prompt: '她配过下面哪个角色？',
      options: ['小叶尼塞', 'ヒイロ', 'アゾット', '辉伊芙'],
      answer: 2,
      explain: 'アゾット是她配过的角色，其余三个是其他声优的角色。',
    },
    {
      id: 'w9',
      level: 'hard',
      prompt: '以下哪部作品她没有出演？',
      options: ['舞台『星よ女王に堕つ』', 'LoveLive!虹咲学园学园偶像同好会 心动闪耀的未来蓝图', 'Wake Up,Girls! 新星的天使', 'PUI PUI 天竺鼠车车 THE MOVIE MOLMAX'],
      answer: 3,
      explain: '《PUI PUI 天竺鼠车车 THE MOVIE MOLMAX》与她无关；另外三部她都出演过。',
    },
    {
      id: 'w10',
      level: 'hard',
      prompt: '下面哪部作品与她无关？',
      options: ['BanG Dream! 少女乐团派对！', '剧场版 美妙天堂 & 美妙☆频道 ～闪耀纪念LIVE～', '天籁人偶 冬空焰火/雪花纹理', '元祖！BanG Dream Chan'],
      answer: 2,
      explain: '《天籁人偶 冬空焰火/雪花纹理》与她无关；另外三部她都出演过。',
    },
    {
      id: 'w11',
      level: 'easy',
      prompt: '她出演过下面哪部作品？',
      options: ['伊甸星原 第2期', '幻想大陆战记:露纳希亚战记', '荒野的寿飞行队', '请吃红小豆吧！'],
      answer: 1,
      explain: '她出演过《幻想大陆战记:露纳希亚战记》；其余三部与她无关。',
    },
    {
      id: 'w12',
      level: 'easy',
      prompt: '以下哪部作品有她的配音？',
      options: ['问答RPG 魔法使与黑猫维兹', 'BanG Dream! It\'s MyGO!!!!!', '兽娘动物园3', '明日方舟'],
      answer: 1,
      explain: '她出演过《BanG Dream! It\'s MyGO!!!!!》；其余三部与她无关。',
    },
];

export default { id: 'hayashi-koko', questions: worksQuestions };
