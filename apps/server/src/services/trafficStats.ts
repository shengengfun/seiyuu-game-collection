import crypto from 'crypto';
import type { Knex } from 'knex';
import * as XLSX from 'xlsx';
import { db } from '../db/knex';

/**
 * 管理后台「流量管理」的统计口径与报表构建。
 *
 * 数据来源是 middleware/traffic.ts 在每个请求结束时打的点，按**服务器本地小时**
 * 聚合进 traffic_stats（bucket = `YYYY-MM-DDTHH`）；独立访客明细进 traffic_visitors
 * （同一访客每天/每小时各去重一次，day 桶与 hour 桶并存，天级 UV = 去重后计数）。
 *
 * 查询侧支持多维度（时间 / 路由 / 用户类型 / 状态码）与多层级（路由按一级 / 二级 /
 * 三级归并），并可导出多 Sheet 的 Excel（复用服务端已有的 xlsx 依赖）。
 */

export type TrafficUserType = 'user' | 'guest' | 'anon';
export type TrafficGranularity = 'hour' | 'day';
export type TrafficLocale = 'zh' | 'en' | 'ja';

export interface TrafficEvent {
  /** 本地小时桶，在**打点时刻**生成（跨整点的请求仍归属开始时的桶）。 */
  bucket: string;
  route: string;
  userType: TrafficUserType;
  statusClass: string;
  bytes: number;
  visitor: string;
}

export interface TrafficReportQuery {
  from: string;
  to: string;
  granularity: TrafficGranularity;
  level: number;
  routePrefix: string;
}

export interface TrafficSeriesPoint {
  bucket: string;
  requests: number;
  bytes: number;
  errors: number;
  visitors: number;
}

export interface TrafficRouteRow {
  route: string;
  requests: number;
  bytes: number;
  errors: number;
  share: number;
}

export interface TrafficUserTypeRow {
  userType: TrafficUserType;
  requests: number;
  bytes: number;
  errors: number;
  visitors: number;
}

export interface TrafficStatusRow {
  statusClass: string;
  requests: number;
  bytes: number;
  share: number;
}

export interface TrafficReport {
  from: string;
  to: string;
  granularity: TrafficGranularity;
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

const pad = (value: number) => String(value).padStart(2, '0');

const dayKey = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

/** 本地小时桶 `YYYY-MM-DDTHH`。整点区间用字符串比较即可，与查询的 from/to 同为本地时区。 */
export function localHourBucket(date = new Date()): string {
  return `${dayKey(date)}T${pad(date.getHours())}`;
}

/** 两个 `YYYY-MM-DD` 之间的天数（含首尾），跨度非法时由 zod 拦截。 */
export function trafficSpanDays(from: string, to: string): number {
  const start = Date.parse(`${from}T00:00:00`);
  const end = Date.parse(`${to}T00:00:00`);
  if (Number.isNaN(start) || Number.isNaN(end)) return Number.NaN;
  return Math.floor((end - start) / 86_400_000) + 1;
}

const ID_SEGMENTS = /^\d+$/;
const UUID_SEGMENTS = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * 把请求路径归一化成统计用的「路由」：
 *  - `/api/*`：id / UUID / 超长签名段替换为 `:id`，保留模块层级；
 *  - 带扩展名的静态资源按类型归桶（构建产物文件名带 hash，逐个记录会把基数打爆）；
 *  - 其余视为 SPA 页面路径，保留原样（id 段同样归一化）。
 */
export function normalizeRoute(pathname: string): string {
  const clean = pathname.split('?')[0].split('#')[0] || '/';
  const normalizeSegment = (segment: string) =>
    ID_SEGMENTS.test(segment) || UUID_SEGMENTS.test(segment) || segment.length > 16
      ? ':id'
      : segment;
  if (clean === '/api' || clean.startsWith('/api/')) {
    const parts = clean.split('/').filter(Boolean).slice(1).map(normalizeSegment);
    return parts.length ? `/api/${parts.join('/')}` : '/api';
  }
  const segments = clean.split('/').filter(Boolean);
  const last = segments[segments.length - 1] ?? '';
  if (last.includes('.')) {
    const dot = last.lastIndexOf('.');
    const ext = last.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8);
    return `/static/${ext || 'bin'}`;
  }
  return segments.length ? `/${segments.map(normalizeSegment).join('/')}` : '/';
}

