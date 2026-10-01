import type { SongQuizSong } from '../types';

/**
 * 特别呈现 · anime90s 的猜歌曲库（抓取自 iTunes JP 区，含 30 秒试听）。
 *
 * 生成方式：`node tmp/fetch-song-catalog-special.mjs` → `node tmp/song-catalog-special-to-ts.mjs`，不要手改。
- 曲目来自人工挑的金曲清单（特摄主题曲 / 各年代动漫金曲），在 iTunes 定点检索后取最早的正式版本。
- 同一首歌的多个版本（BEST 盘、TV size 等）已合并，只保留最早发行的版本。
 * - `id` 是 iTunes trackId；试听地址由服务端 `/api/song-quiz/previews` 按 id 实时换取。
 * - 按发行日期升序排列。
 */
export default [
  { id: 1893019546, title: "おどるポンポコリン", artist: "B.B.クィーンズ", album: "おどるポンポコリン - Single", releaseDate: "1990-04-04" },
  { id: 1457287222, title: "微笑みの爆弾", artist: "馬渡松子", album: "微笑みの爆弾 - Single", releaseDate: "1992-11-06" },
  { id: 1693756747, title: "君が好きだと叫びたい", artist: "BAAD", album: "BAAD", releaseDate: "1993-12-01" },
  { id: 1455064197, title: "アンバランスなKissをして", artist: "高橋ひろ", album: "ウェルカム トゥ ポプシクル チャンネル", releaseDate: "1994-11-18" },
  { id: 302665624, title: "Get along", artist: "林原めぐみ & 奥井雅美", album: "スレイヤーズ MEGUMIX", releaseDate: "1995-05-24" },
  { id: 258926790, title: "残酷な天使のテーゼ", artist: "高橋洋子", album: "残酷な天使のテーゼ - EP", releaseDate: "1995-10-25" },
  { id: 201480054, title: "マイ フレンド", artist: "ZARD", album: "Golden Best ~15th Anniversary~", releaseDate: "1996-01-08" },
  { id: 1536209106, title: "そばかす", artist: "JUDY AND MARY", album: "THE POWER SOURCE", releaseDate: "1996-02-19" },
  { id: 75471729, title: "世界が終るまでは…", artist: "WANDS", album: "TVアニメーション スラムダンク テーマソング集 - EP", releaseDate: "1996-03-20" },
  { id: 1501480127, title: "Give a reason", artist: "林原めぐみ", album: "スレイヤーズMEGUMIXXX", releaseDate: "1996-04-24" },
  { id: 1536276971, title: "HEART OF SWORD 〜夜明け前〜", artist: "T.M.Revolution", album: "B☆E☆S☆T", releaseDate: "1996-11-11" },
  { id: 258926443, title: "魂のルフラン", artist: "高橋洋子", album: "魂のルフラン/THANATOS-IF I CAN'T BE YOURS - EP", releaseDate: "1997-02-21" },
  { id: 1608853502, title: "1/2", artist: "川本真琴", album: "1/2 - Single", releaseDate: "1997-03-21" },
  { id: 1618913658, title: "謎", artist: "小松未歩", album: "謎 - Single", releaseDate: "1997-05-28" },
  { id: 583838497, title: "めざせポケモンマスター", artist: "松本梨香", album: "ポケモンTVアニメ主題歌 BEST OF BEST 1997-2012", releaseDate: "1997-06-28" },
  { id: 543496354, title: "奇跡の海", artist: "坂本真綾", album: "奇跡の海 - Single", releaseDate: "1998-04-22" },
  { id: 74989295, title: "煌めく瞬間に捕われて", artist: "Manish", album: "Complete of MANISH: At the Being Studio", releaseDate: "1998-10-28" },
  { id: 1581731326, title: "運命のルーレット廻して", artist: "ZARD", album: "永遠", releaseDate: "1999-02-17" },
  { id: 1581731595, title: "息もできない", artist: "ZARD", album: "永遠", releaseDate: "1999-02-17" },
  { id: 520531141, title: "Butter-Fly", artist: "和田光司", album: "デジモンオープニングベストスピリット", releaseDate: "1999-09-22" },
  { id: 1772211459, title: "ウィーアー!", artist: "きただにひろし", album: "TVアニメ『ONE PIECE』オープニングテーマ「ウィーアー!」 - EP", releaseDate: "1999-11-20" },
  { id: 1323018842, title: "扉をあけて", artist: "ANZA", album: "カードキャプターさくら ソングコレクション 1999.4~2001.2", releaseDate: "2017-12-13" },
] satisfies SongQuizSong[];
