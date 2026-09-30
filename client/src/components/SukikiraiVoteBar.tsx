import { Heart, ThumbsDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { votePercentages, type VoteCounts } from '../config/sukikirai';

interface Props {
  counts: Pick<VoteCounts, 'likes' | 'dislikes' | 'total'>;
  /** 我投的那一侧，用来给对应半边加高亮描边。 */
  myVote?: 'like' | 'dislike';
  /** 是否显示「共 N 票」这一行。 */
  showTotal?: boolean;
}

/**
 * 喜欢 / 讨厌的红蓝比例条（只在投票之后出现）。
 *
 * 红 = 讨厌、蓝 = 喜欢；两段按百分比撑满整条，占比过小（< 12%）时不写文字，
 * 只在图例里给出数字，避免文字挤在一起（与 SeiValue 的倾向条同一套做法）。
 */
export default function SukikiraiVoteBar({ counts, myVote, showTotal = true }: Props) {
  const { t } = useTranslation();
  const { like, dislike } = votePercentages(counts);
  const showLikeLabel = like >= 12;
  const showDislikeLabel = dislike >= 12;

  return (
    <div className="sk-result">
      <div
        className="sk-bar"
        role="img"
        aria-label={t('sukikirai.result.barLabel', { like, dislike })}
      >
        <span
          className={`sk-bar-like${myVote === 'like' ? ' is-mine' : ''}`}
          style={{ width: `${like}%` }}
        >
          {showLikeLabel && <span className="sk-bar-text">{`${like}%`}</span>}
        </span>
        <span
          className={`sk-bar-dislike${myVote === 'dislike' ? ' is-mine' : ''}`}
          style={{ width: `${dislike}%` }}
        >
          {showDislikeLabel && <span className="sk-bar-text">{`${dislike}%`}</span>}
        </span>
      </div>

      <div className="sk-legend">
        <span className="sk-legend-item is-like">
          <Heart size={14} aria-hidden="true" />
          <strong>{t('sukikirai.choice.like')}</strong>
          <span className="sk-legend-num">
            {t('sukikirai.result.count', { count: counts.likes, percent: like })}
          </span>
        </span>
        <span className="sk-legend-item is-dislike">
          <ThumbsDown size={14} aria-hidden="true" />
          <strong>{t('sukikirai.choice.dislike')}</strong>
          <span className="sk-legend-num">
            {t('sukikirai.result.count', { count: counts.dislikes, percent: dislike })}
          </span>
        </span>
      </div>

      {showTotal && (
        <p className="muted sk-total">{t('sukikirai.result.total', { count: counts.total })}</p>
      )}
    </div>
  );
}
