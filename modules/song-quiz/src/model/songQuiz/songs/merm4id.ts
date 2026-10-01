import type { SongQuizSong } from '../types';

/**
 * D4DJ · merm4id 的猜歌曲库（抓取自 iTunes JP 区，含 30 秒试听）。
 *
 * 生成方式：`node --experimental-strip-types tmp/fetch-song-catalog-v2.mjs` → `node tmp/song-catalog-to-ts-v2.mjs`，不要手改。
 * - 含小队曲与声优以角色身份演唱的个人曲。
 * - `id` 是 iTunes trackId；试听地址由服务端 `/api/song-quiz/previews` 按 id 实时换取。
 * - 同一首歌的多个版本（BEST 盘、个人盘、TV size 等）已合并，只保留最早发行的版本。
 * - 按发行日期升序排列。
 */
export default [
  { id: 1804524063, title: "Floor Killer", artist: "Merm4id", album: "Dig Delight!/Direct Drive! Special Edition", releaseDate: "2020-03-28" },
  { id: 1804524073, title: "ING", artist: "Merm4id", album: "Dig Delight!/Direct Drive! Special Edition", releaseDate: "2020-03-28" },
  { id: 1802573525, title: "round and round", artist: "Merm4id", album: "Cosmic CoaSTAR - EP", releaseDate: "2020-06-24" },
  { id: 1801949908, title: "4U", artist: "Merm4id", album: "4U - Single", releaseDate: "2020-12-02" },
  { id: 1801949911, title: "Make some noise!", artist: "Merm4id", album: "4U - Single", releaseDate: "2020-12-02" },
  { id: 1802829873, title: "キューティーハニー (Cover)", artist: "Merm4id", album: "D4DJ Groovy Mix カバートラックス vol.1", releaseDate: "2021-01-20" },
  { id: 1802829876, title: "DISCOTHEQUE (Cover)", artist: "Merm4id", album: "D4DJ Groovy Mix カバートラックス vol.1", releaseDate: "2021-01-20" },
  { id: 1801692572, title: "BOOM-BOOM SHAKE!", artist: "Merm4id", album: "BOOM-BOOM SHAKE! - Single", releaseDate: "2021-06-16" },
  { id: 1801692574, title: "Princess advent", artist: "Merm4id", album: "BOOM-BOOM SHAKE! - Single", releaseDate: "2021-06-16" },
  { id: 1803102524, title: "Climax Jump (Cover)", artist: "Merm4id", album: "D4DJ Groovy Mix カバートラックス vol.2", releaseDate: "2021-07-21" },
  { id: 1803102527, title: "Gamble Rumble (Cover)", artist: "Merm4id", album: "D4DJ Groovy Mix カバートラックス vol.2", releaseDate: "2021-07-21" },
  { id: 1802851639, title: "High tension BPM", artist: "Merm4id", album: "High tension BPM - Single", releaseDate: "2021-10-27" },
  { id: 1802851769, title: "OMG", artist: "Merm4id", album: "High tension BPM - Single", releaseDate: "2021-10-27" },
  { id: 1804028637, title: "I will never die", artist: "Merm4id", album: "V.I.P LAGOON", releaseDate: "2022-03-31" },
  { id: 1803267321, title: "CAT'S EYE (Cover)", artist: "Merm4id", album: "D4DJ Groovy Mix カバートラックス vol.3", releaseDate: "2022-04-27" },
  { id: 1803267328, title: "どうにもとまらない (Cover)", artist: "Merm4id", album: "D4DJ Groovy Mix カバートラックス vol.3", releaseDate: "2022-04-27" },
  { id: 1804028449, title: "S.T.O.P.!", artist: "Merm4id", album: "V.I.P LAGOON", releaseDate: "2022-04-27" },
  { id: 1804028633, title: "NO-NO", artist: "Merm4id", album: "V.I.P LAGOON", releaseDate: "2022-04-27" },
  { id: 1804028636, title: "HOLY WORRY", artist: "Merm4id", album: "V.I.P LAGOON", releaseDate: "2022-04-27" },
  { id: 1803267531, title: "フジヤマディスコ (Cover)", artist: "Merm4id", album: "D4DJ Groovy Mix カバートラックス vol.4", releaseDate: "2022-07-20" },
  { id: 1803267532, title: "*～アスタリスク～ (Cover)", artist: "Merm4id", album: "D4DJ Groovy Mix カバートラックス vol.4", releaseDate: "2022-07-20" },
  { id: 1803343762, title: "Blazin' Beat (Cover)", artist: "Merm4id", album: "D4DJ Groovy Mix カバートラックス vol.5", releaseDate: "2022-07-20" },
  { id: 1803343774, title: "Realize (Cover)", artist: "Merm4id", album: "D4DJ Groovy Mix カバートラックス vol.5", releaseDate: "2022-07-20" },
  { id: 1803366402, title: "Bomb A Head! (Cover)", artist: "Merm4id", album: "D4DJ Groovy Mix カバートラックス vol.6", releaseDate: "2022-10-26" },
  { id: 1803366405, title: "HONEY (Cover)", artist: "Merm4id", album: "D4DJ Groovy Mix カバートラックス vol.6", releaseDate: "2022-10-26" },
  { id: 1803551733, title: "real Emotion (Cover)", artist: "Merm4id", album: "D4DJ Groovy Mix カバートラックス vol.7", releaseDate: "2023-01-25" },
  { id: 1803551734, title: "恋愛♥ライダー (Cover)", artist: "Merm4id", album: "D4DJ Groovy Mix カバートラックス vol.7", releaseDate: "2023-01-25" },
  { id: 1802135828, title: "D.M.F", artist: "Merm4id", album: "Around and Around - EP", releaseDate: "2023-03-15" },
  { id: 1804010825, title: "lovely!!!!", artist: "Merm4id", album: "Get out! - EP", releaseDate: "2023-05-03" },
  { id: 1804010828, title: "Live Life", artist: "Merm4id", album: "Get out! - EP", releaseDate: "2023-05-03" },
  { id: 1803552177, title: "Timing (Cover)", artist: "Merm4id", album: "D4DJ Groovy Mix カバートラックス vol.8", releaseDate: "2023-07-12" },
  { id: 1803552179, title: "GO!!! (Cover)", artist: "Merm4id", album: "D4DJ Groovy Mix カバートラックス vol.8", releaseDate: "2023-07-12" },
  { id: 1802556803, title: "G.O.A.T", artist: "Merm4id", album: "G.O.A.T - Single", releaseDate: "2023-07-19" },
  { id: 1802556805, title: "LOVE BITE", artist: "Merm4id", album: "G.O.A.T - Single", releaseDate: "2023-07-19" },
  { id: 1802791531, title: "MAX!!!!", artist: "Merm4id", album: "MAX!!!! - Single", releaseDate: "2023-07-30" },
  { id: 1798405002, title: "START", artist: "Merm4id", album: "MAX!!!! - Single", releaseDate: "2024-01-31" },
  { id: 1798940698, title: "EXPOSE ‘Burn out!!!’ (Cover)", artist: "Merm4id", album: "D4DJ Groovy Mix カバートラックス vol.9", releaseDate: "2024-04-24" },
  { id: 1798940702, title: "君のせい (Cover)", artist: "Merm4id", album: "D4DJ Groovy Mix カバートラックス vol.9", releaseDate: "2024-04-24" },
  { id: 1779215358, title: "Discordant Mermaid", artist: "Merm4id & Massive New Krew", album: "Discordant Mermaid - Single", releaseDate: "2024-10-27" },
  { id: 1787679765, title: "GIVE Attention", artist: "Merm4id", album: "GIVE Attention - Single", releaseDate: "2025-01-12" },
  { id: 1787680246, title: "WIN-WIN", artist: "Merm4id", album: "WIN-WIN - Single", releaseDate: "2025-01-12" },
  { id: 1796128234, title: "ENDLESS MEMORIES", artist: "Merm4id", album: "Killer Tune", releaseDate: "2025-03-05" },
  { id: 1796128648, title: "CUT OUT", artist: "Merm4id", album: "Killer Tune", releaseDate: "2025-03-05" },
  { id: 1799126675, title: "ザ☆ピ～ス! (Cover)", artist: "Merm4id & 瀬戸リカ(CV:平嶋夏海)", album: "D4DJ Groovy Mix カバートラックス Extra Edition Merm4id - EP", releaseDate: "2025-03-05" },
  { id: 1799126678, title: "ラムのラブソング (Cover)", artist: "Merm4id & 水島茉莉花(CV:岡田夢以)", album: "D4DJ Groovy Mix カバートラックス Extra Edition Merm4id - EP", releaseDate: "2025-03-05" },
  { id: 1799126686, title: "気まぐれメルシィ (Cover)", artist: "Merm4id & 日高さおり(CV:葉月ひまり)", album: "D4DJ Groovy Mix カバートラックス Extra Edition Merm4id - EP", releaseDate: "2025-03-05" },
  { id: 1799126872, title: "一滴の影響 (Cover)", artist: "Merm4id & 松山ダリア(CV:根岸 愛)", album: "D4DJ Groovy Mix カバートラックス Extra Edition Merm4id - EP", releaseDate: "2025-03-05" },
  { id: 1826733846, title: "Desperate Situation", artist: "Merm4id", album: "Desperate Situation - Single", releaseDate: "2025-07-22" },
  { id: 1886153549, title: "femmes fatale", artist: "Merm4id", album: "femmes fatale - Single", releaseDate: "2026-03-29" },
  { id: 6788352725, title: "ULTIMATE VIBES", artist: "Merm4id", album: "ULTIMATE VIBES - Single", releaseDate: "2026-07-12" },
  { id: 6802515753, title: "SHAKE ME!", artist: "Merm4id", album: "SHAKE ME! - Single", releaseDate: "2026-08-23" },
] satisfies SongQuizSong[];
