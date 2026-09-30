import type { SeiyuuQuizQuestion } from '../../types';

/**
 * 【自动生成，不用手改】青山なぎさ 的「出演作品」派生题。
 *
 * 由 `tmp/gen-works-questions.mjs` 从萌娘百科「出演作品」小节生成，
 * 重新跑一遍会覆盖本文件；想手改请改手写题库（`../aoyama-nagisa.ts`）。
 * 来源：https://zh.moegirl.org.cn/%E9%9D%92%E5%B1%B1%E3%81%AA%E3%81%8E%E3%81%95
 */
export const worksQuestions: SeiyuuQuizQuestion[] = [
    {
      id: 'w1',
      level: 'normal',
      prompt: '她在《如果猫从世界上消失》里饰演的角色是？',
      options: ['野岛圣', '夏姬（次女）', 'ハルカ', '女朋友、猫'],
      answer: 3,
      explain: '《如果猫从世界上消失》里她配的是女朋友、猫。',
    },
    {
      id: 'w2',
      level: 'normal',
      prompt: '《黑猫与魔女的教室》中，她配音的角色是？',
      options: ['夏姬（次女）', '女仆B', '天辉ミーミ', '木崎初代、樋口秀代、小林芳雄'],
      answer: 1,
      explain: '《黑猫与魔女的教室》里她配的是女仆B。',
    },
    {
      id: 'w3',
      level: 'normal',
      prompt: '她为《LoveLive!学园偶像祭2 MIRACLE LIVE!》配的角色是？',
      options: ['女仆B', '叶月恋', '野岛圣', '夏姬（次女）'],
      answer: 1,
      explain: '《LoveLive!学园偶像祭2 MIRACLE LIVE!》里她配的是叶月恋。',
    },
    {
      id: 'w4',
      level: 'normal',
      prompt: '她在《MoonHack》里饰演的角色是？',
      options: ['夏姬（次女）', '野岛圣', 'ハルカ', '天辉ミーミ'],
      answer: 3,
      explain: '《MoonHack》里她配的是天辉ミーミ。',
    },
    {
      id: 'w5',
      level: 'normal',
      prompt: '《灰烬战线》中，她配音的角色是？',
      options: ['ハルカ', '女仆B', '天辉ミーミ', 'He219、XB-42'],
      answer: 3,
      explain: '《灰烬战线》里她配的是He219、XB-42。',
    },
    {
      id: 'w6',
      level: 'normal',
      prompt: '以下哪个角色是她饰演过的？',
      options: ['草莓麻薯饼干', '木崎初代、樋口秀代、小林芳雄', '蒂安娜', '月坂纱由'],
      answer: 1,
      explain: '木崎初代、樋口秀代、小林芳雄是她配过的角色，其余三个是其他声优的角色。',
    },
    {
      id: 'w7',
      level: 'normal',
      prompt: '下列角色中，哪一个由她配音？',
      options: ['ハルカ', '鉴纯夏', '爱染可洛洛', '黛雅、虹之咲黛雅'],
      answer: 0,
      explain: 'ハルカ是她配过的角色，其余三个是其他声优的角色。',
    },
    {
      id: 'w8',
      level: 'normal',
      prompt: '她配过下面哪个角色？',
      options: ['梶原未来', '叶月恋', '「香味篇」/「浅尝一口篇」', '佩珀'],
      answer: 1,
      explain: '叶月恋是她配过的角色，其余三个是其他声优的角色。',
    },
    {
      id: 'w9',
      level: 'hard',
      prompt: '以下哪部作品她没有出演？',
      options: ['偶活学园 on Parade!', '江户川乱步　名作朗读剧 『孤岛の鬼』', 'LoveLive!Superstar!! 2期', 'LoveLive!Superstar!! 3期'],
      answer: 0,
      explain: '《偶活学园 on Parade!》与她无关；另外三部她都出演过。',
    },
    {
      id: 'w10',
      level: 'hard',
      prompt: '下面哪部作品与她无关？',
      options: ['LoveLive!学园偶像祭', 'LoveLive!Superstar!!', '怪盗皇后的优雅休暇', '舞台「歌剧少女！！」'],
      answer: 2,
      explain: '《怪盗皇后的优雅休暇》与她无关；另外三部她都出演过。',
    },
    {
      id: 'w11',
      level: 'easy',
      prompt: '她出演过下面哪部作品？',
      options: ['史莱姆与地下城', '我是高宫茄乃!', 'ラストオリジン', 'Apollo Bay Presents Reading Live Sisters4 Part 2'],
      answer: 3,
      explain: '她出演过《Apollo Bay Presents Reading Live Sisters4 Part 2》；其余三部与她无关。',
    },
    {
      id: 'w12',
      level: 'easy',
      prompt: '以下哪部作品有她的配音？',
      options: ['棕色尘埃', '剧场版 怪化猫 火鼠', '小鸟之翼', '只有我不存在的城市'],
      answer: 0,
      explain: '她出演过《棕色尘埃》；其余三部与她无关。',
    },
];

export default { id: 'aoyama-nagisa', questions: worksQuestions };
