import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Copy,
  Disc3,
  Download,
  Globe,
  Heart,
  MessageCircle,
  Music,
  Pause,
  Play,
  RotateCcw,
  Search,
  Trophy,
  Users,
  X,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Page from '../components/Page';
import SongQuizLeaderboard from '../components/SongQuizLeaderboard';
import SongQuizMulti from '../components/SongQuizMulti';
import SongQuizRules from '../components/SongQuizRules';
import { api } from '../api/client';
import { useAuth } from '../store/auth';
import { SITE_HOME, SONG_QUIZ_HOME } from '../config/routes';
import {
  OPTION_COUNT,
  OPTION_LETTERS,
  SONG_DIFFICULTIES,
  SONG_DIFFICULTY_ORDER,
  SONG_FRANCHISES,
  SONG_FRANCHISE_IDS,
  SONG_GROUP_FRANCHISE,
  createRound,
  decodeSongQuizCode,
  formatDuration,
  formatSeconds,
  resultCodeOf,
  resultOf,
  songsOfGroup,
  type SongAnswerMap,
  type SongDifficulty,
  type SongFranchiseId,
  type SongGrade,
  type SongGroupId,
  type SongQuizResult,
  type SongQuizRound,
} from '../config/songQuiz';
import {
  SONG_FRANCHISE_LABELS,
  SONG_GROUP_LABELS,
  labelOf,
} from '../config/songQuiz/labels';
import { shareToQq } from '../utils/share';
import ModalPortal from '../components/ModalPortal';
import { downloadPoster, posterFileName, renderScorePoster } from '../utils/poster';
import { AUTO_ADVANCE_DELAY_MS, useAutoAdvance } from '../store/quizFlow';

type Stage = 'lobby' | 'quiz' | 'result';
type LobbyTab = 'single' | 'multi';
type CopyState = 'idle' | 'done' | 'failed';
type SubmitState = 'idle' | 'sending' | 'done' | 'failed' | 'guest';

/** 服务端换回来的试听信息。 */
interface Preview {
  id: number;
  /** Apple 的原始试听地址（备用）。 */
  previewUrl: string;
  /** 本站转发的地址（MIME 已规范化，优先用它）。 */
  audioUrl?: string;
  artworkUrl: string;
}

/** 优先用本站转发的音频：Apple 的 `audio/x-m4p` 这类 MIME 在部分浏览器里会被拒。 */
function sourceOf(preview?: Preview): string {
  return preview?.audioUrl || preview?.previewUrl || '';
}

/** 专家模式答错后停留多久再翻页（让玩家看清答案）。 */
const REVEAL_DELAY = 900;
/** 试听有 30 秒，进度条按它算。 */
const PREVIEW_SECONDS = 30;
/** 每次向服务端换多少条试听（专家模式是全曲库，不能一次性请求）。 */
const PREVIEW_WINDOW = 20;

/**
 * 猜歌：选企划与难度 → 听 30 秒试听四选一 → 结算。
 *
 * - 单人：4 个难度（轻松 5 / 标准 10 / 硬核 20 / 专家 = 全题库 + 三颗红心），
 *   专家模式答错立即扣红心并把正确答案亮出来（否则玩家不知道自己已经扣了心）。
 * - 多人：按「声优猜」的形态预留入口，玩法与联机协议见页面内的说明，尚未开放。
 * 计分见 config/songQuiz 的 `questionPoints`（基础分 + 速度分，再乘难度权重），
 * 成绩码可直接提交到全站排行榜。
 */
