import type { SongQuizSong } from '../types';

/**
 * 特别呈现 · meme 的猜歌曲库（抓取自 iTunes JP 区，含 30 秒试听）。
 *
 * 生成方式：`node tmp/fetch-song-catalog-special.mjs` → `node tmp/song-catalog-special-to-ts.mjs`，不要手改。
- 曲目来自人工挑的金曲清单（特摄主题曲 / 各年代动漫金曲），在 iTunes 定点检索后取最早的正式版本。
- 同一首歌的多个版本（BEST 盘、TV size 等）已合并，只保留最早发行的版本。
 * - `id` 是 iTunes trackId；试听地址由服务端 `/api/song-quiz/previews` 按 id 实时换取。
 * - 按发行日期升序排列。
 */
export default [
  { id: 185717604, title: "Africa", artist: "Toto", album: "Toto IV", releaseDate: "1982-04-08" },
  { id: 380907765, title: "Take On Me", artist: "a-ha", album: "Hunting High and Low (Deluxe Edition)", releaseDate: "1985-06-01" },
  { id: 196480329, title: "The Final Countdown", artist: "Europe", album: "The Final Countdown (Expanded Edition)", releaseDate: "1986-02-14" },
  { id: 1559523359, title: "Never Gonna Give You Up", artist: "Rick Astley", album: "3 Originals", releaseDate: "1987-01-01" },
  { id: 1731384547, title: "What Is Love (7\" Mix)", artist: "HADDAWAY", album: "What Is Love - EP", releaseDate: "1992-12-01" },
  { id: 1440768563, title: "Barbie Girl", artist: "AQUA", album: "Aquarium", releaseDate: "1997-01-01" },
  { id: 1811951322, title: "You Spin Me Round (Like a Record) [Rerecorded]", artist: "Dead Or Alive", album: "Back to the 80s: 20 Great Pop Hits, Vol. 3", releaseDate: "1997-06-03" },
  { id: 1124425261, title: "Tunak Tunak Tun", artist: "Daler Mehndi", album: "Tunak Tunak Viral Hits", releaseDate: "1998-01-01" },
  { id: 1440915693, title: "All Star", artist: "Smash Mouth", album: "Astro Lounge", releaseDate: "1999-05-04" },
  { id: 338349243, title: "Sandstorm", artist: "Darude", album: "Before the Storm, Special Edition", releaseDate: "1999-10-26" },
  { id: 1369887955, title: "Axel F", artist: "Crazy Frog", album: "Best of Crazy Hits", releaseDate: "2000-01-01" },
  { id: 1489788618, title: "Dragostea Din Tei", artist: "O-Zone", album: "Dragostea Din Tei - Single", releaseDate: "2004-06-07" },
  { id: 1805003595, title: "マツケンサンバⅡ", artist: "松平健", album: "マツケン・サンバ Ⅱ", releaseDate: "2004-07-07" },
  { id: 382250342, title: "レッツゴー!陰陽師", artist: "矢部野彦麿&琴姫With坊主ダンサーズ", album: "レッツゴー!陰陽師 - Single", releaseDate: "2007-04-18" },
  { id: 280693673, title: "エアーマンが倒せない", artist: "Team.ねこかん[猫]", album: "エアーマンが倒せない - EP", releaseDate: "2007-09-01" },
  { id: 1441561086, title: "The Gummy Bear Song (I Am a Gummy Bear)", artist: "Gummy Bear", album: "The Gummy Bear Song Around the World", releaseDate: "2007-10-09" },
  { id: 1495013033, title: "Caramelldansen", artist: "Caramella Girls", album: "Supergott (Speedy Mixes)", releaseDate: "2008-03-01" },
  { id: 1018748012, title: "ぽっぴっぽー (feat. Hatsune Miku)", artist: "ラマーズP feat.初音ミク", album: "EXIT TUNES PRESENTS THE COMPLETE BEST OF ラマーズP feat.初音ミク", releaseDate: "2009-11-18" },
  { id: 350211904, title: "Chocolate Rain", artist: "Tay Zonday", album: "Chocolate Rain", releaseDate: "2010-01-09" },
  { id: 418008884, title: "Rasputin (Club Mix)", artist: "ボニーM", album: "Barbra Streisand - Boney M. Goes Club", releaseDate: "2011-01-28" },
  { id: 1650021644, title: "Friday", artist: "Rebecca Black", album: "Friday - Single", releaseDate: "2011-03-14" },
  { id: 459999847, title: "Nyanyanyanyanyanyanya! (feat. 初音ミク)", artist: "daniwellP", album: "Nyanyanyanyanyanyanya! (feat. 初音ミク) - Single", releaseDate: "2011-07-06" },
  { id: 601136935, title: "Harlem Shake", artist: "Baauer", album: "Harlem Shake - Single", releaseDate: "2012-05-22" },
  { id: 1452862511, title: "Gangnam Style", artist: "PSY", album: "Gangnam Style - Single", releaseDate: "2012-07-15" },
  { id: 690233856, title: "The Fox (What Does the Fox Say?)", artist: "Ylvis", album: "The Fox (What Does the Fox Say?) - Single", releaseDate: "2013-09-03" },
  { id: 1074925792, title: "ようかい体操第一", artist: "Dream5", album: "妖怪ウォッチ ミュージックベスト~ファースト・シーズン~", releaseDate: "2014-04-23" },
  { id: 1089527927, title: "ウッーウッーウマウマ (Ryu*Remix)", artist: "Ryu☆", album: "Ryu☆BEST -MOONLiGHT-", releaseDate: "2016-03-09" },
  { id: 1274300446, title: "Astronomia", artist: "Vicetone & Tony Igy", album: "Astronomia - Single", releaseDate: "2016-09-16" },
  { id: 1185740794, title: "PPAP (SPANKERS)", artist: "ピコ太郎", album: "PPAP (SPANKERS) - Single", releaseDate: "2016-10-28" },
  { id: 1264976429, title: "Baby Shark", artist: "Pinkfong", album: "Pinkfong Animal Songs", releaseDate: "2017-07-27" },
  { id: 1395991207, title: "Crab Rave", artist: "Noisestorm", album: "Crab Rave - Single", releaseDate: "2018-04-01" },
  { id: 1455313913, title: "Ievan Polkka (feat. Hatsune Miku)", artist: "Otomania", album: "Ievan Polkka - Single", releaseDate: "2019-03-15" },
  { id: 1732978285, title: "みくみくにしてあげる♪【してやんよ】", artist: "ika", album: "みくみくにしてあげる♪【してやんよ】 - Single", releaseDate: "2024-03-06" },
  { id: 1860354297, title: "We are number one", artist: "LazyTown", album: "One More Time", releaseDate: "2025-12-09" },
] satisfies SongQuizSong[];
