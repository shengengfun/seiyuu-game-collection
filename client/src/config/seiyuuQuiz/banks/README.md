# 声优问题库（banks）

一套题库 = 一位声优的个人常识题，一个文件一个人：`banks/<声优 id>.ts`。

**目标题量：每位声优 48 题左右**——快速 8 题、真爱 16 题都是 从池子里随机抽，单推
**模式把整套答完，所以题库越大越好玩；暂时没到 48 题也能用，只是单推模式会短一些。

题量分两层：

- **手写题**（`banks/<id>.ts`）：经历、爱好、特长、轶事、人际关系，12 题起步，越多越好。
- **自动派生题**（`banks/generated/<id>.ts`）：由 `tmp/gen-works-questions.mjs` 从萌娘百科「出演作品」
  小节生成（角色 / 作品四类题），**文件带「自动生成，不用手改」标记，重跑会覆盖**；
  注册时按 `id` 接在手写题后面。
  **它只是补充：每人最多 12 题**，同一部作品 / 同一个角色不会问两遍——因为只问「演过哪部」的话
  一套题就全是这个，含金量不够（2026-09-23 用户反馈）。想加题量请写手写题
  （`TARGET` / `MAX_GENERATED` / `MIX` 见脚本顶部）。

跑法：抓完资料后依次 `node tmp/moegirl-digest.mjs` → `node tmp/gen-works-questions.mjs`。

## 怎么加人 / 加题

1. **加题**：打开对应文件，往 `questions` 数组里追加一条。`id` 在同一文件内唯一即可（建议 `q13`、`q14` 顺延），
   `answer` 是**正确选项在 `options` 里的下标（从 0 开始）**。
2. **加人**：把文件丢进这个目录就行——`config/seiyuuQuiz/index.ts` 用 `import.meta.glob('./banks/*.ts')`
   自动注册，不需要改任何索引文件。
3. **改完自检**：`pnpm --filter client test seiyuuQuiz` 会校验
   「id 能在 `@seiyuu/shared` 名册里找到」「选项 2~4 个且不重复」「答案下标合法」「难度取值合法」「题干/解析非空」。

## 企划分组

选人界面按企划分组展示（虹咲排最前），每条题库用 `groups` 声明自己属于哪些组：

- 取值见 `../groups.ts` 的 `QUIZ_GROUP_IDS`（`nijigasaki` / `mygo` / `avemujica` …）。
- **跨界声优可以填多个**，例：林鼓子 → `groups: ['nijigasaki', 'mygo']`（既是二代目优木雪菜，也是 MyGO!!!!! 的鼓手）。
- 不填就按名册里的 `project` 兜底（`lovelive` / `bangdream` / `pjsk` …）。
- 新增一个团：先在 `groups.ts` 的 `QUIZ_GROUP_IDS` 里加 id，再补三语 `seiyuuQuiz.groups.<id>` 文案。

## 文件模板

```ts
import type { SeiyuuQuizBank } from '../types';

/** 某某（角色名）题库。资料：萌娘百科 https://zh.moegirl.org.cn/xxx */
export default {
  id: 'seiyuu-id',            // 必须与 shared/src/seiyuu/roster.ts 的 id 一致
  groups: ['nijigasaki'],     // 所属企划分组（跨界声优可填多个），见 ../groups.ts
  intro: '一句话导语，展示在答题前的声优卡片上。',
  questions: [
    {
      id: 'q1',
      level: 'easy',          // easy 1 分 / normal 1.5 分 / hard 2 分
      prompt: '题干？',
      options: ['A', 'B', 'C', 'D'],
      answer: 0,              // 正确项下标
      explain: '解析：答错时告诉玩家正确说法。',
      // source: 'https://zh.moegirl.org.cn/xxx#小节',   // 可选，方便日后校对
    },
  ],
} satisfies SeiyuuQuizBank;
```

## 出题约定

- **只写中文**：`prompt` / `options` / `explain` 写简体中文，en/ja 由 UI 自动回退中文；
  以后想补译，直接在题目里加 `l10n: { ja: { prompt, options, explain } }`，无需改动框架代码。
- **选项不打乱**：展示顺序就是 `options` 的顺序，所以解析里可以直接写「B 选项的…」。
  出题时请把正确答案的位置分散开（每套 A/B/C/D 大致均匀，别老是放第一个）。
- **难度配比**：大致 1/3 简单、1/3 普通、1/3 困难。
  简单题给「路人也能蒙对」的（生日/代表角色/所属企划），困难题给需要长期关注的梗（生放送轶事、人际关系、冷门经历）。
- **来源可靠**：事实以萌娘百科条目为准，别写没有出处的传闻；拿不准就换个题。
