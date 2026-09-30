import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Flame, Heart, Lock, RefreshCw, ThumbsDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatCharacter } from '@seiyuu/shared';
import Page from '../components/Page';
import SeiyuuPhoto from '../components/SeiyuuPhoto';
import SukikiraiVoteBar from '../components/SukikiraiVoteBar';
import SukikiraiComments from '../components/SukikiraiComments';
import { api, errMsg } from '../api/client';
import { toast } from '../components/Toast';
import { SITE_HOME, SUKIKIRAI_HOME } from '../config/routes';
import {
  SUKIKIRAI_BY_ID,
  SUKIKIRAI_ID_PATTERN,
  VOTE_PER_PERSON_LIMIT,
  VOTE_REASON_IDS,
  easterEggIntro,
  formatResetIn,
  isEasterEgg,
  type ReasonStat,
  type SeiyuuDetailResponse,
  type VoteChoice,
} from '../config/sukikirai';

/**
 * 「大家选的理由」：喜欢 / 讨厌两栏并列，每栏按票数降序，空栏不渲染。
 * 与比例条同样只在投票后出现。
 */
function ReasonStats({
  reasons,
}: {
  reasons: { likes: ReasonStat[]; dislikes: ReasonStat[] };
}) {
  const { t } = useTranslation();
  const rows = [
    { choice: 'like' as const, items: reasons.likes },
    { choice: 'dislike' as const, items: reasons.dislikes },
  ].filter((row) => row.items.length > 0);
  if (rows.length === 0) {
    return <p className="muted sk-reasons-empty">{t('sukikirai.reasons.empty')}</p>;
  }
  return (
    <div className="sk-reasons-stats">
      <h4>{t('sukikirai.reasons.statsTitle')}</h4>
      {rows.map((row) => (
        <ul key={row.choice} className={`sk-reasons-list is-${row.choice}`}>
          <li className="sk-reasons-list-title">
            {row.choice === 'like' ? <Heart size={13} aria-hidden="true" /> : <ThumbsDown size={13} aria-hidden="true" />}
            {t(`sukikirai.choice.${row.choice}`)}
          </li>
          {row.items.map((item) => (
            <li key={item.id} className="sk-reasons-item">
              <span className="sk-reasons-item-label">
                {t(`sukikirai.reasons.${row.choice}.${item.id}`, {
                  defaultValue: t('sukikirai.reasons.other'),
                })}
              </span>
              <span className="sk-reasons-item-count">{t('sukikirai.reasons.people', { count: item.count })}</span>
            </li>
          ))}
        </ul>
      ))}
    </div>
  );
}

/**
 * 喜欢或讨厌：人物页。
 *
 * 照片 + 两个巨大按钮（喜欢 / 讨厌）。**必须先投票**，投完才出现红蓝比例条与评论；
 * 没投票时结果区是一块「投票后可见」的锁定面板（服务端也不会下发比例，不只是前端遮住）。
 */
