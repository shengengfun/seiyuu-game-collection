import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Download,
  Grid3x3,
  RotateCcw,
  Search,
  Share2,
  Shuffle,
  Sparkles,
  UserRound,
  X,
} from 'lucide-react';
import { PROJECTS, SEIYUU_BY_ID, seiyuuPhotoPath } from '@seiyuu/shared';
import Page from '../components/Page';
import ModalPortal from '../components/ModalPortal';
import { SITE_HOME } from '../config/routes';
import { FANDOM_IDS, FANDOM_PROJECT_IDS } from '../config/fandom';
import {
  BINGO_CELLS,
  BINGO_FREE_INDEX,
  BINGO_LINES,
  BINGO_POSTER_PREFIX,
  BINGO_SIZE,
  completedCells,
  completedLineIndices,
  countLines,
  createCard,
  randomSeed,
  rankOf,
  type BingoCard,
} from '../config/seiyuuBingo';
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

type Stage = 'pick' | 'play';

interface BingoPosterText {
  kicker: string;
  title: string;
  subtitle: string;
  rankName: string;
  rankDesc: string;
  stats: string;
  /** 已勾选格数，用来画卡面上方那条进度。 */
  progress: { done: number; total: number };
  site: string;
  hint: string;
  qrCaption: string;
  cellTexts: string[];
}

function photoOf(id: string): string {
  return seiyuuPhotoPath(id);
}

function nameOf(id: string): string {
  return SEIYUU_BY_ID.get(id)?.name ?? id;
}

/** 在指定矩形里居中绘制多行文字，最多 3 行。 */
function drawCellText(
  ctx: CanvasRenderingContext2D,
  text: string,
  centerX: number,
  centerY: number,
  maxWidth: number,
  fontSize: number,
  lineHeight: number,
  color: string,
  maxLines = 3,
): void {
  ctx.font = `600 ${fontSize}px ${POSTER_FONT}`;
  const lines = wrapText(ctx, text, maxWidth).slice(0, maxLines);
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  const startY = centerY - ((lines.length - 1) * lineHeight) / 2;
  lines.forEach((line, index) => {
    ctx.fillText(line, centerX, startY + index * lineHeight + fontSize * 0.36);
  });
  ctx.textAlign = 'left';
}

/**
 * 画竖版宾果卡海报：称号 + 5×5 卡（中心格是选的声优）+ 统计。
 *
 * 不画穿格子的连线 —— 连成一片的格子用加重描边表达，卡面更干净。
 */
