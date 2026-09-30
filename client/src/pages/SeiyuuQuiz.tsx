import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ClipboardList,
  Copy,
  Download,
  MessageCircle,
  RotateCcw,
  Search,
  SkipForward,
  Users,
  X,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Page from '../components/Page';
import QuizSubmissionForm from '../components/QuizSubmissionForm';
import { api } from '../api/client';
import { SEIYUU_QUIZ_HOME, SITE_HOME } from '../config/routes';
import {
  LEVEL_IDS,
  OPTION_LETTERS,
  QUIZ_ENTRIES,
  QUIZ_MODES,
  QUIZ_MODE_ORDER,
  QUIZ_ENTRIES_BY_GROUP,
  createRound,
  decodeQuizRound,
  emptyAnswers,
  formatDuration,
  questionText,
  registerCommunityQuestions,
  resultCodeOf,
  resultOf,
  type Grade,
  type QuizEntry,
  type QuizMode,
  type QuizResult,
  type QuizRound,
  type QuizGroupId,
} from '../config/seiyuuQuiz';
import { shareToQq } from '../utils/share';
import ModalPortal from '../components/ModalPortal';
import { downloadPoster, posterFileName, renderScorePoster } from '../utils/poster';
import { AUTO_ADVANCE_DELAY_MS, useAutoAdvance } from '../store/quizFlow';

type Stage = 'select' | 'quiz' | 'result';
type CopyState = 'idle' | 'done' | 'failed';

/** 选中一题后停留多久再翻页，让用户看清自己点了哪一项（时长见 store/quizFlow）。 */

/** 公式照：加载失败时退化成首字方块（与「你是哪个声优」一致）。 */
function Photo({ entry, className }: { entry: QuizEntry; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <span className={className ?? 'sq-photo-fallback'} aria-hidden="true">
        {entry.identity.name.slice(0, 1)}
      </span>
    );
  }
  return (
    <img
      className={className}
      src={entry.photo}
      alt={entry.identity.name}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}

/**
 * 声优问答：先搜出要考的声优，再从 TA 的个人题库答题，最后按得分给等级与评语。
 * 题库与计分见 config/seiyuuQuiz/，文案见 i18n 的 seiyuuQuiz.*。
 */
