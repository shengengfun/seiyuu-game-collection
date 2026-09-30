import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PROJECT_IDS } from '@seiyuu/shared';
import {
  AlertTriangle,
  Award,
  Briefcase,
  Building2,
  Coins,
  Download,
  Link2,
  Minus,
  Package,
  Plus,
  RotateCcw,
  Save,
  Share2,
  Sparkles,
  Star,
  TrendingUp,
  Users,
  UserPlus,
  X,
} from 'lucide-react';
import Page from '../components/Page';
import ModalPortal from '../components/ModalPortal';
import { SITE_HOME } from '../config/routes';
import {
  AGENCY_DIFFICULTIES,
  AGENCY_EVENT_TONES,
  AGENCY_ITEMS,
  AGENCY_LENGTHS,
  AGENCY_ORIGINS,
  AGENCY_ORIGIN_RULES,
  AGENCY_POSTER_PREFIX,
  AGENT_ATTRS,
  AGENT_ATTR_MAX,
  AGENCY_RULES,
  AGENCY_TRAITS,
  AGENT_STREAK_BONUS,
  AGENT_STREAK_MAX,
  AGENCY_ACTIONS,
  EASTER_EGG_CHANCE,
  ITEM_KEYS,
  LENGTH_MONTHS,
  UNIT_FORM_COST,
  UNIT_LIMIT,
  UNIT_MAX_MEMBERS,
  UNIT_MIN_MEMBERS,
  UNIT_NAME_MAX,
  assignJob,
  buyItem,
  clampPoints,
  createAgency,
  defaultPoints,
  defaultUnitName,
  emptyPoints,
  eventDefOf,
  formUnit,
  disbandUnit,
  nameOf,
  photoOf,
  pointsFromSeiValueAxes,
  randomSeed,
  recruit,
  reportOf,
  refreshCandidatesNow,
  resolveEvent,
  skipRecruit,
  successRate,
  talentGrade,
  unitFameOf,
  unitNameOf,
  useItem,
  type AgencyDifficulty,
  type AgencyEventEffects,
  type AgencyJob,
  type AgencyLength,
  type AgencyLogEntry,
  type AgencyOrigin,
  type AgencyReport,
  type AgencyState,
  type AgencyTalent,
  type AgentPoints,
  type ItemKey,
} from '../config/seiyuuAgency';
import { shareToQq } from '../utils/share';
import {
  AGENCY_ALL_SLOTS,
  AGENCY_AUTO_SLOT,
  clearSave,
  loadGame,
  loadSaveMeta,
  saveGame,
  saveOwnerKey,
  type AgencySaveMeta,
  type AgencySaveSlot,
} from '../config/agencySaves';
import { useAuth } from '../store/auth';
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
  loadPosterImages,
  paintBackdrop,
  posterFileName,
  qrImagePath,
  roundRectPath,
  waitForPosterFonts,
  wrapText,
} from '../utils/poster';

type Stage = 'intro' | 'play' | 'report';

interface AgencyPosterText {
  kicker: string;
  title: string;
  subtitle: string;
  scoreLabel: string;
  topTitle: string;
  /** 招牌成员卡第二行：称号／特质名（按 report.top 的顺序对应）。 */
  topTagLines: string[];
  unitTitle: string;
  unitLines: string[];
  awardTitle: string;
  awards: string[];
  easterTitle: string;
  easterLines: string[];
  highlightTitle: string;
  highlights: string[];
  noHighlight: string;
  stats: string;
  site: string;
  hint: string;
  qrCaption: string;
}

/** 画「事务所年报」竖版海报：等级章 + 声望分 + 招牌成员 + 奖项 + 彩蛋 + 年度高光。 */
async function renderAgencyPoster(
  report: AgencyReport,
  talentName: (id: string) => string,
  text: AgencyPosterText,
): Promise<HTMLCanvasElement> {
  await waitForPosterFonts();
  const { canvas, ctx } = createPosterCanvas();
  paintBackdrop(ctx);

  const top = drawPosterHeader(ctx, { kicker: text.kicker, title: text.title, subtitle: text.subtitle });
  const qrImage = (await loadPosterImages([qrImagePath('agency')]))[0];
  const bottom = drawPosterFooter(ctx, {
    site: text.site,
    hint: text.hint,
    qr: qrImage ? { image: qrImage, caption: text.qrCaption } : undefined,
  });

  const pad = POSTER_PADDING;
  const width = POSTER_CONTENT_WIDTH;
  const centerX = pad + width / 2;
  let y = top + 4;

  const radius = 78;
  ctx.beginPath();
  ctx.arc(centerX, y + radius, radius, 0, Math.PI * 2);
  ctx.fillStyle = POSTER_COLORS.highlight;
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = POSTER_COLORS.accent;
  ctx.stroke();
  drawFittedText(ctx, report.grade, centerX, y + radius + 30, 92, 900, radius * 1.4, POSTER_COLORS.accent);
  y += radius * 2 + 22;

  drawFittedText(ctx, text.scoreLabel, centerX, y, 24, 600, width, POSTER_COLORS.textSoft);
  drawFittedText(ctx, String(report.score), centerX, y + 88, 108, 900, width, POSTER_COLORS.text);
  y += 136;

  // 招牌成员
  ctx.fillStyle = POSTER_COLORS.accent;
  ctx.font = `800 28px ${POSTER_FONT}`;
  ctx.fillText(text.topTitle, pad, y + 26);
  y += 44;

  const images = await loadPosterImages(report.top.map((item) => photoOf(item.id)));
  const rowHeight = 108;
  report.top.forEach((item, index) => {
    const rowY = y + index * (rowHeight + 10);
    ctx.fillStyle = POSTER_COLORS.card;
    roundRectPath(ctx, pad, rowY, width, rowHeight, 22);
    ctx.fill();
    ctx.strokeStyle = POSTER_COLORS.cardBorder;
    ctx.lineWidth = 2;
    ctx.stroke();

    const image = images[index];
    const photoSize = 80;
    if (image) {
      drawCoverImage(ctx, image, pad + 16, rowY + (rowHeight - photoSize) / 2, photoSize, photoSize, {
        radius: 'circle',
        ring: { color: POSTER_COLORS.frame, width: 3 },
        align: 'top',
      });
    }
    ctx.textAlign = 'left';
    ctx.fillStyle = POSTER_COLORS.text;
    ctx.font = `800 36px ${POSTER_FONT}`;
    ctx.fillText(talentName(item.id), pad + photoSize + 40, rowY + 50);
    ctx.fillStyle = POSTER_COLORS.textFaint;
    ctx.font = `600 22px ${POSTER_FONT}`;
    const tagLine = text.topTagLines[index];
    const extras = [...item.titles, ...item.traits].length;
    ctx.fillText(
      tagLine ? `${item.fame} · ${tagLine}` : `${item.fame} · ${extras}`,
      pad + photoSize + 40,
      rowY + 84,
    );
    drawFittedText(ctx, item.grade, pad + width - 48, rowY + 74, 56, 900, 70, POSTER_COLORS.accent);
  });
  y += report.top.length * (rowHeight + 10) + 12;

  // 彩蛋
  if (text.easterLines.length) {
    ctx.fillStyle = POSTER_COLORS.accent;
    ctx.font = `800 28px ${POSTER_FONT}`;
    ctx.fillText(text.easterTitle, pad, y + 26);
    y += 46;
    ctx.font = `600 25px ${POSTER_FONT}`;
    ctx.fillStyle = POSTER_COLORS.text;
    for (const line of text.easterLines.slice(0, 2)) {
      const [wrapped] = wrapText(ctx, `★ ${line}`, width);
      ctx.fillText(wrapped, pad, y + 26);
      y += 36;
    }
    y += 8;
  }

  // 奖项
  if (text.awards.length) {
    ctx.fillStyle = POSTER_COLORS.accent;
    ctx.font = `800 28px ${POSTER_FONT}`;
    ctx.fillText(text.awardTitle, pad, y + 26);
    y += 46;
    ctx.font = `600 25px ${POSTER_FONT}`;
    ctx.fillStyle = POSTER_COLORS.textSoft;
    for (const line of wrapText(ctx, text.awards.join(' / '), width).slice(0, 3)) {
      ctx.fillText(line, pad, y + 26);
      y += 34;
    }
    y += 8;
  }

  // 年度高光
  ctx.fillStyle = POSTER_COLORS.accent;
  ctx.font = `800 28px ${POSTER_FONT}`;
  ctx.fillText(text.highlightTitle, pad, y + 26);
  y += 46;
  ctx.font = `600 25px ${POSTER_FONT}`;
  ctx.fillStyle = POSTER_COLORS.textSoft;
  const highlightLines = wrapText(
    ctx,
    text.highlights.length ? text.highlights.join(' / ') : text.noHighlight,
    width,
  ).slice(0, 3);
  highlightLines.forEach((line, index) => ctx.fillText(line, pad, y + 26 + index * 34));
  y += highlightLines.length * 34 + 20;

  // 组合（团名是玩家自己取的，海报上得写出来）
  if (text.unitLines.length) {
    ctx.fillStyle = POSTER_COLORS.accent;
    ctx.font = `800 28px ${POSTER_FONT}`;
    ctx.fillText(text.unitTitle, pad, y + 26);
    y += 46;
    ctx.font = `600 25px ${POSTER_FONT}`;
    ctx.fillStyle = POSTER_COLORS.textSoft;
    for (const line of wrapText(ctx, text.unitLines.join(' / '), width).slice(0, 2)) {
      ctx.fillText(line, pad, y + 26);
      y += 34;
    }
    y += 8;
  }

  // 底部统计（缩到页脚上方）
  drawFittedText(ctx, text.stats, centerX, Math.min(y + 16, bottom - 12), 24, 600, width, POSTER_COLORS.textFaint);

  return canvas;
}

