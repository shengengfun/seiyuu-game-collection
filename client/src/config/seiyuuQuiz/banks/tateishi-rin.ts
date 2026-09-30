import type { SeiyuuQuizBank } from '../types';

/**
 * 立石凛（千早爱音）题库。
 * 资料：萌娘百科 https://zh.moegirl.org.cn/立石凛
 */
export default {
  id: 'tateishi-rin',
  groups: ['mygo'],
  intro: 'MyGO!!!!! 的吉他手千早爱音。算盘、圆周率后 100 位、无畏契约——标准的电竞少女。',
  questions: [
    {
      id: 'q1',
      level: 'easy',
      prompt: '立石凛在 MyGO!!!!! 里饰演的角色是？',
      options: ['高松灯', '千早爱音', '要乐奈', '长崎爽世'],
      answer: 1,
      explain: '她饰演吉他手千早爱音，2023 年 4 月 9 日正式公布。',
    },
    {
      id: 'q2',
      level: 'easy',
      prompt: '立石凛的生日是？',
      options: ['2000 年 3 月 26 日', '2002 年 5 月 15 日', '2001 年 7 月 10 日', '1999 年 12 月 22 日'],
      answer: 2,
      explain: '2001 年 7 月 10 日生。',
    },
    {
      id: 'q3',
      level: 'easy',
      prompt: '立石凛所属的事务所是？',
      options: ['青二事务所', 'LIBERTE', 'Stay Luck', '响 HiBiKi'],
      answer: 3,
      explain: '她 2021 年 2 月通过联合试镜加入响 HiBiKi，同期加入的还有 MyGO!!!!! 的队友青木阳菜。',
    },
    {
      id: 'q4',
      level: 'easy',
      prompt: '她在乐队里演奏的乐器是？',
      options: ['吉他', '贝斯', '鼓', '键盘'],
      answer: 0,
      explain: '她是 MyGO!!!!! 的吉他手。',
    },
    {
      id: 'q5',
      level: 'normal',
      prompt: '以下哪一项是她写进资料的「特长」？',
      options: [
        '低音单簧管与调理师免许',
        '算盘、背诵圆周率小数点后 100 位、嘻哈舞',
        '叉车与电弧焊',
        '水肺潜水与肉类鉴定 2 级',
      ],
      answer: 1,
      explain: '她小学学过珠心算，能秒算五个三位数相加，特长里还写着背诵圆周率后 100 位与嘻哈舞。',
    },
    {
      id: 'q6',
      level: 'normal',
      prompt: '她读的大学与学部是？',
      options: [
        '东京电机大学理工部机械工学科',
        '大阪艺术大学放送学科',
        '立教大学现代心理学部影像身体学科',
        '埼玉艺术综合音乐高校音乐科',
      ],
      answer: 2,
      explain: '她 2024 年 3 月从立教大学现代心理学部影像身体学科毕业。',
    },
    {
      id: 'q7',
      level: 'normal',
      prompt: '关于她的口音，有个有趣的细节是？',
      options: [
        '她完全不会说方言',
        '她只在广播里故意说关西腔',
        '她永远说关西腔，不会标准话',
        '她一个人待着时会自动说关西腔，出门就切换成标准话',
      ],
      answer: 3,
      explain: '她是关西人，独处时说话会自然变成关西腔，一出门就自动切回标准话。',
    },
    {
      id: 'q8',
      level: 'normal',
      prompt: '她作为游戏玩家最出名的一点是？',
      options: [
        '重度 FPS 玩家，热爱《无畏契约》，还加入了声优 e-Sports 部',
        '只玩音游，从不碰其他游戏',
        '完全不玩游戏',
        '只玩手机游戏',
      ],
      answer: 0,
      explain: '她是《无畏契约》重度玩家，去过东京大师赛现场，2024 年 4 月加入声优 e-Sports 部，为了看比赛能早上四点起床。',
    },
    {
      id: 'q9',
      level: 'normal',
      prompt: '关于她的饮食习惯，下面哪个说法是对的？',
      options: [
        '她一周要吃三次荞麦面',
        '她一周有两三天去旋转寿司店',
        '她每天都要吃纳豆',
        '她讨厌寿司',
      ],
      answer: 1,
      explain: '她喜欢寿司（一周两三天去旋转寿司）、吃辣和喝酒，但不喜欢蘸酱、荞麦面和纳豆。',
    },
    {
      id: 'q10',
      level: 'hard',
      prompt: '她晒过的「平安夜菜单」是？',
      options: ['披萨配可乐', '火锅配清酒', '墨鱼素面配啤酒', '蜜瓜包配牛奶'],
      answer: 2,
      explain: '她平安夜吃的是墨鱼素面加啤酒，被队友青木阳菜吐槽「这不是就像大叔晚上小酌一样吗」。',
    },
    {
      id: 'q11',
      level: 'hard',
      prompt: '她矫正近视用的是什么方式？',
      options: [
        '激光近视手术（LASIK）',
        '角膜塑形镜',
        '没有做过任何矫正',
        'ICL 晶体植入手术',
      ],
      answer: 3,
      explain: '她原先近视，2023 年 2 月通过 ICL 手术完成矫正。',
    },
    {
      id: 'q12',
      level: 'hard',
      prompt: '2025 年 4 月与 Ave Mujica 的对邦前，她做了什么让粉丝印象深刻的事？',
      options: [
        '把手指练到脱皮',
        '为了舞台效果剪短了头发',
        '临时学会了弹钢琴',
        '把电吉他换成了木吉他',
      ],
      answer: 0,
      explain: '她非常重视那场对邦，练习量大到手指都练到脱皮。',
    },
  ],
} satisfies SeiyuuQuizBank;
