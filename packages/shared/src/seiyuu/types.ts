import type { ProjectId } from './projects';

/** 代表角色：角色名 + 作品名，均用简体中文译名（与站内文案一致）。 */
export interface RepresentativeCharacter {
  /** 角色名（简体中文译名）。 */
  name: string;
  /**
   * 角色名（日文原名）。用来对照服务端声优库的 `representative_characters`，
   * 由 `scripts/verify-seiyuu.mjs` 自动核对，写错会直接报出来。
   */
  nameJa?: string;
  /** 作品名（简体中文译名）。 */
  work: string;
}

/**
 * 声优身份档案：只有客观身份信息，不含任何测验用的主观打分。
 *
 * 测验画像分（气质六维等）属于具体玩法的数据，按 `id` 关联即可，不要塞进这里。
 */
export interface SeiyuuIdentity {
  /**
   * 稳定 slug。同时决定公式照文件名：`client/public/seiyuu/<id>.jpg`。
   * 改名会连带需要重命名图片文件，非必要不要改。
   */
  id: string;
  /** 简体中文译名（与站内声优库、搜索结果保持一致）。 */
  name: string;
  /** 日文官方表记，用于跨语言核对。 */
  nameJa: string;
  /** 罗马字，长音/促音按官方表记。 */
  romaji: string;
  /** 主要所属企划（跨界声优取测验采用的那个）。 */
  project: ProjectId;
  /**
   * 除主要企划外还属于哪些企划（跨界声优）。
   *
   * 例：矢野妃菜喜同时是虹咲（LoveLive!）的高咲仿与赛马娘的北部玄驹，
   * 主要记赛马娘，LoveLive! 就写在这里。校验脚本会用这个字段避免误报企划不符。
   */
  alsoIn?: ProjectId[];
  /** 代表角色，第一项为主要代表角色。 */
  characters: RepresentativeCharacter[];
}

/** 把角色渲染成「角色（作品）」的一行文本。 */
export function formatCharacter(character: RepresentativeCharacter): string {
  return `${character.name}（${character.work}）`;
}

/** 主要代表角色（可能为空数组，调用方需兜底）。 */
export function primaryCharacter(identity: SeiyuuIdentity): RepresentativeCharacter | undefined {
  return identity.characters[0];
}
