/**
 * 企划（作品系列）定义。
 *
 * 这里是全站唯一的企划分组来源：测验分组、公共库筛选、未来的统计/检索都应引用它，
 * 不要在各自模块里再抄一份 id 列表。
 */

export const PROJECT_IDS = [
  'lovelive',
  'bangdream',
  'pjsk',
  'idolmaster',
  'gakuen',
  'umamusume',
  'revuestar',
  'd4dj',
] as const;

export type ProjectId = (typeof PROJECT_IDS)[number];

export interface ProjectMeta {
  id: ProjectId;
  /** i18n 键后缀，文案位于 `whoYouAre.projects.<id>` 等命名空间。 */
  labelKey: string;
  /** 官方/常见日文写法，便于跨语言核对与检索。 */
  nameJa: string;
  /** 英文写法。 */
  nameEn: string;
}

export const PROJECTS: Record<ProjectId, ProjectMeta> = {
  lovelive: { id: 'lovelive', labelKey: 'lovelive', nameJa: 'ラブライブ！', nameEn: 'Love Live!' },
  bangdream: { id: 'bangdream', labelKey: 'bangdream', nameJa: 'BanG Dream!', nameEn: 'BanG Dream!' },
  pjsk: {
    id: 'pjsk',
    labelKey: 'pjsk',
    nameJa: 'プロジェクトセカイ',
    nameEn: 'Project SEKAI',
  },
  idolmaster: {
    id: 'idolmaster',
    labelKey: 'idolmaster',
    nameJa: 'アイドルマスター',
    nameEn: 'THE iDOLM@STER',
  },
  gakuen: {
    id: 'gakuen',
    labelKey: 'gakuen',
    nameJa: '学園アイドルマスター',
    nameEn: 'Gakuen iDOLM@STER',
  },
  umamusume: {
    id: 'umamusume',
    labelKey: 'umamusume',
    nameJa: 'ウマ娘 プリティーダービー',
    nameEn: 'Uma Musume Pretty Derby',
  },
  revuestar: {
    id: 'revuestar',
    labelKey: 'revuestar',
    nameJa: '少女☆歌劇 レヴュースタァライト',
    nameEn: 'Revue Starlight',
  },
  d4dj: { id: 'd4dj', labelKey: 'd4dj', nameJa: 'D4DJ', nameEn: 'D4DJ' },
};

export function isProjectId(value: string): value is ProjectId {
  return (PROJECT_IDS as readonly string[]).includes(value);
}
