import { useCallback, useEffect, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Search, Trash2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { seiyuuById } from '@seiyuu/shared';
import { api, errMsg } from '../../api/client';
import { useConfirm } from '../ConfirmDialog';
import { toast } from '../Toast';
import { currentLocale } from '../../i18n';
import { formatServerDate } from '../../utils/serverDate';

type CommentStatus = 'all' | 'pending' | 'approved' | 'rejected';
type ReviewStatus = Exclude<CommentStatus, 'all'>;

interface SukikiraiComment {
  id: number;
  seiyuuId: string;
  author: string;
  choice: string;
  body: string;
  status: string;
  reviewNote: string | null;
  reviewedAt: string | null;
  createdAt: number;
  /** —— 自动审核元数据（本地引擎的判定，供人工复核）—— */
  decidedBy: string | null;
  moderationAction: string | null;
  moderationScore: number | null;
  moderationCategories: string[];
  moderationHits: string[];
  moderationReasons: string[];
}

type SourceFilter = 'all' | 'auto' | 'human';

interface CommentPage {
  commentsEnabled: boolean;
  autoSummary?: { approved: number; rejected: number };
  items: SukikiraiComment[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** 分数越高越可疑；40 分是「转人工」的分数线（与服务端引擎一致）。 */
const RISKY_SCORE = 40;

const STATUSES: CommentStatus[] = ['pending', 'approved', 'rejected', 'all'];
const SOURCES: SourceFilter[] = ['all', 'auto', 'human'];

/** 自动审核分数 → 卡片左边条配色：≥80 高风险、≥40 需留意。 */
function riskClass(item: SukikiraiComment): string {
  const score = item.moderationScore ?? 0;
  if (score >= 80) return ' is-risky';
  if (score >= RISKY_SCORE) return ' is-watch';
  return '';
}

/**
 * 「喜欢或讨厌」短评审核。
 *
 * 发表时已经过本地审核引擎（`server/src/services/moderation/`）：干净内容自动公开，
 * 拿不准的落在「待审核」，明确违规的直接自动拒绝。这里是人工复核与推翻自动判定的地方。
 */
export default function AdminSukikiraiComments() {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const [status, setStatus] = useState<CommentStatus>('pending');
  const [source, setSource] = useState<SourceFilter>('all');
  const [riskyOnly, setRiskyOnly] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [items, setItems] = useState<SukikiraiComment[]>([]);
  const [autoSummary, setAutoSummary] = useState({ approved: 0, rejected: 0 });
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [commentsEnabled, setCommentsEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get<CommentPage>('/admin/sukikirai-comments', {
        params: {
          status,
          page,
          pageSize,
          search: search || undefined,
          decidedBy: source,
          riskyOnly: riskyOnly ? 'true' : 'false',
        },
      });
      setItems(Array.isArray(response.data?.items) ? response.data.items : []);
      setTotal(Number(response.data?.total ?? 0));
      setTotalPages(Number(response.data?.totalPages ?? 1));
      setCommentsEnabled(Boolean(response.data?.commentsEnabled));
      setAutoSummary({
        approved: Number(response.data?.autoSummary?.approved ?? 0),
        rejected: Number(response.data?.autoSummary?.rejected ?? 0),
      });
    } catch (error) {
      toast.error(errMsg(error));
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, riskyOnly, search, source, status]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPage(1);
      setSearch(searchInput.trim());
    }, 250);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const review = async (item: SukikiraiComment, next: ReviewStatus) => {
    if (next !== 'pending') {
      const ok = await confirm({
        title:
          next === 'approved'
            ? t('admin.approveSukikiraiCommentTitle')
            : t('admin.rejectSukikiraiCommentTitle'),
        message: t('admin.sukikiraiCommentReviewMessage'),
        confirmLabel:
          next === 'approved'
            ? t('admin.approveSukikiraiComment')
            : t('admin.rejectSukikiraiComment'),
        ...(next === 'rejected' ? { tone: 'warning' as const } : {}),
      });
      if (!ok) return;
    }
    setBusyId(item.id);
    try {
      await api.patch(`/admin/sukikirai-comments/${item.id}`, {
        status: next,
        note: notes[item.id] ?? '',
      });
      toast.success(
        next === 'approved'
          ? t('admin.sukikiraiCommentApproved')
          : next === 'rejected'
            ? t('admin.sukikiraiCommentRejected')
            : t('admin.sukikiraiCommentReset')
      );
      await load();
    } catch (error) {
      toast.error(errMsg(error));
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (item: SukikiraiComment) => {
    const ok = await confirm({
      title: t('admin.deleteSukikiraiCommentTitle'),
      message: t('admin.deleteSukikiraiCommentMessage'),
      confirmLabel: t('admin.deleteSukikiraiComment'),
      tone: 'danger',
    });
    if (!ok) return;
    setBusyId(item.id);
    try {
      await api.delete(`/admin/sukikirai-comments/${item.id}`);
      toast.success(t('admin.sukikiraiCommentDeleted'));
      await load();
    } catch (error) {
      toast.error(errMsg(error));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="card admin-users-card">
      <div className="admin-players-header">
        <div className="admin-players-title">
          <h3>{t('admin.sukikiraiCommentsTitle')}</h3>
          <p className="muted">
            {t('admin.totalSukikiraiComments', { count: total })}
            {commentsEnabled ? '' : ` · ${t('admin.sukikiraiCommentsDisabled')}`}
          </p>
          <p className="muted">
            {t('admin.sukikiraiCommentAutoSummary', {
              approved: autoSummary.approved,
              rejected: autoSummary.rejected,
            })}
          </p>
        </div>
      </div>
      <div className="admin-list-toolbar">
        <label className="admin-search">
          <Search size={16} />
          <input
            className="input"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder={t('admin.searchSukikiraiComments')}
          />
        </label>
        <div
          className="admin-quiz-status-filter"
          role="group"
          aria-label={t('admin.sukikiraiCommentStatusLabel')}
        >
          {STATUSES.map((item) => (
            <button
              key={item}
              type="button"
              className={status === item ? 'btn btn-sm' : 'btn btn-ghost btn-sm'}
              aria-pressed={status === item}
              onClick={() => {
                setPage(1);
                setStatus(item);
              }}
            >
              {t(`admin.sukikiraiCommentStatus.${item}`)}
            </button>
          ))}
        </div>
        <div
          className="admin-quiz-status-filter"
          role="group"
          aria-label={t('admin.sukikiraiCommentSourceLabel')}
        >
          {SOURCES.map((item) => (
            <button
              key={item}
              type="button"
              className={source === item ? 'btn btn-sm' : 'btn btn-ghost btn-sm'}
              aria-pressed={source === item}
              onClick={() => {
                setPage(1);
                setSource(item);
              }}
            >
              {t(`admin.sukikiraiCommentSource.${item}`)}
            </button>
          ))}
        </div>
        <label className="admin-risky-toggle">
          <input
            type="checkbox"
            checked={riskyOnly}
            onChange={(event) => {
              setPage(1);
              setRiskyOnly(event.target.checked);
            }}
          />
          {t('admin.sukikiraiCommentRiskyOnly')}
        </label>
      </div>

      {loading && (
        <div className="table-skeleton" role="status" aria-label={t('common.loading')}>
          <i />
          <i />
          <i />
        </div>
      )}
      {!loading && items.length === 0 && <p className="muted">{t('admin.noSukikiraiComments')}</p>}

      <ul className="admin-quiz-submissions">
        {items.map((item) => {
          const identity = seiyuuById(item.seiyuuId);
          return (
            <li key={item.id} className={`admin-quiz-submission is-${item.status}${riskClass(item)}`}>
              <div className="admin-quiz-submission-head">
                <span className="admin-quiz-submission-seiyuu">
                  {identity ? identity.name : item.seiyuuId}
                </span>
                <span className={item.choice === 'dislike' ? 'badge badge-danger' : 'badge'}>
                  {t(`sukikirai.choice.${item.choice}`, { defaultValue: item.choice })}
                </span>
                <span className="admin-quiz-submission-status">
                  {t(`admin.sukikiraiCommentStatus.${item.status}`, { defaultValue: item.status })}
                </span>
                {item.decidedBy && (
                  <span
                    className={item.decidedBy === 'auto' ? 'badge badge-muted' : 'badge badge-muted'}
                    title={item.moderationReasons.join(', ')}
                  >
                    {item.decidedBy === 'auto'
                      ? t('admin.sukikiraiCommentAutoBadge', { score: item.moderationScore ?? 0 })
                      : t('admin.sukikiraiCommentHumanBadge')}
                  </span>
                )}
                <span className="muted admin-quiz-submission-meta">
                  {`${item.author || '-'} · ${formatServerDate(item.createdAt, currentLocale())}`}
                </span>
              </div>
              <p className="admin-quiz-submission-prompt">{item.body}</p>
              {(item.moderationHits.length > 0 || item.moderationCategories.length > 0) && (
                <p className="muted admin-quiz-submission-source">
                  <b>{t('admin.sukikiraiCommentModeration')}</b>
                  {item.moderationCategories.length > 0 &&
                    `${t('admin.sukikiraiCommentCategories', { list: item.moderationCategories.join(', ') })} `}
                  {item.moderationHits.length > 0 &&
                    t('admin.sukikiraiCommentHits', { words: item.moderationHits.join(', ') })}
                </p>
              )}
              {item.reviewNote && (
                <p className="muted admin-quiz-submission-source">
                  <b>{t('admin.quizSubmissionNote')}</b>
                  {item.reviewNote}
                </p>
              )}
              <div className="admin-quiz-submission-actions">
                <input
                  className="input"
                  value={notes[item.id] ?? ''}
                  onChange={(event) =>
                    setNotes((current) => ({ ...current, [item.id]: event.target.value }))
                  }
                  placeholder={t('admin.quizSubmissionNotePlaceholder')}
                  maxLength={500}
                  aria-label={t('admin.quizSubmissionNote')}
                />
                {item.status !== 'approved' && (
                  <button
                    type="button"
                    className="btn"
                    disabled={busyId === item.id}
                    onClick={() => void review(item, 'approved')}
                  >
                    <Check size={15} />
                    {t('admin.approveSukikiraiComment')}
                  </button>
                )}
                {item.status !== 'rejected' && (
                  <button
                    type="button"
                    className="btn btn-ghost"
                    disabled={busyId === item.id}
                    onClick={() => void review(item, 'rejected')}
                  >
                    <X size={15} />
                    {t('admin.rejectSukikiraiComment')}
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-danger"
                  disabled={busyId === item.id}
                  onClick={() => void remove(item)}
                >
                  <Trash2 size={15} />
                  {t('admin.deleteSubmission')}
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="admin-pagination">
        <span className="muted">
          {total
            ? `${(page - 1) * pageSize + 1}-${Math.min(page * pageSize, total)} / ${total}`
            : t('admin.zeroItems')}
        </span>
        <div className="admin-pagination-actions">
          <button
            className="btn btn-ghost"
            aria-label={t('common.previousPage')}
            disabled={loading || page <= 1}
            onClick={() => setPage((value) => Math.max(1, value - 1))}
          >
            <ChevronLeft size={17} />
          </button>
          <span>{t('admin.pageOf', { page, total: totalPages })}</span>
          <button
            className="btn btn-ghost"
            aria-label={t('common.nextPage')}
            disabled={loading || page >= totalPages}
            onClick={() => setPage((value) => value + 1)}
          >
            <ChevronRight size={17} />
          </button>
        </div>
      </div>
    </div>
  );
}
