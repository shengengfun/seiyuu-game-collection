import type { SongQuizSong } from '../types';

/**
 * 特别呈现 · anime00s 的猜歌曲库（抓取自 iTunes JP 区，含 30 秒试听）。
 *
 * 生成方式：`node tmp/fetch-song-catalog-special.mjs` → `node tmp/song-catalog-special-to-ts.mjs`，不要手改。
- 曲目来自人工挑的金曲清单（特摄主题曲 / 各年代动漫金曲），在 iTunes 定点检索后取最早的正式版本。
- 同一首歌的多个版本（BEST 盘、TV size 等）已合并，只保留最早发行的版本。
 * - `id` 是 iTunes trackId；试听地址由服务端 `/api/song-quiz/previews` 按 id 实时换取。
 * - 按发行日期升序排列。
 */
export default [
  { id: 73795313, title: "Secret of my heart", artist: "倉木麻衣", album: "delicious way", releaseDate: "2000-04-26" },
  { id: 1569329018, title: "夢みたあとで", artist: "GARNET CROW", album: "夢みたあとで - Single", releaseDate: "2002-03-13" },
  { id: 916140634, title: "あんなに一緒だったのに", artist: "See-Saw", album: "Dream Field", releaseDate: "2002-10-23" },
  { id: 1536366366, title: "GO!!!", artist: "FLOW", album: "GO!!! - EP", releaseDate: "2004-04-28" },
  { id: 1536363700, title: "リライト", artist: "ASIAN KUNG-FU GENERATION", album: "リライト - Single", releaseDate: "2004-08-04" },
  { id: 1536316536, title: "ignited -イグナイテッド-", artist: "T.M.Revolution", album: "2020 -T.M.Revolution ALL TIME BEST-", releaseDate: "2004-11-03" },
  { id: 1537381458, title: "青春狂騒曲", artist: "サンボマスター", album: "サンボマスターは君に語りかける", releaseDate: "2004-12-01" },
  { id: 1538966061, title: "D-tecnoLife", artist: "UVERworld", album: "Timeless", releaseDate: "2005-04-01" },
  { id: 378474625, title: "ETERNAL BLAZE", artist: "水樹奈々", album: "HYBRID UNIVERSE", releaseDate: "2005-10-19" },
  { id: 1804649699, title: "緋色の空", artist: "川田まみ", album: "SEED", releaseDate: "2005-11-09" },
  { id: 1880590189, title: "ハレ晴レユカイ", artist: "平野 綾, 茅原実里 & 後藤邑子", album: "ハレ晴レユカイ - EP", releaseDate: "2006-05-10" },
  { id: 1536482652, title: "COLORS", artist: "FLOW", album: "COLORS - EP", releaseDate: "2006-11-08" },
  { id: 1804664165, title: "真赤な誓い", artist: "福山芳樹", album: "真赤な誓い - EP", releaseDate: "2006-11-22" },
  { id: 208382235, title: "創聖のアクエリオン", artist: "AKINO", album: "『創聖のアクエリオン』オープニングテーマ「創聖のアクエリオン」- Single", releaseDate: "2006-12-20" },
  { id: 1537391601, title: "Rolling star", artist: "YUI", album: "CAN'T BUY MY LOVE", releaseDate: "2007-04-04" },
  { id: 1536898529, title: "Hero's Come Back!!", artist: "nobodyknows+", album: "Hero's Come Back!! - EP", releaseDate: "2007-04-25" },
  { id: 1725088406, title: "もってけ!セーラーふく", artist: "泉こなた (CV.平野 綾), 柊かがみ (CV.加藤英美里), 柊つかさ (CV.福原香織) & 高良みゆき (CV.遠藤 綾)", album: "もってけ!セーラーふく - EP", releaseDate: "2007-05-23" },
  { id: 1537518936, title: "空色デイズ", artist: "中川 翔子", album: "空色デイズ - EP", releaseDate: "2007-06-27" },
  { id: 1536306483, title: "ALONES", artist: "Aqua Timez", album: "ALONES - EP", releaseDate: "2007-08-01" },
  { id: 470483954, title: "トライアングラー", artist: "坂本真綾", album: "MBS・TBS系TVアニメ マクロスF(フロンティア) VOCAL COLLECTION 娘たま♀", releaseDate: "2008-04-23" },
  { id: 279843273, title: "ダイアモンド クレバス", artist: "シェリル・ノーム starring May'n", album: "MBS・TBS系TVアニメ マクロスF (フロンティア) ダイアモンド クレバス / 射手座☆午後九時Don't be late - Single", releaseDate: "2008-05-08" },
  { id: 1536371431, title: "曇天", artist: "DOES", album: "曇天 - Single", releaseDate: "2008-06-18" },
  { id: 1538160325, title: "WORLD END", artist: "FLOW", album: "FLOW THE BEST 〜アニメ縛り〜", releaseDate: "2008-08-13" },
  { id: 1537398812, title: "儚くも永久のカナシ", artist: "UVERworld", album: "儚くも永久のカナシ - Single", releaseDate: "2008-11-19" },
  { id: 470484022, title: "ライオン", artist: "May'n & 中島愛", album: "MBS・TBS系TVアニメ マクロスF(フロンティア) VOCAL COLLECTION 娘たま♀", releaseDate: "2008-12-03" },
  { id: 1536110639, title: "PAPERMOON", artist: "Tommy heavenly6", album: "Gothic Melting Ice cream's Darkness Nightmare", releaseDate: "2008-12-10" },
  { id: 1527207627, title: "Dragon Soul", artist: "谷本貴義", album: "Career along", releaseDate: "2009-05-20" },
  { id: 1537418083, title: "again", artist: "YUI", album: "HOLIDAYS IN THE SUN", releaseDate: "2009-06-03" },
  { id: 477402874, title: "Cagayake!GIRLS(ライブイベント ~レッツゴー!~Ver.)", artist: "放課後ティータイム", album: "『けいおん! ライブイベント ~レッツゴー!~』LIVE!(通常盤)", releaseDate: "2011-11-16" },
  { id: 477419788, title: "Don't say “lazy”(ライブイベント ~Come with Me!!~Ver.)", artist: "放課後ティータイム", album: "『けいおん!! ライブイベント ~Come with Me!!~』LIVE!(通常盤)", releaseDate: "2011-11-16" },
] satisfies SongQuizSong[];
