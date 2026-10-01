import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Heart, MessageCircle, ThumbsDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { api, errMsg } from '@seiyuu/game-sdk';
import { toast } from '@seiyuu/game-sdk';
import { useAuth } from '@seiyuu/game-sdk';
import { formatServerDate } from '@seiyuu/game-sdk';
import { COMMENT_MAX_LENGTH, type CommentView } from './model/sukikirai';

interface Props {
  seiyuuId: string;
  /** 服务端开关：关闭时整块只留一句预告。 */
  enabled: boolean;
  hasVoted: boolean;
  comments: CommentView[];
  /** 发表（或重投）后重新拉取人物页数据，让新短评立刻出现在列表里。 */
  onSubmitted?: () => void;
}

/** 提交结果：与 `POST /api/sukikirai/comments` 的返回对齐。 */
interface SubmitResult {
  id?: number;
  status: 'approved' | 'pending' | 'rejected';
  action: 'approve' | 'review' | 'reject';
  score?: number;
  auto?: boolean;
  resubmitted?: boolean;
}

/**
 * 人物页的短评区。
 *
 * 规则：必须登录 + 必须已经投过票才能发。发表时先过服务端的**本地审核引擎**：
 * 干净内容直接公开，拿不准的转人工，明确违规的直接拦下（作者可改写重投）。
 */
export default function SukikiraiComments({ seiyuuId, enabled, hasVoted, comments, onSubmitted }: Props) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const location = useLocation();
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);

  if (!enabled) {
    return (
      <section className="card sk-comments sk-comments-soon">
        <h3>
          <MessageCircle size={16} aria-hidden="true" />
          {t('sukikirai.comments.title')}
        </h3>
        <p className="muted">{t('sukikirai.comments.comingSoon')}</p>
      </section>
    );
  }

  const submit = async () => {
    const text = body.trim();
    if (text.length < 2) {
      toast.error(t('sukikirai.comments.errors.body'));
      return;
    }
    setSending(true);
    try {
      const response = await api.post('/sukikirai/comments', { seiyuuId, body: text });
      const result = response.data as SubmitResult;
      if (result.status === 'approved') {
        setBody('');
        toast.success(t('sukikirai.comments.published'));
        onSubmitted?.();
      } else if (result.status === 'rejected') {
        toast.error(t('sukikirai.comments.rejected'));
      } else {
        setBody('');
        toast.success(t('sukikirai.comments.done'));
        onSubmitted?.();
      }
    } catch (error) {
      toast.error(errMsg(error));
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="card sk-comments">
      <h3>
        <MessageCircle size={16} aria-hidden="true" />
        {t('sukikirai.comments.title')}
      </h3>
      <p className="muted">{t('sukikirai.comments.guide', { count: COMMENT_MAX_LENGTH })}</p>

      {comments.length === 0 ? (
        <p className="muted sk-comments-empty">{t('sukikirai.comments.empty')}</p>
      ) : (
        <ul className="sk-comment-list">
          {comments.map((comment) => (
            <li key={comment.id} className={`sk-comment is-${comment.choice}`}>
              <span className={`sk-comment-tag is-${comment.choice}`}>
                {comment.choice === 'like' ? (
                  <Heart size={12} aria-hidden="true" />
                ) : (
                  <ThumbsDown size={12} aria-hidden="true" />
                )}
                {t(`sukikirai.choice.${comment.choice}`)}
              </span>
              <span className="sk-comment-body">{comment.body}</span>
              <span className="sk-comment-meta">
                {comment.author} · {formatServerDate(comment.createdAt, i18n.language)}
              </span>
            </li>
          ))}
        </ul>
      )}

      {!hasVoted ? (
        <p className="muted">{t('sukikirai.comments.needVote')}</p>
      ) : user ? (
        <div className="sk-comment-form">
          <textarea
            value={body}
            maxLength={COMMENT_MAX_LENGTH}
            rows={3}
            placeholder={t('sukikirai.comments.placeholder')}
            aria-label={t('sukikirai.comments.title')}
            onChange={(event) => setBody(event.target.value)}
          />
          <div className="sk-comment-actions">
            <span className="muted">
              {t('sukikirai.comments.counter', { count: body.trim().length, max: COMMENT_MAX_LENGTH })}
            </span>
            <button type="button" className="btn" disabled={sending} onClick={submit}>
              {sending ? t('sukikirai.comments.sending') : t('sukikirai.comments.submit')}
            </button>
          </div>
        </div>
      ) : (
        <Link className="btn" to="/login" state={{ from: location.pathname }}>
          {t('sukikirai.comments.loginRequired')}
        </Link>
      )}
    </section>
  );
}
