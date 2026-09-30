import type { SongQuizSong } from '../types';

/**
 * tokusatsu · ultraheisei 的猜歌曲库（抓取自 iTunes JP 区，含 30 秒试听）。
 *
 * 生成方式：`node tmp/fetch-song-catalog-special.mjs` → `node tmp/song-catalog-special-to-ts.mjs`，不要手改。

 * - `id` 是 iTunes trackId；试听地址由服务端 `/api/song-quiz/previews` 按 id 实时换取。
 * - 按发行日期升序排列。
 */
export default [
  { id: 1847210621, title: "TAKE ME HIGHER", artist: "V6", album: "TAKE ME HIGHER - Single", releaseDate: "1996-09-16" },
  { id: 1536882063, title: "Brave Love, TIGA", artist: "地球防衛団 三日月分隊", album: "決定版!爆風スランプ大全集2 〜The Very Best of パッパラー河合", releaseDate: "1997-06-21" },
  { id: 74567253, title: "英雄", artist: "doa", album: "open_d", releaseDate: "2004-11-24" },
  { id: 1595450868, title: "ウルトラマンメビウス", artist: "Project DMM & ウルトラ防衛隊", album: "ウルトラマンメビウス SONG COLLECTION (オリジナル・サウンドトラック)", releaseDate: "2006-07-26" },
  { id: 1595450876, title: "ウルトラの奇跡", artist: "Project DMM", album: "ウルトラマンメビウス SONG COLLECTION (オリジナル・サウンドトラック)", releaseDate: "2006-08-30" },
  { id: 410809191, title: "すすめ! ウルトラマンゼロ", artist: "ボイジャー", album: "すすめ! ウルトラマンゼロ", releaseDate: "2010-12-22" },
  { id: 1576679115, title: "Spirit", artist: "Project DMM", album: "ウルトラマンコスモス COMPLETE SONG COLLECTION", releaseDate: "2011-07-20" },
  { id: 1576679116, title: "ウルトラマンコスモス 〜君にできるなにか", artist: "Project DMM", album: "ウルトラマンコスモス COMPLETE SONG COLLECTION", releaseDate: "2011-07-20" },
  { id: 534110805, title: "ウルトラマンダイナ (feat. 前田達也)", artist: "ボイジャー", album: "Rising High - EP", releaseDate: "2012-04-25" },
  { id: 608186999, title: "ウルトラマンガイア!", artist: "田中昌之", album: "YouはShock〜アニメ・特撮HIT COVERS", releaseDate: "2013-03-06" },
  { id: 910802765, title: "ウルトラマンギンガの歌", artist: "ボイジャー", album: "ULTRA GALAXY", releaseDate: "2014-08-20" },
  { id: 1018121783, title: "ウルトラマンX", artist: "ボイジャー", album: "ウルトラマンX", releaseDate: "2015-07-24" },
  { id: 1131554715, title: "オーブの祈り(フルサイズ)", artist: "水木一郎", album: "ウルトラマンオーブ-Original Sound Track-", releaseDate: "2016-07-09" },
  { id: 1572229726, title: "地球は君を待っていた", artist: "京本政樹 & 森の木児童合唱団", album: "ウルトラマン レジェンド・ソング・コレクション", releaseDate: "2017-06-21" },
  { id: 1405555874, title: "Hands", artist: "オーイシマサヨシ", album: "ウルトラマンR/B オープニング主題歌 Hands - Single", releaseDate: "2018-07-18" },
  { id: 1838422406, title: "Buddy, steady, go!", artist: "寺島拓篤", album: "LAYERING", releaseDate: "2019-08-28" },
  { id: 1572229723, title: "時の中を走りぬけて", artist: "石原慎一 & こおろぎ'73", album: "ウルトラマン レジェンド・ソング・コレクション", releaseDate: "2021-06-23" },
  { id: 1572229724, title: "スカイ・ハイ・ヒーロー", artist: "石原慎一 & こおろぎ'73", album: "ウルトラマン レジェンド・ソング・コレクション", releaseDate: "2021-06-23" },
  { id: 1572229725, title: "ぼくらのグレート", artist: "京本政樹 & 森の木児童合唱団", album: "ウルトラマン レジェンド・ソング・コレクション", releaseDate: "2021-06-23" },
  { id: 1572229727, title: "未来へ向かって", artist: "京本政樹", album: "ウルトラマン レジェンド・ソング・コレクション", releaseDate: "2021-06-23" },
  { id: 1572229728, title: "THE EARTH IT'S HURTIN' (日本語バージョン)", artist: "京本政樹", album: "ウルトラマン レジェンド・ソング・コレクション", releaseDate: "2021-06-23" },
  { id: 1572229729, title: "ULTRAMAN", artist: "Jay Hackett", album: "ウルトラマン レジェンド・ソング・コレクション", releaseDate: "2021-06-23" },
] satisfies SongQuizSong[];
