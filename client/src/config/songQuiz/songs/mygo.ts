import type { SongQuizSong } from '../types';

/**
 * BanG Dream! · mygo 的猜歌曲库（抓取自 iTunes JP 区，含 30 秒试听）。
 *
 * 生成方式：`node --experimental-strip-types tmp/fetch-song-catalog-v2.mjs` → `node tmp/song-catalog-to-ts-v2.mjs`，不要手改。
 * - 含小队曲与声优以角色身份演唱的个人曲。
 * - `id` 是 iTunes trackId；试听地址由服务端 `/api/song-quiz/previews` 按 id 实时换取。
 * - 同一首歌的多个版本（BEST 盘、个人盘、TV size 等）已合并，只保留最早发行的版本。
 * - 按发行日期升序排列。
 */
export default [
  { id: 1783644604, title: "迷星叫", artist: "MyGO!!!!!", album: "迷跡波", releaseDate: "2022-11-09" },
  { id: 1783645044, title: "名無声", artist: "MyGO!!!!!", album: "迷跡波", releaseDate: "2022-11-09" },
  { id: 1783599951, title: "影色舞", artist: "MyGO!!!!!", album: "影色舞 - Single", releaseDate: "2022-11-23" },
  { id: 1783601123, title: "潜在表明", artist: "MyGO!!!!!", album: "潜在表明 - Single", releaseDate: "2022-12-25" },
  { id: 1783644616, title: "音一会", artist: "MyGO!!!!!", album: "迷跡波", releaseDate: "2023-04-12" },
  { id: 1783540641, title: "無路矢", artist: "MyGO!!!!!", album: "無路矢 - Single", releaseDate: "2023-04-29" },
  { id: 1777382324, title: "壱雫空", artist: "MyGO!!!!!", album: "壱雫空 - Single", releaseDate: "2023-06-30" },
  { id: 1783498842, title: "栞", artist: "MyGO!!!!!", album: "栞 - Single", releaseDate: "2023-06-30" },
  { id: 1783644610, title: "碧天伴走", artist: "MyGO!!!!!", album: "迷跡波", releaseDate: "2023-07-28" },
  { id: 1783541012, title: "焚音打", artist: "MyGO!!!!!", album: "壱雫空 - Single", releaseDate: "2023-08-09" },
  { id: 1783498251, title: "詩超絆", artist: "MyGO!!!!!", album: "詩超絆 - Single", releaseDate: "2023-08-18" },
  { id: 1783645039, title: "迷路日々", artist: "MyGO!!!!!", album: "迷跡波", releaseDate: "2023-09-01" },
  { id: 1783644613, title: "歌いましょう鳴らしましょう", artist: "MyGO!!!!!", album: "迷跡波", releaseDate: "2023-11-01" },
  { id: 1783644617, title: "春日影 (MyGO!!!!! ver.)", artist: "MyGO!!!!!", album: "迷跡波", releaseDate: "2023-11-01" },
  { id: 1783601163, title: "処救生", artist: "MyGO!!!!!", album: "処救生 - Single", releaseDate: "2023-11-19" },
  { id: 1783499274, title: "輪符雨", artist: "MyGO!!!!!", album: "輪符雨 - Single", releaseDate: "2024-02-28" },
  { id: 1783598405, title: "ノンブレス・オブリージュ (Cover)", artist: "MyGO!!!!!", album: "ノンブレス・オブリージュ (Cover) - Single", releaseDate: "2024-03-20" },
  { id: 1784376318, title: "砂寸奏", artist: "MyGO!!!!!", album: "砂寸奏/回層浮 - Single", releaseDate: "2024-03-20" },
  { id: 1784376470, title: "回層浮", artist: "MyGO!!!!!", album: "砂寸奏/回層浮 - Single", releaseDate: "2024-03-20" },
  { id: 1783600963, title: "君の神様になりたい。 (Cover)", artist: "MyGO!!!!!", album: "バンドリ! カバーコレクション Extra Volume - EP", releaseDate: "2024-07-10" },
  { id: 1783601215, title: "swim (Cover)", artist: "MyGO!!!!!", album: "バンドリ! カバーコレクション Extra Volume - EP", releaseDate: "2024-07-10" },
  { id: 1783601276, title: "猛独が襲う (Cover)", artist: "MyGO!!!!!", album: "バンドリ! カバーコレクション Extra Volume - EP", releaseDate: "2024-07-10" },
  { id: 1783498579, title: "端程山", artist: "MyGO!!!!!", album: "端程山 - Single", releaseDate: "2024-07-24" },
  { id: 1783498582, title: "孤壊牢", artist: "MyGO!!!!!", album: "端程山 - Single", releaseDate: "2024-07-24" },
  { id: 1766907429, title: "過惰幻", artist: "MyGO!!!!!", album: "過惰幻 - Single", releaseDate: "2024-09-28" },
  { id: 1775857498, title: "霧周途", artist: "MyGO!!!!!", album: "霧周途 - Single", releaseDate: "2024-11-02" },
  { id: 1775842204, title: "歩拾道", artist: "MyGO!!!!!", album: "歩拾道 - Single", releaseDate: "2024-11-09" },
  { id: 1779893139, title: "明弦音", artist: "MyGO!!!!!", album: "跡暖空", releaseDate: "2024-12-18" },
  { id: 1779893146, title: "夜隠染", artist: "MyGO!!!!!", album: "跡暖空", releaseDate: "2024-12-18" },
  { id: 1801099792, title: "だれかの心臓になれたなら (Cover)", artist: "MyGO!!!!!", album: "だれかの心臓になれたなら (Cover) - Single", releaseDate: "2025-03-24" },
  { id: 6784529633, title: "聿日箋秋", artist: "MyGO!!!!!", album: "致並跡", releaseDate: "2025-03-27" },
  { id: 1807236518, title: "掌心正銘", artist: "MyGO!!!!!", album: "聿日箋秋 - Single", releaseDate: "2025-04-23" },
  { id: 1807947704, title: "潜在表明 - From THE FIRST TAKE", artist: "MyGO!!!!!", album: "潜在表明 - From THE FIRST TAKE - Single", releaseDate: "2025-04-28" },
  { id: 1824359335, title: "往欄印", artist: "MyGO!!!!!", album: "往欄印 - Single", releaseDate: "2025-08-06" },
  { id: 1824359336, title: "残痕字", artist: "MyGO!!!!!", album: "往欄印 - Single", releaseDate: "2025-08-06" },
  { id: 1836389618, title: "エガクミライ", artist: "MyGO!!!!!", album: "エガクミライ - Single", releaseDate: "2025-09-19" },
  { id: 1842769520, title: "雑踏、僕らの街 (Cover)", artist: "MyGO!!!!!", album: "バンドリ! ガールズバンドパーティ! カバーコレクションVol.10", releaseDate: "2025-10-15" },
  { id: 1842769534, title: "遥か彼方 (Cover)", artist: "MyGO!!!!!", album: "バンドリ! ガールズバンドパーティ! カバーコレクションVol.10", releaseDate: "2025-10-15" },
  { id: 1851418027, title: "静降想", artist: "MyGO!!!!!", album: "静降想 - Single", releaseDate: "2025-12-03" },
  { id: 1878078140, title: "証命讃歌", artist: "MyGO!!!!!", album: "証命讃歌 - Single", releaseDate: "2026-03-02" },
  { id: 1882668795, title: "過去を喰らう (Cover)", artist: "MyGO!!!!!", album: "過去を喰らう (Cover) - Single", releaseDate: "2026-03-22" },
  { id: 6784529615, title: "羅永線", artist: "MyGO!!!!!", album: "致並跡", releaseDate: "2026-07-15" },
  { id: 6784529629, title: "素寄曲", artist: "MyGO!!!!!", album: "致並跡", releaseDate: "2026-07-15" },
  { id: 6784529631, title: "騒混出", artist: "MyGO!!!!!", album: "致並跡", releaseDate: "2026-07-15" },
] satisfies SongQuizSong[];
