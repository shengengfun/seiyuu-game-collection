import { PROJECT_IDS, type ProjectId } from './projects';
import { SEIYUU_ROSTER } from './roster';
import type { SeiyuuIdentity } from './types';

export * from './projects';
export * from './roster';
export * from './types';
export * from './agencies';

/** id -> 档案，用于结果码回查、排行榜渲染等 O(1) 场景。 */
export const SEIYUU_BY_ID: ReadonlyMap<string, SeiyuuIdentity> = new Map(
  SEIYUU_ROSTER.map((identity) => [identity.id, identity]),
);

export function seiyuuById(id: string): SeiyuuIdentity | undefined {
  return SEIYUU_BY_ID.get(id);
}

/** 按企划分组（保持 PROJECT_IDS 的顺序，便于稳定渲染）。 */
export function seiyuuByProject(project: ProjectId): SeiyuuIdentity[] {
  return SEIYUU_ROSTER.filter((identity) => identity.project === project);
}

/** 每个企划各有哪些人，键顺序与 PROJECT_IDS 一致。 */
export const SEIYUU_GROUPED: Record<ProjectId, SeiyuuIdentity[]> = PROJECT_IDS.reduce(
  (grouped, project) => {
    grouped[project] = seiyuuByProject(project);
    return grouped;
  },
  {} as Record<ProjectId, SeiyuuIdentity[]>,
);

/** 公式照 URL（相对站点的绝对路径）。 */
export function seiyuuPhotoPath(id: string): string {
  return `/seiyuu/${id}.jpg`;
}
