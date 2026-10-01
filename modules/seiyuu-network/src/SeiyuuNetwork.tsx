import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, Heart, Link2, Network, RotateCcw, Share2, X } from 'lucide-react';
import { Page } from '@seiyuu/game-sdk';
import { ModalPortal } from '@seiyuu/game-sdk';
import { SITE_HOME } from '@seiyuu/game-sdk';
import {
  ALL_SEIYUU_IDS,
  INITIAL_LIVES,
  NETWORK_POSTER_PREFIX,
  agencyNameOf,
  coStarsOf,
  identityOf,
  photoOf,
  pickQuestion,
  projectNameOf,
  roleLineOf,
  spiralLayout,
  type NetworkQuestion,
} from './model/seiyuuNetwork';
import { shareToQq } from '@seiyuu/game-sdk';
import { POSTER_COLORS, POSTER_FONT, POSTER_WIDTH, createPosterCanvas, downloadPoster, drawCoverImage, drawFittedText, drawPosterChips, drawPosterFooter, drawPosterHeader, loadPosterImage, loadPosterImages, paintBackdrop, posterFileName, qrImagePath, waitForPosterFonts } from '@seiyuu/game-sdk';

type Stage = 'intro' | 'play' | 'result';

interface GraphNode {
  id: string;
  x: number;
  y: number;
  r: number;
}

interface GraphLayout {
  nodes: GraphNode[];
  lines: { from: GraphNode; to: GraphNode }[];
}

/** 螺旋布局 + 连线索引，页面 SVG 与海报共用一套坐标。 */
function buildGraph(
  members: string[],
  edges: [string, string][],
  size: number,
  padding: number,
  maxNodeRadius = size * 0.09,
): GraphLayout {
  const radius = size / 2 - padding;
  const layout = spiralLayout(members.length);
  // 节点半径跟着圆周上的可用间距走：人越多头像越小，避免糊成一团。
  const spacing = (2 * Math.PI * radius) / Math.max(3, members.length);
  const nodeRadius = Math.max(8, Math.min(maxNodeRadius, spacing * 0.42));
  const nodes: GraphNode[] = members.map((id, index) => ({
    id,
    x: size / 2 + layout[index].x * radius,
    y: size / 2 + layout[index].y * radius,
    r: index === 0 ? nodeRadius * 1.25 : nodeRadius,
  }));
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const lines = edges
    .map(([a, b]) => ({ from: byId.get(a), to: byId.get(b) }))
    .filter((line): line is { from: GraphNode; to: GraphNode } => Boolean(line.from && line.to));
  return { nodes, lines };
}

/** 页面内实时更新的关系网缩略图。 */
function NetworkGraph({
  members,
  edges,
  size,
  prefix,
  highlight,
  label,
}: {
  members: string[];
  edges: [string, string][];
  size: number;
  prefix: string;
  highlight?: string;
  label: string;
}) {
  const graph = useMemo(() => buildGraph(members, edges, size, 34), [members, edges, size]);
  return (
    <svg className="sn-graph" viewBox={`0 0 ${size} ${size}`} role="img" aria-label={label}>
      {graph.lines.map((line, index) => (
        <line
          key={`${line.from.id}-${line.to.id}-${index}`}
          x1={line.from.x}
          y1={line.from.y}
          x2={line.to.x}
          y2={line.to.y}
          className="sn-graph-line"
        />
      ))}
      {graph.nodes.map((node) => {
        const clipId = `${prefix}-clip-${node.id}`;
        return (
          <g key={node.id}>
            <clipPath id={clipId}>
              <circle cx={node.x} cy={node.y} r={node.r} />
            </clipPath>
            <image
              href={photoOf(node.id)}
              x={node.x - node.r}
              y={node.y - node.r}
              width={node.r * 2}
              height={node.r * 2}
              clipPath={`url(#${clipId})`}
              preserveAspectRatio="xMidYMin slice"
            />
            <circle
              cx={node.x}
              cy={node.y}
              r={node.r}
              className={`sn-graph-ring${highlight === node.id ? ' is-active' : ''}`}
            />
          </g>
        );
      })}
    </svg>
  );
}

