import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Copy,
  Download,
  Heart,
  MessageCircle,
  Printer,
  RotateCcw,
  Search,
  SkipForward,
  X,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { seiyuuPhotoPath } from '@seiyuu/shared';
import { Page } from '@seiyuu/game-sdk';
import { ModalPortal } from '@seiyuu/game-sdk';
import { SITE_HOME, WHO_YOU_ARE_HOME } from '@seiyuu/game-sdk';
import {
  EGGS,
  PROFILE_COUNT,
  PROFILES,
  PROJECT_IDS,
  QUIZ_MODES,
  SCALE,
  TRAIT_IDS,
  createQuiz,
  decodeWhoQuizCode,
  formatDuration,
  resultCodeOf,
  scoreWho,
  verdictOf,
  type MatchEntry,
  type ProjectId,
  type QuizMode,
  type ScaleId,
  type TraitId,
  type WhoQuizSet,
  type WhoResult,
} from './model/whoYouAre';
import { shareToQq } from '@seiyuu/game-sdk';
import { POSTER_COLORS, POSTER_CONTENT_WIDTH, POSTER_FONT, POSTER_PADDING, createPosterCanvas, downloadPoster, drawCoverImage, drawFittedText, drawPosterFooter, drawPosterHeader, loadPosterImage, paintBackdrop, posterFileName, qrImagePath, roundRectPath, waitForPosterFonts } from '@seiyuu/game-sdk';
import { AUTO_ADVANCE_DELAY_MS, useAutoAdvance } from '@seiyuu/game-sdk';

type Stage = 'intro' | 'quiz' | 'result';
type CopyState = 'idle' | 'done' | 'failed';

interface WhoPosterInput {
  kicker: string;
  name: string;
  romaji: string;
  score: number;
  verdict: string;
  similarity: string;
  traits: { name: string; coord: number; low: string; high: string }[];
  rankLabel: string;
  ranking: { name: string; score: number }[];
  /** 底部一行：模式 + 题量 + 用时。 */
  statLine: string;
  photoId: string;
  site: string;
  hint: string;
  qrCaption: string;
}

/**
 * 画「你是哪个声优」的竖版海报：她的大头照 + 相似度 + 六个维度坐标 + 前几名。
 *
 * 中间那块的高度是按可用空间反解的，页脚带二维码后变高也不会把排行榜挤出画布。
 */
