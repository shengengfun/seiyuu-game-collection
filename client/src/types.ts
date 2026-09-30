export type FeedbackLevel = 'correct' | 'close' | 'wrong' | 'missing';

export interface AttributeFeedback {
  value: string | number | boolean;
  level: FeedbackLevel;
  hint?: 'higher' | 'lower';
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

export type HiddenAttributeFeedback = Pick<AttributeFeedback, 'level' | 'hint' | 'matched'>;

export interface HiddenGuessFeedback {
  hidden: true;
  correct: boolean;
  attributes: {
    birthPlace: HiddenAttributeFeedback;
    agency: HiddenAttributeFeedback;
    birthDate: HiddenAttributeFeedback;
    debutYear: HiddenAttributeFeedback;
    voiceCount: HiddenAttributeFeedback;
    groups: HiddenAttributeFeedback;
    representativeCharacters: HiddenAttributeFeedback;
  };
}

export type MultiplayerGuessFeedback = GuessFeedback | HiddenGuessFeedback;

export interface UserInfo {
  id: number;
  username: string;
  role: 'user' | 'admin';
  email?: string | null;
  emailVerified?: boolean;
}

export interface SeiyuuInfo {
  id: number;
  name: string;
  romaji: string;
  birthPlace: string;
  agency: string;
  birthDate: string | null;
  debutYear: number;
  voiceCount: number;
  gameVoiceCount: number;
  representativeGames: { work: string; character: string }[];
  groups: string[];
  bloodType: string | null;
  representativeCharacters: string[];
  representativeWorks: { work: string; character: string }[];
  difficulties?: string[];
}

export interface RoomPlayer {
  key: string;
  name: string;
  ready: boolean;
  connected: boolean;
  score: number;
  skipped: boolean;
  guessCount: number;
  guesses: MultiplayerGuessFeedback[];
}

export interface PlayerPerformanceStats {
  single: {
    games: number;
    wins: number;
    losses: number;
    winRate: number;
    avgGuesses: number | null;
    bestGuesses: number | null;
  };
  multi: {
    games: number;
    wins: number;
    losses: number;
    winRate: number;
    recentAverageWinningGuesses: number | null;
    recentMatches: Array<{
      id: number;
      result: 'won' | 'lost' | 'draw';
      score: { me: number; opponent: number };
      boType: number;
      dbType: string;
      opponentDisplayId: string;
      finishedAt: string;
      rounds: Array<{
        round: number;
        winner: 'me' | 'opponent' | null;
        meGuesses: number;
        opponentGuesses: number;
      }>;
    }>;
  };
}

export interface MatchReplayRound {
  round: number;
  reason: string;
  winner: 'me' | 'opponent' | null;
  answer: SeiyuuInfo;
  me: { guesses: GuessFeedback[]; guessTimes?: Array<number | null> };
  opponent: { guesses: GuessFeedback[]; guessTimes?: Array<number | null> };
}

export interface MatchReplay {
  id: number | string;
  mode: string;
  boType: number;
  finishedAt: string;
  result: 'won' | 'lost' | 'draw';
  me: { score: number };
  opponent: { displayId: string; score: number };
  rounds: MatchReplayRound[];
}

export interface RoomState {
  id: string;
  hostKey: string;
  status: 'waiting' | 'playing' | 'round_over' | 'finished';
  matchmaking: boolean;
  readyCheckEndsAt: number | null;
  dbType: string;
  boType: number;
  rematchAllowed: boolean;
  rematchInvite: { inviterKey: string } | null;
  allowSpectators: boolean;
  verifiedOnly: boolean;
  anonymous: boolean;
  round: number;
  roundId: number;
  stateVersion: number;
  winsNeeded: number;
  maxGuesses: number;
  roundEndsAt: number | null;
  matchStartsAt: number | null;
  spectatorCount: number;
  players: RoomPlayer[];
  roundResult: {
    winnerKey: string | null;
    reason: string;
    nextRoundAt: number | null;
    answer: {
      name: string;
      agency: string;
      birthPlace: string;
      birthDate: string | null;
      debutYear: number;
      voiceCount: number;
      groups: string[];
      representativeCharacters: string[];
      representativeGames: { work: string; character: string }[];
    } | null;
  } | null;
  matchResult: {
    winnerKey: string | null;
    reason: string;
    answer: {
      name: string;
      agency: string;
      birthPlace: string;
      birthDate: string | null;
      debutYear: number;
      voiceCount: number;
      groups: string[];
      representativeCharacters: string[];
      representativeGames: { work: string; character: string }[];
    } | null;
  } | null;
  reportSubmitted: boolean;
  matchReplay?: MatchReplay;
}

export interface RoomPatch {
  roomId: string;
  baseVersion: number;
  stateVersion: number;
  hostKey?: string;
  players?: {
    added?: RoomPlayer[];
    updated?: Array<Partial<RoomPlayer> & { key: string }>;
    removed?: string[];
  };
  spectatorCount?: number;
}

export interface PresenceStats {
  onlineUsers: number;
  multiplayerRooms: number;
  singleGames: number;
  updatedAt: number;
}