interface NetworkPosterText {
  kicker: string;
  title: string;
  subtitle: string;
  /** 链子里出现的企划标签。 */
  tags: string[];
  /** 底部一行统计（连成几人、剩几条命）。 */
  statLine: string;
  site: string;
  hint: string;
  qrCaption: string;
}

/** 画竖版关系网海报。 */
async function renderNetworkPoster(
  nodes: string[],
  edges: [string, string][],
  text: NetworkPosterText,
): Promise<HTMLCanvasElement> {
  await waitForPosterFonts();
  const { canvas, ctx } = createPosterCanvas();
  paintBackdrop(ctx);

  const top = drawPosterHeader(ctx, {
    kicker: text.kicker,
    title: text.title,
    subtitle: text.subtitle,
  });
  const qrImage = await loadPosterImage(qrImagePath('network'));
  const bottom = drawPosterFooter(ctx, {
    site: text.site,
    hint: text.hint,
    qr: qrImage ? { image: qrImage, caption: text.qrCaption } : undefined,
  });

  const size = POSTER_WIDTH;
  const tagsHeight = text.tags.length
    ? drawPosterChips(ctx, text.tags, { y: top, maxLines: 1 })
    : 0;
  /** 底部留给统计行的高度。 */
  const statHeight = 58;
  const graphTop = top + (tagsHeight ? tagsHeight + 22 : 0);
  const graph = buildGraph(nodes, edges, size, 152, 56);
  const offsetY = graphTop + Math.max(0, (bottom - statHeight - graphTop - size) / 2);
  const images = await loadPosterImages(nodes.map(photoOf));
  const imageById = new Map(nodes.map((id, index) => [id, images[index]]));

  ctx.save();
  ctx.strokeStyle = 'rgba(109, 140, 0, 0.45)';
  ctx.lineWidth = 5;
  for (const line of graph.lines) {
    ctx.beginPath();
    ctx.moveTo(line.from.x, line.from.y + offsetY);
    ctx.lineTo(line.to.x, line.to.y + offsetY);
    ctx.stroke();
  }
  ctx.restore();

  graph.nodes.forEach((node, index) => {
    const image = imageById.get(node.id);
    const x = node.x - node.r;
    const y = node.y + offsetY - node.r;
    const isStart = index === 0;
    if (image) {
      drawCoverImage(ctx, image, x, y, node.r * 2, node.r * 2, {
        radius: 'circle',
        ring: {
          color: isStart ? POSTER_COLORS.accent : POSTER_COLORS.frame,
          width: isStart ? 6 : 4,
        },
        align: 'top',
      });
    } else {
      ctx.beginPath();
      ctx.arc(node.x, node.y + offsetY, node.r, 0, Math.PI * 2);
      ctx.fillStyle = POSTER_COLORS.card;
      ctx.fill();
    }
    if (isStart) {
      drawFittedText(
        ctx,
        identityOf(node.id)?.name ?? '',
        node.x,
        node.y + offsetY + node.r + 42,
        30,
        800,
        node.r * 4,
        POSTER_COLORS.accent,
      );
    } else {
      // 其余人也要写上名字：只有一堆圆头像，分享出去认不出谁是谁。
      const label = identityOf(node.id)?.name ?? '';
      if (label) {
        const labelY = node.y + offsetY + node.r + 32;
        ctx.textAlign = 'center';
        ctx.font = `700 24px ${POSTER_FONT}`;
        ctx.lineJoin = 'round';
        ctx.lineWidth = 7;
        ctx.strokeStyle = 'rgba(255, 253, 248, 0.94)';
        ctx.strokeText(label, node.x, labelY);
        ctx.fillStyle = POSTER_COLORS.text;
        ctx.fillText(label, node.x, labelY);
        ctx.textAlign = 'left';
      }
    }
  });

  ctx.textAlign = 'center';
  ctx.fillStyle = POSTER_COLORS.textSoft;
  ctx.font = `600 26px ${POSTER_FONT}`;
  ctx.fillText(text.statLine, POSTER_WIDTH / 2, bottom - 26);
  ctx.textAlign = 'left';

  return canvas;
}

