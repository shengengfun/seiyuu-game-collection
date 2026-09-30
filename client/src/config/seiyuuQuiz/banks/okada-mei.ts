import type { SeiyuuQuizBank } from '../types';

/**
 * 冈田梦以（八幡海铃 / Timoris）题库。
 * 资料：萌娘百科 https://zh.moegirl.org.cn/冈田梦以
 */
export default {
  id: 'okada-mei',
  groups: ['avemujica', 'd4dj'],
  intro: 'Ave Mujica 的贝斯 Timoris / 八幡海铃，也是 D4DJ 的 Merm4id 成员。书道七段、雅号「兰华」。',
  questions: [
    {
      id: 'q1',
      level: 'easy',
      prompt: '冈田梦以在 BanG Dream! 里饰演的角色是？',
      options: ['丰川祥子', '八幡海铃', '三角初华', '若叶睦'],
      answer: 1,
      explain: '她饰演 Ave Mujica 的贝斯手八幡海铃（代号 Timoris）。',
    },
    {
      id: 'q2',
      level: 'easy',
      prompt: '冈田梦以的生日是？',
      options: ['1997 年 11 月 10 日', '2002 年 9 月 10 日', '1996 年 5 月 19 日', '2003 年 2 月 18 日'],
      answer: 2,
      explain: '1996 年 5 月 19 日生，是 Ave Mujica 里最年长的一位。',
    },
    {
      id: 'q3',
      level: 'easy',
      prompt: '她在 Ave Mujica 里负责的乐器是？',
      options: ['吉他', '键盘', '鼓', '贝斯'],
      answer: 3,
      explain: '她是乐队的贝斯手。',
    },
    {
      id: 'q4',
      level: 'easy',
      prompt: '她在另一个企划 D4DJ 中饰演的角色是？',
      options: ['水岛茉莉花（Merm4id）', '竹下美依子（Lyrical Lily）', '春日春奈', '濑户口心羽'],
      answer: 0,
      explain: '她 2019 年 7 月加入 D4DJ，饰演 Merm4id 的水岛茉莉花。',
    },
    {
      id: 'q5',
      level: 'normal',
      prompt: '以下哪一项是她的「特长」？',
      options: [
        '剑道与弓道',
        '茶道与书法',
        '钢琴与指挥',
        '空手道与柔道',
      ],
      answer: 1,
      explain: '她书道 7 段、雅号「兰华」，学生时代还是茶道部部长。',
    },
    {
      id: 'q6',
      level: 'normal',
      prompt: '在成为声优之前，她有过一段偶像经历，是？',
      options: [
        'AKB48 研究生',
        'i☆Ris 成员',
        '偶像组合「转校少女*」的成员兼队长',
        'Dempagumi.inc 成员',
      ],
      answer: 2,
      explain: '她 2014 年起是「转校少女歌击团」（现「转校少女*」）的成员兼队长，2019 年毕业转为个人活动。',
    },
    {
      id: 'q7',
      level: 'normal',
      prompt: '她 2025 年以个人身份出道时用的歌手名义是？',
      options: ['Rico', 'MiMi', 'Mei-chan', 'MEI'],
      answer: 3,
      explain: '她以「MEI」的名义个人出道（Rico 是佐佐木李子早期的歌手名义）。',
    },
    {
      id: 'q8',
      level: 'normal',
      prompt: '她个人出道时发行的首张迷你专辑是？',
      options: ['《Radiance》', '《Letters》', '《RI PATHOS》', '《Nostalgia》'],
      answer: 0,
      explain: '2025 年 4 月 30 日发行的《Radiance》收录了六首新歌，5 月 17 日在新宿办了首场个人 Live。',
    },
    {
      id: 'q9',
      level: 'hard',
      prompt: '她开始弹贝斯的契机是？',
      options: [
        '乐队缺人，被临时拉去顶替',
        '收到 Ave Mujica 联络前三个月，突然想「学一门属于自己的特长」，于是开始学贝斯',
        '父亲是贝斯手',
        '因为 D4DJ 的角色要求必须会弹',
      ],
      answer: 1,
      explain: '她先自学了四弦贝斯，加入 Ave Mujica 后才因为角色用的是五弦超长贝斯而换成五弦。',
    },
    {
      id: 'q10',
      level: 'hard',
      prompt: '她后来把四弦贝斯换成五弦的原因是？',
      options: [
        '四弦贝斯坏了懒得修',
        '觉得五弦看起来更帅',
        '角色使用的是五弦超长贝斯',
        '被队友建议换成五弦',
      ],
      answer: 2,
      explain: '为了贴合八幡海铃的角色设定，她改用了五弦超长贝斯。',
    },
    {
      id: 'q11',
      level: 'hard',
      prompt: 'Ave Mujica 0th LIVE 时她做的细节，后来闹了个笑话，是？',
      options: [
        '把头发染成红黑色，之后一直没染回来',
        '在脸上画了面具',
        '戴了红色隐形眼镜',
        '配合乐队印象色做了红黑美甲，之后在别的拍摄中忘得一干二净',
      ],
      answer: 3,
      explain: '她为了 0th LIVE 做了红黑美甲，结果下一份拍摄工作完全忘了这件事，最后只能挑没有拍到指甲的照片用。',
    },
    {
      id: 'q12',
      level: 'hard',
      prompt: '她有个持续的收集爱好，是？',
      options: [
        '收集领带，会为不同的领带搭配不同的衣服',
        '收集各种帽子',
        '收集主题邮局的邮戳',
        '收集黑胶唱片',
      ],
      answer: 0,
      explain: '她热衷收集领带，并会围绕领带去搭配当天穿的衣服。',
    },
  ],
} satisfies SeiyuuQuizBank;
