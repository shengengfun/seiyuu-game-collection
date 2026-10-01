/**
 * 猜歌的企划与分组。
 *
 * 两级结构：**企划（franchise）→ 分组（group）**，界面按企划分页、页内平铺该企划的分组卡片，
 * 组数多了这样比一长条列表好找。分组 id 同时是曲库文件名（`songs/<id>.ts`）。
 *
 * 收录范围（先做这些）：LoveLive! / BanG Dream! / Project SEKAI / 偶像大师 / 学园偶像大师 /
 * 赛马娘 / 少女歌剧 / D4DJ / 東方Project（同人紫音社团）—— 前面几个与本站声优名册的企划划分一致，
 * 车万没有声优名册，按社团署名收录。
 */

export const SONG_FRANCHISE_IDS = [
  'lovelive',
  'bangdream',
  'pjsk',
  'idolmaster',
  'gakuen',
  'umamusume',
  'revuestar',
  'd4dj',
  'touhou',
  'tokusatsu',
  'special',
  'hotip',
  'maimai',
] as const;

export type SongFranchiseId = (typeof SONG_FRANCHISE_IDS)[number];

export const SONG_GROUP_IDS = [
  // LoveLive!
  'muse',
  'aqours',
  'nijigasaki',
  'liella',
  'hasunosora',
  // BanG Dream!
  'popipa',
  'roselia',
  'ras',
  'morfonica',
  'afterglow',
  'hhw',
  'pasupare',
  'mygo',
  'avemujica',
  // Project SEKAI
  'leoneed',
  'mmj',
  'vbs',
  'wxs',
  'niigo',
  'vsinger',
  // 偶像大师
  'imas765',
  'cinderella',
  'million',
  'shinycolors',
  // 学园偶像大师
  'gakuimas',
  // 赛马娘
  'umamusume',
  // 少女歌剧
  'revuestar',
  // D4DJ
  'happyaround',
  'peakypkey',
  'photonmaiden',
  'merm4id',
  'rondo',
  'lyricallily',
  // 東方Project（同人紫音社团）
  'yuuhei',
  'chouyousou',
  'butaotome',
  'iosys',
  'tamaonsen',
  'soundholic',
  'eastnewsound',
  'silverforest',
  'cclays',
  'liztriangle',
  'shinrabansho',
  'coolcreate',
  'yondervoice',
  'akatsukirecords',
  'syncarts',
  'undeadcorp',
  'foxtailgrass',
  'amebrella',
  'shanghaialice',
  // 特摄（假面骑士 / 奥特曼，各按年代分三组）
  'krshowa',
  'krheisei',
  'krreiwa',
  'ultrashowa',
  'ultraheisei',
  'ultrareiwa',
  // 特别呈现：年代动漫金曲（每十年一组）+ 互联网 meme
  'anime80s',
  'anime90s',
  'anime00s',
  'anime10s',
  'anime20s',
  'meme',
  // 热门 IP 金曲（一个 IP 一组）
  'gundam',
  'dragonball',
  'naruto',
  'onepiece',
  'conan',
  'pokemon',
  // 舞萌DX（SEGA 音游 maimai 的原创曲）与联动曲
  'maimaidx',
  'maimaicollab',
] as const;

export type SongGroupId = (typeof SONG_GROUP_IDS)[number];

/** 企划元数据：`color` 用于分页与卡片点缀。 */
export const SONG_FRANCHISES: Record<SongFranchiseId, { color: string; groups: SongGroupId[] }> = {
  lovelive: {
    color: '#ff8fab',
    groups: ['muse', 'aqours', 'nijigasaki', 'liella', 'hasunosora'],
  },
  bangdream: {
    color: '#7bb7ff',
    groups: ['popipa', 'roselia', 'ras', 'morfonica', 'afterglow', 'hhw', 'pasupare', 'mygo', 'avemujica'],
  },
  pjsk: {
    color: '#33d6c0',
    groups: ['leoneed', 'mmj', 'vbs', 'wxs', 'niigo', 'vsinger'],
  },
  idolmaster: {
    color: '#ffd166',
    groups: ['imas765', 'cinderella', 'million', 'shinycolors'],
  },
  gakuen: {
    color: '#b388ff',
    groups: ['gakuimas'],
  },
  umamusume: {
    color: '#ff9f5b',
    groups: ['umamusume'],
  },
  revuestar: {
    color: '#f0a6ff',
    groups: ['revuestar'],
  },
  d4dj: {
    color: '#9ef07a',
    groups: ['happyaround', 'peakypkey', 'photonmaiden', 'merm4id', 'rondo', 'lyricallily'],
  },
  touhou: {
    color: '#e46bff',
    groups: [
      'yuuhei',
      'chouyousou',
      'butaotome',
      'iosys',
      'tamaonsen',
      'soundholic',
      'eastnewsound',
      'silverforest',
      'cclays',
      'liztriangle',
      'shinrabansho',
      'coolcreate',
      'yondervoice',
      'akatsukirecords',
      'syncarts',
      'undeadcorp',
      'foxtailgrass',
      'amebrella',
      'shanghaialice',
    ],
  },
  tokusatsu: {
    color: '#d62828',
    groups: ['krshowa', 'krheisei', 'krreiwa', 'ultrashowa', 'ultraheisei', 'ultrareiwa'],
  },
  special: {
    color: '#e63946',
    groups: ['anime80s', 'anime90s', 'anime00s', 'anime10s', 'anime20s', 'meme'],
  },
  hotip: {
    color: '#4c6ef5',
    groups: ['gundam', 'dragonball', 'naruto', 'onepiece', 'conan', 'pokemon'],
  },
  maimai: {
    color: '#00b8d4',
    groups: ['maimaidx', 'maimaicollab'],
  },
};

/** 分组 → 所属企划（由 `SONG_FRANCHISES` 反推，避免两处维护）。 */
export const SONG_GROUP_FRANCHISE: Record<SongGroupId, SongFranchiseId> = SONG_GROUP_IDS.reduce(
  (accumulator, groupId) => {
    const franchise = SONG_FRANCHISE_IDS.find((id) => SONG_FRANCHISES[id].groups.includes(groupId));
    if (!franchise) throw new Error(`分组 ${groupId} 没有登记企划`);
    accumulator[groupId] = franchise;
    return accumulator;
  },
  {} as Record<SongGroupId, SongFranchiseId>,
);

export function isSongGroupId(value: string): value is SongGroupId {
  return (SONG_GROUP_IDS as readonly string[]).includes(value);
}

export function isSongFranchiseId(value: string): value is SongFranchiseId {
  return (SONG_FRANCHISE_IDS as readonly string[]).includes(value);
}