/** 起点优先挑共演关系多的人，保证网络能连起来。 */
function pickStart(): string {
  const pool = ALL_SEIYUU_IDS.filter((id) => coStarsOf(id).length >= 8);
  const candidates = pool.length ? pool : ALL_SEIYUU_IDS;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

/**
 * 「声优关系网」：从一个起点出发，靠选对共演/同企划的人把网络连起来。
 * 数据与出题规则见 config/seiyuuNetwork.ts，文案见 i18n 的 seiyuuNetwork.*。
 */
export default function SeiyuuNetwork() {
  const { t } = useTranslation();
  const [stage, setStage] = useState<Stage>('intro');
  const [members, setMembers] = useState<string[]>([]);
  const [edges, setEdges] = useState<[string, string][]>([]);
  const [lives, setLives] = useState(INITIAL_LIVES);
  const [question, setQuestion] = useState<NetworkQuestion | null>(null);
  const [feedback, setFeedback] = useState<{ correct: boolean; text: string } | null>(null);
  const [pickedWrong, setPickedWrong] = useState('');
  const [posterUrl, setPosterUrl] = useState('');
  const [posterBusy, setPosterBusy] = useState(false);
  const [posterError, setPosterError] = useState('');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const start = () => {
    const first = pickStart();
    const initial = [first];
    const quiz = pickQuestion(initial);
    setMembers(initial);
    setEdges([]);
    setLives(INITIAL_LIVES);
    setQuestion(quiz);
    setFeedback(null);
    setPickedWrong('');
    setPosterUrl('');
    setPosterError('');
    canvasRef.current = null;
    setStage(quiz ? 'play' : 'result');
  };

  const answer = (optionId: string) => {
    if (!question || feedback) return;
    const correct = optionId === question.answerId;
    if (correct) {
      setMembers([...members, optionId]);
      setEdges([...edges, [question.sourceId, optionId]]);
      setFeedback({
        correct: true,
        text:
          question.kind === 'coStar'
            ? t('seiyuuNetwork.feedback.correctCoStar', {
                a: identityOf(question.sourceId)?.name ?? '',
                b: identityOf(optionId)?.name ?? '',
                works: question.works.join('、'),
              })
            : question.kind === 'sameAgency'
              ? t('seiyuuNetwork.feedback.correctSameAgency', {
                  a: identityOf(question.sourceId)?.name ?? '',
                  b: identityOf(optionId)?.name ?? '',
                  agency: question.agency,
                })
              : t('seiyuuNetwork.feedback.correctSameProject', {
                  a: identityOf(question.sourceId)?.name ?? '',
                  b: identityOf(optionId)?.name ?? '',
                  project: projectNameOf(optionId),
                }),
      });
      return;
    }
    setLives(lives - 1);
    setPickedWrong(optionId);
    setFeedback({
      correct: false,
      text: t('seiyuuNetwork.feedback.wrong', { name: identityOf(question.answerId)?.name ?? '' }),
    });
  };

  const next = () => {
    setFeedback(null);
    setPickedWrong('');
    if (lives <= 0) {
      setStage('result');
      return;
    }
    const quiz = pickQuestion(members);
    if (!quiz) {
      setStage('result');
      return;
    }
    setQuestion(quiz);
  };

  const openPoster = async () => {
    setPosterBusy(true);
    setPosterError('');
    try {
      const canvas = await renderNetworkPoster(members, edges, {
        kicker: t('seiyuuNetwork.poster.kicker'),
        title: t('seiyuuNetwork.poster.title'),
        subtitle: t('seiyuuNetwork.poster.subtitle', { count: Math.max(0, members.length - 1) }),
        tags: Array.from(new Set(members.map((id) => projectNameOf(id)))).slice(0, 4),
        statLine: t('seiyuuNetwork.poster.statLine', {
          members: members.length,
          lives: Math.max(0, lives),
        }),
        site: t('common.siteName'),
        hint: t('seiyuuNetwork.poster.hint'),
        qrCaption: t('seiyuuNetwork.poster.qrCaption'),
      });
      canvasRef.current = canvas;
      setPosterUrl(canvas.toDataURL('image/png'));
    } catch {
      setPosterError(t('seiyuuNetwork.poster.failed'));
    } finally {
      setPosterBusy(false);
    }
  };

  const savePoster = async () => {
    if (!canvasRef.current) return;
    try {
      await downloadPoster(canvasRef.current, posterFileName(NETWORK_POSTER_PREFIX));
    } catch {
      setPosterError(t('seiyuuNetwork.poster.failed'));
    }
  };

  const share = () => {
    shareToQq({
      url: window.location.href,
      title: t('seiyuuNetwork.shareTitle'),
      summary: t('seiyuuNetwork.shareSummary', { count: Math.max(0, members.length - 1) }),
      site: t('common.siteName'),
    });
  };

  const links = Math.max(0, members.length - 1);

  return (
    <Page
      title={t('seiyuuNetwork.title')}
      icon={<Network size={17} />}
      homeTo={SITE_HOME}
      className="seiyuu-network-page"
    >
      {stage === 'intro' && (
        <div className="card sn-intro">
          <p className="sn-kicker">{t('seiyuuNetwork.kicker')}</p>
          <p>{t('seiyuuNetwork.intro')}</p>
          <ul className="sn-rules">
            <li>{t('seiyuuNetwork.rule1')}</li>
            <li>{t('seiyuuNetwork.rule2', { lives: INITIAL_LIVES })}</li>
            <li>{t('seiyuuNetwork.rule3')}</li>
          </ul>
          <button type="button" className="btn btn-primary" onClick={start}>
            <Link2 size={16} />
            {t('seiyuuNetwork.start')}
          </button>
        </div>
      )}

      {stage === 'play' && question && (
        <div className="sn-play">
          <div className="sn-hud">
            <span className="sn-lives" aria-label={t('seiyuuNetwork.hud.lives', { count: lives })}>
              {Array.from({ length: INITIAL_LIVES }, (_, index) => (
                <Heart
                  key={index}
                  size={15}
                  className={index < lives ? 'sn-heart is-on' : 'sn-heart'}
                  aria-hidden="true"
                />
              ))}
            </span>
            <span className="sn-count">{t('seiyuuNetwork.hud.connected', { count: members.length })}</span>
          </div>

          <NetworkGraph
            members={members}
            edges={edges}
            size={220}
            prefix="sn-play"
            highlight={question.sourceId}
            label={t('seiyuuNetwork.graphLabel')}
          />

          <div className="sn-source">
            <img
              className="sn-source-photo"
              src={photoOf(question.sourceId)}
              alt={identityOf(question.sourceId)?.name ?? ''}
              decoding="async"
            />
            <div className="sn-source-copy">
              <span className="sn-source-name">{identityOf(question.sourceId)?.name}</span>
              <span className="sn-source-role">{roleLineOf(question.sourceId)}</span>
              <span className="sn-source-project">
                {[projectNameOf(question.sourceId), agencyNameOf(question.sourceId)]
                  .filter(Boolean)
                  .join(' · ')}
              </span>
            </div>
          </div>

          <p className="sn-question">
            {question.kind === 'coStar'
              ? t('seiyuuNetwork.question.coStar', { name: identityOf(question.sourceId)?.name ?? '' })
              : question.kind === 'sameAgency'
                ? t('seiyuuNetwork.question.sameAgency', {
                    name: identityOf(question.sourceId)?.name ?? '',
                  })
                : t('seiyuuNetwork.question.sameProject', {
                    name: identityOf(question.sourceId)?.name ?? '',
                  })}
          </p>

          <div className="sn-options">
            {question.options.map((id) => {
              const isAnswer = id === question.answerId;
              const stateClass = feedback
                ? isAnswer
                  ? ' is-correct'
                  : id === pickedWrong
                    ? ' is-wrong'
                    : ''
                : '';
              return (
                <button
                  key={id}
                  type="button"
                  className={`sn-option${stateClass}`}
                  onClick={() => answer(id)}
                  disabled={Boolean(feedback)}
                >
                  <img
                    className="sn-option-photo"
                    src={photoOf(id)}
                    alt={identityOf(id)?.name ?? id}
                    loading="lazy"
                    decoding="async"
                  />
                  <span className="sn-option-name">{identityOf(id)?.name ?? id}</span>
                  <span className="sn-option-role">{identityOf(id)?.characters[0]?.name ?? ''}</span>
                </button>
              );
            })}
          </div>

          {feedback && (
            <>
              <p className={`sn-feedback${feedback.correct ? ' is-correct' : ' is-wrong'}`}>
                {feedback.text}
              </p>
              <div className="sn-actions">
                <button type="button" className="btn btn-primary" onClick={next}>
                  {t('seiyuuNetwork.continue')}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {stage === 'result' && (
        <div className="sn-result">
          <p className="sn-kicker">{t('seiyuuNetwork.poster.kicker')}</p>
          <h2 className="sn-result-title">{t('seiyuuNetwork.result.title')}</h2>
          <p className="muted">{t('seiyuuNetwork.result.network', { count: links })}</p>

          <NetworkGraph
            members={members}
            edges={edges}
            size={340}
            prefix="sn-result"
            label={t('seiyuuNetwork.graphLabel')}
          />

          <ul className="sn-members">
            {members.map((id) => (
              <li key={id}>
                <img src={photoOf(id)} alt="" loading="lazy" decoding="async" />
                <span>{identityOf(id)?.name ?? id}</span>
              </li>
            ))}
          </ul>

          {posterError && <p className="sn-notice is-error">{posterError}</p>}

          <div className="sn-actions">
            <button type="button" className="btn btn-primary" onClick={openPoster} disabled={posterBusy}>
              <Download size={16} />
              {posterBusy ? t('seiyuuNetwork.poster.building') : t('seiyuuNetwork.poster.open')}
            </button>
            <button type="button" className="btn sn-share-qq" onClick={share}>
              <Share2 size={16} />
              {t('common.shareToQq')}
            </button>
            <button type="button" className="btn btn-ghost" onClick={start}>
              <RotateCcw size={16} />
              {t('seiyuuNetwork.result.restart')}
            </button>
          </div>
        </div>
      )}

      {posterUrl && (
        <ModalPortal>
          <div
            className="sn-poster-backdrop"
            role="dialog"
            aria-modal="true"
            aria-label={t('seiyuuNetwork.poster.label')}
          >
            <div className="sn-poster-panel">
              <button
                type="button"
                className="sn-poster-close"
                onClick={() => setPosterUrl('')}
                aria-label={t('common.close')}
              >
                <X size={18} />
              </button>
              <img
                className="sn-poster-image"
                src={posterUrl}
                alt={t('seiyuuNetwork.poster.label')}
              />
              <p className="muted sn-poster-hint">{t('seiyuuNetwork.poster.saveHint')}</p>
              <div className="sn-actions">
                <button type="button" className="btn btn-primary" onClick={savePoster}>
                  <Download size={16} />
                  {t('seiyuuNetwork.poster.download')}
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