export default function SukikiraiSeiyuu() {
  const { t } = useTranslation();
  const { id = '' } = useParams<{ id: string }>();
  const identity = SUKIKIRAI_BY_ID.get(id);
  /** 彩蛋人物的介绍（不是女声优、没有代表角色）。 */
  const eggIntro = easterEggIntro(id);
  const [data, setData] = useState<SeiyuuDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [voting, setVoting] = useState(false);

  const valid = SUKIKIRAI_ID_PATTERN.test(id) && Boolean(identity);

  const load = useCallback(() => {
    if (!valid) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    api
      .get<SeiyuuDetailResponse>(`/sukikirai/seiyuu/${id}`)
      .then((response) => setData(response.data))
      .catch((err) => setError(errMsg(err)))
      .finally(() => setLoading(false));
  }, [id, valid]);

  useEffect(load, [load]);

  /**
   * 投票（加票 / 改投）。
   * - 点同一边 = 再加一票（上限 5），点另一边 = 改投（票数不变）。
   * - **不传理由**：只改立场时服务端会清掉旧理由（预设理由按立场分组），
   *   同立场再加票则保留。改理由走下面的 `setReason`，不消耗额度。
   */
  const vote = async (choice: VoteChoice) => {
    if (voting) return;
    setVoting(true);
    try {
      const response = await api.post<
        SeiyuuDetailResponse & { changed: boolean; isNew: boolean; added: boolean }
      >('/sukikirai/vote', { seiyuuId: id, choice });
      setData(response.data);
      toast.success(
        response.data.isNew
          ? t('sukikirai.vote.done', { choice: t(`sukikirai.choice.${choice}`) })
          : response.data.added
            ? t('sukikirai.vote.added', {
                count: response.data.voted ? response.data.myVotes : 1,
                limit: VOTE_PER_PERSON_LIMIT,
              })
            : t('sukikirai.vote.saved')
      );
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setVoting(false);
    }
  };

  /**
   * 只改 / 清理由：**不加票、不消耗当日额度**，只要投过一票就能选（5 票也一样只挂一个理由）。
   * 以前这条走的是 `/vote`，于是“点理由”被当成加票，满 5 票或额度用完时就再也点不动了。
   */
  const setReason = async (reason: string | null) => {
    if (voting || !myVote) return;
    setVoting(true);
    try {
      const response = await api.post<SeiyuuDetailResponse>('/sukikirai/vote/reason', {
        seiyuuId: id,
        reason,
      });
      setData(response.data);
      toast.success(reason ? t('sukikirai.vote.saved') : t('sukikirai.reasons.cleared'));
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setVoting(false);
    }
  };

  const backLink = (
    <Link className="btn btn-ghost btn-sm" to={SUKIKIRAI_HOME}>
      <ArrowLeft size={15} />
      {t('sukikirai.detail.back')}
    </Link>
  );

  if (!identity) {
    return (
      <Page
        title={t('sukikirai.title')}
        icon={<Flame size={17} />}
        homeTo={SITE_HOME}
        className="sukikirai-page"
      >
        <div className="card sk-error">
          <p className="muted">{t('sukikirai.detail.notFound')}</p>
          {backLink}
        </div>
      </Page>
    );
  }

  const myVote = data?.voted ? data.myVote : null;
  const myVotes = data?.voted ? data.myVotes : 0;
  /** 上限是**每天**的：昨天投满 5 票，今天照样能继续投。 */
  const myDayVotes = data?.voted ? data.myDayVotes : 0;
  const reachedLimit = myDayVotes >= VOTE_PER_PERSON_LIMIT;
  const quota = data?.quota;
  /** 当天额度用完、或今天给这位投满 5 票时，同侧按钮不能再加票（仍可改投）。 */
  const canAddVote = (quota?.remaining ?? 0) > 0 && !reachedLimit;
  /** 额度刷新的悬浮说明：不足 1 小时就只报分钟。 */
  const resetText = (seconds: number) => {
    const { hours, minutes } = formatResetIn(seconds);
    return hours > 0
      ? t('sukikirai.quota.resetHint', { hours, minutes })
      : t('sukikirai.quota.resetHintMinutes', { minutes });
  };

  return (
    <Page
      title={`${identity.name} · ${t('sukikirai.title')}`}
      icon={<Flame size={17} />}
      homeTo={SITE_HOME}
      className="sukikirai-page sk-detail-page"
      actions={
        <>
          <Link className="btn btn-ghost btn-sm sk-back" to={SUKIKIRAI_HOME}>
            <ArrowLeft size={15} />
            <span className="btn-text">{t('sukikirai.detail.back')}</span>
          </Link>
          {quota && (
            <span
              className={`sk-quota${quota.remaining > 0 ? '' : ' is-empty'}`}
              title={quota ? resetText(quota.resetsInSeconds) : undefined}
            >
              {quota.remaining > 0
                ? t('sukikirai.quota.pill', { remaining: quota.remaining })
                : t('sukikirai.quota.pillEmpty')}
            </span>
          )}
        </>
      }
    >
      <div className="card sk-person">
        <div className="sk-person-head">
          <SeiyuuPhoto
            id={identity.id}
            name={identity.name}
            className="sk-person-photo"
            fallbackClassName="sk-person-photo sk-photo-fallback"
          />
          <div className="sk-person-copy">
            <h2 className="sk-person-name">
              {identity.name}
              {isEasterEgg(identity.id) && (
                <em className="sk-egg-tag">{t('sukikirai.easterEgg')}</em>
              )}
            </h2>
            <p className="sk-person-sub">
              {identity.nameJa}
              {identity.romaji ? ` · ${identity.romaji}` : ''}
            </p>
            <p className="sk-person-projects">
              <span className="sk-project-chip">{t(`sukikirai.projects.${identity.project}`)}</span>
              {identity.alsoIn?.map((project) => (
                <span key={project} className="sk-project-chip is-muted">
                  {t(`sukikirai.projects.${project}`)}
                </span>
              ))}
            </p>
            {eggIntro ? (
              <p className="sk-person-intro">{eggIntro}</p>
            ) : (
              <p className="muted sk-person-chars">
                {t('sukikirai.detail.reprChars')}
                {identity.characters.slice(0, 3).map(formatCharacter).join(' / ')}
              </p>
            )}
          </div>
        </div>

        <div className="sk-vote">
          <button
            type="button"
            className={`sk-vote-btn is-like${myVote === 'like' ? ' is-active' : ''}`}
            aria-pressed={myVote === 'like'}
            disabled={voting || (myVote === 'like' && !canAddVote)}
            onClick={() => vote('like')}
          >
            <Heart size={26} aria-hidden="true" />
            <span>{t('sukikirai.choice.like')}</span>
            {myVote === 'like' && (
              <span className="sk-vote-count">
                {t('sukikirai.vote.count', { votes: myDayVotes, limit: VOTE_PER_PERSON_LIMIT })}
              </span>
            )}
          </button>
          <button
            type="button"
            className={`sk-vote-btn is-dislike${myVote === 'dislike' ? ' is-active' : ''}`}
            aria-pressed={myVote === 'dislike'}
            disabled={voting || (myVote === 'dislike' && !canAddVote)}
            onClick={() => vote('dislike')}
          >
            <ThumbsDown size={26} aria-hidden="true" />
            <span>{t('sukikirai.choice.dislike')}</span>
            {myVote === 'dislike' && (
              <span className="sk-vote-count">
                {t('sukikirai.vote.count', { votes: myDayVotes, limit: VOTE_PER_PERSON_LIMIT })}
              </span>
            )}
          </button>
        </div>

        <p className="muted sk-vote-hint">
          {!myVote
            ? t('sukikirai.vote.hint')
            : reachedLimit
              ? t('sukikirai.vote.full', {
                  choice: t(`sukikirai.choice.${myVote}`),
                  limit: VOTE_PER_PERSON_LIMIT,
                })
              : t('sukikirai.vote.mine', {
                  choice: t(`sukikirai.choice.${myVote}`),
                  votes: myDayVotes,
                  total: myVotes,
                  limit: VOTE_PER_PERSON_LIMIT,
                  remaining: quota?.remaining ?? 0,
                })}
        </p>

        {loading && !data ? (
          <div className="page-loading" aria-busy="true">
            <div className="spinner" />
          </div>
        ) : error ? (
          <div className="sk-error-inline">
            <p className="muted">{error}</p>
            <button type="button" className="btn btn-sm" onClick={load}>
              <RefreshCw size={14} />
              {t('common.retry')}
            </button>
          </div>
        ) : data?.voted ? (
          <>
            <SukikiraiVoteBar
              counts={{ likes: data.likes, dislikes: data.dislikes, total: data.total }}
              myVote={data.myVote}
            />
            <section className="sk-reasons">
              <h3>{t('sukikirai.reasons.title')}</h3>
              <p className="muted sk-reasons-hint">{t('sukikirai.reasons.hint')}</p>
              <div className="sk-reason-chips">
                {VOTE_REASON_IDS[data.myVote].map((reasonId) => (
                  <button
                    key={reasonId}
                    type="button"
                    className={`sk-reason-chip is-${data.myVote}${
                      data.myReason === reasonId ? ' is-active' : ''
                    }`}
                    aria-pressed={data.myReason === reasonId}
                    disabled={voting}
                    onClick={() => void setReason(reasonId)}
                  >
                    {t(`sukikirai.reasons.${data.myVote}.${reasonId}`)}
                  </button>
                ))}
                {data.myReason && (
                  <button
                    type="button"
                    className="sk-reason-chip is-clear"
                    disabled={voting}
                    onClick={() => void setReason(null)}
                  >
                    {t('sukikirai.reasons.clear')}
                  </button>
                )}
              </div>
              <p className="muted sk-reasons-mine">
                {data.myReason
                  ? t('sukikirai.reasons.mine', {
                      reason: t(`sukikirai.reasons.${data.myVote}.${data.myReason}`),
                    })
                  : t('sukikirai.reasons.none')}
              </p>
              <ReasonStats reasons={data.reasons} />
            </section>
          </>
        ) : (
          <div className="sk-locked">
            <Lock size={22} aria-hidden="true" />
            <p className="sk-locked-title">{t('sukikirai.result.lockedTitle')}</p>
            <p className="muted">{t('sukikirai.result.lockedHint')}</p>
          </div>
        )}

        <div className="sk-person-foot">{backLink}</div>
      </div>

      {data && (
        <SukikiraiComments
          seiyuuId={identity.id}
          enabled={data.commentsEnabled}
          hasVoted={data.voted}
          comments={data.voted ? data.comments : []}
          onSubmitted={load}
        />
      )}
    </Page>
  );
}