export default function SeiyuuQuiz() {
  const { t, i18n } = useTranslation();
  const [stage, setStage] = useState<Stage>('select');
  const [mode, setMode] = useState<QuizMode>('fast');
  const [entry, setEntry] = useState<QuizEntry | null>(null);
  const [round, setRound] = useState<QuizRound | null>(null);
  const [answers, setAnswers] = useState<Record<string, number | undefined>>({});
  const [index, setIndex] = useState(0);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [keyword, setKeyword] = useState('');
  /** 当前选的企划分组（`all` = 全部平铺）。 */
  const [activeGroup, setActiveGroup] = useState<QuizGroupId | 'all'>('all');
  const [queryCode, setQueryCode] = useState('');
  const [queryError, setQueryError] = useState('');
  const [copyState, setCopyState] = useState<CopyState>('idle');
  const [posterUrl, setPosterUrl] = useState('');
  const [posterBusy, setPosterBusy] = useState(false);
  const [posterError, setPosterError] = useState('');
  const posterCanvas = useRef<HTMLCanvasElement | null>(null);
  /** 玩家投稿合并进题库后自增，用来触发一次重渲染（卡片上的题数会跟着变）。 */
  const [, setCommunityVersion] = useState(0);
  /** 「选完自动换题」：默认开，可在个人设置里关。 */
  const autoAdvance = useAutoAdvance();
  const startedAt = useRef(0);
  const timer = useRef<number | null>(null);

  /* 页面挂载时拉一次玩家投稿（已审核通过）并合并进题库；失败不影响静态题库。 */
  useEffect(() => {
    let disposed = false;
    void api
      .get('/seiyuu-quiz/community')
      .then((response) => {
        if (disposed) return;
        const added = registerCommunityQuestions(response.data?.items ?? []);
        if (added > 0) setCommunityVersion((value) => value + 1);
      })
      .catch(() => undefined);
    return () => {
      disposed = true;
    };
  }, []);

  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    [],
  );

  /** 题目文案按当前语言取，未翻译的条目回退中文。 */
  const language = i18n.language;
  const questions = round?.questions ?? [];
  const total = questions.length;
  const question = questions[index];
  const text = question ? questionText(question, language) : null;
  const picked = question ? answers[question.id] : undefined;
  const answeredCount = Object.values(answers).filter((value) => value !== undefined).length;
  const unanswered = total - answeredCount;
  const progress = total === 0 ? 0 : (answeredCount / total) * 100;
  const resultCode = result && round ? resultCodeOf(round, answers, result.stats.duration) : '';

  const filtered = useMemo(() => {
    const needle = keyword.trim().toLowerCase();
    // 彩蛋人物默认藏起来：只有搜索（例如输 6657）才会露头
    if (!needle) return QUIZ_ENTRIES.filter((item) => !item.easterEgg);
    return QUIZ_ENTRIES.filter((item) =>
      [item.identity.name, item.identity.nameJa, item.identity.romaji, item.identity.id, item.character]
        .join(' ')
        .toLowerCase()
        .includes(needle),
    );
  }, [keyword]);

  /** 把筛完的结果按企划分组（组内保持名册顺序），分组为空就不显示。 */
  const grouped = useMemo(() => {
    const visible = new Set(filtered);
    return QUIZ_ENTRIES_BY_GROUP.map((group) => ({
      id: group.id,
      entries: group.entries.filter((item) => visible.has(item)),
    })).filter((group) => group.entries.length > 0);
  }, [filtered]);

  /** 当前选中的企划分组（`all` = 全部平铺）。 */
  const visible = useMemo(() => {
    if (activeGroup === 'all') return filtered;
    return grouped.find((group) => group.id === activeGroup)?.entries ?? [];
  }, [activeGroup, filtered, grouped]);

  const modeName = (item: QuizMode) => {
    const pick = QUIZ_MODES[item].pick;
    return pick === null
      ? t('seiyuuQuiz.modes.full.name')
      : t(`seiyuuQuiz.modes.${item}.name`, { count: pick });
  };

  const start = (target: QuizEntry) => {
    const next = createRound(target.bank, undefined, mode);
    setEntry(target);
    setRound(next);
    setAnswers(emptyAnswers(next));
    setIndex(0);
    setResult(null);
    setCopyState('idle');
    startedAt.current = Date.now();
    setStage('quiz');
  };

  const select = (optionIndex: number) => {
    if (!question) return;
    setAnswers((current) => ({ ...current, [question.id]: optionIndex }));
    // 「选完自动换题」关掉后完全不接管：由玩家自己点下一题 / 交卷。
    if (autoAdvance && index + 1 < total) {
      timer.current = window.setTimeout(
        () => setIndex((current) => Math.min(current + 1, total - 1)),
        AUTO_ADVANCE_DELAY_MS,
      );
    }
  };

  const submit = () => {
    if (!round || !entry) return;
    const duration = Date.now() - startedAt.current;
    setResult(resultOf(round, answers, duration));
    setStage('result');
  };

  const quit = () => {
    setStage('select');
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

  const copyResult = () => {
    if (!result || !entry || !round) return;
    const lines = [
      `${t('seiyuuQuiz.title')} · ${entry.identity.name}`,
      `${t('seiyuuQuiz.result.scoreLabel')}：${formatScore(result.stats.score)} / ${formatScore(
        result.stats.maxScore,
      )}`,
      `${t('seiyuuQuiz.result.accuracyLabel')}：${accuracyText(result.stats.accuracy)}`,
      `${t('seiyuuQuiz.result.gradeLabel')}：${gradeLabel(result.grade)} · ${t(
        `seiyuuQuiz.grades.${result.grade}.title`,
      )}`,
      resultCode ? `${t('seiyuuQuiz.result.codeLabel')}：${resultCode}` : '',
      `${window.location.origin}${SITE_HOME}`,
    ].filter(Boolean);
    void copyText(lines.join('\n'));
  };

  /** 分享到 QQ：得分 / 等级 / 成绩码，卡片带 TA 的公式照，手机端直接唤起 QQ。 */
  /** 生成竖版分享图（1080×1920 PNG，带二维码）。 */
  const openPoster = async () => {
    if (!result || !entry) return;
    setPosterBusy(true);
    setPosterError('');
    try {
      const accuracy = accuracyText(result.stats.accuracy);
      const missedIds = new Set(result.missed.map((item) => item.question.id));
      const hits = (round?.questions ?? []).filter((question) => !missedIds.has(question.id));
      const canvas = await renderScorePoster({
        kicker: `${entry.identity.name} · ${t('seiyuuQuiz.title')}`,
        grade: gradeLabel(result.grade),
        gradeTitle: t(`seiyuuQuiz.grades.${result.grade}.title`),
        scoreLabel: t('common.scoreLabel'),
        score: result.stats.score,
        tags: [accuracy, `${result.stats.correct}/${result.stats.total}`],
        progress: {
          label: t('seiyuuQuiz.result.accuracyLabel'),
          percent: Math.round(result.stats.accuracy * 100),
          note: accuracy,
        },
        highlights: hits.slice(0, 4).map((question) => ({
          title: question.prompt,
          note: question.explain,
        })),
        highlightsTitle: t('seiyuuQuiz.result.hitsTitle'),
        stats: [
          {
            label: t('common.correctCount'),
            value: `${result.stats.correct} / ${result.stats.total}`,
          },
          { label: t('seiyuuQuiz.result.accuracyLabel'), value: accuracy },
          { label: t('seiyuuQuiz.result.durationLabel'), value: formatDuration(result.stats.duration) },
        ],
        comment: t(`seiyuuQuiz.grades.${result.grade}.comment`, { name: entry.identity.name }),
        site: t('common.siteName'),
        hint: t('common.shareImageHint'),
        qrCaption: t('common.qrCaption'),
        qrName: 'seiyuu-quiz',
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
      await downloadPoster(posterCanvas.current, posterFileName('seiyuu-quiz'));
    } catch {
      setPosterError(t('common.shareImageFailed'));
    }
  };

  const shareQq = () => {
    if (!result || !entry || !round) return;
    shareToQq({
      url: `${window.location.origin}${SEIYUU_QUIZ_HOME}`,
      title: `${t('seiyuuQuiz.title')} · ${entry.identity.name}`,
      summary: [
        `${t('seiyuuQuiz.result.scoreLabel')}：${formatScore(result.stats.score)} / ${formatScore(
          result.stats.maxScore,
        )}`,
        `${t('seiyuuQuiz.result.gradeLabel')}：${gradeLabel(result.grade)}`,
        resultCode,
      ]
        .filter(Boolean)
        .join('｜'),
      pic: new URL(entry.photo, window.location.origin).href,
      site: t('common.siteName'),
    });
  };

  const lookup = () => {
    const code = queryCode.trim();
    if (!code) return;
    const decoded = decodeQuizRound(code);
    if (!decoded) {
      setQueryError(t('seiyuuQuiz.query.invalid'));
      return;
    }
    setQueryError('');
    setEntry(decoded.entry);
    setRound(decoded.round);
    setAnswers(decoded.answers);
    setResult(resultOf(decoded.round, decoded.answers, decoded.duration));
    setIndex(0);
    setCopyState('idle');
    setStage('result');
  };

  const gradeLabel = (grade: Grade) => t(`seiyuuQuiz.gradeLabels.${grade}`);
  const accuracyText = (value: number) => `${Math.round(value * 100)}%`;
  /** 权重带 0.5，展示时去掉无意义的小数。 */
  const formatScore = (value: number) => (Number.isInteger(value) ? String(value) : value.toFixed(1));

  return (
    <Page
      title={t('seiyuuQuiz.title')}
      icon={<ClipboardList size={17} />}
      homeTo={SITE_HOME}
      className="seiyuu-quiz-page"
    >
      {stage === 'select' && (
        <div className="card sq-intro">
          <p className="sq-subtitle">{t('seiyuuQuiz.subtitle')}</p>
          <p className="muted">{t('seiyuuQuiz.intro')}</p>
          <p className="muted">{t('seiyuuQuiz.guide')}</p>

          <fieldset className="sq-modes">
            <legend>{t('seiyuuQuiz.modeLabel')}</legend>
            {QUIZ_MODE_ORDER.map((item) => (
              <button
                key={item}
                type="button"
                className={`sq-mode${mode === item ? ' is-active' : ''}`}
                aria-pressed={mode === item}
                onClick={() => setMode(item)}
              >
                <span className="sq-mode-name">{modeName(item)}</span>
                <span className="sq-mode-desc">{t(`seiyuuQuiz.modes.${item}.desc`)}</span>
                <span className="sq-mode-meta">{t(`seiyuuQuiz.modes.${item}.meta`)}</span>
              </button>
            ))}
          </fieldset>

          <div className="sq-search">
            <label htmlFor="sq-search-input">{t('seiyuuQuiz.searchLabel')}</label>
            <div className="sq-search-row">
              <Search size={15} aria-hidden="true" />
              <input
                id="sq-search-input"
                type="search"
                value={keyword}
                placeholder={t('seiyuuQuiz.searchPlaceholder')}
                onChange={(event) => setKeyword(event.target.value)}
              />
              {keyword && (
                <button
                  type="button"
                  className="sq-search-clear"
                  aria-label={t('common.close')}
                  onClick={() => setKeyword('')}
                >
                  <X size={14} />
                </button>
              )}
            </div>
            <p className="muted sq-count">
              {t('seiyuuQuiz.searchCount', { count: filtered.length, total: QUIZ_ENTRIES.length })}
            </p>
          </div>

          {filtered.length === 0 ? (
            <p className="muted sq-empty">{t('seiyuuQuiz.searchEmpty')}</p>
          ) : (
            <>
              <div className="sq-groups" role="group" aria-label={t('seiyuuQuiz.groupFilter')}>
                <button
                  type="button"
                  className={`sq-group-chip${activeGroup === 'all' ? ' is-active' : ''}`}
                  aria-pressed={activeGroup === 'all'}
                  onClick={() => setActiveGroup('all')}
                >
                  {t('seiyuuQuiz.groupAll')}
                  <span className="sq-group-chip-count">{filtered.length}</span>
                </button>
                {grouped.map((group) => (
                  <button
                    key={group.id}
                    type="button"
                    className={`sq-group-chip${activeGroup === group.id ? ' is-active' : ''}`}
                    aria-pressed={activeGroup === group.id}
                    onClick={() => setActiveGroup(group.id)}
                  >
                    {t(`seiyuuQuiz.groups.${group.id}`)}
                    <span className="sq-group-chip-count">{group.entries.length}</span>
                  </button>
                ))}
              </div>
              {visible.length === 0 ? (
                <p className="muted sq-empty">{t('seiyuuQuiz.searchEmpty')}</p>
              ) : (
                <ul className="sq-grid">
                  {visible.map((item) => (
                    <li key={item.bank.id} className="sq-card">
                      <button type="button" className="sq-card-btn" onClick={() => start(item)}>
                        <span className="sq-card-photo">
                          <Photo entry={item} />
                        </span>
                        <span className="sq-card-copy">
                          <span className="sq-card-name">{item.identity.name}</span>
                          <span className="sq-card-ja">{item.identity.nameJa}</span>
                          <span className="sq-card-char">{item.character}</span>
                          <span className="sq-card-meta">
                            {t('seiyuuQuiz.bankCount', { count: item.bank.questions.length })}
                            {item.bank.intro ? ` · ${item.bank.intro}` : ''}
                          </span>
                        </span>
                        <span className="sq-card-start">
                          {t('seiyuuQuiz.startLabel')}
                          <ArrowRight size={14} />
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}

          <section className="sq-query">
            <h3>{t('seiyuuQuiz.query.title')}</h3>
            <p className="muted">{t('seiyuuQuiz.query.hint')}</p>
            <div className="sq-query-row">
              <input
                type="text"
                value={queryCode}
                placeholder={t('seiyuuQuiz.query.placeholder')}
                aria-label={t('seiyuuQuiz.query.title')}
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
                {t('seiyuuQuiz.query.submit')}
              </button>
            </div>
            {queryError && <p className="sq-failed">{queryError}</p>}
          </section>
        </div>
      )}

      {stage === 'quiz' && entry && round && question && text && (
        <div className="card sq-quiz">
          <div className="sq-quiz-head">
            <span className="sq-quiz-photo">
              <Photo entry={entry} />
            </span>
            <span className="sq-quiz-who">
              <span className="sq-quiz-name">{entry.identity.name}</span>
              <span className="sq-quiz-char">{entry.character}</span>
            </span>
            <span className="sq-quiz-level">{t(`seiyuuQuiz.levels.${question.level}`)}</span>
            <button type="button" className="btn btn-ghost btn-sm" onClick={quit}>
              {t('seiyuuQuiz.quit')}
            </button>
          </div>

          <div className="sq-progress">
            <span className="sq-progress-text">{t('seiyuuQuiz.progress', { current: index + 1, total })}</span>
            <span className="sq-progress-meta">
              {`${modeName(round.mode)} · ${t('seiyuuQuiz.answered', { count: answeredCount })}`}
            </span>
            <span
              className="sq-progress-track"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={total}
              aria-valuenow={answeredCount}
            >
              <span className="sq-progress-fill" style={{ width: `${progress}%` }} />
            </span>
          </div>

          <p className="sq-question" key={question.id}>
            {text.prompt}
          </p>

          <div className="sq-options" key={`options-${question.id}`}>
            {text.options.map((option, optionIndex) => (
              <button
                key={`${question.id}-${optionIndex}`}
                type="button"
                className={`sq-option${picked === optionIndex ? ' is-selected' : ''}`}
                aria-pressed={picked === optionIndex}
                onClick={() => select(optionIndex)}
              >
                <span className="sq-option-letter" aria-hidden="true">
                  {OPTION_LETTERS[optionIndex] ?? optionIndex + 1}
                </span>
                <span className="sq-option-text">{option}</span>
              </button>
            ))}
          </div>

          <div className="sq-actions">
            <button
              type="button"
              className="btn btn-ghost"
              disabled={index === 0}
              onClick={() => setIndex((current) => Math.max(0, current - 1))}
            >
              <ArrowLeft size={15} />
              {t('seiyuuQuiz.prev')}
            </button>
            {index + 1 < total ? (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setIndex((current) => Math.min(total - 1, current + 1))}
              >
                {t('seiyuuQuiz.next')}
                <ArrowRight size={15} />
              </button>
            ) : (
              <button type="button" className="btn btn-ghost" onClick={() => setIndex(0)}>
                <SkipForward size={15} />
                {t('seiyuuQuiz.backToFirst')}
              </button>
            )}
            <button type="button" className="btn sq-submit" onClick={submit}>
              <Check size={15} />
              {t('seiyuuQuiz.submit')}
            </button>
          </div>
          {unanswered > 0 && <p className="muted sq-skip-note">{t('seiyuuQuiz.skippedNote', { count: unanswered })}</p>}
        </div>
      )}

      {stage === 'result' && entry && result && (
        <div className="card sq-result">
          <div className="sq-result-head" data-grade={result.grade}>
            <span className="sq-result-photo">
              <Photo entry={entry} />
            </span>
            <span className="sq-result-copy">
              <span className="sq-result-name">{entry.identity.name}</span>
              <span className="sq-result-char">{entry.character}</span>
              <span className="sq-result-score">
                {`${formatScore(result.stats.score)} / ${formatScore(result.stats.maxScore)}`}
              </span>
              <span className="sq-result-meta">
                {`${t('seiyuuQuiz.result.accuracyLabel')} ${accuracyText(result.stats.accuracy)} · ${t(
                  'seiyuuQuiz.result.correctLabel',
                  { correct: result.stats.correct, total: result.stats.total },
                )} · ${t('seiyuuQuiz.result.durationLabel')} ${formatDuration(result.stats.duration)}`}
              </span>
            </span>
            <span className="sq-grade">
              <span className="sq-grade-letter">{gradeLabel(result.grade)}</span>
              <span className="sq-grade-title">{t(`seiyuuQuiz.grades.${result.grade}.title`)}</span>
            </span>
          </div>

          <p className="sq-comment">
            {t(`seiyuuQuiz.grades.${result.grade}.comment`, { name: entry.identity.name })}
          </p>
          {result.stats.correct === result.stats.total && (
            <p className="sq-perfect">{t('seiyuuQuiz.result.perfect')}</p>
          )}

          <section className="sq-breakdown">
            <h3>{t('seiyuuQuiz.result.breakdown')}</h3>
            <ul>
              {LEVEL_IDS.map((level) => {
                const stat = result.stats.byLevel[level];
                return (
                  <li key={level}>
                    <span className={`sq-level-tag sq-level-${level}`}>{t(`seiyuuQuiz.levels.${level}`)}</span>
                    <span className="sq-level-bar">
                      <span
                        className="sq-level-fill"
                        style={{ width: `${stat.total === 0 ? 0 : (stat.correct / stat.total) * 100}%` }}
                      />
                    </span>
                    <span className="sq-level-text">{`${stat.correct} / ${stat.total}`}</span>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="sq-review">
            <h3>{t('seiyuuQuiz.result.review')}</h3>
            {result.missed.length === 0 ? (
              <p className="muted">{t('seiyuuQuiz.result.reviewEmpty')}</p>
            ) : (
              <ol>
                {result.missed.map(({ question: missed, picked: missedPick }) => {
                  const missedText = questionText(missed, language);
                  return (
                    <li key={missed.id}>
                      <p className="sq-review-prompt">
                        <span className={`sq-level-tag sq-level-${missed.level}`}>
                          {t(`seiyuuQuiz.levels.${missed.level}`)}
                        </span>
                        {missedText.prompt}
                      </p>
                      <p className="sq-review-answer">
                        <span className="sq-review-wrong">
                          {`${t('seiyuuQuiz.result.yourAnswer')}：${
                            missedPick === undefined
                              ? t('seiyuuQuiz.result.unanswered')
                              : `${OPTION_LETTERS[missedPick] ?? missedPick + 1}. ${
                                  missedText.options[missedPick] ?? ''
                                }`
                          }`}
                        </span>
                        <span className="sq-review-right">
                          {`${t('seiyuuQuiz.result.correctAnswer')}：${OPTION_LETTERS[missed.answer] ?? missed.answer + 1}. ${
                            missedText.options[missed.answer] ?? ''
                          }`}
                        </span>
                      </p>
                      <p className="sq-review-explain">{missedText.explain}</p>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>

          <section className="sq-code">
            <h3>{t('seiyuuQuiz.result.codeLabel')}</h3>
            <p className="muted">{t('seiyuuQuiz.result.codeHint')}</p>
            <div className="sq-code-row">
              <code>{resultCode}</code>
              <button type="button" className="btn" onClick={copyResult}>
                <Copy size={15} />
                {t('seiyuuQuiz.result.copy')}
              </button>
            </div>
            {copyState !== 'idle' && (
              <p className={copyState === 'done' ? 'sq-copied' : 'sq-failed'}>
                {copyState === 'done' ? t('seiyuuQuiz.result.copyDone') : t('seiyuuQuiz.result.copyFailed')}
              </p>
            )}
          </section>

          {/* 玩家投稿：提交后进管理员审核队列 */}
          <QuizSubmissionForm seiyuuId={entry.identity.id} seiyuuName={entry.identity.name} />

          <div className="sq-actions">
            <button
              type="button"
              className="btn sq-share-img"
              onClick={openPoster}
              disabled={posterBusy}
            >
              <Download size={15} />
              {posterBusy ? t('common.shareImageBuilding') : t('common.shareImage')}
            </button>
            <button type="button" className="btn sq-share-qq" onClick={shareQq}>
              <MessageCircle size={15} />
              {t('common.shareToQq')}
            </button>
            <button type="button" className="btn" onClick={() => start(entry)}>
              <RotateCcw size={15} />
              {t('seiyuuQuiz.result.retry')}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setStage('select')}>
              <Users size={15} />
              {t('seiyuuQuiz.result.change')}
            </button>
          </div>
          <p className="muted sq-share-hint">{t('common.shareHint')}</p>
          {posterError && <p className="muted sq-share-hint">{posterError}</p>}
        </div>
      )}

      {posterUrl && (
        <ModalPortal>
          <div
            className="sq-poster-backdrop"
            role="dialog"
            aria-modal="true"
            aria-label={t('common.shareImageLabel')}
          >
            <div className="sq-poster-panel">
              <button
                type="button"
                className="sq-poster-close"
                onClick={() => setPosterUrl('')}
                aria-label={t('common.close')}
              >
                <X size={18} />
              </button>
              <img className="sq-poster-image" src={posterUrl} alt={t('common.shareImageLabel')} />
              <p className="muted sq-poster-hint">{t('common.shareImageSaveHint')}</p>
              <div className="sq-actions">
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
