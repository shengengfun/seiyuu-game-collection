import type { SongQuizSong } from '../types';

/**
 * D4DJ · rondo 的猜歌曲库（抓取自 iTunes JP 区，含 30 秒试听）。
 *
 * 生成方式：`node --experimental-strip-types tmp/fetch-song-catalog-v2.mjs` → `node tmp/song-catalog-to-ts-v2.mjs`，不要手改。
 * - 含小队曲与声优以角色身份演唱的个人曲。
 * - `id` 是 iTunes trackId；试听地址由服务端 `/api/song-quiz/previews` 按 id 实时换取。
 * - 同一首歌的多个版本（BEST 盘、个人盘、TV size 等）已合并，只保留最早发行的版本。
 * - 按发行日期升序排列。
 */
export default [
  { id: 1804524064, title: "瞬動-movement-", artist: "燐舞曲", album: "Dig Delight!/Direct Drive! Special Edition", releaseDate: "2020-03-28" },
  { id: 1804524074, title: "カレンデュラ", artist: "燐舞曲", album: "Dig Delight!/Direct Drive! Special Edition", releaseDate: "2020-03-28" },
  { id: 1802573530, title: "Horizontal Oath", artist: "燐舞曲", album: "Cosmic CoaSTAR - EP", releaseDate: "2020-06-24" },
  { id: 1802767376, title: "prayer(s)", artist: "燐舞曲", album: "prayer(s) - Single", releaseDate: "2020-11-18" },
  { id: 1802767377, title: "ニルヴァナ", artist: "燐舞曲", album: "prayer(s) - Single", releaseDate: "2020-11-18" },
  { id: 1802829879, title: "名前のない怪物 (Cover)", artist: "燐舞曲", album: "D4DJ Groovy Mix カバートラックス vol.1", releaseDate: "2021-01-20" },
  { id: 1802829880, title: "DESIRE -情熱- (Cover)", artist: "燐舞曲", album: "D4DJ Groovy Mix カバートラックス vol.1", releaseDate: "2021-01-20" },
  { id: 1801692942, title: "BLACK LOTUS", artist: "燐舞曲", album: "BLACK LOTUS - Single", releaseDate: "2021-07-11" },
  { id: 1803102830, title: "東京テディベア (Cover)", artist: "燐舞曲", album: "D4DJ Groovy Mix カバートラックス vol.2", releaseDate: "2021-07-21" },
  { id: 1803552114, title: "クライノイド", artist: "燐舞曲", album: "クライノイド - Single", releaseDate: "2021-07-21" },
  { id: 1803552116, title: "群青のフローセカ", artist: "燐舞曲", album: "クライノイド - Single", releaseDate: "2021-07-21" },
  { id: 1802105596, title: "(Re) termination", artist: "燐舞曲", album: "(Re) termination - Single", releaseDate: "2021-11-10" },
  { id: 1802105598, title: "Celsius", artist: "燐舞曲", album: "(Re) termination - Single", releaseDate: "2021-11-10" },
  { id: 1803267348, title: "輪舞-revolution (Cover)", artist: "燐舞曲", album: "D4DJ Groovy Mix カバートラックス vol.3", releaseDate: "2022-04-27" },
  { id: 1803267593, title: "おなじ星 (Cover)", artist: "燐舞曲", album: "D4DJ Groovy Mix カバートラックス vol.3", releaseDate: "2022-04-27" },
  { id: 1804566458, title: "神蕾-シン・ライ-", artist: "燐舞曲", album: "神蕾-シン・ライ-", releaseDate: "2022-05-02" },
  { id: 1804566686, title: "夜想曲", artist: "燐舞曲", album: "神蕾-シン・ライ-", releaseDate: "2022-05-25" },
  { id: 1804566701, title: "ReTINA", artist: "燐舞曲", album: "神蕾-シン・ライ-", releaseDate: "2022-05-25" },
  { id: 1803267541, title: "Leia (Cover)", artist: "燐舞曲", album: "D4DJ Groovy Mix カバートラックス vol.4", releaseDate: "2022-07-20" },
  { id: 1803267543, title: "Journey through the Decade (Cover)", artist: "燐舞曲", album: "D4DJ Groovy Mix カバートラックス vol.4", releaseDate: "2022-07-20" },
  { id: 1803343776, title: "unravel (Cover)", artist: "燐舞曲", album: "D4DJ Groovy Mix カバートラックス vol.5", releaseDate: "2022-07-20" },
  { id: 1803343956, title: "I believe what you said (Cover)", artist: "燐舞曲", album: "D4DJ Groovy Mix カバートラックス vol.5", releaseDate: "2022-07-20" },
  { id: 1803366408, title: "深い森 (Cover)", artist: "燐舞曲", album: "D4DJ Groovy Mix カバートラックス vol.6", releaseDate: "2022-10-26" },
  { id: 1803366537, title: "killy killy JOKER (Cover)", artist: "燐舞曲", album: "D4DJ Groovy Mix カバートラックス vol.6", releaseDate: "2022-10-26" },
  { id: 1803551735, title: "DAYBREAK'S BELL (Cover)", artist: "燐舞曲", album: "D4DJ Groovy Mix カバートラックス vol.7", releaseDate: "2023-01-25" },
  { id: 1803551737, title: "カミサマネジマキ (Cover)", artist: "燐舞曲", album: "D4DJ Groovy Mix カバートラックス vol.7", releaseDate: "2023-01-25" },
  { id: 1804523904, title: "ARCANA", artist: "燐舞曲", album: "Maihime - EP", releaseDate: "2023-02-15" },
  { id: 1802556336, title: "-World Etude-", artist: "燐舞曲", album: "- 茈 - - EP", releaseDate: "2023-05-03" },
  { id: 1802556337, title: "昊天 -koten-", artist: "燐舞曲", album: "- 茈 - - EP", releaseDate: "2023-05-03" },
  { id: 1803552181, title: "KiLLiNG ME (Cover)", artist: "燐舞曲", album: "D4DJ Groovy Mix カバートラックス vol.8", releaseDate: "2023-07-12" },
  { id: 1803552182, title: "奏(かなで) [Cover]", artist: "燐舞曲", album: "D4DJ Groovy Mix カバートラックス vol.8", releaseDate: "2023-07-12" },
  { id: 1804255584, title: "雨音", artist: "燐舞曲", album: "雨音 - Single", releaseDate: "2023-08-19" },
  { id: 1804068316, title: "夢想曲 -Träumerei-", artist: "燐舞曲", album: "夢想曲 -Träumerei- - Single", releaseDate: "2023-09-20" },
  { id: 1804068318, title: "「花の手錠と魔物の箱庭」", artist: "燐舞曲", album: "夢想曲 -Träumerei- - Single", releaseDate: "2023-09-20" },
  { id: 1797501404, title: "「 Blooming rose in the other world 」", artist: "燐舞曲", album: "雨音 - Single", releaseDate: "2024-02-14" },
  { id: 1798940704, title: "デート・ア・ライブ (Cover)", artist: "燐舞曲", album: "D4DJ Groovy Mix カバートラックス vol.9", releaseDate: "2024-04-24" },
  { id: 1798940709, title: "火炎 (Cover)", artist: "燐舞曲", album: "D4DJ Groovy Mix カバートラックス vol.9", releaseDate: "2024-04-24" },
  { id: 1773694833, title: "燐華", artist: "燐舞曲 & Gram", album: "燐華 - Single", releaseDate: "2024-10-27" },
  { id: 1783726914, title: "ラストソング", artist: "燐舞曲", album: "‑未来‑", releaseDate: "2025-01-15" },
  { id: 1783727291, title: "暗黒の翼 (Cover)", artist: "燐舞曲 & 青柳 椿(CV:加藤里保菜)", album: "‑未来‑", releaseDate: "2025-01-15" },
  { id: 1783727293, title: "ツキミソウ (Cover)", artist: "燐舞曲 & 月見山 渚(CV:大塚紗英)", album: "‑未来‑", releaseDate: "2025-01-15" },
  { id: 1783727294, title: "魔・カ・セ・テ Tonight (Cover)", artist: "燐舞曲 & 矢野緋彩(CV:もものはるな)", album: "‑未来‑", releaseDate: "2025-01-15" },
  { id: 1783727513, title: "カタオモイ (Cover)", artist: "燐舞曲 & 三宅葵依(CV:つんこ)", album: "‑未来‑", releaseDate: "2025-01-15" },
] satisfies SongQuizSong[];
