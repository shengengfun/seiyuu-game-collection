import type { SeiyuuQuizQuestion } from '../../types';

/**
 * 【自动生成，不用手改】青木阳菜 的「出演作品」派生题。
 *
 * 由 `tmp/gen-works-questions.mjs` 从萌娘百科「出演作品」小节生成，
 * 重新跑一遍会覆盖本文件；想手改请改手写题库（`../aoki-hina.ts`）。
 * 来源：https://zh.moegirl.org.cn/%E9%9D%92%E6%9C%A8%E9%98%B3%E8%8F%9C
 */
export const worksQuestions: SeiyuuQuizQuestion[] = [
    {
      id: 'w1',
      level: 'normal',
      prompt: '她在《英雄传说 界之轨迹》里饰演的角色是？',
      options: ['莉莉雅·爱普斯泰恩', 'ルベベ', '右代宫朱志香', '敌方角色'],
      answer: 0,
      explain: '《英雄传说 界之轨迹》里她配的是莉莉雅·爱普斯泰恩。',
    },
    {
      id: 'w2',
      level: 'normal',
      prompt: '《魔法少女奈叶 EXCEEDS Gun Blaze Vengeance》中，她配音的角色是？',
      options: ['苍山卡娜', 'LinoN|神矢音叶', '古寺柚', '莉莉雅·爱普斯泰恩'],
      answer: 2,
      explain: '《魔法少女奈叶 EXCEEDS Gun Blaze Vengeance》里她配的是古寺柚。',
    },
    {
      id: 'w3',
      level: 'normal',
      prompt: '她为《BanG Dream! It\'s MyGO!!!!!》配的角色是？',
      options: ['莉莉雅·爱普斯泰恩', '武罗腕龙子', '欧律斯透斯', '要乐奈'],
      answer: 3,
      explain: '《BanG Dream! It\'s MyGO!!!!!》里她配的是要乐奈。',
    },
    {
      id: 'w4',
      level: 'normal',
      prompt: '她在《BanG Dream! Our Notes》里饰演的角色是？',
      options: ['青山加奈', '高桥千夏', '武罗腕龙子', '要乐奈'],
      answer: 3,
      explain: '《BanG Dream! Our Notes》里她配的是要乐奈。',
    },
    {
      id: 'w5',
      level: 'normal',
      prompt: '《卡片战斗先导者 Dear Days 2》中，她配音的角色是？',
      options: ['玉名满美(第2任)', '欧律斯透斯', '纽因佩、露西亚', '苍山卡娜'],
      answer: 3,
      explain: '《卡片战斗先导者 Dear Days 2》里她配的是苍山卡娜。',
    },
    {
      id: 'w6',
      level: 'normal',
      prompt: '以下哪个角色是她饰演过的？',
      options: ['ソフィー', '歌方月乃', '花咲兔冥', 'LinoN|神矢音叶'],
      answer: 3,
      explain: 'LinoN|神矢音叶是她配过的角色，其余三个是其他声优的角色。',
    },
    {
      id: 'w7',
      level: 'normal',
      prompt: '下列角色中，哪一个由她配音？',
      options: ['野原亜紀', 'ターニア', '敌方角色', '莉特'],
      answer: 2,
      explain: '敌方角色是她配过的角色，其余三个是其他声优的角色。',
    },
    {
      id: 'w8',
      level: 'normal',
      prompt: '她配过下面哪个角色？',
      options: ['希露卡·梅连提丝', '冒险者', 'タラッタ（塔菈塔）', '莉提欧'],
      answer: 1,
      explain: '冒险者是她配过的角色，其余三个是其他声优的角色。',
    },
    {
      id: 'w9',
      level: 'hard',
      prompt: '以下哪部作品她没有出演？',
      options: ['崩坏学园2', '楠木同学高中出道失败了', '超超超超超喜欢你的100个女朋友 第2期', '少女☆歌剧 Revue Starlight -The STAGE 中等部- Rebellion'],
      answer: 1,
      explain: '《楠木同学高中出道失败了》与她无关；另外三部她都出演过。',
    },
    {
      id: 'w10',
      level: 'hard',
      prompt: '下面哪部作品与她无关？',
      options: ['海猫鸣泣之时～Stage of the golden Witch～Episode3', '少女☆歌剧 Revue Starlight -The STAGE 中等部- Remains', '组长女儿与照料专员', '京都幻都 樱花幻舞'],
      answer: 2,
      explain: '《组长女儿与照料专员》与她无关；另外三部她都出演过。',
    },
    {
      id: 'w11',
      level: 'easy',
      prompt: '以下哪部作品有她的配音？',
      options: ['宝贝老板2：家族企业', '崩坏：星穹铁道', '赛博朋克 边缘行者2', 'ALICE Fiction漂眇群像'],
      answer: 3,
      explain: '她出演过《ALICE Fiction漂眇群像》；其余三部与她无关。',
    },
    {
      id: 'w12',
      level: 'easy',
      prompt: '她出演过下面哪部作品？',
      options: ['演剧偶像', '海猫鸣泣之时～Stage of the golden Witch～', '勇者之屑', '剑与远征：启程'],
      answer: 1,
      explain: '她出演过《海猫鸣泣之时～Stage of the golden Witch～》；其余三部与她无关。',
    },
];

export default { id: 'aoki-hina', questions: worksQuestions };
