import type { SongQuizSong } from '../types';

/**
 * BanG Dream! · morfonica 的猜歌曲库（抓取自 iTunes JP 区，含 30 秒试听）。
 *
 * 生成方式：`node --experimental-strip-types tmp/fetch-song-catalog-v2.mjs` → `node tmp/song-catalog-to-ts-v2.mjs`，不要手改。
 * - 含小队曲与声优以角色身份演唱的个人曲。
 * - `id` 是 iTunes trackId；试听地址由服务端 `/api/song-quiz/previews` 按 id 实时换取。
 * - 同一首歌的多个版本（BEST 盘、个人盘、TV size 等）已合并，只保留最早发行的版本。
 * - 按发行日期升序排列。
 */
export default [
  { id: 1799643732, title: "Daylight -デイライト-", artist: "Morfonica", album: "Daylight -デイライト- - Single", releaseDate: "2020-05-27" },
  { id: 1799643734, title: "金色へのプレリュード", artist: "Morfonica", album: "Daylight -デイライト- - Single", releaseDate: "2020-05-27" },
  { id: 1801436707, title: "chAngE (Cover)", artist: "Morfonica", album: "バンドリ! ガールズバンドパーティ! カバコレ Special Selection2", releaseDate: "2020-05-27" },
  { id: 1801130120, title: "ブルームブルーム", artist: "Morfonica", album: "ブルームブルーム - Single", releaseDate: "2021-01-13" },
  { id: 1801130129, title: "flame of hope", artist: "Morfonica", album: "ブルームブルーム - Single", releaseDate: "2021-01-13" },
  { id: 1798453484, title: "Nevereverland (Cover)", artist: "Morfonica", album: "バンドリ! ガールズバンドパーティ! カバコレ Special Selection3", releaseDate: "2021-02-24" },
  { id: 1796744982, title: "Fateful…", artist: "Morfonica", album: "Polyphony", releaseDate: "2021-10-06" },
  { id: 1800390003, title: "ハーモニー・デイ", artist: "Morfonica", album: "ハーモニー・デイ - Single", releaseDate: "2021-10-06" },
  { id: 1800390005, title: "Sonorous", artist: "Morfonica", album: "ハーモニー・デイ - Single", releaseDate: "2021-10-06" },
  { id: 1800390006, title: "Fateful...", artist: "Morfonica", album: "ハーモニー・デイ - Single", releaseDate: "2021-10-06" },
  { id: 1797275376, title: "fly with the night", artist: "Morfonica", album: "fly with the night - Single", releaseDate: "2022-03-30" },
  { id: 1797275384, title: "Secret Dawn", artist: "Morfonica", album: "fly with the night - Single", releaseDate: "2022-03-30" },
  { id: 1797480980, title: "寄る辺のSunny, Sunny", artist: "Morfonica", album: "寄る辺のSunny, Sunny - Single", releaseDate: "2022-09-14" },
  { id: 1797480995, title: "One step at a time", artist: "Morfonica", album: "寄る辺のSunny, Sunny - Single", releaseDate: "2022-09-14" },
  { id: 1796354365, title: "The Circle Of Butterflies", artist: "Morfonica", album: "The Circle Of Butterflies - Single", releaseDate: "2022-09-24" },
  { id: 1797679016, title: "COLORFUL BOX (Cover)", artist: "Morfonica", album: "バンドリ! ガールズバンドパーティ! カバーコレクション, Vol. 7", releaseDate: "2022-12-14" },
  { id: 1797679019, title: "unravel (Cover)", artist: "Morfonica", album: "バンドリ! ガールズバンドパーティ! カバーコレクション, Vol. 7", releaseDate: "2022-12-14" },
  { id: 1797033909, title: "メランコリックララバイ", artist: "Morfonica", album: "QUINTET", releaseDate: "2023-03-15" },
  { id: 1797034311, title: "カラフルリバティー", artist: "Morfonica", album: "QUINTET", releaseDate: "2023-03-15" },
  { id: 1797034324, title: "Sweet Cheers!", artist: "Morfonica", album: "QUINTET", releaseDate: "2023-03-15" },
  { id: 1797034328, title: "誓いのWingbeat", artist: "Morfonica", album: "QUINTET", releaseDate: "2023-03-15" },
  { id: 1797034329, title: "Ever Sky Blue", artist: "Morfonica", album: "QUINTET", releaseDate: "2023-03-15" },
  { id: 1798195861, title: "Angel's Ladder", artist: "Morfonica", album: "Angel's Ladder - Single", releaseDate: "2023-09-04" },
  { id: 1797691179, title: "V.I.P (Cover)", artist: "Morfonica", album: "バンドリ! ガールズバンドパーティ! カバーコレクション, Vol. 6", releaseDate: "2023-10-27" },
  { id: 1797691180, title: "CQCQ (Cover)", artist: "Morfonica", album: "バンドリ! ガールズバンドパーティ! カバーコレクション, Vol. 6", releaseDate: "2023-10-27" },
  { id: 1797691181, title: "アゲハ蝶 (Cover)", artist: "Morfonica", album: "バンドリ! ガールズバンドパーティ! カバーコレクション, Vol. 6", releaseDate: "2023-10-27" },
  { id: 1801725909, title: "ALIVE (Cover)", artist: "Morfonica", album: "バンドリ! ガールズバンドパーティ! カバーコレクションVol.8", releaseDate: "2023-11-10" },
  { id: 1801725911, title: "Nameless Story (Cover)", artist: "Morfonica", album: "バンドリ! ガールズバンドパーティ! カバーコレクションVol.8", releaseDate: "2023-11-10" },
  { id: 1801726420, title: "青空のラプソディ (Cover)", artist: "Morfonica & fhána", album: "バンドリ! ガールズバンドパーティ! カバーコレクションVol.8", releaseDate: "2023-11-10" },
  { id: 1798370708, title: "フレージング ミラージュ", artist: "Morfonica", album: "forte - EP", releaseDate: "2023-12-06" },
  { id: 1798370709, title: "MUGEN Reverberate!", artist: "Morfonica", album: "forte - EP", releaseDate: "2023-12-06" },
  { id: 1798370712, title: "わたしまちがいさがし", artist: "Morfonica", album: "forte - EP", releaseDate: "2023-12-06" },
  { id: 1798370715, title: "esora no clover", artist: "Morfonica", album: "forte - EP", releaseDate: "2023-12-06" },
  { id: 1798370716, title: "きょうもMerry go rounD", artist: "Morfonica", album: "forte - EP", releaseDate: "2023-12-06" },
  { id: 1796335568, title: "両翼のBrilliance", artist: "Morfonica", album: "両翼のBrilliance - Single", releaseDate: "2024-01-21" },
  { id: 1795884362, title: "かくれんぼ (Cover)", artist: "Morfonica", album: "かくれんぼ (Cover) - Single", releaseDate: "2024-03-22" },
  { id: 1796335572, title: "音がえしのセレナーデ", artist: "Morfonica", album: "両翼のBrilliance - Single", releaseDate: "2024-05-01" },
  { id: 1796335849, title: "蒼穹へのトレイル", artist: "Morfonica", album: "両翼のBrilliance - Single", releaseDate: "2024-05-01" },
  { id: 1795904953, title: "Tempest", artist: "Morfonica", album: "Tempest - Single", releaseDate: "2024-09-21" },
  { id: 1769580278, title: "Wreath of Brave", artist: "Morfonica", album: "Tempest/Wreath of Brave - Single", releaseDate: "2024-10-09" },
  { id: 1796744964, title: "Polyphonyscape", artist: "Morfonica", album: "Polyphony", releaseDate: "2025-02-21" },
  { id: 1796744970, title: "Merry Merry Thanks!!", artist: "Morfonica", album: "Polyphony", releaseDate: "2025-03-12" },
  { id: 1796744979, title: "Steer to Utopia", artist: "Morfonica", album: "Polyphony", releaseDate: "2025-03-12" },
  { id: 1796744983, title: "ティリカモニカリラ", artist: "Morfonica", album: "Polyphony", releaseDate: "2025-03-12" },
  { id: 1799616526, title: "again (Cover)", artist: "Morfonica", album: "again (Cover) - Single", releaseDate: "2025-03-20" },
  { id: 1828387291, title: "Feathered Dreams", artist: "Morfonica", album: "Feathered Dreams - Single", releaseDate: "2025-08-27" },
  { id: 1828387294, title: "Color of Us", artist: "Morfonica", album: "Feathered Dreams - Single", releaseDate: "2025-08-27" },
  { id: 1828387299, title: "Portray Empathy", artist: "Morfonica", album: "Feathered Dreams - Single", releaseDate: "2025-08-27" },
  { id: 1834080837, title: "ビューティ・フォー", artist: "Morfonica", album: "ビューティ・フォー - Single", releaseDate: "2025-09-13" },
  { id: 1842769354, title: "輪舞-revolution (Cover)", artist: "Morfonica", album: "バンドリ! ガールズバンドパーティ! カバーコレクションVol.10", releaseDate: "2025-10-15" },
  { id: 1842769507, title: "QUEEN (Cover)", artist: "Morfonica", album: "バンドリ! ガールズバンドパーティ! カバーコレクションVol.10", releaseDate: "2025-10-15" },
  { id: 1882638136, title: "メロウ (Cover)", artist: "Morfonica", album: "メロウ (Cover) - Single", releaseDate: "2026-03-16" },
  { id: 1882665265, title: "Resonant Strings", artist: "Morfonica", album: "Resonant Strings - Single", releaseDate: "2026-03-16" },
  { id: 1890087143, title: "Shining Leaves", artist: "Morfonica", album: "Resonant Strings - Single", releaseDate: "2026-04-22" },
  { id: 1893519119, title: "胡蝶翔る星月夜", artist: "Morfonica", album: "胡蝶翔る星月夜 - Single", releaseDate: "2026-05-07" },
] satisfies SongQuizSong[];
