import type { SongQuizSong } from '../types';

/**
 * 热门IP · conan 的猜歌曲库（抓取自 iTunes JP 区，含 30 秒试听）。
 *
 * 生成方式：`node tmp/fetch-song-catalog-special.mjs` → `node tmp/song-catalog-special-to-ts.mjs`，不要手改。
- 曲目来自人工挑的各 IP 代表曲（主题歌 / OP / ED），在 iTunes 定点检索后取最早的正式版本。
- 同一首歌的多个版本（BEST 盘、TV size 等）已合并，只保留最早发行的版本。
 * - `id` 是 iTunes trackId；试听地址由服务端 `/api/song-quiz/previews` 按 id 实时换取。
 * - 按发行日期升序排列。
 */
export default [
  { id: 77297295, title: "光と影のロマン", artist: "宇徳敬子", album: "名探偵コナン テーマ曲集 - The Best of Detective Conan", releaseDate: "1997-05-14" },
  { id: 1618913658, title: "謎", artist: "小松未歩", album: "謎 - Single", releaseDate: "1997-05-28" },
  { id: 1618915808, title: "願い事ひとつだけ", artist: "小松未歩", album: "願い事ひとつだけ - Single", releaseDate: "1998-01-14" },
  { id: 1581731326, title: "運命のルーレット廻して", artist: "ZARD", album: "永遠", releaseDate: "1999-02-17" },
  { id: 283000180, title: "ギリギリchop", artist: "B'z", album: "B'z The Best “ULTRA Pleasure”", releaseDate: "1999-06-09" },
  { id: 1566364838, title: "Truth (シークレット・トラック)", artist: "TWO-MIX", album: "RHYTHM FORMULA (International Version)", releaseDate: "1999-11-25" },
  { id: 73795313, title: "Secret of my heart", artist: "倉木麻衣", album: "delicious way", releaseDate: "2000-04-26" },
  { id: 1619238319, title: "あなたがいるから", artist: "小松未歩", album: "あなたがいるから - Single", releaseDate: "2000-06-21" },
  { id: 1569163227, title: "夏の幻", artist: "GARNET CROW", album: "夏の幻 - Single", releaseDate: "2000-10-25" },
  { id: 77297144, title: "恋はスリル、ショック、サスペンス", artist: "愛内里菜", album: "名探偵コナン テーマ曲集 - The Best of Detective Conan", releaseDate: "2000-11-29" },
  { id: 204945731, title: "氷の上に立つように", artist: "小松未歩", album: "小松未歩ベスト ~once more~", releaseDate: "2000-11-29" },
  { id: 1570211710, title: "Mysterious Eyes", artist: "GARNET CROW", album: "first soundscope 〜水のない晴れた海へ〜", releaseDate: "2001-01-31" },
  { id: 1569329018, title: "夢みたあとで", artist: "GARNET CROW", album: "夢みたあとで - Single", releaseDate: "2002-03-13" },
  { id: 191045964, title: "君と約束した優しいあの場所まで", artist: "三枝夕夏 IN db", album: "三枝夕夏 IN db 1st~君と約束した優しいあの場所まで~", releaseDate: "2003-10-29" },
  { id: 191049231, title: "眠る君の横顔に微笑みを", artist: "三枝夕夏 IN db", album: "U-ka saegusa IN db II", releaseDate: "2004-03-03" },
  { id: 1298566991, title: "Growing of my heart", artist: "倉木麻衣", album: "倉木麻衣×名探偵コナン COLLABORATION BEST 21 -真実はいつも歌にある!-", releaseDate: "2005-11-09" },
  { id: 283000209, title: "衝動", artist: "B'z", album: "B'z The Best “ULTRA Pleasure”", releaseDate: "2006-01-25" },
  { id: 1582117268, title: "悲しいほど貴方が好き", artist: "ZARD", album: "Brezza di mare  dedicated to IZUMI SAKAI", releaseDate: "2006-03-08" },
  { id: 348598166, title: "雲に乗って", artist: "三枝夕夏 IN db", album: "U-ka saegusa IN db Final Best", releaseDate: "2007-01-31" },
  { id: 719990540, title: "涙のイエスタデー", artist: "GARNET CROW", album: "REQUEST BEST", releaseDate: "2007-07-04" },
  { id: 1298566993, title: "一秒ごとに Love for you", artist: "倉木麻衣", album: "倉木麻衣×名探偵コナン COLLABORATION BEST 21 -真実はいつも歌にある!-", releaseDate: "2009-01-21" },
  { id: 458024401, title: "Misty Mystery", artist: "GARNET CROW", album: "Misty Mystery - Single", releaseDate: "2011-08-31" },
  { id: 1298567001, title: "恋に恋して", artist: "倉木麻衣", album: "倉木麻衣×名探偵コナン COLLABORATION BEST 21 -真実はいつも歌にある!-", releaseDate: "2012-08-15" },
  { id: 1298566998, title: "DYNAMITE", artist: "倉木麻衣", album: "倉木麻衣×名探偵コナン COLLABORATION BEST 21 -真実はいつも歌にある!-", releaseDate: "2014-11-12" },
  { id: 1251263403, title: "世界はあなたの色になる", artist: "B'z", album: "声明 / Still Alive - EP", releaseDate: "2016-10-04" },
  { id: 1298566995, title: "渡月橋 ~君 想ふ~", artist: "倉木麻衣", album: "倉木麻衣×名探偵コナン COLLABORATION BEST 21 -真実はいつも歌にある!-", releaseDate: "2017-04-12" },
  { id: 1553012721, title: "薔薇色の人生", artist: "倉木麻衣", album: "きみと恋のままで終われない いつも夢のままじゃいられない/薔薇色の人生【名探偵コナン盤】 - Single", releaseDate: "2019-03-20" },
] satisfies SongQuizSong[];
