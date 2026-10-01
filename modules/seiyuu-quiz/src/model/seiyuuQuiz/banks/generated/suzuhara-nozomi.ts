import type { SeiyuuQuizQuestion } from '../../types';

/**
 * 【自动生成，不用手改】鈴原希実 的「出演作品」派生题。
 *
 * 由 `tmp/gen-works-questions.mjs` 从萌娘百科「出演作品」小节生成，
 * 重新跑一遍会覆盖本文件；想手改请改手写题库（`../suzuhara-nozomi.ts`）。
 * 来源：https://zh.moegirl.org.cn/%E9%88%B4%E5%8E%9F%E5%B8%8C%E5%AE%9F
 */
export const worksQuestions: SeiyuuQuizQuestion[] = [
    {
      id: 'w1',
      level: 'normal',
      prompt: '她在《タワーオブスカイ》里饰演的角色是？',
      options: ['チヨリ', 'クベーラ', '丹羽赭黎', '钝川真奈美'],
      answer: 0,
      explain: '《タワーオブスカイ》里她配的是チヨリ。',
    },
    {
      id: 'w2',
      level: 'normal',
      prompt: '《棕色尘埃》中，她配音的角色是？',
      options: ['钝川真奈美', 'クベーラ', 'チヨリ', '樱小路希奈子'],
      answer: 1,
      explain: '《棕色尘埃》里她配的是クベーラ。',
    },
    {
      id: 'w3',
      level: 'normal',
      prompt: '她为《LoveLive!Superstar!! 3期》配的角色是？',
      options: ['樱小路希奈子', 'チヨリ', 'クベーラ', '钝川真奈美'],
      answer: 0,
      explain: '《LoveLive!Superstar!! 3期》里她配的是樱小路希奈子。',
    },
    {
      id: 'w4',
      level: 'normal',
      prompt: '她在《LoveLive!学园偶像祭》里饰演的角色是？',
      options: ['クベーラ', '丹羽赭黎', '钝川真奈美', '樱小路希奈子'],
      answer: 3,
      explain: '《LoveLive!学园偶像祭》里她配的是樱小路希奈子。',
    },
    {
      id: 'w5',
      level: 'normal',
      prompt: '《温泉娘》中，她配音的角色是？',
      options: ['樱小路希奈子', '钝川真奈美', 'クベーラ', 'チヨリ'],
      answer: 1,
      explain: '《温泉娘》里她配的是钝川真奈美。',
    },
    {
      id: 'w6',
      level: 'normal',
      prompt: '以下哪个角色是她饰演过的？',
      options: ['丹羽赭黎', '七北田和歌菜', '技术开发局局员', 'ソフィ・アフェル'],
      answer: 0,
      explain: '丹羽赭黎是她配过的角色，其余三个是其他声优的角色。',
    },
    {
      id: 'w7',
      level: 'normal',
      prompt: '下列角色中，哪一个由她配音？',
      options: ['岛根丸', '南条栞音', 'チヨリ', '俄罗斯兵飞行员'],
      answer: 2,
      explain: 'チヨリ是她配过的角色，其余三个是其他声优的角色。',
    },
    {
      id: 'w8',
      level: 'normal',
      prompt: '她配过下面哪个角色？',
      options: ['薄暮', 'ハルカ', '周防优羽姬', '樱小路希奈子'],
      answer: 3,
      explain: '樱小路希奈子是她配过的角色，其余三个是其他声优的角色。',
    },
    {
      id: 'w9',
      level: 'hard',
      prompt: '以下哪部作品她没有出演？',
      options: ['LoveLive!Superstar!! 2期', '星色物语', '星色物语：学生终端', '小哥斯拉的逆袭'],
      answer: 3,
      explain: '《小哥斯拉的逆袭》与她无关；另外三部她都出演过。',
    },
    {
      id: 'w10',
      level: 'easy',
      prompt: '她出演过下面哪部作品？',
      options: ['齐木楠雄的灾难 2期', '怪兽大涩滞KURODA', '见面5秒开始战斗', 'LoveLive!学园偶像祭2 MIRACLE LIVE!'],
      answer: 3,
      explain: '她出演过《LoveLive!学园偶像祭2 MIRACLE LIVE!》；其余三部与她无关。',
    },
];

export default { id: 'suzuhara-nozomi', questions: worksQuestions };