/** 效果差异的小标签。 */
function effectChips(t: (key: string) => string, effects: AgencyEventEffects) {
  return (['cash', 'reputation', 'fame', 'stamina', 'skill', 'vocal', 'charm', 'loyalty'] as const)
    .filter((field) => effects[field])
    .map((field) => (
      <span key={field} className={`lf-chip${(effects[field] ?? 0) > 0 ? ' is-up' : ' is-down'}`}>
        {t('seiyuuAgency.stats.' + field)}
        {(effects[field] ?? 0) > 0 ? ` +${effects[field]}` : ` ${effects[field]}`}
      </span>
    ));
}

/** 经纪人可分配点数 = 难度基础点 + 事务所出身加成。 */
function pointTotalOf(difficulty: AgencyDifficulty, origin: AgencyOrigin): number {
  return AGENCY_RULES[difficulty].points + AGENCY_ORIGIN_RULES[origin].pointBonus;
}

/** 委托卡上那句难度 / 收益说明。 */
function offerMetaOf(t: (key: string, options?: Record<string, unknown>) => string, job: AgencyJob): string {
  if (job.safe && job.train) {
    return job.train === 'all'
      ? t('seiyuuAgency.offers.trainAll', { gain: job.gain })
      : t('seiyuuAgency.offers.train', { stat: t('seiyuuAgency.stats.' + job.train), gain: job.gain });
  }
  if (job.safe) {
    return job.stamina < 0
      ? `${t('seiyuuAgency.offers.safe')} · ${t('seiyuuAgency.offers.restHint', { value: Math.abs(job.stamina) })}`
      : t('seiyuuAgency.offers.safe');
  }
  return t('seiyuuAgency.offers.needStat', {
    stat: t('seiyuuAgency.stats.' + job.stat),
    value: job.difficulty,
  });
}

/** 成功率配色（≥70% 绿 / ≥45% 黄 / 其余红）。 */
function oddsClass(rate: number): string {
  if (rate >= 0.7) return ' is-good';
  if (rate >= 0.45) return ' is-mid';
  return ' is-bad';
}

/** 商店分类（纯展示分组）。 */
const ITEM_GROUPS: { key: 'growth' | 'showbiz' | 'safety'; items: ItemKey[] }[] = [
  { key: 'growth', items: ['trainingCamp', 'coach', 'healthCheck', 'giftTickets'] },
  { key: 'showbiz', items: ['publicity', 'photoShoot', 'fanEvent', 'scoutReport', 'rerollOffers'] },
  { key: 'safety', items: ['insurance', 'businessTrip'] },
];

/**
 * 「声优事务所经营」：选难度 / 回合长度 / 经纪人加点 → 12~36 个月的经营 → 年报。
 * 玩法说明见 config/agencyData.ts 与 config/agencySim.ts。
 */
