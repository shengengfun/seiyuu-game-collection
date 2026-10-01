import type { SeiyuuQuizQuestion } from '../../types';

/**
 * 【自动生成，不用手改】相良茉优 的「出演作品」派生题。
 *
 * 由 `tmp/gen-works-questions.mjs` 从萌娘百科「出演作品」小节生成，
 * 重新跑一遍会覆盖本文件；想手改请改手写题库（`../sagara-mayu.ts`）。
 * 来源：https://zh.moegirl.org.cn/%E7%9B%B8%E8%89%AF%E8%8C%89%E4%BC%98
 */
export const worksQuestions: SeiyuuQuizQuestion[] = [
    {
      id: 'w1',
      level: 'normal',
      prompt: '她在《青空 Under Girls!》里饰演的角色是？',
      options: ['广江千春', '桃子饼干', '芬妮·戈尔登', '相原希'],
      answer: 3,
      explain: '《青空 Under Girls!》里她配的是相原希。',
    },
    {
      id: 'w2',
      level: 'normal',
      prompt: '《偶像乐园 美妙天堂》中，她配音的角色是？',
      options: ['樱木结菜', 'トリムル', '千亚子', '席雅'],
      answer: 2,
      explain: '《偶像乐园 美妙天堂》里她配的是千亚子。',
    },
    {
      id: 'w3',
      level: 'normal',
      prompt: '她为《莉莉娅的朋友》配的角色是？',
      options: ['マユ', '卡尔梅·梅普尔', '宗近飞粹', '美容师'],
      answer: 0,
      explain: '《莉莉娅的朋友》里她配的是マユ。',
    },
    {
      id: 'w4',
      level: 'normal',
      prompt: '她在《Sakura Ignorams》里饰演的角色是？',
      options: ['桃太郎', '真奈美', '席雅', '虹村映美'],
      answer: 0,
      explain: '《Sakura Ignorams》里她配的是桃太郎。',
    },
    {
      id: 'w5',
      level: 'normal',
      prompt: '《RELEASE THE SPYCE secret fragrance》中，她配音的角色是？',
      options: ['宗近飞粹', '公由一穗', 'トリムル', 'せっちゃん'],
      answer: 0,
      explain: '《RELEASE THE SPYCE secret fragrance》里她配的是宗近飞粹。',
    },
    {
      id: 'w6',
      level: 'normal',
      prompt: '以下哪个角色是她饰演过的？',
      options: ['三重野理緒', '鈴音ちえ', '波莉', '语り手12'],
      answer: 0,
      explain: '三重野理緒是她配过的角色，其余三个是其他声优的角色。',
    },
    {
      id: 'w7',
      level: 'normal',
      prompt: '下列角色中，哪一个由她配音？',
      options: ['井上晓海', '欧根、达姆丁、洛西', '本庄亚琉', '粉丝'],
      answer: 3,
      explain: '粉丝是她配过的角色，其余三个是其他声优的角色。',
    },
    {
      id: 'w8',
      level: 'normal',
      prompt: '她配过下面哪个角色？',
      options: ['ギンガちゃん / ギンガイザー', '槙若菜', 'シキ', '梶原未来'],
      answer: 3,
      explain: '梶原未来是她配过的角色，其余三个是其他声优的角色。',
    },
    {
      id: 'w9',
      level: 'hard',
      prompt: '以下哪部作品她没有出演？',
      options: ['『你们先走我断后』，于是10年后我成为了传说', 'LIVE动画『Rhapsody』', '正相反的你与我 第2期', '幸福的餐桌-我喜欢食欲旺盛的你-'],
      answer: 2,
      explain: '《正相反的你与我 第2期》与她无关；另外三部她都出演过。',
    },
    {
      id: 'w10',
      level: 'hard',
      prompt: '下面哪部作品与她无关？',
      options: ['LoveLive!学园偶像祭', '极主夫道', '温泉娘', '尘白禁区'],
      answer: 1,
      explain: '《极主夫道》与她无关；另外三部她都出演过。',
    },
    {
      id: 'w11',
      level: 'easy',
      prompt: '以下哪部作品有她的配音？',
      options: ['白夜极光', '更衣人偶坠入爱河', '大小姐和看门犬', '从路人开始的探索英雄谭'],
      answer: 3,
      explain: '她出演过《从路人开始的探索英雄谭》；其余三部与她无关。',
    },
    {
      id: 'w12',
      level: 'easy',
      prompt: '她出演过下面哪部作品？',
      options: ['にじいろLive', '秋叶原冥途战争', '永远的黄昏', '舰队Collection 总有一天在那片海'],
      answer: 1,
      explain: '她出演过《秋叶原冥途战争》；其余三部与她无关。',
    },
];

export default { id: 'sagara-mayu', questions: worksQuestions };
