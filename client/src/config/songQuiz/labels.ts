import type { SongFranchiseId, SongGroupId } from './groups';

/**
 * 企划与分组的**官方名称**。
 *
 * 这些是专有名词（艺人 / 组合名），不是需要翻译的 UI 文案，所以放在配置里按语言取值，
 * 而不是塞进 i18n 的几百条平行键里；只有中/日/英写法确实不同时才分开写。
 * 界面用 `labelOf()` 按当前语言取。
 */
export type SongLabel = { zh: string; ja: string; en: string };

const label = (zh: string, ja = zh, en = ja): SongLabel => ({ zh, ja, en });

export const SONG_FRANCHISE_LABELS: Record<SongFranchiseId, SongLabel> = {
  lovelive: label('LoveLive!', 'ラブライブ！', 'Love Live!'),
  bangdream: label('BanG Dream!', 'BanG Dream!', 'BanG Dream!'),
  pjsk: label('世界计划', 'プロジェクトセカイ', 'Project SEKAI'),
  idolmaster: label('偶像大师', 'アイドルマスター', 'THE IDOLM@STER'),
  gakuen: label('学园偶像大师', '学園アイドルマスター', 'Gakuen Idolmaster'),
  umamusume: label('赛马娘', 'ウマ娘', 'Uma Musume'),
  revuestar: label('少女歌剧', 'レヴュースタァライト', 'Revue Starlight'),
  d4dj: label('D4DJ', 'D4DJ', 'D4DJ'),
  touhou: label('车万', '東方Project', 'Touhou Project'),
  tokusatsu: label('特摄', '特撮', 'Tokusatsu'),
  special: label('特别呈现', '特別企画', 'Special Feature'),
  hotip: label('热门IP', '人気IP', 'Popular IPs'),
  maimai: label('舞萌DX', 'maimai DX', 'maimai DX'),
};

