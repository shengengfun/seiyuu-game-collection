import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Check, Download, RotateCcw, Share2, Sparkles, X, Zap } from 'lucide-react';
import Page from '../components/Page';
import ModalPortal from '../components/ModalPortal';
import { SITE_HOME } from '../config/routes';
import {
  LIFE_INITIAL_STATS,
  LIFE_POSTER_PREFIX,
  LIFE_START_NODE,
  LIFE_STAT_KEYS,
  applyEffects,
  applyOptionEffects,
  endingOdds,
  endingOf,
  identityOf,
  matchSeiyuu,
  nodeById,
  photoOf,
  randomSeed,
  resolveEventOption,
  rollEvent,
  type LifeEnding,
  type LifeEvent,
  type LifeLogEntry,
  type LifePathTag,
  type LifeStats,
} from '../config/seiyuuLife';
import { shareToQq } from '../utils/share';
import {
  POSTER_COLORS,
  POSTER_CONTENT_WIDTH,
  POSTER_FONT,
  POSTER_PADDING,
  createPosterCanvas,
  downloadPoster,
  drawCoverImage,
  drawFittedText,
  drawPosterFooter,
  drawPosterHeader,
  loadPosterImage,
  paintBackdrop,
  posterFileName,
  qrImagePath,
  roundRectPath,
  waitForPosterFonts,
  wrapText,
} from '../utils/poster';

type Stage = 'intro' | 'play' | 'result';

interface LifePosterText {
  kicker: string;
  title: string;
  subtitle: string;
  endingDesc: string;
  /** 「只有 x% 的人走到这里」那一行。 */
  odds: string;
  statsTitle: string;
  timelineTitle: string;
  matchTitle: string;
  matchReason: string;
  statLabels: Record<string, string>;
  /** 大事记（阶段／事件名 + 当时选了什么，最多 5 条）。 */
  timeline: { title: string; label: string }[];
  site: string;
  hint: string;
  qrCaption: string;
}

/** 这一步选了哪个选项的展示文案（阶段与事件共用一套 i18n 键）。 */
export function logLabelKey(entry: LifeLogEntry): string {
  return entry.kind === 'stage'
    ? `seiyuuLife.stages.${entry.ref}.options.${entry.optionId}.label`
    : `seiyuuLife.events.${entry.ref}.options.${entry.optionId}`;
}

/** 这一步属于哪个阶段 / 哪件事。 */
export function logTitleKey(entry: LifeLogEntry): string {
  return entry.kind === 'stage'
    ? `seiyuuLife.stages.${entry.ref}.title`
    : `seiyuuLife.events.${entry.ref}.title`;
}

/**
 * 画「人生重开」竖版海报：结局 + 五项数值条 + 和你最像的那位。
 *
 * 数值条按可用高度均分，写死高度会在长结局描述下把最像的人挤出画布。
 */
