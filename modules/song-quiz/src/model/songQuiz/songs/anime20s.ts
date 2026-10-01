import type { SongQuizSong } from '../types';

/**
 * 特别呈现 · anime20s 的猜歌曲库（抓取自 iTunes JP 区，含 30 秒试听）。
 *
 * 生成方式：`node tmp/fetch-song-catalog-special.mjs` → `node tmp/song-catalog-special-to-ts.mjs`，不要手改。
- 曲目来自人工挑的金曲清单（特摄主题曲 / 各年代动漫金曲），在 iTunes 定点检索后取最早的正式版本。
- 同一首歌的多个版本（BEST 盘、TV size 等）已合并，只保留最早发行的版本。
 * - `id` 是 iTunes trackId；试听地址由服务端 `/api/song-quiz/previews` 按 id 实时换取。
 * - 按发行日期升序排列。
 */
export default [
  { id: 1533208085, title: "廻廻奇譚", artist: "Eve", album: "廻廻奇譚 - Single", releaseDate: "2020-10-03" },
  { id: 1531847485, title: "炎", artist: "LiSA", album: "炎 - EP", releaseDate: "2020-10-12" },
  { id: 1544083979, title: "怪物", artist: "YOASOBI", album: "怪物 - Single", releaseDate: "2021-01-06" },
  { id: 1592056443, title: "明け星", artist: "LiSA", album: "明け星 / 白銀 - EP", releaseDate: "2021-10-18" },
  { id: 1592056444, title: "白銀", artist: "LiSA", album: "明け星 / 白銀 - EP", releaseDate: "2021-11-15" },
  { id: 1594814706, title: "残響散歌", artist: "Aimer", album: "残響散歌 / 朝が来る - EP", releaseDate: "2021-12-06" },
  { id: 1597279110, title: "一途", artist: "King Gnu", album: "一途 - Single", releaseDate: "2021-12-10" },
  { id: 1600395740, title: "逆夢", artist: "King Gnu", album: "逆夢 - Single", releaseDate: "2021-12-24" },
  { id: 1594814709, title: "朝が来る", artist: "Aimer", album: "残響散歌 / 朝が来る - EP", releaseDate: "2022-01-10" },
  { id: 1628261505, title: "ミックスナッツ", artist: "Official髭男dism", album: "ミックスナッツEP", releaseDate: "2022-04-15" },
  { id: 1626392364, title: "新時代 (ウタ from ONE PIECE FILM RED)", artist: "Ado", album: "新時代 (ウタ from ONE PIECE FILM RED) - Single", releaseDate: "2022-06-08" },
  { id: 1636446959, title: "私は最強", artist: "Ado", album: "ウタの歌 ONE PIECE FILM RED", releaseDate: "2022-06-22" },
  { id: 1630061094, title: "花の塔", artist: "さユり", album: "花の塔 - Single", releaseDate: "2022-07-03" },
  { id: 1636446966, title: "ウタカタララバイ", artist: "Ado", album: "ウタの歌 ONE PIECE FILM RED", releaseDate: "2022-08-06" },
  { id: 1636447280, title: "風のゆくえ", artist: "Ado", album: "ウタの歌 ONE PIECE FILM RED", releaseDate: "2022-08-10" },
  { id: 1644656901, title: "SOUVENIR", artist: "BUMP OF CHICKEN", album: "SOUVENIR - Single", releaseDate: "2022-09-29" },
  { id: 1645308331, title: "祝福", artist: "YOASOBI", album: "祝福 - Single", releaseDate: "2022-10-01" },
  { id: 1646020675, title: "青春コンプレックス", artist: "結束バンド", album: "青春コンプレックス - EP", releaseDate: "2022-10-09" },
  { id: 1648272180, title: "KICK BACK", artist: "米津玄師", album: "KICK BACK - Single", releaseDate: "2022-10-12" },
  { id: 1650726430, title: "ギターと孤独と蒼い惑星", artist: "結束バンド", album: "ギターと孤独と蒼い惑星 - Single", releaseDate: "2022-11-06" },
  { id: 1652476613, title: "あのバンド", artist: "結束バンド", album: "あのバンド - Single", releaseDate: "2022-11-27" },
  { id: 1657318884, title: "星座になれたら", artist: "結束バンド", album: "結束バンド", releaseDate: "2022-12-25" },
  { id: 1657318890, title: "転がる岩、君に朝が降る", artist: "結束バンド", album: "結束バンド", releaseDate: "2022-12-25" },
  { id: 1679873472, title: "slash", artist: "yama", album: "slash - Single", releaseDate: "2023-04-09" },
  { id: 1678949889, title: "絆ノ奇跡", artist: "MAN WITH A MISSION & milet", album: "絆ノ奇跡 / コイコガレ - EP", releaseDate: "2023-04-10" },
  { id: 1679278167, title: "アイドル", artist: "YOASOBI", album: "アイドル - Single", releaseDate: "2023-04-12" },
  { id: 1678949894, title: "コイコガレ", artist: "milet & MAN WITH A MISSION", album: "絆ノ奇跡 / コイコガレ - EP", releaseDate: "2023-04-17" },
  { id: 1692289314, title: "青のすみか", artist: "キタニタツヤ", album: "青のすみか - Single", releaseDate: "2023-07-07" },
  { id: 1702823583, title: "SPECIALZ", artist: "King Gnu", album: "SPECIALZ - Single", releaseDate: "2023-09-01" },
  { id: 1707001466, title: "勇者", artist: "YOASOBI", album: "勇者 - Single", releaseDate: "2023-09-29" },
  { id: 1708333825, title: "Anytime Anywhere", artist: "milet", album: "Anytime Anywhere - Single", releaseDate: "2023-09-29" },
  { id: 1721450223, title: "晴る", artist: "ヨルシカ", album: "晴る - Single", releaseDate: "2024-01-05" },
  { id: 1742203699, title: "夢幻", artist: "MY FIRST STORY & HYDE", album: "夢幻 - Single", releaseDate: "2024-05-13" },
  { id: 1781282012, title: "サインはB (ドラマ ver.)", artist: "B小町", album: "SHINING SONG - EP", releaseDate: "2024-12-18" },
] satisfies SongQuizSong[];
