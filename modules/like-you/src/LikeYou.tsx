import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Check, Download, Heart, RotateCcw, Share2, X } from 'lucide-react';
import type { ProjectId } from '@seiyuu/shared';
import { Page } from '@seiyuu/game-sdk';
import { ModalPortal } from '@seiyuu/game-sdk';
import { SITE_HOME } from '@seiyuu/game-sdk';
import { FANDOM_PROJECT_IDS, fandomPool } from '@seiyuu/game-sdk';
import {
  LIKE_YOU_POSTER_PREFIX,
  LIKE_YOU_TARGET,
  createDeck,
  identityOf,
  nextRound,
  photoOf,
  randomSeed,
  resolveRound,
  type DuelOutcome,
  type DuelRound,
} from './model/likeYou';
import { useAutoAdvance } from '@seiyuu/game-sdk';
import { shareToQq } from '@seiyuu/game-sdk';
import { POSTER_COLORS, POSTER_CONTENT_WIDTH, POSTER_FONT, POSTER_PADDING, POSTER_WIDTH, createPosterCanvas, downloadPoster, drawCoverImage, drawFittedText, drawPosterChips, drawPosterFooter, drawPosterHeader, loadPosterImage, loadPosterImages, paintBackdrop, posterFileName, qrImagePath, roundRectPath, waitForPosterFonts } from '@seiyuu/game-sdk';

type Stage = 'intro' | 'duel' | 'result';

/**
 * 选完到翻到下一轮之间的停顿。
 *
 * 比通用的 240ms 稍长：这一屏要读完「谁坐进席位、谁出局」，太快等于没看见。
 */
const DUEL_STEP_DELAY_MS = 860;

interface PosterText {
  kicker: string;
  title: string;
  subtitle: string;
  /** 榜单上出现的企划标签。 */
  tags: string[];
  /** 底部一行统计（候选池 → 席位）。 */
  statLine: string;
  site: string;
  hint: string;
  qrCaption: string;
}

/**
 * 画竖版九宫格海报。
 *
 * 格高按「可用高度」反解出来，而不是写死比例 —— 页脚加了二维码之后
 * 内容区变矮，固定比例会把最后一行挤出画布。
 */
