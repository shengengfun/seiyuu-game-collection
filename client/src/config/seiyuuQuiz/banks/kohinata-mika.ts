import type { SeiyuuQuizBank } from '../types';

/**
 * 小日向美香（长崎爽世）题库。
 * 资料：萌娘百科 https://zh.moegirl.org.cn/小日向美香
 */
export default {
  id: 'kohinata-mika',
  groups: ['mygo'],
  intro: 'MyGO!!!!! 的贝斯手长崎爽世。蜜瓜包爱好者、前调理科学生、神社家的女儿。',
  questions: [
    {
      id: 'q1',
      level: 'easy',
      prompt: '小日向美香在 MyGO!!!!! 里饰演的角色是？',
      options: ['高松灯', '长崎爽世', '千早爱音', '要乐奈'],
      answer: 1,
      explain: '她饰演贝斯手长崎爽世，2023 年 4 月 9 日正式公布。',
    },
    {
      id: 'q2',
      level: 'easy',
      prompt: '小日向美香的生日是？',
      options: ['2002 年 5 月 15 日', '1997 年 3 月 5 日', '2000 年 3 月 14 日', '1998 年 9 月 20 日'],
      answer: 2,
      explain: '2000 年 3 月 14 日生——3 月 14 日正好是白色情人节。',
    },
    {
      id: 'q3',
      level: 'easy',
      prompt: '她在 MyGO!!!!! 里演奏的乐器是？',
      options: ['鼓', '吉他', '键盘', '贝斯'],
      answer: 3,
      explain: '她是乐队的贝斯手。',
    },
    {
      id: 'q4',
      level: 'easy',
      prompt: '小日向美香的出身地是？',
      options: ['千叶县南房总市', '静冈县滨松市', '京都府', '鸟取县'],
      answer: 0,
      explain: '千叶县南房总市出身。',
    },
    {
      id: 'q5',
      level: 'normal',
      prompt: '她老家有个挺特别的家业，是？',
      options: ['开面包店', '经营神社', '开钢琴教室', '经营牧场'],
      answer: 1,
      explain: '她家里是经营神社的，她小时候还因此认真研究过「怎么放出结界」。',
    },
    {
      id: 'q6',
      level: 'normal',
      prompt: '以下哪一组是她的「特长 / 资格」？',
      options: [
        '叉车与电弧焊',
        '水肺潜水与飞镖',
        '低音单簧管与料理',
        '钢琴与芭蕾',
      ],
      answer: 2,
      explain: '她吹了多年低音单簧管，高中读调理科、持有调理师免许，特技里也写着料理。',
    },
    {
      id: 'q7',
      level: 'normal',
      prompt: '她最喜欢、还常给它画表情发到推特的食物是？',
      options: ['拉面', '纳豆', '布丁', '蜜瓜包'],
      answer: 3,
      explain: '她极爱蜜瓜包，会画表情发推特，粉丝也常拿这个跟她互动。',
    },
    {
      id: 'q8',
      level: 'normal',
      prompt: '在正式走上声优道路之前，她经历过什么？',
      options: [
        '高中毕业后一度放弃声优梦、去超市打工（负责给鸡蛋上货），后来看到声优学校一期生招募才重新出发',
        '大学毕业后直接进了事务所，没有打过工',
        '在便利店打工时被星探发现',
        '一直在声优养成所半工半读，从没离开过这个行业',
      ],
      answer: 0,
      explain: '她高中读调理科、毕业后去超市工作，直到看到 PineS 一期生招募才决定再赌一次。',
    },
    {
      id: 'q9',
      level: 'normal',
      prompt: '她开始弹贝斯的契机是？',
      options: [
        '小时候家里就有一把贝斯',
        '高中时受《BanG Dream!》影响想组乐队，前辈送了她一把贝斯',
        '乐队临时缺人才临时学的',
        '大学社团里学的',
      ],
      answer: 1,
      explain: '她本来就是 BanG Dream! 的粉丝，高中轻音部前辈送了她一把贝斯，从此入坑。',
    },
    {
      id: 'q10',
      level: 'hard',
      prompt: '2025 年 2 月她登上《THE FIRST TAKE》时演出的曲目是？',
      options: [
        '《詩超絆》与《迷星叫》',
        '《名無声》与《栞》',
        'Crychic《春日影》与 MyGO!!!!!《潜在表明》',
        '《壱雫空》与《音一会》',
      ],
      answer: 2,
      explain: '她以长崎爽世的身份登上《THE FIRST TAKE》，演奏了 Crychic 的《春日影》与 MyGO!!!!! 的《潜在表明》。',
    },
    {
      id: 'q11',
      level: 'hard',
      prompt: '她上台前有个固定的自我鼓劲方式，是？',
      options: [
        '独自静默十分钟',
        '做一整套拉伸',
        '喝一罐啤酒',
        '请成员拥抱自己、拍打自己的后背',
      ],
      answer: 3,
      explain: 'MyGO!!!!! 上台前，她会请成员来拥抱她、拍拍她的背给自己打气。',
    },
    {
      id: 'q12',
      level: 'hard',
      prompt: '她小时候看完某部动画后认真幻想过成为什么职业？',
      options: [
        '结界师——还真的在有榻榻米的房间里正坐，试图放出结界',
        '宇航员',
        '护士',
        '职业棒球选手',
      ],
      answer: 0,
      explain: '她看了《结界师》之后想成为结界师，为此在家里正坐集中精神试图「放出结界」。',
    },
  ],
} satisfies SeiyuuQuizBank;
