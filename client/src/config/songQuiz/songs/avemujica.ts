import type { SongQuizSong } from '../types';

/**
 * BanG Dream! · avemujica 的猜歌曲库（抓取自 iTunes JP 区，含 30 秒试听）。
 *
 * 生成方式：`node --experimental-strip-types tmp/fetch-song-catalog-v2.mjs` → `node tmp/song-catalog-to-ts-v2.mjs`，不要手改。
 * - 含小队曲与声优以角色身份演唱的个人曲。
 * - `id` 是 iTunes trackId；试听地址由服务端 `/api/song-quiz/previews` 按 id 实时换取。
 * - 同一首歌的多个版本（BEST 盘、个人盘、TV size 等）已合并，只保留最早发行的版本。
 * - 按发行日期升序排列。
 */
export default [
  { id: 1783405586, title: "黒のバースデイ", artist: "Ave Mujica", album: "Alea jacta est - EP", releaseDate: "2023-04-11" },
  { id: 1783405590, title: "ふたつの月 ~Deep Into The Forest~", artist: "Ave Mujica", album: "Alea jacta est - EP", releaseDate: "2023-04-17" },
  { id: 1783405591, title: "Choir ‘S’ Choir", artist: "Ave Mujica", album: "Alea jacta est - EP", releaseDate: "2023-04-24" },
  { id: 1783405592, title: "神さま、バカ", artist: "Ave Mujica", album: "Alea jacta est - EP", releaseDate: "2023-05-08" },
  { id: 1783405593, title: "Mas?uerade Rhapsody Re?uest", artist: "Ave Mujica", album: "Alea jacta est - EP", releaseDate: "2023-05-22" },
  { id: 1783405594, title: "Ave Mujica", artist: "Ave Mujica", album: "Alea jacta est - EP", releaseDate: "2023-09-13" },
  { id: 1783540847, title: "素晴らしき世界 でも どこにもない場所", artist: "Ave Mujica", album: "素晴らしき世界 でも どこにもない場所 - Single", releaseDate: "2023-12-30" },
  { id: 1783422482, title: "Angles", artist: "Ave Mujica", album: "Angles - Single", releaseDate: "2024-01-07" },
  { id: 1783821101, title: "Symbol I : △", artist: "Ave Mujica", album: "Symbol I : △ - Single", releaseDate: "2024-04-07" },
  { id: 1783598562, title: "Symbol II : Air", artist: "Ave Mujica", album: "Symbol II : Air - Single", releaseDate: "2024-05-18" },
  { id: 1783622803, title: "Symbol III : ▽", artist: "Ave Mujica", album: "Symbol III : ▽ - Single", releaseDate: "2024-06-15" },
  { id: 1784360470, title: "Symbol IV : Earth", artist: "Ave Mujica", album: "Symbol IV : Earth - Single", releaseDate: "2024-07-08" },
  { id: 1783601283, title: "暗黒天国 (Cover)", artist: "Ave Mujica", album: "バンドリ! カバーコレクション Extra Volume - EP", releaseDate: "2024-07-10" },
  { id: 1783601291, title: "堕天 (Cover)", artist: "Ave Mujica", album: "バンドリ! カバーコレクション Extra Volume - EP", releaseDate: "2024-07-10" },
  { id: 1783601571, title: "KINGS (Cover)", artist: "Ave Mujica", album: "バンドリ! カバーコレクション Extra Volume - EP", releaseDate: "2024-07-10" },
  { id: 1783404941, title: "Ether", artist: "Ave Mujica", album: "Ether - Single", releaseDate: "2024-08-30" },
  { id: 1783599226, title: "KiLLKiSS", artist: "Ave Mujica", album: "KiLLKiSS - Single", releaseDate: "2025-01-08" },
  { id: 1783598946, title: "Georgette Me, Georgette You", artist: "Ave Mujica", album: "Georgette Me, Georgette You - Single", releaseDate: "2025-01-15" },
  { id: 1796790572, title: "Imprisoned XII", artist: "Ave Mujica", album: "Imprisoned XII - Single", releaseDate: "2025-03-06" },
  { id: 1796791814, title: "Crucifix X", artist: "Ave Mujica", album: "Crucifix X - Single", releaseDate: "2025-03-06" },
  { id: 1802816613, title: "天球(そら)のMúsica", artist: "Ave Mujica", album: "天球(そら)のMúsica - Single", releaseDate: "2025-04-03" },
  { id: 1806042108, title: "顔", artist: "Ave Mujica", album: "顔 - Single", releaseDate: "2025-04-17" },
  { id: 1807242081, title: "八芒星ダンス", artist: "Ave Mujica", album: "Completeness", releaseDate: "2025-04-23" },
  { id: 1826733224, title: "DIVINE", artist: "Ave Mujica", album: "DIVINE - Single", releaseDate: "2025-08-04" },
  { id: 1832963576, title: "碧い瞳の中に", artist: "Ave Mujica & 塞壬唱片-MSR", album: "碧い瞳の中に - Single", releaseDate: "2025-09-04" },
  { id: 1852656096, title: "‘S/’ The Way", artist: "Ave Mujica", album: "‘S/’ The Way / Sophie - Single", releaseDate: "2025-12-10" },
  { id: 1852656098, title: "Sophie", artist: "Ave Mujica", album: "‘S/’ The Way / Sophie - Single", releaseDate: "2025-12-10" },
  { id: 6774068712, title: "The Whole Blue World", artist: "Ave Mujica", album: "Ave Música", releaseDate: "2026-06-17" },
  { id: 6806897028, title: "A Song Of Romance (from EP \"神の名を\")", artist: "Ave Mujica", album: "A Song Of Romance (from EP \"神の名を\") - Single", releaseDate: "2026-09-14" },
] satisfies SongQuizSong[];
