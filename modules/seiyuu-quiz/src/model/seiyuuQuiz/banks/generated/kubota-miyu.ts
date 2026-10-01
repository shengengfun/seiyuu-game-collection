import type { SeiyuuQuizQuestion } from '../../types';

/**
 * 【自动生成，不用手改】久保田未梦 的「出演作品」派生题。
 *
 * 由 `tmp/gen-works-questions.mjs` 从萌娘百科「出演作品」小节生成，
 * 重新跑一遍会覆盖本文件；想手改请改手写题库（`../kubota-miyu.ts`）。
 * 来源：https://zh.moegirl.org.cn/%E4%B9%85%E4%BF%9D%E7%94%B0%E6%9C%AA%E6%A2%A6
 */
export const worksQuestions: SeiyuuQuizQuestion[] = [
    {
      id: 'w1',
      level: 'normal',
      prompt: '她在《美妙天堂 大～家的憧憬♪Let\'s Go☆美妙巴黎》里饰演的角色是？',
      options: ['伐罪狙击手', '奥津かがみ', '北条索菲', '月下真奈'],
      answer: 2,
      explain: '《美妙天堂 大～家的憧憬♪Let\'s Go☆美妙巴黎》里她配的是北条索菲。',
    },
    {
      id: 'w2',
      level: 'normal',
      prompt: '《邪神与厨二病少女\' 千岁篇》中，她配音的角色是？',
      options: ['ロスヴァイセ、ヴァルトラウテ', '奈々', '美杜莎', '北条索菲、花'],
      answer: 2,
      explain: '《邪神与厨二病少女\' 千岁篇》里她配的是美杜莎。',
    },
    {
      id: 'w3',
      level: 'normal',
      prompt: '她为《モン娘☆は〜れむ》配的角色是？',
      options: ['ミユーテン', '春待姬', '美杜莎', '月下真奈'],
      answer: 2,
      explain: '《モン娘☆は〜れむ》里她配的是美杜莎。',
    },
    {
      id: 'w4',
      level: 'normal',
      prompt: '她在《錬神のアストラル》里饰演的角色是？',
      options: ['修女莉莉', 'シスター・ヴィクトワール', '唐林弦叶', '早乙女瑠衣'],
      answer: 1,
      explain: '《錬神のアストラル》里她配的是シスター・ヴィクトワール。',
    },
    {
      id: 'w5',
      level: 'normal',
      prompt: '《虹四动画 第13~15话》中，她配音的角色是？',
      options: ['春待姬', '朝香果林', '时任依乃里', '蒂诺‧薛德'],
      answer: 1,
      explain: '《虹四动画 第13~15话》里她配的是朝香果林。',
    },
    {
      id: 'w6',
      level: 'normal',
      prompt: '以下哪个角色是她饰演过的？',
      options: ['星川织姬', '女仆B', 'オリヒメ', '木户步美'],
      answer: 3,
      explain: '木户步美是她配过的角色，其余三个是其他声优的角色。',
    },
    {
      id: 'w7',
      level: 'normal',
      prompt: '下列角色中，哪一个由她配音？',
      options: ['あけび', '静山麻白', '丹羽茜渚', '早川仁奈'],
      answer: 0,
      explain: 'あけび是她配过的角色，其余三个是其他声优的角色。',
    },
    {
      id: 'w8',
      level: 'normal',
      prompt: '她配过下面哪个角色？',
      options: ['竹千代', '大河久留美', '森阳万里', '浅草多多'],
      answer: 3,
      explain: '浅草多多是她配过的角色，其余三个是其他声优的角色。',
    },
    {
      id: 'w9',
      level: 'hard',
      prompt: '以下哪部作品她没有出演？',
      options: ['Pretty Rhythm Rainbow Live', 'リボルバーズエイト', '情热传说 the X', '叹气的亡灵想隐退 第2季'],
      answer: 2,
      explain: '《情热传说 the X》与她无关；另外三部她都出演过。',
    },
    {
      id: 'w10',
      level: 'hard',
      prompt: '下面哪部作品与她无关？',
      options: ['波力Poli', '放置少女～百花缭乱的萌姬物语', '精灵小姐瘦不了。', '青春歌舞伎'],
      answer: 1,
      explain: '《放置少女～百花缭乱的萌姬物语》与她无关；另外三部她都出演过。',
    },
    {
      id: 'w11',
      level: 'easy',
      prompt: '她出演过下面哪部作品？',
      options: ['难以启"齿"之恋', '黑潮：深海觉醒', '言靈戰士', '卡拉彼丘'],
      answer: 2,
      explain: '她出演过《言靈戰士》；其余三部与她无关。',
    },
    {
      id: 'w12',
      level: 'easy',
      prompt: '以下哪部作品有她的配音？',
      options: ['かんぱに☆ガールズ', '虹四动画', '禁忌咒纹', '声技の英雄'],
      answer: 1,
      explain: '她出演过《虹四动画》；其余三部与她无关。',
    },
];

export default { id: 'kubota-miyu', questions: worksQuestions };
