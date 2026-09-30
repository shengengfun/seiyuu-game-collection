import type { SongQuizSong } from '../types';

/**
 * 特别呈现 · anime80s 的猜歌曲库（抓取自 iTunes JP 区，含 30 秒试听）。
 *
 * 生成方式：`node tmp/fetch-song-catalog-special.mjs` → `node tmp/song-catalog-special-to-ts.mjs`，不要手改。
- 曲目来自人工挑的金曲清单（特摄主题曲 / 各年代动漫金曲），在 iTunes 定点检索后取最早的正式版本。
- 同一首歌的多个版本（BEST 盘、TV size 等）已合并，只保留最早发行的版本。
 * - `id` 是 iTunes trackId；试听地址由服务端 `/api/song-quiz/previews` 按 id 实时换取。
 * - 按发行日期升序排列。
 */
export default [
  { id: 1479166712, title: "ラムのラブソング", artist: "松谷祐子", album: "ラムのラブソング - Single", releaseDate: "1981-10-21" },
  { id: 1827160074, title: "想い出がいっぱい", artist: "H2O", album: "H2O 45th Anniversary Best Selection", releaseDate: "1983-03-25" },
  { id: 681102861, title: "デリケートに好きして", artist: "太田貴子", album: "魔法の天使クリィミーマミ〜名作アニメ総集編", releaseDate: "1983-07-25" },
  { id: 141989018, title: "CAT'S EYE", artist: "杏里", album: "CAT'S EYE - Single", releaseDate: "1983-08-05" },
  { id: 1611160613, title: "燃えてヒーロー", artist: "沖田 浩之", album: "E気持 / 燃えてヒーロー BESTタッグ - Single", releaseDate: "1983-11-21" },
  { id: 1635266196, title: "愛・おぼえていますか", artist: "飯島真理", album: "愛・おぼえていますか - EP", releaseDate: "1984-01-01" },
  { id: 1688404844, title: "Z・刻をこえて", artist: "鮎川麻弥", album: "Z・刻をこえて - Single", releaseDate: "1985-02-21" },
  { id: 1483879188, title: "タッチ", artist: "岩崎良美", album: "タッチ - Single", releaseDate: "1985-03-21" },
  { id: 1483879222, title: "愛がひとりぼっち", artist: "岩崎良美", album: "愛がひとりぼっち - Single", releaseDate: "1985-03-21" },
  { id: 1688399963, title: "水の星へ愛をこめて", artist: "森口博子", album: "水の星へ愛をこめて - Single", releaseDate: "1985-08-07" },
  { id: 1244690678, title: "アニメじゃない-夢を忘れた古い地球人よ-", artist: "新井正人", album: "GUNDAM SONGS 145", releaseDate: "1986-02-21" },
  { id: 1536193361, title: "Get Wild", artist: "TM NETWORK", album: "GIFT FOR FANKS", releaseDate: "1987-04-08" },
  { id: 1579773903, title: "サムライハート", artist: "森口博子", album: "鎧伝サムライトルーパー 君を眠らせない", releaseDate: "1988-01-01" },
  { id: 1513011091, title: "Step", artist: "a・chi-a・chi", album: "魔神英雄伝ワタル Music Collection (オリジナルサウンドトラック)", releaseDate: "1988-05-21" },
  { id: 435413275, title: "聖闘士神話 ~ソルジャー・ドリーム~", artist: "影山ヒロノブ", album: "影山ヒロノブ POWER LIVE '98", releaseDate: "1998-11-18" },
  { id: 435413360, title: "CHA-LA HEAD-CHA-LA", artist: "影山ヒロノブ", album: "影山ヒロノブ POWER LIVE '98", releaseDate: "1998-11-18" },
  { id: 83256862, title: "キン肉マン Go Fight ! (2005 ver.)", artist: "串田アキラ", album: "キン肉マン Go Fight ! (2005ver.) [セルフカバー]", releaseDate: "2005-10-05" },
  { id: 377371853, title: "ロマンティックあげるよ (21stcenturyver.)", artist: "橋本 潮", album: "アニソン No.1 Vol.2", releaseDate: "2008-06-04" },
  { id: 1048913391, title: "魔訶不思議アドベンチャー!(English ver.)", artist: "高橋 洋樹", album: "イナズマchallenger", releaseDate: "2008-06-04" },
  { id: 362056426, title: "ペガサス幻想(21st century ver.)", artist: "MAKE-UP", album: "The Voice From Yesterday - EP", releaseDate: "2009-12-16" },
  { id: 1538962364, title: "City Hunter 〜愛よ消えないで〜", artist: "小比類巻かほる", album: "黄金の80'sベストヒッツ35曲!〜Epic35〜", releaseDate: "2014-01-29" },
  { id: 915724668, title: "愛をとりもどせ!!", artist: "クリスタルキング", album: "アニメ北斗の拳 - EP", releaseDate: "2014-09-17" },
] satisfies SongQuizSong[];
