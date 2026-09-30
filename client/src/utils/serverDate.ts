/**
 * 服务端时间戳的解析工具。
 *
 * 约定：`created_at` / `updated_at` / `last_seen_at` 这类由数据库
 * `CURRENT_TIMESTAMP`（= knex 的 `fn.now()`）写入的字段，值是 **UTC** 的
 * `YYYY-MM-DD HH:MM:SS`，但**不带时区后缀**——直接 `new Date(value)` 会被
 * 浏览器当成当地时间，在 UTC+8 会整体早 8 小时（凌晨时段甚至会显示成前一天）。
 *
 * 所以凡是展示这类字段，统一走 `parseServerDate()`。
 * 已经有 `Z` / 偏移量的 ISO 字符串（例如 `generatedAt`）照原样解析；
 * 纯数字（单人对局的 `created_at` 存的是 epoch 毫秒）也照原样。
 */
const DB_DATETIME_RE = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(\.\d+)?$/;

export function parseServerDate(value: unknown): Date | null {
  if (value == null) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === 'number') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const date = DB_DATETIME_RE.test(trimmed)
    ? new Date(`${trimmed.replace(' ', 'T')}Z`)
    : new Date(trimmed);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** 展示用的本地时间文本；无法解析时返回空串（调用方自行决定要不要渲染）。 */
export function formatServerDate(value: unknown, locale?: string): string {
  const date = parseServerDate(value);
  return date ? date.toLocaleString(locale) : '';
}

/** 展示用的本地日期文本（不含时分秒）。 */
export function formatServerDay(value: unknown, locale?: string): string {
  const date = parseServerDate(value);
  return date ? date.toLocaleDateString(locale) : '';
}