async function renderBingoPoster(
  card: BingoCard,
  checked: boolean[],
  seiyuuId: string,
  text: BingoPosterText,
): Promise<HTMLCanvasElement> {
  await waitForPosterFonts();
  const { canvas, ctx } = createPosterCanvas();
  paintBackdrop(ctx);

  const top = drawPosterHeader(ctx, {
    kicker: text.kicker,
    title: text.title,
    subtitle: text.subtitle,
  });
  const qrImage = await loadPosterImage(qrImagePath('bingo'));
  const bottom = drawPosterFooter(ctx, {
    site: text.site,
    hint: text.hint,
    qr: qrImage ? { image: qrImage, caption: text.qrCaption } : undefined,
  });

  const portrait = await loadPosterImage(photoOf(seiyuuId));
  const lined = completedCells(checked);

  const gap = 14;
  const cellSize = Math.floor((POSTER_CONTENT_WIDTH - gap * (BINGO_SIZE - 1)) / BINGO_SIZE);
  const boardSize = cellSize * BINGO_SIZE + gap * (BINGO_SIZE - 1);
  const rankBlock = 214;
  const statsBlock = 62;
  const totalHeight = rankBlock + boardSize + statsBlock;
  const startY = top + Math.max(0, (bottom - top - totalHeight) / 2);
  const boardX = POSTER_PADDING + (POSTER_CONTENT_WIDTH - boardSize) / 2;

  drawFittedText(
    ctx,
    text.rankName,
    POSTER_PADDING + POSTER_CONTENT_WIDTH / 2,
    startY + 66,
    62,
    900,
    POSTER_CONTENT_WIDTH,
    POSTER_COLORS.accent,
  );
  drawFittedText(
    ctx,
    text.rankDesc,
    POSTER_PADDING + POSTER_CONTENT_WIDTH / 2,
    startY + 112,
    26,
    500,
    POSTER_CONTENT_WIDTH,
    POSTER_COLORS.textSoft,
  );

  // 勾选进度：25 格扫一眼就知道玩得多认真。
  if (text.progress.total > 0) {
    const ratio = Math.max(0, Math.min(1, text.progress.done / text.progress.total));
    const barX = POSTER_PADDING;
    const barWidth = POSTER_CONTENT_WIDTH;
    const barHeight = 20;
    const barY = startY + 156;
    roundRectPath(ctx, barX, barY, barWidth, barHeight, barHeight / 2);
    ctx.fillStyle = 'rgba(36, 20, 34, 0.09)';
    ctx.fill();
    if (ratio > 0) {
      ctx.save();
      roundRectPath(ctx, barX, barY, barWidth, barHeight, barHeight / 2);
      ctx.clip();
      ctx.fillStyle = POSTER_COLORS.accent;
      ctx.fillRect(barX, barY, barWidth * ratio, barHeight);
      ctx.restore();
    }
  }

  const boardY = startY + rankBlock;

  card.forEach((cell, index) => {
    const x = boardX + (index % BINGO_SIZE) * (cellSize + gap);
    const y = boardY + Math.floor(index / BINGO_SIZE) * (cellSize + gap);
    const on = checked[index];
    const weight = lined.has(index) ? 4 : on ? 3 : 2;

    roundRectPath(ctx, x, y, cellSize, cellSize, 16);
    ctx.fillStyle = on ? POSTER_COLORS.highlight : POSTER_COLORS.card;
    ctx.fill();
    ctx.lineWidth = weight;
    ctx.strokeStyle = on ? POSTER_COLORS.accent : POSTER_COLORS.cardBorder;
    ctx.stroke();

    // 中心格：画她本人的照片
    if (cell.free) {
      const inset = 12;
      const size = cellSize - inset * 2;
      if (portrait) {
        drawCoverImage(ctx, portrait, x + inset, y + inset, size, size, {
          radius: 'circle',
          ring: { color: POSTER_COLORS.accent, width: 4 },
          align: 'top',
        });
      } else {
        ctx.beginPath();
        ctx.arc(x + cellSize / 2, y + cellSize / 2, size / 2, 0, Math.PI * 2);
        ctx.fillStyle = POSTER_COLORS.card;
        ctx.fill();
      }
      return;
    }

    drawCellText(
      ctx,
      text.cellTexts[index] ?? '',
      x + cellSize / 2,
      y + cellSize / 2,
      cellSize - 26,
      20,
      26,
      on ? POSTER_COLORS.text : POSTER_COLORS.textFaint,
    );
  });

  drawFittedText(
    ctx,
    text.stats,
    POSTER_PADDING + POSTER_CONTENT_WIDTH / 2,
    boardY + boardSize + 46,
    28,
    700,
    POSTER_CONTENT_WIDTH,
    POSTER_COLORS.text,
  );

  return canvas;
}

/**
 * 「声优粉宾果」：先选一位声优，卡面中心就是她；勾选符合自己的行为，按连线数给称号。
 * 卡面见 config/seiyuuBingo.ts，文案见 i18n 的 seiyuuBingo.*。
 */
