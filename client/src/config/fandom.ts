/**
 * 站内「主推范围」：拉（LoveLive）邦（BanG Dream）歌（少女☆歌剧）偶（偶像大师）
 * 马（赛马娘）+ PJSK + D4DJ。
 *
 * 「我喜欢你」「声优粉宾果」的候选都用这一份；
 * 声优关系网用全名册（关系越多越好玩）。想调整范围只改这里一处。
 */

import { SEIYUU_ROSTER, type ProjectId } from '@seiyuu/shared';

/** 主推企划（学园偶像大师归在「偶」里）。 */
export const FANDOM_PROJECT_IDS: ProjectId[] = [
  'lovelive',
  'bangdream',
  'revuestar',
  'idolmaster',
  'gakuen',
  'umamusume',
  'pjsk',
  'd4dj',
];

/** 主推范围内的声优 id（主企划或兼籍命中即算）。 */
export const FANDOM_IDS: string[] = SEIYUU_ROSTER.filter(
  (identity) =>
    FANDOM_PROJECT_IDS.includes(identity.project) ||
    (identity.alsoIn ?? []).some((project) => FANDOM_PROJECT_IDS.includes(project)),
).map((identity) => identity.id);

/**
 * 按企划分组的候选池：某位声优主企划命中的组里出现一次，兼籍的组里也各出现一次。
 * 开局前勾选企划时用来拼名单（同一个人可能被多个企划同时选中，所以拼完要去重）。
 */
export const FANDOM_MEMBERS_BY_PROJECT: Map<ProjectId, string[]> = (() => {
  const map = new Map<ProjectId, string[]>();
  for (const project of FANDOM_PROJECT_IDS) map.set(project, []);
  for (const identity of SEIYUU_ROSTER) {
    const groups = new Set<ProjectId>([identity.project, ...(identity.alsoIn ?? [])]);
    for (const project of groups) {
      const bucket = map.get(project);
      if (bucket) bucket.push(identity.id);
    }
  }
  return map;
})();

/** 勾选的企划合起来能出场的名单（保持 FANDOM_IDS 的原顺序，方便复现）。 */
export function fandomPool(projects: ProjectId[]): string[] {
  const picked = new Set<string>();
  for (const project of projects) {
    for (const id of FANDOM_MEMBERS_BY_PROJECT.get(project) ?? []) picked.add(id);
  }
  return FANDOM_IDS.filter((id) => picked.has(id));
}

/** 某位声优在主推范围里吗。 */
export function isFandom(id: string): boolean {
  return FANDOM_IDS.includes(id);
}