async function renderWhoPoster(input: WhoPosterInput): Promise<HTMLCanvasElement> {
  await waitForPosterFonts();
  const { canvas, ctx } = createPosterCanvas();
  paintBackdrop(ctx);

  const top = drawPosterHeader(ctx, {
    kicker: input.kicker,
    title: input.name,
    subtitle: input.romaji,
  });
  const qrImage = await loadPosterImage(qrImagePath('who-you-are'));
  const bottom = drawPosterFooter(ctx, {
    site: input.site,
    hint: input.hint,
    qr: qrImage ? { image: qrImage, caption: input.qrCaption } : undefined,
  });

  const photo = await loadPosterImage(seiyuuPhotoPath(input.photoId));
  const pad = POSTER_PADDING;
  const width = POSTER_CONTENT_WIDTH;
  const centerX = pad + width / 2;

  /** 相似度大字那块（照片下面的 96 + 116）。 */
  const headBlock = 212;
  const statHeight = input.statLine ? 56 : 0;
  const available = bottom - statHeight - top - 20;
  const rankHeight = input.ranking.length * 44 + 44;
  const minTrait = 64;
  const needed = headBlock + input.traits.length * minTrait + 24 + rankHeight;
  // 位置不够就先缩头像：把头像写死 344 时，榜单长一点就会压到页脚上。
  const photoSize = Math.max(200, Math.min(344, available - needed));
  const traitHeight = Math.min(
    86,
    Math.max(
      minTrait,
      (available - photoSize - headBlock - 24 - rankHeight) / Math.max(1, input.traits.length),
    ),
  );
  const blockHeight = photoSize + headBlock + input.traits.length * traitHeight + 24 + rankHeight;
  let y = top + Math.max(0, (available - blockHeight) / 2);

  if (photo) {
    drawCoverImage(ctx, photo, centerX - photoSize / 2, y, photoSize, photoSize, {
      radius: 'circle',
      ring: { color: POSTER_COLORS.accent, width: 6 },
      align: 'top',
    });
  }
  y += photoSize + 96;

  drawFittedText(ctx, `${input.score}%`, centerX, y, 96, 900, width, POSTER_COLORS.accent);
  drawFittedText(
    ctx,
    `${input.verdict} · ${input.similarity}`,
    centerX,
    y + 44,
    28,
    600,
    width,
    POSTER_COLORS.textSoft,
  );
  y += 116;

  for (const trait of input.traits) {
    ctx.textAlign = 'left';
    ctx.fillStyle = POSTER_COLORS.text;
    ctx.font = `700 26px ${POSTER_FONT}`;
    ctx.fillText(trait.name, pad, y + 24);
    ctx.textAlign = 'right';
    ctx.fillStyle = POSTER_COLORS.textFaint;
    ctx.font = `600 24px ${POSTER_FONT}`;
    ctx.fillText(String(Math.round(trait.coord)), pad + width, y + 24);

    const trackY = y + 38;
    roundRectPath(ctx, pad, trackY, width, 12, 6);
    ctx.fillStyle = 'rgba(36, 20, 34, 0.1)';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(pad + (width * trait.coord) / 100, trackY + 6, 13, 0, Math.PI * 2);
    ctx.fillStyle = POSTER_COLORS.accent;
    ctx.fill();

    ctx.textAlign = 'left';
    ctx.fillStyle = POSTER_COLORS.textFaint;
    ctx.font = `500 20px ${POSTER_FONT}`;
    ctx.fillText(trait.low, pad, y + 78);
    ctx.textAlign = 'right';
    ctx.fillText(trait.high, pad + width, y + 78);
    y += traitHeight;
  }

  y += 24;
  ctx.textAlign = 'left';
  ctx.fillStyle = POSTER_COLORS.textSoft;
  ctx.font = `700 24px ${POSTER_FONT}`;
  ctx.fillText(input.rankLabel, pad, y + 14);
  y += 44;
  input.ranking.forEach((entry, index) => {
    ctx.fillStyle = index === 0 ? POSTER_COLORS.accent : POSTER_COLORS.textFaint;
    ctx.font = `800 28px ${POSTER_FONT}`;
    ctx.fillText(String(index + 1), pad, y + 18);
    ctx.fillStyle = POSTER_COLORS.text;
    ctx.font = `700 28px ${POSTER_FONT}`;
    ctx.fillText(entry.name, pad + 42, y + 18);
    ctx.textAlign = 'right';
    ctx.fillStyle = POSTER_COLORS.textSoft;
    ctx.fillText(`${entry.score}%`, pad + width, y + 18);
    ctx.textAlign = 'left';
    y += 44;
  });

  if (input.statLine) {
    ctx.textAlign = 'center';
    ctx.fillStyle = POSTER_COLORS.textSoft;
    ctx.font = `600 26px ${POSTER_FONT}`;
    ctx.fillText(input.statLine, centerX, bottom - 26);
    ctx.textAlign = 'left';
  }

  return canvas;
}

/** 结果页「相似度排行榜」展示几位（前三名会走奖牌样式）。 */
const RANK_ROWS = 7;

const PROFILE_BY_ID = new Map(PROFILES.map((profile) => [profile.id, profile]));

/** 公式照：放在 public/seiyuu/<id>.jpg，加载失败时退化成首字方块（彩蛋人物也走同一套）。 */
function SeiyuuPhoto({
  id,
  name,
  className,
  fallbackClassName,
}: {
  id: string;
  name: string;
  className?: string;
  fallbackClassName?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <span className={fallbackClassName ?? 'wy-photo-fallback'} aria-hidden="true">
        {name.slice(0, 1)}
      </span>
    );
  }
  return (
    <img
      className={className}
      src={`/seiyuu/${id}.jpg`}
      alt={name}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}

/**
 * 你是哪个声优：快速 24 题 / PRO 48 题，测出你和哪位女声优最像。
 * 题库、画像与匹配算法见 config/whoYouAre.ts，文案见 i18n 的 whoYouAre.*。
 */
