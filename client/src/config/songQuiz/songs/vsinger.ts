import type { SongQuizSong } from '../types';

/**
 * pjsk · vsinger 的猜歌曲库（抓取自 iTunes JP 区，含 30 秒试听）。
 *
 * 生成方式：`node tmp/fetch-song-catalog-special.mjs` → `node tmp/song-catalog-special-to-ts.mjs`，不要手改。

 * - `id` 是 iTunes trackId；试听地址由服务端 `/api/song-quiz/previews` 按 id 实时换取。
 * - 按发行日期升序排列。
 */
export default [
  { id: 1856463784, title: "Journey", artist: "星乃一歌, 花里みのり, 小豆沢こはね, 天馬司, 宵崎奏 & 初音ミク", album: "プロジェクトセカイ カラフルステージ! feat. 初音ミク テーマソング・アニバーサリーソングアルバム", releaseDate: "2022-11-01" },
  { id: 1701386378, title: "幽光、1/fのゆらめき", artist: "卯花ロク & 初音ミク", album: "Project SEKAI UNIT IMAGE ALBUM セカイノオト vol.1", releaseDate: "2023-08-25" },
  { id: 1701386379, title: "Un-Lock", artist: "無力P & 巡音ルカ", album: "Project SEKAI UNIT IMAGE ALBUM セカイノオト vol.1", releaseDate: "2023-08-25" },
  { id: 1701386380, title: "ときめきジェットコースター", artist: "picco & 初音ミク", album: "Project SEKAI UNIT IMAGE ALBUM セカイノオト vol.1", releaseDate: "2023-08-25" },
  { id: 1701386381, title: "ボトルケーキ", artist: "ライブP & 鏡音リン", album: "Project SEKAI UNIT IMAGE ALBUM セカイノオト vol.1", releaseDate: "2023-08-25" },
  { id: 1701386382, title: "夏夜ノ唄", artist: "平田義久 & 鏡音レン", album: "Project SEKAI UNIT IMAGE ALBUM セカイノオト vol.1", releaseDate: "2023-08-25" },
  { id: 1701386383, title: "ARQETYPE", artist: "Sohbana & MEIKO", album: "Project SEKAI UNIT IMAGE ALBUM セカイノオト vol.1", releaseDate: "2023-08-25" },
  { id: 1701386384, title: "ショウタイム×オーディエンス", artist: "瀬名航 & 初音ミク", album: "Project SEKAI UNIT IMAGE ALBUM セカイノオト vol.1", releaseDate: "2023-08-25" },
  { id: 1701386686, title: "LEADER", artist: "香椎モイミ & KAITO", album: "Project SEKAI UNIT IMAGE ALBUM セカイノオト vol.1", releaseDate: "2023-08-25" },
  { id: 1701386687, title: "limbo", artist: "椎乃味醂 & 初音ミク", album: "Project SEKAI UNIT IMAGE ALBUM セカイノオト vol.1", releaseDate: "2023-08-25" },
  { id: 1701386688, title: "Unpoison", artist: "袖野あらわ & 初音ミク", album: "Project SEKAI UNIT IMAGE ALBUM セカイノオト vol.1", releaseDate: "2023-08-25" },
  { id: 1856463785, title: "NEO", artist: "星乃一歌, 花里みのり, 小豆沢こはね, 天馬司, 宵崎奏 & 初音ミク", album: "プロジェクトセカイ カラフルステージ! feat. 初音ミク テーマソング・アニバーサリーソングアルバム", releaseDate: "2023-10-01" },
  { id: 1804832490, title: "ロキ", artist: "鏡音レン & KAITO", album: "プロジェクトセカイ カラフルステージ! feat. 初音ミク アナザーボーカルアルバム バーチャル・シンガー", releaseDate: "2025-03-31" },
  { id: 1804832491, title: "テオ", artist: "初音ミク & 巡音ルカ", album: "プロジェクトセカイ カラフルステージ! feat. 初音ミク アナザーボーカルアルバム バーチャル・シンガー", releaseDate: "2025-03-31" },
  { id: 1804832492, title: "ヒバナ -Reloaded-", artist: "鏡音リン", album: "プロジェクトセカイ カラフルステージ! feat. 初音ミク アナザーボーカルアルバム バーチャル・シンガー", releaseDate: "2025-03-31" },
  { id: 1804832494, title: "ドクター=ファンクビート", artist: "鏡音レン", album: "プロジェクトセカイ カラフルステージ! feat. 初音ミク アナザーボーカルアルバム バーチャル・シンガー", releaseDate: "2025-03-31" },
  { id: 1804832495, title: "シャルル", artist: "鏡音レン & KAITO", album: "プロジェクトセカイ カラフルステージ! feat. 初音ミク アナザーボーカルアルバム バーチャル・シンガー", releaseDate: "2025-03-31" },
  { id: 1804832496, title: "脱法ロック", artist: "KAITO", album: "プロジェクトセカイ カラフルステージ! feat. 初音ミク アナザーボーカルアルバム バーチャル・シンガー", releaseDate: "2025-03-31" },
  { id: 1804832497, title: "命に嫌われている", artist: "鏡音リン", album: "プロジェクトセカイ カラフルステージ! feat. 初音ミク アナザーボーカルアルバム バーチャル・シンガー", releaseDate: "2025-03-31" },
  { id: 1804832499, title: "夜咄ディセイブ", artist: "鏡音レン", album: "プロジェクトセカイ カラフルステージ! feat. 初音ミク アナザーボーカルアルバム バーチャル・シンガー", releaseDate: "2025-03-31" },
  { id: 1804832500, title: "携帯恋話", artist: "初音ミク", album: "プロジェクトセカイ カラフルステージ! feat. 初音ミク アナザーボーカルアルバム バーチャル・シンガー", releaseDate: "2025-03-31" },
  { id: 1804832501, title: "ジャックポットサッドガール", artist: "MEIKO", album: "プロジェクトセカイ カラフルステージ! feat. 初音ミク アナザーボーカルアルバム バーチャル・シンガー", releaseDate: "2025-03-31" },
  { id: 1804832502, title: "potatoになっていく", artist: "初音ミク, 鏡音レン, 巡音ルカ, MEIKO & KAITO", album: "プロジェクトセカイ カラフルステージ! feat. 初音ミク アナザーボーカルアルバム バーチャル・シンガー", releaseDate: "2025-03-31" },
  { id: 1804832503, title: "Forward", artist: "初音ミク, 鏡音リン, 鏡音レン, MEIKO & KAITO", album: "プロジェクトセカイ カラフルステージ! feat. 初音ミク アナザーボーカルアルバム バーチャル・シンガー", releaseDate: "2025-03-31" },
  { id: 1804832504, title: "ニジイロストーリーズ", artist: "MEIKO & KAITO", album: "プロジェクトセカイ カラフルステージ! feat. 初音ミク アナザーボーカルアルバム バーチャル・シンガー", releaseDate: "2025-03-31" },
  { id: 1804832505, title: "Color of Drops", artist: "巡音ルカ", album: "プロジェクトセカイ カラフルステージ! feat. 初音ミク アナザーボーカルアルバム バーチャル・シンガー", releaseDate: "2025-03-31" },
  { id: 1804832506, title: "限りなく灰色へ", artist: "鏡音リン", album: "プロジェクトセカイ カラフルステージ! feat. 初音ミク アナザーボーカルアルバム バーチャル・シンガー", releaseDate: "2025-03-31" },
  { id: 1804832507, title: "威風堂々", artist: "KAITO", album: "プロジェクトセカイ カラフルステージ! feat. 初音ミク アナザーボーカルアルバム バーチャル・シンガー", releaseDate: "2025-03-31" },
  { id: 1804832508, title: "Beat Eater", artist: "鏡音リン", album: "プロジェクトセカイ カラフルステージ! feat. 初音ミク アナザーボーカルアルバム バーチャル・シンガー", releaseDate: "2025-03-31" },
  { id: 1804832630, title: "ビターチョコデコレーション", artist: "巡音ルカ", album: "プロジェクトセカイ カラフルステージ! feat. 初音ミク アナザーボーカルアルバム バーチャル・シンガー", releaseDate: "2025-03-31" },
  { id: 1804832631, title: "ベノム", artist: "初音ミク", album: "プロジェクトセカイ カラフルステージ! feat. 初音ミク アナザーボーカルアルバム バーチャル・シンガー", releaseDate: "2025-03-31" },
  { id: 1804832633, title: "群青讃歌", artist: "初音ミク, 鏡音リン, 鏡音レン, 巡音ルカ, MEIKO & KAITO", album: "プロジェクトセカイ カラフルステージ! feat. 初音ミク アナザーボーカルアルバム バーチャル・シンガー", releaseDate: "2025-03-31" },
  { id: 1856463786, title: "熱風", artist: "星乃一歌, 花里みのり, 小豆沢こはね, 天馬司, 宵崎奏 & 初音ミク", album: "プロジェクトセカイ カラフルステージ! feat. 初音ミク テーマソング・アニバーサリーソングアルバム", releaseDate: "2025-03-31" },
  { id: 1856463781, title: "セカイ", artist: "星乃一歌, 天馬司, 宵崎奏 & 初音ミク", album: "プロジェクトセカイ カラフルステージ! feat. 初音ミク テーマソング・アニバーサリーソングアルバム", releaseDate: "2025-12-10" },
  { id: 1856463782, title: "ワーワーワールド", artist: "花里みのり, 小豆沢こはね & 初音ミク", album: "プロジェクトセカイ カラフルステージ! feat. 初音ミク テーマソング・アニバーサリーソングアルバム", releaseDate: "2025-12-10" },
  { id: 1856463787, title: "ペンタトニック", artist: "星乃一歌, 花里みのり, 小豆沢こはね, 天馬司, 宵崎奏 & 初音ミク", album: "プロジェクトセカイ カラフルステージ! feat. 初音ミク テーマソング・アニバーサリーソングアルバム", releaseDate: "2025-12-10" },
] satisfies SongQuizSong[];
