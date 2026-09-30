import type { SeiyuuQuizQuestion } from '../../types';

/**
 * 【自动生成，不用手改】村上奈津实 的「出演作品」派生题。
 *
 * 由 `tmp/gen-works-questions.mjs` 从萌娘百科「出演作品」小节生成，
 * 重新跑一遍会覆盖本文件；想手改请改手写题库（`../murakami-natsumi.ts`）。
 * 来源：https://zh.moegirl.org.cn/%E6%9D%91%E4%B8%8A%E5%A5%88%E6%B4%A5%E5%AE%9E
 */
export const worksQuestions: SeiyuuQuizQuestion[] = [
    {
      id: 'w1',
      level: 'normal',
      prompt: '她在《Dreamin\' Her -我梦见了她。-》里饰演的角色是？',
      options: ['七濑未来、架子', '家入绢', '诺波', '早乙女亚子'],
      answer: 0,
      explain: '《Dreamin\' Her -我梦见了她。-》里她配的是七濑未来、架子。',
    },
    {
      id: 'w2',
      level: 'normal',
      prompt: '《甜梦猫》中，她配音的角色是？',
      options: ['爱丽丝(第1任)', '斯特拉斯堡、拉菲、アンノウンΛ', 'アマツマ', '日向梦'],
      answer: 3,
      explain: '《甜梦猫》里她配的是日向梦。',
    },
    {
      id: 'w3',
      level: 'normal',
      prompt: '她为《勇者斗恶龙X》配的角色是？',
      options: ['艾米莉·马蒂拉斯', '波子〈平波子〉', '忒修斯', '亚里亚'],
      answer: 3,
      explain: '《勇者斗恶龙X》里她配的是亚里亚。',
    },
    {
      id: 'w4',
      level: 'normal',
      prompt: '她在《偶像活动Stars! MY Special Appeal》里饰演的角色是？',
      options: ['自动扫地姬 玛奇', '早乙女亚子', '新籾千种', 'ジューダス'],
      answer: 1,
      explain: '《偶像活动Stars! MY Special Appeal》里她配的是早乙女亚子。',
    },
    {
      id: 'w5',
      level: 'normal',
      prompt: '《圣女因太过完美不够可爱而被废除婚约并卖到邻国》中，她配音的角色是？',
      options: ['星川织姬', '海克斯', '艾米莉·马蒂拉斯', '亚莉丝缇雅'],
      answer: 2,
      explain: '《圣女因太过完美不够可爱而被废除婚约并卖到邻国》里她配的是艾米莉·马蒂拉斯。',
    },
    {
      id: 'w6',
      level: 'normal',
      prompt: '以下哪个角色是她饰演过的？',
      options: ['ゲイボルグ', '海克斯', '明乌诱子', '一条光凛'],
      answer: 1,
      explain: '海克斯是她配过的角色，其余三个是其他声优的角色。',
    },
    {
      id: 'w7',
      level: 'normal',
      prompt: '下列角色中，哪一个由她配音？',
      options: ['克萝赛·琳兹', 'グロリア', '早乙女亚子', '蕾切尔'],
      answer: 2,
      explain: '早乙女亚子是她配过的角色，其余三个是其他声优的角色。',
    },
    {
      id: 'w8',
      level: 'normal',
      prompt: '她配过下面哪个角色？',
      options: ['乌特迦', '莉夏', '斯特拉斯堡、拉菲、アンノウンΛ', '姬川缘'],
      answer: 2,
      explain: '斯特拉斯堡、拉菲、アンノウンΛ是她配过的角色，其余三个是其他声优的角色。',
    },
    {
      id: 'w9',
      level: 'hard',
      prompt: '以下哪部作品她没有出演？',
      options: ['虹四动画 第13~15话', 'AI：梦境档案 涅槃肇始', '虹四动画', '电影 LoveLive!虹咲学园学园偶像同好会 完结篇 第1章'],
      answer: 1,
      explain: '《AI：梦境档案 涅槃肇始》与她无关；另外三部她都出演过。',
    },
    {
      id: 'w10',
      level: 'hard',
      prompt: '下面哪部作品与她无关？',
      options: ['ビタ一プレイメイト2', '战斗员派遣中！', '名侦探光之美少女！', 'LoveLive!虹咲学园学园偶像同好会 2期'],
      answer: 0,
      explain: '《ビタ一プレイメイト2》与她无关；另外三部她都出演过。',
    },
    {
      id: 'w11',
      level: 'easy',
      prompt: '她出演过下面哪部作品？',
      options: ['鲲吞天下之掌门归来', '狼少女与黑王子', '夜樱家的大作战 第2期', '最强肉盾的迷宫攻略 ～拥有稀少技能体力9999的肉盾，被勇者队伍辞退了～'],
      answer: 0,
      explain: '她出演过《鲲吞天下之掌门归来》；其余三部与她无关。',
    },
    {
      id: 'w12',
      level: 'easy',
      prompt: '以下哪部作品有她的配音？',
      options: ['刺客信条：幻景', '这个世界的死亡flag太多了！', '绝车科！‐私立四轮女子学院绝灭危惧车学科‐', '当哒当 第2期'],
      answer: 2,
      explain: '她出演过《绝车科！‐私立四轮女子学院绝灭危惧车学科‐》；其余三部与她无关。',
    },
];

export default { id: 'murakami-natsumi', questions: worksQuestions };