async function renderNinePoster(ids: string[], text: PosterText): Promise<HTMLCanvasElement> {
  await waitForPosterFonts();
  const { canvas, ctx } = createPosterCanvas();
  paintBackdrop(ctx);

  const top = drawPosterHeader(ctx, {
    kicker: text.kicker,
    title: text.title,
    subtitle: text.subtitle,
  });

  // 企划标签：顺便把标题和九宫格之间的空隙填上，海报不会显得上重下轻。
  const tagsHeight = text.tags.length
    ? drawPosterChips(ctx, text.tags, { y: top, maxLines: 1 })
    : 0;
  const gridTop = top + (tagsHeight ? tagsHeight + 26 : 0);

  const qrImage = await loadPosterImage(qrImagePath('like-you'));
  const bottom = drawPosterFooter(ctx, {
    site: text.site,
    hint: text.hint,
    qr: qrImage ? { image: qrImage, caption: text.qrCaption } : undefined,
  });

  const images = await loadPosterImages(ids.map(photoOf));
  const columns = 3;
  const gap = 26;
  const labelHeight = 68;
  const statHeight = 62;
  const cellWidth = (POSTER_CONTENT_WIDTH - gap * (columns - 1)) / columns;
  const rows = Math.max(1, Math.ceil(ids.length / columns));
  const available = bottom - gridTop - 16 - statHeight;
  const maxCellHeight = (available - gap * (rows - 1)) / rows - labelHeight;
  const cellHeight = Math.max(
    120,
    Math.min(Math.round(cellWidth * 1.25), Math.round(maxCellHeight)),
  );
  const rowHeight = cellHeight + labelHeight + gap;
  const gridHeight = rows * rowHeight - gap;
  const startY = gridTop + Math.max(0, (bottom - gridTop - statHeight - gridHeight) / 2);

  ids.forEach((id, index) => {
    const col = index % columns;
    const row = Math.floor(index / columns);
    const x = POSTER_PADDING + col * (cellWidth + gap);
    const y = startY + row * rowHeight;
    const image = images[index];

    if (image) {
      drawCoverImage(ctx, image, x, y, cellWidth, cellHeight, {
        radius: 20,
        ring: { color: POSTER_COLORS.frame, width: 3 },
        align: 'top',
      });
    } else {
      ctx.fillStyle = POSTER_COLORS.card;
      roundRectPath(ctx, x, y, cellWidth, cellHeight, 20);
      ctx.fill();
    }

    // 左上角序号徽标
    ctx.beginPath();
    ctx.arc(x + 32, y + 32, 23, 0, Math.PI * 2);
    ctx.fillStyle = POSTER_COLORS.accent;
    ctx.fill();
    ctx.textAlign = 'center';
    ctx.fillStyle = POSTER_COLORS.onAccent;
    ctx.font = `800 25px ${POSTER_FONT}`;
    ctx.fillText(String(index + 1), x + 32, y + 41);
    ctx.textAlign = 'left';

    const identity = identityOf(id);
    drawFittedText(
      ctx,
      identity?.name ?? id,
      x + cellWidth / 2,
      y + cellHeight + 42,
      33,
      800,
      cellWidth,
      POSTER_COLORS.text,
    );
    const role = identity?.characters[0]?.name;
    if (role) {
      drawFittedText(
        ctx,
        role,
        x + cellWidth / 2,
        y + cellHeight + 72,
        23,
        500,
        cellWidth,
        POSTER_COLORS.textSoft,
      );
    }
  });

  ctx.textAlign = 'center';
  ctx.fillStyle = POSTER_COLORS.textSoft;
  ctx.font = `600 26px ${POSTER_FONT}`;
  ctx.fillText(text.statLine, POSTER_WIDTH / 2, bottom - 28);
  ctx.textAlign = 'left';

  return canvas;
}

/**
 * 「我喜欢你」：一次出两张，二选一；名额满了变成挑战者踢馆。
 * 逻辑见 config/likeYou.ts，文案见 i18n 的 likeYou.*。
 */
