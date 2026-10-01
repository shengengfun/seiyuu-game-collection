/**
 * 「声优问答」的企划分组。
 *
 * 选人界面按这里的顺序分组展示，虹咲排在最前面。
 * 每套题库可以在自己的文件里声明 `groups: ['nijigasaki']`（可以多个，跨界声优就填多个）；
 * 没声明的按名册的 `project` 走 `PROJECT_GROUP_FALLBACK` 兜底。
 *
 * 新增一个团：在 `QUIZ_GROUP_IDS` 里加 id（顺序即展示顺序）→ 三语补 `seiyuuQuiz.groups.<id>` 文案
 * → 在对应题库文件里声明 `groups`。
 */

import { PROJECT_IDS, type ProjectId } from '@seiyuu/shared';

export const QUIZ_GROUP_IDS = [
  /* ---- LoveLive! 系列 ---- */
  'nijigasaki',
  'mus',
  'aqours',
  'liella',
  'hasunosora',
  'lovelive',
  /* ---- BanG Dream! 系列 ---- */
  'mygo',
  'avemujica',
  'bandori',
  /* ---- 其他企划 ---- */
  'pjsk',
  'revuestar',
  'idolmaster',
  'gakuen',
  'umamusume',
  'd4dj',
  /* ---- 彩蛋嘉宾 ---- */
  'extra',
] as const;

export type QuizGroupId = (typeof QUIZ_GROUP_IDS)[number];

export function isQuizGroupId(value: string): value is QuizGroupId {
  return (QUIZ_GROUP_IDS as readonly string[]).includes(value);
}

/** 没在题库里显式声明分组时，按名册的企划兜底。 */
export const PROJECT_GROUP_FALLBACK: Record<ProjectId, QuizGroupId> = {
  lovelive: 'lovelive',
  bangdream: 'bandori',
  pjsk: 'pjsk',
  idolmaster: 'idolmaster',
  gakuen: 'gakuen',
  umamusume: 'umamusume',
  revuestar: 'revuestar',
  d4dj: 'd4dj',
};

/** 企划合法校验（拉进来给 index.ts 用，免得两处各写一份）。 */
export function isProjectIdChecked(value: string): value is ProjectId {
  return (PROJECT_IDS as readonly string[]).includes(value);
}
