import { useState } from 'react';

interface Props {
  id: string;
  name: string;
  className?: string;
  /** 加载失败时的退化方块类名（默认沿用公式照类名 + 通用退化类）。 */
  fallbackClassName?: string;
}

/**
 * 声优公式照：`client/public/seiyuu/<id>.jpg`，加载失败时退化成首字方块。
 * 三个用到处（你是哪个声优 / 声优问答 / 喜欢或讨厌）本来是各抄一份，这里统一。
 */
export default function SeiyuuPhoto({ id, name, className, fallbackClassName }: Props) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <span className={fallbackClassName ?? `${className ?? ''} sk-photo-fallback`.trim()} aria-hidden="true">
        {name.slice(0, 1)}
      </span>
    );
  }
  return (
    <img
      className={className}
      src={`/seiyuu/${id}.jpg`}
      alt={name}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}
