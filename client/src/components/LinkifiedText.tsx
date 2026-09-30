import { Fragment } from 'react';

/**
 * 把纯文本里的 http(s) 链接渲染成可点的 <a>。
 *
 * 公告内容是运营自己写的纯文本，但引流链接必须能点（否则用户只能手动复制）。
 * 故意不用 `dangerouslySetInnerHTML`：只做「按链接切分 → 逐段渲染」，
 * 其余内容永远是文本节点，不会因为公告里写了 HTML 而变成注入点。
 */
const URL_PATTERN = /(https?:\/\/[^\s<>"'）】]+)/g;
const IS_URL = /^https?:\/\//;

export default function LinkifiedText({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const parts = text.split(URL_PATTERN);
  return (
    <span className={className}>
      {parts.map((part, index) => {
        if (!part) return null;
        if (!IS_URL.test(part)) return <Fragment key={index}>{part}</Fragment>;
        // 行尾常见的收尾标点不要跟到链接里
        const trailing = part.match(/[.,;:!?、。，；：！？]$/)?.[0] ?? '';
        const href = trailing ? part.slice(0, -trailing.length) : part;
        return (
          <Fragment key={index}>
            <a href={href} target="_blank" rel="noopener noreferrer">{href}</a>
            {trailing}
          </Fragment>
        );
      })}
    </span>
  );
}
