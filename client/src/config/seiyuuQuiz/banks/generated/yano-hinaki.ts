import type { SeiyuuQuizQuestion } from '../../types';

/**
 * 【自动生成，不用手改】矢野妃菜喜 的「出演作品」派生题。
 *
 * 由 `tmp/gen-works-questions.mjs` 从萌娘百科「出演作品」小节生成，
 * 重新跑一遍会覆盖本文件；想手改请改手写题库（`../yano-hinaki.ts`）。
 * 来源：https://zh.moegirl.org.cn/%E7%9F%A2%E9%87%8E%E5%A6%83%E8%8F%9C%E5%96%9C
 */
export const worksQuestions: SeiyuuQuizQuestion[] = [
    {
      id: 'w1',
      level: 'normal',
      prompt: '她在《吉田勝子のヤバイわSDGs》里饰演的角色是？',
      options: ['ピアレット', '姬冢万里', '樱森朱音', '一之谷美雨'],
      answer: 3,
      explain: '《吉田勝子のヤバイわSDGs》里她配的是一之谷美雨。',
    },
    {
      id: 'w2',
      level: 'normal',
      prompt: '《乡下大叔成为剑圣》中，她配音的角色是？',
      options: ['樱森朱音', 'ティートリー', '菲塞尔·哈贝拉', '凪、女粉丝'],
      answer: 2,
      explain: '《乡下大叔成为剑圣》里她配的是菲塞尔·哈贝拉。',
    },
    {
      id: 'w3',
      level: 'normal',
      prompt: '她为《华鬼×神无编》配的角色是？',
      options: ['朝雾神无（幼少期）', 'えまり / フレアミス', '鸿上丽', 'ギンガちゃん / ギンガイザー'],
      answer: 0,
      explain: '《华鬼×神无编》里她配的是朝雾神无（幼少期）。',
    },
    {
      id: 'w4',
      level: 'normal',
      prompt: '她在《哥特式魔法少女》里饰演的角色是？',
      options: ['「香味篇」/「浅尝一口篇」', '安徒生', 'ティートリー', '渡铃白、佐清、优子、亚纪的孩子'],
      answer: 2,
      explain: '《哥特式魔法少女》里她配的是ティートリー。',
    },
    {
      id: 'w5',
      level: 'normal',
      prompt: '《游戏「赛马娘 Pretty Derby」1周年特别动画》中，她配音的角色是？',
      options: ['北部玄驹', '椎名佳奈', '（主演）', '佩特拉'],
      answer: 0,
      explain: '《游戏「赛马娘 Pretty Derby」1周年特别动画》里她配的是北部玄驹。',
    },
    {
      id: 'w6',
      level: 'normal',
      prompt: '以下哪个角色是她饰演过的？',
      options: ['泽木桃惠', '别所爱染', '姬川响', '米莎'],
      answer: 0,
      explain: '泽木桃惠是她配过的角色，其余三个是其他声优的角色。',
    },
    {
      id: 'w7',
      level: 'normal',
      prompt: '下列角色中，哪一个由她配音？',
      options: ['ウェラジーモフ', '夏洛特', '菲塞尔·哈贝拉', '新多亚由'],
      answer: 2,
      explain: '菲塞尔·哈贝拉是她配过的角色，其余三个是其他声优的角色。',
    },
    {
      id: 'w8',
      level: 'normal',
      prompt: '她配过下面哪个角色？',
      options: ['柏崎侑里', '妖精', '连河洁莉诺(第2任)', '清鹤加奈'],
      answer: 2,
      explain: '连河洁莉诺(第2任)是她配过的角色，其余三个是其他声优的角色。',
    },
    {
      id: 'w9',
      level: 'hard',
      prompt: '以下哪部作品她没有出演？',
      options: ['S级怪兽《贝希摩斯', '这个世界漏洞百出', '双生视界', '杀戮幻影'],
      answer: 2,
      explain: '《双生视界》与她无关；另外三部她都出演过。',
    },
    {
      id: 'w10',
      level: 'hard',
      prompt: '下面哪部作品与她无关？',
      options: ['渡君的xx即将崩坏', '兽娘动物园2', 'Alice Fiction漂眇群像', 'LoveLive!学园偶像祭2 MIRACLE LIVE!'],
      answer: 1,
      explain: '《兽娘动物园2》与她无关；另外三部她都出演过。',
    },
    {
      id: 'w11',
      level: 'easy',
      prompt: '她出演过下面哪部作品？',
      options: ['我的可爱对黑岩目高不管用', '星色物语：学生终端', '家有女友', '千绪的通学路'],
      answer: 0,
      explain: '她出演过《我的可爱对黑岩目高不管用》；其余三部与她无关。',
    },
    {
      id: 'w12',
      level: 'easy',
      prompt: '以下哪部作品有她的配音？',
      options: ['食锈末世录', '家庭教师寅子', '幻想牢狱的万华镜2', '致不灭的你 Season3'],
      answer: 2,
      explain: '她出演过《幻想牢狱的万华镜2》；其余三部与她无关。',
    },
];

export default { id: 'yano-hinaki', questions: worksQuestions };
