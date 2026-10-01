import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Compass,
  Copy,
  Download,
  MessageCircle,
  Printer,
  RotateCcw,
  Search,
  SkipForward,
  Sparkles,
  X,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Page } from '@seiyuu/game-sdk';
import { ModalPortal } from '@seiyuu/game-sdk';
import { SEIVALUE_HOME, SITE_HOME } from '@seiyuu/game-sdk';
import {
  QUIZ_MODES,
  SCALE,
  createQuiz,
  decodeQuizCode,
  formatDuration,
  recommendSeiyuu,
  resultCodeOf,
  scoreSeiValue,
  typeCode,
  type QuizMode,
  type QuizResult,
  type QuizSet,
  type ScaleId,
} from '@seiyuu/game-sdk';
import { shareToQq } from '@seiyuu/game-sdk';
import { POSTER_COLORS, POSTER_CONTENT_WIDTH, POSTER_FONT, POSTER_PADDING, createPosterCanvas, downloadPoster, drawFittedText, drawPosterChips, drawPosterFooter, drawPosterHeader, loadPosterImage, paintBackdrop, posterFileName, qrImagePath, roundRectPath, waitForPosterFonts, wrapText } from '@seiyuu/game-sdk';
import { AUTO_ADVANCE_DELAY_MS, useAutoAdvance } from '@seiyuu/game-sdk';

type Stage = 'intro' | 'quiz' | 'result';
type CopyState = 'idle' | 'done' | 'failed';

/** 分享图里一条轴需要的信息。 */
export interface SeiValuePosterAxis {
  name: string;
  left: string;
  right: string;
  leftShare: number;
  rightShare: number;
}

interface SeiValuePosterText {
  kicker: string;
  subtitle: string;
  axes: SeiValuePosterAxis[];
  /** 稀有标签（最多几条，画在标题下面）。 */
  tags: string[];
  /** 底部一行：成绩码 + 用时。 */
  statLine: string;
  eggLabel: string;
  eggName: string;
  eggDesc: string;
  site: string;
  hint: string;
  qrCaption: string;
}

const AXIS_BLOCK_HEIGHT = 152;

