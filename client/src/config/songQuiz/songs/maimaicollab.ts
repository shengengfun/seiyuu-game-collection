import type { SongQuizSong } from '../types';

/**
 * 舞萌DX · maimaicollab 的猜歌曲库（抓取自 iTunes JP 区，含 30 秒试听）。
 *
 * 生成方式：`node tmp/fetch-song-catalog-special.mjs` → `node tmp/song-catalog-special-to-ts.mjs`，不要手改。
- 曲目来自 SEGA 官方的 maimai 合辑（Various Artists），按专辑整盘收录并合并同曲的不同版本。
 * - `id` 是 iTunes trackId；试听地址由服务端 `/api/song-quiz/previews` 按 id 实时换取。
 * - 按发行日期升序排列。
 */
export default [
  { id: 1437761918, title: "最終鬼畜妹フランドール・S (feat.ビートまりお)", artist: "COOL&CREATE", album: "東方インストライク (feat.ビートまりお)", releaseDate: "2004-12-30" },
  { id: 1437879009, title: "魔理沙は大変なものを盗んでいきました", artist: "IOSYS", album: "東方乙女囃子", releaseDate: "2006-08-13" },
  { id: 1437877501, title: "チルノのパーフェクトさんすう教室", artist: "IOSYS", album: "東方氷雪歌集", releaseDate: "2008-11-02" },
  { id: 1537405915, title: "君の知らない物語", artist: "supercell", album: "君の知らない物語 - EP", releaseDate: "2009-08-12" },
  { id: 1804664579, title: "only my railgun", artist: "fripSide", album: "only my railgun - EP", releaseDate: "2009-11-04" },
  { id: 1437764621, title: "レザマリでもつらくないっ! (feat. ビートまりお)", artist: "COOL&CREATE", album: "とうほう☆あまねりお+ぷらす", releaseDate: "2010-03-14" },
  { id: 726965333, title: "パンダヒーロー", artist: "ハチ", album: "OFFICIAL ORANGE", releaseDate: "2010-11-14" },
  { id: 726965341, title: "マトリョシカ", artist: "ハチ", album: "OFFICIAL ORANGE", releaseDate: "2010-11-14" },
  { id: 1011665843, title: "ハッピーシンセサイザ (feat. 巡音ルカ & GUMI)", artist: "EasyPop", album: "ハッピーシンセサイザ (feat. 巡音ルカ & GUMI) - Single", releaseDate: "2010-11-22" },
  { id: 573839785, title: "モザイクロール (feat. GUMI)", artist: "DECO*27", album: "愛迷エレジー+", releaseDate: "2010-12-15" },
  { id: 1011633092, title: "メランコリック (feat. メーコ)", artist: "Junky", album: "EXIT TUNES PRESENTS 10代うたってみたライブ!BEST ジャケットイラスト:おはぎ", releaseDate: "2011-05-18" },
  { id: 1480784907, title: "患部で止まってすぐ溶ける ~ 狂気の優曇華院", artist: "IOSYS", album: "Grimoire of IOSYS - 東方BEST ALBUM vol.1 - LIGHT", releaseDate: "2011-07-10" },
  { id: 489812662, title: "東京テディベア (feat. 鏡音リン)", artist: "Neru", album: "東京テディベア (feat. 鏡音リン)", releaseDate: "2011-10-19" },
  { id: 508675399, title: "千本桜 (feat. 実谷なな)", artist: "黒うさP feat.実谷なな", album: "実谷ななゴールデンベスト -ボカロ曲を歌ってみた-", releaseDate: "2012-03-21" },
  { id: 1592522220, title: "カゲロウデイズ", artist: "じん", album: "メカクシティデイズ", releaseDate: "2012-05-30" },
  { id: 570906515, title: "吉原ラメント (feat. 重音テト)", artist: "亜沙", album: "吉原ラメント (feat. 重音テト) - Single", releaseDate: "2012-10-26" },
  { id: 1463359430, title: "いーあるふぁんくらぶ", artist: "みきとP", album: "いーあるふぁんくらぶ - Single", releaseDate: "2012-12-12" },
  { id: 1333438584, title: "ロストワンの号哭", artist: "Neru", album: "EXIT TUNES PRESENTS Kagaminext feat. 鏡音リン、鏡音レン ―10th ANNIVERSARY BEST―", releaseDate: "2013-03-06" },
  { id: 1761348644, title: "ヒビカセ", artist: "Giga", album: "No title+", releaseDate: "2014-08-17" },
  { id: 975208079, title: "天ノ弱", artist: "164", album: "EXIT TUNES PRESENTS THE BEST OF GUMI from Megpoid", releaseDate: "2015-02-04" },
  { id: 1031795564, title: "脳漿炸裂ガール (feat. 蒼井翔太 & 増田 俊樹)", artist: "れるりり", album: "EXIT TUNES PRESENTS ACTORS3(通常盤)", releaseDate: "2015-03-18" },
  { id: 1147145175, title: "ゴーストルール", artist: "DECO*27", album: "GHOST", releaseDate: "2016-08-26" },
  { id: 1271271759, title: "シャルル", artist: "バルーン", album: "Corridor", releaseDate: "2016-10-12" },
  { id: 1648875851, title: "ロキ", artist: "みきとP", album: "DAISAN WAVE", releaseDate: "2018-02-27" },
  { id: 1867424121, title: "ナイト・オブ・ナイツ", artist: "ビートまりお", album: "オールナイト・オブ・ナイツ - EP", releaseDate: "2018-05-06" },
  { id: 1524422689, title: "Grievous Lady", artist: "Team Grimoire & Laur", album: "Arcaea Sound Collection: Memories of Conflict", releaseDate: "2019-10-27" },
  { id: 1492553532, title: "Fracture Ray (しおじょワールド編)", artist: "Sta & 削除", album: "Worlds", releaseDate: "2020-01-04" },
  { id: 1516965804, title: "Tempestissimo", artist: "t+pazolite", album: "Tempestissimo - Single", releaseDate: "2020-06-11" },
  { id: 1537920834, title: "おジャ魔女カーニバル!!", artist: "MAHO堂", album: "おジャ魔女どれみ Select Best", releaseDate: "2020-11-16" },
  { id: 1605307547, title: "六兆年と一夜物語 (feat. IA)", artist: "kemu", album: "IA SUPER BEST -THE CREATORS -", releaseDate: "2022-01-19" },
  { id: 1744260876, title: "Help me, ERINNNNNN!!", artist: "COOL&CREATE", album: "Help me, ERINNNNNN!! (～たすけてえーりん!!～) - Single", releaseDate: "2024-05-03" },
] satisfies SongQuizSong[];
