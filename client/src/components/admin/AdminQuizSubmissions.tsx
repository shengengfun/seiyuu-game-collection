import { useCallback, useEffect, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Search, Trash2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { api, errMsg } from '../../api/client';
import { useConfirm } from '../ConfirmDialog';
import { toast } from '../Toast';
import { currentLocale } from '../../i18n';
import { formatServerDate } from '../../utils/serverDate';

type SubmissionStatus = 'all' | 'pending' | 'approved' | 'rejected';
type ReviewStatus = Exclude<SubmissionStatus, 'all'>;

interface QuizSubmission {
  id: number;
  seiyuuId: string;
  seiyuuName: string;
  level: string;
  prompt: string;
  options: string[];
  answer: number;
  explain: string;
  source: string;
  submitterName: string;
  status: string;
  reviewNote: string | null;
  createdAt: string;
}

interface SubmissionPage {
  items: QuizSubmission[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const STATUSES: SubmissionStatus[] = ['pending', 'approved', 'rejected', 'all'];
const OPTION_LETTERS = ['A', 'B', 'C', 'D'];

/**
 * 「声优问答」玩家投稿的人工审核。
 *
 * 一张卡片 = 一道投稿题（题干 / 选项 / 正确答案 / 解析 / 出处全部摊开），
 * 点通过就会立刻上线到对应声优的题库（前端拉 `/api/seiyuu-quiz/community` 合并）。
 */
export default function AdminQuizSubmissions() {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const [status, setStatus] = useState<SubmissionStatus>('pending');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [items, setItems] = useState<QuizSubmission[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get<SubmissionPage>('/admin/quiz-submissions', {
        params: { status, page, pageSize, search: search || undefined },
      });
      setItems(Array.isArray(response.data?.items) ? response.data.items : []);
      setTotal(Number(response.data?.total ?? 0));
      setTotalPages(Number(response.data?.totalPages ?? 1));
    } catch (error) {
      toast.error(errMsg(error));
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, status]);

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

  const review = async (item: QuizSubmission, next: ReviewStatus) => {
    if (next === 'approved') {
      const ok = await confirm({
        title: t('admin.approveQuizSubmissionTitle'),
        message: t('admin.quizSubmissionReviewMessage'),
        confirmLabel: t('admin.approveQuizSubmission'),
      });
      if (!ok) return;
    }
    if (next === 'rejected') {
      const ok = await confirm({
        title: t('admin.rejectQuizSubmissionTitle'),
        message: t('admin.quizSubmissionRejectMessage'),
        confirmLabel: t('admin.rejectQuizSubmission'),
        tone: 'warning',
      });
      if (!ok) return;
    }
    setBusyId(item.id);
    try {
      await api.patch(`/admin/quiz-submissions/${item.id}`, { status: next, note: notes[item.id] ?? '' });
      toast.success(next === 'approved' ? t('admin.quizSubmissionApproved') : t('admin.quizSubmissionRejected'));
      await load();
    } catch (error) {
      toast.error(errMsg(error));
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (item: QuizSubmission) => {
    const ok = await confirm({
      title: t('admin.deleteQuizSubmissionTitle'),
      message: t('admin.deleteQuizSubmissionMessage'),
      confirmLabel: t('admin.deleteQuizSubmission'),
      tone: 'danger',
    });
    if (!ok) return;
    setBusyId(item.id);
    try {
      await api.delete(`/admin/quiz-submissions/${item.id}`);
      toast.success(t('admin.quizSubmissionDeleted'));
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
          <h3>{t('admin.quizSubmissionsTitle')}</h3>
          <p className="muted">{t('admin.totalQuizSubmissions', { count: total })}</p>
        </div>
      </div>
      <div className="admin-list-toolbar">
        <label className="admin-search">
          <Search size={16} />
          <input
            className="input"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder={t('admin.searchQuizSubmissions')}
          />
        </label>
        <div className="admin-quiz-status-filter" role="group" aria-label={t('admin.quizSubmissionStatusLabel')}>
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
              {t(`admin.quizSubmissionStatus.${item}`)}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="table-skeleton" role="status" aria-label={t('common.loading')}><i /><i /><i /></div>
      )}
      {!loading && items.length === 0 && <p className="muted">{t('admin.noQuizSubmissions')}</p>}

      <ul className="admin-quiz-submissions">
        {items.map((item) => (
          <li key={item.id} className={`admin-quiz-submission is-${item.status}`}>
            <div className="admin-quiz-submission-head">
              <span className="admin-quiz-submission-seiyuu">{item.seiyuuName}</span>
              <span className={`sq-level-tag sq-level-${item.level}`}>
                {t(`seiyuuQuiz.levels.${item.level}`, { defaultValue: item.level })}
              </span>
              <span className="admin-quiz-submission-status">
                {t(`admin.quizSubmissionStatus.${item.status}`, { defaultValue: item.status })}
              </span>
              <span className="muted admin-quiz-submission-meta">
                {`${item.submitterName || '-'} · ${formatServerDate(item.createdAt, currentLocale())}`}
              </span>
            </div>
            <p className="admin-quiz-submission-prompt">{item.prompt}</p>
            <ul className="admin-quiz-submission-options">
              {item.options.map((option, index) => (
                <li key={`${item.id}-${index}`} className={index === item.answer ? 'is-answer' : undefined}>
                  <span className="admin-quiz-submission-letter">{OPTION_LETTERS[index] ?? index + 1}</span>
                  {option}
                </li>
              ))}
            </ul>
            {item.explain && (
              <p className="admin-quiz-submission-explain">
                <b>{t('admin.quizSubmissionExplain')}</b>
                {item.explain}
              </p>
            )}
            {item.source && (
              <p className="muted admin-quiz-submission-source">
                <b>{t('admin.quizSubmissionSource')}</b>
                {item.source}
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
                onChange={(event) => setNotes((current) => ({ ...current, [item.id]: event.target.value }))}
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
                  {t('admin.approveQuizSubmission')}
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
                  {t('admin.rejectQuizSubmission')}
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
        ))}
      </ul>

      <div className="admin-pagination">
        <span className="muted">
          {total ? `${(page - 1) * pageSize + 1}-${Math.min(page * pageSize, total)} / ${total}` : t('admin.zeroItems')}
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