/**
 * 路由按层级归并（多层级下钻口径）：
 *  - 深度 = 当前前缀深度 + level；无前缀且是 `/api/*` 时先跳过结构段 `api`，
 *    所以根下「一级」= `/api/admin` 这种模块级；
 *  - level=1/2/3 表示在当前层级下再细分 1/2/3 级；不足该深度则保留完整路由。
 */
export function routePrefixAtLevel(route: string, level: number, prefix = ''): string {
  const segments = route.split('/').filter(Boolean);
  let base = prefix.replace(/\/+$/, '').split('/').filter(Boolean).length;
  if (base === 0 && segments[0] === 'api') base = 1;
  const depth = base + level;
  if (segments.length <= depth) return route;
  return `/${segments.slice(0, depth).join('/')}`;
}

/* ------------------------------------------------------------------ 采集侧 */

type PendingEvent = TrafficEvent;

const queue: PendingEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
const FLUSH_DELAY_MS = 1000;
const INSERT_CHUNK = 100;
const VISITOR_CHUNK = 200;

/** 打一个请求流量点（在 response finish 时调用；bucket 在此时刻固化）。 */
export function recordTraffic(event: Omit<TrafficEvent, 'bucket'>): void {
  queue.push({ ...event, bucket: localHourBucket() });
  if (!flushTimer) {
    flushTimer = setTimeout(() => {
      flushTimer = null;
      void flushTraffic();
    }, FLUSH_DELAY_MS);
    flushTimer.unref?.();
  }
}

async function flushTraffic(): Promise<void> {
  if (!queue.length) return;
  const events = queue.splice(0, queue.length);
  const aggregates = new Map<
    string,
    { bucket: string; route: string; userType: TrafficUserType; statusClass: string; requests: number; bytes: number }
  >();
  const visitors = new Map<string, { bucket: string; visitor: string }>();
  for (const event of events) {
    const key = `${event.bucket}\u0000${event.route}\u0000${event.userType}\u0000${event.statusClass}`;
    const current = aggregates.get(key);
    if (current) {
      current.requests += 1;
      current.bytes += event.bytes;
    } else {
      aggregates.set(key, {
        bucket: event.bucket,
        route: event.route,
        userType: event.userType,
        statusClass: event.statusClass,
        requests: 1,
        bytes: event.bytes,
      });
    }
    // 天 / 小时两个粒度各去重一次：天级 UV 直接 count(day 桶)，小时趋势 count(hour 桶)。
    visitors.set(`${event.bucket.slice(0, 10)}\u0000${event.visitor}`, {
      bucket: event.bucket.slice(0, 10),
      visitor: event.visitor,
    });
    visitors.set(`${event.bucket}\u0000${event.visitor}`, { bucket: event.bucket, visitor: event.visitor });
  }
  try {
    const rows = [...aggregates.values()];
    for (let index = 0; index < rows.length; index += INSERT_CHUNK) {
      const chunk = rows.slice(index, index + INSERT_CHUNK);
      // sqlite(≥3.24) 与 Postgres 都支持 ON CONFLICT ... DO UPDATE + excluded。
      await db.raw(
        `insert into traffic_stats (bucket, route, user_type, status_class, requests, bytes)
         values ${chunk.map(() => '(?, ?, ?, ?, ?, ?)').join(', ')}
         on conflict (bucket, route, user_type, status_class)
         do update set requests = traffic_stats.requests + excluded.requests,
                       bytes = traffic_stats.bytes + excluded.bytes`,
        chunk.flatMap((row) => [
          row.bucket,
          row.route,
          row.userType,
          row.statusClass,
          row.requests,
          row.bytes,
        ])
      );
    }
    const visitorRows = [...visitors.values()];
    for (let index = 0; index < visitorRows.length; index += VISITOR_CHUNK) {
      await db('traffic_visitors')
        .insert(visitorRows.slice(index, index + VISITOR_CHUNK))
        .onConflict(['bucket', 'visitor'])
        .ignore();
    }
  } catch (err) {
    // 采样失败只丢这一批，绝不影响业务请求。
    console.error('[server:traffic-flush]', err);
  }
}

