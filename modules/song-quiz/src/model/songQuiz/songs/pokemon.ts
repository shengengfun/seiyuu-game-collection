import type { SongQuizSong } from '../types';

/**
 * 热门IP · pokemon 的猜歌曲库（抓取自 iTunes JP 区，含 30 秒试听）。
 *
 * 生成方式：`node tmp/fetch-song-catalog-special.mjs` → `node tmp/song-catalog-special-to-ts.mjs`，不要手改。
- 曲目来自人工挑的各 IP 代表曲（主题歌 / OP / ED），在 iTunes 定点检索后取最早的正式版本。
- 同一首歌的多个版本（BEST 盘、TV size 等）已合并，只保留最早发行的版本。
 * - `id` 是 iTunes trackId；试听地址由服务端 `/api/song-quiz/previews` 按 id 实时换取。
 * - 按发行日期升序排列。
 */
export default [
  { id: 583838497, title: "めざせポケモンマスター", artist: "松本梨香", album: "ポケモンTVアニメ主題歌 BEST OF BEST 1997-2012", releaseDate: "1997-06-28" },
  { id: 583838498, title: "ライバル!", artist: "松本梨香", album: "ポケモンTVアニメ主題歌 BEST OF BEST 1997-2012", releaseDate: "1999-03-25" },
  { id: 583838499, title: "OK!", artist: "松本梨香", album: "ポケモンTVアニメ主題歌 BEST OF BEST 1997-2012", releaseDate: "2000-02-02" },
  { id: 583838503, title: "Ready Go!", artist: "田村直美", album: "ポケモンTVアニメ主題歌 BEST OF BEST 1997-2012", releaseDate: "2002-03-29" },
  { id: 583838530, title: "Together", artist: "あきよしふみえ", album: "ポケモンTVアニメ主題歌 BEST OF BEST 1997-2012", releaseDate: "2006-11-29" },
  { id: 1668082109, title: "ハイタッチ!", artist: "サトシ(CV:松本梨香) & ヒカリ(CV:豊口めぐみ)", album: "ポケモンTVアニメ主題歌 BEST OF BEST OF BEST 1997-2023 (Selected Edition)", releaseDate: "2008-11-26" },
  { id: 1668082111, title: "サイコー・エブリデイ!", artist: "あきよしふみえ", album: "ポケモンTVアニメ主題歌 BEST OF BEST OF BEST 1997-2023 (Selected Edition)", releaseDate: "2010-02-24" },
  { id: 1668082118, title: "ベストウイッシュ!", artist: "松本梨香", album: "ポケモンTVアニメ主題歌 BEST OF BEST OF BEST 1997-2023 (Selected Edition)", releaseDate: "2010-11-24" },
  { id: 583838648, title: "君のそばで~ヒカリのテーマ~", artist: "グリン", album: "ポケモンTVアニメ主題歌 BEST OF BEST 1997-2012", releaseDate: "2012-12-21" },
  { id: 1668082121, title: "夏めく坂道", artist: "ダイスケ", album: "ポケモンTVアニメ主題歌 BEST OF BEST OF BEST 1997-2023 (Selected Edition)", releaseDate: "2013-07-03" },
  { id: 1537266469, title: "ゲッタバンバン", artist: "佐香 智久", album: "ゲッタバンバン - Single", releaseDate: "2015-04-08" },
  { id: 1537268390, title: "XY&Z", artist: "サトシ(CV:松本梨香)", album: "XY&Z - Single", releaseDate: "2015-12-10" },
  { id: 1538259516, title: "アローラ!!", artist: "サトシwithピカチュウ(CV:松本梨香/大谷育江)", album: "アローラ!!/ポーズ - EP", releaseDate: "2016-11-17" },
  { id: 1537276961, title: "キミの冒険", artist: "岡崎体育", album: "キミの冒険 - Single", releaseDate: "2018-10-07" },
  { id: 1538284116, title: "1・2・3", artist: "After the Rain, そらる & まふまふ", album: "1・2・3 - Single", releaseDate: "2019-12-15" },
  { id: 1668078767, title: "めざせポケモンマスター -with my friends-", artist: "サトシ(CV:松本梨香)", album: "めざせポケモンマスター -with my friends- - Single", releaseDate: "2023-02-01" },
] satisfies SongQuizSong[];