/** 画竖版测试结果海报：主义名 + 四轴倾向条（+ 隐藏结果）。 */
async function renderSeiValuePoster(
  title: string,
  text: SeiValuePosterText,
): Promise<HTMLCanvasElement> {
  await waitForPosterFonts();
  const { canvas, ctx } = createPosterCanvas();
  paintBackdrop(ctx);

  const top = drawPosterHeader(ctx, {
    kicker: text.kicker,
    title,
    subtitle: text.subtitle,
  });
  const qrImage = await loadPosterImage(qrImagePath('seivalue'));
  const bottom = drawPosterFooter(ctx, {
    site: text.site,
    hint: text.hint,
    qr: qrImage ? { image: qrImage, caption: text.qrCaption } : undefined,
  });

  const pad = POSTER_PADDING;
  const width = POSTER_CONTENT_WIDTH;
  const tagsHeight = text.tags.length
    ? drawPosterChips(ctx, text.tags, { y: top, maxLines: 1 })
    : 0;
  /** 底部统计行占的高度（不画时也不留空）。 */
  const statHeight = text.statLine ? 58 : 0;
  const blockTop = top + (tagsHeight ? tagsHeight + 28 : 0);
  const eggHeight = text.eggName ? 168 : 0;
  const blockHeight = text.axes.length * AXIS_BLOCK_HEIGHT + eggHeight;
  const startY =
    blockTop + Math.max(0, (bottom - statHeight - blockTop - blockHeight) / 2);

  text.axes.forEach((axis, index) => {
    const y = startY + index * AXIS_BLOCK_HEIGHT;

    ctx.textAlign = 'center';
    ctx.fillStyle = POSTER_COLORS.text;
    ctx.font = `800 34px ${POSTER_FONT}`;
    ctx.fillText(axis.name, pad + width / 2, y + 40);
    ctx.textAlign = 'left';

    const barY = y + 62;
    const barHeight = 34;
    const leftWidth = (width * axis.leftShare) / 100;

    roundRectPath(ctx, pad, barY, width, barHeight, barHeight / 2);
    ctx.fillStyle = 'rgba(36, 20, 34, 0.09)';
    ctx.fill();

    ctx.save();
    roundRectPath(ctx, pad, barY, width, barHeight, barHeight / 2);
    ctx.clip();
    ctx.fillStyle = POSTER_COLORS.accent;
    ctx.fillRect(pad, barY, leftWidth, barHeight);
    ctx.fillStyle = 'rgba(150, 108, 232, 0.9)';
    ctx.fillRect(pad + leftWidth, barY, width - leftWidth, barHeight);
    ctx.restore();

    const labelY = barY + barHeight + 34;
    drawFittedText(
      ctx,
      `← ${axis.left} ${Math.round(axis.leftShare)}%`,
      pad + width * 0.25,
      labelY,
      24,
      600,
      width * 0.48,
      POSTER_COLORS.textSoft,
    );
    drawFittedText(
      ctx,
      `${Math.round(axis.rightShare)}% ${axis.right} →`,
      pad + width * 0.75,
      labelY,
      24,
      600,
      width * 0.48,
      POSTER_COLORS.textSoft,
    );
  });

  if (text.eggName) {
    const y = startY + text.axes.length * AXIS_BLOCK_HEIGHT;
    roundRectPath(ctx, pad, y, width, 132, 18);
    ctx.fillStyle = POSTER_COLORS.highlight;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = POSTER_COLORS.accent;
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.fillStyle = POSTER_COLORS.accent;
    ctx.font = `800 24px ${POSTER_FONT}`;
    ctx.fillText(text.eggLabel, pad + 28, y + 44);
    ctx.fillStyle = POSTER_COLORS.text;
    ctx.font = `800 38px ${POSTER_FONT}`;
    ctx.fillText(text.eggName, pad + 28, y + 90);
    ctx.fillStyle = POSTER_COLORS.textSoft;
    ctx.font = `500 22px ${POSTER_FONT}`;
    const descLine = wrapText(ctx, text.eggDesc, width - 56)[0] ?? '';
    if (descLine) ctx.fillText(descLine, pad + 28, y + 120);
  }

  if (text.statLine) {
    ctx.textAlign = 'center';
    ctx.fillStyle = POSTER_COLORS.textSoft;
    ctx.font = `600 26px ${POSTER_FONT}`;
    ctx.fillText(text.statLine, pad + width / 2, bottom - 26);
    ctx.textAlign = 'left';
  }

  return canvas;
}

/** 百分比保留一位小数，和 8values 的结果条一致。 */
function formatShare(value: number): string {
  return String(Math.round(value * 10) / 10);
}

/** 轴得分（-100~100）换算成左右占比，中间点为 50/50。 */
function sharesOf(percent: number): { left: number; right: number } {
  const right = 50 + percent / 2;
  return { left: 100 - right, right };
}

/**
 * SeiValue 测试：大题库随机抽题，全部在前端计分。
 * 题库、计分与成绩码见 config/seivalue.ts，文案见 i18n 的 seivalue.*。
 */