export default function SeiyuuAgency() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const owner = saveOwnerKey(user?.id ?? null);
  const [stage, setStage] = useState<Stage>('intro');
  const [difficulty, setDifficulty] = useState<AgencyDifficulty>('normal');
  const [length, setLength] = useState<AgencyLength>('short');
  const [origin, setOrigin] = useState<AgencyOrigin>('legendary');
  const [agent, setAgent] = useState<AgentPoints>(() => emptyPoints());
  const [linked, setLinked] = useState<{
    code: string;
    points: AgentPoints;
    axes: { axis: string; percent: number }[];
  } | null>(null);
  const [codeInput, setCodeInput] = useState('');
  const [linkError, setLinkError] = useState('');
  const [state, setState] = useState<AgencyState | null>(null);
  const [report, setReport] = useState<AgencyReport | null>(null);
  const [selectedOffer, setSelectedOffer] = useState<number | null>(null);
  /** 需要点人的道具：正在等玩家选一位成员。 */
  const [targetItem, setTargetItem] = useState<ItemKey | null>(null);
  /** 组团模式：正在选的成员。 */
  const [unitPick, setUnitPick] = useState<string[] | null>(null);
  /** 组团时玩家取的名字（留空则用成员名拼）。 */
  const [unitName, setUnitName] = useState('');
  /** 弹窗：商店 / 背包 / 日志。 */
  const [modal, setModal] = useState<'shop' | 'bag' | 'log' | 'save' | null>(null);
  /** 存档槽摘要（打开存档弹窗时刷新）。 */
  const [saveSlots, setSaveSlots] = useState<Record<string, AgencySaveMeta | null>>({});
  /** 签约倾向（至多两个企划）。 */
  const [preferred, setPreferred] = useState<string[]>([]);
  const [notice, setNotice] = useState('');
  const [posterUrl, setPosterUrl] = useState('');
  const [posterBusy, setPosterBusy] = useState(false);
  const [posterError, setPosterError] = useState('');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const rule = AGENCY_RULES[difficulty];
  const originRule = AGENCY_ORIGIN_RULES[origin];
  const spent = AGENT_ATTRS.reduce((sum, attr) => sum + agent[attr], 0);
  /** 联动后点数由成绩码决定，不再手动分配。 */
  const total = linked ? spent : pointTotalOf(difficulty, origin);
  const left = total - spent;

  const switchDifficulty = (key: AgencyDifficulty) => {
    setDifficulty(key);
    setLinked(null);
    setAgent((current) => clampPoints(current));
    setLinkError('');
  };

  const switchOrigin = (key: AgencyOrigin) => {
    setOrigin(key);
    setLinked(null);
    setAgent((current) => clampPoints(current));
    setLinkError('');
  };

  /** 签约倾向：至多两个企划，抽人时优先出现。 */
  const togglePreferred = (id: string) => {
    setPreferred((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : current.length >= 2
          ? current
          : [...current, id],
    );
  };

  /** 刷新存档槽摘要。 */
  const refreshSaves = () => {
    const next: Record<string, AgencySaveMeta | null> = {};
    for (const slot of AGENCY_ALL_SLOTS) next[slot] = loadSaveMeta(owner, slot);
    setSaveSlots(next);
  };

  useEffect(() => {
    refreshSaves();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [owner]);

  /** 自动存档：每到新月份 / 每次结算后都写一份。 */
  useEffect(() => {
    if (stage !== 'play' || !state) return;
    saveGame(owner, AGENCY_AUTO_SLOT, state);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, state?.month, state?.log.length, state?.stage, owner]);

  /** 写入手动档。 */
  const writeSlot = (slot: AgencySaveSlot) => {
    if (!state) return;
    saveGame(owner, slot, state);
    refreshSaves();
    setNotice(t('seiyuuAgency.save.saved', { slot: slot === AGENCY_AUTO_SLOT ? t('seiyuuAgency.save.auto') : slot }));
  };

  /** 读档进局。 */
  const readSlot = (slot: AgencySaveSlot) => {
    const saved = loadGame(owner, slot);
    if (!saved) return;
    setState(saved);
    setSelectedOffer(null);
    setTargetItem(null);
    setUnitPick(null);
    setReport(null);
    setPosterUrl('');
    setNotice('');
    setModal(null);
    setStage('play');
  };

  const dropSlot = (slot: AgencySaveSlot) => {
    clearSave(owner, slot);
    refreshSaves();
  };

  /** 开局界面用：有存档就显示一个「继续上次」的自动档。 */
  const autoMeta = saveSlots[AGENCY_AUTO_SLOT] ?? null;

  const adjust = (attr: keyof AgentPoints, delta: number) => {
    if (linked) return;
    setAgent((current) => {
      const value = current[attr] + delta;
      const sum = AGENT_ATTRS.reduce((acc, key) => acc + (key === attr ? value : current[key]), 0);
      if (value < 0 || value > AGENT_ATTR_MAX || sum > total) return current;
      return clampPoints({ ...current, [attr]: value });
    });
  };

  /** 粘贴 SeiValue 成绩码 → 自动加点（动态 import，避免把测试数据打进这个 chunk）。 */
  const applyCode = async () => {
    setLinkError('');
    const code = codeInput.trim();
    if (!code) return;
    try {
      const seivalue = await import('../config/seivalue');
      const decoded = seivalue.decodeQuizCode(code);
      if (!decoded) {
        setLinkError(t('seiyuuAgency.agent.codeInvalid'));
        return;
      }
      const result = seivalue.scoreSeiValue(decoded.quiz, decoded.answers, decoded.duration);
      const axes = result.poles.map((pole) => ({ axis: pole.axis, percent: pole.percent }));
      const points = pointsFromSeiValueAxes(axes, rule.points + 1);
      setAgent(points);
      setLinked({ code, points, axes });
      setNotice('');
    } catch {
      setLinkError(t('seiyuuAgency.agent.codeInvalid'));
    }
  };

  const start = () => {
    const next = createAgency(randomSeed(), {
      difficulty,
      length,
      origin,
      preferredProjects: preferred,
      agent: linked ? undefined : agent,
      linkedCode: linked?.code,
      linkedAxes: linked?.axes,
    });
    setState(next);
    setSelectedOffer(null);
    setTargetItem(null);
    setUnitPick(null);
    setNotice('');
    setReport(null);
    setPosterUrl('');
    setPosterError('');
    canvasRef.current = null;
    setStage('play');
  };

  const finishIfDone = (next: AgencyState) => {
    if (next.stage === 'done') {
      setReport(reportOf(next));
      setStage('report');
      return true;
    }
    return false;
  };

  const sign = (candidateId: string) => {
    if (!state) return;
    setState(recruit(state, candidateId));
    setNotice('');
  };

  const skip = () => {
    if (!state) return;
    setState(skipRecruit(state));
    setNotice('');
  };

  /** 招募重抽（每次招募最多 3 次）。 */
  const rerollCandidates = () => {
    if (!state) return;
    const next = refreshCandidatesNow(state);
    if (next === state) {
      setNotice(t('seiyuuAgency.recruit.refreshEmpty'));
      return;
    }
    setState(next);
    setNotice('');
  };

  const assign = (talentId: string) => {
    if (!state) return;
    if (targetItem) {
      const next = useItem(state, targetItem, talentId);
      setState(next);
      setTargetItem(null);
      setNotice('');
      return;
    }
    if (unitPick) {
      setUnitPick((current) => {
        const picked = current ?? [];
        return picked.includes(talentId)
          ? picked.filter((id) => id !== talentId)
          : [...picked, talentId];
      });
      return;
    }
    if (selectedOffer === null) {
      setNotice(t('seiyuuAgency.assign.pickOffer'));
      return;
    }
    const next = assignJob(state, selectedOffer, talentId);
    setState(next);
    setSelectedOffer(null);
    setNotice('');
    finishIfDone(next);
  };

  const chooseEvent = (optionId: string) => {
    if (!state) return;
    const next = resolveEvent(state, optionId);
    setState(next);
    setNotice('');
    finishIfDone(next);
  };

  const useItemNow = (key: ItemKey) => {
    if (!state) return;
    const def = AGENCY_ITEMS[key];
    if (def.target === 'talent') {
      setTargetItem(key);
      setNotice(t('seiyuuAgency.items.pickTarget'));
      return;
    }
    const next = useItem(state, key);
    setState(next);
    setNotice('');
    finishIfDone(next);
  };

  const confirmUnit = () => {
    if (!state || !unitPick) return;
    const next = formUnit(state, unitPick, unitName.trim() || undefined);
    if (next === state) {
      setNotice(t('seiyuuAgency.unit.invalid'));
      return;
    }
    setState(next);
    setUnitPick(null);
    setUnitName('');
    setNotice('');
  };

  const openPoster = async () => {
    if (!report) return;
    setPosterBusy(true);
    setPosterError('');
    try {
      const canvas = await renderAgencyPoster(report, nameOf, {
        kicker: t('seiyuuAgency.poster.kicker'),
        title: t('seiyuuAgency.poster.title'),
        subtitle: t('seiyuuAgency.poster.subtitle', { jobs: report.jobs, months: report.months }),
        scoreLabel: t('seiyuuAgency.report.score'),
        topTitle: t('seiyuuAgency.report.top'),
        topTagLines: report.top.map((item) =>
          [...item.titles, ...item.traits]
            .slice(0, 3)
            .map((key, index) =>
              index < item.titles.length
                ? t(`seiyuuAgency.titles.${key}.name`)
                : t(`seiyuuAgency.traits.${key}.name`),
            )
            .join(' / '),
        ),
        unitTitle: t('seiyuuAgency.report.unitsTitle'),
        unitLines: report.units
          .map((unit) =>
            state
              ? t('seiyuuAgency.report.unitLine', {
                  name: unitNameOf(state, unit.id),
                  fame: unit.fame,
                  successes: unit.successes,
                })
              : '',
          )
          .filter(Boolean),
        awardTitle: t('seiyuuAgency.awards.title'),
        awards: report.awards.map((award) => awardText(award.key, award.talentId, award.unitId)),
        easterTitle: t('seiyuuAgency.report.easterTitle'),
        easterLines: report.easterEggs.map((key) => t('seiyuuAgency.events.' + key + '.title')),
        highlightTitle: t('seiyuuAgency.report.highlight'),
        highlights: report.highlights.map((entry) => highlightText(entry.key, entry.talentId)),
        noHighlight: t('seiyuuAgency.report.none'),
        stats: t('seiyuuAgency.report.stats', {
          items: report.itemUses,
          titles: report.titleCount,
          units: report.units.length,
          wage: report.wagePaid,
        }),
        site: t('common.siteName'),
        hint: t('seiyuuAgency.poster.hint'),
        qrCaption: t('seiyuuAgency.poster.qrCaption'),
      });
      canvasRef.current = canvas;
      setPosterUrl(canvas.toDataURL('image/png'));
    } catch {
      setPosterError(t('seiyuuAgency.poster.failed'));
    } finally {
      setPosterBusy(false);
    }
  };

  const savePoster = async () => {
    if (!canvasRef.current) return;
    try {
      await downloadPoster(canvasRef.current, posterFileName(AGENCY_POSTER_PREFIX));
    } catch {
      setPosterError(t('seiyuuAgency.poster.failed'));
    }
  };

  const share = () => {
    if (!report) return;
    shareToQq({
      url: window.location.href,
      title: t('seiyuuAgency.report.shareTitle'),
      summary: t('seiyuuAgency.report.shareSummary', { score: report.score, grade: report.grade }),
      site: t('common.siteName'),
    });
  };

  const logText = (entry: AgencyLogEntry): string => {
    const name = entry.talentId ? nameOf(entry.talentId) : '';
    if (entry.key === 'event' && entry.event) return t('seiyuuAgency.events.' + entry.event + '.title');
    if (entry.key === 'wage') {
      return t('seiyuuAgency.log.' + (entry.ok === false ? 'wageLate' : 'wage'), { amount: entry.amount ?? 0 });
    }
    if (entry.restBonus?.length) {
      return t('seiyuuAgency.log.restBonus', {
        name,
        list: entry.restBonus
          .map((bonus) => `${t('seiyuuAgency.stats.' + bonus.stat)} +${bonus.gain}`)
          .join('、'),
      });
    }
    if (entry.key === 'unit' && entry.unitId && state) return t('seiyuuAgency.log.unit', { unit: unitNameOf(state, entry.unitId) });
    if (entry.key === 'title' && entry.titleKey) {
      return t('seiyuuAgency.log.title', { name, title: t('seiyuuAgency.titles.' + entry.titleKey + '.name') });
    }
    if (entry.key === 'buy' && entry.itemKey) {
      return t('seiyuuAgency.log.buy', {
        item: t('seiyuuAgency.items.' + entry.itemKey + '.name'),
        amount: entry.amount ?? 0,
      });
    }
    if (entry.key === 'item' && entry.itemKey) {
      return t('seiyuuAgency.log.item', { item: t('seiyuuAgency.items.' + entry.itemKey + '.name') });
    }
    const job = entry.job ? t('seiyuuAgency.jobs.' + entry.job) : '';
    return t('seiyuuAgency.log.' + entry.key, { name, job, amount: entry.amount ?? 0, unit: '' });
  };

  const highlightText = (key: string, talentId?: string) =>
    t('seiyuuAgency.events.' + key + '.title') + (talentId ? `（${nameOf(talentId)}）` : '');
  const awardNameOf = (talentId?: string, unitId?: string) =>
    unitId && state ? unitNameOf(state, unitId) : talentId ? nameOf(talentId) : '';
  const awardText = (key: string, talentId?: string, unitId?: string) =>
    t('seiyuuAgency.awards.line', {
      award: t('seiyuuAgency.awards.' + key),
      name: awardNameOf(talentId, unitId),
    });

  /** 一条日志的详细行：文案 + 成败 + 资金变化 + 数值明细。 */
  const logRow = (entry: AgencyLogEntry, index: number) => (
    <li key={`${entry.month}-${entry.key}-${index}`} className={`ag-log-entry is-${entry.key}`}>
      <span className="ag-log-month">{entry.month}</span>
      <span className="ag-log-text">
        {logText(entry)}
        {entry.key === 'event' && entry.talentId && `（${nameOf(entry.talentId)}）`}
        {entry.ok === true && <span className="lf-chip is-up">{t('seiyuuAgency.event.success')}</span>}
        {entry.ok === false && <span className="lf-chip is-down">{t('seiyuuAgency.event.failure')}</span>}
        {entry.net !== undefined && entry.net !== 0 && (
          <span className={`lf-chip ${entry.net > 0 ? 'is-up' : 'is-down'}`}>
            {t('seiyuuAgency.log.net', { value: entry.net > 0 ? `+${entry.net}` : entry.net })}
          </span>
        )}
        {(entry.gains ?? []).map((gain) => (
          <span key={gain.stat} className={`lf-chip ${gain.delta > 0 ? 'is-up' : 'is-down'}`}>
            {t('seiyuuAgency.stats.' + gain.stat)} {gain.delta > 0 ? `+${gain.delta}` : gain.delta}
          </span>
        ))}
        {entry.lesson ? (
          <span className="lf-chip is-gamble">{t('seiyuuAgency.log.lesson', { value: entry.lesson })}</span>
        ) : null}
      </span>
    </li>
  );

  const ownedItems = useMemo(
    () =>
      state
        ? (Object.keys(state.items) as ItemKey[]).filter((key) => (state.items[key] ?? 0) > 0)
        : [],
    [state],
  );

  /** 商店买入（不抽籤、不限次数，只花钱）。 */
  const buy = (key: ItemKey) => {
    if (!state) return;
    const next = buyItem(state, key);
    if (next === state) {
      setNotice(t('seiyuuAgency.items.noCash'));
      return;
    }
    setState(next);
    setNotice('');
  };

  const talentRow = (talent: AgencyTalent) => {
    const grade = talentGrade(talent.fame);
    const offer = selectedOffer === null ? null : state?.offers.find((item) => item.index === selectedOffer);
    const unit = state?.units.find((item) => item.id === talent.unitId);
    const picked = unitPick?.includes(talent.id) ?? false;
    const canAssign = state?.stage === 'assign' && Boolean(offer) && (!offer?.job.unitOnly || Boolean(unit));
    const rate = offer && !offer.job.safe ? successRate(offer.job, talent, state ?? undefined) : 0;
    return (
      <li key={talent.id} className={`ag-talent${picked ? ' is-picked' : ''}${unit ? ' is-unit' : ''}`}>
        <img className="ag-talent-photo" src={photoOf(talent.id)} alt={nameOf(talent.id)} loading="lazy" decoding="async" />
        <span className="ag-talent-main">
          <span className="ag-talent-name">
            {nameOf(talent.id)}
            {talent.veteran && <span className="lf-chip is-gamble">{t('seiyuuAgency.talent.veteran')}</span>}
            {unit && <span className="lf-chip is-up">{unitNameOf(state!, unit.id)}</span>}
          </span>
          <span className="ag-talent-meta">
            {t('seiyuuAgency.stats.skill')} {talent.skill} · {t('seiyuuAgency.stats.vocal')} {talent.vocal} ·{' '}
            {t('seiyuuAgency.stats.charm')} {talent.charm}
          </span>
          <span className="ag-talent-meta">
            {t('seiyuuAgency.stats.fame')} {talent.fame} · {t('seiyuuAgency.stats.stamina')} {talent.stamina} ·{' '}
            {t('seiyuuAgency.stats.loyalty')} {talent.loyalty} · {t('seiyuuAgency.stats.salary')} {talent.salary} 万
          </span>
          {(talent.traits.length > 0 || talent.titles.length > 0) && (
            <span className="ag-talent-tags">
              {talent.titles.map((key) => (
                <span key={key} className="ag-tag is-title" title={t('seiyuuAgency.titles.' + key + '.desc')}>
                  {t('seiyuuAgency.titles.' + key + '.name')}
                </span>
              ))}
              {talent.traits.map((key) => (
                <span
                  key={key}
                  className={`ag-tag${AGENCY_TRAITS[key].flaw ? ' is-flaw' : ''}`}
                  title={t('seiyuuAgency.traits.' + key + '.desc')}
                >
                  {t('seiyuuAgency.traits.' + key + '.name')}
                </span>
              ))}
            </span>
          )}
        </span>
        <span className={`ag-grade is-${grade}`}>{grade}</span>
        <button
          type="button"
          className={`btn btn-sm ag-assign${offer && !offer.job.safe ? oddsClass(rate) : ''}`}
          onClick={() => assign(talent.id)}
          disabled={state?.stage !== 'assign' || (!offer && !unitPick && !targetItem) || (Boolean(offer) && !canAssign)}
        >
          {unitPick
            ? picked
              ? t('seiyuuAgency.unit.picked')
              : t('seiyuuAgency.unit.pick')
            : targetItem
              ? t('seiyuuAgency.items.use')
              : !offer
                ? t('seiyuuAgency.assign.pickTalent')
                : offer.job.safe
                  ? t('seiyuuAgency.offers.safe')
                  : `${Math.round(rate * 100)}%`}
        </button>
      </li>
    );
  };

  return (
    <Page
      title={t('seiyuuAgency.title')}
      icon={<Building2 size={17} />}
      homeTo={SITE_HOME}
      className="agency-page"
    >
      {stage === 'intro' && (
        <div className="card ly-intro">
          <p className="ly-kicker">{t('seiyuuAgency.kicker')}</p>
          <p>{t('seiyuuAgency.intro')}</p>
          <ol className="ly-steps">
            <li>{t('seiyuuAgency.rule1')}</li>
            <li>{t('seiyuuAgency.rule2')}</li>
            <li>{t('seiyuuAgency.rule3')}</li>
            <li>{t('seiyuuAgency.rule4')}</li>
            <li>{t('seiyuuAgency.rule5')}</li>
            <li>{t('seiyuuAgency.rule6')}</li>
          </ol>

          <h3 className="lf-block-title">
            <Building2 size={15} aria-hidden="true" /> {t('seiyuuAgency.originTitle')}
          </h3>
          <div className="diff-grid is-two">
            {AGENCY_ORIGINS.map((key) => (
              <button
                key={key}
                type="button"
                className={`diff-option${origin === key ? ' is-active' : ''}`}
                onClick={() => switchOrigin(key)}
              >
                <span className="diff-name">{t('seiyuuAgency.origins.' + key + '.name')}</span>
                <span className="diff-desc">{t('seiyuuAgency.origins.' + key + '.desc')}</span>
              </button>
            ))}
          </div>

          <h3 className="lf-block-title">
            {t('seiyuuAgency.preferredTitle')}
            <span className="ag-points">{t('seiyuuAgency.preferredCount', { count: preferred.length })}</span>
          </h3>
          <p className="muted ag-section-hint">{t('seiyuuAgency.preferredHint')}</p>
          <div className="ag-chips">
            {PROJECT_IDS.map((id) => (
              <button
                key={id}
                type="button"
                className={`ag-chip${preferred.includes(id) ? ' is-active' : ''}`}
                onClick={() => togglePreferred(id)}
              >
                {t('whoYouAre.projects.' + id)}
              </button>
            ))}
          </div>

          <h3 className="lf-block-title">{t('seiyuuAgency.difficultyTitle')}</h3>
          <div className="diff-grid">
            {AGENCY_DIFFICULTIES.map((key) => (
              <button
                key={key}
                type="button"
                className={`diff-option${difficulty === key ? ' is-active' : ''}`}
                onClick={() => switchDifficulty(key)}
              >
                <span className="diff-name">{t('seiyuuAgency.difficulties.' + key + '.name')}</span>
                <span className="diff-desc">
                  {t('seiyuuAgency.difficulties.' + key + '.desc', {
                    cash: AGENCY_RULES[key].cash,
                    reputation: AGENCY_RULES[key].reputation,
                    points: AGENCY_RULES[key].points,
                  })}
                </span>
              </button>
            ))}
          </div>

          <h3 className="lf-block-title">{t('seiyuuAgency.lengthTitle')}</h3>
          <div className="diff-grid">
            {AGENCY_LENGTHS.map((key) => (
              <button
                key={key}
                type="button"
                className={`diff-option${length === key ? ' is-active' : ''}`}
                onClick={() => setLength(key)}
              >
                <span className="diff-name">{t('seiyuuAgency.lengths.' + key + '.name')}</span>
                <span className="diff-desc">{t('seiyuuAgency.lengths.' + key + '.desc', { months: LENGTH_MONTHS[key] })}</span>
              </button>
            ))}
          </div>

          <h3 className="lf-block-title">
            {t('seiyuuAgency.agent.title')}
            <span className="ag-points">
              {linked
                ? t('seiyuuAgency.agent.linked', { total: spent })
                : t('seiyuuAgency.agent.left', { left })}
            </span>
          </h3>
          <p className="muted ag-section-hint">
            {t('seiyuuAgency.agent.hint', { total, max: AGENT_ATTR_MAX })}
          </p>
          <div className="ly-actions ag-point-actions">
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setLinked(null);
                setAgent(defaultPoints(total));
              }}
              disabled={Boolean(linked)}
            >
              {t('seiyuuAgency.agent.even')}
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setLinked(null);
                setAgent(emptyPoints());
              }}
              disabled={Boolean(linked)}
            >
              {t('seiyuuAgency.agent.clear')}
            </button>
          </div>
          <ul className="ag-attrs">
            {AGENT_ATTRS.map((attr) => (
              <li key={attr} className="ag-attr">
                <span className="ag-attr-main">
                  <span className="ag-attr-name">{t('seiyuuAgency.agent.attrs.' + attr + '.name')}</span>
                  <span className="ag-attr-desc">{t('seiyuuAgency.agent.attrs.' + attr + '.desc')}</span>
                </span>
                <span className="ag-attr-controls">
                  <button type="button" className="btn btn-sm" onClick={() => adjust(attr, -1)} disabled={Boolean(linked) || agent[attr] <= 0}>
                    <Minus size={14} />
                  </button>
                  <span className="ag-attr-value">{agent[attr]}</span>
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={() => adjust(attr, 1)}
                    disabled={Boolean(linked) || agent[attr] >= AGENT_ATTR_MAX || left <= 0}
                  >
                    <Plus size={14} />
                  </button>
                </span>
              </li>
            ))}
          </ul>

          <div className="ag-link">
            <p className="muted ag-link-hint">{t('seiyuuAgency.agent.linkHint')}</p>
            <div className="ag-link-row">
              <input
                className="ag-link-input"
                value={codeInput}
                onChange={(event) => setCodeInput(event.target.value)}
                placeholder={t('seiyuuAgency.agent.linkPlaceholder')}
                aria-label={t('seiyuuAgency.agent.linkLabel')}
              />
              <button type="button" className="btn btn-sm" onClick={applyCode}>
                <Link2 size={14} />
                {t('seiyuuAgency.agent.link')}
              </button>
              {linked && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    setLinked(null);
                    setCodeInput('');
                    setAgent(defaultPoints(total));
                  }}
                >
                  {t('seiyuuAgency.agent.unlink')}
                </button>
              )}
            </div>
            {linked && (
              <p className="ag-link-ok">
                {t('seiyuuAgency.agent.linkedOk', { code: linked.code })}
              </p>
            )}
            {linkError && <p className="ly-notice is-error">{linkError}</p>}
          </div>

          <div className="ly-actions">
            <button type="button" className="btn btn-primary" onClick={start}>
              <Briefcase size={16} />
              {t('seiyuuAgency.start')}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                refreshSaves();
                setModal('save');
              }}
            >
              <Save size={16} /> {t('seiyuuAgency.save.loadTitle')}
              {autoMeta && ` · ${t('seiyuuAgency.save.monthShort', { month: autoMeta.month })}`}
            </button>
          </div>
        </div>
      )}

      {stage === 'play' && state && (
        <div className="ag-play">
          <div className="ly-hud">
            <span className="ly-hud-step">
              {t('seiyuuAgency.hud.month', { month: state.month, total: state.months })}
            </span>
            <span className="ly-hud-picked">
              <Coins size={14} aria-hidden="true" /> {t('seiyuuAgency.hud.cash', { value: state.cash })}
            </span>
            <span className="ly-hud-picked">
              <TrendingUp size={14} aria-hidden="true" /> {t('seiyuuAgency.hud.reputation', { value: state.reputation })}
            </span>
            <span className="ly-hud-picked">
              <Users size={14} aria-hidden="true" />{' '}
              {t('seiyuuAgency.hud.wage', {
                value: state.talents.reduce((sum, talent) => sum + talent.salary, 0),
              })}
            </span>
            <span className="ly-hud-picked">
              <Briefcase size={14} aria-hidden="true" />{' '}
              {t('seiyuuAgency.hud.actions', { left: state.actionsLeft, total: AGENCY_ACTIONS })}
            </span>
          </div>

          {state.pendingEvent && (() => {
            const def = eventDefOf(state.pendingEvent.eventId);
            if (!def) return null;
            const target = state.pendingEvent.talentId;
            const tone = AGENCY_EVENT_TONES[def.id] ?? 'deal';
            const ArtIcon = def.easter ? Sparkles : tone === 'bad' ? AlertTriangle : tone === 'good' ? Star : Briefcase;
            return (
              <section className={`ag-event is-${tone}${def.easter ? ' is-easter' : ''}`}>
                <div className={`ag-event-art is-${tone}`} aria-hidden="true">
                  <ArtIcon size={26} />
                </div>
                {target && (
                  <img
                    className="ag-event-photo"
                    src={photoOf(target)}
                    alt={nameOf(target)}
                    loading="lazy"
                    decoding="async"
                  />
                )}
                <p className="ag-event-kicker">
                  {def.easter ? <Sparkles size={14} aria-hidden="true" /> : <AlertTriangle size={14} aria-hidden="true" />}
                  {def.easter ? t('seiyuuAgency.event.easterKicker') : t('seiyuuAgency.event.kicker')}
                </p>
                <h3 className="ag-event-title">{t('seiyuuAgency.events.' + def.id + '.title')}</h3>
                <p className="muted ag-event-desc">{t('seiyuuAgency.events.' + def.id + '.desc')}</p>
                {target && (
                  <p className="muted ag-event-target">{t('seiyuuAgency.event.target', { name: nameOf(target) })}</p>
                )}
                <ul className="ag-event-options">
                  {def.options.map((option) => {
                    const locked = option.requiresCash !== undefined && state.cash < option.requiresCash;
                    return (
                      <li key={option.id}>
                        <button
                          type="button"
                          className={`ag-event-option${option.risk ? ' is-gamble' : ''}`}
                          onClick={() => chooseEvent(option.id)}
                          disabled={locked}
                        >
                          <span className="ag-event-option-label">
                            {t('seiyuuAgency.events.' + def.id + '.options.' + option.id)}
                          </span>
                          <span className="ag-event-option-effects">
                            {option.risk ? (
                              <>
                                <span className="lf-chip is-gamble">
                                  {t('seiyuuAgency.event.chance', { value: Math.round(option.risk.chance * 100) })}
                                </span>
                                {effectChips(t, option.risk.success)}
                                <span className="lf-chip is-down">{t('seiyuuAgency.event.failure')}</span>
                                {effectChips(t, option.risk.failure)}
                              </>
                            ) : (
                              <>
                                {effectChips(t, option.effects ?? {})}
                                {option.effects?.scope === 'all' && (
                                  <span className="lf-chip">{t('seiyuuAgency.event.scopeAll')}</span>
                                )}
                                {option.effects?.scope === 'unit' && (
                                  <span className="lf-chip">{t('seiyuuAgency.event.scopeUnit')}</span>
                                )}
                                {option.effects?.leave && (
                                  <span className="lf-chip is-down">{t('seiyuuAgency.event.willLeave')}</span>
                                )}
                                {option.effects?.recruit && (
                                  <span className="lf-chip is-up">{t('seiyuuAgency.event.willSign')}</span>
                                )}
                                {locked && <span className="lf-chip is-down">{t('seiyuuAgency.event.noCash')}</span>}
                              </>
                            )}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })()}

          {!state.pendingEvent && (
            <>
              <section className="ag-panel">
                <h3 className="ag-section-title">
                  <Users size={16} aria-hidden="true" /> {t('seiyuuAgency.unit.title')}
                  <span className="muted ag-section-note">
                    {t('seiyuuAgency.unit.count', { count: state.units.length, limit: UNIT_LIMIT })}
                  </span>
                </h3>
                {state.units.length > 0 && (
                  <ul className="ag-units">
                    {state.units.map((unit) => (
                      <li key={unit.id} className="ag-unit">
                        <span className="ag-unit-name">{unitNameOf(state, unit.id)}</span>
                        <span className="ag-unit-meta">
                          {t('seiyuuAgency.unit.meta', {
                            fame: unitFameOf(state, unit.id),
                            members: unit.members.length,
                            successes: unit.successes,
                          })}
                        </span>
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setState(disbandUnit(state, unit.id))}>
                          {t('seiyuuAgency.unit.disband')}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {unitPick ? (
                  <div className="ag-unit-picker">
                    <p className="muted ag-section-hint">
                      {t('seiyuuAgency.unit.pickHint', { min: UNIT_MIN_MEMBERS, max: UNIT_MAX_MEMBERS })}
                    </p>
                    <div className="ly-actions">
                      <input
                        className="ag-link-input"
                        value={unitName}
                        maxLength={UNIT_NAME_MAX}
                        onChange={(event) => setUnitName(event.target.value)}
                        placeholder={t('seiyuuAgency.unit.namePlaceholder', {
                          fallback: defaultUnitName(unitPick),
                        })}
                        aria-label={t('seiyuuAgency.unit.nameLabel')}
                      />
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={confirmUnit}
                        disabled={unitPick.length < UNIT_MIN_MEMBERS || unitPick.length > UNIT_MAX_MEMBERS}
                      >
                        {t('seiyuuAgency.unit.confirm', { cost: UNIT_FORM_COST })}
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => {
                          setUnitPick(null);
                          setUnitName('');
                        }}
                      >
                        {t('common.cancel')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={() => {
                      setUnitPick([]);
                      setUnitName('');
                      setTargetItem(null);
                      setNotice('');
                    }}
                    disabled={state.units.length >= UNIT_LIMIT || state.cash < UNIT_FORM_COST || state.stage !== 'assign'}
                  >
                    <Users size={14} />
                    {t('seiyuuAgency.unit.form', { cost: UNIT_FORM_COST })}
                  </button>
                )}
              </section>

              <section className="ag-panel">
                <h3 className="ag-section-title">
                  <Package size={16} aria-hidden="true" /> {t('seiyuuAgency.items.title')}
                  <span className="muted ag-section-note">
                    {state.usedItems.length
                      ? t('seiyuuAgency.items.usedList', { count: state.usedItems.length })
                      : t('seiyuuAgency.items.available')}
                  </span>
                </h3>
                <p className="muted ag-section-hint">
                  {ownedItems.length
                    ? t('seiyuuAgency.items.ownedHint', {
                        list: ownedItems
                          .map(
                            (key) =>
                              `${t('seiyuuAgency.items.' + key + '.name')}×${state.items[key] ?? 0}`,
                          )
                          .join('、'),
                      })
                    : t('seiyuuAgency.items.shopHint')}
                </p>
                <div className="ly-actions">
                  <button type="button" className="btn btn-sm" onClick={() => setModal('shop')}>
                    <Package size={14} /> {t('seiyuuAgency.items.openShop')}
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => setModal('bag')}
                    disabled={ownedItems.length === 0}
                  >
                    {t('seiyuuAgency.items.openBag', { count: ownedItems.length })}
                  </button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setModal('log')}>
                    {t('seiyuuAgency.log.open')}
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => {
                      refreshSaves();
                      setModal('save');
                    }}
                  >
                    <Save size={14} /> {t('seiyuuAgency.save.open')}
                  </button>
                </div>
              </section>

              {state.stage === 'recruit' && state.candidates.length > 0 && (
                <section className="ag-panel is-recruit">
                  <h3 className="ag-section-title">
                    <UserPlus size={16} aria-hidden="true" />{' '}
                    {t('seiyuuAgency.recruit.title', { month: state.month })}
                  </h3>
                  <p className="muted ag-section-hint">{t('seiyuuAgency.recruit.intro')}</p>
                  <ul className="ag-candidates">
                    {state.candidates.map((candidate) => (
                      <li key={candidate.id} className="ag-candidate">
                        <img
                          className="ag-candidate-photo"
                          src={photoOf(candidate.id)}
                          alt={nameOf(candidate.id)}
                          loading="lazy"
                          decoding="async"
                        />
                        <span className="ag-candidate-name">
                          {nameOf(candidate.id)}
                          {candidate.veteran && <span className="lf-chip is-gamble">{t('seiyuuAgency.talent.veteran')}</span>}
                        </span>
                        <span className="ag-candidate-meta">
                          {t('seiyuuAgency.stats.skill')} {candidate.skill} · {t('seiyuuAgency.stats.vocal')} {candidate.vocal} ·{' '}
                          {t('seiyuuAgency.stats.charm')} {candidate.charm}
                        </span>
                        {candidate.traits.length > 0 && (
                          <span className="ag-talent-tags">
                            {candidate.traits.map((key) => (
                              <span
                                key={key}
                                className={`ag-tag${AGENCY_TRAITS[key].flaw ? ' is-flaw' : ''}`}
                                title={t('seiyuuAgency.traits.' + key + '.desc')}
                              >
                                {t('seiyuuAgency.traits.' + key + '.name')}
                              </span>
                            ))}
                          </span>
                        )}
                        <button
                          type="button"
                          className="btn btn-sm btn-primary"
                          onClick={() => sign(candidate.id)}
                          disabled={
                            state.cash <
                            Math.round((candidate.veteran ? 160 : 120) * AGENCY_ORIGIN_RULES[state.origin].signMul)
                          }
                        >
                          {t('seiyuuAgency.recruit.sign')}
                        </button>
                      </li>
                    ))}
                  </ul>
                  <div className="ag-recruit-foot">
                    <span className="muted">
                      {t('seiyuuAgency.recruit.cost', {
                        value: Math.min(
                          ...state.candidates.map((candidate) =>
                            Math.round((candidate.veteran ? 160 : 120) * AGENCY_ORIGIN_RULES[state.origin].signMul),
                          ),
                        ),
                      })}
                    </span>
                    <span className="ly-actions">
                      <button
                        type="button"
                        className="btn btn-sm"
                        onClick={rerollCandidates}
                        disabled={state.refreshLeft <= 0}
                      >
                        <RotateCcw size={13} />{' '}
                        {t('seiyuuAgency.recruit.refresh', { left: state.refreshLeft })}
                      </button>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={skip}>
                        {t('seiyuuAgency.recruit.skip')}
                      </button>
                    </span>
                  </div>
                </section>
              )}

              <section className="ag-panel">
                <h3 className="ag-section-title">
                  <Briefcase size={16} aria-hidden="true" /> {t('seiyuuAgency.offers.title')}
                </h3>
                <p className="muted ag-section-hint">{t('seiyuuAgency.offers.hint')}</p>
                <ul className="ag-offer-list">
                  {state.offers.map((offer) => (
                    <li key={offer.index}>
                      <button
                        type="button"
                        className={`ag-offer${selectedOffer === offer.index ? ' is-selected' : ''}`}
                        onClick={() => setSelectedOffer(offer.index)}
                        disabled={state.stage !== 'assign'}
                      >
                        <span className="ag-offer-name">
                          {t('seiyuuAgency.jobs.' + offer.job.kind)}
                          <span className={`ag-tier is-${offer.job.tier}`}>
                            {t('seiyuuAgency.tiers.' + offer.job.tier)}
                          </span>
                          {offer.job.unitOnly && <span className="lf-chip is-up">{t('seiyuuAgency.offers.unitOnly')}</span>}
                        </span>
                        <span className="ag-offer-meta">
                          {offerMetaOf(t, offer.job)}
                          {!offer.job.safe &&
                            ` · ${t('seiyuuAgency.offers.chance', {
                              value: Math.round(
                                Math.max(...state.talents.map((talent) => successRate(offer.job, talent, state))) * 100,
                              ),
                            })}`}
                        </span>
                        <span className="ag-offer-reward">
                          {offer.job.pay > 0 && `${t('seiyuuAgency.offers.pay', { value: offer.job.pay })} `}
                          {offer.job.fame > 0 && t('seiyuuAgency.offers.fame', { value: offer.job.fame })}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="ag-panel">
                <h3 className="ag-section-title">
                  <Star size={16} aria-hidden="true" /> {t('seiyuuAgency.talents.title')}
                </h3>
                <p className="muted ag-section-hint">
                  {targetItem
                    ? t('seiyuuAgency.items.pickTarget')
                    : unitPick
                      ? t('seiyuuAgency.unit.pickHint', { min: UNIT_MIN_MEMBERS, max: UNIT_MAX_MEMBERS })
                      : selectedOffer === null
                        ? t('seiyuuAgency.assign.hint')
                        : t('seiyuuAgency.assign.hintSelected')}
                </p>
                {state.failStreak > 0 && (
                  <p className="muted ag-section-note">
                    {t('seiyuuAgency.assign.streak', {
                      count: state.failStreak,
                      value: Math.round(
                        Math.min(state.failStreak, AGENT_STREAK_MAX) * AGENT_STREAK_BONUS * 100,
                      ),
                    })}
                  </p>
                )}
                <ul className="ag-talent-list">{state.talents.map(talentRow)}</ul>
              </section>
            </>
          )}

          {notice && <p className="ly-notice">{notice}</p>}

          {state.log.length > 0 && (
            <section className="ag-log">
              <h3 className="ag-section-title">
                {t('seiyuuAgency.logTitle')}
                <span className="muted ag-section-note">
                  {t('seiyuuAgency.log.count', { count: state.log.length })}
                </span>
                <button type="button" className="btn btn-ghost btn-sm ag-log-open" onClick={() => setModal('log')}>
                  {t('seiyuuAgency.log.open')}
                </button>
              </h3>
              <ul>{state.log.slice(-5).reverse().map(logRow)}</ul>
            </section>
          )}
        </div>
      )}

      {stage === 'report' && report && (
        <div className="ag-report">
          <p className="ly-kicker">{t('seiyuuAgency.poster.kicker')}</p>
          <h2 className="lf-ending-name">{t('seiyuuAgency.report.title')}</h2>
          <p className="muted">{t('seiyuuAgency.poster.subtitle', { jobs: report.jobs, months: report.months })}</p>

          <div className="ag-score">
            <span className={`ag-grade is-${report.grade} is-big`}>{report.grade}</span>
            <span className="ag-score-value">{report.score}</span>
            <span className="ag-score-label">{t('seiyuuAgency.report.score')}</span>
          </div>
          <p className="muted ag-section-note">
            {t('seiyuuAgency.origins.' + report.origin + '.name')} ·{' '}
            {t('seiyuuAgency.lengths.' + state?.length + '.name')}
          </p>

          {report.easterEggs.length > 0 && (
            <div className="ag-easter">
              <p className="ag-easter-title">
                <Sparkles size={15} aria-hidden="true" /> {t('seiyuuAgency.report.easterTitle')}
              </p>
              <ul>
                {report.easterEggs.map((key) => (
                  <li key={key}>{t('seiyuuAgency.events.' + key + '.title')}</li>
                ))}
              </ul>
            </div>
          )}

          <h3 className="lf-block-title">{t('seiyuuAgency.report.top')}</h3>
          <ul className="ag-top">
            {report.top.map((item, index) => (
              <li key={item.id} className="ag-top-item">
                <span className="ag-top-rank">{index + 1}</span>
                <img className="ag-top-photo" src={photoOf(item.id)} alt={nameOf(item.id)} loading="lazy" decoding="async" />
                <span className="ag-top-main">
                  <span className="ag-top-name">{nameOf(item.id)}</span>
                  {(item.titles.length > 0 || item.traits.length > 0) && (
                    <span className="ag-talent-tags">
                      {item.titles.map((key) => (
                        <span key={key} className="ag-tag is-title">
                          {t('seiyuuAgency.titles.' + key + '.name')}
                        </span>
                      ))}
                      {item.traits.map((key) => (
                        <span key={key} className={`ag-tag${AGENCY_TRAITS[key].flaw ? ' is-flaw' : ''}`}>
                          {t('seiyuuAgency.traits.' + key + '.name')}
                        </span>
                      ))}
                    </span>
                  )}
                </span>
                <span className={`ag-grade is-${item.grade}`}>{item.grade}</span>
              </li>
            ))}
          </ul>

          {report.awards.length > 0 && (
            <>
              <h3 className="lf-block-title">
                <Award size={15} aria-hidden="true" /> {t('seiyuuAgency.awards.title')}
              </h3>
              <ul className="ag-awards">
                {report.awards.map((award) => (
                  <li key={award.key + (award.talentId ?? award.unitId)} className="ag-award">
                    <span className="ag-award-key">{t('seiyuuAgency.awards.' + award.key)}</span>
                    <span className="ag-award-name">{awardNameOf(award.talentId, award.unitId)}</span>
                  </li>
                ))}
              </ul>
            </>
          )}

          <h3 className="lf-block-title">{t('seiyuuAgency.report.statsTitle')}</h3>
          <ul className="rs-summary">
            <li>
              <span>{t('seiyuuAgency.report.statsJobs')}</span>
              <strong>{report.jobs}</strong>
            </li>
            <li>
              <span>{t('seiyuuAgency.report.statsTitles')}</span>
              <strong>{report.titleCount}</strong>
            </li>
            <li>
              <span>{t('seiyuuAgency.report.statsItems')}</span>
              <strong>{report.itemUses}</strong>
            </li>
            <li>
              <span>{t('seiyuuAgency.report.statsUnits')}</span>
              <strong>{report.units.length}</strong>
            </li>
            <li>
              <span>{t('seiyuuAgency.report.statsWage')}</span>
              <strong>{report.wagePaid}</strong>
            </li>
          </ul>

          <h3 className="lf-block-title">{t('seiyuuAgency.report.highlight')}</h3>
          {report.highlights.length ? (
            <ul className="ag-highlights">
              {report.highlights.map((entry) => (
                <li key={entry.key + (entry.talentId ?? '')}>{highlightText(entry.key, entry.talentId)}</li>
              ))}
            </ul>
          ) : (
            <p className="muted">{t('seiyuuAgency.report.none')}</p>
          )}

          <p className="muted ag-egg-note">{t('seiyuuAgency.report.eggNote', { value: EASTER_EGG_CHANCE * 100 })}</p>

          {posterError && <p className="ly-notice is-error">{posterError}</p>}

          <div className="ly-actions">
            <button type="button" className="btn btn-primary" onClick={openPoster} disabled={posterBusy}>
              <Download size={16} />
              {posterBusy ? t('seiyuuAgency.poster.building') : t('seiyuuAgency.poster.open')}
            </button>
            <button type="button" className="btn ag-share-qq" onClick={share}>
              <Share2 size={16} />
              {t('common.shareToQq')}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setStage('intro')}>
              <RotateCcw size={16} />
              {t('seiyuuAgency.report.restart')}
            </button>
          </div>
        </div>
      )}

      {modal && state && (
        <ModalPortal>
          <div
            className="ag-modal-backdrop"
            role="dialog"
            aria-modal="true"
            aria-label={t('seiyuuAgency.modal.' + modal)}
            onClick={() => setModal(null)}
          >
            <div className="ag-modal" onClick={(event) => event.stopPropagation()}>
              <header className="ag-modal-head">
                <h3>{t('seiyuuAgency.modal.' + modal)}</h3>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setModal(null)}>
                  <X size={16} />
                </button>
              </header>
              <p className="muted ag-modal-note">
                {modal === 'shop'
                  ? t('seiyuuAgency.items.shopHint')
                  : modal === 'bag'
                    ? t('seiyuuAgency.items.bagHint')
                    : t('seiyuuAgency.log.hint')}
              </p>

              <div className="ag-modal-body">
                {modal === 'shop' &&
                  ITEM_GROUPS.map((group) => (
                    <div key={group.key} className="ag-shop-group">
                      <h4 className="ag-shop-group-title">{t('seiyuuAgency.items.groups.' + group.key)}</h4>
                      <ul className="ag-items">
                        {group.items.map((key) => {
                          const owned = state.items[key] ?? 0;
                          const def = AGENCY_ITEMS[key];
                          return (
                            <li key={key} className={`ag-shop-item${owned > 0 ? ' is-owned' : ''}`}>
                              <div className="ag-shop-main">
                                <span className="ag-item-name">
                                  {t('seiyuuAgency.items.' + key + '.name')}
                                  {owned > 0 && <span className="ag-item-count">×{owned}</span>}
                                </span>
                                <span className="ag-shop-desc">{t('seiyuuAgency.items.' + key + '.desc')}</span>
                                <span className="ag-item-cost">
                                  {t('seiyuuAgency.items.cost', { value: def.cost })}
                                </span>
                              </div>
                              <div className="ag-shop-actions">
                                <button
                                  type="button"
                                  className="btn btn-sm ag-buy"
                                  onClick={() => buy(key)}
                                  disabled={state.cash < def.cost}
                                >
                                  {t('seiyuuAgency.items.buy')}
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-primary btn-sm"
                                  onClick={() => useItemNow(key)}
                                  disabled={owned <= 0 || state.usedItems.includes(key)}
                                >
                                  {t('seiyuuAgency.items.use')}
                                </button>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))}

                {modal === 'bag' &&
                  (ownedItems.length ? (
                    <ul className="ag-items">
                      {ownedItems.map((key) => (
                        <li key={key} className="ag-shop-item is-owned">
                          <div className="ag-shop-main">
                            <span className="ag-item-name">
                              {t('seiyuuAgency.items.' + key + '.name')}
                              <span className="ag-item-count">×{state.items[key] ?? 0}</span>
                            </span>
                            <span className="ag-shop-desc">{t('seiyuuAgency.items.' + key + '.desc')}</span>
                          </div>
                          <div className="ag-shop-actions">
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              onClick={() => useItemNow(key)}
                              disabled={state.usedItems.includes(key)}
                            >
                              {t('seiyuuAgency.items.use')}
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="muted">{t('seiyuuAgency.items.emptyBag')}</p>
                  ))}

                {modal === 'log' && <ul className="ag-log-full">{state.log.slice().reverse().map(logRow)}</ul>}

                {modal === 'save' &&
                  AGENCY_ALL_SLOTS.map((slot) => {
                    const meta = saveSlots[slot] ?? null;
                    const isAuto = slot === AGENCY_AUTO_SLOT;
                    return (
                      <div key={slot} className={`ag-save-row${meta ? ' is-filled' : ''}`}>
                        <div className="ag-save-main">
                          <span className="ag-save-name">
                            {isAuto ? t('seiyuuAgency.save.auto') : t('seiyuuAgency.save.slot', { slot })}
                          </span>
                          {meta ? (
                            <span className="ag-save-meta">
                              {t('seiyuuAgency.save.meta', {
                                month: meta.month,
                                total: meta.months,
                                cash: meta.cash,
                                reputation: meta.reputation,
                              })}
                            </span>
                          ) : (
                            <span className="ag-save-meta">{t('seiyuuAgency.save.empty')}</span>
                          )}
                        </div>
                        <div className="ag-save-actions">
                          <button
                            type="button"
                            className="btn btn-sm"
                            onClick={() => writeSlot(slot)}
                            disabled={!state || state.stage === 'done'}
                          >
                            {t('seiyuuAgency.save.save')}
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-primary"
                            onClick={() => readSlot(slot)}
                            disabled={!meta}
                          >
                            {t('seiyuuAgency.save.load')}
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => dropSlot(slot)}
                            disabled={!meta || isAuto}
                          >
                            {t('seiyuuAgency.save.delete')}
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {posterUrl && (
        <ModalPortal>
          <div className="ag-poster-backdrop" role="dialog" aria-modal="true" aria-label={t('seiyuuAgency.poster.label')}>
            <div className="ag-poster-panel">
              <button
                type="button"
                className="ag-poster-close"
                onClick={() => setPosterUrl('')}
                aria-label={t('common.close')}
              >
                <X size={18} />
              </button>
              <img className="ag-poster-image" src={posterUrl} alt={t('seiyuuAgency.poster.label')} />
              <p className="muted ag-poster-hint">{t('seiyuuAgency.poster.saveHint')}</p>
              <div className="ly-actions">
                <button type="button" className="btn btn-primary" onClick={savePoster}>
                  <Download size={16} />
                  {t('seiyuuAgency.poster.download')}
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
