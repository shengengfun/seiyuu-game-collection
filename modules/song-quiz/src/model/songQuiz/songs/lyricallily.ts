import type { SongQuizSong } from '../types';

/**
 * D4DJ · lyricallily 的猜歌曲库（抓取自 iTunes JP 区，含 30 秒试听）。
 *
 * 生成方式：`node --experimental-strip-types tmp/fetch-song-catalog-v2.mjs` → `node tmp/song-catalog-to-ts-v2.mjs`，不要手改。
 * - 含小队曲与声优以角色身份演唱的个人曲。
 * - `id` 是 iTunes trackId；试听地址由服务端 `/api/song-quiz/previews` 按 id 实时换取。
 * - 同一首歌的多个版本（BEST 盘、个人盘、TV size 等）已合并，只保留最早发行的版本。
 * - 按发行日期升序排列。
 */
export default [
  { id: 1804028210, title: "汚れっちまった悲しみの色", artist: "Lyrical Lily", album: "Lyrical Anthology", releaseDate: "2020-06-24" },
  { id: 1804241754, title: "吾輩よ猫であれ", artist: "Lyrical Lily", album: "吾輩よ猫であれ - Single", releaseDate: "2020-12-16" },
  { id: 1804241758, title: "銀河鉄道の夜に", artist: "Lyrical Lily", album: "吾輩よ猫であれ - Single", releaseDate: "2020-12-16" },
  { id: 1802829881, title: "ふ・れ・ん・ど・し・た・い (Cover)", artist: "Lyrical Lily", album: "D4DJ Groovy Mix カバートラックス vol.1", releaseDate: "2021-01-20" },
  { id: 1802829882, title: "タッチ (Cover)", artist: "Lyrical Lily", album: "D4DJ Groovy Mix カバートラックス vol.1", releaseDate: "2021-01-20" },
  { id: 1803102836, title: "創傷イノセンス (Cover)", artist: "Lyrical Lily", album: "D4DJ Groovy Mix カバートラックス vol.2", releaseDate: "2021-07-21" },
  { id: 1803102840, title: "Shiny Smily Story (Cover)", artist: "Lyrical Lily", album: "D4DJ Groovy Mix カバートラックス vol.2", releaseDate: "2021-07-21" },
  { id: 1804241169, title: "プティプランス", artist: "Lyrical Lily", album: "プティプランス - Single", releaseDate: "2021-08-18" },
  { id: 1804241170, title: "Magiの贈り物", artist: "Lyrical Lily", album: "プティプランス - Single", releaseDate: "2021-08-18" },
  { id: 1804049040, title: "冒険王!", artist: "Lyrical Lily", album: "冒険王! - Single", releaseDate: "2021-11-24" },
  { id: 1804049041, title: "ねむり姫", artist: "Lyrical Lily", album: "冒険王! - Single", releaseDate: "2021-11-24" },
  { id: 1803267596, title: "赤いスイートピー (Cover)", artist: "Lyrical Lily", album: "D4DJ Groovy Mix カバートラックス vol.3", releaseDate: "2022-04-27" },
  { id: 1803267599, title: "男の勲章 (Cover)", artist: "Lyrical Lily", album: "D4DJ Groovy Mix カバートラックス vol.3", releaseDate: "2022-04-27" },
  { id: 1804028217, title: "ライム畑でつかまえて", artist: "Lyrical Lily", album: "Lyrical Anthology", releaseDate: "2022-05-30" },
  { id: 1804028215, title: "月に萌える", artist: "Lyrical Lily", album: "Lyrical Anthology", releaseDate: "2022-06-29" },
  { id: 1804028219, title: "Journey to the West", artist: "Lyrical Lily", album: "Lyrical Anthology", releaseDate: "2022-06-29" },
  { id: 1804028223, title: "Happy Prince", artist: "Lyrical Lily", album: "Lyrical Anthology", releaseDate: "2022-06-29" },
  { id: 1804028226, title: "夢十Yah!", artist: "Lyrical Lily", album: "Lyrical Anthology", releaseDate: "2022-06-29" },
  { id: 1804028231, title: "人間合格!!!!", artist: "Lyrical Lily", album: "Lyrical Anthology", releaseDate: "2022-06-29" },
  { id: 1803267544, title: "太陽のflare sherbet (Cover)", artist: "Lyrical Lily", album: "D4DJ Groovy Mix カバートラックス vol.4", releaseDate: "2022-07-20" },
  { id: 1803267545, title: "サクラサク (Cover)", artist: "Lyrical Lily", album: "D4DJ Groovy Mix カバートラックス vol.4", releaseDate: "2022-07-20" },
  { id: 1803343965, title: "ギミー!レボリューション (Cover)", artist: "Lyrical Lily", album: "D4DJ Groovy Mix カバートラックス vol.5", releaseDate: "2022-07-20" },
  { id: 1803344090, title: "1st Priority (Cover)", artist: "Lyrical Lily", album: "D4DJ Groovy Mix カバートラックス vol.5", releaseDate: "2022-07-20" },
  { id: 1803366539, title: "Agapē (Cover)", artist: "Lyrical Lily", album: "D4DJ Groovy Mix カバートラックス vol.6", releaseDate: "2022-10-26" },
  { id: 1803366544, title: "ぼなぺてぃーと♡S (Cover)", artist: "Lyrical Lily", album: "D4DJ Groovy Mix カバートラックス vol.6", releaseDate: "2022-10-26" },
  { id: 1804309625, title: "Maihime", artist: "Lyrical Lily", album: "Maihime / Around and Around - Single", releaseDate: "2023-01-14" },
  { id: 1803551738, title: "アンダーカバー (TeddyLoid Remix)", artist: "Lyrical Lily", album: "D4DJ Groovy Mix カバートラックス vol.7", releaseDate: "2023-01-25" },
  { id: 1803551739, title: "ラブ・ストーリーは突然に (Cover)", artist: "Lyrical Lily", album: "D4DJ Groovy Mix カバートラックス vol.7", releaseDate: "2023-01-25" },
  { id: 1804523903, title: "春とショコラ", artist: "Lyrical Lily", album: "Maihime - EP", releaseDate: "2023-02-15" },
  { id: 1804028585, title: "サーカスへようこそ", artist: "Lyrical Lily", album: "サーカスへようこそ - Single", releaseDate: "2023-06-14" },
  { id: 1804028587, title: "White Margaret", artist: "Lyrical Lily", album: "サーカスへようこそ - Single", releaseDate: "2023-06-14" },
  { id: 1803552184, title: "にゃんだーわんだーデイズ (Cover)", artist: "Lyrical Lily", album: "D4DJ Groovy Mix カバートラックス vol.8", releaseDate: "2023-07-12" },
  { id: 1803552186, title: "撲殺天使ドクロちゃん (Cover)", artist: "Lyrical Lily", album: "D4DJ Groovy Mix カバートラックス vol.8", releaseDate: "2023-07-12" },
  { id: 1796146093, title: "真夏の朝の夢", artist: "Lyrical Lily", album: "真夏の朝の夢 - Single", releaseDate: "2023-08-19" },
  { id: 1804011141, title: "Snow Black", artist: "Lyrical Lily", album: "Hello World - EP", releaseDate: "2023-10-04" },
  { id: 1804011143, title: "IFの踊子", artist: "Lyrical Lily", album: "Hello World - EP", releaseDate: "2023-10-04" },
  { id: 1796146095, title: "わんわんとチョコレイト工場", artist: "Lyrical Lily", album: "真夏の朝の夢 - Single", releaseDate: "2024-01-10" },
  { id: 1798940714, title: "ユニバーページ (Cover)", artist: "Lyrical Lily", album: "D4DJ Groovy Mix カバートラックス vol.9", releaseDate: "2024-04-24" },
  { id: 1798940717, title: "adrenaline!!! (Cover)", artist: "Lyrical Lily", album: "D4DJ Groovy Mix カバートラックス vol.9", releaseDate: "2024-04-24" },
  { id: 1773404412, title: "Lyrical Strike!", artist: "Lyrical Lily & REDALiCE", album: "Lyrical Strike! - Single", releaseDate: "2024-10-27" },
  { id: 1787484393, title: "夏休み", artist: "Lyrical Lily", album: "Lyrical Recollection", releaseDate: "2025-01-22" },
  { id: 1787484395, title: "いたずら白書", artist: "Lyrical Lily", album: "Lyrical Recollection", releaseDate: "2025-01-22" },
  { id: 1787484408, title: "注文の多い文化祭", artist: "Lyrical Lily", album: "Lyrical Recollection", releaseDate: "2025-01-22" },
  { id: 1787484620, title: "千リ一リ物語", artist: "Lyrical Lily", album: "Lyrical Recollection", releaseDate: "2025-01-22" },
  { id: 1799108798, title: "ギャラクシー☆ばばんがBang! (Cover)", artist: "Lyrical Lily", album: "D4DJ Groovy Mix カバートラックス Extra Edition Lyrical Lily - EP", releaseDate: "2025-03-05" },
  { id: 1799108803, title: "私、アイドル宣言 (Cover)", artist: "Lyrical Lily", album: "D4DJ Groovy Mix カバートラックス Extra Edition Lyrical Lily - EP", releaseDate: "2025-03-05" },
  { id: 1799108804, title: "プラスティック・ラブ (Cover)", artist: "Lyrical Lily & 桜田美夢(CV:反田葉月)", album: "D4DJ Groovy Mix カバートラックス Extra Edition Lyrical Lily - EP", releaseDate: "2025-03-05" },
  { id: 1799108806, title: "ロミオとシンデレラ (Cover)", artist: "Lyrical Lily & 春日春奈(CV:進藤あまね)", album: "D4DJ Groovy Mix カバートラックス Extra Edition Lyrical Lily - EP", releaseDate: "2025-03-05" },
  { id: 1799108807, title: "新宝島 (Cover)", artist: "Lyrical Lily & 竹下みいこ(CV:渡瀬結月)", album: "D4DJ Groovy Mix カバートラックス Extra Edition Lyrical Lily - EP", releaseDate: "2025-03-05" },
  { id: 1828349062, title: "夏ニモマケズ!", artist: "Lyrical Lily", album: "夏ニモマケズ! - Single", releaseDate: "2025-07-28" },
  { id: 1828365995, title: "君たちはKawaiku生きるか", artist: "Lyrical Lily", album: "君たちはKawaiku生きるか - Single", releaseDate: "2025-07-28" },
  { id: 1828409800, title: "Lyrical Tea Party!", artist: "Lyrical Lily", album: "Lyrical Tea Party! - Single", releaseDate: "2025-07-28" },
  { id: 1840148108, title: "天使が来りて笛を吹く", artist: "Lyrical Lily", album: "天使が来りて笛を吹く - Single", releaseDate: "2025-09-24" },
  { id: 1861735831, title: "シン・Year", artist: "Lyrical Lily", album: "シン・Year - Single", releaseDate: "2026-01-01" },
  { id: 6781123290, title: "こーふくろん!", artist: "Lyrical Lily", album: "こーふくろん! - Single", releaseDate: "2026-06-24" },
  { id: 6781123940, title: "One Night Carnival (Cover)", artist: "Lyrical Lily", album: "One Night Carnival (Cover) - Single", releaseDate: "2026-06-24" },
] satisfies SongQuizSong[];
