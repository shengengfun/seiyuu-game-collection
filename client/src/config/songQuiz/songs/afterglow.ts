import type { SongQuizSong } from '../types';

/**
 * BanG Dream! · afterglow 的猜歌曲库（抓取自 iTunes JP 区，含 30 秒试听）。
 *
 * 生成方式：`node --experimental-strip-types tmp/fetch-song-catalog-v2.mjs` → `node tmp/song-catalog-to-ts-v2.mjs`，不要手改。
 * - 含小队曲与声优以角色身份演唱的个人曲。
 * - `id` 是 iTunes trackId；试听地址由服务端 `/api/song-quiz/previews` 按 id 实时换取。
 * - 同一首歌的多个版本（BEST 盘、个人盘、TV size 等）已合并，只保留最早发行的版本。
 * - 按发行日期升序排列。
 */
export default [
  { id: 1798865544, title: "True Color", artist: "Afterglow", album: "STAY GLOW", releaseDate: "2017-09-06" },
  { id: 1800385806, title: "That Is How I Roll!", artist: "Afterglow", album: "ONE OF US", releaseDate: "2017-09-06" },
  { id: 1799175172, title: "Scarlet Sky", artist: "Afterglow", album: "Hey-day狂騒曲(カプリチオ) - EP", releaseDate: "2018-01-31" },
  { id: 1800386481, title: "Hey-day狂騒曲(カプリチオ)", artist: "Afterglow", album: "ONE OF US", releaseDate: "2018-01-31" },
  { id: 1800643375, title: "ツナグ、ソラモヨウ", artist: "Afterglow", album: "ツナグ、ソラモヨウ - Single", releaseDate: "2018-10-31" },
  { id: 1800643381, title: "Jamboree!Journey!", artist: "Afterglow", album: "ツナグ、ソラモヨウ - Single", releaseDate: "2018-10-31" },
  { id: 1799912960, title: "Y.O.L.O!!!!!", artist: "Afterglow", album: "Y.O.L.O!!!!! - Single", releaseDate: "2019-02-20" },
  { id: 1799912965, title: "COMIC PANIC!!!", artist: "Afterglow", album: "Y.O.L.O!!!!! - Single", releaseDate: "2019-02-20" },
  { id: 1800385799, title: "ON YOUR MARK", artist: "Afterglow", album: "ONE OF US", releaseDate: "2019-10-23" },
  { id: 1800386490, title: "Easy come, Easy go!", artist: "Afterglow", album: "ONE OF US", releaseDate: "2020-03-11" },
  { id: 1810142459, title: "いつも通りのBrand new days", artist: "Afterglow", album: "Easy come, Easy go! - Single", releaseDate: "2020-03-11" },
  { id: 1799685069, title: "I love your way!", artist: "Afterglow", album: "Sasanqua - Single", releaseDate: "2020-10-28" },
  { id: 1800386667, title: "Sasanqua", artist: "Afterglow", album: "ONE OF US", releaseDate: "2020-10-28" },
  { id: 1800385816, title: "SENSENFUKOKU", artist: "Afterglow", album: "ONE OF US", releaseDate: "2021-03-24" },
  { id: 1800386215, title: "I knew it!", artist: "Afterglow", album: "ONE OF US", releaseDate: "2021-03-24" },
  { id: 1800386676, title: "RED RED RED", artist: "Afterglow", album: "ONE OF US", releaseDate: "2021-03-24" },
  { id: 1800386681, title: "ONE OF US", artist: "Afterglow", album: "ONE OF US", releaseDate: "2021-03-24" },
  { id: 1798865379, title: "カナユメ", artist: "Afterglow", album: "STAY GLOW", releaseDate: "2022-06-24" },
  { id: 1797247684, title: "独創収差", artist: "Afterglow", album: "独創収差 - Single", releaseDate: "2022-09-14" },
  { id: 1798865366, title: "Off we go.", artist: "Afterglow", album: "STAY GLOW", releaseDate: "2023-04-26" },
  { id: 1798865369, title: "SWITCH ON NOW", artist: "Afterglow", album: "STAY GLOW", releaseDate: "2023-04-26" },
  { id: 1798865370, title: "ランブリングメモリー", artist: "Afterglow", album: "STAY GLOW", releaseDate: "2023-04-26" },
  { id: 1798865373, title: "Trouble Joyful!!", artist: "Afterglow", album: "STAY GLOW", releaseDate: "2023-04-26" },
  { id: 1798865385, title: "極彩色", artist: "Afterglow", album: "STAY GLOW", releaseDate: "2023-04-26" },
  { id: 1798865539, title: "サクラゼンセン", artist: "Afterglow", album: "STAY GLOW", releaseDate: "2023-04-26" },
  { id: 1798865548, title: "Crow Song (Cover)", artist: "Afterglow", album: "STAY GLOW", releaseDate: "2023-04-26" },
  { id: 1798865549, title: "カサブタ (Cover)", artist: "Afterglow", album: "STAY GLOW", releaseDate: "2023-04-26" },
  { id: 1798865550, title: "アイのシナリオ (Cover)", artist: "Afterglow", album: "STAY GLOW", releaseDate: "2023-04-26" },
  { id: 1798865551, title: "Northern lights (Cover)", artist: "Afterglow", album: "STAY GLOW", releaseDate: "2023-04-26" },
  { id: 1798865553, title: "トーキョーワンダー。 (Cover)", artist: "Afterglow", album: "STAY GLOW", releaseDate: "2023-04-26" },
  { id: 1798865555, title: "Reach Out To The Truth (Cover)", artist: "Afterglow", album: "STAY GLOW", releaseDate: "2023-04-26" },
  { id: 1798865557, title: "Listen!! (Cover)", artist: "Afterglow", album: "STAY GLOW", releaseDate: "2023-04-26" },
  { id: 1798865558, title: "青い栞 (Cover)", artist: "Afterglow", album: "STAY GLOW", releaseDate: "2023-04-26" },
  { id: 1798865561, title: "イマジネーション (Cover)", artist: "Afterglow", album: "STAY GLOW", releaseDate: "2023-04-26" },
  { id: 1798865564, title: "Butter-Fly (Cover)", artist: "Afterglow", album: "STAY GLOW", releaseDate: "2023-04-26" },
  { id: 1797276751, title: "燦々", artist: "Afterglow", album: "燦々 - Single", releaseDate: "2023-09-02" },
  { id: 1796320160, title: "青のすみか (Cover)", artist: "Afterglow", album: "青のすみか (Cover) - Single", releaseDate: "2024-03-18" },
] satisfies SongQuizSong[];
