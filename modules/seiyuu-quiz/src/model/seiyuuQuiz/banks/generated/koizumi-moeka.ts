import type { SeiyuuQuizQuestion } from '../../types';

/**
 * 【自动生成，不用手改】小泉萌香 的「出演作品」派生题。
 *
 * 由 `tmp/gen-works-questions.mjs` 从萌娘百科「出演作品」小节生成，
 * 重新跑一遍会覆盖本文件；想手改请改手写题库（`../koizumi-moeka.ts`）。
 * 来源：https://zh.moegirl.org.cn/%E5%B0%8F%E6%B3%89%E8%90%8C%E9%A6%99
 */
export const worksQuestions: SeiyuuQuizQuestion[] = [
    {
      id: 'w1',
      level: 'normal',
      prompt: '她在《ドラマデザイン社 舞台「ゲートシティの恋」》里饰演的角色是？',
      options: ['三船栞子', '小泉萌香', '成宮輝人（Aキャスト）', '笹子·珍妮弗·由香'],
      answer: 2,
      explain: '《ドラマデザイン社 舞台「ゲートシティの恋」》里她配的是成宮輝人（Aキャスト）。',
    },
    {
      id: 'w2',
      level: 'normal',
      prompt: '《终将成为最强炼金术师？》中，她配音的角色是？',
      options: ['成宮輝人（Aキャスト）', '玛尼', '二十一号', 'ミサ'],
      answer: 1,
      explain: '《终将成为最强炼金术师？》里她配的是玛尼。',
    },
    {
      id: 'w3',
      level: 'normal',
      prompt: '她为《舞台剧『派对浪客诸葛孔明』》配的角色是？',
      options: ['成宮輝人（Aキャスト）', '久远七海', 'ミサ', 'デルサヒドネ'],
      answer: 1,
      explain: '《舞台剧『派对浪客诸葛孔明』》里她配的是久远七海。',
    },
    {
      id: 'w4',
      level: 'normal',
      prompt: '她在《魔术师库诺看得见一切》里饰演的角色是？',
      options: ['久远七海', 'ポロン(ヒロイン)', '蓮台寺ミオ[DENCO(H)]', '吉尔尼'],
      answer: 3,
      explain: '《魔术师库诺看得见一切》里她配的是吉尔尼。',
    },
    {
      id: 'w5',
      level: 'normal',
      prompt: '《D4DJ First Mix》中，她配音的角色是？',
      options: ['二十一号', 'デルサヒドネ', '三船栞子', '笹子·珍妮弗·由香'],
      answer: 3,
      explain: '《D4DJ First Mix》里她配的是笹子·珍妮弗·由香。',
    },
    {
      id: 'w6',
      level: 'normal',
      prompt: '以下哪个角色是她饰演过的？',
      options: ['小泉萌香', '树才怪', '若叶睦', '光精灵'],
      answer: 0,
      explain: '小泉萌香是她配过的角色，其余三个是其他声优的角色。',
    },
    {
      id: 'w7',
      level: 'normal',
      prompt: '下列角色中，哪一个由她配音？',
      options: ['袋獾(×加帕里团)', '格拉菲娅', 'カーリス', '古手梨花'],
      answer: 0,
      explain: '袋獾(×加帕里团)是她配过的角色，其余三个是其他声优的角色。',
    },
    {
      id: 'w8',
      level: 'normal',
      prompt: '她配过下面哪个角色？',
      options: ['ダスティル', '有原ゆい', '尤弥尔', '贝尔加·克里艾丝'],
      answer: 3,
      explain: '贝尔加·克里艾丝是她配过的角色，其余三个是其他声优的角色。',
    },
    {
      id: 'w9',
      level: 'hard',
      prompt: '以下哪部作品她没有出演？',
      options: ['少女☆歌剧 Revue Starlight -The LIVE-#1 revival', 'LoveLive!学园偶像祭', '少女☆歌剧 Revue Starlight Rondo Rondo Rondo', '影宅 2nd Season'],
      answer: 3,
      explain: '《影宅 2nd Season》与她无关；另外三部她都出演过。',
    },
    {
      id: 'w10',
      level: 'hard',
      prompt: '下面哪部作品与她无关？',
      options: ['电影 LoveLive!虹咲学园学园偶像同好会 完结篇 第1章', '少女☆歌剧 Revue Starlight -Re LIVE-', '白きは沈默の街で', '时光代理人-法则游戏'],
      answer: 2,
      explain: '《白きは沈默の街で》与她无关；另外三部她都出演过。',
    },
    {
      id: 'w11',
      level: 'easy',
      prompt: '她出演过下面哪部作品？',
      options: ['胜利女神：妮姬', '英雄王、武を极めるため转生す～ブレイブリーロード～', '尼尔：自动人形 Ver1.1a', 'ROAD59 -新时代任侠特区- 摩天楼黑白抗争'],
      answer: 2,
      explain: '她出演过《尼尔：自动人形 Ver1.1a》；其余三部与她无关。',
    },
    {
      id: 'w12',
      level: 'easy',
      prompt: '以下哪部作品有她的配音？',
      options: ['少女☆歌剧 Revue Starlight', '小小世界', 'ジキルVSハイド', '地下城与勇士之破界少女'],
      answer: 0,
      explain: '她出演过《少女☆歌剧 Revue Starlight》；其余三部与她无关。',
    },
];

export default { id: 'koizumi-moeka', questions: worksQuestions };
