import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Download, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { api, errMsg } from '@seiyuu/game-sdk';
import { currentLocale } from '../../i18n';
import { toast } from '@seiyuu/game-sdk';
import DataTable, { type Column } from '../DataTable';

/**
 * 管理后台「流量管理」：多维度（时间 / 路由 / 用户类型 / 状态码）+
 * 多层级（路由一级 / 二级 / 三级 + 点击下钻）+ Excel 导出。
 * 数据来自服务端按小时聚合的 traffic_stats，接口见 routes/admin.ts `/traffic`。
 */

type Granularity = 'hour' | 'day';
type RangePreset = 'today' | '7' | '30' | 'custom';

interface TrafficSeriesPoint {
  bucket: string;
  requests: number;
  bytes: number;
  errors: number;
  visitors: number;
}

interface TrafficRouteRow {
  route: string;
  requests: number;
  bytes: number;
  errors: number;
  share: number;
}

interface TrafficUserTypeRow {
  userType: 'user' | 'guest' | 'anon';
  requests: number;
  bytes: number;
  errors: number;
  visitors: number;
}

interface TrafficStatusRow {
  statusClass: string;
  requests: number;
  bytes: number;
  share: number;
}

interface TrafficReport {
  from: string;
  to: string;
  granularity: Granularity;
  level: number;
  routePrefix: string;
  generatedAt: string;
  totals: {
    requests: number;
    bytes: number;
    errors: number;
    errorRate: number;
    visitors: number;
    avgRequestsPerDay: number;
  };
  series: TrafficSeriesPoint[];
  routes: TrafficRouteRow[];
  userTypes: TrafficUserTypeRow[];
  statuses: TrafficStatusRow[];
}

const HOUR_MAX_DAYS = 3;

const pad = (value: number) => String(value).padStart(2, '0');

const dayStr = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

function shiftDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function spanDays(from: string, to: string): number {
  const start = Date.parse(`${from}T00:00:00`);
  const end = Date.parse(`${to}T00:00:00`);
  if (Number.isNaN(start) || Number.isNaN(end)) return 1;
  return Math.max(1, Math.floor((end - start) / 86_400_000) + 1);
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = bytes;
  let index = -1;
  do {
    value /= 1024;
    index += 1;
  } while (value >= 1024 && index < units.length - 1);
  const digits = value >= 100 ? 0 : value >= 10 ? 1 : 2;
  return `${value.toFixed(digits)} ${units[index]}`;
}

const numberFormat = (value: number) => value.toLocaleString(currentLocale());

