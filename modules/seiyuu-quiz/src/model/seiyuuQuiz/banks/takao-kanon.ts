import type { SeiyuuQuizBank } from '../types';

/**
 * 高尾奏音（丰川祥子 / Oblivionis）题库。
 * 资料：萌娘百科 https://zh.moegirl.org.cn/高尾奏音
 */
export default {
  id: 'takao-kanon',
  groups: ['avemujica'],
  intro: 'Ave Mujica 的键盘 Oblivionis / 丰川祥子。米兰钢琴比赛最高奖得主，生活常识界的传说。',
  questions: [
    {
      id: 'q1',
      level: 'easy',
      prompt: '高尾奏音在 BanG Dream! 里饰演的角色是？',
      options: ['若叶睦', '丰川祥子', '三角初华', '八幡海铃'],
      answer: 1,
      explain: '她饰演 Ave Mujica 的键盘手丰川祥子（代号 Oblivionis）。',
    },
    {
      id: 'q2',
      level: 'easy',
      prompt: '高尾奏音的生日是？',
      options: ['2003 年 2 月 18 日', '1996 年 5 月 19 日', '2002 年 9 月 10 日', '1997 年 11 月 10 日'],
      answer: 2,
      explain: '2002 年 9 月 10 日生。',
    },
    {
      id: 'q3',
      level: 'easy',
      prompt: '她在 Ave Mujica 里负责的乐器是？',
      options: ['吉他', '贝斯', '鼓', '键盘'],
      answer: 3,
      explain: '她是乐队的键盘手。',
    },
    {
      id: 'q4',
      level: 'easy',
      prompt: '高尾奏音所属的事务所是？',
      options: ['Ancheri（与大西亚玖璃同社）', '响 HiBiKi', 'Honeycomb Entertainment', 'Ace Crew Entertainment'],
      answer: 0,
      explain: '她 2025 年 3 月 31 日移籍至 Ancheri，与大西亚玖璃同社，两人关系「亲如姐妹」。',
    },
    {
      id: 'q5',
      level: 'normal',
      prompt: '她从小就练钢琴，拿过的最高荣誉是？',
      options: [
        '肖邦国际钢琴比赛少年组冠军',
        '米兰国际少年钢琴竞演会最高位 ASSOLUTO 奖',
        '全日本钢琴比赛金奖',
        '她没有拿过任何钢琴奖项',
      ],
      answer: 1,
      explain: '2013 年她在米兰国际少年钢琴竞演会获得最高位的 ASSOLUTO 奖，钢琴实力接近职业级。',
    },
    {
      id: 'q6',
      level: 'normal',
      prompt: '她的哥哥高尾奏之介是？',
      options: ['著名声优', '作曲家兼指挥', '钢琴家', '职业棒球选手'],
      answer: 2,
      explain: '哥哥是钢琴家，她的钢琴之路也受哥哥影响，兄妹俩在家共用同一架钢琴。',
    },
    {
      id: 'q7',
      level: 'normal',
      prompt: '她 2025 年大学毕业时的毕业论文写的是谁？',
      options: ['德彪西', '巴赫', '贝多芬', '莫里斯·拉威尔'],
      answer: 3,
      explain: '她的毕业论文研究拉威尔作品里的旋法使用变迁，还被评为优秀毕业论文。',
    },
    {
      id: 'q8',
      level: 'normal',
      prompt: '以下哪件事是她「缺乏生活常识」的著名例子？',
      options: [
        '不知道苹果中间有核，而且不会用自动售货机',
        '把洗衣机当成烤箱用',
        '不认识自己事务所的名字',
        '以为手机可以当遥控器开空调',
      ],
      answer: 0,
      explain: '她还以为西瓜天生就是三角形切片、烧开水要半小时、烤薄饼看着也会烤焦，被家里人在线吐槽。',
    },
    {
      id: 'q9',
      level: 'hard',
      prompt: '2024 年 2 月 14 日（丰川祥子生日）她发了一段钢琴视频，弹的是？',
      options: [
        '《致爱丽丝》',
        '贝多芬《月光》第三乐章',
        '肖邦《幻想即兴曲》',
        '拉威尔《悼念公主的帕凡舞曲》',
      ],
      answer: 1,
      explain: '《月光》第三乐章正是动画里出现过的那一段，她用钢琴给角色庆生。',
    },
    {
      id: 'q10',
      level: 'hard',
      prompt: '她在 Ave Mujica 演唱会上的一个动作成了名场面，是？',
      options: [
        '一边弹键盘一边跳舞',
        '用键盘弹奏其他成员的乐器部分',
        '反向弹键盘，姿势被吐槽形似烤肉摊主',
        '整场背对观众弹奏',
      ],
      answer: 2,
      explain: '她多次表演反向弹键盘，因为姿势太像烤肉摊主而「风评被害」。',
    },
    {
      id: 'q11',
      level: 'hard',
      prompt: '她走上声优之路的契机作品是？',
      options: ['《凉宫春日的忧郁》', '《进击的巨人》', '《夏目友人帐》', '《轻音少女》'],
      answer: 3,
      explain: '她练琴到很晚时，会看哥哥录下来的《轻音少女》，因此深受感动。',
    },
    {
      id: 'q12',
      level: 'hard',
      prompt: '她在中国上海首次粉丝见面会上弹唱了哪两首歌？',
      options: [
        '《爱上你万岁》和《Snow Halation》',
        '《START:DASH!!》和《No brand girls》',
        '《夏色えがおで1,2,Jump!》和《Snow Halation》',
        '《Mermaid festa vol.1》和《爱上你万岁》',
      ],
      answer: 0,
      explain: '她本人是 LoveLive! 粉丝、憧憬三森铃子，在上海的首次粉丝见面会上弹唱了《爱上你万岁》和《Snow Halation》。',
    },
  ],
} satisfies SeiyuuQuizBank;
