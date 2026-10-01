import type { SongQuizSong } from '../types';

/**
 * 热门IP · dragonball 的猜歌曲库（抓取自 iTunes JP 区，含 30 秒试听）。
 *
 * 生成方式：`node tmp/fetch-song-catalog-special.mjs` → `node tmp/song-catalog-special-to-ts.mjs`，不要手改。
- 曲目来自人工挑的各 IP 代表曲（主题歌 / OP / ED），在 iTunes 定点检索后取最早的正式版本。
- 同一首歌的多个版本（BEST 盘、TV size 等）已合并，只保留最早发行的版本。
 * - `id` 是 iTunes trackId；试听地址由服务端 `/api/song-quiz/previews` 按 id 实时换取。
 * - 按发行日期升序排列。
 */
export default [
  { id: 435413358, title: "僕達は天使だった", artist: "影山ヒロノブ", album: "影山ヒロノブ POWER LIVE '98", releaseDate: "1993-11-21" },
  { id: 1732388923, title: "ひとりじゃない", artist: "DEEN", album: "ひとりじゃない - Single", releaseDate: "1996-04-15" },
  { id: 77295564, title: "DAN DAN 心魅かれてく", artist: "FIELD OF VIEW", album: "Complete of Field of View - At the Being Studio", releaseDate: "1997-10-08" },
  { id: 435413360, title: "CHA-LA HEAD-CHA-LA", artist: "影山ヒロノブ", album: "影山ヒロノブ POWER LIVE '98", releaseDate: "1998-11-18" },
  { id: 129251823, title: "WE GOTTA POWER(2005Ver.)", artist: "影山ヒロノブ", album: "CHA-LA HEAD-CHA-LA(2005Ver.) セルフカバー EP", releaseDate: "2005-07-20" },
  { id: 377371853, title: "ロマンティックあげるよ (21stcenturyver.)", artist: "橋本 潮", album: "アニソン No.1 Vol.2", releaseDate: "2008-06-04" },
  { id: 1048913391, title: "魔訶不思議アドベンチャー!(English ver.)", artist: "高橋 洋樹", album: "イナズマchallenger", releaseDate: "2008-06-04" },
  { id: 1527207627, title: "Dragon Soul", artist: "谷本貴義", album: "Career along", releaseDate: "2009-05-20" },
  { id: 1527207715, title: "Yeah! Break! Care! Break!", artist: "谷本貴義", album: "Career along", releaseDate: "2009-06-24" },
  { id: 262132726, title: "Blue Velvet", artist: "工藤静香", album: "I'm not", releaseDate: "2012-10-31" },
  { id: 886518996, title: "空・前・絶・後 Kuu-Zen-Zetsu-Go", artist: "谷本貴義(Dragon Soul)", album: "テレビアニメ「ドラゴンボール改 魔人ブウ編」オープニング・テーマ空・前・絶・後 Kuu-Zen-Zetsu-Go - EP", releaseDate: "2014-06-18" },
  { id: 1040758063, title: "超絶☆ダイナミック!", artist: "吉井和哉", album: "超絶☆ダイナミック! - EP", releaseDate: "2015-10-07" },
  { id: 1296690341, title: "限界突破×サバイバー", artist: "氷川きよし", album: "限界突破×サバイバー - Single", releaseDate: "2017-08-26" },
  { id: 1440448453, title: "Blizzard", artist: "三浦大知", album: "Blizzard - Single", releaseDate: "2018-11-09" },
  { id: 1568995696, title: "錆びついたマシンガンで今を撃ち抜こう [WANDS 第 5 期 ver.]", artist: "WANDS", album: "カナリア鳴いた頃に - Single", releaseDate: "2021-06-09" },
] satisfies SongQuizSong[];
