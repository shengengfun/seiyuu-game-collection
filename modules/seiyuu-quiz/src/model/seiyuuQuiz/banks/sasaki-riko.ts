import type { SeiyuuQuizBank } from '../types';

/**
 * 佐佐木李子（三角初华 / Doloris）题库。
 * 资料：萌娘百科 https://zh.moegirl.org.cn/佐佐木李子
 */
export default {
  id: 'sasaki-riko',
  groups: ['avemujica'],
  intro: 'Ave Mujica 的吉他 Doloris / 三角初华。音乐剧童星出身，随身带哑铃和中文发音书。',
  questions: [
    {
      id: 'q1',
      level: 'easy',
      prompt: '佐佐木李子（ささき りこ）在 BanG Dream! 里饰演的角色是？',
      options: ['八幡海铃', '三角初华', '丰川祥子', '祐天寺若麦'],
      answer: 1,
      explain: '她饰演 Ave Mujica 的吉他手三角初华（代号 Doloris）。',
    },
    {
      id: 'q2',
      level: 'easy',
      prompt: '她的生日是？',
      options: ['1996 年 5 月 19 日', '2002 年 9 月 10 日', '1997 年 11 月 10 日', '2003 年 2 月 18 日'],
      answer: 2,
      explain: '1997 年 11 月 10 日生。',
    },
    {
      id: 'q3',
      level: 'easy',
      prompt: '她的出身地是？',
      options: ['千叶县', '宫城县仙台市', '北海道', '秋田县秋田市'],
      answer: 3,
      explain: '秋田县秋田市出身，2008 年她演《安妮》时还礼节性拜访过秋田市市长。',
    },
    {
      id: 'q4',
      level: 'easy',
      prompt: '她在 Ave Mujica 里负责的乐器是？',
      options: ['吉他', '贝斯', '鼓', '键盘'],
      answer: 0,
      explain: '她是乐队的吉他手。',
    },
    {
      id: 'q5',
      level: 'normal',
      prompt: '她的歌手出道经历是？',
      options: [
        '2014 年以「Rico」名义发行《Come & Get It!!》',
        '2010 年以「李」名义发行《秋田小调》',
        '2019 年以「RicoRium」名义发行《Synapse》',
        '她从未以个人名义发过单曲',
      ],
      answer: 0,
      explain: '她 2013 年在 Teichiku 八十周年新人试镜中成为东北地区代表（3836 人中获胜），2014 年以「Rico」名义歌手出道。',
    },
    {
      id: 'q6',
      level: 'normal',
      prompt: '她小学五年级参加音乐剧试镜，从 9000 人里脱颖而出，演的是？',
      options: ['《悲惨世界》的珂赛特', '《音乐之声》的丽莎', '《安妮》的安妮', '《小美人鱼》的爱丽儿'],
      answer: 2,
      explain: '2009 年起她与饭冢萌木共同出演音乐剧《安妮》的主角安妮。',
    },
    {
      id: 'q7',
      level: 'normal',
      prompt: '她自 2018 年起持续做的个人企划是？',
      options: ['「Ric∮」音乐节', '「Honeycomb Live」', '「Lico Radio」', '「SynapstoRy」朗读演唱会系列'],
      answer: 3,
      explain: 'SynapstoRy 取「突触（synapse）」与「故事（story）」合成，把音乐、朗读与钢琴交织成舞台，目前已有七部。',
    },
    {
      id: 'q8',
      level: 'normal',
      prompt: '她最爱的食物是？',
      options: ['麻辣烫（自述一周要吃三次）', '拉面', '纳豆', '寿司'],
      answer: 0,
      explain: '她极爱麻辣烫，后来在中国工作人员推荐下又爱上了螺蛳粉，还说吃辣能让嗓子变暖、更好开嗓。',
    },
    {
      id: 'q9',
      level: 'hard',
      prompt: '她有个很特别的日常习惯，是？',
      options: [
        '每天早上跑 10 公里',
        '会做无依托倒立来整理思绪，写歌没灵感时就去倒立',
        '每天写一千字日记',
        '睡前一定要练两小时吉他',
      ],
      answer: 1,
      explain: '她从小练跳舞、进过体操俱乐部，日常会做无依托倒立，作词作曲卡住时就去倒立换脑子。',
    },
    {
      id: 'q10',
      level: 'hard',
      prompt: '她 2022 年生日直播时公布的粉丝名是？',
      options: ['リコリスト', 'ササキスト', 'トリコ（李子的俘虏）', 'リコファミリー'],
      answer: 2,
      explain: '粉丝名「トリコ」取自「虏（トリコ）」——李子的俘虏。',
    },
    {
      id: 'q11',
      level: 'hard',
      prompt: '她公开提过的心理阴影里，与食物有关的是？',
      options: [
        '一次性吃太多纳豆导致过敏',
        '小时候被鱼刺卡过喉咙',
        '吃太多辣导致失声',
        '一次性吃了太多梅水晶，导致胃穿孔',
      ],
      answer: 3,
      explain: '她因为一次吃太多梅水晶导致胃穿孔，从此对梅水晶留下心理阴影；另一个阴影是蚂蚁。',
    },
    {
      id: 'q12',
      level: 'hard',
      prompt: '她沿用多年的艺术家签名是？',
      options: ['Ric∮', 'Riko♪', '李→初', 'S.R.97'],
      answer: 0,
      explain: '签名「Ric∮」是她在高中时就设计好的。',
    },
  ],
} satisfies SeiyuuQuizBank;
