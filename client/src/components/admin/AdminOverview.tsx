import { useCallback, useEffect, useState, type CSSProperties } from 'react';
import { AlertTriangle, ClipboardCheck, ClipboardList, Megaphone, RefreshCw, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { api, errMsg } from '../../api/client';
import { toast } from '../Toast';
import { currentLocale } from '../../i18n';
import type { AdminTab } from '../../pages/Admin';

interface OverviewTrendPoint {
  date: string;
  users: number;
  guests: number;
  singleGames: number;
  matches: number;
}

interface Overview {
  generatedAt: string;
  today: string;
  users: { total: number; admins: number; banned: number; newToday: number; activeToday: number };
  guests: { total: number; newToday: number; activeToday: number };
  games: { singleTotal: number; singleToday: number; multiTotal: number; multiToday: number };
  content: {
    seiyuus: number;
    announcements: number;
    pendingReports: number;
    pendingPlayerChanges: number;
    pendingQuizSubmissions: number;
    approvedQuizSubmissions: number;
  };
  trend: OverviewTrendPoint[];
}

interface TrendSeries {
  key: 'users' | 'guests' | 'singleGames' | 'matches';
  labelKey: string;
  className: string;
}

const TREND_SERIES: TrendSeries[] = [
  { key: 'users', labelKey: 'admin.overviewTrendUsers', className: 'is-users' },
  { key: 'guests', labelKey: 'admin.overviewTrendGuests', className: 'is-guests' },
  { key: 'singleGames', labelKey: 'admin.overviewTrendSingle', className: 'is-single' },
  { key: 'matches', labelKey: 'admin.overviewTrendMatches', className: 'is-matches' },
];

/** 管理后台「数据概览」：站点规模、待办数量与近 7 日趋势。 */
export default function AdminOverview({ onJump }: { onJump: (tab: AdminTab) => void }) {
  const { t } = useTranslation();
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get<Overview>('/admin/overview');
      setData(response.data);
    } catch (error) {
      toast.error(errMsg(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (!data) {
    return (
      <div className="card" role="status" aria-label={t('common.loading')}>
        <div className="table-skeleton"><i /><i /><i /></div>
      </div>
    );
  }

  const pendingTiles = [
    {
      key: 'reports' as AdminTab,
      icon: AlertTriangle,
      label: t('admin.overviewPendingReports'),
      value: data.content.pendingReports,
    },
    {
      key: 'playerChanges' as AdminTab,
      icon: ClipboardCheck,
      label: t('admin.overviewPendingPlayerChanges'),
      value: data.content.pendingPlayerChanges,
    },
    {
      key: 'quizSubmissions' as AdminTab,
      icon: ClipboardList,
      label: t('admin.overviewPendingQuiz'),
      value: data.content.pendingQuizSubmissions,
    },
  ];

  return (
    <>
      <div className="card admin-overview-card">
        <div className="admin-players-header">
          <div className="admin-players-title">
            <h3>{t('admin.overviewTitle')}</h3>
            <p className="muted">
              {t('admin.overviewUpdatedAt', {
                time: new Date(data.generatedAt).toLocaleString(currentLocale()),
              })}
            </p>
          </div>
          <button type="button" className="btn btn-ghost" onClick={() => void load()} disabled={loading}>
            <RefreshCw size={15} />
            {t('admin.overviewRefresh')}
          </button>
        </div>

        <div className="admin-overview-metrics">
          <article className="admin-overview-metric">
            <span className="admin-overview-metric-label">{t('admin.overviewUsers')}</span>
            <strong>{data.users.total}</strong>
            <span className="admin-overview-metric-hint">
              {t('admin.overviewUsersHint', { newCount: data.users.newToday, activeCount: data.users.activeToday })}
            </span>
          </article>
          <article className="admin-overview-metric">
            <span className="admin-overview-metric-label">{t('admin.overviewGuests')}</span>
            <strong>{data.guests.total}</strong>
            <span className="admin-overview-metric-hint">
              {t('admin.overviewGuestsHint', { newCount: data.guests.newToday, activeCount: data.guests.activeToday })}
            </span>
          </article>
          <article className="admin-overview-metric">
            <span className="admin-overview-metric-label">{t('admin.overviewSingleGames')}</span>
            <strong>{data.games.singleTotal}</strong>
            <span className="admin-overview-metric-hint">
              {t('admin.overviewSingleGamesHint', { today: data.games.singleToday })}
            </span>
          </article>
          <article className="admin-overview-metric">
            <span className="admin-overview-metric-label">{t('admin.overviewMultiGames')}</span>
            <strong>{data.games.multiTotal}</strong>
            <span className="admin-overview-metric-hint">
              {t('admin.overviewMultiGamesHint', { today: data.games.multiToday })}
            </span>
          </article>
        </div>
      </div>

      <div className="card admin-overview-card">
        <div className="admin-players-header">
          <div className="admin-players-title">
            <h3>{t('admin.overviewPending')}</h3>
          </div>
        </div>
        <div className="admin-overview-pending">
          {pendingTiles.map((tile) => {
            const Icon = tile.icon;
            return (
              <button
                key={tile.key}
                type="button"
                className={tile.value > 0 ? 'admin-overview-pending-tile is-active' : 'admin-overview-pending-tile'}
                onClick={() => onJump(tile.key)}
              >
                <Icon size={17} aria-hidden="true" />
                <span>{tile.label}</span>
                <strong>{tile.value}</strong>
              </button>
            );
          })}
          <div className="admin-overview-pending-tile is-static">
            <Users size={17} aria-hidden="true" />
            <span>{t('admin.overviewApprovedQuiz')}</span>
            <strong>{data.content.approvedQuizSubmissions}</strong>
          </div>
        </div>
        <div className="admin-overview-content">
          <span>{t('admin.overviewContent')}</span>
          <span className="admin-overview-chip">
            {t('admin.overviewSeiyuus')} <b>{data.content.seiyuus}</b>
          </span>
          <span className="admin-overview-chip">
            <Megaphone size={13} aria-hidden="true" />
            {t('admin.overviewAnnouncements')} <b>{data.content.announcements}</b>
          </span>
        </div>
      </div>

      <div className="card admin-overview-card">
        <div className="admin-players-header">
          <div className="admin-players-title">
            <h3>{t('admin.overviewTrend')}</h3>
          </div>
        </div>
        {/*
          每个指标一行、柱子按**该指标自身**的近 7 日峰值缩放。
          一开始做成「同一天四个柱子并排」，但访客数比其它三组大一到两个量级，
          结果除访客外全是 2px 的小点，完全读不出信息；分行使每行都有可比性，
          再把数值直接写在柱子下面，不用悬停也能看。
        */}
        <div
          className="admin-overview-chart"
          style={{ '--overview-columns': data.trend.length } as CSSProperties}
        >
          <div className="admin-overview-chart-head" aria-hidden="true">
            <span />
            {data.trend.map((point) => (
              <span className="admin-overview-chart-date" key={point.date}>{point.date.slice(5)}</span>
            ))}
          </div>
          {TREND_SERIES.map((series) => {
            const peak = Math.max(1, ...data.trend.map((point) => point[series.key]));
            return (
              <div className="admin-overview-chart-row" key={series.key}>
                <span className="admin-overview-chart-series">{t(series.labelKey)}</span>
                {data.trend.map((point) => {
                  const value = point[series.key];
                  return (
                    <span
                      className="admin-overview-chart-cell"
                      key={point.date}
                      title={`${point.date} · ${t(series.labelKey)} · ${value}`}
                    >
                      <span className="admin-overview-chart-slot">
                        <span
                          className={`admin-overview-bar ${series.className}`}
                          style={{ height: `${value === 0 ? 2 : Math.max(10, (value / peak) * 100)}%` }}
                        />
                      </span>
                      <span className="admin-overview-chart-value">{value}</span>
                    </span>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
