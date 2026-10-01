import type { SongQuizSong } from '../types';

/**
 * D4DJ · photonmaiden 的猜歌曲库（抓取自 iTunes JP 区，含 30 秒试听）。
 *
 * 生成方式：`node --experimental-strip-types tmp/fetch-song-catalog-v2.mjs` → `node tmp/song-catalog-to-ts-v2.mjs`，不要手改。
 * - 含小队曲与声优以角色身份演唱的个人曲。
 * - `id` 是 iTunes trackId；试听地址由服务端 `/api/song-quiz/previews` 按 id 实时换取。
 * - 同一首歌的多个版本（BEST 盘、个人盘、TV size 等）已合并，只保留最早发行的版本。
 * - 按发行日期升序排列。
 */
export default [
  { id: 1804524061, title: "Photon Melodies", artist: "Photon Maiden", album: "Dig Delight!/Direct Drive! Special Edition", releaseDate: "2020-03-28" },
  { id: 1804524070, title: "Here’s the light", artist: "Photon Maiden", album: "Dig Delight!/Direct Drive! Special Edition", releaseDate: "2020-03-28" },
  { id: 1802573518, title: "“What” are you?", artist: "Photon Maiden", album: "Cosmic CoaSTAR - EP", releaseDate: "2020-06-24" },
  { id: 1802574058, title: "Discover Universe", artist: "Photon Maiden", album: "Discover Universe - Single", releaseDate: "2020-10-21" },
  { id: 1802574061, title: "A lot of life", artist: "Photon Maiden", album: "Discover Universe - Single", releaseDate: "2020-10-21" },
  { id: 1802829871, title: "sakura (Cover)", artist: "Photon Maiden", album: "D4DJ Groovy Mix カバートラックス vol.1", releaseDate: "2021-01-20" },
  { id: 1802829872, title: "シドニア (Cover)", artist: "Photon Maiden", album: "D4DJ Groovy Mix カバートラックス vol.1", releaseDate: "2021-01-20" },
  { id: 1802571974, title: "Be with the world", artist: "Photon Maiden", album: "Be with the world - Single", releaseDate: "2021-05-19" },
  { id: 1802572192, title: "Wonder Wonder Trip", artist: "Photon Maiden", album: "Be with the world - Single", releaseDate: "2021-05-19" },
  { id: 1803102518, title: "READY STEADY GO (Cover)", artist: "Photon Maiden", album: "D4DJ Groovy Mix カバートラックス vol.2", releaseDate: "2021-07-21" },
  { id: 1803102521, title: "HOT LIMIT (Cover)", artist: "Photon Maiden", album: "D4DJ Groovy Mix カバートラックス vol.2", releaseDate: "2021-07-21" },
  { id: 1802154891, title: "4 Challenges", artist: "Photon Maiden", album: "4 Challenges - Single", releaseDate: "2021-10-13" },
  { id: 1802154894, title: "光", artist: "Photon Maiden", album: "4 Challenges - Single", releaseDate: "2021-10-13" },
  { id: 1803267222, title: "WHITE BREATH (Cover)", artist: "Photon Maiden", album: "D4DJ Groovy Mix カバートラックス vol.3", releaseDate: "2022-04-27" },
  { id: 1803267228, title: "銀河鉄道999 (Cover)", artist: "Photon Maiden", album: "D4DJ Groovy Mix カバートラックス vol.3", releaseDate: "2022-04-27" },
  { id: 1804541919, title: "G.A.M.E.", artist: "Photon Maiden", album: "4 phenomena", releaseDate: "2022-07-18" },
  { id: 1803267437, title: "Synchrogazer (Cover)", artist: "Photon Maiden", album: "D4DJ Groovy Mix カバートラックス vol.4", releaseDate: "2022-07-20" },
  { id: 1803267438, title: "アンドロイドガール (Cover)", artist: "Photon Maiden", album: "D4DJ Groovy Mix カバートラックス vol.4", releaseDate: "2022-07-20" },
  { id: 1803343760, title: "ブルー・フィールド (Cover)", artist: "Photon Maiden", album: "D4DJ Groovy Mix カバートラックス vol.5", releaseDate: "2022-07-20" },
  { id: 1803343761, title: "残酷な天使のテーゼ (Cover)", artist: "Photon Maiden", album: "D4DJ Groovy Mix カバートラックス vol.5", releaseDate: "2022-07-20" },
  { id: 1804541382, title: "We never stop", artist: "Photon Maiden", album: "4 phenomena", releaseDate: "2022-08-10" },
  { id: 1804541909, title: "暁 (fruits Mix V2)", artist: "Photon Maiden", album: "4 phenomena", releaseDate: "2022-08-10" },
  { id: 1804541926, title: "OVERCOME", artist: "Photon Maiden", album: "4 phenomena", releaseDate: "2022-08-10" },
  { id: 1804542115, title: "Into the storm", artist: "Photon Maiden", album: "4 phenomena", releaseDate: "2022-08-10" },
  { id: 1803366399, title: "恋する図形(cubic futurismo) [Cover]", artist: "Photon Maiden", album: "D4DJ Groovy Mix カバートラックス vol.6", releaseDate: "2022-10-26" },
  { id: 1803366401, title: "ブルーバード (Cover)", artist: "Photon Maiden", album: "D4DJ Groovy Mix カバートラックス vol.6", releaseDate: "2022-10-26" },
  { id: 1804241017, title: "24", artist: "Photon Maiden", album: "Showdown - EP", releaseDate: "2022-12-21" },
  { id: 1804241025, title: "Linked Ring", artist: "Photon Maiden", album: "Showdown - EP", releaseDate: "2022-12-21" },
  { id: 1803551729, title: "GETCHA! (Cover)", artist: "Photon Maiden", album: "D4DJ Groovy Mix カバートラックス vol.7", releaseDate: "2023-01-25" },
  { id: 1803551731, title: "INVOKE-インヴォーク- (Cover)", artist: "Photon Maiden", album: "D4DJ Groovy Mix カバートラックス vol.7", releaseDate: "2023-01-25" },
  { id: 1802135836, title: "4 many colors", artist: "Photon Maiden", album: "Around and Around - EP", releaseDate: "2023-03-15" },
  { id: 1803552175, title: "99 ILLUSION! (Cover)", artist: "Photon Maiden", album: "D4DJ Groovy Mix カバートラックス vol.8", releaseDate: "2023-07-12" },
  { id: 1803552176, title: "This game (Cover)", artist: "Photon Maiden", album: "D4DJ Groovy Mix カバートラックス vol.8", releaseDate: "2023-07-12" },
  { id: 1802767542, title: "Photon Tale", artist: "Photon Maiden", album: "Photon Tale - Single", releaseDate: "2023-08-16" },
  { id: 1802767546, title: "Collector", artist: "Photon Maiden", album: "Photon Tale - Single", releaseDate: "2023-08-16" },
  { id: 1802571901, title: "FriendShip", artist: "Photon Maiden", album: "FriendShip - Single", releaseDate: "2023-08-19" },
  { id: 1798141218, title: "チョコレイト・プロジェクト", artist: "Photon Maiden", album: "FriendShip - Single", releaseDate: "2024-03-27" },
  { id: 1798940691, title: "irony (Cover)", artist: "Photon Maiden", album: "D4DJ Groovy Mix カバートラックス vol.9", releaseDate: "2024-04-24" },
  { id: 1773694628, title: "Sparkle of Photon", artist: "Photon Maiden & aran", album: "Sparkle of Photon - Single", releaseDate: "2024-10-27" },
  { id: 1791881653, title: "Begin Again", artist: "Photon Maiden", album: "4 un Voyage", releaseDate: "2025-02-05" },
  { id: 1791881937, title: "プラチナ (Cover)", artist: "Photon Maiden & 出雲咲姫(CV:紡木吏佐)", album: "4 un Voyage", releaseDate: "2025-02-05" },
  { id: 1791881953, title: "Dear My Friend (Cover)", artist: "Photon Maiden & 新島衣舞紀(CV:七木奏音)", album: "4 un Voyage", releaseDate: "2025-02-05" },
  { id: 1791881955, title: "ファンサ (Cover)", artist: "Photon Maiden & 花巻乙和(CV:岩田陽葵)", album: "4 un Voyage", releaseDate: "2025-02-05" },
  { id: 1791882118, title: "Let The Show Begin (Cover)", artist: "Photon Maiden & 福島ノア(CV:佐藤日向)", album: "4 un Voyage", releaseDate: "2025-02-05" },
  { id: 1846628641, title: "Meteor", artist: "Photon Maiden", album: "Meteor - Single", releaseDate: "2025-10-28" },
  { id: 1846812014, title: "In Colors Anew", artist: "Photon Maiden", album: "In Colors Anew - Single", releaseDate: "2025-10-29" },
  { id: 1848066549, title: "Mirror", artist: "Photon Maiden", album: "Mirror - Single", releaseDate: "2025-10-30" },
  { id: 1860816114, title: "Heart to Heart", artist: "Photon Maiden", album: "Heart to Heart - Single", releaseDate: "2025-12-19" },
  { id: 1860818087, title: "無限大", artist: "Photon Maiden", album: "無限大 - Single", releaseDate: "2025-12-19" },
  { id: 6775722795, title: "Top of The World", artist: "Photon Maiden", album: "Top of The World - Single", releaseDate: "2026-06-09" },
  { id: 6781124250, title: "Edel Lilie (Cover)", artist: "Photon Maiden", album: "Edel Lilie (Cover) - Single", releaseDate: "2026-06-24" },
] satisfies SongQuizSong[];
