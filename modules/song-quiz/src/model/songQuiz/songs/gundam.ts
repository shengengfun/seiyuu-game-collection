import type { SongQuizSong } from '../types';

/**
 * 热门IP · gundam 的猜歌曲库（抓取自 iTunes JP 区，含 30 秒试听）。
 *
 * 生成方式：`node tmp/fetch-song-catalog-special.mjs` → `node tmp/song-catalog-special-to-ts.mjs`，不要手改。
- 曲目来自人工挑的各 IP 代表曲（主题歌 / OP / ED），在 iTunes 定点检索后取最早的正式版本。
- 同一首歌的多个版本（BEST 盘、TV size 等）已合并，只保留最早发行的版本。
 * - `id` 是 iTunes trackId；试听地址由服务端 `/api/song-quiz/previews` 按 id 实时换取。
 * - 按发行日期升序排列。
 */
export default [
  { id: 1689209423, title: "永遠にアムロ", artist: "池田鴻 & フィーリング・フリー", album: "永遠にアムロ - Single", releaseDate: "1979-04-21" },
  { id: 1689210106, title: "翔べ!ガンダム", artist: "池田鴻, フィーリング・フリー & ミュージッククリエイション", album: "翔べ!ガンダム - Single", releaseDate: "1979-04-21" },
  { id: 1689209174, title: "哀 戦士", artist: "井上大輔", album: "哀 戦士 - Single", releaseDate: "1981-07-05" },
  { id: 1689210046, title: "めぐりあい", artist: "井上大輔", album: "めぐりあい - Single", releaseDate: "1982-01-01" },
  { id: 1688404844, title: "Z・刻をこえて", artist: "鮎川麻弥", album: "Z・刻をこえて - Single", releaseDate: "1985-02-21" },
  { id: 1688399963, title: "水の星へ愛をこめて", artist: "森口博子", album: "水の星へ愛をこめて - Single", releaseDate: "1985-08-07" },
  { id: 1244690678, title: "アニメじゃない-夢を忘れた古い地球人よ-", artist: "新井正人", album: "GUNDAM SONGS 145", releaseDate: "1986-02-21" },
  { id: 1535172508, title: "THE WINNER", artist: "松原みき", album: "「機動戦士ガンダム0083 STARDUST MEMORY」主題歌 MAGIC - Single", releaseDate: "1991-01-01" },
  { id: 1688416637, title: "サイレント・ヴォイス", artist: "ひろえ純", album: "サイレント・ヴォイス - Single", releaseDate: "1991-01-01" },
  { id: 1690340123, title: "CENTURY COLOR", artist: "RAY-GUNS", album: "CENTURY COLOR - Single", releaseDate: "1991-01-01" },
  { id: 1690728532, title: "ETERNAL WIND～ほほえみは光る風の中～", artist: "森口博子", album: "ETERNAL WIND～ほほえみは光る風の中～ - Single", releaseDate: "1991-02-05" },
  { id: 1535172644, title: "MEN OF DESTINY", artist: "MIO", album: "「機動戦士ガンダム0083 STARDUST MEMORY」主題歌 Evergreen - Single", releaseDate: "1992-01-01" },
  { id: 1562662123, title: "JUST COMMUNICATION", artist: "TWO-MIX", album: "JUST COMMUNICATION - EP", releaseDate: "1995-04-29" },
  { id: 1529288781, title: "RHYTHM EMOTION", artist: "TWO-MIX", album: "新機動戦記ガンダムW Original Soundtrack - Operation 4", releaseDate: "1995-11-22" },
  { id: 1529235700, title: "Resolution", artist: "ROMANTIC MODE", album: "機動新世紀ガンダム X Original Soundtrack - SIDE 3", releaseDate: "1996-01-01" },
  { id: 1789256319, title: "嵐の中で輝いて", artist: "米倉千尋", album: "Little Voice", releaseDate: "1996-01-24" },
  { id: 1690741659, title: "DREAMS", artist: "ROMANTIC MODE", album: "DREAMS - Single", releaseDate: "1996-07-24" },
  { id: 1562661799, title: "WHITE REFLECTION", artist: "TWO-MIX", album: "WHITE REFLECTION - EP", releaseDate: "1997-01-15" },
  { id: 1690349545, title: "ターンAターン", artist: "西城秀樹", album: "ターンAターン - Single", releaseDate: "1999-01-01" },
  { id: 916140634, title: "あんなに一緒だったのに", artist: "See-Saw", album: "Dream Field", releaseDate: "2002-10-23" },
  { id: 500650244, title: "暁の車", artist: "FictionJunction featuring YUUKA", album: "機動戦士ガンダムSEED 挿入歌 暁の車 - Single", releaseDate: "2003-06-21" },
  { id: 1535491084, title: "FIND THE WAY", artist: "中島 美嘉", album: "BEST", releaseDate: "2003-08-06" },
  { id: 1537390584, title: "Realize", artist: "玉置成実", album: "Graduation 〜Singles〜", releaseDate: "2004-02-25" },
  { id: 1536316536, title: "ignited -イグナイテッド-", artist: "T.M.Revolution", album: "2020 -T.M.Revolution ALL TIME BEST-", releaseDate: "2004-11-03" },
  { id: 1537231805, title: "PRIDE", artist: "HIGH AND MIGHTY COLOR", album: "G∞VER", releaseDate: "2005-01-26" },
  { id: 1536108110, title: "Ash Like Snow", artist: "the brilliant green", album: "Ash Like Snow - Single", releaseDate: "2008-02-06" },
  { id: 1537398812, title: "儚くも永久のカナシ", artist: "UVERworld", album: "儚くも永久のカナシ - Single", releaseDate: "2008-11-19" },
  { id: 1538127486, title: "RE:I AM", artist: "Aimer", album: "Midnight Sun", releaseDate: "2013-03-20" },
  { id: 1538127487, title: "StarRingChild", artist: "Aimer", album: "Midnight Sun", releaseDate: "2014-05-21" },
  { id: 1538125033, title: "BLAZING", artist: "GARNiDELiA", album: "Linkage Ring", releaseDate: "2014-10-29" },
  { id: 1537746316, title: "Raise your flag", artist: "MAN WITH A MISSION", album: "Dead End in Tokyo European Edition - EP", releaseDate: "2015-10-14" },
  { id: 1535622395, title: "RAGE OF DUST", artist: "SPYAIR", album: "RAGE OF DUST - Single", releaseDate: "2016-11-09" },
  { id: 1645308331, title: "祝福", artist: "YOASOBI", album: "祝福 - Single", releaseDate: "2022-10-01" },
  { id: 1646019250, title: "君よ 気高くあれ", artist: "シユイ", album: "君よ 気高くあれ - Single", releaseDate: "2022-10-09" },
  { id: 1679873472, title: "slash", artist: "yama", album: "slash - Single", releaseDate: "2023-04-09" },
] satisfies SongQuizSong[];
