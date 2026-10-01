import type { SeiyuuQuizQuestion } from '../../types';

/**
 * 【自动生成，不用手改】大西亚玖璃 的「出演作品」派生题。
 *
 * 由 `tmp/gen-works-questions.mjs` 从萌娘百科「出演作品」小节生成，
 * 重新跑一遍会覆盖本文件；想手改请改手写题库（`../ohnishi-aguri.ts`）。
 * 来源：https://zh.moegirl.org.cn/%E5%A4%A7%E8%A5%BF%E4%BA%9A%E7%8E%96%E7%92%83
 */
export const worksQuestions: SeiyuuQuizQuestion[] = [
    {
      id: 'w1',
      level: 'normal',
      prompt: '她在《灰烬战线》里饰演的角色是？',
      options: ['贝丝', 'AT-1、彗星(芙蓉)', '三星琴叶', '一之濑未羽'],
      answer: 1,
      explain: '《灰烬战线》里她配的是AT-1、彗星(芙蓉)。',
    },
    {
      id: 'w2',
      level: 'normal',
      prompt: '《VIRTUAL GIRL @ WORLD’S END》中，她配音的角色是？',
      options: ['马尼拉·哈密特', '总公会接待小姐', '小遥', '三星琴叶'],
      answer: 2,
      explain: '《VIRTUAL GIRL @ WORLD’S END》里她配的是小遥。',
    },
    {
      id: 'w3',
      level: 'normal',
      prompt: '她为《败给了性格恶劣的天才青梅，初体验全部被夺走这件事》配的角色是？',
      options: ['三星琴叶', '吉泽若叶', '笹塚愛里', '小遥'],
      answer: 1,
      explain: '《败给了性格恶劣的天才青梅，初体验全部被夺走这件事》里她配的是吉泽若叶。',
    },
    {
      id: 'w4',
      level: 'normal',
      prompt: '她在《地下城里的人们》里饰演的角色是？',
      options: ['三星琴叶', '总公会接待小姐', '卡拉', '菜花胡桃'],
      answer: 1,
      explain: '《地下城里的人们》里她配的是总公会接待小姐。',
    },
    {
      id: 'w5',
      level: 'normal',
      prompt: '《LoveLive!虹咲学园学园偶像同好会 2期》中，她配音的角色是？',
      options: ['音无绚奈', '司书', '上原步梦', '总公会接待小姐'],
      answer: 2,
      explain: '《LoveLive!虹咲学园学园偶像同好会 2期》里她配的是上原步梦。',
    },
    {
      id: 'w6',
      level: 'normal',
      prompt: '以下哪个角色是她饰演过的？',
      options: ['猪濑舞', '小空さとこ', '高咲侑', '追迹者尼巫'],
      answer: 3,
      explain: '追迹者尼巫是她配过的角色，其余三个是其他声优的角色。',
    },
    {
      id: 'w7',
      level: 'normal',
      prompt: '下列角色中，哪一个由她配音？',
      options: ['曼陀罗', '贝丝', '野中姬乃', '御藏'],
      answer: 1,
      explain: '贝丝是她配过的角色，其余三个是其他声优的角色。',
    },
    {
      id: 'w8',
      level: 'normal',
      prompt: '她配过下面哪个角色？',
      options: ['早川弥宏', '里欧妮·阿勒法', '赤いくつ', '大我小夏'],
      answer: 0,
      explain: '早川弥宏是她配过的角色，其余三个是其他声优的角色。',
    },
    {
      id: 'w9',
      level: 'hard',
      prompt: '以下哪部作品她没有出演？',
      options: ['雀魂 碰☆', '孤单一人的异世界攻略', '在魔王城说晚安', '大叔新人冒险者，被最强小队往死里锻炼后变无敌了'],
      answer: 0,
      explain: '《雀魂 碰☆》与她无关；另外三部她都出演过。',
    },
    {
      id: 'w10',
      level: 'hard',
      prompt: '下面哪部作品与她无关？',
      options: ['突击莉莉 终结之弹', 'Extreme Hearts', '电影 LoveLive!虹咲学园学园偶像同好会 完结篇 第3章', '恒久之绊'],
      answer: 3,
      explain: '《恒久之绊》与她无关；另外三部她都出演过。',
    },
    {
      id: 'w11',
      level: 'easy',
      prompt: '她出演过下面哪部作品？',
      options: ['白猫Project', '随兴旅 -That\'s Journey-', '炎之斗球女弹子', '青春之箱'],
      answer: 0,
      explain: '她出演过《白猫Project》；其余三部与她无关。',
    },
    {
      id: 'w12',
      level: 'easy',
      prompt: '她出演过下面哪部作品？',
      options: ['时间飞船 逆袭的三恶人', '为了女儿，我说不定连魔王都能干掉。', '因为不是真正的伙伴而被逐出勇者队伍，流落到边境展开慢活人生 2nd', '更衣人偶坠入爱河'],
      answer: 2,
      explain: '她出演过《因为不是真正的伙伴而被逐出勇者队伍，流落到边境展开慢活人生 2nd》；其余三部与她无关。',
    },
];

export default { id: 'ohnishi-aguri', questions: worksQuestions };