export const SONG_GROUP_LABELS: Record<SongGroupId, SongLabel> = {
  // LoveLive!
  muse: label("μ's"),
  aqours: label('Aqours'),
  nijigasaki: label('虹咲', '虹ヶ咲', 'Nijigasaki'),
  liella: label('Liella!'),
  hasunosora: label('莲之空', '蓮ノ空', 'Hasunosora'),
  // BanG Dream!
  popipa: label("Poppin'Party"),
  roselia: label('Roselia'),
  ras: label('RAISE A SUILEN'),
  morfonica: label('Morfonica'),
  afterglow: label('Afterglow'),
  hhw: label('Hello, Happy World!', 'ハロー、ハッピーワールド!', 'Hello, Happy World!'),
  pasupare: label('Pastel*Palettes'),
  mygo: label('MyGO!!!!!'),
  avemujica: label('Ave Mujica'),
  // Project SEKAI
  leoneed: label('Leo/need'),
  mmj: label('MORE MORE JUMP!'),
  vbs: label('Vivid BAD SQUAD'),
  wxs: label('Wonderlands×Showtime', 'ワンダーランズ×ショウタイム', 'Wonderlands×Showtime'),
  niigo: label('25 时、在 Nightcord。', '25時、ナイトコードで。', 'Nightcord at 25:00'),
  vsinger: label('虚拟歌手', 'バーチャル・シンガー', 'Virtual Singers'),
  // 偶像大师
  imas765: label('765PRO ALLSTARS'),
  cinderella: label('灰姑娘女孩', 'シンデレラガールズ', 'Cinderella Girls'),
  million: label('百万现场', 'ミリオンライブ！', 'Million Live!'),
  shinycolors: label('闪耀色彩', 'シャイニーカラーズ', 'Shiny Colors'),
  // 学园偶像大师
  gakuimas: label('初星学园', '初星学園', 'Hatsuboshi Gakuen'),
  // 赛马娘
  umamusume: label('赛马娘', 'ウマ娘', 'Uma Musume'),
  // 少女歌剧
  revuestar: label('Starlight 九九组', 'スタァライト九九組', 'Starlight Kukugumi'),
  // D4DJ
  happyaround: label('Happy Around!'),
  peakypkey: label('Peaky P-key'),
  photonmaiden: label('Photon Maiden'),
  merm4id: label('Merm4id'),
  rondo: label('燐舞曲', '燐舞曲', 'Rondo'),
  lyricallily: label('Lyrical Lily'),
  // 東方Project（同人音乐社团；多数团名是日文原名，中文圈常直接沿用）
  yuuhei: label('幽闭星光', '幽閉サテライト', 'Yuuhei Satellite'),
  chouyousou: label('凋叶棕'),
  butaotome: label('豚乙女', '豚乙女', 'BUTAOTOME'),
  iosys: label('IOSYS'),
  tamaonsen: label('魂音泉'),
  soundholic: label('SOUND HOLIC'),
  eastnewsound: label('EastNewSound'),
  silverforest: label('Silver Forest'),
  cclays: label('C-CLAYS'),
  liztriangle: label('Liz Triangle'),
  shinrabansho: label('森罗万象', '森羅万象', 'Shinra-Bansho'),
  coolcreate: label('COOL&CREATE'),
  yondervoice: label('Yonder Voice'),
  akatsukirecords: label('暁Records', '暁Records', 'Akatsuki Records'),
  syncarts: label("SYNC.ART'S"),
  undeadcorp: label('UNDEAD CORPORATION'),
  foxtailgrass: label('Foxtail-Grass Studio'),
  amebrella: label('群雨伞', '群雨アンブレイラ', 'Ambrella'),
  shanghaialice: label('上海爱丽丝幻乐团（原作）', '上海アリス幻樂団（原作）', 'Team Shanghai Alice (originals)'),
  // 特摄：两个系列 × 昭和 / 平成 / 令和
  krshowa: label('假面骑士 · 昭和', '仮面ライダー · 昭和', 'Kamen Rider · Showa'),
  krheisei: label('假面骑士 · 平成', '仮面ライダー · 平成', 'Kamen Rider · Heisei'),
  krreiwa: label('假面骑士 · 令和', '仮面ライダー · 令和', 'Kamen Rider · Reiwa'),
  ultrashowa: label('奥特曼 · 昭和', 'ウルトラマン · 昭和', 'Ultraman · Showa'),
  ultraheisei: label('奥特曼 · 平成', 'ウルトラマン · 平成', 'Ultraman · Heisei'),
  ultrareiwa: label('奥特曼 · 令和', 'ウルトラマン · 令和', 'Ultraman · Reiwa'),
  // 特别呈现：年代动漫金曲 + 互联网 meme
  anime80s: label('1980年代动漫金曲', '1980年代アニソン', '80s Anime Hits'),
  anime90s: label('1990年代动漫金曲', '1990年代アニソン', '90s Anime Hits'),
  anime00s: label('2000年代动漫金曲', '2000年代アニソン', '2000s Anime Hits'),
  anime10s: label('2010年代动漫金曲', '2010年代アニソン', '2010s Anime Hits'),
  anime20s: label('2020年代动漫金曲', '2020年代アニソン', '2020s Anime Hits'),
  meme: label('互联网 meme', 'ネットミーム', 'Internet Memes'),
  // 热门 IP 金曲
  gundam: label('高达系列金曲', 'ガンダムシリーズ', 'Gundam Series'),
  dragonball: label('龙珠系列金曲', 'ドラゴンボールシリーズ', 'Dragon Ball Series'),
  naruto: label('火影忍者金曲', 'NARUTO -ナルト-', 'Naruto'),
  onepiece: label('海贼王金曲', 'ONE PIECE', 'One Piece'),
  conan: label('名侦探柯南金曲', '名探偵コナン', 'Detective Conan'),
  pokemon: label('宝可梦金曲', 'ポケットモンスター', 'Pokémon'),
  // 舞萌DX
  maimaidx: label('maimai DX 原创曲', 'maimai DX オリジナル', 'maimai DX Originals'),
  maimaicollab: label('联动曲', 'コラボ曲', 'Collab Songs'),
};

/** 按当前语言取名称（`zh-CN` / `ja-JP` / 其它 → en）。 */
export function labelOf(entry: SongLabel, language: string): string {
  const key = language.startsWith('ja') ? 'ja' : language.startsWith('zh') ? 'zh' : 'en';
  return entry[key] || entry.en || entry.ja;
}