export default function WhoYouAre() {
  const { t } = useTranslation();
  const [stage, setStage] = useState<Stage>('intro');
  const [mode, setMode] = useState<QuizMode>('fast');
  const [quiz, setQuiz] = useState<WhoQuizSet | null>(null);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number | undefined>>({});
  const [pending, setPending] = useState<ScaleId | null>(null);
  const [result, setResult] = useState<WhoResult | null>(null);
  const [queried, setQueried] = useState(false);
  const [queryCode, setQueryCode] = useState('');
  const [queryError, setQueryError] = useState('');
  const [copyState, setCopyState] = useState<CopyState>('idle');
  const [codeState, setCodeState] = useState<CopyState>('idle');
  const [reportOpen, setReportOpen] = useState(false);
  const [posterUrl, setPosterUrl] = useState('');
  const [posterBusy, setPosterBusy] = useState(false);
  const [posterError, setPosterError] = useState('');
  const posterCanvas = useRef<HTMLCanvasElement | null>(null);
  /** 「选完自动换题」：默认开，可在个人设置里关。 */
  const autoAdvance = useAutoAdvance();
  const startedAt = useRef(0);
  const timer = useRef<number | null>(null);

  const questions = quiz?.questions ?? [];
  const total = questions.length;
  const question = questions[index];
  const currentValue = question ? answers[question.id] : undefined;
  const answeredCount = Object.values(answers).filter((value) => value !== undefined).length;
  const progress = total === 0 ? 0 : ((index + 1) / total) * 100;
  const resultCode = result && quiz ? resultCodeOf(quiz, answers, result.stats.duration) : '';
  const top = result?.ranking[0];
  const topProfile = top ? PROFILE_BY_ID.get(top.id) : undefined;

  useEffect(
    () => () => {
      if (timer.current !== null) {
        window.clearTimeout(timer.current);
      }
    },
    [],
  );

  const resetTransient = () => {
    setCopyState('idle');
    setCodeState('idle');
    setReportOpen(false);
  };

  const start = () => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
    }
    setQuiz(createQuiz(undefined, mode));
    setAnswers({});
    setPending(null);
    setIndex(0);
    setResult(null);
    setQueried(false);
    resetTransient();
    startedAt.current = Date.now();
    setStage('quiz');
  };

  const finish = (activeQuiz: WhoQuizSet, finalAnswers: Record<string, number | undefined>) => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
    setPending(null);
    setResult(scoreWho(activeQuiz, finalAnswers, Date.now() - startedAt.current));
    setQueried(false);
    resetTransient();
    setStage('result');
  };

  const answer = (id: ScaleId, value: number, element: HTMLButtonElement) => {
    if (pending !== null || !quiz || !question) {
      return;
    }
    // 先把焦点摘掉：否则翻页后鼠标还停在同一格，上一题的选项会继续高亮，
    // 看起来像「下一题已经帮你选好了」。
    element.blur();
    const next = { ...answers, [question.id]: value };
    setAnswers(next);
    // 「选完自动换题」只负责非末题的翻页：关掉后交给玩家自己点；
    // 最后一题**绝不代为交卷**，等玩家点「查看结果」再结算（与 SeiyuuQuiz 的守卫一致）。
    if (!autoAdvance || index + 1 >= total) return;
    setPending(id);
    timer.current = window.setTimeout(() => {
      timer.current = null;
      setPending(null);
      setIndex(index + 1);
    }, AUTO_ADVANCE_DELAY_MS);
  };

  const skip = () => {
    if (pending !== null || !quiz || !question) {
      return;
    }
    const next = { ...answers };
    delete next[question.id];
    setAnswers(next);
    if (index + 1 < total) {
      setIndex(index + 1);
      return;
    }
    finish(quiz, next);
  };

  const goTo = (target: number) => {
    if (pending !== null || target < 0 || target >= total) {
      return;
    }
    setIndex(target);
  };

  const lookup = () => {
    const decoded = decodeWhoQuizCode(queryCode);
    if (!decoded) {
      setQueryError(t('whoYouAre.query.invalid'));
      return;
    }
    setQueryError('');
    setQuiz(decoded.quiz);
    setAnswers(decoded.answers);
    setResult(scoreWho(decoded.quiz, decoded.answers, decoded.duration));
    setQueried(true);
    resetTransient();
    setStage('result');
  };

  const traitName = (trait: TraitId) => t(`whoYouAre.traits.${trait}.name`);
  const traitPole = (trait: TraitId, side: 'low' | 'high') => t(`whoYouAre.traits.${trait}.${side}`);
  const projectName = (project: ProjectId) => t(`whoYouAre.projects.${project}`);
  const vibeOf = (id: string) => t(`whoYouAre.vibes.${id}`);
  /** 模式名里的题量走插值，避免改了 QUIZ_MODES 却忘了改文案。 */
  const modeName = (mode: QuizMode) =>
    t(`whoYouAre.modes.${mode}.name`, { count: QUIZ_MODES[mode].questions });

  const copyText = async (text: string, setter: (state: CopyState) => void) => {
    try {
      await navigator.clipboard.writeText(text);
      setter('done');
    } catch {
      setter('failed');
    }
  };

  /** 结果文案（复制 / QQ 分享共用）。 */
  /** 生成竖版分享图（1080×1920 PNG，带二维码）。 */
  const openPoster = async () => {
    if (!result || !top || !topProfile) return;
    setPosterBusy(true);
    setPosterError('');
    try {
      const canvas = await renderWhoPoster({
        kicker: t('whoYouAre.title'),
        name: top.name,
        romaji: topProfile.romaji,
        score: top.score,
        verdict: t(`whoYouAre.verdict.${verdictOf(top.score)}`),
        similarity: t('whoYouAre.result.similarity'),
        traits: result.traits.map((score) => ({
          name: traitName(score.trait),
          coord: score.coord,
          low: traitPole(score.trait, 'low'),
          high: traitPole(score.trait, 'high'),
        })),
        rankLabel: t('whoYouAre.result.topThree'),
        ranking: result.ranking.slice(0, RANK_ROWS).map((entry) => ({
          name: entry.name,
          score: entry.score,
        })),
        statLine: t('whoYouAre.poster.statLine', {
          mode: modeName(result.mode),
          answered: result.stats.answered,
          duration: formatDuration(result.stats.duration),
        }),
        photoId: topProfile.id,
        site: t('common.siteName'),
        hint: t('common.shareImageHint'),
        qrCaption: t('common.qrCaption'),
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
      await downloadPoster(posterCanvas.current, posterFileName('who-you-are'));
    } catch {
      setPosterError(t('common.shareImageFailed'));
    }
  };

  const resultSummary = () => {
    if (!result || !top) {
      return '';
    }
    return `${t('whoYouAre.result.topLabel')}：${top.name}（${projectName(top.project)}）${top.score}% · ${
      t(`whoYouAre.verdict.${verdictOf(top.score)}`)
    }`;
  };

  const copyResult = () => {
    if (!result || !top) return;
    const lines = [
      `${t('whoYouAre.title')} · ${modeName(result.mode)}`,
      resultSummary(),
      `${t('whoYouAre.result.topThree')}：${result.ranking
        .slice(0, RANK_ROWS)
        .map((entry) => `${entry.name} ${entry.score}%`)
        .join(' / ')}`,
      `${t('whoYouAre.contrast.label')}：${result.contrast.name} ${result.contrast.score}%`,
      result.egg ? `${t('whoYouAre.result.eggLabel')}：${t(`whoYouAre.eggs.${result.egg.id}`)}` : '',
      topProfile ? vibeOf(top.id) : '',
      resultCode ? `${t('whoYouAre.result.codeLabel')}：${resultCode}` : '',
      `${window.location.origin}${WHO_YOU_ARE_HOME}`,
    ].filter(Boolean);
    void copyText(lines.join('\n'), setCopyState);
  };

  /** 分享到 QQ：桌面端开官方分享页，手机端直接唤起 QQ（实现见 utils/share.ts）。 */
  const shareQq = () => {
    if (!result || !top) return;
    shareToQq({
      url: `${window.location.origin}${WHO_YOU_ARE_HOME}`,
      title: `${t('whoYouAre.title')} · ${top.name}`,
      summary: `${resultSummary()}｜${t('whoYouAre.share.summaryHint', { code: resultCode })}`,
      pic: `${window.location.origin}/seiyuu/${top.id}.jpg`,
      site: t('common.siteName'),
    });
  };

  const egg = result?.egg ? EGGS.find((item) => item.id === result.egg?.id) : undefined;
  const eggName = egg ? t(`whoYouAre.eggs.${egg.id}`) : '';
  const eggDesc = egg ? t(`whoYouAre.eggDesc.${egg.id}`) : '';
  // 身份说明只在「彩蛋人物」（带 person 的头像）上显示，其它彩蛋没这条文案。
  const eggPerson = egg?.person;
  const eggRole = eggPerson && egg ? t(`whoYouAre.eggRole.${egg.id}`) : '';

  const renderRankRow = (entry: MatchEntry, position: number) => {
    const profile = PROFILE_BY_ID.get(entry.id);
    if (!profile) return null;
    const podium = position < 3;
    return (
      <li className={`wy-rank${podium ? ` is-podium is-rank-${position + 1}` : ''}`} key={entry.id}>
        <span className="wy-rank-medal">{position + 1}</span>
        <span className="wy-rank-photo">
          <SeiyuuPhoto id={profile.id} name={profile.name} />
        </span>
        <span className="wy-rank-copy">
          <span className="wy-rank-name">
            <span>{entry.name}</span>
            <span className="wy-badge" data-project={entry.project}>
              {projectName(entry.project)}
            </span>
          </span>
          <span className="wy-rank-meta">{entry.chibi}</span>
          <span className="wy-rank-bar">
            <span
              className="wy-rank-fill"
              style={{ width: `${Math.max(6, entry.score)}%` }}
            />
          </span>
        </span>
        <span className="wy-rank-score">{`${entry.score}%`}</span>
      </li>
    );
  };

  return (
    <Page
      title={t('whoYouAre.title')}
      icon={<Heart size={17} />}
      homeTo={SITE_HOME}
      className="who-you-are-page"
    >
      {stage === 'intro' && (
        <div className="card wy-intro">
          <p className="wy-subtitle">{t('whoYouAre.subtitle')}</p>
          <p className="muted">{t('whoYouAre.intro', { count: PROFILE_COUNT })}</p>
          <p className="muted">{t('whoYouAre.guide')}</p>

          <fieldset className="wy-modes">
            <legend>{t('whoYouAre.modeLabel')}</legend>
            {(['fast', 'pro'] as QuizMode[]).map((item) => (
              <button
                key={item}
                type="button"
                className={`wy-mode${mode === item ? ' is-active' : ''}`}
                aria-pressed={mode === item}
                onClick={() => setMode(item)}
              >
                <span className="wy-mode-name">{modeName(item)}</span>
                <span className="wy-mode-desc">{t(`whoYouAre.modes.${item}.desc`)}</span>
                <span className="wy-mode-meta">{`${QUIZ_MODES[item].questions} ${t(
                  'whoYouAre.result.unit',
                )} · ${QUIZ_MODES[item].perTrait} × ${TRAIT_IDS.length} + ${QUIZ_MODES[item].cross}`}</span>
              </button>
            ))}
          </fieldset>

          <button type="button" className="btn btn-lg" onClick={start}>
            {t('whoYouAre.start')}
          </button>

          <section className="wy-query">
            <h3>{t('whoYouAre.query.title')}</h3>
            <p className="muted">{t('whoYouAre.query.hint')}</p>
            <div className="wy-query-row">
              <input
                type="text"
                value={queryCode}
                placeholder={t('whoYouAre.query.placeholder')}
                aria-label={t('whoYouAre.query.title')}
                onChange={(event) => {
                  setQueryCode(event.target.value);
                  setQueryError('');
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    lookup();
                  }
                }}
              />
              <button type="button" className="btn" onClick={lookup}>
                <Search size={15} />
                {t('whoYouAre.query.submit')}
              </button>
            </div>
            {queryError && <p className="wy-copy-failed">{queryError}</p>}
          </section>
        </div>
      )}

      {stage === 'quiz' && question && quiz && (
        <div className="card wy-quiz">
          <div className="wy-progress">
            <span className="wy-progress-text">
              {t('whoYouAre.progress', { current: index + 1, total })}
            </span>
            <span className="wy-progress-meta">
              {`${modeName(quiz.mode)} · ${t('whoYouAre.answered', {
                count: answeredCount,
              })} · ${t('whoYouAre.quizSeed', { seed: quiz.seed })}`}
            </span>
            <span
              className="wy-progress-track"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={total}
              aria-valuenow={index + 1}
            >
              <span className="wy-progress-fill" style={{ width: `${progress}%` }} />
            </span>
          </div>

          <p className="wy-question" key={question.id}>
            {t(`whoYouAre.questions.${question.id}`)}
          </p>

          <div className="wy-options" key={`options-${question.id}`}>
            {SCALE.map((option) => {
              const selected = pending === option.id || (pending === null && currentValue === option.value);
              return (
                <button
                  key={option.id}
                  type="button"
                  data-scale={option.id}
                  className={`wy-option${selected ? ' is-selected' : ''}`}
                  aria-pressed={currentValue === option.value}
                  onClick={(event) => answer(option.id, option.value, event.currentTarget)}
                >
                  <span className="wy-option-mark" aria-hidden="true" />
                  <span className="wy-option-text">{t(`whoYouAre.scale.${option.id}`)}</span>
                </button>
              );
            })}
          </div>

          <div className="wy-actions">
            {index > 0 && (
              <button type="button" className="btn btn-ghost" onClick={() => goTo(index - 1)}>
                <ArrowLeft size={15} />
                {t('whoYouAre.prev')}
              </button>
            )}
            <button type="button" className="btn btn-ghost" onClick={skip}>
              <SkipForward size={15} />
              {t('whoYouAre.skip')}
            </button>
            {currentValue !== undefined && index + 1 < total && (
              <button type="button" className="btn btn-ghost" onClick={() => goTo(index + 1)}>
                {t('whoYouAre.next')}
                <ArrowRight size={15} />
              </button>
            )}
            {/* 关掉自动换题时，最后一题答完不会自己跳转，得给个出口。 */}
            {currentValue !== undefined && index + 1 >= total && (
              <button type="button" className="btn btn-primary" onClick={() => finish(quiz, answers)}>
                {t('whoYouAre.viewResult')}
                <ArrowRight size={15} />
              </button>
            )}
          </div>
        </div>
      )}

      {stage === 'result' && result && top && topProfile && (
        <div className="card wy-result" data-rarity={result.rarity}>
          <span className="wy-accent" aria-hidden="true" />
          <p className="wy-result-kicker">{t('whoYouAre.result.title')}</p>
          {queried && <p className="wy-queried">{t('whoYouAre.result.queried')}</p>}
          <p className="wy-block-label">{t('whoYouAre.result.topLabel')}</p>

          <div className="wy-hero">
            <span className="wy-hero-photo">
              <SeiyuuPhoto id={topProfile.id} name={topProfile.name} />
            </span>
            <div className="wy-hero-copy">
              <h2 className="wy-name">{top.name}</h2>
              <p className="wy-romaji">{topProfile.romaji}</p>
              <div className="wy-badges">
                <span className="wy-badge" data-project={top.project}>
                  {projectName(top.project)}
                </span>
                <span className="wy-badge">
                  {`${t('whoYouAre.result.rarity')} · ${t(`whoYouAre.rarities.${result.rarity}`)}`}
                </span>
                <span className="wy-badge">{modeName(result.mode)}</span>
              </div>
              <p className="wy-chibi">{`${t('whoYouAre.result.chibiLabel')}：${top.chibi}`}</p>
            </div>
          </div>

          <div className="wy-score-row">
            <span className="wy-score">{`${top.score}%`}</span>
            <span className="wy-verdict">{t(`whoYouAre.verdict.${verdictOf(top.score)}`)}</span>
            <span className="muted">{t('whoYouAre.result.similarity')}</span>
          </div>
          <p className="wy-vibe">{vibeOf(top.id)}</p>

          {eggName && (
            <div className="wy-special" data-rarity={result.egg?.rarity ?? 'normal'}>
              <span className="wy-special-label">{t('whoYouAre.result.eggLabel')}</span>
              <div className="wy-special-body">
                {eggPerson && (
                  <span className="wy-special-photo">
                    <SeiyuuPhoto id={eggPerson} name={eggName} />
                  </span>
                )}
                <div className="wy-special-copy">
                  <span className="wy-special-name">{eggName}</span>
                  {eggRole && <span className="wy-special-role">{eggRole}</span>}
                  <span className="wy-special-desc">{eggDesc}</span>
                </div>
              </div>
            </div>
          )}

          <section className="wy-traits">
            <p className="wy-block-label">{t('whoYouAre.result.traitsTitle')}</p>
            {result.traits.map((score) => (
              <div className="wy-trait" key={score.trait}>
                <div className="wy-trait-head">
                  <span className="wy-trait-name">{traitName(score.trait)}</span>
                  <span className="wy-trait-value">{`${Math.round(score.coord)} / 100`}</span>
                </div>
                <div className="wy-trait-track">
                  <span className="wy-trait-dot" style={{ left: `${score.coord}%` }} />
                </div>
                <div className="wy-trait-poles">
                  <span>{traitPole(score.trait, 'low')}</span>
                  <span>{traitPole(score.trait, 'high')}</span>
                </div>
              </div>
            ))}
          </section>

          <section className="wy-match-notes">
            <div className="wy-match-block" data-kind="same">
              <p className="wy-block-label">{t('whoYouAre.result.sameLabel')}</p>
              <ul className="wy-match-list">
                {top.closest.map((entry) => (
                  <li key={entry.trait}>
                    <span>{`${traitName(entry.trait)} · ${traitPole(entry.trait, topProfile.traits[entry.trait] >= 50 ? 'high' : 'low')}`}</span>
                    <b>{`${t('whoYouAre.result.gap')} ${entry.diff}`}</b>
                  </li>
                ))}
              </ul>
            </div>
            <div className="wy-match-block" data-kind="gap">
              <p className="wy-block-label">{t('whoYouAre.result.gapLabel')}</p>
              <ul className="wy-match-list">
                <li>
                  <span>{traitName(top.farthest.trait)}</span>
                  <b>{`${t('whoYouAre.result.gap')} ${top.farthest.diff}`}</b>
                </li>
              </ul>
            </div>
          </section>

          <section className="wy-ranking">
            <p className="wy-block-label">{t('whoYouAre.result.topThree')}</p>
            <ol className="wy-rank-list">{result.ranking.slice(0, RANK_ROWS).map(renderRankRow)}</ol>
          </section>

          <section className="wy-contrast">
            <p className="wy-block-label">{t('whoYouAre.contrast.label')}</p>
            <div className="wy-contrast-card">
              <span className="wy-contrast-photo">
                {PROFILE_BY_ID.get(result.contrast.id) && (
                  <SeiyuuPhoto id={result.contrast.id} name={result.contrast.name} />
                )}
              </span>
              <div>
                <p className="wy-rank-name">{`${result.contrast.name} · ${result.contrast.score}%`}</p>
                <p className="muted wy-rank-note">{t('whoYouAre.contrast.hint')}</p>
              </div>
            </div>
          </section>

          <section className="wy-stats">
            <p className="wy-block-label">{t('whoYouAre.result.statsTitle')}</p>
            <ul>
              <li>
                <span>{t('whoYouAre.result.statsDuration')}</span>
                <strong>{formatDuration(result.stats.duration)}</strong>
              </li>
              <li>
                <span>{t('whoYouAre.result.statsAnswered')}</span>
                <strong>{`${result.stats.answered} / ${result.stats.total} ${t('whoYouAre.result.unit')}`}</strong>
              </li>
              <li>
                <span>{t('whoYouAre.result.statsSkipped')}</span>
                <strong>{`${result.stats.skipped} ${t('whoYouAre.result.unit')}`}</strong>
              </li>
              <li>
                <span>{t('whoYouAre.result.statsDiff')}</span>
                <strong>{`${top.diff}`}</strong>
              </li>
            </ul>
          </section>

          <section className="wy-code">
            <p className="wy-block-label">{t('whoYouAre.result.codeLabel')}</p>
            <div className="wy-code-row">
              <code>{resultCode}</code>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => void copyText(resultCode, setCodeState)}
              >
                <Copy size={15} />
                {codeState === 'done' ? t('whoYouAre.result.copied') : t('whoYouAre.result.codeCopy')}
              </button>
            </div>
          </section>

          <p className="muted wy-note">{t('whoYouAre.result.note')}</p>
          <p className="muted wy-credit">{t('whoYouAre.result.credit')}</p>

          <div className="wy-actions">
            <button type="button" className="btn wy-share-img" onClick={openPoster} disabled={posterBusy}>
              <Download size={15} />
              {posterBusy ? t('common.shareImageBuilding') : t('common.shareImage')}
            </button>
            <button type="button" className="btn" onClick={start}>
              <RotateCcw size={15} />
              {t('whoYouAre.result.restart')}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setReportOpen(true)}>
              <Printer size={15} />
              {t('whoYouAre.result.report')}
            </button>
            <button type="button" className="btn btn-ghost" onClick={copyResult}>
              <Copy size={15} />
              {copyState === 'done' ? t('whoYouAre.result.copied') : t('whoYouAre.result.copy')}
            </button>
          </div>

          <div className="wy-share">
            <button type="button" className="btn wy-share-qq" onClick={shareQq}>
              <MessageCircle size={15} />
              {t('whoYouAre.share.qq')}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => void copyText(`${resultSummary()}\n${window.location.origin}${WHO_YOU_ARE_HOME}`, setCopyState)}
            >
              <Copy size={15} />
              {t('whoYouAre.share.copy')}
            </button>
            <p className="wy-share-hint">{t('whoYouAre.share.hint')}</p>
          </div>
          {copyState === 'failed' && <p className="wy-copy-failed">{t('whoYouAre.result.copyFailed')}</p>}
          {posterError && <p className="wy-copy-failed">{posterError}</p>}
        </div>
      )}

      {posterUrl && (
        <ModalPortal>
          <div
            className="wy-poster-backdrop"
            role="dialog"
            aria-modal="true"
            aria-label={t('common.shareImageLabel')}
          >
            <div className="wy-poster-panel">
              <button
                type="button"
                className="wy-poster-close"
                onClick={() => setPosterUrl('')}
                aria-label={t('common.close')}
              >
                <X size={18} />
              </button>
              <img className="wy-poster-image" src={posterUrl} alt={t('common.shareImageLabel')} />
              <p className="muted wy-poster-hint">{t('common.shareImageSaveHint')}</p>
              <div className="wy-actions">
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

      {reportOpen && result && top && topProfile && (
        <div className="wy-report-overlay" role="dialog" aria-modal="true">
          <div className="wy-report">
            <div className="wy-report-head">
              <div>
                <h2>{t('whoYouAre.report.title')}</h2>
                <p className="muted">{t('whoYouAre.report.subtitle')}</p>
              </div>
              <div className="wy-report-tools">
                <button type="button" className="btn" onClick={() => window.print()}>
                  <Printer size={15} />
                  {t('whoYouAre.report.print')}
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setReportOpen(false)}>
                  <X size={15} />
                  {t('whoYouAre.report.close')}
                </button>
              </div>
            </div>

            <div className="wy-report-body">
              <div className="wy-report-hero">
                <SeiyuuPhoto id={topProfile.id} name={topProfile.name} />
                <div>
                  <p className="wy-report-type">{top.name}</p>
                  <p className="wy-report-line muted">{`${topProfile.romaji} · ${projectName(top.project)}`}</p>
                  <p className="wy-report-line">
                    <strong>{`${top.score}%`}</strong>
                    {` · ${t(`whoYouAre.verdict.${verdictOf(top.score)}`)}`}
                  </p>
                  <p className="wy-report-line muted">{`${t('whoYouAre.result.chibiLabel')}：${top.chibi}`}</p>
                </div>
              </div>

              <h3>{t('whoYouAre.report.vibe')}</h3>
              <p className="wy-report-line">{vibeOf(top.id)}</p>

              {eggName && (
                <>
                  <h3>{t('whoYouAre.result.eggLabel')}</h3>
                  <p className="wy-report-line">
                    <strong>{eggName}</strong>
                    {` · ${eggDesc}`}
                  </p>
                </>
              )}

              <h3>{t('whoYouAre.report.traits')}</h3>
              <ul className="wy-report-ranks">
                {result.traits.map((score) => (
                  <li key={score.trait}>
                    <span>{traitName(score.trait)}</span>
                    <span className="wy-report-axis-bar">
                      <span style={{ left: `${score.coord}%` }} />
                    </span>
                    <span>{`${Math.round(score.coord)} / 100`}</span>
                  </li>
                ))}
              </ul>

              <h3>{t('whoYouAre.result.topThree')}</h3>
              <ul className="wy-report-ranks">
                {result.ranking.slice(0, 3).map((entry) => (
                  <li key={entry.id}>
                    <span>{`${entry.name}（${projectName(entry.project)}）`}</span>
                    <span className="wy-report-axis-bar">
                      <span style={{ left: `${entry.score}%` }} />
                    </span>
                    <span>{`${entry.score}%`}</span>
                  </li>
                ))}
              </ul>

              <h3>{t('whoYouAre.contrast.label')}</h3>
              <p className="wy-report-line">{`${result.contrast.name} · ${result.contrast.score}% · ${result.contrast.chibi}`}</p>

              <h3>{t('whoYouAre.report.meta')}</h3>
              <p className="wy-report-line">{`${t('whoYouAre.quizSeed', { seed: result.seed })} · ${resultCode}`}</p>
              <p className="wy-report-line muted">
                {`${formatDuration(result.stats.duration)} · ${t('whoYouAre.result.statsSkipped')} ${
                  result.stats.skipped
                } · ${new Date().toLocaleDateString()}`}
              </p>

              <h3>{t('whoYouAre.report.projects')}</h3>
              <p className="wy-report-line muted">{PROJECT_IDS.map((id) => projectName(id)).join(' / ')}</p>
            </div>

            <p className="wy-report-footer muted">{t('whoYouAre.report.footer')}</p>
          </div>
        </div>
      )}
    </Page>
  );
}
