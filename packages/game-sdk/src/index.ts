/**
 * `@seiyuu/game-sdk` —— 主站与所有游戏模块共用的能力出口。
 *
 * 主站与模块都会从 `/vendor/seiyuu-game-sdk.js` 加载**同一份**实现，
 * 所以这里的 React 组件、store、i18n 实例、socket 单例在主站与模块之间是同一个对象。
 */

/* ---------- 模块协议 ---------- */
export type {
  GameModuleManifest,
  GameModuleComponent,
  GameModuleRegistry,
  LocalizedText,
} from './module';
export { defineModule } from './module';

/* ---------- i18n ---------- */
export {
  addTranslationBundle,
  bootstrapI18n,
  currentLanguage,
  currentLocale,
  default as i18n,
  detectLanguage,
  hasTranslationBundle,
  LANGUAGE_STORAGE_KEY,
  loadLanguage,
  normalizeLanguage,
  onLanguageChanged,
  supportedLanguages,
  type AppLanguage,
  type BootstrapI18nOptions,
  type LocaleLoader,
} from './i18n';
export { translate } from './i18n/messages';

/* ---------- 路由与站点级常量 ---------- */
export * from './config/routes';
export * from './config/difficulties';
export * from './config/fandom';
/* SeiValue 的分享码 / 加点换算被「事务所经营」复用，放 SDK 共用 */
export * from './config/seivalue';

/* ---------- 跨端类型 ---------- */
export * from './types';

/* ---------- API / 会话 / 实时 ---------- */
export { api, errMsg } from './api/client';
export {
  closeSocket,
  getSocket,
  subscribeResourceVersion,
} from './api/socket';
export {
  createRegisterPow,
  ensurePow,
  getPowProgress,
  notePowExpiry,
  subscribePowProgress,
} from './api/pow';
export {
  clearPlayerListCache,
  getPlayerList,
  searchPlayerList,
  subscribePlayerList,
} from './api/playerList';
export {
  clearAuthenticated,
  ensureGuestSession,
  hasAuthHint,
  initializeIdentity,
  markAuthenticated,
  markGuestSession,
} from './api/session';
export { hasGuestHint, refreshAuthenticatedSession } from './api/authSession';

/* ---------- 轻量状态 ---------- */
export { useAuth } from './store/auth';
export { getTheme, initializeTheme, setTheme, subscribeTheme, type Theme } from './store/theme';
export {
  getMotionEnabled,
  initializeMotionPreference,
  setMotionEnabled,
  subscribeMotion,
} from './store/motion';
export { getGuestName, hasGuestName, setGuestName, subscribeGuestName } from './store/guest';
export {
  AUTO_ADVANCE_DELAY_MS,
  getAutoAdvance,
  setAutoAdvance,
  subscribeAutoAdvance,
  useAutoAdvance,
} from './store/quizFlow';
export { getStoredSingleDifficulty, setStoredSingleDifficulty } from './store/singleDifficulty';
export {
  loadMultiLobbyPreferences,
  saveMultiLobbyPreferences,
} from './store/multiLobbyPreferences';

/* ---------- 工具 ---------- */
export { shareToQq, qqSharePageUrl } from './utils/share';
export * from './utils/poster';
export { copyText } from './utils/clipboard';
export {
  difficultyColor,
  difficultyDescription,
  difficultyIcon,
  difficultyLabel,
} from './utils/difficulty';
export { formatServerDate, formatServerDay, parseServerDate } from './utils/serverDate';

/* ---------- 通用组件 ---------- */
export { default as Page } from './components/Page';
export { default as ModalPortal } from './components/ModalPortal';
export { default as SeiyuuPhoto } from './components/SeiyuuPhoto';
export { default as MenuCard } from './components/MenuCard';
export { default as GameRules } from './components/GameRules';
export { default as SiteHeader } from './components/SiteHeader';
export { default as OnlineBadge } from './components/OnlineBadge';
export { default as LanguageSelect } from './components/LanguageSelect';
export { default as ThemeToggle } from './components/ThemeToggle';
export { default as LinkifiedText } from './components/LinkifiedText';
export { default as HomeSpecialThanks } from './components/HomeSpecialThanks';
export { default as HomeFriendLinks } from './components/HomeFriendLinks';
export { default as ToastViewport, toast } from './components/Toast';
export { ConfirmProvider, useConfirm } from './components/ConfirmDialog';
export { BilibiliIcon, GitHubIcon } from './components/BrandIcons';
export { default as PersonalSettings } from './components/PersonalSettings';
/* 声优猜的共用展示组件：主站后台（对局回放）、统计页与游戏模块都要用 */
export { default as GuessBoard } from './components/GuessBoard';
export { default as GuessInputBar } from './components/GuessInputBar';
export { default as AnswerOverlay, PlayerInfoTable, type AnswerInfo } from './components/AnswerOverlay';
export {
  default as ReplayDialog,
  type Replay,
  type SingleReplay,
  type MultiReplay,
  type MultiReplayRound,
} from './components/ReplayDialog';
export { default as PlayerStatsDialog, type PlayerStatsView } from './components/PlayerStatsDialog';
export { default as PlayerStatsSummary } from './components/PlayerStatsSummary';
export { default as Badge } from './components/Badge';
