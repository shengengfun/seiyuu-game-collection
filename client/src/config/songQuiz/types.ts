import type { SongGroupId } from './groups';

/** 「猜歌」曲库与玩法的类型定义。 */

/** 玩法难度：轻松 5 首 / 标准 10 首 / 硬核 20 首 / 专家（全题库 + 三颗红心）。 */
export type SongDifficulty = 'easy' | 'normal' | 'hard' | 'expert';

/** 一首收录曲：只保留猜歌需要的客观信息，试听一律由服务端或 iTunes 换取。 */
export interface SongQuizSong {
  /** iTunes trackId（试听链接由 `/api/song-quiz/previews` 按它换取）。 */
  id: number;
  /** 歌名（日文原名，选项直接显示它）。 */
  title: string;
  /** 演唱者（iTunes 原始表记；角色曲会写成「鐘 嵐珠 (CV.法元明菜)」这种形式）。 */
  artist: string;
  /** 收录专辑。 */
  album: string;
  /** 发行日期 `YYYY-MM-DD`，用来按年代排序与避免同名曲重复收录。 */
  releaseDate: string;
}

/** 一道题：一首歌 + 四个歌名选项。 */
export interface SongQuizQuestion {
  song: SongQuizSong;
  /** 四个选项（含正答），已打乱并轮转过正答位置。 */
  options: string[];
  /** 正答在 `options` 中的下标。 */
  answer: number;
}

/** 一局：同一 seed 必然还原出同一局（成绩码依赖这个性质）。 */
export interface SongQuizRound {
  group: SongGroupId;
  difficulty: SongDifficulty;
  seed: number;
  questions: SongQuizQuestion[];
  /** 本局要换试听链接的 trackId（去重，按题目顺序）。 */
  trackIds: number[];
}