/* ------------------------------------------------------------------ 查询侧 */

function enumerateBuckets(from: string, to: string, granularity: TrafficGranularity): string[] {
  const buckets: string[] = [];
  const cursor = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  while (cursor <= end) {
    if (granularity === 'day') {
      buckets.push(dayKey(cursor));
    } else {
      for (let hour = 0; hour < 24; hour += 1) buckets.push(`${dayKey(cursor)}T${pad(hour)}`);
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return buckets;
}

const number = (value: unknown) => Number(value ?? 0) || 0;

export async function buildTrafficReport(query: TrafficReportQuery): Promise<TrafficReport> {
  const { from, to, granularity, level } = query;
  const prefix = query.routePrefix.replace(/\/+$/, '');
  // traffic_stats 恒为小时桶：区间上界必须带 T23，否则会把 to 当天的小时全漏掉。
  const minBucket = `${from}T00`;
  const maxBucket = `${to}T23`;
  // 访客表里 day 桶（10 位）与 hour 桶（13 位）并存，区间上界要带 T23 才能覆盖 hour 桶。
  const visitorMin = from;
  const visitorMax = `${to}T23`;
  const errorsExpr = `sum(case when status_class in ('4xx', '5xx') then requests else 0 end)`;

  const scoped = (builder: Knex.QueryBuilder): Knex.QueryBuilder => {
    builder.whereBetween('bucket', [minBucket, maxBucket]);
    // routePrefix 由 zod 限定为 [\w\-/:]，不含 %/_，LIKE 模式无需转义。
    if (prefix) builder.whereRaw('(route = ? or route like ?)', [prefix, `${prefix}/%`]);
    return builder;
  };

  const [totalsRow, seriesRows, routeRows, userTypeRows, statusRows, uvTotalRow, uvSeriesRows, uvTypeRows] =
    await Promise.all([
      scoped(db('traffic_stats')).select([
        db.raw('coalesce(sum(requests), 0) as requests'),
        db.raw('coalesce(sum(bytes), 0) as bytes'),
        db.raw(`coalesce(${errorsExpr}, 0) as errors`),
      ]),
      scoped(db('traffic_stats'))
        .select([
          'bucket',
          db.raw('sum(requests) as requests'),
          db.raw('sum(bytes) as bytes'),
          db.raw(`${errorsExpr} as errors`),
        ])
        .groupBy('bucket'),
      scoped(db('traffic_stats'))
        .select([
          'route',
          db.raw('sum(requests) as requests'),
          db.raw('sum(bytes) as bytes'),
          db.raw(`${errorsExpr} as errors`),
        ])
        .groupBy('route'),
      scoped(db('traffic_stats'))
        .select([
          'user_type',
          db.raw('sum(requests) as requests'),
          db.raw('sum(bytes) as bytes'),
          db.raw(`${errorsExpr} as errors`),
        ])
        .groupBy('user_type'),
      scoped(db('traffic_stats'))
        .select(['status_class', db.raw('sum(requests) as requests'), db.raw('sum(bytes) as bytes')])
        .groupBy('status_class'),
      db('traffic_visitors').whereBetween('bucket', [visitorMin, visitorMax]).countDistinct({ count: 'visitor' }),
      db('traffic_visitors')
        .whereBetween('bucket', [
          granularity === 'day' ? from : `${from}T00`,
          granularity === 'day' ? to : `${to}T23`,
        ])
        .where('bucket', granularity === 'day' ? 'not like' : 'like', '%T%')
        .select(['bucket'])
        .countDistinct({ count: 'visitor' })
        .groupBy('bucket'),
      db('traffic_visitors')
        .whereBetween('bucket', [visitorMin, visitorMax])
        .select([
          db.raw(
            `case when visitor like 'u:%' then 'user' when visitor like 'g:%' then 'guest' else 'anon' end as user_type`
          ),
          db.raw('count(distinct visitor) as count'),
        ])
        .groupBy(
          db.raw(`case when visitor like 'u:%' then 'user' when visitor like 'g:%' then 'guest' else 'anon' end`)
        ),
    ]);

  const totals = totalsRow[0] ?? { requests: 0, bytes: 0, errors: 0 };
  const totalRequests = number(totals.requests);
  const totalErrors = number(totals.errors);

  const uvSeriesByBucket = new Map<string, number>();
  for (const row of uvSeriesRows as { bucket: string; count: unknown }[]) {
    uvSeriesByBucket.set(String(row.bucket), number(row.count));
  }

  const seriesBuckets = enumerateBuckets(from, to, granularity);
  const seriesByBucket = new Map<string, { requests: number; bytes: number; errors: number }>();
  for (const row of seriesRows as { bucket: string; requests: unknown; bytes: unknown; errors: unknown }[]) {
    // 查询返回的是小时桶；天粒度时把 24 个小时合并进当天的桶。
    const key =
      granularity === 'day' ? String(row.bucket).slice(0, 10) : String(row.bucket);
    const current = seriesByBucket.get(key) ?? { requests: 0, bytes: 0, errors: 0 };
    current.requests += number(row.requests);
    current.bytes += number(row.bytes);
    current.errors += number(row.errors);
    seriesByBucket.set(key, current);
  }
  const series: TrafficSeriesPoint[] = seriesBuckets.map((bucket) => {
    const current = seriesByBucket.get(bucket);
    return {
      bucket,
      requests: current?.requests ?? 0,
      bytes: current?.bytes ?? 0,
      errors: current?.errors ?? 0,
      visitors: uvSeriesByBucket.get(bucket) ?? 0,
    };
  });

  const routeTotals = new Map<string, { requests: number; bytes: number; errors: number }>();
  for (const row of routeRows as { route: string; requests: unknown; bytes: unknown; errors: unknown }[]) {
    const key = routePrefixAtLevel(String(row.route), level, prefix);
    const current = routeTotals.get(key) ?? { requests: 0, bytes: 0, errors: 0 };
    current.requests += number(row.requests);
    current.bytes += number(row.bytes);
    current.errors += number(row.errors);
    routeTotals.set(key, current);
  }
  const routes: TrafficRouteRow[] = [...routeTotals.entries()]
    .map(([route, value]) => ({
      route,
      ...value,
      share: totalRequests > 0 ? value.requests / totalRequests : 0,
    }))
    .sort((a, b) => b.requests - a.requests);

  const visitorsByType: Record<string, number> = {};
  for (const row of uvTypeRows as { user_type: string; count: unknown }[]) {
    visitorsByType[String(row.user_type)] = number(row.count);
  }
  const userTypes: TrafficUserTypeRow[] = (['user', 'guest', 'anon'] as TrafficUserType[])
    .map((userType) => {
      const row = (userTypeRows as { user_type: string; requests: unknown; bytes: unknown; errors: unknown }[]).find(
        (item) => String(item.user_type) === userType
      );
      return {
        userType,
        requests: number(row?.requests),
        bytes: number(row?.bytes),
        errors: number(row?.errors),
        visitors: visitorsByType[userType] ?? 0,
      };
    })
    .filter((row) => row.requests > 0 || row.visitors > 0);

  const statuses: TrafficStatusRow[] = (statusRows as { status_class: string; requests: unknown; bytes: unknown }[])
    .map((row) => ({
      statusClass: String(row.status_class),
      requests: number(row.requests),
      bytes: number(row.bytes),
      share: totalRequests > 0 ? number(row.requests) / totalRequests : 0,
    }))
    .sort((a, b) => b.requests - a.requests);

  const days = Math.max(1, trafficSpanDays(from, to));
  return {
    from,
    to,
    granularity,
    level,
    routePrefix: prefix,
    generatedAt: new Date().toISOString(),
    totals: {
      requests: totalRequests,
      bytes: number(totals.bytes),
      errors: totalErrors,
      errorRate: totalRequests > 0 ? totalErrors / totalRequests : 0,
      visitors: number(uvTotalRow[0]?.count),
      avgRequestsPerDay: Math.round(totalRequests / days),
    },
    series,
    routes,
    userTypes,
    statuses,
  };
}

/* ------------------------------------------------------------------ 导出侧 */

interface SheetLabels {
  sheetSummary: string;
  sheetSeries: string;
  sheetRoutes: string;
  sheetUserTypes: string;
  sheetStatuses: string;
  metaRange: string;
  metaGranularity: string;
  metaLevel: string;
  metaPrefix: string;
  metricRequests: string;
  metricBytes: string;
  metricErrors: string;
  metricErrorRate: string;
  metricVisitors: string;
  metricAvgPerDay: string;
  colBucket: string;
  colRoute: string;
  colUserType: string;
  colStatus: string;
  colRequests: string;
  colBytes: string;
  colErrors: string;
  colShare: string;
  colVisitors: string;
  valueDay: string;
  valueHour: string;
  userTypeUser: string;
  userTypeGuest: string;
  userTypeAnon: string;
}

const SHEET_LABELS: Record<TrafficLocale, SheetLabels> = {
  zh: {
    sheetSummary: '汇总',
    sheetSeries: '时间趋势',
    sheetRoutes: '按路由',
    sheetUserTypes: '按用户类型',
    sheetStatuses: '按状态码',
    metaRange: '统计区间',
    metaGranularity: '粒度',
    metaLevel: '路由层级',
    metaPrefix: '路由前缀',
    metricRequests: '请求数',
    metricBytes: '流量（字节）',
    metricErrors: '错误数',
    metricErrorRate: '错误率',
    metricVisitors: '独立访客',
    metricAvgPerDay: '日均请求',
    colBucket: '时间段',
    colRoute: '路由 / 页面',
    colUserType: '用户类型',
    colStatus: '状态码',
    colRequests: '请求数',
    colBytes: '字节数',
    colErrors: '错误数',
    colShare: '占比',
    colVisitors: '独立访客',
    valueDay: '按天',
    valueHour: '按小时',
    userTypeUser: '注册用户',
    userTypeGuest: '访客',
    userTypeAnon: '未识别',
  },
  en: {
    sheetSummary: 'Summary',
    sheetSeries: 'Time series',
    sheetRoutes: 'By route',
    sheetUserTypes: 'By user type',
    sheetStatuses: 'By status',
    metaRange: 'Range',
    metaGranularity: 'Granularity',
    metaLevel: 'Route level',
    metaPrefix: 'Route prefix',
    metricRequests: 'Requests',
    metricBytes: 'Bytes served',
    metricErrors: 'Errors',
    metricErrorRate: 'Error rate',
    metricVisitors: 'Unique visitors',
    metricAvgPerDay: 'Avg requests/day',
    colBucket: 'Bucket',
    colRoute: 'Route / page',
    colUserType: 'User type',
    colStatus: 'Status',
    colRequests: 'Requests',
    colBytes: 'Bytes',
    colErrors: 'Errors',
    colShare: 'Share',
    colVisitors: 'Visitors',
    valueDay: 'Daily',
    valueHour: 'Hourly',
    userTypeUser: 'User',
    userTypeGuest: 'Guest',
    userTypeAnon: 'Anonymous',
  },
  ja: {
    sheetSummary: '概要',
    sheetSeries: '時間推移',
    sheetRoutes: 'ルート別',
    sheetUserTypes: 'ユーザー種別',
    sheetStatuses: 'ステータス別',
    metaRange: '期間',
    metaGranularity: '粒度',
    metaLevel: 'ルート階層',
    metaPrefix: 'ルート接頭辞',
    metricRequests: 'リクエスト数',
    metricBytes: '転送バイト数',
    metricErrors: 'エラー数',
    metricErrorRate: 'エラー率',
    metricVisitors: 'ユニーク訪問者',
    metricAvgPerDay: '1日平均リクエスト',
    colBucket: '時間帯',
    colRoute: 'ルート / ページ',
    colUserType: 'ユーザー種別',
    colStatus: 'ステータス',
    colRequests: 'リクエスト数',
    colBytes: 'バイト数',
    colErrors: 'エラー数',
    colShare: '割合',
    colVisitors: '訪問者',
    valueDay: '日次',
    valueHour: '時間別',
    userTypeUser: '登録ユーザー',
    userTypeGuest: 'ゲスト',
    userTypeAnon: '未識別',
  },
};

const percent = (value: number) => `${(value * 100).toFixed(2)}%`;

const userTypeLabel = (type: TrafficUserType, labels: SheetLabels) =>
  type === 'user' ? labels.userTypeUser : type === 'guest' ? labels.userTypeGuest : labels.userTypeAnon;

/** 生成多 Sheet 的流量报表工作簿（xlsx 已是服务端既有依赖，见 scripts/export-audit-xlsx.ts）。 */
export function buildTrafficWorkbook(report: TrafficReport, locale: TrafficLocale): Buffer {
  const labels = SHEET_LABELS[locale] ?? SHEET_LABELS.zh;
  const workbook = XLSX.utils.book_new();

  const summary = XLSX.utils.aoa_to_sheet([
    [labels.metaRange, `${report.from} ~ ${report.to}`],
    [labels.metaGranularity, report.granularity === 'day' ? labels.valueDay : labels.valueHour],
    [labels.metaLevel, String(report.level)],
    [labels.metaPrefix, report.routePrefix || '-'],
    [],
    [labels.metricRequests, report.totals.requests],
    [labels.metricBytes, report.totals.bytes],
    [labels.metricErrors, report.totals.errors],
    [labels.metricErrorRate, percent(report.totals.errorRate)],
    [labels.metricVisitors, report.totals.visitors],
    [labels.metricAvgPerDay, report.totals.avgRequestsPerDay],
  ]);
  XLSX.utils.book_append_sheet(workbook, summary, labels.sheetSummary);

  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(
      report.series.map((point) => ({
        [labels.colBucket]: point.bucket,
        [labels.colRequests]: point.requests,
        [labels.colVisitors]: point.visitors,
        [labels.colBytes]: point.bytes,
        [labels.colErrors]: point.errors,
      }))
    ),
    labels.sheetSeries
  );

  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(
      report.routes.map((row) => ({
        [labels.colRoute]: row.route,
        [labels.colRequests]: row.requests,
        [labels.colShare]: percent(row.share),
        [labels.colBytes]: row.bytes,
        [labels.colErrors]: row.errors,
      }))
    ),
    labels.sheetRoutes
  );

  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(
      report.userTypes.map((row) => ({
        [labels.colUserType]: userTypeLabel(row.userType, labels),
        [labels.colRequests]: row.requests,
        [labels.colVisitors]: row.visitors,
        [labels.colBytes]: row.bytes,
        [labels.colErrors]: row.errors,
      }))
    ),
    labels.sheetUserTypes
  );

  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(
      report.statuses.map((row) => ({
        [labels.colStatus]: row.statusClass,
        [labels.colRequests]: row.requests,
        [labels.colShare]: percent(row.share),
        [labels.colBytes]: row.bytes,
      }))
    ),
    labels.sheetStatuses
  );

  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

/** 访客哈希种子：同一 IP + UA 归并为一个匿名访客（不落原始 IP，兼顾隐私）。 */
export function anonVisitorKey(ip: string | undefined, userAgent: string | undefined): string {
  const digest = crypto
    .createHash('sha256')
    .update(`${ip || 'unknown'}|${userAgent || ''}`)
    .digest('hex')
    .slice(0, 16);
  return `anon:${digest}`;
}