export default function SeiValue() {
  const { t } = useTranslation();
  const [stage, setStage] = useState<Stage>('intro');
  const [mode, setMode] = useState<QuizMode>('fast');
  const [quiz, setQuiz] = useState<QuizSet | null>(null);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number | undefined>>({});
  const [pending, setPending] = useState<ScaleId | null>(null);
  const [result, setResult] = useState<QuizResult | null>(null);
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

  useEffect(
    () => () => {
      if (timer.current !== null) {
        window.clearTimeout(timer.current);
      }
    },
    [],
  );

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
    setCopyState('idle');
    setCodeState('idle');
    setReportOpen(false);
    startedAt.current = Date.now();
    setStage('quiz');
  };

  const finish = (activeQuiz: QuizSet, finalAnswers: Record<string, number | undefined>) => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
    setPending(null);
    setResult(scoreSeiValue(activeQuiz, finalAnswers, Date.now() - startedAt.current));
    setQueried(false);
    setReportOpen(false);
    setCopyState('idle');
    setCodeState('idle');
    setStage('result');
  };

  const answer = (id: ScaleId, value: number, element: HTMLButtonElement) => {
    if (pending !== null || !quiz || !question) {
      return;
    }
    // 关键：先把焦点从按钮上摘掉，否则翻页后鼠标仍停在同一格，
    // 上一题的选项会继续显示高亮，看起来像"下一题已经帮你选好了"。
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
    const decoded = decodeQuizCode(queryCode);
    if (!decoded) {
      setQueryError(t('seivalue.query.invalid'));
      return;
    }
    setQueryError('');
    setQuiz(decoded.quiz);
    setAnswers(decoded.answers);
    setResult(scoreSeiValue(decoded.quiz, decoded.answers, decoded.duration));
    setQueried(true);
    setCopyState('idle');
    setCodeState('idle');
    setReportOpen(false);
    setStage('result');
  };

  const axisLabel = (axis: string, side: string) => t(`seivalue.axes.${axis}.${side}`);

  const code = result ? typeCode(result.poles) : '';
  const typeName = code ? t(`seivalue.types.${code}.name`) : '';
  const typeDesc = code ? t(`seivalue.types.${code}.desc`) : '';
  const typeReview = code ? t(`seivalue.types.${code}.review`) : '';
  const poleLine = result
    ? result.poles
        .map((pole) => `${axisLabel(pole.axis, 'name')} ${formatShare(50 + Math.abs(pole.percent) / 2)}%`)
        .join(' · ')
    : '';
  const poleNotes = result
    ? result.poles.map((pole) => t(`seivalue.poleDesc.${pole.axis}.${pole.side}`))
    : [];
  const recommendations = result ? recommendSeiyuu(result.stats.axes, 2, 8, result.seed) : [];
  const eggName = result?.egg ? t(`seivalue.eggs.${result.egg.id}`) : '';
  const eggDesc = result?.egg ? t(`seivalue.eggDesc.${result.egg.id}`) : '';
  const eggRarity = result?.egg?.rarity ?? 'normal';

  const copyText = async (text: string, setter: (state: CopyState) => void) => {
    try {
      await navigator.clipboard.writeText(text);
      setter('done');
    } catch {
      setter('failed');
    }
  };

  const copyResult = () => {
    if (!result) return;
    const lines = [
      `${t('seivalue.title')} · ${typeName}（${t(`seivalue.rarities.${result.rarity}`)}）`,
      poleLine,
      eggName ? `${eggName}${eggDesc ? `：${eggDesc}` : ''}` : '',
      typeDesc,
      typeReview,
      poleNotes.join(''),
      resultCode ? `${t('seivalue.result.codeLabel')}：${resultCode}` : '',
    ].filter(Boolean);
    void copyText(lines.join('\n'), setCopyState);
  };

  /** 分享到 QQ：类型 + 四轴倾向 + 成绩码，手机端会直接唤起 QQ。 */
  const shareQq = () => {
    if (!result) return;
    shareToQq({
      url: `${window.location.origin}${SEIVALUE_HOME}`,
      title: `${t('seivalue.title')} · ${typeName}`,
      summary: [poleLine, resultCode ? `${t('seivalue.result.codeLabel')}：${resultCode}` : '']
        .filter(Boolean)
        .join('｜'),
      site: t('common.siteName'),
    });
  };

  /** 生成竖版分享图（1080×1920 PNG，带二维码）。 */
  const openPoster = async () => {
    if (!result) return;
    setPosterBusy(true);
    setPosterError('');
    try {
      const canvas = await renderSeiValuePoster(typeName, {
        kicker: t('seivalue.title'),
        subtitle: `${t('seivalue.result.rarity')} · ${t(`seivalue.rarities.${result.rarity}`)} · ${t(
          `seivalue.modes.${result.mode}.name`,
        )}`,
        axes: result.stats.axes.map((score) => ({
          name: axisLabel(score.axis, 'name'),
          left: axisLabel(score.axis, 'left'),
          right: axisLabel(score.axis, 'right'),
          leftShare: score.leftShare,
          rightShare: score.rightShare,
        })),
        tags: result.tags.map((tag) => t(`seivalue.rareTags.${tag.id}.name`)).slice(0, 3),
        statLine: t('seivalue.poster.statLine', {
          code: resultCode,
          duration: formatDuration(result.stats.duration),
        }),
        eggLabel: t('seivalue.result.eggLabel'),
        eggName,
        eggDesc,
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
      await downloadPoster(posterCanvas.current, posterFileName('seivalue'));
    } catch {
      setPosterError(t('common.shareImageFailed'));
    }
  };

  const axisRows = result
    ? result.stats.axes.map((score) => ({
        ...score,
        ...sharesOf(score.percent),
        dominant: 50 + Math.abs(score.percent) / 2,
      }))
    : [];

  return (
    <Page
      title={t('seivalue.title')}
      icon={<Compass size={17} />}
      homeTo={SITE_HOME}
      className="seivalue-page"
    >
      {stage === 'intro' && (
        <div className="card sv-intro">
          <p className="sv-subtitle">{t('seivalue.subtitle')}</p>
          <p className="muted">{t('seivalue.intro')}</p>
          <p className="muted">{t('seivalue.guide')}</p>

          <fieldset className="sv-modes">
            <legend>{t('seivalue.modeLabel')}</legend>
            {(['fast', 'pro'] as QuizMode[]).map((item) => (
              <button
                key={item}
                type="button"
                className={`sv-mode${mode === item ? ' is-active' : ''}`}
                aria-pressed={mode === item}
                onClick={() => setMode(item)}
              >
                <span className="sv-mode-name">{t(`seivalue.modes.${item}.name`)}</span>
                <span className="sv-mode-desc">{t(`seivalue.modes.${item}.desc`)}</span>
                <span className="sv-mode-meta">{`${QUIZ_MODES[item].questions} ${t(
                  'seivalue.result.unit',
                )}`}</span>
                <span className="sv-mode-layout">
                  {[
                    `${QUIZ_MODES[item].pairs * 2} ${t('seivalue.layers.core')}`,
                    `${QUIZ_MODES[item].warmup} ${t('seivalue.layers.warmup')}`,
                    `${QUIZ_MODES[item].extreme} ${t('seivalue.layers.extreme')}`,
                    `${QUIZ_MODES[item].trap} ${t('seivalue.layers.trap')}`,
                  ].join(' · ')}
                </span>
              </button>
            ))}
          </fieldset>

          <button type="button" className="btn btn-lg" onClick={start}>
            {t('seivalue.start')}
          </button>

          <section className="sv-query">
            <h3>{t('seivalue.query.title')}</h3>
            <p className="muted">{t('seivalue.query.hint')}</p>
            <div className="sv-query-row">
              <input
                type="text"
                value={queryCode}
                placeholder={t('seivalue.query.placeholder')}
                aria-label={t('seivalue.query.title')}
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
                {t('seivalue.query.submit')}
              </button>
            </div>
            {queryError && <p className="sv-copy-failed">{queryError}</p>}
          </section>
        </div>
      )}

      {stage === 'quiz' && question && quiz && (
        <div className="card sv-quiz">
          <div className="sv-progress">
            <span className="sv-progress-text">
              {t('seivalue.progress', { current: index + 1, total })}
            </span>
            <span className="sv-progress-meta">
              {`${t(`seivalue.modes.${quiz.mode}.name`)} · ${t('seivalue.answered', {
                count: answeredCount,
              })} · ${t('seivalue.quizSeed', { seed: quiz.seed })}`}
            </span>
            <span
              className="sv-progress-track"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={total}
              aria-valuenow={index + 1}
            >
              <span className="sv-progress-fill" style={{ width: `${progress}%` }} />
            </span>
          </div>

          <p className="sv-question" key={question.id}>
            {t(`seivalue.questions.${question.id}`)}
          </p>

          <div className="sv-options" key={`options-${question.id}`}>
            {SCALE.map((option) => {
              const selected = pending === option.id || (pending === null && currentValue === option.value);
              return (
                <button
                  key={option.id}
                  type="button"
                  data-scale={option.id}
                  className={`sv-option${selected ? ' is-selected' : ''}`}
                  aria-pressed={currentValue === option.value}
                  onClick={(event) => answer(option.id, option.value, event.currentTarget)}
                >
                  <span className="sv-option-mark" aria-hidden="true" />
                  <span className="sv-option-text">{t(`seivalue.scale.${option.id}`)}</span>
                </button>
              );
            })}
          </div>

          <div className="sv-actions">
            {index > 0 && (
              <button type="button" className="btn btn-ghost" onClick={() => goTo(index - 1)}>
                <ArrowLeft size={15} />
                {t('seivalue.prev')}
              </button>
            )}
            <button type="button" className="btn btn-ghost" onClick={skip}>
              <SkipForward size={15} />
              {t('seivalue.skip')}
            </button>
            {currentValue !== undefined && index + 1 < total && (
              <button type="button" className="btn btn-ghost" onClick={() => goTo(index + 1)}>
                {t('seivalue.next')}
                <ArrowRight size={15} />
              </button>
            )}
            {/* 关掉自动换题时，最后一题答完不会自己跳转，得给个出口。 */}
            {currentValue !== undefined && index + 1 >= total && (
              <button type="button" className="btn btn-primary" onClick={() => finish(quiz, answers)}>
                {t('seivalue.viewResult')}
                <ArrowRight size={15} />
              </button>
            )}
          </div>
        </div>
      )}

      {stage === 'result' && result && (
        <div className="card sv-result" data-rarity={result.rarity}>
          <span className="sv-accent" aria-hidden="true" />
          <p className="sv-result-kicker">{t('seivalue.result.title')}</p>
          {queried && <p className="sv-queried">{t('seivalue.result.queried')}</p>}
          <h2 className="sv-type">{typeName}</h2>
          <p className="sv-rarity">
            <Sparkles size={14} />
            {`${t('seivalue.result.rarity')} · ${t(`seivalue.rarities.${result.rarity}`)} · ${t(
              `seivalue.modes.${result.mode}.name`,
            )}`}
          </p>
          <p className="sv-pole-line">{poleLine}</p>

          {eggName && (
            <div className="sv-special" data-rarity={eggRarity}>
              <span className="sv-special-label">{t('seivalue.result.eggLabel')}</span>
              <span className="sv-special-name">{eggName}</span>
              <span className="sv-special-desc">{eggDesc}</span>
            </div>
          )}

          {result.tags.length > 0 && (
            <div className="sv-tags">
              <p className="sv-block-label">{t('seivalue.result.tagsLabel')}</p>
              {result.tags.map((tag) => (
                <div className="sv-tag" key={tag.id}>
                  <span className="sv-tag-name">{t(`seivalue.rareTags.${tag.id}.name`)}</span>
                  <span className="sv-tag-review">{t(`seivalue.rareTags.${tag.id}.review`)}</span>
                </div>
              ))}
            </div>
          )}

          <ul className="sv-axis-list">
            {axisRows.map((score) => (
              <li className="sv-axis" key={score.axis} data-axis={score.axis}>
                <div className="sv-axis-head">
                  <span className="sv-axis-name">{axisLabel(score.axis, 'name')}</span>
                  <span className="sv-axis-value">
                    {`${axisLabel(score.axis, score.side)} · ${formatShare(score.dominant)}%`}
                  </span>
                </div>
                <div className="sv-axis-bar">
                  <span
                    className={`sv-half sv-half-left${score.left >= 16 ? ' is-wide' : ''}`}
                    style={{ width: `${score.left}%` }}
                    title={`${axisLabel(score.axis, 'left')} ${formatShare(score.left)}%`}
                  >
                    {score.left >= 16 ? `${formatShare(score.left)}%` : ''}
                  </span>
                  <span
                    className={`sv-half sv-half-right${score.right >= 16 ? ' is-wide' : ''}`}
                    style={{ width: `${score.right}%` }}
                    title={`${axisLabel(score.axis, 'right')} ${formatShare(score.right)}%`}
                  >
                    {score.right >= 16 ? `${formatShare(score.right)}%` : ''}
                  </span>
                </div>
                <div className="sv-axis-poles">
                  <span>{`← ${axisLabel(score.axis, 'left')} ${formatShare(score.left)}%`}</span>
                  <span>{`${formatShare(score.right)}% ${axisLabel(score.axis, 'right')} →`}</span>
                </div>
              </li>
            ))}
          </ul>

          <p className="sv-description">{typeDesc}</p>

          <div className="sv-review">
            <p className="sv-block-label">{t('seivalue.result.reviewLabel')}</p>
            <p>{typeReview}</p>
          </div>

          <ul className="sv-pole-notes">
            {poleNotes.map((note, position) => (
              <li key={result.poles[position]?.axis ?? position}>{note}</li>
            ))}
          </ul>

          {recommendations.length > 0 && (
            <section className="sv-recommend">
              <h3>{t('seivalue.result.recommendTitle')}</h3>
              <ul>
                {recommendations.map((group) => (
                  <li key={`${group.axis}-${group.side}`}>
                    <div className="sv-recommend-head">
                      <span className="sv-recommend-pole">{axisLabel(group.axis, group.side)}</span>
                      <span className="sv-recommend-percent">{`${formatShare(
                        50 + Math.abs(group.percent) / 2,
                      )}%`}</span>
                    </div>
                    <p className="sv-recommend-names">
                      {group.names.map((name) => (
                        <span className="sv-name" key={name}>
                          {name}
                        </span>
                      ))}
                    </p>
                    <p className="muted sv-recommend-reason">
                      {t(`seivalue.poleReason.${group.axis}.${group.side}`)}
                    </p>
                  </li>
                ))}
              </ul>
              <p className="muted sv-recommend-hint">{t('seivalue.result.recommendHint')}</p>
            </section>
          )}

          <section className="sv-stats">
            <h3>{t('seivalue.result.statsTitle')}</h3>
            <ul>
              <li>
                <span>{t('seivalue.result.statsDuration')}</span>
                <strong>{formatDuration(result.stats.duration)}</strong>
              </li>
              <li>
                <span>{t('seivalue.result.statsContradiction')}</span>
                <strong>{`${result.stats.contradictionCount} ${t('seivalue.result.unit')}`}</strong>
              </li>
              <li>
                <span>{t('seivalue.result.statsRandomness')}</span>
                <strong>{`${Math.round(result.stats.randomness * 100)}%`}</strong>
              </li>
              <li>
                <span>{t('seivalue.result.statsSkipped')}</span>
                <strong>{`${result.stats.skipped} ${t('seivalue.result.unit')}`}</strong>
              </li>
            </ul>
          </section>

          <section className="sv-code">
            <p className="sv-block-label">{t('seivalue.result.codeLabel')}</p>
            <div className="sv-code-row">
              <code>{resultCode}</code>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => void copyText(resultCode, setCodeState)}
              >
                <Copy size={15} />
                {codeState === 'done' ? t('seivalue.result.copied') : t('seivalue.result.codeCopy')}
              </button>
            </div>
          </section>

          <p className="muted sv-note">{t('seivalue.result.note')}</p>

          <div className="sv-actions">
            <button type="button" className="btn sv-share-img" onClick={openPoster} disabled={posterBusy}>
              <Download size={15} />
              {posterBusy ? t('common.shareImageBuilding') : t('common.shareImage')}
            </button>
            <button type="button" className="btn sv-share-qq" onClick={shareQq}>
              <MessageCircle size={15} />
              {t('common.shareToQq')}
            </button>
            <button type="button" className="btn" onClick={start}>
              <RotateCcw size={15} />
              {t('seivalue.result.restart')}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setReportOpen(true)}>
              <Printer size={15} />
              {t('seivalue.result.report')}
            </button>
            <button type="button" className="btn btn-ghost" onClick={copyResult}>
              <Copy size={15} />
              {copyState === 'done' ? t('seivalue.result.copied') : t('seivalue.result.copy')}
            </button>
          </div>
          {copyState === 'failed' && <p className="sv-copy-failed">{t('seivalue.result.copyFailed')}</p>}
          {posterError && <p className="sv-copy-failed">{posterError}</p>}
          <p className="muted sv-share-hint">{t('common.shareHint')}</p>
        </div>
      )}

      {posterUrl && (
        <ModalPortal>
          <div
            className="sv-poster-backdrop"
            role="dialog"
            aria-modal="true"
            aria-label={t('common.shareImageLabel')}
          >
            <div className="sv-poster-panel">
              <button
                type="button"
                className="sv-poster-close"
                onClick={() => setPosterUrl('')}
                aria-label={t('common.close')}
              >
                <X size={18} />
              </button>
              <img className="sv-poster-image" src={posterUrl} alt={t('common.shareImageLabel')} />
              <p className="muted sv-poster-hint">{t('common.shareImageSaveHint')}</p>
              <div className="sv-actions">
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

      {reportOpen && result && (
        <div className="sv-report-overlay" role="dialog" aria-modal="true">
          <div className="sv-report">
            <div className="sv-report-head">
              <div>
                <h2>{t('seivalue.report.title')}</h2>
                <p className="muted">{t('seivalue.report.subtitle')}</p>
              </div>
              <div className="sv-report-tools">
                <button type="button" className="btn" onClick={() => window.print()}>
                  <Printer size={15} />
                  {t('seivalue.report.print')}
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setReportOpen(false)}>
                  <X size={15} />
                  {t('seivalue.report.close')}
                </button>
              </div>
            </div>

            <div className="sv-report-body">
              <p className="sv-report-type">{typeName}</p>
              <p className="sv-report-rarity">
                {`${t('seivalue.result.rarity')} · ${t(`seivalue.rarities.${result.rarity}`)} · ${
                  t(`seivalue.modes.${result.mode}.name`)
                }`}
              </p>

              <h3>{t('seivalue.report.axes')}</h3>
              <ul className="sv-report-axes">
                {axisRows.map((score) => (
                  <li key={score.axis} data-axis={score.axis}>
                    <span className="sv-report-axis-name">{axisLabel(score.axis, 'name')}</span>
                    <span className="sv-report-axis-bar">
                      <span
                        className="sv-half sv-half-left"
                        style={{ width: `${score.left}%` }}
                      />
                      <span
                        className="sv-half sv-half-right"
                        style={{ width: `${score.right}%` }}
                      />
                    </span>
                    <span className="sv-report-axis-value">
                      {`${axisLabel(score.axis, score.side)} ${formatShare(score.dominant)}%`}
                    </span>
                  </li>
                ))}
              </ul>

              {eggName && (
                <>
                  <h3>{t('seivalue.result.eggLabel')}</h3>
                  <p className="sv-report-line">
                    <strong>{eggName}</strong>
                    {` · ${eggDesc}`}
                  </p>
                </>
              )}

              {result.tags.length > 0 && (
                <>
                  <h3>{t('seivalue.report.tags')}</h3>
                  {result.tags.map((tag) => (
                    <p className="sv-report-line" key={tag.id}>
                      <strong>{t(`seivalue.rareTags.${tag.id}.name`)}</strong>
                      {` · ${t(`seivalue.rareTags.${tag.id}.review`)}`}
                    </p>
                  ))}
                </>
              )}

              <h3>{t('seivalue.report.review')}</h3>
              <p className="sv-report-line">{typeReview}</p>
              <p className="sv-report-line muted">{typeDesc}</p>

              {recommendations.length > 0 && (
                <>
                  <h3>{t('seivalue.report.recommend')}</h3>
                  <p className="sv-report-line">
                    {recommendations.map((group) => group.names.join('、')).join(' / ')}
                  </p>
                </>
              )}

              <h3>{t('seivalue.report.meta')}</h3>
              <p className="sv-report-line">
                {`${t('seivalue.quizSeed', { seed: result.seed })} · ${resultCode}`}
              </p>
              <p className="sv-report-line muted">
                {`${formatDuration(result.stats.duration)} · ${t('seivalue.result.statsSkipped')} ${
                  result.stats.skipped
                } · ${new Date().toLocaleDateString()}`}
              </p>
            </div>

            <p className="sv-report-footer muted">{t('seivalue.report.footer')}</p>
          </div>
        </div>
      )}
    </Page>
  );
}
