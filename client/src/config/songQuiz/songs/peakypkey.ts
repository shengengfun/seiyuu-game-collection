import type { SongQuizSong } from '../types';

/**
 * D4DJ · peakypkey 的猜歌曲库（抓取自 iTunes JP 区，含 30 秒试听）。
 *
 * 生成方式：`node --experimental-strip-types tmp/fetch-song-catalog-v2.mjs` → `node tmp/song-catalog-to-ts-v2.mjs`，不要手改。
 * - 含小队曲与声优以角色身份演唱的个人曲。
 * - `id` 是 iTunes trackId；试听地址由服务端 `/api/song-quiz/previews` 按 id 实时换取。
 * - 同一首歌的多个版本（BEST 盘、个人盘、TV size 等）已合并，只保留最早发行的版本。
 * - 按发行日期升序排列。
 */
export default [
  { id: 1804524060, title: "電乱★カウントダウン", artist: "Peaky P-key", album: "Dig Delight!/Direct Drive! Special Edition", releaseDate: "2020-03-28" },
  { id: 1804524068, title: "Let’s do the ‘Big-Bang!’", artist: "Peaky P-key", album: "Dig Delight!/Direct Drive! Special Edition", releaseDate: "2020-03-28" },
  { id: 1802573403, title: "Gonna be right", artist: "Peaky P-key", album: "Cosmic CoaSTAR - EP", releaseDate: "2020-06-24" },
  { id: 1804281162, title: "最頂点Peaky&Peaky!!", artist: "Peaky P-key", album: "最頂点Peaky&Peaky!! - Single", releaseDate: "2021-01-06" },
  { id: 1804281164, title: "Wish You Luck", artist: "Peaky P-key", album: "最頂点Peaky&Peaky!! - Single", releaseDate: "2021-01-06" },
  { id: 1802829869, title: "マジLOVE1000% (Cover)", artist: "Peaky P-key", album: "D4DJ Groovy Mix カバートラックス vol.1", releaseDate: "2021-01-20" },
  { id: 1802829870, title: "JUST COMMUNICATION (Cover)", artist: "Peaky P-key", album: "D4DJ Groovy Mix カバートラックス vol.1", releaseDate: "2021-01-20" },
  { id: 1804281186, title: "無敵☆moment", artist: "Peaky P-key", album: "無敵☆moment - Single", releaseDate: "2021-04-14" },
  { id: 1804281187, title: "Ultimate Vista", artist: "Peaky P-key", album: "無敵☆moment - Single", releaseDate: "2021-04-14" },
  { id: 1803102513, title: "逆光のフリューゲル (Cover)", artist: "Peaky P-key", album: "D4DJ Groovy Mix カバートラックス vol.2", releaseDate: "2021-07-21" },
  { id: 1803102514, title: "CYBER CYBER (Cover)", artist: "Peaky P-key", album: "D4DJ Groovy Mix カバートラックス vol.2", releaseDate: "2021-07-21" },
  { id: 1802829987, title: "Let us sing “Peaky!!”", artist: "Peaky P-key", album: "Let us sing “Peaky!!” - Single", releaseDate: "2021-09-29" },
  { id: 1802829989, title: "Stormy link", artist: "Peaky P-key", album: "Let us sing “Peaky!!” - Single", releaseDate: "2021-09-29" },
  { id: 1803267066, title: "紅 (Cover)", artist: "Peaky P-key", album: "D4DJ Groovy Mix カバートラックス vol.3", releaseDate: "2022-04-27" },
  { id: 1803267202, title: "夢見る少女じゃいられない (Cover)", artist: "Peaky P-key", album: "D4DJ Groovy Mix カバートラックス vol.3", releaseDate: "2022-04-27" },
  { id: 1803267433, title: "アゲハ蝶 (Cover)", artist: "Peaky P-key", album: "D4DJ Groovy Mix カバートラックス vol.4", releaseDate: "2022-07-20" },
  { id: 1803267434, title: "仮面ライダーBLACK (Cover)", artist: "Peaky P-key", album: "D4DJ Groovy Mix カバートラックス vol.4", releaseDate: "2022-07-20" },
  { id: 1803343537, title: "アンチクロックワイズ (Cover)", artist: "Peaky P-key", album: "D4DJ Groovy Mix カバートラックス vol.5", releaseDate: "2022-07-20" },
  { id: 1803343547, title: "Over Soul (Cover)", artist: "Peaky P-key", album: "D4DJ Groovy Mix カバートラックス vol.5", releaseDate: "2022-07-20" },
  { id: 1804567765, title: "Deja Boon", artist: "Peaky P-key", album: "Master Peace", releaseDate: "2022-08-27" },
  { id: 1804567294, title: "強想シュプリーム", artist: "Peaky P-key", album: "Master Peace", releaseDate: "2022-09-07" },
  { id: 1804567539, title: "響奏メリーゴーランド", artist: "Peaky P-key", album: "Master Peace", releaseDate: "2022-09-07" },
  { id: 1804567686, title: "Keep it up", artist: "Peaky P-key", album: "Master Peace", releaseDate: "2022-09-07" },
  { id: 1803366395, title: "Pretender (Cover)", artist: "Peaky P-key", album: "D4DJ Groovy Mix カバートラックス vol.6", releaseDate: "2022-10-26" },
  { id: 1803366397, title: "ご唱和ください 我の名を! (Cover)", artist: "Peaky P-key", album: "D4DJ Groovy Mix カバートラックス vol.6", releaseDate: "2022-10-26" },
  { id: 1804543176, title: "One's Believing", artist: "Peaky P-key", album: "DO-OR-DIE - EP", releaseDate: "2022-12-21" },
  { id: 1804543431, title: "Let’s do it!", artist: "Peaky P-key", album: "DO-OR-DIE - EP", releaseDate: "2022-12-21" },
  { id: 1804543436, title: "ABSOLUTE (EG Remix)", artist: "Peaky P-key", album: "DO-OR-DIE - EP", releaseDate: "2022-12-21" },
  { id: 1804543452, title: "Let's do the 'Big-Bang!' (Motsu Cyber Choir Remix)", artist: "Peaky P-key", album: "DO-OR-DIE - EP", releaseDate: "2022-12-21" },
  { id: 1803551722, title: "UNION (Cover)", artist: "Peaky P-key", album: "D4DJ Groovy Mix カバートラックス vol.7", releaseDate: "2023-01-25" },
  { id: 1803551726, title: "少年ハート (Cover)", artist: "Peaky P-key", album: "D4DJ Groovy Mix カバートラックス vol.7", releaseDate: "2023-01-25" },
  { id: 1804523902, title: "OVERWHELM!", artist: "Peaky P-key", album: "Maihime - EP", releaseDate: "2023-02-15" },
  { id: 1804284081, title: "響乱☆カウントダウン", artist: "Peaky P-key", album: "響乱☆カウントダウン - Single", releaseDate: "2023-04-19" },
  { id: 1804284087, title: "Ideal Factor", artist: "Peaky P-key", album: "響乱☆カウントダウン - Single", releaseDate: "2023-04-19" },
  { id: 1803552173, title: "BLACK SHOUT (Cover)", artist: "Peaky P-key", album: "D4DJ Groovy Mix カバートラックス vol.8", releaseDate: "2023-07-12" },
  { id: 1803552174, title: "Storyteller (Cover)", artist: "Peaky P-key", album: "D4DJ Groovy Mix カバートラックス vol.8", releaseDate: "2023-07-12" },
  { id: 1804255689, title: "真夏のInstant", artist: "Peaky P-key", album: "真夏のInstant - Single", releaseDate: "2023-08-19" },
  { id: 1804507711, title: "Never lose", artist: "Peaky P-key", album: "真夏のInstant - Single", releaseDate: "2023-11-29" },
  { id: 1796146263, title: "PEAKY FORCE", artist: "Peaky P-key", album: "PEAKY FORCE - Single", releaseDate: "2024-02-10" },
  { id: 1796087108, title: "NUMBER 1 and ONLY!!!!", artist: "Peaky P-key & Abyssmare", album: "NUMBER 1 and ONLY!!!! - Single", releaseDate: "2024-04-14" },
  { id: 1798940554, title: "Give a reason (Cover)", artist: "Peaky P-key", album: "D4DJ Groovy Mix カバートラックス vol.9", releaseDate: "2024-04-24" },
  { id: 1798940568, title: "NO MORE CRY (Cover)", artist: "Peaky P-key", album: "D4DJ Groovy Mix カバートラックス vol.9", releaseDate: "2024-04-24" },
  { id: 1798690400, title: "hanamuke", artist: "Peaky P-key", album: "Triumphal", releaseDate: "2024-08-14" },
  { id: 1798690413, title: "四季ノ唄 (Cover)", artist: "Peaky P-key & 犬寄しのぶ(CV:高木美佑)", album: "Triumphal", releaseDate: "2024-08-14" },
  { id: 1798690418, title: "青と夏 (Cover)", artist: "Peaky P-key & 笹子・ジェニファー・由香(CV:小泉萌香)", album: "Triumphal", releaseDate: "2024-08-14" },
  { id: 1798690425, title: "ふわふわ時間 (Cover)", artist: "Peaky P-key & 清水絵空(CV:倉知玲鳳)", album: "Triumphal", releaseDate: "2024-08-14" },
  { id: 1773694593, title: "RAVE INTO THE PEAKY VIBES", artist: "Peaky P-key & DJ Noriken", album: "RAVE INTO THE PEAKY VIBES - Single", releaseDate: "2024-10-27" },
  { id: 1798129226, title: "Let's do the 'Big-Bang!' (feat. 愛本りんく(CV:西尾夕香))", artist: "Peaky P-key", album: "Let's do the 'Big-Bang!' (feat. 愛本りんく(CV:西尾夕香)) - Single", releaseDate: "2025-03-05" },
  { id: 1798174519, title: "恋心 (Cover)", artist: "Peaky P-key", album: "恋心 (Cover) - Single", releaseDate: "2025-03-05" },
  { id: 1838992669, title: "咲ケ、舞踊無双", artist: "Peaky P-key", album: "咲ケ、舞踊無双 - Single", releaseDate: "2025-09-29" },
  { id: 1839168604, title: "We are COMPLETE!", artist: "Peaky P-key", album: "We are COMPLETE! - Single", releaseDate: "2025-09-29" },
  { id: 1839369578, title: "WHITE moment", artist: "Peaky P-key", album: "WHITE moment - Single", releaseDate: "2025-09-29" },
  { id: 1846812531, title: "I’m a HERO", artist: "Peaky P-key", album: "I’m a HERO - Single", releaseDate: "2025-10-26" },
  { id: 1884931948, title: "Longing & Shine", artist: "Peaky P-key", album: "Longing & Shine - Single", releaseDate: "2026-03-24" },
  { id: 6768886431, title: "PEAKY★The Beginning", artist: "Peaky P-key", album: "PEAKY★The Beginning - Single", releaseDate: "2026-05-18" },
] satisfies SongQuizSong[];
