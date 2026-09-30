import type { SeiyuuQuizBank } from '../types';

/**
 * 青木阳菜（要乐奈）题库。
 * 资料：萌娘百科 https://zh.moegirl.org.cn/青木阳菜
 */
export default {
  id: 'aoki-hina',
  groups: ['mygo'],
  intro: 'MyGO!!!!! 的主音吉他要乐奈。钢琴出身、自带绝对音感，还写着「圣青木」这个中国昵称。',
  questions: [
    {
      id: 'q1',
      level: 'easy',
      prompt: '青木阳菜在 MyGO!!!!! 里饰演的角色是？',
      options: ['高松灯', '要乐奈', '千早爱音', '长崎爽世'],
      answer: 1,
      explain: '她饰演主音吉他要乐奈，2023 年 4 月 9 日正式公布。',
    },
    {
      id: 'q2',
      level: 'easy',
      prompt: '青木阳菜的生日是？',
      options: ['2000 年 3 月 14 日', '2002 年 5 月 15 日', '2000 年 1 月 5 日', '2001 年 7 月 10 日'],
      answer: 2,
      explain: '2000 年 1 月 5 日生。',
    },
    {
      id: 'q3',
      level: 'easy',
      prompt: '她的老家（也是歌手活动「BLUE TRIP」路演的起点）在？',
      options: ['千叶县', '静冈县', '兵库县', '宫城县仙台市'],
      answer: 3,
      explain: '她出身宫城县仙台市，对东北和家乡感情很深，首本写真集也选在宫城县拍摄。',
    },
    {
      id: 'q4',
      level: 'easy',
      prompt: '青木阳菜所属的事务所是？',
      options: ['响 HiBiKi', '青二事务所', 'LIBERTE', '81 Produce'],
      answer: 0,
      explain: '她 2021 年 2 月通过联合试镜加入响 HiBiKi，与 MyGO!!!!! 的队友立石凛同期。',
    },
    {
      id: 'q5',
      level: 'normal',
      prompt: '她的昵称「ひなぴよ（hinapiyo）」是谁起的？',
      options: ['立石凛', '爱美', '小日向美香', '林鼓子'],
      answer: 1,
      explain: '这个昵称由同事务所的大前辈爱美所取。',
    },
    {
      id: 'q6',
      level: 'normal',
      prompt: '以下哪一组是她的「特技」？',
      options: ['钢琴与唱歌', '剑道与茶道', '算盘与圆周率背诵', '叉车与电弧焊'],
      answer: 0,
      explain: '她 5 岁起学钢琴，特技写着钢琴和唱歌，并在《HiBiKi StYle》上表演过自己的绝对音感。',
    },
    {
      id: 'q7',
      level: 'normal',
      prompt: '除了 BanG Dream!，她还参与了哪个企划？',
      options: ['D4DJ', '赛马娘', '偶像大师', '少女☆歌剧（饰演高千穗史黛拉）'],
      answer: 3,
      explain: '她是《少女☆歌剧 Revue Starlight -Re LIVE-》席格菲尔特音乐学院中等部高千穗史黛拉的声优。',
    },
    {
      id: 'q8',
      level: 'normal',
      prompt: '关于她的乐器经历，下面哪个说法是对的？',
      options: [
        '5 岁起学钢琴，初二开始自学原声吉他，电吉他则是确定参加 MyGO!!!!! 后才开始弹',
        '小学学小提琴，高中改弹贝斯',
        '大学才第一次接触乐器',
        '她从小打鼓，吉他是为了 MyGO!!!!! 才现学的唯一乐器',
      ],
      answer: 0,
      explain: '她钢琴学了多年，初二自学木吉他，加入 MyGO!!!!! 之后才开始认真练电吉他。',
    },
    {
      id: 'q9',
      level: 'normal',
      prompt: '她 2025 年发售的第一张个人专辑是？',
      options: ['《BLUE TRIP》', '《Letters》', '《Nostalgia》', '《空の箱》'],
      answer: 1,
      explain: '2025 年 10 月 1 日发行首张专辑《Letters》（BLUE TRIP 是路演/演唱会名，Nostalgia 是写真集）。',
    },
    {
      id: 'q10',
      level: 'hard',
      prompt: '她不只唱歌，还接下过作曲工作，例如？',
      options: [
        '《潜在表明》',
        '《迷星叫》',
        'TV 动画《卡片战斗先导者 will+Dress 3》ED《BLUE BUD》',
        '《夢浮橋-ユメノウキハシ-》',
      ],
      answer: 2,
      explain: '她为自己演唱的《BLUE BUD》负责作曲，这首歌是《卡片战斗先导者 will+Dress 3》的 ED。',
    },
    {
      id: 'q11',
      level: 'hard',
      prompt: '2025 年上海个人专场时，她才得知中国粉丝给她的昵称是？',
      options: ['青木老师', '小鸟', '皮尤', '圣青木'],
      answer: 3,
      explain: '她在上海兰心大戏院的首次海外个人专场上，才知道自己被叫作「圣青木」。',
    },
    {
      id: 'q12',
      level: 'hard',
      prompt: '她大学二外学的是德语，后来这段经历正好派上了用场——用在了哪里？',
      options: [
        '中等部舞台的开场曲选用了德语歌剧《夜后咏叹调》',
        '她去德国留过学',
        '她给一部德语动画配过音',
        '她用德语主持过广播节目',
      ],
      answer: 0,
      explain: '中等部舞台选曲时，因为学过德语，她从偏意大利语的曲目单里被选中唱《夜后咏叹调》作为开场曲。',
    },
  ],
} satisfies SeiyuuQuizBank;