async function renderLifePoster(
  stats: LifeStats,
  ending: LifeEnding,
  matchedId: string,
  text: LifePosterText,
): Promise<HTMLCanvasElement> {
  await waitForPosterFonts();
  const { canvas, ctx } = createPosterCanvas();
  paintBackdrop(ctx);

  const top = drawPosterHeader(ctx, { kicker: text.kicker, title: text.title, subtitle: text.subtitle });
  const qrImage = await loadPosterImage(qrImagePath('life'));
  const bottom = drawPosterFooter(ctx, {
    site: text.site,
    hint: text.hint,
    qr: qrImage ? { image: qrImage, caption: text.qrCaption } : undefined,
  });

  const pad = POSTER_PADDING;
  const width = POSTER_CONTENT_WIDTH;
  const centerX = pad + width / 2;

  // 结局块（结局描述必须折行：最长的几条会超出画布宽度）
  ctx.fillStyle = POSTER_COLORS.accent;
  ctx.font = `800 34px ${POSTER_FONT}`;
  ctx.textAlign = 'center';
  const descLines = wrapText(ctx, text.endingDesc, width).slice(0, 2);
  descLines.forEach((line, index) => ctx.fillText(line, centerX, top + 34 + index * 46));
  ctx.textAlign = 'left';
  drawFittedText(
    ctx,
    text.odds,
    centerX,
    top + 34 + descLines.length * 46 + 32,
    26,
    600,
    width,
    POSTER_COLORS.textFaint,
  );

  // 数值条（带小标题：光看五个数字不知道分别是什么）
  const statsTitleY = top + 34 + descLines.length * 46 + 66;
  ctx.fillStyle = POSTER_COLORS.textSoft;
  ctx.font = `700 26px ${POSTER_FONT}`;
  ctx.textAlign = 'left';
  ctx.fillText(text.statsTitle, pad, statsTitleY + 26);
  const statsTop = statsTitleY + 46;
  const rowHeight = 58;
  LIFE_STAT_KEYS.forEach((key, index) => {
    const y = statsTop + index * rowHeight;
    const label = text.statLabels[key] ?? key;
    ctx.fillStyle = POSTER_COLORS.textSoft;
    ctx.font = `600 28px ${POSTER_FONT}`;
    ctx.textAlign = 'left';
    ctx.fillText(label, pad, y + 30);

    const barX = pad + 170;
    const barWidth = width - 170 - 96;
    ctx.fillStyle = 'rgba(36, 20, 34, 0.08)';
    roundRectPath(ctx, barX, y + 8, barWidth, 26, 13);
    ctx.fill();
    const ratio = Math.max(0, Math.min(1, stats[key] / 100));
    if (ratio > 0) {
      ctx.fillStyle = POSTER_COLORS.accent;
      roundRectPath(ctx, barX, y + 8, Math.max(13, barWidth * ratio), 26, 13);
      ctx.fill();
    }
    ctx.textAlign = 'right';
    ctx.fillStyle = POSTER_COLORS.text;
    ctx.font = `700 28px ${POSTER_FONT}`;
    ctx.fillText(String(stats[key]), pad + width, y + 32);
    ctx.textAlign = 'left';
  });

  let cursor = statsTop + LIFE_STAT_KEYS.length * rowHeight + 22;

  // 大事记
  if (text.timeline.length) {
    ctx.fillStyle = POSTER_COLORS.textSoft;
    ctx.font = `700 26px ${POSTER_FONT}`;
    ctx.fillText(text.timelineTitle, pad, cursor);
    cursor += 38;
    ctx.font = `500 25px ${POSTER_FONT}`;
    ctx.fillStyle = POSTER_COLORS.textFaint;
    for (const item of text.timeline) {
      const [line] = wrapText(ctx, `· ${item.title}｜${item.label}`, width);
      ctx.fillText(line, pad, cursor);
      cursor += 34;
    }
    cursor += 10;
  }

  // 最像的那位
  const cardHeight = 280;
  const cardY = Math.min(cursor + 8, bottom - cardHeight - 16);
  ctx.fillStyle = POSTER_COLORS.card;
  roundRectPath(ctx, pad, cardY, width, cardHeight, 28);
  ctx.fill();
  ctx.strokeStyle = POSTER_COLORS.cardBorder;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = POSTER_COLORS.accent;
  ctx.font = `800 28px ${POSTER_FONT}`;
  ctx.fillText(text.matchTitle, pad + 32, cardY + 52);

  const image = await loadPosterImage(photoOf(matchedId));
  const photoSize = 170;
  const photoX = pad + 32;
  const photoY = cardY + 76;
  if (image) {
    drawCoverImage(ctx, image, photoX, photoY, photoSize, photoSize, {
      radius: 'circle',
      ring: { color: POSTER_COLORS.frame, width: 4 },
      align: 'top',
    });
  }

  const identity = identityOf(matchedId);
  const textX = photoX + photoSize + 30;
  const textWidth = pad + width - 32 - textX;
  drawFittedText(ctx, identity?.name ?? matchedId, textX + textWidth / 2, photoY + 58, 50, 800, textWidth, POSTER_COLORS.text);
  drawFittedText(
    ctx,
    identity?.characters[0]?.name ?? '',
    textX + textWidth / 2,
    photoY + 100,
    26,
    500,
    textWidth,
    POSTER_COLORS.textSoft,
  );

  ctx.font = `500 26px ${POSTER_FONT}`;
  const reasonLines = wrapText(ctx, text.matchReason, width - 64).slice(0, 3);
  ctx.fillStyle = POSTER_COLORS.textSoft;
  ctx.textAlign = 'left';
  reasonLines.forEach((line, index) => {
    ctx.fillText(line, pad + 32, cardY + cardHeight - 58 + index * 34);
  });

  return canvas;
}

/**
 * 「声优人生重开」：十几个岔路口（带分支）→ 一个结局 → 一位最像的现役声优。
 * 逻辑见 config/seiyuuLife.ts，文案见 i18n 的 seiyuuLife.*。
 */
