import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

/** 刷新间隔：数值本身在服务端缓存 5 秒，这里不需要太频繁。 */
const REFRESH_MS = 45_000;

/**
 * 左下角在线人数徽标。
 * 数据来自 /api/presence/online（无需登录、无需工作量证明）；
 * 取不到数据时整块隐藏，不显示 0 或占位符。
 * raised：页面底部有输入栏（input-dock）时抬高，避免互相压住。
 */
export default function OnlineBadge({ raised = false }: { raised?: boolean }) {
  const { t } = useTranslation();
  const [online, setOnline] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const response = await fetch('/api/presence/online', {
          headers: { accept: 'application/json' },
        });
        if (!response.ok) return;
        const data = (await response.json()) as { online?: unknown };
        if (alive && typeof data.online === 'number' && Number.isFinite(data.online)) {
          setOnline(data.online);
        }
      } catch {
        // 网络异常时保持上一次的数值，不闪提示
      }
    };
    void load();
    // 首次请求往往比 socket 建连更早，此时服务端还没把这台客户端算进去，
    // 会短暂显示偏小的数字；建连后再补一次，开局就准。
    const settleTimer = window.setTimeout(() => void load(), 5_000);
    const timer = window.setInterval(() => void load(), REFRESH_MS);
    return () => {
      alive = false;
      window.clearTimeout(settleTimer);
      window.clearInterval(timer);
    };
  }, []);

  if (online === null) {
    return null;
  }

  return (
    <div
      className={`online-badge${raised ? ' is-raised' : ''}`}
      role="status"
      aria-live="polite"
    >
      <span className="online-badge-dot" aria-hidden="true" />
      <span>{t('common.onlineCount', { count: online })}</span>
    </div>
  );
}
