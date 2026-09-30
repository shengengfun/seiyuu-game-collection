import type { SongQuizSong } from '../types';

/**
 * 热门IP · onepiece 的猜歌曲库（抓取自 iTunes JP 区，含 30 秒试听）。
 *
 * 生成方式：`node tmp/fetch-song-catalog-special.mjs` → `node tmp/song-catalog-special-to-ts.mjs`，不要手改。
- 曲目来自人工挑的各 IP 代表曲（主题歌 / OP / ED），在 iTunes 定点检索后取最早的正式版本。
- 同一首歌的多个版本（BEST 盘、TV size 等）已合并，只保留最早发行的版本。
 * - `id` 是 iTunes trackId；试听地址由服务端 `/api/song-quiz/previews` 按 id 实时换取。
 * - 按发行日期升序排列。
 */
export default [
  { id: 1772211459, title: "ウィーアー!", artist: "きただにひろし", album: "TVアニメ『ONE PIECE』オープニングテーマ「ウィーアー!」 - EP", releaseDate: "1999-11-20" },
  { id: 985485121, title: "Believe", artist: "Folder 5", album: "HYPER GROOVE 1", releaseDate: "2001-07-25" },
  { id: 1536927138, title: "ヒカリへ", artist: "ザ・ベイビースターズ", album: "ヒカリヘ - Single", releaseDate: "2002-07-24" },
  { id: 1838960991, title: "ココロのちず", artist: "BOYSTYLE", album: "ココロのちず - EP", releaseDate: "2004-11-17" },
  { id: 263363256, title: "BRAND NEW WORLD", artist: "D-51", album: "BRAND NEW WORLD - EP", releaseDate: "2006-07-26" },
  { id: 346762866, title: "風をさがして", artist: "矢口真里とストローハット", album: "風をさがして - Single", releaseDate: "2010-01-13" },
  { id: 353750588, title: "Share The World", artist: "東方神起", album: "BEST SELECTION 2010", releaseDate: "2010-02-17" },
  { id: 1456259726, title: "Fight Together", artist: "安室奈美恵", album: "ONE PIECE 20th Anniversary BEST ALBUM Vol.1", releaseDate: "2011-07-27" },
  { id: 465036713, title: "One day", artist: "The ROOTLESS", album: "The ROOTLESS", releaseDate: "2011-09-28" },
  { id: 477654422, title: "ウィーゴー!", artist: "きただにひろし", album: "ウィーゴー! - Single", releaseDate: "2011-11-16" },
  { id: 996892107, title: "HANDS UP !", artist: "新里宏太", album: "HANDS UP! - EP", releaseDate: "2013-07-31" },
  { id: 890355478, title: "Wake up!", artist: "AAA", album: "Wake up! - Single", releaseDate: "2014-07-02" },
  { id: 1024336457, title: "Hard Knock Days", artist: "GENERATIONS from EXILE TRIBE", album: "Hard Knock Days - EP", releaseDate: "2015-08-12" },
  { id: 1093708594, title: "Jungle P", artist: "5050/DJ BOSS", album: "ONE PIECE Arrange Collection\"EDM\"", releaseDate: "2016-03-30" },
  { id: 1847217826, title: "Super Powers", artist: "V6", album: "Super Powers / Right Now - EP", releaseDate: "2019-01-16" },
  { id: 1479568065, title: "OVER THE TOP", artist: "きただにひろし", album: "OVER THE TOP - EP", releaseDate: "2019-09-25" },
  { id: 1525236534, title: "DREAMIN' ON", artist: "Da-iCE", album: "DREAMIN' ON -Special Edition- - EP", releaseDate: "2020-08-10" },
  { id: 1626392364, title: "新時代 (ウタ from ONE PIECE FILM RED)", artist: "Ado", album: "新時代 (ウタ from ONE PIECE FILM RED) - Single", releaseDate: "2022-06-08" },
  { id: 1636446959, title: "私は最強", artist: "Ado", album: "ウタの歌 ONE PIECE FILM RED", releaseDate: "2022-06-22" },
  { id: 1636446966, title: "ウタカタララバイ", artist: "Ado", album: "ウタの歌 ONE PIECE FILM RED", releaseDate: "2022-08-06" },
  { id: 1636447287, title: "ビンクスの酒", artist: "Ado", album: "ウタの歌 ONE PIECE FILM RED", releaseDate: "2022-08-10" },
  { id: 1706781383, title: "最高到達点", artist: "SEKAI NO OWARI", album: "最高到達点 - Single", releaseDate: "2023-09-17" },
  { id: 1738149208, title: "あーーっす!", artist: "きただにひろし", album: "あーーっす! - Single", releaseDate: "2024-03-15" },
] satisfies SongQuizSong[];