export default function SeiyuuLife() {
  const { t } = useTranslation();
  const [stage, setStage] = useState<Stage>('intro');
  /** 当前站在哪个岔路口（由上一步的 `next` 决定，所以不是简单的递增）。 */
  const [nodeId, setNodeId] = useState(LIFE_START_NODE);
  /** 已经走了几步（HUD 与突发事件判定用）。 */
  const [steps, setSteps] = useState(0);
  const [stats, setStats] = useState<LifeStats>({ ...LIFE_INITIAL_STATS });
  const [tags, setTags] = useState<LifePathTag[]>([]);
  const [seed, setSeed] = useState(0);
  const [ending, setEnding] = useState<LifeEnding | null>(null);
  const [matchedId, setMatchedId] = useState('');
  const [log, setLog] = useState<LifeLogEntry[]>([]);
  /** 当前正在处理的突发事件；为空表示正常走岔路口。 */
  const [current, setCurrent] = useState<LifeEvent | null>(null);
  /** 事件已拍板、正在展示结果（赌一把的成败 / 效果）。 */
  const [outcome, setOutcome] = useState<LifeLogEntry | null>(null);
  const [posterUrl, setPosterUrl] = useState('');
  const [posterBusy, setPosterBusy] = useState(false);
  const [posterError, setPosterError] = useState('');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const usedEvents = useRef<Set<string>>(new Set());
  /** 突发事件插在两步之间，这里记住事件结束后该去哪个岔路口。 */
  const pendingNext = useRef<string | undefined>(undefined);

  // 稀有度要跑两万局模拟，只在真的出结果时算一次
  const odds = useMemo(() => (stage === 'result' ? endingOdds() : {}), [stage]);

  const start = () => {
    setStats({ ...LIFE_INITIAL_STATS });
    setTags([]);
    setNodeId(LIFE_START_NODE);
    setSteps(0);
    setEnding(null);
    setMatchedId('');
    setLog([]);
    setCurrent(null);
    setOutcome(null);
    setPosterUrl('');
    setPosterError('');
    canvasRef.current = null;
    usedEvents.current = new Set();
    pendingNext.current = undefined;
    setSeed(randomSeed());
    setStage('play');
  };

  const mergeTags = (base: LifePathTag[], extra: LifePathTag[] = []): LifePathTag[] => {
    const next = [...base];
    for (const tag of extra) if (!next.includes(tag)) next.push(tag);
    return next;
  };

  const finish = (finalStats: LifeStats, finalTags: LifePathTag[], finalLog: LifeLogEntry[], seedValue: number) => {
    const finalEnding = endingOf(finalStats, finalTags);
    setEnding(finalEnding);
    setMatchedId(matchSeiyuu(finalEnding, seedValue));
    setLog(finalLog);
    setStage('result');
  };

  /** 跳到下一个岔路口；没有下一个就收尾（最后一关的选项不写 next）。 */
  const proceed = (
    nextId: string | undefined,
    nextStats: LifeStats,
    nextTags: LifePathTag[],
    nextLog: LifeLogEntry[],
    seedValue: number,
  ) => {
    if (!nextId) {
      finish(nextStats, nextTags, nextLog, seedValue);
      return;
    }
    setSteps((value) => value + 1);
    setNodeId(nextId);
  };

  /** 走完一步之后：先看要不要插一件突发事件，没有就进下一关或收尾。 */
  const advance = (
    nextStats: LifeStats,
    nextTags: LifePathTag[],
    index: number,
    nextLog: LifeLogEntry[],
    seedValue: number,
    nextId: string | undefined,
  ) => {
    const event = rollEvent(nextStats, nextTags, index, usedEvents.current, Math.random);
    if (event) {
      usedEvents.current.add(event.id);
      pendingNext.current = nextId;
      setCurrent(event);
      return;
    }
    proceed(nextId, nextStats, nextTags, nextLog, seedValue);
  };

  const choose = (optionIndex: number) => {
    if (stage !== 'play' || current) return;
    const node = nodeById(nodeId);
    if (!node) return;
    const option = node.options[optionIndex];
    // 每项加成带 ±15% 浮动：同一套选择也不会每次都长一样
    const nextStats = applyOptionEffects(stats, option, Math.random);
    const nextTags = mergeTags(tags, option.tags);
    const nextLog: LifeLogEntry[] = [
      ...log,
      { kind: 'stage', ref: node.id, optionId: option.id, ok: null, fame: nextStats.fame },
    ];
    setStats(nextStats);
    setTags(nextTags);
    setLog(nextLog);
    advance(nextStats, nextTags, steps, nextLog, seed, option.next);
  };

  /** 为突发事件拍板（赌一把在这里掷骰子）。 */
  const chooseEvent = (optionIndex: number) => {
    if (!current) return;
    const option = current.options[optionIndex];
    const result = resolveEventOption(option);
    const nextStats = applyEffects(stats, result.effects);
    const nextTags = mergeTags(tags, result.tags);
    const entry: LifeLogEntry = {
      kind: 'event',
      ref: current.id,
      optionId: option.id,
      ok: result.ok,
      fame: nextStats.fame,
    };
    setStats(nextStats);
    setTags(nextTags);
    setLog([...log, entry]);
    setOutcome(entry);
  };

  const continueAfterEvent = () => {
    const nextId = pendingNext.current;
    pendingNext.current = undefined;
    setCurrent(null);
    setOutcome(null);
    proceed(nextId, stats, tags, log, seed);
  };

  const openPoster = async () => {
    if (!ending) return;
    setPosterBusy(true);
    setPosterError('');
    try {
      const matchedName = identityOf(matchedId)?.name ?? matchedId;
      const canvas = await renderLifePoster(stats, ending, matchedId, {
        kicker: t('seiyuuLife.poster.kicker'),
        title: t('seiyuuLife.poster.title'),
        subtitle: t('seiyuuLife.endings.' + ending.id + '.name'),
        endingDesc: t('seiyuuLife.endings.' + ending.id + '.desc'),
        odds: t('seiyuuLife.odds', { value: (odds[ending.id] ?? 0).toFixed(1) }),
        statsTitle: t('seiyuuLife.result.statsTitle'),
        timelineTitle: t('seiyuuLife.timeline'),
        matchTitle: t('seiyuuLife.result.matchTitle'),
        matchReason: t('seiyuuLife.matchReason', {
          name: matchedName,
          reason: t('seiyuuLife.endings.' + ending.id + '.reason'),
        }),
        statLabels: Object.fromEntries(LIFE_STAT_KEYS.map((key) => [key, t('seiyuuLife.stats.' + key)])),
        timeline: log.slice(0, 5).map((entry) => ({
          title: t(logTitleKey(entry)),
          label: t(logLabelKey(entry)),
        })),
        site: t('common.siteName'),
        hint: t('seiyuuLife.poster.hint'),
        qrCaption: t('seiyuuLife.poster.qrCaption'),
      });
      canvasRef.current = canvas;
      setPosterUrl(canvas.toDataURL('image/png'));
    } catch {
      setPosterError(t('seiyuuLife.poster.failed'));
    } finally {
      setPosterBusy(false);
    }
  };

  const savePoster = async () => {
    if (!canvasRef.current) return;
    try {
      await downloadPoster(canvasRef.current, posterFileName(LIFE_POSTER_PREFIX));
    } catch {
      setPosterError(t('seiyuuLife.poster.failed'));
    }
  };

  const share = () => {
    if (!ending) return;
    shareToQq({
      url: window.location.href,
      title: t('seiyuuLife.result.shareTitle'),
      summary: t('seiyuuLife.result.shareSummary', { ending: t('seiyuuLife.endings.' + ending.id + '.name') }),
      site: t('common.siteName'),
    });
  };

  const currentNode = nodeById(nodeId);
  /** 效果渲染成小标签（阶段选项、事件选项、赌注的两个分支共用）。 */
  const effectChips = (effects: Partial<LifeStats>) =>
    LIFE_STAT_KEYS.filter((key) => effects[key]).map((key) => (
      <span key={key} className={`lf-chip${(effects[key] ?? 0) > 0 ? ' is-up' : ' is-down'}`}>
        {t('seiyuuLife.stats.' + key)}
        {(effects[key] ?? 0) > 0 ? ` +${effects[key]}` : ` ${effects[key]}`}
      </span>
    ));

  return (
    <Page
      title={t('seiyuuLife.title')}
      icon={<Sparkles size={17} />}
      homeTo={SITE_HOME}
      className="life-page"
    >
      {stage === 'intro' && (
        <div className="card ly-intro">
          <p className="ly-kicker">{t('seiyuuLife.kicker')}</p>
          <p>{t('seiyuuLife.intro')}</p>
          <ol className="ly-steps">
            <li>{t('seiyuuLife.rule1')}</li>
            <li>{t('seiyuuLife.rule2')}</li>
            <li>{t('seiyuuLife.rule3')}</li>
            <li>{t('seiyuuLife.rule4')}</li>
          </ol>
          <button type="button" className="btn btn-primary" onClick={start}>
            <Sparkles size={16} />
            {t('seiyuuLife.start')}
          </button>
        </div>
      )}

      {stage === 'play' && currentNode && !current && (
        <div className="lf-play">
          <div className="ly-hud">
            <span className="ly-hud-step">
              {t('seiyuuLife.hud.stage', { index: steps + 1 })}
            </span>
          </div>

          <ul className="lf-stats" aria-label={t('seiyuuLife.result.statsTitle')}>
            {LIFE_STAT_KEYS.map((key) => (
              <li key={key} className="lf-stat">
                <span className="lf-stat-label">{t('seiyuuLife.stats.' + key)}</span>
                <span className="lf-stat-bar" aria-hidden="true">
                  <span className="lf-stat-fill" style={{ width: `${stats[key]}%` }} />
                </span>
                <span className="lf-stat-value">{stats[key]}</span>
              </li>
            ))}
          </ul>

          <h2 className="lf-question">{t('seiyuuLife.stages.' + currentNode.id + '.title')}</h2>

          <div className="lf-options">
            {currentNode.options.map((option, index) => (
              <button
                key={option.id}
                type="button"
                className="lf-option"
                onClick={() => choose(index)}
              >
                <span className="lf-option-label">
                  {t('seiyuuLife.stages.' + currentNode.id + '.options.' + option.id + '.label')}
                </span>
                <span className="lf-option-effects">{effectChips(option.effects)}</span>
                <ArrowRight size={16} className="lf-option-arrow" aria-hidden="true" />
              </button>
            ))}
          </div>
        </div>
      )}

      {stage === 'play' && current && (
        <div className="lf-play lf-event">
          <p className="lf-event-kicker">
            <Zap size={14} aria-hidden="true" /> {t('seiyuuLife.eventKicker')}
          </p>
          <h2 className="lf-question">{t('seiyuuLife.events.' + current.id + '.title')}</h2>
          <p className="muted lf-event-desc">{t('seiyuuLife.events.' + current.id + '.desc')}</p>

          {outcome ? (
            <div className={`lf-outcome${outcome.ok === false ? ' is-bad' : ' is-good'}`}>
              <p className="lf-outcome-title">
                {outcome.ok === true && (
                  <>
                    <Check size={16} aria-hidden="true" /> {t('seiyuuLife.risk.success')}
                  </>
                )}
                {outcome.ok === false && (
                  <>
                    <X size={16} aria-hidden="true" /> {t('seiyuuLife.risk.failure')}
                  </>
                )}
                {outcome.ok === null && (
                  <>
                    <Zap size={16} aria-hidden="true" /> {t('seiyuuLife.eventResult')}
                  </>
                )}
              </p>
              <p className="lf-outcome-text">
                {t(logLabelKey(outcome))}
                <span className="lf-outcome-effects">
                  {effectChips(
                    (() => {
                      const chosen = current.options.find((option) => option.id === outcome.optionId);
                      if (!chosen) return {};
                      if (!chosen.risk) return chosen.effects ?? {};
                      return outcome.ok ? chosen.risk.success : chosen.risk.failure;
                    })(),
                  )}
                </span>
              </p>
              <div className="ly-actions">
                <button type="button" className="btn btn-primary" onClick={continueAfterEvent}>
                  {t('seiyuuLife.next')}
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          ) : (
            <div className="lf-options">
              {current.options.map((option, index) => (
                <button key={option.id} type="button" className="lf-option" onClick={() => chooseEvent(index)}>
                  <span className="lf-option-label">
                    {t('seiyuuLife.events.' + current.id + '.options.' + option.id)}
                  </span>
                  <span className="lf-option-effects">
                    {option.risk ? (
                      <>
                        <span className="lf-chip is-gamble">
                          {t('seiyuuLife.risk.chance', { value: Math.round(option.risk.chance * 100) })}
                        </span>
                        {effectChips(option.risk.success)}
                        <span className="lf-chip is-down">{t('seiyuuLife.risk.failure')}</span>
                        {effectChips(option.risk.failure)}
                      </>
                    ) : (
                      effectChips(option.effects ?? {})
                    )}
                  </span>
                  <ArrowRight size={16} className="lf-option-arrow" aria-hidden="true" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {stage === 'result' && ending && (
        <div className="lf-result">
          <p className="ly-kicker">{t('seiyuuLife.poster.kicker')}</p>
          <h2 className="lf-ending-name">{t('seiyuuLife.endings.' + ending.id + '.name')}</h2>
          <p className="lf-odds">{t('seiyuuLife.odds', { value: (odds[ending.id] ?? 0).toFixed(1) })}</p>
          <p className="muted lf-ending-desc">{t('seiyuuLife.endings.' + ending.id + '.desc')}</p>

          <h3 className="lf-block-title">{t('seiyuuLife.result.statsTitle')}</h3>
          <ul className="lf-stats is-final">
            {LIFE_STAT_KEYS.map((key) => (
              <li key={key} className="lf-stat">
                <span className="lf-stat-label">{t('seiyuuLife.stats.' + key)}</span>
                <span className="lf-stat-bar" aria-hidden="true">
                  <span className="lf-stat-fill" style={{ width: `${stats[key]}%` }} />
                </span>
                <span className="lf-stat-value">{stats[key]}</span>
              </li>
            ))}
          </ul>

          <h3 className="lf-block-title">{t('seiyuuLife.timeline')}</h3>
          <ol className="lf-timeline">
            {log.map((entry, index) => (
              <li key={`${entry.ref}-${entry.optionId}-${index}`} className={`lf-timeline-item is-${entry.kind}`}>
                <span className="lf-timeline-stage">{t(logTitleKey(entry))}</span>
                <span className="lf-timeline-choice">
                  {t(logLabelKey(entry))}
                  {entry.ok === true && <span className="lf-chip is-up">{t('seiyuuLife.risk.success')}</span>}
                  {entry.ok === false && <span className="lf-chip is-down">{t('seiyuuLife.risk.failure')}</span>}
                </span>
              </li>
            ))}
          </ol>

          <h3 className="lf-block-title">{t('seiyuuLife.result.matchTitle')}</h3>
          <figure className="lf-match">
            <img
              className="lf-match-photo"
              src={photoOf(matchedId)}
              alt={identityOf(matchedId)?.name ?? matchedId}
              loading="lazy"
              decoding="async"
            />
            <figcaption>
              <span className="lf-match-name">{identityOf(matchedId)?.name ?? matchedId}</span>
              <span className="lf-match-role">{identityOf(matchedId)?.characters[0]?.name ?? ''}</span>
              <span className="lf-match-reason">
                {t('seiyuuLife.matchReason', {
                  name: identityOf(matchedId)?.name ?? matchedId,
                  reason: t('seiyuuLife.endings.' + ending.id + '.reason'),
                })}
              </span>
            </figcaption>
          </figure>

          {posterError && <p className="ly-notice is-error">{posterError}</p>}

          <div className="ly-actions">
            <button type="button" className="btn btn-primary" onClick={openPoster} disabled={posterBusy}>
              <Download size={16} />
              {posterBusy ? t('seiyuuLife.poster.building') : t('seiyuuLife.poster.open')}
            </button>
            <button type="button" className="btn lf-share-qq" onClick={share}>
              <Share2 size={16} />
              {t('common.shareToQq')}
            </button>
            <button type="button" className="btn btn-ghost" onClick={start}>
              <RotateCcw size={16} />
              {t('seiyuuLife.result.restart')}
            </button>
          </div>
        </div>
      )}

      {posterUrl && (
        <ModalPortal>
          <div className="lf-poster-backdrop" role="dialog" aria-modal="true" aria-label={t('seiyuuLife.poster.label')}>
            <div className="lf-poster-panel">
              <button
                type="button"
                className="lf-poster-close"
                onClick={() => setPosterUrl('')}
                aria-label={t('common.close')}
              >
                <X size={18} />
              </button>
              <img className="lf-poster-image" src={posterUrl} alt={t('seiyuuLife.poster.label')} />
              <p className="muted lf-poster-hint">{t('seiyuuLife.poster.saveHint')}</p>
              <div className="ly-actions">
                <button type="button" className="btn btn-primary" onClick={savePoster}>
                  <Download size={16} />
                  {t('seiyuuLife.poster.download')}
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
