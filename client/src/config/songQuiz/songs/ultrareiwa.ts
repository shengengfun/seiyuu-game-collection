import type { SongQuizSong } from '../types';

/**
 * tokusatsu · ultrareiwa 的猜歌曲库（抓取自 iTunes JP 区，含 30 秒试听）。
 *
 * 生成方式：`node tmp/fetch-song-catalog-special.mjs` → `node tmp/song-catalog-special-to-ts.mjs`，不要手改。

 * - `id` 是 iTunes trackId；试听地址由服务端 `/api/song-quiz/previews` 按 id 实时换取。
 * - 按发行日期升序排列。
 */
export default [
  { id: 1751886153, title: "ご唱和ください 我の名を!", artist: "遠藤正明", album: "ご唱和ください 我の名を! - Single", releaseDate: "2020-08-05" },
  { id: 1795015173, title: "Trigger", artist: "佐久間貴生", album: "Trigger【ウルトラマン盤】 - EP", releaseDate: "2021-07-10" },
  { id: 1799884175, title: "Wake up Decker!", artist: "SCREEN mode", album: "Wake up Decker! / SOUL TRIVE - EP", releaseDate: "2022-07-09" },
  { id: 1799884176, title: "SOUL TRIVE", artist: "SCREEN mode", album: "Wake up Decker! / SOUL TRIVE - EP", releaseDate: "2022-08-06" },
  { id: 1799882280, title: "Dazzling FLASH", artist: "勇-YOU-", album: "特撮ドラマ『ウルトラマンデッカー』タイプチェンジテーマソングミニアルバム", releaseDate: "2022-12-07" },
  { id: 1799882282, title: "Discover STRONG", artist: "勇-YOU-", album: "特撮ドラマ『ウルトラマンデッカー』タイプチェンジテーマソングミニアルバム", releaseDate: "2022-12-07" },
  { id: 1799882283, title: "Definitive MIRACLE", artist: "勇-YOU-", album: "特撮ドラマ『ウルトラマンデッカー』タイプチェンジテーマソングミニアルバム", releaseDate: "2022-12-07" },
  { id: 1799882284, title: "Decker DYNAMIC", artist: "勇-YOU-", album: "特撮ドラマ『ウルトラマンデッカー』タイプチェンジテーマソングミニアルバム", releaseDate: "2022-12-07" },
  { id: 1684443198, title: "Ultra Spiral", artist: "ボイジャー", album: "NEW GENERATION LOCUS", releaseDate: "2023-02-01" },
  { id: 1822904045, title: "BLACK STAR", artist: "MindaRyn", album: "BLACK STAR - Single", releaseDate: "2023-07-08" },
  { id: 1857550888, title: "僕らのスペクトラ", artist: "きただにひろし", album: "僕らのスペクトラ - EP", releaseDate: "2023-07-15" },
  { id: 1750663783, title: "arc jump'n to the sky", artist: "access", album: "arc jump'n to the sky - Single", releaseDate: "2024-07-06" },
  { id: 1872027800, title: "We'll be one!", artist: "ウルトラマンゼット(CV:畠中祐) with voyager", album: "We'll be one!", releaseDate: "2026-01-28" },
  { id: 1872027803, title: "We'll be one!(ウルトラマンゼット(CV:畠中祐)ver.)", artist: "ウルトラマンゼット(CV:畠中祐) with voyager", album: "We'll be one!", releaseDate: "2026-01-28" },
  { id: 1872027807, title: "with U", artist: "Team with U", album: "We'll be one!", releaseDate: "2026-01-28" },
] satisfies SongQuizSong[];
