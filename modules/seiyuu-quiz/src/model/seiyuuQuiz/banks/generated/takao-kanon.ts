import type { SeiyuuQuizQuestion } from '../../types';

/**
 * 【自动生成，不用手改】高尾奏音 的「出演作品」派生题。
 *
 * 由 `tmp/gen-works-questions.mjs` 从萌娘百科「出演作品」小节生成，
 * 重新跑一遍会覆盖本文件；想手改请改手写题库（`../takao-kanon.ts`）。
 * 来源：https://zh.moegirl.org.cn/%E9%AB%98%E5%B0%BE%E5%A5%8F%E9%9F%B3
 */
export const worksQuestions: SeiyuuQuizQuestion[] = [
    {
      id: 'w1',
      level: 'normal',
      prompt: '她在《原神》里饰演的角色是？',
      options: ['拉提娜', '帕埃娜', '诺艾尔', '佐鸟笼目'],
      answer: 2,
      explain: '《原神》里她配的是诺艾尔。',
    },
    {
      id: 'w2',
      level: 'normal',
      prompt: '《新人炼金术师的店铺经营》中，她配音的角色是？',
      options: ['斋川唯', '鹤木阳渚', '莎拉萨·菲朵', '米埃尔·哈奈特'],
      answer: 2,
      explain: '《新人炼金术师的店铺经营》里她配的是莎拉萨·菲朵。',
    },
    {
      id: 'w3',
      level: 'normal',
      prompt: '她为《孤单一人的异世界攻略》配的角色是？',
      options: ['诗织', '帕埃娜', '副委员长B', '白石千纱'],
      answer: 2,
      explain: '《孤单一人的异世界攻略》里她配的是副委员长B。',
    },
    {
      id: 'w4',
      level: 'normal',
      prompt: '她在《异世界默示录麦诺格拉～从毁灭文明开始征服世界～》里饰演的角色是？',
      options: ['黎芮儿', '嘉莉雅', '女型', '刻律德菈'],
      answer: 1,
      explain: '《异世界默示录麦诺格拉～从毁灭文明开始征服世界～》里她配的是嘉莉雅。',
    },
    {
      id: 'w5',
      level: 'normal',
      prompt: '《元祖！BanG Dream Chan》中，她配音的角色是？',
      options: ['月兔守卫妖', '丰川祥子', '小玉、红豆2', '拉提娜'],
      answer: 1,
      explain: '《元祖！BanG Dream Chan》里她配的是丰川祥子。',
    },
    {
      id: 'w6',
      level: 'normal',
      prompt: '以下哪个角色是她饰演过的？',
      options: ['金婕·塔卡', '优秀素质的朋友', '相枛津', '宗近飞粹'],
      answer: 0,
      explain: '金婕·塔卡是她配过的角色，其余三个是其他声优的角色。',
    },
    {
      id: 'w7',
      level: 'normal',
      prompt: '下列角色中，哪一个由她配音？',
      options: ['伊芙', '优秀素质', '名取茉莉愛', '娜塔莉亚'],
      answer: 3,
      explain: '娜塔莉亚是她配过的角色，其余三个是其他声优的角色。',
    },
    {
      id: 'w8',
      level: 'normal',
      prompt: '她配过下面哪个角色？',
      options: ['纽因佩、露西亚', '艾丽婕', '直美', '波照间千岁'],
      answer: 1,
      explain: '艾丽婕是她配过的角色，其余三个是其他声优的角色。',
    },
    {
      id: 'w9',
      level: 'hard',
      prompt: '以下哪部作品她没有出演？',
      options: ['超超超超超喜欢你的100个女朋友 第2期', '灰烬战线', '伊甸星原 第2期', '辉夜大小姐想让我告白 -初吻不会结束-'],
      answer: 3,
      explain: '《辉夜大小姐想让我告白 -初吻不会结束-》与她无关；另外三部她都出演过。',
    },
    {
      id: 'w10',
      level: 'hard',
      prompt: '下面哪部作品与她无关？',
      options: ['BanG Dream！少女乐团派对！', '流汗吧！健身少女', '灰原君的青春二周目', '魔法少女小圆 Magia Exedra'],
      answer: 0,
      explain: '《BanG Dream！少女乐团派对！》与她无关；另外三部她都出演过。',
    },
    {
      id: 'w11',
      level: 'easy',
      prompt: '她出演过下面哪部作品？',
      options: ['超超超超超喜欢你的100个女朋友 第3期', '瑕疵新娘|瑕疵新娘 ~受虐的我被皇国鬼神一眼看上的理由~', '城姬Quest', '摇曳马娘'],
      answer: 0,
      explain: '她出演过《超超超超超喜欢你的100个女朋友 第3期》；其余三部与她无关。',
    },
    {
      id: 'w12',
      level: 'easy',
      prompt: '以下哪部作品有她的配音？',
      options: ['最终休止符', '虹四动画2', '星降之街', 'BadGirl'],
      answer: 2,
      explain: '她出演过《星降之街》；其余三部与她无关。',
    },
];

export default { id: 'takao-kanon', questions: worksQuestions };
