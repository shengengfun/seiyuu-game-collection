export interface User {
  id: number;
  username: string;
  display_id: string | null;
  password_hash: string;
  role: 'user' | 'admin';
  token_version: number;
  matchmaking_restricted: boolean | number;
  email: string | null;
  email_verified_at: string | null;
  banned_at: string | null;
  created_at: string;
}

export interface Seiyuu {
  id: number;
  name: string;
  romaji: string;
  birth_place: string;
  agency: string;
  birth_date: string | null;
  debut_year: number;
  height: number | null;
  blood_type: string | null;
  voice_types: string[];
  representative_works: { work: string; character: string }[];
  /** 代表角色/代表作：用于替换原来的“声线类型”列在前端进行展示与匹配 */
  representative_characters: { work: string; character: string }[];
  /** 所属团体/组合/偶像团体（替换原“身高”列展示） */
  groups: string[];
  /** 五大企划标记：LoveLive!、BanG Dream!、偶像大师系列、赛马娘、少女歌剧 */
  five_groups: string[];
  /** 配音角色总数（来自 bangumi） */
  voice_count: number;
  /** 配音游戏数（type=4） */
  game_voice_count: number;
  /** 配音过的二游代表作 */
  representative_games: { work: string; character: string }[];
  difficulties?: string[];
  is_enabled: boolean | number;
  created_at: string;
}

export type FeedbackLevel = 'correct' | 'close' | 'wrong' | 'missing';

export interface AttributeFeedback {
  value: string | number | boolean;
  level: FeedbackLevel;
  /** 数值型属性的方向提示: higher = 目标比猜测大 */
  hint?: 'higher' | 'lower';
  /** 数组型属性匹配数量 */
  matched?: number;
}

export interface GuessFeedback {
  playerId: number;
  name: string;
  correct: boolean;
  attributes: {
    birthPlace: AttributeFeedback;
    agency: AttributeFeedback;
    birthDate: AttributeFeedback;
    debutYear: AttributeFeedback;
    voiceCount: AttributeFeedback;
    groups: AttributeFeedback;
    representativeCharacters: AttributeFeedback;
  };
}

export interface GameRow {
  id: number;
  session_id: string | null;
  user_id: number | null;
  guest_key: string | null;
  target_player_id: number;
  mode: string;
  guesses: string;
  guess_times: string;
  status: 'playing' | 'won' | 'lost';
  guess_count: number;
  created_at: string;
  finished_at: string | null;
}