export default function SeiyuuBingo() {
  const { t } = useTranslation();
  const [stage, setStage] = useState<Stage>('pick');
  const [tab, setTab] = useState<string>('all');
  const [query, setQuery] = useState('');
  const [seiyuuId, setSeiyuuId] = useState('');
  const [seed, setSeed] = useState(() => randomSeed());
  const card = useMemo(() => createCard(seed), [seed]);
  const [checked, setChecked] = useState<boolean[]>(() =>
    Array.from({ length: BINGO_CELLS }, (_, index) => index === BINGO_FREE_INDEX),
  );
  const [posterUrl, setPosterUrl] = useState('');
  const [posterBusy, setPosterBusy] = useState(false);
  const [posterError, setPosterError] = useState('');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const lines = countLines(checked);
  const checkedCount = checked.filter(Boolean).length;
  const rank = rankOf(lines);

  /** 每个企划各有多少人（tab 上的数字，不随搜索变）。 */
  const projectCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const id of FANDOM_IDS) {
      const project = SEIYUU_BY_ID.get(id)?.project ?? '';
      map.set(project, (map.get(project) ?? 0) + 1);
    }
    return map;
  }, []);

  /** 当前 tab + 搜索框筛出来的人。 */
  const pool = useMemo(() => {
    const base =
      tab === 'all' ? FANDOM_IDS : FANDOM_IDS.filter((id) => SEIYUU_BY_ID.get(id)?.project === tab);
    const keyword = query.trim().toLowerCase();
    if (!keyword) return base;
    return base.filter((id) => {
      const identity = SEIYUU_BY_ID.get(id);
      if (!identity) return false;
      return (
        identity.name.toLowerCase().includes(keyword) ||
        identity.nameJa.toLowerCase().includes(keyword) ||
        identity.romaji.toLowerCase().includes(keyword)
      );
    });
  }, [tab, query]);

  const cellText = (index: number) =>
    card[index].free ? '' : t(`seiyuuBingo.behaviors.${card[index].key}`);

  const chooseSeiyuu = (id: string) => {
    setSeiyuuId(id);
    setSeed(randomSeed());
    setChecked(Array.from({ length: BINGO_CELLS }, (_, index) => index === BINGO_FREE_INDEX));
    setPosterUrl('');
    setPosterError('');
    canvasRef.current = null;
    setStage('play');
  };

  const toggle = (index: number) => {
    if (card[index].free) return;
    const next = [...checked];
    next[index] = !next[index];
    setChecked(next);
  };

  const shuffleCard = () => {
    setSeed(randomSeed());
    setPosterUrl('');
    setPosterError('');
    canvasRef.current = null;
    setChecked(Array.from({ length: BINGO_CELLS }, (_, index) => index === BINGO_FREE_INDEX));
  };

  const resetChecks = () => {
    setChecked(Array.from({ length: BINGO_CELLS }, (_, index) => index === BINGO_FREE_INDEX));
  };

  const openPoster = async () => {
    setPosterBusy(true);
    setPosterError('');
    try {
      const canvas = await renderBingoPoster(card, checked, seiyuuId, {
        kicker: t('seiyuuBingo.poster.kicker'),
        title: t('seiyuuBingo.poster.title'),
        subtitle: t('seiyuuBingo.poster.subtitle', { name: nameOf(seiyuuId) }),
        rankName: t(`seiyuuBingo.ranks.${rank.id}.name`),
        rankDesc: t(`seiyuuBingo.ranks.${rank.id}.desc`),
        progress: { done: checkedCount, total: BINGO_CELLS },
        stats: t('seiyuuBingo.poster.stats', {
          name: nameOf(seiyuuId),
          checked: checkedCount,
          total: BINGO_CELLS,
          lines,
        }),
        site: t('common.siteName'),
        hint: t('seiyuuBingo.poster.hint'),
        qrCaption: t('seiyuuBingo.poster.qrCaption'),
        cellTexts: card.map((_cell, index) => cellText(index)),
      });
      canvasRef.current = canvas;
      setPosterUrl(canvas.toDataURL('image/png'));
    } catch {
      setPosterError(t('seiyuuBingo.poster.failed'));
    } finally {
      setPosterBusy(false);
    }
  };

  const savePoster = async () => {
    if (!canvasRef.current) return;
    try {
      await downloadPoster(canvasRef.current, posterFileName(BINGO_POSTER_PREFIX));
    } catch {
      setPosterError(t('seiyuuBingo.poster.failed'));
    }
  };

  const share = () => {
    shareToQq({
      url: window.location.href,
      title: t('seiyuuBingo.shareTitle'),
      summary: t('seiyuuBingo.shareSummary', {
        name: nameOf(seiyuuId),
        rank: t(`seiyuuBingo.ranks.${rank.id}.name`),
        lines,
      }),
      site: t('common.siteName'),
    });
  };

  return (
    <Page
      title={t('seiyuuBingo.title')}
      icon={<Grid3x3 size={17} />}
      homeTo={SITE_HOME}
      className="seiyuu-bingo-page"
    >
      {stage === 'pick' && (
        <div className="sb-pick">
          <p className="sb-kicker">{t('seiyuuBingo.kicker')}</p>
          <p className="muted sb-intro">{t('seiyuuBingo.pickIntro')}</p>

          <label className="sb-search">
            <Search size={15} aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('seiyuuBingo.pickSearch')}
              aria-label={t('seiyuuBingo.pickSearch')}
            />
          </label>

          <div className="sb-tabs" role="tablist" aria-label={t('seiyuuBingo.pickTitle')}>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'all'}
              className={`sb-tab${tab === 'all' ? ' is-active' : ''}`}
              onClick={() => setTab('all')}
            >
              {t('seiyuuBingo.pickAll')}
              <span className="sb-tab-count">{FANDOM_IDS.length}</span>
            </button>
            {FANDOM_PROJECT_IDS.map((id) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                className={`sb-tab${tab === id ? ' is-active' : ''}`}
                onClick={() => setTab(id)}
              >
                {t(`whoYouAre.projects.${id}`)}
                <span className="sb-tab-count">{projectCounts.get(id) ?? 0}</span>
              </button>
            ))}
          </div>

          {pool.length === 0 ? (
            <p className="sb-empty">{t('seiyuuBingo.pickEmpty')}</p>
          ) : (
            <div className="sb-roster">
              {pool.map((id) => (
                <button key={id} type="button" className="sb-face" onClick={() => chooseSeiyuu(id)}>
                  <img
                    className="sb-face-photo"
                    src={photoOf(id)}
                    alt={nameOf(id)}
                    loading="lazy"
                    decoding="async"
                  />
                  <span className="sb-face-name">{nameOf(id)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {stage === 'play' && (
        <div className="sb-wrap">
          <div className="sb-head">
            <div className="sb-head-copy">
              <p className="sb-kicker">{t('seiyuuBingo.kicker')}</p>
              <p className="muted sb-intro">{t('seiyuuBingo.intro', { name: nameOf(seiyuuId) })}</p>
            </div>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setStage('pick')}>
              <UserRound size={14} />
              {t('seiyuuBingo.actions.changeSeiyuu')}
            </button>
          </div>

          <div className="sb-hud">
            <span className="sb-hud-checked">
              {t('seiyuuBingo.hud.checked', { checked: checkedCount, total: BINGO_CELLS })}
            </span>
            <span className="sb-hud-lines">{t('seiyuuBingo.hud.lines', { count: lines })}</span>
          </div>
          <div className="sb-board" role="grid" aria-label={t('seiyuuBingo.title')}>
            {card.map((cell, index) => {
              if (cell.free) {
                return (
                  <div key="free" className="sb-cell is-on is-free" role="gridcell">
                    <img
                      className="sb-center-photo"
                      src={photoOf(seiyuuId)}
                      alt={nameOf(seiyuuId)}
                      decoding="async"
                    />
                  </div>
                );
              }
              const on = checked[index];
              return (
                <button
                  key={`${seed}-${index}`}
                  type="button"
                  role="gridcell"
                  className={`sb-cell${on ? ' is-on' : ''}`}
                  aria-pressed={on}
                  onClick={() => toggle(index)}
                >
                  <span className="sb-cell-text">{cellText(index)}</span>
                  {on && (
                    <span className="sb-cell-mark" aria-hidden="true">
                      <Sparkles size={12} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="sb-rank">
            <span className="sb-rank-label">{t('seiyuuBingo.rankLabel')}</span>
            <strong className="sb-rank-name">{t(`seiyuuBingo.ranks.${rank.id}.name`)}</strong>
            <span className="sb-rank-lines">
              {t('seiyuuBingo.rankLines', { count: lines, total: BINGO_LINES.length })}
            </span>
            <span className="sb-rank-desc">{t(`seiyuuBingo.ranks.${rank.id}.desc`)}</span>
            <span className="sb-rank-track" aria-hidden="true">
              <span
                className="sb-rank-fill"
                style={{ width: `${Math.min(100, (lines / BINGO_LINES.length) * 100)}%` }}
              />
            </span>
          </div>

          {posterError && <p className="sb-notice is-error">{posterError}</p>}

          <div className="sb-actions is-primary">
            <button
              type="button"
              className="btn btn-primary"
              onClick={openPoster}
              disabled={posterBusy}
            >
              <Download size={16} />
              {posterBusy ? t('seiyuuBingo.poster.building') : t('seiyuuBingo.poster.open')}
            </button>
            <button type="button" className="btn sb-share-qq" onClick={share}>
              <Share2 size={16} />
              {t('common.shareToQq')}
            </button>
          </div>

          <div className="sb-actions is-secondary">
            <button type="button" className="btn btn-ghost" onClick={shuffleCard}>
              <Shuffle size={16} />
              {t('seiyuuBingo.actions.shuffle')}
            </button>
            <button type="button" className="btn btn-ghost" onClick={resetChecks}>
              <RotateCcw size={16} />
              {t('seiyuuBingo.actions.reset')}
            </button>
          </div>
        </div>
      )}

      {posterUrl && (
        <ModalPortal>
          <div
            className="sb-poster-backdrop"
            role="dialog"
            aria-modal="true"
            aria-label={t('seiyuuBingo.poster.label')}
          >
            <div className="sb-poster-panel">
              <button
                type="button"
                className="sb-poster-close"
                onClick={() => setPosterUrl('')}
                aria-label={t('common.close')}
              >
                <X size={18} />
              </button>
              <img className="sb-poster-image" src={posterUrl} alt={t('seiyuuBingo.poster.label')} />
              <p className="muted sb-poster-hint">{t('seiyuuBingo.poster.saveHint')}</p>
              <div className="sb-actions">
                <button type="button" className="btn btn-primary" onClick={savePoster}>
                  <Download size={16} />
                  {t('seiyuuBingo.poster.download')}
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
