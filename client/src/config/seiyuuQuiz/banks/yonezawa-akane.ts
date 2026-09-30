import type { SeiyuuQuizBank } from '../types';

/**
 * 米泽茜（祐天寺若麦 / Amoris）题库。
 * 资料：萌娘百科 https://zh.moegirl.org.cn/米泽茜
 */
export default {
  id: 'yonezawa-akane',
  groups: ['avemujica'],
  intro: 'Ave Mujica 的鼓手 Amoris / 祐天寺若麦。九岁开始打鼓、双利手，还是邦邦第一集就追更的老粉。',
  questions: [
    {
      id: 'q1',
      level: 'easy',
      prompt: '米泽茜在 BanG Dream! 里饰演的角色是？',
      options: ['三角初华', '祐天寺若麦', '八幡海铃', '丰川祥子'],
      answer: 1,
      explain: '她饰演 Ave Mujica 的鼓手祐天寺若麦（代号 Amoris），还担任了动画第 13 集 Live 的动捕。',
    },
    {
      id: 'q2',
      level: 'easy',
      prompt: '米泽茜的生日是哪一天？',
      options: ['1996 年 5 月 19 日', '1997 年 11 月 10 日', '1998 年 12 月 31 日', '2002 年 9 月 10 日'],
      answer: 2,
      explain: '1998 年 12 月 31 日生——正好是跨年夜。',
    },
    {
      id: 'q3',
      level: 'easy',
      prompt: '她在 Ave Mujica 里负责的乐器是？',
      options: ['吉他', '贝斯', '键盘', '鼓'],
      answer: 3,
      explain: '她是乐队的鼓手。',
    },
    {
      id: 'q4',
      level: 'easy',
      prompt: '她从几岁开始学习鼓乐？',
      options: ['9 岁', '5 岁', '14 岁', '18 岁'],
      answer: 0,
      explain: '她 9 岁开始学鼓，小学、中学、高中的吹奏乐部都担任打击乐手。',
    },
    {
      id: 'q5',
      level: 'normal',
      prompt: '在加入 Ave Mujica 之前，她担任过鼓手的乐队是？',
      options: ['Lyrical Lily', 'TRY TRY NIICHE', 'Re-connect', 'Merm4id'],
      answer: 1,
      explain: '她 2019 年加入 TRY TRY NIICHE 当鼓手（当时艺名あばぬん），2020 年毕业后转为个人活动。',
    },
    {
      id: 'q6',
      level: 'normal',
      prompt: '她有个身体特征直接影响了角色设定，是？',
      options: [
        '她是色盲，角色的眼睛颜色因此改过',
        '她有绝对音感，角色的音乐设定因此改过',
        '她是左撇子，原本设定为右手的祐天寺若麦因此被改成双手都能打鼓',
        '她身材特别高挑，角色的身高因此改过',
      ],
      answer: 2,
      explain: '她原本是左撇子（最初学鼓用右手，后来双手都熟练），脚本家取材时采纳了这一点，把祐天寺若麦设定成双利手。',
    },
    {
      id: 'q7',
      level: 'normal',
      prompt: '以下哪一项是她的特技？',
      options: ['单手倒立', '口技', '边弹吉他边唱', '边打鼓边唱歌'],
      answer: 3,
      explain: '她的特技是边打鼓边唱歌，另外还会弹吉他和钢琴。',
    },
    {
      id: 'q8',
      level: 'normal',
      prompt: '从 TRY TRY NIICHE 毕业、等待 Ave Mujica 公布的那段时间，她做什么工作？',
      options: ['培训机构架子鼓讲师', '超市店员', '手机店销售', '广播电台助理'],
      answer: 0,
      explain: '她一边在培训机构教鼓，一边为 Ave Mujica 的鼓手工作做准备。',
    },
    {
      id: 'q9',
      level: 'normal',
      prompt: '她本人是 BanG Dream! 系列的老粉，最喜欢的角色是？',
      options: [
        '市谷有咲与冰川纱夜',
        '弦卷心与宇田川亚子',
        '高松灯与千早爱音',
        '凑友希那与白金燐子',
      ],
      answer: 1,
      explain: '她从动画第一集开播就实时追更，最喜欢弦卷心和宇田川亚子，常在推特晒抽卡与手办。',
    },
    {
      id: 'q10',
      level: 'hard',
      prompt: '她的血统是？',
      options: ['日美混血', '日菲混血', '日俄混血（1/8 俄罗斯血统）', '纯日本血统'],
      answer: 2,
      explain: '她是日俄混血，有 1/8 的俄罗斯血统。',
    },
    {
      id: 'q11',
      level: 'hard',
      prompt: '她脸上有个被同学围观过的特征，是？',
      options: ['右嘴角有一颗心形的痣', '左耳后有一块胎记', '右眉上有一道疤', '左眼角有一颗星形的痣'],
      answer: 3,
      explain: '小学时同学发现她左眼角的痣是星形的，全班都跑来看，她当时很尴尬，现在觉得很有趣。',
    },
    {
      id: 'q12',
      level: 'hard',
      prompt: '关于她打鼓的理念，下面哪个说法是对的？',
      options: [
        '她追求「不依赖各种设备，看自己能做到什么程度」，出道时用最简单的单踏板配置',
        '她一开始就追求最复杂的双踩与电子鼓配置',
        '她坚持每场演出都换一套不同的鼓组',
        '她不用鼓棒，坚持用手打',
      ],
      answer: 0,
      explain: '她原本只用单踏板加低音鼓的简单配置；加入 BanG Dream! 后反而开始尝试以前绝不会做的事，比如打鼓时转鼓棒。',
    },
  ],
} satisfies SeiyuuQuizBank;
