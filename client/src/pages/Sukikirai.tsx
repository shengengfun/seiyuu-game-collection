import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Flame, Heart, Lock, Search, ThumbsDown, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PROJECT_IDS, PROJECTS, type ProjectId } from '@seiyuu/shared';
import Page from '../components/Page';
import SeiyuuPhoto from '../components/SeiyuuPhoto';
import { api, errMsg } from '../api/client';
import { SITE_HOME, sukikiraiSeiyuuPath } from '../config/routes';
import {
  BOARD_RANGES,
  DEFAULT_BOARD_RANGE,
  EASTER_EGG_UNLOCK_VOTES,
  SUKIKIRAI_ROSTER,
  buildBoardRows,
  formatResetIn,
  formatVoteCount,
  isEasterEgg,
  searchRows,
  totalVotes,
  type BoardResponse,
  type BoardRow,
  type VoteRange,
} from '../config/sukikirai';

/**
 * 喜欢或讨厌：首页热度排行榜。
 *
 * 榜单只展示**总票数（热度）**——喜欢 / 讨厌的比例与评论要先投票才能看（人物页），
 * 否则这个规则就被排行榜绕过去了。
 */
export default function Sukikirai() {
  const { t } = useTranslation();
  const [data, setData] = useState<BoardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [keyword, setKeyword] = useState('');
  const [project, setProject] = useState<ProjectId | 'all'>('all');
  /** 榜单时间窗：日 / 周 / 月 / 总。 */
  const [range, setRange] = useState<VoteRange>(DEFAULT_BOARD_RANGE);
  /** 「不看彩蛋人物」：累计投满 `EASTER_EGG_UNLOCK_VOTES` 票后才出现，默认勾上（不看）。 */
  const [hideEggs, setHideEggs] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    api
      .get<BoardResponse>('/sukikirai/board', { params: { range } })
      .then((response) => setData(response.data))
      .catch((err) => setError(errMsg(err)))
      .finally(() => setLoading(false));
  }, [range]);

  useEffect(load, [load]);

  const ranked = useMemo(
    () => (data ? buildBoardRows(data.counts, data.myVotes) : []),
    [data]
  );
  /**
   * 彩蛋开关（勾上 = 不看）。
   * 名次**只看过滤之后的列表**：否则隐藏掉某个排在前面的人之后，榜上会缺号。
   */
  const visibleBase = useMemo(
    () => (hideEggs ? ranked.filter((row) => !isEasterEgg(row.identity.id)) : ranked),
    [ranked, hideEggs]
  );
  const rankOf = useMemo(() => {
    const map = new Map<string, number>();
    visibleBase.forEach((row, index) => map.set(row.identity.id, index + 1));
    return map;
  }, [visibleBase]);

  const rows: BoardRow[] = useMemo(() => {
    const inProject = visibleBase.filter(
      (row) =>
        project === 'all' ||
        row.identity.project === project ||
        Boolean(row.identity.alsoIn?.includes(project))
    );
    return searchRows(inProject, keyword);
  }, [visibleBase, keyword, project]);

  const quota = data?.quota;
  const votedCount = data ? Object.keys(data.myVotes).length : 0;
  const poolTotal = data ? totalVotes(data.counts) : 0;
  /** 彩蛋开关只对「投得够多」的人现身（累计票数超 过门槛）。 */
  const eggsUnlocked = (quota?.cumulativeVotes ?? 0) > EASTER_EGG_UNLOCK_VOTES;

  /** 额度刷新的悬浮说明：不足 1 小时就只报分钟，别显示“0 小时后刷新”。 */
  const resetText = (seconds: number) => {
    const { hours, minutes } = formatResetIn(seconds);
    return hours > 0
      ? t('sukikirai.quota.resetHint', { hours, minutes })
      : t('sukikirai.quota.resetHintMinutes', { minutes });
  };

  return (
    <Page
      title={t('sukikirai.title')}
      icon={<Flame size={17} />}
      homeTo={SITE_HOME}
      className="sukikirai-page"
      actions={
        quota ? (
          <span
            className={`sk-quota${quota.remaining > 0 ? '' : ' is-empty'}`}
            title={quota ? resetText(quota.resetsInSeconds) : undefined}
          >
            {quota.remaining > 0
              ? t('sukikirai.quota.pill', { remaining: quota.remaining })
              : t('sukikirai.quota.pillEmpty')}
          </span>
        ) : null
      }
    >
      <div className="card sk-intro">
        <header className="sk-hero">
          <span className="sk-hero-kicker">{t('sukikirai.kicker')}</span>
          {/* 标题本身就是这套配色：左蓝（喜欢）／右红（讨厌）；读屏只念板块名 */}
          <h1 className="sk-hero-title" aria-label={t('sukikirai.title')}>
            <span className="is-like">{t('sukikirai.choice.like')}</span>
            <span className="sk-hero-sep" aria-hidden="true">
              ／
            </span>
            <span className="is-dislike">{t('sukikirai.choice.dislike')}</span>
          </h1>
          <p className="sk-hero-sub">{t('sukikirai.subtitle')}</p>
        </header>

        <p className="muted">{t('sukikirai.intro')}</p>
        <p className="muted">{t('sukikirai.guide')}</p>

        <div className="sk-ranges" role="group" aria-label={t('sukikirai.rangeLabel')}>
          {BOARD_RANGES.map((item) => (
            <button
              key={item}
              type="button"
              className={`sk-range-tab${range === item ? ' is-active' : ''}`}
              aria-pressed={range === item}
              onClick={() => setRange(item)}
            >
              {t(`sukikirai.range.${item}`)}
            </button>
          ))}
          {/* 月榜后面：累计投满 50 票才会出现的彩蛋开关（默认勾上 = 不看） */}
          {eggsUnlocked && (
            <label className="sk-egg-toggle" title={t('sukikirai.eggHint')}>
              <input
                type="checkbox"
                checked={hideEggs}
                onChange={(event) => setHideEggs(event.target.checked)}
              />
              {t('sukikirai.hideEggs')}
            </label>
          )}
        </div>

        <div className="sk-stats">
          <span className="sk-stat">
            <Flame size={14} aria-hidden="true" />
            {t('sukikirai.stats.totalVotes', { count: poolTotal })}
          </span>
          <span className="sk-stat">
            <Heart size={14} aria-hidden="true" />
            {t('sukikirai.stats.voted', { count: votedCount, total: SUKIKIRAI_ROSTER.length })}
          </span>
          <span className="sk-stat">
            <Lock size={14} aria-hidden="true" />
            {t('sukikirai.stats.locked')}
          </span>
        </div>

        <div className="sk-search">
          <label htmlFor="sk-search-input">{t('sukikirai.searchLabel')}</label>
          <div className="sk-search-row">
            <Search size={15} aria-hidden="true" />
            <input
              id="sk-search-input"
              type="search"
              value={keyword}
              placeholder={t('sukikirai.searchPlaceholder')}
              onChange={(event) => setKeyword(event.target.value)}
            />
            {keyword && (
              <button
                type="button"
                className="sk-search-clear"
                aria-label={t('common.close')}
                onClick={() => setKeyword('')}
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        <div className="sk-groups" role="group" aria-label={t('sukikirai.groupFilter')}>
          <button
            type="button"
            className={`sk-group-chip${project === 'all' ? ' is-active' : ''}`}
            aria-pressed={project === 'all'}
            onClick={() => setProject('all')}
          >
            {t('sukikirai.groupAll')}
          </button>
          {PROJECT_IDS.map((id) => (
            <button
              key={id}
              type="button"
              className={`sk-group-chip${project === id ? ' is-active' : ''}`}
              aria-pressed={project === id}
              title={PROJECTS[id].nameJa}
              onClick={() => setProject(id)}
            >
              {t(`sukikirai.projects.${id}`)}
            </button>
          ))}
        </div>
      </div>

      {loading && !data ? (
        <div className="page-loading" aria-busy="true">
          <div className="spinner" />
        </div>
      ) : error ? (
        <div className="card sk-error">
          <p className="muted">{error}</p>
          <button type="button" className="btn" onClick={load}>
            {t('common.retry')}
          </button>
        </div>
      ) : rows.length === 0 ? (
        <p className="muted sk-empty">{t('sukikirai.searchEmpty')}</p>
      ) : (
        <>
          {poolTotal === 0 && (
            <p className="muted sk-empty-hint sk-empty">
              {range === 'week' || range === 'month'
                ? t('sukikirai.emptyRange')
                : t('sukikirai.emptyDay')}
            </p>
          )}
          <ol className="sk-board">
          {rows.map((row) => {
            const rank = rankOf.get(row.identity.id) ?? 0;
            return (
              <li key={row.identity.id} className="sk-board-item">
                <Link className="sk-row" to={sukikiraiSeiyuuPath(row.identity.id)}>
                  <span className={`sk-rank${rank <= 3 ? ` is-top is-top-${rank}` : ''}`}>{rank}</span>
                  <SeiyuuPhoto
                    id={row.identity.id}
                    name={row.identity.name}
                    className="sk-row-photo"
                    fallbackClassName="sk-row-photo sk-photo-fallback"
                  />
                  <span className="sk-row-copy">
                    <span className="sk-row-name">
                      {row.identity.name}
                      {isEasterEgg(row.identity.id) && (
                        <em className="sk-egg-tag">{t('sukikirai.easterEgg')}</em>
                      )}
                      {row.myVote && (
                        <em className={`sk-mine is-${row.myVote.choice}`}>
                          {row.myVote.choice === 'like' ? (
                            <Heart size={12} aria-hidden="true" />
                          ) : (
                            <ThumbsDown size={12} aria-hidden="true" />
                          )}
                          {t('sukikirai.mineCount', {
                            choice: t(`sukikirai.choice.${row.myVote.choice}`),
                            votes: row.myVote.votes,
                          })}
                        </em>
                      )}
                    </span>
                    <span className="sk-row-meta">
                      {row.identity.nameJa} · {t(`sukikirai.projects.${row.identity.project}`)}
                    </span>
                  </span>
                  <span className="sk-row-votes">
                    <Flame size={13} aria-hidden="true" />
                    {formatVoteCount(row.total)}
                    <span className="sk-row-votes-unit">{t('sukikirai.votesUnit')}</span>
                  </span>
                </Link>
              </li>
            );
          })}
          </ol>
        </>
      )}

      <p className="muted sk-footnote">{t('sukikirai.footnote', { count: SUKIKIRAI_ROSTER.length })}</p>
    </Page>
  );
}
