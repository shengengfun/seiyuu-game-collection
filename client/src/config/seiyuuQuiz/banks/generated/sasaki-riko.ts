import type { SeiyuuQuizQuestion } from '../../types';

/**
 * 【自动生成，不用手改】佐佐木李子 的「出演作品」派生题。
 *
 * 由 `tmp/gen-works-questions.mjs` 从萌娘百科「出演作品」小节生成，
 * 重新跑一遍会覆盖本文件；想手改请改手写题库（`../sasaki-riko.ts`）。
 * 来源：https://zh.moegirl.org.cn/%E4%BD%90%E4%BD%90%E6%9C%A8%E6%9D%8E%E5%AD%90
 */
export const worksQuestions: SeiyuuQuizQuestion[] = [
    {
      id: 'w1',
      level: 'normal',
      prompt: '她在《纺之逻辑》里饰演的角色是？',
      options: ['蕾拉、勒克席亚', '埃缪', '波波隆', '夜崎美丽'],
      answer: 3,
      explain: '《纺之逻辑》里她配的是夜崎美丽。',
    },
    {
      id: 'w2',
      level: 'normal',
      prompt: '《海天使的灯火》中，她配音的角色是？',
      options: ['我的勇者', '雪音七海', '安·Lucky', '安娜'],
      answer: 1,
      explain: '《海天使的灯火》里她配的是雪音七海。',
    },
    {
      id: 'w3',
      level: 'normal',
      prompt: '她为《爱米 -WE LOVE RICE-》配的角色是？',
      options: ['响子', '波波隆、魔兽10', '一色绫世', '咕噜江'],
      answer: 3,
      explain: '《爱米 -WE LOVE RICE-》里她配的是咕噜江。',
    },
    {
      id: 'w4',
      level: 'normal',
      prompt: '她在《隔夜茶》里饰演的角色是？',
      options: ['椎名琉羽', '见守·麝香葡萄茶', '少年3', '雪音七海'],
      answer: 1,
      explain: '《隔夜茶》里她配的是见守·麝香葡萄茶。',
    },
    {
      id: 'w5',
      level: 'normal',
      prompt: '《邪神与厨二病少女\'》中，她配音的角色是？',
      options: ['安·Lucky', '三角初华 / Doloris', '波波隆、魔兽10', '莫夫莫夫'],
      answer: 2,
      explain: '《邪神与厨二病少女\'》里她配的是波波隆、魔兽10。',
    },
    {
      id: 'w6',
      level: 'normal',
      prompt: '以下哪个角色是她饰演过的？',
      options: ['汐留·V·渚', '迪欧娜·鲁多路冯', '三角初华', '黑翼(宫尾时雨)'],
      answer: 2,
      explain: '三角初华是她配过的角色，其余三个是其他声优的角色。',
    },
    {
      id: 'w7',
      level: 'normal',
      prompt: '下列角色中，哪一个由她配音？',
      options: ['贡根小姐', '操作员', '篠原明里', '镇民'],
      answer: 3,
      explain: '镇民是她配过的角色，其余三个是其他声优的角色。',
    },
    {
      id: 'w8',
      level: 'normal',
      prompt: '她配过下面哪个角色？',
      options: ['Mon', '美智留', 'お嬢', 'BV P.194'],
      answer: 1,
      explain: '美智留是她配过的角色，其余三个是其他声优的角色。',
    },
    {
      id: 'w9',
      level: 'hard',
      prompt: '以下哪部作品她没有出演？',
      options: ['影宅', '卡片战斗先导者G Stride Gate篇', '京都幻都 樱花幻舞', '邪神与厨二病少女 世纪末篇'],
      answer: 0,
      explain: '《影宅》与她无关；另外三部她都出演过。',
    },
    {
      id: 'w10',
      level: 'hard',
      prompt: '下面哪部作品与她无关？',
      options: ['Death end re;Quest 2', '塔亰Clanpool', 'NIGHT HEAD 2041', '红色的炼金术士和白色的守护者 ～蕾斯莱莉娅娜的炼金工房～'],
      answer: 2,
      explain: '《NIGHT HEAD 2041》与她无关；另外三部她都出演过。',
    },
    {
      id: 'w11',
      level: 'easy',
      prompt: '她出演过下面哪部作品？',
      options: ['邪神与厨二病少女\' 千岁篇', '崩坏：星穹铁道', 'Apollo Bay Presents Reading Live Sisters4 Part 2', '伊甸星原'],
      answer: 0,
      explain: '她出演过《邪神与厨二病少女\' 千岁篇》；其余三部与她无关。',
    },
    {
      id: 'w12',
      level: 'easy',
      prompt: '以下哪部作品有她的配音？',
      options: ['拥有超常技能的异世界流浪美食家2', 'ETERNAL', '刀剑神域 Alicization War of Underworld', 'ミュージカル信長〜朧炎ノ刻〜'],
      answer: 0,
      explain: '她出演过《拥有超常技能的异世界流浪美食家2》；其余三部与她无关。',
    },
];

export default { id: 'sasaki-riko', questions: worksQuestions };
