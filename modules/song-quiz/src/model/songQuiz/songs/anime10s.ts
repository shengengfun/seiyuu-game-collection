import type { SongQuizSong } from '../types';

/**
 * 特别呈现 · anime10s 的猜歌曲库（抓取自 iTunes JP 区，含 30 秒试听）。
 *
 * 生成方式：`node tmp/fetch-song-catalog-special.mjs` → `node tmp/song-catalog-special-to-ts.mjs`，不要手改。
- 曲目来自人工挑的金曲清单（特摄主题曲 / 各年代动漫金曲），在 iTunes 定点检索后取最早的正式版本。
- 同一首歌的多个版本（BEST 盘、TV size 等）已合并，只保留最早发行的版本。
 * - `id` 是 iTunes trackId；试听地址由服务端 `/api/song-quiz/previews` 按 id 实时换取。
 * - 按发行日期升序排列。
 */
export default [
  { id: 1537419724, title: "chAngE", artist: "miwa", album: "chAngE - EP", releaseDate: "2010-09-01" },
  { id: 1536475079, title: "Diver", artist: "NICO Touches the Walls", album: "Diver - EP", releaseDate: "2011-01-12" },
  { id: 1537241619, title: "コネクト", artist: "ClariS", album: "コネクト - EP", releaseDate: "2011-02-02" },
  { id: 1537241312, title: "Magia", artist: "Kalafina", album: "Magia - Single", releaseDate: "2011-02-16" },
  { id: 448858450, title: "マジLOVE1000%", artist: "ST☆RISH", album: "マジLOVE1000% - EP", releaseDate: "2011-07-20" },
  { id: 477654422, title: "ウィーゴー!", artist: "きただにひろし", album: "ウィーゴー! - Single", releaseDate: "2011-11-16" },
  { id: 1537785962, title: "crossing field", artist: "LiSA", album: "crossing field - EP", releaseDate: "2012-08-08" },
  { id: 1298567001, title: "恋に恋して", artist: "倉木麻衣", album: "倉木麻衣×名探偵コナン COLLABORATION BEST 21 -真実はいつも歌にある!-", releaseDate: "2012-08-15" },
  { id: 1538127486, title: "RE:I AM", artist: "Aimer", album: "Midnight Sun", releaseDate: "2013-03-20" },
  { id: 1804656888, title: "sister's noise", artist: "fripSide", album: "infinite synthesis 2", releaseDate: "2013-05-08" },
  { id: 666788983, title: "紅蓮の弓矢", artist: "Linked Horizon", album: "自由への進撃 - Single", releaseDate: "2013-07-10" },
  { id: 1537263866, title: "シリウス", artist: "藍井エイル", album: "シリウス - Single", releaseDate: "2013-10-30" },
  { id: 1538127487, title: "StarRingChild", artist: "Aimer", album: "Midnight Sun", releaseDate: "2014-05-21" },
  { id: 1535535911, title: "unravel", artist: "TK from 凛として時雨", album: "unravel - Single", releaseDate: "2014-07-23" },
  { id: 1535817965, title: "ideal white", artist: "綾野 ましろ", album: "ideal white - EP", releaseDate: "2014-10-22" },
  { id: 1538125033, title: "BLAZING", artist: "GARNiDELiA", album: "Linkage Ring", releaseDate: "2014-10-29" },
  { id: 1536455325, title: "シルエット", artist: "KANA-BOON", album: "シルエット - Single", releaseDate: "2014-11-26" },
  { id: 1128654728, title: "シュガーソングとビターステップ", artist: "UNISON SQUARE GARDEN", album: "Dr.Izzy", releaseDate: "2015-05-20" },
  { id: 1536129357, title: "Brave Shine", artist: "Aimer", album: "Brave Shine - EP", releaseDate: "2015-06-03" },
  { id: 1024336457, title: "Hard Knock Days", artist: "GENERATIONS from EXILE TRIBE", album: "Hard Knock Days - EP", releaseDate: "2015-08-12" },
  { id: 1027316508, title: "Clattanoia", artist: "OxT", album: "TVアニメ「オーバーロード」オープニングテーマ「Clattanoia」 - EP", releaseDate: "2015-08-26" },
  { id: 1537746316, title: "Raise your flag", artist: "MAN WITH A MISSION", album: "Dead End in Tokyo European Edition - EP", releaseDate: "2015-10-14" },
  { id: 1746439587, title: "THE HERO !! ～怒れる拳に火をつけろ～", artist: "JAM Project", album: "JAM Project BEST COLLECTION XII THUNDERBIRD", releaseDate: "2015-10-21" },
  { id: 1077263357, title: "fantastic dreamer", artist: "Machico", album: "TVアニメ『この素晴らしい世界に祝福を!』オープニング・テーマ「fantastic dreamer」 - EP", releaseDate: "2016-01-27" },
  { id: 1536460740, title: "Survivor", artist: "BLUE ENCOUNT", album: "Survivor - Single", releaseDate: "2016-03-09" },
  { id: 1107861535, title: "Redo", artist: "鈴木このみ", album: "TVアニメ「Re:ゼロから始める異世界生活」オープニングテーマ「Redo」 - EP", releaseDate: "2016-05-11" },
  { id: 1538258224, title: "THE DAY", artist: "ポルノグラフィティ", album: "THE DAY - Single", releaseDate: "2016-05-15" },
  { id: 1140022697, title: "Paradisus-Paradoxum", artist: "MYTH & ROID", album: "TVアニメ「Re:ゼロから始める異世界生活」後期オープニングテーマ「Paradisus-Paradoxum」 - EP", releaseDate: "2016-08-24" },
  { id: 1251263403, title: "世界はあなたの色になる", artist: "B'z", album: "声明 / Still Alive - EP", releaseDate: "2016-10-04" },
  { id: 1535622395, title: "RAGE OF DUST", artist: "SPYAIR", album: "RAGE OF DUST - Single", releaseDate: "2016-11-09" },
  { id: 1440763501, title: "スパークル (original ver.)", artist: "RADWIMPS", album: "人間開花", releaseDate: "2016-11-23" },
  { id: 1538280039, title: "カラノココロ", artist: "Anly", album: "カラノココロ - EP", releaseDate: "2017-01-18" },
  { id: 1198924324, title: "ようこそジャパリパークへ", artist: "どうぶつビスケッツ×PPP", album: "ようこそジャパリパークへ -TVアニメ「けものフレンズ」オープニング主題歌- - Single", releaseDate: "2017-02-08" },
  { id: 1229977150, title: "心臓を捧げよ!", artist: "Linked Horizon", album: "進撃の軌跡", releaseDate: "2017-05-17" },
  { id: 1296690341, title: "限界突破×サバイバー", artist: "氷川きよし", album: "限界突破×サバイバー - Single", releaseDate: "2017-08-26" },
  { id: 1538101566, title: "空に歌えば", artist: "amazarashi", album: "空に歌えば - EP", releaseDate: "2017-09-06" },
  { id: 1535550465, title: "katharsis", artist: "TK from 凛として時雨", album: "katharsis - EP", releaseDate: "2018-10-10" },
  { id: 1529543135, title: "紅蓮華", artist: "LiSA", album: "LEO-NiNE", releaseDate: "2019-04-21" },
] satisfies SongQuizSong[];
