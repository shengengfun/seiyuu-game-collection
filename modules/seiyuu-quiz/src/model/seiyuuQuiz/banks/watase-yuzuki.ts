import type { SeiyuuQuizBank } from '../types';

/**
 * 渡濑结月（若叶睦 / Mortis）题库。
 * 资料：萌娘百科 https://zh.moegirl.org.cn/渡濑结月
 */
export default {
  id: 'watase-yuzuki',
  groups: ['avemujica', 'd4dj'],
  intro: 'Ave Mujica 的吉他 Mortis / 若叶睦，同时也是 D4DJ 的 Lyrical Lily 成员。丢手机界的传说。',
  questions: [
    {
      id: 'q1',
      level: 'easy',
      prompt: '渡濑结月在 BanG Dream! 里饰演的角色是？',
      options: ['丰川祥子', '若叶睦', '八幡海铃', '祐天寺若麦'],
      answer: 1,
      explain: '她饰演 Ave Mujica 的吉他手若叶睦（代号 Mortis），2023 年 9 月 14 日随动画第 13 集公布。',
    },
    {
      id: 'q2',
      level: 'easy',
      prompt: '渡濑结月的生日是？',
      options: ['2002 年 5 月 15 日', '2000 年 1 月 5 日', '2003 年 2 月 18 日', '1998 年 9 月 20 日'],
      answer: 2,
      explain: '2003 年 2 月 18 日生，是 Ave Mujica 里最年轻的一位。',
    },
    {
      id: 'q3',
      level: 'easy',
      prompt: '她在 D4DJ 中饰演的角色是？',
      options: [
        '水岛茉莉花',
        '春日春奈',
        '竹下美依子',
        '濑户口心羽',
      ],
      answer: 2,
      explain: '她 2020 年加入 D4DJ 第 6 支组合 Lyrical Lily，饰演竹下美依子。',
    },
    {
      id: 'q4',
      level: 'easy',
      prompt: '渡濑结月所属的事务所是？',
      options: ['响 HiBiKi', 'Just Production', 'Stay Luck', 'Raccoon Dog'],
      answer: 0,
      explain: '她与 MyGO!!!!! 的四位成员同属响 HiBiKi。',
    },
    {
      id: 'q5',
      level: 'normal',
      prompt: '她在 Ave Mujica 里的代号与位置是？',
      options: ['Doloris（主唱）', 'Mortis（吉他）', 'Timoris（贝斯）', 'Amoris（鼓）'],
      answer: 1,
      explain: '她的代号是 Mortis，担任吉他手。',
    },
    {
      id: 'q6',
      level: 'normal',
      prompt: '以下哪一项是她写进资料里的技能/爱好？',
      options: [
        '水肺潜水与叉车',
        '低音单簧管与调理师免许',
        '双排键电子琴、摄影、做点心',
        '算盘与圆周率背诵',
      ],
      answer: 2,
      explain: '她擅长双排键电子琴，爱好是摄影、做点心、吃东西、双排键和唱歌。',
    },
    {
      id: 'q7',
      level: 'hard',
      prompt: '她和自己饰演的若叶睦之间有个反差细节，是？',
      options: [
        '她比睦更不爱说话',
        '她完全不会弹吉他',
        '她讨厌所有蔬菜',
        '她对黄瓜过敏，喜欢黄瓜却吃不了',
      ],
      answer: 3,
      explain: '若叶睦是「黄瓜」梗的当事人，而声优本人正好对黄瓜过敏——喜欢却吃不了。',
    },
    {
      id: 'q8',
      level: 'normal',
      prompt: '她有个很出名的「体质」，是？',
      options: [
        '很健忘，一个月要丢两三次手机，通常夹在书里',
        '极度怕冷，夏天也穿羽绒服',
        '从不迟到，总是最早到现场',
        '完全不吃甜食',
      ],
      answer: 0,
      explain: '她健忘到一个月丢手机两三次，多半是丢在家里（例如夹在书与书之间）。',
    },
    {
      id: 'q9',
      level: 'normal',
      prompt: '她和深川瑠华、相羽爱奈组成了一个奇怪组合，名字来自？',
      options: [
        '三人同一天生日',
        '三人都爱吃蛋包饭，而相羽爱奈的拿手菜正好是蛋包饭',
        '三人都养同一品种的猫',
        '三人都是左撇子',
      ],
      answer: 1,
      explain: '她们组成了「蛋包饭组合」，后来还衍生出「整理整顿苦手组合」和 Team Pirates。',
    },
    {
      id: 'q10',
      level: 'hard',
      prompt: '2021 年起她还做过一份很特别的工作，是？',
      options: ['电视台天气预报员', '游戏主播', '女子摔角团体 Stardom 的擂台播报员', '同人展会的主持人'],
      answer: 2,
      explain: '2021 年她开始作为女子摔角团体 Stardom 的擂台播报员活动。',
    },
    {
      id: 'q11',
      level: 'hard',
      prompt: '关于她出国的经历，下面哪个说法是对的？',
      options: [
        '2023 年去过韩国演出',
        '2022 年去过台湾演出',
        '她从没出过国',
        '2024 年上海 BML 之前她没出过国',
      ],
      answer: 3,
      explain: '她在 2024 年以 Ave Mujica 成员身份出席上海 BML 之前，从没出过国。',
    },
    {
      id: 'q12',
      level: 'hard',
      prompt: '她公开表示喜欢的偶像组合是？',
      options: ['AKB48 与榉坂46', '乃木坂46 与早安少女组', 'i☆Ris 与 Run Girls, Run!', 'TWICE 与 BLACKPINK'],
      answer: 0,
      explain: '她喜欢的偶像组合是 AKB48 和榉坂46。',
    },
  ],
} satisfies SeiyuuQuizBank;