export default function SongQuiz() {
  const { t, i18n } = useTranslation();
  const { user, initialized } = useAuth();
  const [stage, setStage] = useState<Stage>('lobby');
  const [tab, setTab] = useState<LobbyTab>('single');
  const [franchise, setFranchise] = useState<SongFranchiseId>('lovelive');
  const [group, setGroup] = useState<SongGroupId>('nijigasaki');
  const [difficulty, setDifficulty] = useState<SongDifficulty>('normal');
  const [round, setRound] = useState<SongQuizRound | null>(null);
  const [answers, setAnswers] = useState<SongAnswerMap>({});
  const [index, setIndex] = useState(0);
  const [result, setResult] = useState<SongQuizResult | null>(null);
  const [previews, setPreviews] = useState<Record<number, Preview>>({});
  const [previewState, setPreviewState] = useState<'idle' | 'loading' | 'ready' | 'failed'>('idle');
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  /** 专家模式：本题已作答（锁定 + 亮出答案）。 */
  const [revealed, setRevealed] = useState(false);
  const [queryCode, setQueryCode] = useState('');
  const [queryError, setQueryError] = useState('');
  const [copyState, setCopyState] = useState<CopyState>('idle');
  const [submitState, setSubmitState] = useState<SubmitState>('idle');
  const [myRank, setMyRank] = useState<number | null>(null);
  /** 本局的成绩是否可以上榜（查别人的成绩码还原出来的不能）。 */
  const [scoreable, setScoreable] = useState(false);
  const [posterUrl, setPosterUrl] = useState('');
  const [posterBusy, setPosterBusy] = useState(false);
  const [posterError, setPosterError] = useState('');
  const posterCanvas = useRef<HTMLCanvasElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  /** 「选完自动换题」：默认开，可在个人设置里关（多人对战由服务端推进，与此无关）。 */
  const autoAdvance = useAutoAdvance();
  const startedAt = useRef(0);
  const questionStartedAt = useRef(0);
  const advanceTimer = useRef<number | null>(null);
  /** 本局是否已结算（防止自动翻页与手动交卷各提交一次）。 */
  const submitted = useRef(false);
  /** 已经向服务端换过多少道题的试听（窗口式加载）。 */
  const loadedCount = useRef(0);
  /** 正在请求中的窗口起点（防止并发重复请求）。 */
  const loadingFrom = useRef<number | null>(null);

  const questions = round?.questions ?? [];
  const total = questions.length;
  const question = questions[index];
  const picked = question ? answers[question.song.id]?.picked : undefined;
  const answeredCount = Object.values(answers).filter((value) => value?.picked !== undefined).length;
  const wrongCount = useMemo(() => {
    if (!round) return 0;
    return round.questions.reduce((sum, item) => {
      const answer = answers[item.song.id];
      return sum + (answer?.picked !== undefined && answer.picked !== item.answer ? 1 : 0);
    }, 0);
  }, [round, answers]);
  const hearts = SONG_DIFFICULTIES[round?.difficulty ?? difficulty].hearts;
  const progress = total === 0 ? 0 : (answeredCount / total) * 100;
  const currentPreview = question ? previews[question.song.id] : undefined;
  const resultCode = result && round ? resultCodeOf(round, answers, result.stats.duration) : '';
  const groupLabel = (id: SongGroupId) => labelOf(SONG_GROUP_LABELS[id], i18n.language);
  const franchiseLabel = (id: SongFranchiseId) => labelOf(SONG_FRANCHISE_LABELS[id], i18n.language);

  /** 拉一批试听地址（窗口式，失败时提示重试）。 */
  const loadPreviews = useCallback(async (target: SongQuizRound, from = 0) => {
    const ids = target.trackIds.slice(from, from + PREVIEW_WINDOW);
    if (ids.length === 0) return;
    if (from === 0) setPreviewState('loading');
    try {
      const response = await api.get('/song-quiz/previews', { params: { ids: ids.join(',') } });
      const items = (response.data?.items ?? []) as Preview[];
      setPreviews((current) => {
        const merged = { ...current };
        for (const item of items) merged[item.id] = item;
        return merged;
      });
      loadedCount.current = Math.max(loadedCount.current, from + ids.length);
      setPreviewState('ready');
    } catch {
      if (from > 0) return;
      setPreviews({});
      setPreviewState('failed');
    }
  }, []);

  const start = (targetGroup: SongGroupId, targetDifficulty: SongDifficulty, seed?: number) => {
    const next = createRound(targetGroup, seed ?? undefined, targetDifficulty);
    setRound(next);
    setAnswers({});
    setIndex(0);
    setResult(null);
    submitted.current = false;
    setCopyState('idle');
    setSubmitState(user ? 'idle' : 'guest');
    setMyRank(null);
    setElapsed(0);
    setPlaying(false);
    setRevealed(false);
    setScoreable(true);
    setPreviews({});
    loadedCount.current = 0;
    startedAt.current = Date.now();
    questionStartedAt.current = Date.now();
    setStage('quiz');
    void loadPreviews(next);
  };

  /** 换题时切换音源并尝试自动播放（用户点过开始，浏览器已允许带声播放）。 */
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (stage !== 'quiz' || !question) return;
    const preview = previews[question.song.id];
    const source = sourceOf(preview);
    audio.pause();
    audio.src = source;
    setElapsed(0);
    if (!source) {
      setPlaying(false);
      return;
    }
    void audio.play().catch(() => setPlaying(false));
    // 只在换题 / 试听就绪时切换音源。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question?.song.id, previews, stage]);

  /** 快答到窗口末尾时提前拉下一批试听。 */
  useEffect(() => {
    if (stage !== 'quiz' || !round) return;
    if (loadedCount.current >= round.trackIds.length) return;
    if (index + 3 < loadedCount.current) return;
    if (loadingFrom.current !== null) return;
    loadingFrom.current = loadedCount.current;
    void loadPreviews(round, loadedCount.current).finally(() => {
      loadingFrom.current = null;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, round, stage]);

  /** 离开页面时停掉声音并清掉待执行的翻页。 */
  useEffect(
    () => () => {
      audioRef.current?.pause();
      if (advanceTimer.current !== null) window.clearTimeout(advanceTimer.current);
    },
    [],
  );

  /** 音源兜底：转发失败退回 Apple 直链。 */
  const handleAudioError = () => {
    const audio = audioRef.current;
    const direct = question ? previews[question.song.id]?.previewUrl : undefined;
    setPlaying(false);
    if (!audio || !direct || audio.src === direct) return;
    audio.src = direct;
    void audio.play().catch(() => setPlaying(false));
  };

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio || !sourceOf(currentPreview)) return;
    if (audio.paused) void audio.play().catch(() => setPlaying(false));
    else {
      audio.pause();
      setPlaying(false);
    }
  };

  const restart = () => {
    const audio = audioRef.current;
    if (!audio || !sourceOf(currentPreview)) return;
    audio.currentTime = 0;
    void audio.play().catch(() => setPlaying(false));
  };

  /** 结算页复听某首歌。 */
  const playReview = (songId: number) => {
    const audio = audioRef.current;
    const source = sourceOf(previews[songId]);
    if (!audio || !source) return;
    audio.pause();
    audio.src = source;
    audio.currentTime = 0;
    setElapsed(0);
    void audio.play().catch(() => undefined);
  };

  const submit = useCallback(
    (finalAnswers?: SongAnswerMap) => {
      const currentRound = round;
      if (!currentRound) return;
      // 手动交卷时先取消掉排队中的自动翻页，否则同一局会被提交两次
      // （排行榜会多出一条重复成绩）。
      if (advanceTimer.current !== null) {
        window.clearTimeout(advanceTimer.current);
        advanceTimer.current = null;
      }
      if (submitted.current) return;
      submitted.current = true;
      const usedAnswers = finalAnswers ?? answers;
      audioRef.current?.pause();
      setPlaying(false);
      setResult(resultOf(currentRound, usedAnswers, Date.now() - startedAt.current));
      setStage('result');
    },
    [round, answers],
  );

  const nextQuestion = (finalAnswers: SongAnswerMap) => {
    if (index + 1 < total) {
      setIndex((current) => current + 1);
      setRevealed(false);
      questionStartedAt.current = Date.now();
      return;
    }
    submit(finalAnswers);
  };

  const select = (optionIndex: number) => {
    if (!question) return;
    if (hearts !== null && revealed) return;
    const nextAnswers: SongAnswerMap = {
      ...answers,
      [question.song.id]: { picked: optionIndex, elapsedMs: Date.now() - questionStartedAt.current },
    };
    setAnswers(nextAnswers);

    // 轻松 / 标准 / 硬核：选完自动翻页；关掉设置就等玩家点下一题。
    // 最后一题**不代为交卷**：定时器不排队，由玩家自己点「交卷」结算。
    if (hearts === null) {
      if (!autoAdvance || index + 1 >= total) return;
      if (advanceTimer.current !== null) window.clearTimeout(advanceTimer.current);
      advanceTimer.current = window.setTimeout(() => {
        advanceTimer.current = null;
        nextQuestion(nextAnswers);
      }, AUTO_ADVANCE_DELAY_MS);
      return;
    }

    // 专家模式：立刻亮出对错，扣红心。
    const correct = optionIndex === question.answer;
    setRevealed(true);
    if (advanceTimer.current !== null) window.clearTimeout(advanceTimer.current);
    const wrongNow = wrongCount + (correct ? 0 : 1);
    const usedUp = hearts !== null && wrongNow >= hearts;
    // 红心掉光就必须结算（游戏到此为止，与自动换题设置无关）。
    if (usedUp) {
      advanceTimer.current = window.setTimeout(() => {
        advanceTimer.current = null;
        submit(nextAnswers);
      }, REVEAL_DELAY + 500);
      return;
    }
    // 亮完对错后的自动翻页：末题同样不代为交卷（玩家点「交卷」）。
    if (!autoAdvance || index + 1 >= total) return;
    advanceTimer.current = window.setTimeout(() => {
      advanceTimer.current = null;
      nextQuestion(nextAnswers);
    }, REVEAL_DELAY);
  };

  const quit = () => {
    audioRef.current?.pause();
    if (advanceTimer.current !== null) window.clearTimeout(advanceTimer.current);
    advanceTimer.current = null;
    submitted.current = false;
    setPlaying(false);
    setStage('lobby');
    setRound(null);
    setResult(null);
  };

  const copyText = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopyState('done');
    } catch {
      setCopyState('failed');
    }
  };

  const gradeLabel = (grade: SongGrade) => t(`songQuiz.gradeLabels.${grade}`);
  const accuracyText = (value: number) => `${Math.round(value * 100)}%`;

  const copyResult = () => {
    if (!result || !round) return;
    const lines = [
      `${t('songQuiz.title')} · ${groupLabel(round.group)} · ${t(`songQuiz.difficulties.${round.difficulty}.name`)}`,
      `${t('songQuiz.result.scoreLabel')}：${result.stats.score}`,
      `${t('songQuiz.result.accuracyLabel')}：${accuracyText(result.stats.accuracy)}`,
      `${t('songQuiz.result.gradeLabel')}：${gradeLabel(result.grade)} · ${t(`songQuiz.grades.${result.grade}.title`)}`,
      resultCode ? `${t('songQuiz.result.codeLabel')}：${resultCode}` : '',
      `${window.location.origin}${SONG_QUIZ_HOME}`,
    ].filter(Boolean);
    void copyText(lines.join('\n'));
  };

  /** 生成竖版分享图（1080×1920 PNG，带二维码）。 */
  const openPoster = async () => {
    if (!result || !round) return;
    setPosterBusy(true);
    setPosterError('');
    const accuracy = accuracyText(result.stats.accuracy);
    const missedTitles = new Set(result.missed.map((item) => item.question.song.title));
    const hits = result.round.questions.filter((question) => !missedTitles.has(question.song.title));
    const perfect = result.stats.correct === result.stats.total && result.stats.total > 0;
    try {
      const canvas = await renderScorePoster({
        kicker: t('songQuiz.title'),
        grade: gradeLabel(result.grade),
        gradeTitle: t(`songQuiz.grades.${result.grade}.title`),
        scoreLabel: t('common.scoreLabel'),
        score: result.stats.score,
        subtitle: t(`songQuiz.difficulties.${result.round.difficulty}.name`),
        tags: [
          accuracy,
          `${result.stats.correct}/${result.stats.total}`,
          perfect ? t('songQuiz.poster.perfect') : t(`songQuiz.difficulties.${result.round.difficulty}.name`),
        ],
        progress: {
          label: t('songQuiz.result.accuracyLabel'),
          percent: Math.round(result.stats.accuracy * 100),
          note: accuracy,
        },
        highlights: hits.slice(0, 4).map((question) => ({
          title: question.song.title,
          note: question.song.artist,
        })),
        highlightsTitle: t('songQuiz.poster.hits'),
        stats: [
          {
            label: t('common.correctCount'),
            value: `${result.stats.correct} / ${result.stats.total}`,
          },
          { label: t('songQuiz.result.accuracyLabel'), value: accuracy },
          { label: t('songQuiz.result.avgLabel'), value: formatSeconds(result.stats.avgMs) },
          { label: t('songQuiz.result.fastestLabel'), value: formatSeconds(result.stats.fastestMs) },
        ],
        comment: t(`songQuiz.grades.${result.grade}.comment`, { accuracy }),
        site: t('common.siteName'),
        hint: t('common.shareImageHint'),
        qrCaption: t('common.qrCaption'),
        qrName: 'song-quiz',
      });
      posterCanvas.current = canvas;
      setPosterUrl(canvas.toDataURL('image/png'));
    } catch {
      setPosterError(t('common.shareImageFailed'));
    } finally {
      setPosterBusy(false);
    }
  };

  const savePoster = async () => {
    if (!posterCanvas.current) return;
    try {
      await downloadPoster(posterCanvas.current, posterFileName('song-quiz'));
    } catch {
      setPosterError(t('common.shareImageFailed'));
    }
  };

  const shareQq = () => {
    if (!result || !round) return;
    shareToQq({
      url: `${window.location.origin}${SONG_QUIZ_HOME}`,
      title: `${t('songQuiz.title')} · ${groupLabel(round.group)}`,
      summary: [
        `${t('songQuiz.result.scoreLabel')}：${result.stats.score}`,
        `${t('songQuiz.result.gradeLabel')}：${gradeLabel(result.grade)}`,
        resultCode,
      ]
        .filter(Boolean)
        .join('｜'),
      site: t('common.siteName'),
    });
  };

  /** 提交成绩到全站排行榜（仅登录用户上榜）。 */
  const submitScore = useCallback(
    async (target: SongQuizResult) => {
      if (!user) {
        setSubmitState('guest');
        return;
      }
      setSubmitState('sending');
      try {
        const response = await api.post('/song-quiz/scores', {
          difficulty: target.round.difficulty,
          groupId: target.round.group,
          score: target.stats.score,
          correct: target.stats.correct,
          total: target.stats.total,
          answered: target.stats.answered,
          durationMs: Math.round(target.stats.duration),
          avgMs: target.stats.avgMs,
          fastestMs: target.stats.fastestMs,
          heartsLeft: target.stats.heartsLeft,
          code: resultCodeOf(target.round, answers, target.stats.duration),
        });
        setMyRank(typeof response.data?.rank === 'number' ? response.data.rank : null);
        setSubmitState('done');
      } catch {
        setSubmitState('failed');
      }
    },
    [user, answers],
  );

  // 结算后自动上报一次（查成绩码还原的局不算）。
  useEffect(() => {
    if (stage !== 'result' || !result || !scoreable) return;
    void submitScore(result);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, result, scoreable]);

  const lookup = () => {
    const code = queryCode.trim();
    if (!code) return;
    const decoded = decodeSongQuizCode(code);
    if (!decoded) {
      setQueryError(t('songQuiz.query.invalid'));
      return;
    }
    setQueryError('');
    const next = createRound(decoded.group, decoded.seed, decoded.difficulty);
    const restored: SongAnswerMap = {};
    next.questions.forEach((item, itemIndex) => {
      const value = decoded.answers[itemIndex];
      if (value === undefined) return;
      restored[item.song.id] = { picked: value, elapsedMs: undefined };
    });
    setGroup(decoded.group);
    setFranchise(SONG_GROUP_FRANCHISE[decoded.group]);
    setDifficulty(decoded.difficulty);
    setRound(next);
    setAnswers(restored);
    setResult(resultOf(next, restored, decoded.duration));
    setIndex(0);
    setCopyState('idle');
    setSubmitState('idle');
    setScoreable(false);
    setPreviews({});
    loadedCount.current = 0;
    setStage('result');
    void loadPreviews(next);
  };

  const visibleGroups = SONG_FRANCHISES[franchise].groups;
  const currentGroupCount = songsOfGroup(group).length;
  const attemptTotal = result?.stats.total ?? 0;
  const attemptedQuestions = round ? round.questions.slice(0, attemptTotal) : [];

  return (
    <Page
      title={t('songQuiz.title')}
      icon={<Music size={17} />}
      homeTo={SITE_HOME}
      className="song-quiz-page"
    >
      <audio
        ref={audioRef}
        preload="auto"
        onPlaying={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onError={handleAudioError}
        onTimeUpdate={(event) => setElapsed(event.currentTarget.currentTime)}
      />

      {stage === 'lobby' && (
        <>
          {/* 标题区沿用站点统一的 hero（和声优猜首页同一套类名与配色） */}
          <div className="home-hero sg-hero">
            <span className="hero-kicker">SONG QUIZ · ANISONG</span>
            <h1>{t('songQuiz.title')}</h1>
            <p className="hero-subtitle">{t('songQuiz.subtitle')}</p>
            <SongQuizRules />
            {initialized && !user && <p className="muted sg-hero-hint">{t('songQuiz.guestHint')}</p>}
          </div>

          <div className="card sg-intro">
            <div className="sg-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'single'}
              className={`sg-tab${tab === 'single' ? ' is-active' : ''}`}
              onClick={() => setTab('single')}
            >
              <Music size={15} />
              {t('songQuiz.tabs.single')}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'multi'}
              className={`sg-tab${tab === 'multi' ? ' is-active' : ''}`}
              onClick={() => setTab('multi')}
            >
              <Globe size={15} />
              {t('songQuiz.tabs.multi')}
            </button>
          </div>

          {tab === 'multi' ? (
            <SongQuizMulti group={group} difficulty={difficulty} />
          ) : (
            <>
              <fieldset className="sg-difficulty">
                <legend>{t('songQuiz.difficultyLabel')}</legend>
                <div className="sg-difficulty-grid">
                  {SONG_DIFFICULTY_ORDER.map((item) => {
                    const config = SONG_DIFFICULTIES[item];
                    return (
                      <button
                        key={item}
                        type="button"
                        className={`sg-diff sg-diff-${item}${difficulty === item ? ' is-active' : ''}`}
                        aria-pressed={difficulty === item}
                        onClick={() => setDifficulty(item)}
                      >
                        <span className="sg-diff-name">{t(`songQuiz.difficulties.${item}.name`)}</span>
                        <span className="sg-diff-meta">
                          {config.count === null
                            ? t('songQuiz.difficulties.expert.pool')
                            : t('songQuiz.difficulties.count', { count: config.count })}
                          {config.hearts !== null
                            ? ` · ${t('songQuiz.difficulties.hearts', { count: config.hearts })}`
                            : ''}
                        </span>
                        <span className="sg-diff-desc">{t(`songQuiz.difficulties.${item}.desc`)}</span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              <fieldset className="sg-franchise">
                <legend>{t('songQuiz.franchiseLabel')}</legend>
                <div className="sg-chips" role="group" aria-label={t('songQuiz.franchiseLabel')}>
                  {SONG_FRANCHISE_IDS.map((id) => (
                    <button
                      key={id}
                      type="button"
                      className={`sg-chip${franchise === id ? ' is-active' : ''}`}
                      style={{ ['--sg-color' as string]: SONG_FRANCHISES[id].color }}
                      aria-pressed={franchise === id}
                      onClick={() => {
                        setFranchise(id);
                        const first = SONG_FRANCHISES[id].groups[0];
                        if (first) setGroup(first);
                      }}
                    >
                      {franchiseLabel(id)}
                    </button>
                  ))}
                </div>
              </fieldset>

              <fieldset className="sg-groups">
                <legend>{t('songQuiz.groupLabel')}</legend>
                <div className="sg-group-grid">
                  {visibleGroups.map((id) => (
                    <button
                      key={id}
                      type="button"
                      className={`sg-group${group === id ? ' is-active' : ''}`}
                      style={{ ['--sg-color' as string]: SONG_FRANCHISES[franchise].color }}
                      aria-pressed={group === id}
                      onClick={() => setGroup(id)}
                    >
                      <span className="sg-group-name">{groupLabel(id)}</span>
                      <span className="sg-group-count">
                        {t('songQuiz.songsCount', { count: songsOfGroup(id).length })}
                      </span>
                    </button>
                  ))}
                </div>
              </fieldset>

              <div className="sg-start-row">
                <div
                  className="sg-start-pick"
                  style={{ ['--sg-color' as string]: SONG_FRANCHISES[franchise].color }}
                >
                  <span className="sg-start-label">{franchiseLabel(franchise)}</span>
                  <span className="sg-start-group">
                    {groupLabel(group)}
                    <span className="sg-start-count">
                      {' · '}
                      {t('songQuiz.songsCount', { count: currentGroupCount })}
                    </span>
                  </span>
                </div>
                <button
                  type="button"
                  className="btn sg-start"
                  disabled={currentGroupCount < OPTION_COUNT}
                  onClick={() => start(group, difficulty)}
                >
                  <Play size={16} />
                  {t('songQuiz.start')}
                </button>
              </div>

              <section className="sg-query">
                <h3>{t('songQuiz.query.title')}</h3>
                <p className="muted">{t('songQuiz.query.hint')}</p>
                <div className="sg-query-row">
                  <input
                    type="text"
                    value={queryCode}
                    placeholder={t('songQuiz.query.placeholder')}
                    aria-label={t('songQuiz.query.title')}
                    onChange={(event) => {
                      setQueryCode(event.target.value);
                      setQueryError('');
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') lookup();
                    }}
                  />
                  <button type="button" className="btn" onClick={lookup}>
                    <Search size={15} />
                    {t('songQuiz.query.submit')}
                  </button>
                </div>
                {queryError && <p className="sg-failed">{queryError}</p>}
              </section>

              <SongQuizLeaderboard initialDifficulty={difficulty} />
            </>
          )}
          </div>
        </>
      )}

      {stage === 'quiz' && round && question && (
        <div className="card sg-quiz">
          <div className="sg-quiz-head">
            <span className="sg-quiz-group" style={{ ['--sg-color' as string]: SONG_FRANCHISES[SONG_GROUP_FRANCHISE[round.group]].color }}>
              {groupLabel(round.group)}
            </span>
            <span className="sg-quiz-mode">{t(`songQuiz.difficulties.${round.difficulty}.name`)}</span>
            {hearts !== null && (
              <span className="sg-hearts" aria-label={t('songQuiz.heartsLeft', { count: hearts - wrongCount })}>
                {Array.from({ length: hearts }).map((_, heartIndex) => (
                  <Heart
                    key={heartIndex}
                    size={16}
                    className={heartIndex < hearts - wrongCount ? 'is-alive' : 'is-lost'}
                    aria-hidden="true"
                  />
                ))}
              </span>
            )}
            <button type="button" className="btn btn-ghost btn-sm" onClick={quit}>
              {t('songQuiz.quit')}
            </button>
          </div>

          <div className="sg-progress">
            <span className="sg-progress-text">{t('songQuiz.progress', { current: index + 1, total })}</span>
            <span className="sg-progress-meta">{t('songQuiz.answered', { count: answeredCount })}</span>
            <span
              className="sg-progress-track"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={total}
              aria-valuenow={answeredCount}
            >
              <span className="sg-progress-fill" style={{ width: `${progress}%` }} />
            </span>
          </div>

          <div className="sg-player">
            {previewState === 'loading' && <p className="muted sg-player-note">{t('songQuiz.loading')}</p>}
            {previewState === 'failed' && (
              <p className="sg-failed sg-player-note">
                {t('songQuiz.loadFailed')}
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => loadPreviews(round)}>
                  <RotateCcw size={14} />
                  {t('songQuiz.retry')}
                </button>
              </p>
            )}
            {previewState === 'ready' && !currentPreview && (
              <p className="muted sg-player-note">{t('songQuiz.previewUnavailable')}</p>
            )}
            <div className="sg-player-row">
              <button
                type="button"
                className="sg-play"
                aria-label={playing ? t('songQuiz.pause') : t('songQuiz.play')}
                disabled={!sourceOf(currentPreview)}
                onClick={togglePlay}
              >
                {playing ? <Pause size={22} /> : <Play size={22} />}
              </button>
              <span className="sg-player-track">
                <span
                  className="sg-player-elapsed"
                  style={{ width: `${Math.min(100, (elapsed / PREVIEW_SECONDS) * 100)}%` }}
                />
              </span>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={!sourceOf(currentPreview)}
                onClick={restart}
              >
                <RotateCcw size={14} />
                {t('songQuiz.replay')}
              </button>
            </div>
          </div>

          <div className="sg-options" key={`options-${question.song.id}`}>
            {question.options.map((option, optionIndex) => {
              const isPicked = picked === optionIndex;
              const showAnswer = hearts !== null && revealed;
              const isAnswer = optionIndex === question.answer;
              const className = [
                'sg-option',
                isPicked ? 'is-selected' : '',
                showAnswer && isAnswer ? 'is-correct' : '',
                showAnswer && isPicked && !isAnswer ? 'is-wrong' : '',
              ]
                .filter(Boolean)
                .join(' ');
              return (
                <button
                  key={`${question.song.id}-${optionIndex}`}
                  type="button"
                  className={className}
                  aria-pressed={isPicked}
                  disabled={showAnswer}
                  onClick={() => select(optionIndex)}
                >
                  <span className="sg-option-letter" aria-hidden="true">
                    {OPTION_LETTERS[optionIndex] ?? optionIndex + 1}
                  </span>
                  <span className="sg-option-text">{option}</span>
                </button>
              );
            })}
          </div>

          {hearts !== null && revealed && (
            <p className={picked === question.answer ? 'sg-flash-ok' : 'sg-flash-no'}>
              {picked === question.answer
                ? t('songQuiz.expert.right')
                : t('songQuiz.expert.wrong', {
                    answer: question.song.title,
                    artist: question.song.artist,
                  })}
            </p>
          )}

          <div className="sg-actions">
            <button
              type="button"
              className="btn btn-ghost"
              disabled={index === 0 || (revealed && autoAdvance && index + 1 < total)}
              onClick={() => {
                setIndex((current) => Math.max(0, current - 1));
                questionStartedAt.current = Date.now();
              }}
            >
              <ArrowLeft size={15} />
              {t('songQuiz.prev')}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              disabled={index + 1 >= total || (revealed && autoAdvance)}
              onClick={() => nextQuestion(answers)}
            >
              {t('songQuiz.next')}
              <ArrowRight size={15} />
            </button>
            <button type="button" className="btn sg-submit" onClick={() => submit()}>
              <Check size={15} />
              {t('songQuiz.submit')}
            </button>
          </div>
          {total - answeredCount > 0 && (
            <p className="muted sg-skip-note">{t('songQuiz.skippedNote', { count: total - answeredCount })}</p>
          )}
        </div>
      )}

      {stage === 'result' && result && round && (
        <div className="card sg-result">
          <div className="sg-result-head" data-grade={result.grade}>
            <span className="sg-result-copy">
              <span className="sg-result-title">
                {`${groupLabel(round.group)} · ${t(`songQuiz.difficulties.${round.difficulty}.name`)}`}
              </span>
              <span className="sg-result-score">{result.stats.score}</span>
              <span className="sg-result-meta">
                {`${t('songQuiz.result.correctLabel', {
                  correct: result.stats.correct,
                  total: result.stats.total,
                })} · ${t('songQuiz.result.durationLabel')} ${formatDuration(result.stats.duration)}`}
              </span>
            </span>
            <span className="sg-grade">
              <span className="sg-grade-letter">{gradeLabel(result.grade)}</span>
              <span className="sg-grade-title">{t(`songQuiz.grades.${result.grade}.title`)}</span>
            </span>
          </div>

          <p className="sg-comment">
            {t(`songQuiz.grades.${result.grade}.comment`, {
              accuracy: accuracyText(result.stats.accuracy),
            })}
          </p>

          <ul className="sg-stat-row">
            <li>
              <span className="sg-stat-label">{t('songQuiz.result.accuracyLabel')}</span>
              <span className="sg-stat-value">{accuracyText(result.stats.accuracy)}</span>
            </li>
            <li>
              <span className="sg-stat-label">{t('songQuiz.result.avgLabel')}</span>
              <span className="sg-stat-value">{formatSeconds(result.stats.avgMs)}</span>
            </li>
            <li>
              <span className="sg-stat-label">{t('songQuiz.result.fastestLabel')}</span>
              <span className="sg-stat-value">{formatSeconds(result.stats.fastestMs)}</span>
            </li>
            {result.stats.heartsLeft !== null && (
              <li>
                <span className="sg-stat-label">{t('songQuiz.result.heartsLabel')}</span>
                <span className="sg-stat-value">
                  {`${result.stats.heartsLeft} / ${result.stats.hearts}`}
                </span>
              </li>
            )}
          </ul>

          <p className="sg-rank">
            {submitState === 'sending' && t('songQuiz.rank.sending')}
            {submitState === 'done' &&
              (myRank
                ? t('songQuiz.rank.submitted', { rank: myRank })
                : t('songQuiz.rank.submittedNoRank'))}
            {submitState === 'failed' && t('songQuiz.rank.failed')}
            {submitState === 'guest' && t('songQuiz.rank.guest')}
          </p>

          <section className="sg-review">
            <h3>{t('songQuiz.result.review')}</h3>
            <ol>
              {attemptedQuestions.map((item, itemIndex) => {
                const chosen = answers[item.song.id]?.picked;
                const correct = chosen === item.answer;
                const preview = previews[item.song.id];
                return (
                  <li key={item.song.id} className={correct ? 'is-correct' : 'is-wrong'}>
                    <span className="sg-review-slot">{itemIndex + 1}</span>
                    <span className="sg-review-art">
                      {preview?.artworkUrl ? (
                        <img src={preview.artworkUrl} alt="" loading="lazy" decoding="async" />
                      ) : (
                        <span className="sg-review-art-fallback" aria-hidden="true">
                          <Disc3 size={18} />
                        </span>
                      )}
                    </span>
                    <span className="sg-review-body">
                      <span className="sg-review-title">
                        <span className={correct ? 'sg-mark-ok' : 'sg-mark-no'} aria-hidden="true">
                          {correct ? '✓' : '✕'}
                        </span>
                        {item.song.title}
                      </span>
                      <span className="sg-review-artist">{item.song.artist}</span>
                      <span className="sg-review-album">
                        {`${item.song.album} · ${item.song.releaseDate.slice(0, 4)}`}
                      </span>
                      {!correct && (
                        <span className="sg-review-pick">
                          {`${t('songQuiz.result.yourAnswer')}：${
                            chosen === undefined ? t('songQuiz.result.unanswered') : item.options[chosen]
                          }`}
                        </span>
                      )}
                    </span>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm sg-review-play"
                      aria-label={t('songQuiz.play')}
                      disabled={!sourceOf(preview)}
                      onClick={() => playReview(item.song.id)}
                    >
                      <Play size={14} />
                    </button>
                  </li>
                );
              })}
            </ol>
          </section>

          <section className="sg-code">
            <h3>{t('songQuiz.result.codeLabel')}</h3>
            <p className="muted">{t('songQuiz.result.codeHint')}</p>
            <div className="sg-code-row">
              <code>{resultCode}</code>
              <button type="button" className="btn" onClick={copyResult}>
                <Copy size={15} />
                {t('songQuiz.result.copy')}
              </button>
            </div>
            {copyState !== 'idle' && (
              <p className={copyState === 'done' ? 'sg-copied' : 'sg-failed'}>
                {copyState === 'done' ? t('songQuiz.result.copyDone') : t('songQuiz.result.copyFailed')}
              </p>
            )}
          </section>

          <div className="sg-actions">
            <button
              type="button"
              className="btn sg-share-img"
              onClick={openPoster}
              disabled={posterBusy}
            >
              <Download size={15} />
              {posterBusy ? t('common.shareImageBuilding') : t('common.shareImage')}
            </button>
            <button type="button" className="btn sg-share-qq" onClick={shareQq}>
              <MessageCircle size={15} />
              {t('common.shareToQq')}
            </button>
            <button type="button" className="btn" onClick={() => start(round.group, round.difficulty)}>
              <RotateCcw size={15} />
              {t('songQuiz.result.retry')}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => start(round.group, round.difficulty, round.seed)}>
              <RotateCcw size={15} />
              {t('songQuiz.result.retrySame')}
            </button>
            <button type="button" className="btn btn-ghost" onClick={quit}>
              <Users size={15} />
              {t('songQuiz.result.change')}
            </button>
          </div>
          <p className="muted sg-share-hint">{t('common.shareHint')}</p>
          {posterError && <p className="sg-failed">{posterError}</p>}

          <section className="sg-board-wrap">
            <SongQuizLeaderboard initialDifficulty={round.difficulty} />
          </section>
        </div>
      )}

      {posterUrl && (
        <ModalPortal>
          <div
            className="sg-poster-backdrop"
            role="dialog"
            aria-modal="true"
            aria-label={t('common.shareImageLabel')}
          >
            <div className="sg-poster-panel">
              <button
                type="button"
                className="sg-poster-close"
                onClick={() => setPosterUrl('')}
                aria-label={t('common.close')}
              >
                <X size={18} />
              </button>
              <img className="sg-poster-image" src={posterUrl} alt={t('common.shareImageLabel')} />
              <p className="muted sg-poster-hint">{t('common.shareImageSaveHint')}</p>
              <div className="sg-actions">
                <button type="button" className="btn btn-primary" onClick={savePoster}>
                  <Download size={15} />
                  {t('common.shareImageDownload')}
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setPosterUrl('')}>
                  {t('common.close')}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </Page>
  );
}