export default function LikeYou() {
  const { t } = useTranslation();
  const autoAdvance = useAutoAdvance();
  const [stage, setStage] = useState<Stage>('intro');
  const [projects, setProjects] = useState<ProjectId[]>(() => [...FANDOM_PROJECT_IDS]);
  const [roster, setRoster] = useState<string[]>([]);
  const [board, setBoard] = useState<string[]>([]);
  const [round, setRound] = useState<DuelRound | null>(null);
  const [outcome, setOutcome] = useState<DuelOutcome | null>(null);
  const [posterUrl, setPosterUrl] = useState('');
  const [posterBusy, setPosterBusy] = useState(false);
  const [posterError, setPosterError] = useState('');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  /** 勾选的企划合起来就是本次的候选池。 */
  const pool = useMemo(() => fandomPool(projects), [projects]);
  const total = pool.length;
  const enough = total >= LIKE_YOU_TARGET;

  const start = () => {
    const deck = createDeck(randomSeed(), pool);
    setRoster(deck);
    setBoard([]);
    setOutcome(null);
    setRound(nextRound(deck, []));
    setPosterUrl('');
    setPosterError('');
    canvasRef.current = null;
    setStage('duel');
  };

  const choose = (id: string) => {
    if (!round || outcome) return;
    const result = resolveRound(round, board, id);
    setBoard(result.board);
    setOutcome(result);
    setRoster(roster.filter((item) => !round.pair.includes(item)));
  };

  const next = () => {
    setOutcome(null);
    const following = nextRound(roster, board);
    if (!following) {
      setStage('result');
      return;
    }
    setRound(following);
  };

  /**
   * 选完直接出下一对，不给回头路（没有「重选」也没有「上一轮」）。
   *
   * 只在「选完自动换题」开关打开时生效；玩家关掉该偏好就退回手动点「继续」。
   */
  useEffect(() => {
    if (!autoAdvance || !outcome) return;
    const timer = window.setTimeout(() => {
      setOutcome(null);
      const following = nextRound(roster, board);
      if (!following) {
        setStage('result');
        return;
      }
      setRound(following);
    }, DUEL_STEP_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [autoAdvance, outcome, roster, board]);

  const openPoster = async () => {
    setPosterBusy(true);
    setPosterError('');
    try {
      const canvas = await renderNinePoster(board, {
        kicker: t('likeYou.poster.kicker'),
        title: t('likeYou.poster.title'),
        subtitle: t('likeYou.poster.subtitle', { count: board.length }),
        tags: Array.from(
          new Set(
            board
              .map((id) => identityOf(id)?.project)
              .filter((project): project is ProjectId => Boolean(project))
              .map((project) => t('whoYouAre.projects.' + project)),
          ),
        ),
        statLine: t('likeYou.poster.statLine', { total, target: LIKE_YOU_TARGET }),
        site: t('common.siteName'),
        hint: t('likeYou.poster.hint'),
        qrCaption: t('likeYou.poster.qrCaption'),
      });
      canvasRef.current = canvas;
      setPosterUrl(canvas.toDataURL('image/png'));
    } catch {
      setPosterError(t('likeYou.poster.failed'));
    } finally {
      setPosterBusy(false);
    }
  };

  const savePoster = async () => {
    if (!canvasRef.current) return;
    try {
      await downloadPoster(canvasRef.current, posterFileName(LIKE_YOU_POSTER_PREFIX));
    } catch {
      setPosterError(t('likeYou.poster.failed'));
    }
  };

  const share = () => {
    shareToQq({
      url: window.location.href,
      title: t('likeYou.result.shareTitle'),
      summary: t('likeYou.result.shareSummary', { count: board.length }),
      site: t('common.siteName'),
    });
  };

  const feedbackText = (() => {
    if (!outcome) return '';
    const winner = identityOf(outcome.winner)?.name ?? outcome.winner;
    const loser = identityOf(outcome.eliminated)?.name ?? outcome.eliminated;
    return t('likeYou.feedback.admit', { winner, loser });
  })();

  return (
    <Page
      title={t('likeYou.title')}
      icon={<Heart size={17} />}
      homeTo={SITE_HOME}
      className="like-you-page"
    >
      {stage === 'intro' && (
        <div className="card ly-intro">
          <p className="ly-kicker">{t('likeYou.kicker')}</p>
          <p>{t('likeYou.intro')}</p>
          <ol className="ly-steps">
            <li>{t('likeYou.step1', { target: LIKE_YOU_TARGET })}</li>
            <li>{t('likeYou.step2', { target: LIKE_YOU_TARGET })}</li>
            <li>{t('likeYou.step3', { total })}</li>
          </ol>

          <div className="ly-picks">
            <p className="ly-picks-title">{t('likeYou.projects.title')}</p>
            <div className="ly-chips">
              {FANDOM_PROJECT_IDS.map((id) => {
                const active = projects.includes(id);
                return (
                  <button
                    key={id}
                    type="button"
                    className={`ly-chip${active ? ' is-active' : ''}`}
                    aria-pressed={active}
                    onClick={() =>
                      setProjects((prev) =>
                        prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
                      )
                    }
                  >
                    {active ? <Check size={14} /> : <X size={14} />}
                    {t('whoYouAre.projects.' + id)}
                  </button>
                );
              })}
            </div>
            <p className={`ly-picks-note${enough ? ' muted' : ' is-warn'}`}>
              {enough
                ? t('likeYou.projects.hint', { count: total, target: LIKE_YOU_TARGET })
                : t('likeYou.projects.tooFew', { count: total, target: LIKE_YOU_TARGET })}
            </p>
          </div>

          <button type="button" className="btn btn-primary" onClick={start} disabled={!enough}>
            <Heart size={16} />
            {t('likeYou.start')}
          </button>
        </div>
      )}

      {stage === 'duel' && round && (
        <div className="ly-duel">
          <div className="ly-hud">
            <span className="ly-hud-step">
              {t('likeYou.hud.round', { round: Math.min(board.length + 1, LIKE_YOU_TARGET), target: LIKE_YOU_TARGET })}
            </span>
            <span className="ly-hud-picked">
              {t('likeYou.hud.picked', { count: board.length, target: LIKE_YOU_TARGET })}
            </span>
          </div>

          <p className="muted ly-pick-hint">{t('likeYou.openHint')}</p>

          <div className="ly-pair">
            {round.pair.map((id) => {
              const identity = identityOf(id);
              const isPicked = outcome?.winner === id;
              const isOut = outcome?.eliminated === id;
              const stateClass = isOut ? ' is-out' : isPicked ? ' is-in' : '';
              return (
                <button
                  key={id}
                  type="button"
                  className={`ly-pair-card${stateClass}`}
                  onClick={() => choose(id)}
                  disabled={Boolean(outcome)}
                >
                  <img
                    className="ly-pair-photo"
                    src={photoOf(id)}
                    alt={identity?.name ?? id}
                    decoding="async"
                  />
                  <span className="ly-pair-name">{identity?.name ?? id}</span>
                  <span className="ly-pair-role">{identity?.characters[0]?.name ?? ''}</span>
                </button>
              );
            })}
            <span className="ly-pair-vs" aria-hidden="true">
              VS
            </span>
          </div>

          {outcome && (
            <>
              <p className="ly-feedback">{feedbackText}</p>
              {!autoAdvance && (
                <div className="ly-actions">
                  <button type="button" className="btn btn-primary" onClick={next}>
                    {t('likeYou.continue')}
                    <ArrowRight size={16} />
                  </button>
                </div>
              )}
            </>
          )}

          {posterError && <p className="ly-notice is-error">{posterError}</p>}
        </div>
      )}

      {stage === 'result' && (
        <div className="ly-result">
          <p className="ly-kicker">{t('likeYou.poster.kicker')}</p>
          <h2 className="ly-result-title">{t('likeYou.result.title')}</h2>
          <p className="muted">{t('likeYou.result.subtitle', { count: board.length })}</p>

          <div className="ly-grid is-final">
            {board.map((id, index) => {
              const identity = identityOf(id);
              return (
                <figure key={id} className="ly-final-card">
                  <span className="ly-final-rank">{index + 1}</span>
                  <img
                    className="ly-face-photo"
                    src={photoOf(id)}
                    alt={identity?.name ?? id}
                    loading="lazy"
                    decoding="async"
                  />
                  <figcaption>
                    <span className="ly-face-name">{identity?.name ?? id}</span>
                    <span className="ly-final-role">{identity?.characters[0]?.name ?? ''}</span>
                  </figcaption>
                </figure>
              );
            })}
          </div>

          {posterError && <p className="ly-notice is-error">{posterError}</p>}

          <div className="ly-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={openPoster}
              disabled={posterBusy || board.length === 0}
            >
              <Download size={16} />
              {posterBusy ? t('likeYou.poster.building') : t('likeYou.poster.open')}
            </button>
            <button type="button" className="btn ly-share-qq" onClick={share}>
              <Share2 size={16} />
              {t('common.shareToQq')}
            </button>
            <button type="button" className="btn btn-ghost" onClick={start}>
              <RotateCcw size={16} />
              {t('likeYou.result.restart')}
            </button>
          </div>
        </div>
      )}

      {posterUrl && (
        <ModalPortal>
          <div
            className="ly-poster-backdrop"
            role="dialog"
            aria-modal="true"
            aria-label={t('likeYou.poster.label')}
          >
            <div className="ly-poster-panel">
              <button
                type="button"
                className="ly-poster-close"
                onClick={() => setPosterUrl('')}
                aria-label={t('common.close')}
              >
                <X size={18} />
              </button>
              <img className="ly-poster-image" src={posterUrl} alt={t('likeYou.poster.label')} />
              <p className="muted ly-poster-hint">{t('likeYou.poster.saveHint')}</p>
              <div className="ly-actions">
                <button type="button" className="btn btn-primary" onClick={savePoster}>
                  <Download size={16} />
                  {t('likeYou.poster.download')}
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