export default function AdminTraffic() {
  const { t } = useTranslation();
  const today = dayStr(new Date());
  const [preset, setPreset] = useState<RangePreset>('7');
  const [from, setFrom] = useState(dayStr(shiftDays(new Date(), -6)));
  const [to, setTo] = useState(today);
  const [granularity, setGranularity] = useState<Granularity>('day');
  const [level, setLevel] = useState(1);
  const [routePrefix, setRoutePrefix] = useState('');
  const [data, setData] = useState<TrafficReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const days = spanDays(from, to);
  const hourAllowed = days <= HOUR_MAX_DAYS;

  const applyPreset = (next: Exclude<RangePreset, 'custom'>) => {
    setPreset(next);
    if (next === 'today') {
      setFrom(today);
      setTo(today);
    } else {
      const count = Number(next);
      setFrom(dayStr(shiftDays(new Date(), -(count - 1))));
      setTo(dayStr(new Date()));
    }
    setRoutePrefix('');
  };

  const query = useMemo(
    () => ({ from, to, granularity, level, routePrefix }),
    [from, to, granularity, level, routePrefix]
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get<TrafficReport>('/admin/traffic', { params: query });
      setData(response.data);
    } catch (error) {
      toast.error(errMsg(error));
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    if (!hourAllowed && granularity === 'hour') setGranularity('day');
  }, [hourAllowed, granularity]);

  useEffect(() => {
    void load();
  }, [load]);

  const doExport = async () => {
    setExporting(true);
    try {
      const locale = currentLocale();
      const lang = locale.startsWith('ja') ? 'ja' : locale.startsWith('en') ? 'en' : 'zh';
      const response = await api.get('/admin/traffic/export', {
        params: { ...query, lang },
        responseType: 'blob',
      });
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `traffic_${from}_${to}.xlsx`;
      document.body.appendChild(link);
      try {
        link.click();
      } finally {
        link.remove();
        URL.revokeObjectURL(url);
      }
      toast.success(t('admin.trafficExportDone'));
    } catch (error) {
      toast.error(errMsg(error));
    } finally {
      setExporting(false);
    }
  };

  const drill = (route: string) => {
    if (route === routePrefix) return;
    setRoutePrefix(route);
  };

  /** 面包屑：全部 > api > admin …，点任意一段回退到该层。 */
  const crumbs = useMemo(() => {
    const segments = routePrefix.split('/').filter(Boolean);
    return segments.map((segment, index) => ({
      segment,
      prefix: `/${segments.slice(0, index + 1).join('/')}`,
    }));
  }, [routePrefix]);

  const userTypeLabel = (userType: TrafficUserTypeRow['userType']) =>
    userType === 'user'
      ? t('admin.trafficUserTypeUser')
      : userType === 'guest'
        ? t('admin.trafficUserTypeGuest')
        : t('admin.trafficUserTypeAnon');

  const routeColumns: Column<TrafficRouteRow>[] = [
    {
      key: 'route',
      title: t('admin.trafficColRoute'),
      render: (row) => (
        <button
          type="button"
          className="admin-traffic-drill"
          title={t('admin.trafficDrillHint')}
          onClick={() => drill(row.route)}
        >
          {row.route}
        </button>
      ),
    },
    {
      key: 'requests',
      title: t('admin.trafficColRequests'),
      render: (row) => numberFormat(row.requests),
    },
    {
      key: 'share',
      title: t('admin.trafficColShare'),
      render: (row) => `${(row.share * 100).toFixed(1)}%`,
    },
    {
      key: 'bytes',
      title: t('admin.trafficColBytes'),
      render: (row) => formatBytes(row.bytes),
    },
    {
      key: 'errors',
      title: t('admin.trafficColErrors'),
      render: (row) => numberFormat(row.errors),
    },
  ];

  const userTypeColumns: Column<TrafficUserTypeRow>[] = [
    {
      key: 'userType',
      title: t('admin.trafficColUserType'),
      render: (row) => userTypeLabel(row.userType),
    },
    {
      key: 'requests',
      title: t('admin.trafficColRequests'),
      render: (row) => numberFormat(row.requests),
    },
    {
      key: 'visitors',
      title: t('admin.trafficColVisitors'),
      render: (row) => numberFormat(row.visitors),
    },
    {
      key: 'bytes',
      title: t('admin.trafficColBytes'),
      render: (row) => formatBytes(row.bytes),
    },
    {
      key: 'errors',
      title: t('admin.trafficColErrors'),
      render: (row) => numberFormat(row.errors),
    },
  ];

  const statusColumns: Column<TrafficStatusRow>[] = [
    { key: 'statusClass', title: t('admin.trafficColStatus') },
    {
      key: 'requests',
      title: t('admin.trafficColRequests'),
      render: (row) => numberFormat(row.requests),
    },
    {
      key: 'share',
      title: t('admin.trafficColShare'),
      render: (row) => `${(row.share * 100).toFixed(1)}%`,
    },
    {
      key: 'bytes',
      title: t('admin.trafficColBytes'),
      render: (row) => formatBytes(row.bytes),
    },
  ];

  const seriesConfig = [
    { key: 'requests' as const, label: t('admin.trafficSeriesRequests'), className: 'is-users' },
    { key: 'visitors' as const, label: t('admin.trafficSeriesVisitors'), className: 'is-guests' },
  ];

  const bucketLabel = (point: TrafficSeriesPoint) =>
    granularity === 'day' ? point.bucket.slice(5) : point.bucket.slice(11);

  if (!data) {
    return (
      <div className="card" role="status" aria-label={t('common.loading')}>
        <div className="table-skeleton">
          <i />
          <i />
          <i />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="card admin-overview-card">
        <div className="admin-players-header">
          <div className="admin-players-title">
            <h3>{t('admin.trafficTitle')}</h3>
            <p className="muted">{t('admin.trafficHint')}</p>
          </div>
          <div className="admin-traffic-actions">
            <button type="button" className="btn btn-ghost" onClick={() => void load()} disabled={loading}>
              <RefreshCw size={15} />
              {t('admin.trafficRefresh')}
            </button>
            <button type="button" className="btn" onClick={() => void doExport()} disabled={exporting}>
              <Download size={15} />
              {exporting ? t('admin.trafficExporting') : t('admin.trafficExport')}
            </button>
          </div>
        </div>

        <div className="admin-traffic-bar">
          <div className="admin-traffic-group">
            {(['today', '7', '30'] as const).map((item) => (
              <button
                key={item}
                type="button"
                className={preset === item ? 'btn' : 'btn btn-ghost'}
                onClick={() => applyPreset(item)}
              >
                {item === 'today'
                  ? t('admin.trafficRangeToday')
                  : item === '7'
                    ? t('admin.trafficRange7')
                    : t('admin.trafficRange30')}
              </button>
            ))}
          </div>
          <div className="admin-traffic-group admin-traffic-dates">
            <label>
              {t('admin.trafficFrom')}
              <input
                type="date"
                value={from}
                max={to}
                onChange={(event) => {
                  setPreset('custom');
                  setFrom(event.target.value || from);
                }}
              />
            </label>
            <label>
              {t('admin.trafficTo')}
              <input
                type="date"
                value={to}
                min={from}
                onChange={(event) => {
                  setPreset('custom');
                  setTo(event.target.value || to);
                }}
              />
            </label>
          </div>
          <div className="admin-traffic-group">
            <span>{t('admin.trafficGranularity')}</span>
            <button
              type="button"
              className={granularity === 'day' ? 'btn' : 'btn btn-ghost'}
              onClick={() => setGranularity('day')}
            >
              {t('admin.trafficGranDay')}
            </button>
            <button
              type="button"
              className={granularity === 'hour' ? 'btn' : 'btn btn-ghost'}
              disabled={!hourAllowed}
              title={hourAllowed ? undefined : t('admin.trafficHourHint')}
              onClick={() => setGranularity('hour')}
            >
              {t('admin.trafficGranHour')}
            </button>
          </div>
        </div>
      </div>

      <div className="card admin-overview-card">
        <div className="admin-overview-metrics">
          <article className="admin-overview-metric">
            <span className="admin-overview-metric-label">{t('admin.trafficRequests')}</span>
            <strong>{numberFormat(data.totals.requests)}</strong>
            <span className="admin-overview-metric-hint">
              {t('admin.trafficRequestsHint', { avg: numberFormat(data.totals.avgRequestsPerDay) })}
            </span>
          </article>
          <article className="admin-overview-metric">
            <span className="admin-overview-metric-label">{t('admin.trafficVisitors')}</span>
            <strong>{numberFormat(data.totals.visitors)}</strong>
            <span className="admin-overview-metric-hint">{t('admin.trafficVisitorsHint')}</span>
          </article>
          <article className="admin-overview-metric">
            <span className="admin-overview-metric-label">{t('admin.trafficBytes')}</span>
            <strong>{formatBytes(data.totals.bytes)}</strong>
            <span className="admin-overview-metric-hint">
              {t('admin.trafficBytesHint', { bytes: numberFormat(data.totals.bytes) })}
            </span>
          </article>
          <article className="admin-overview-metric">
            <span className="admin-overview-metric-label">{t('admin.trafficErrorRate')}</span>
            <strong>{`${(data.totals.errorRate * 100).toFixed(2)}%`}</strong>
            <span className="admin-overview-metric-hint">
              {t('admin.trafficErrorRateHint', { errors: numberFormat(data.totals.errors) })}
            </span>
          </article>
        </div>
      </div>

      <div className="card admin-overview-card">
        <div className="admin-players-header">
          <div className="admin-players-title">
            <h3>{t('admin.trafficTrend')}</h3>
          </div>
        </div>
        <div
          className="admin-overview-chart"
          style={{ '--overview-columns': data.series.length } as CSSProperties}
        >
          <div className="admin-overview-chart-head" aria-hidden="true">
            <span />
            {data.series.map((point) => (
              <span className="admin-overview-chart-date" key={point.bucket}>
                {bucketLabel(point)}
              </span>
            ))}
          </div>
          {seriesConfig.map((series) => {
            const peak = Math.max(1, ...data.series.map((point) => point[series.key]));
            return (
              <div className="admin-overview-chart-row" key={series.key}>
                <span className="admin-overview-chart-series">{series.label}</span>
                {data.series.map((point) => {
                  const value = point[series.key];
                  return (
                    <span
                      className="admin-overview-chart-cell"
                      key={point.bucket}
                      title={`${point.bucket} · ${series.label} · ${value}`}
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

      <div className="card admin-overview-card">
        <div className="admin-players-header">
          <div className="admin-players-title">
            <h3>{t('admin.trafficByRoute')}</h3>
            <p className="muted admin-traffic-note">{t('admin.trafficDrillHint')}</p>
          </div>
          <div className="admin-traffic-group">
            <span>{t('admin.trafficLevelLabel')}</span>
            {([1, 2, 3] as const).map((item) => (
              <button
                key={item}
                type="button"
                className={level === item ? 'btn' : 'btn btn-ghost'}
                onClick={() => setLevel(item)}
              >
                {item === 1
                  ? t('admin.trafficLevel1')
                  : item === 2
                    ? t('admin.trafficLevel2')
                    : t('admin.trafficLevel3')}
              </button>
            ))}
          </div>
        </div>
        <div className="admin-traffic-crumbs">
          <button
            type="button"
            className={routePrefix === '' ? 'is-current' : undefined}
            onClick={() => setRoutePrefix('')}
          >
            {t('admin.trafficCrumbRoot')}
          </button>
          {crumbs.map((crumb) => (
            <span key={crumb.prefix}>
              <span aria-hidden="true"> / </span>
              <button
                type="button"
                className={crumb.prefix === routePrefix ? 'is-current' : undefined}
                onClick={() => setRoutePrefix(crumb.prefix)}
              >
                {crumb.segment}
              </button>
            </span>
          ))}
        </div>
        <DataTable
          columns={routeColumns}
          rows={data.routes}
          rowKey={(row) => row.route}
          empty={t('admin.trafficNoData')}
          loading={loading}
        />
      </div>

      <div className="admin-traffic-grid">
        <div className="card admin-overview-card">
          <div className="admin-players-header">
            <div className="admin-players-title">
              <h3>{t('admin.trafficByUserType')}</h3>
            </div>
          </div>
          <DataTable
            columns={userTypeColumns}
            rows={data.userTypes}
            rowKey={(row) => row.userType}
            empty={t('admin.trafficNoData')}
            loading={loading}
          />
        </div>
        <div className="card admin-overview-card">
          <div className="admin-players-header">
            <div className="admin-players-title">
              <h3>{t('admin.trafficByStatus')}</h3>
            </div>
          </div>
          <DataTable
            columns={statusColumns}
            rows={data.statuses}
            rowKey={(row) => row.statusClass}
            empty={t('admin.trafficNoData')}
            loading={loading}
          />
        </div>
      </div>
    </>
  );
}
