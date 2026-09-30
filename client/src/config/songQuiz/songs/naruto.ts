import type { SongQuizSong } from '../types';

/**
 * 热门IP · naruto 的猜歌曲库（抓取自 iTunes JP 区，含 30 秒试听）。
 *
 * 生成方式：`node tmp/fetch-song-catalog-special.mjs` → `node tmp/song-catalog-special-to-ts.mjs`，不要手改。
- 曲目来自人工挑的各 IP 代表曲（主题歌 / OP / ED），在 iTunes 定点检索后取最早的正式版本。
- 同一首歌的多个版本（BEST 盘、TV size 等）已合并，只保留最早发行的版本。
 * - `id` 是 iTunes trackId；试听地址由服务端 `/api/song-quiz/previews` 按 id 实时换取。
 * - 按发行日期升序排列。
 */
export default [
  { id: 1536394884, title: "遥か彼方", artist: "ASIAN KUNG-FU GENERATION", album: "BEST HIT AKG", releaseDate: "2002-11-25" },
  { id: 1537381458, title: "青春狂騒曲", artist: "サンボマスター", album: "サンボマスターは君に語りかける", releaseDate: "2004-12-01" },
  { id: 1536275329, title: "ノーボーイ・ノークライ(アルバム・ヴァージョン)", artist: "STANCE PUNKS", album: "HOWLING IDOL〜死ねなかった電撃野郎〜", releaseDate: "2005-07-20" },
  { id: 1536963815, title: "悲しみをやさしさに", artist: "little by little", album: "Sweet Noodle Pop", releaseDate: "2005-07-25" },
  { id: 1538160321, title: "Re:member", artist: "FLOW", album: "FLOW THE BEST 〜アニメ縛り〜", releaseDate: "2006-05-31" },
  { id: 1611515236, title: "ユラユラ", artist: "HEARTS GROW", album: "かさなる影 / ユラユラ BESTタッグ - Single", releaseDate: "2006-12-06" },
  { id: 1536898529, title: "Hero's Come Back!!", artist: "nobodyknows+", album: "Hero's Come Back!! - EP", releaseDate: "2007-04-25" },
  { id: 1536263347, title: "ブルーバード", artist: "いきものがかり", album: "いきものばかり〜メンバーズBESTセレクション〜", releaseDate: "2008-07-09" },
  { id: 1536372805, title: "CLOSER", artist: "井上 ジョー", album: "CLOSER - EP", releaseDate: "2008-11-26" },
  { id: 1537239616, title: "波風サテライト", artist: "シュノーケル", album: "Best+", releaseDate: "2009-09-16" },
  { id: 1536260385, title: "ホタルノヒカリ", artist: "いきものがかり", album: "ハジマリノウタ", releaseDate: "2009-12-23" },
  { id: 1536115701, title: "distance", artist: "LONG SHOT PARTY", album: "LONG SHOT PARTY", releaseDate: "2010-07-28" },
  { id: 1445023978, title: "透明だった世界", artist: "秦 基博", album: "透明だった世界 - EP", releaseDate: "2010-08-11" },
  { id: 1536475079, title: "Diver", artist: "NICO Touches the Walls", album: "Diver - EP", releaseDate: "2011-01-12" },
  { id: 1536479134, title: "GO!!!", artist: "FLOW", album: "FLOW ANIME BEST", releaseDate: "2011-03-23" },
  { id: 1537248451, title: "newsong", artist: "tacica", album: "newsong e.p.", releaseDate: "2012-01-18" },
  { id: 1536310072, title: "Moshimo", artist: "ダイスケ", album: "Moshimo - Single", releaseDate: "2012-12-13" },
  { id: 1536382006, title: "Sign", artist: "FLOW", album: "MICROCOSM", releaseDate: "2013-01-10" },
  { id: 1537524863, title: "月の大きさ", artist: "乃木坂46", album: "バレッタ TypeD - EP", releaseDate: "2013-11-27" },
  { id: 1536452261, title: "紅蓮", artist: "DOES", album: "紅蓮 - Single", releaseDate: "2014-07-02" },
  { id: 1536455325, title: "シルエット", artist: "KANA-BOON", album: "シルエット - Single", releaseDate: "2014-11-26" },
  { id: 1536312236, title: "風", artist: "山猿", album: "風 - Single", releaseDate: "2015-07-01" },
  { id: 1444894516, title: "LINE", artist: "スキマスイッチ", album: "LINE", releaseDate: "2015-11-11" },
  { id: 1536461315, title: "ブラッドサーキュレーター", artist: "ASIAN KUNG-FU GENERATION", album: "ブラッドサーキュレーター - Single", releaseDate: "2016-07-13" },
  { id: 1538280039, title: "カラノココロ", artist: "Anly", album: "カラノココロ - EP", releaseDate: "2017-01-18" },
] satisfies SongQuizSong[];
