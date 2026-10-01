import { useEffect, useId, useMemo, useState } from 'react';
import { ChevronDown, Megaphone, Pin } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { api } from '@seiyuu/game-sdk';
import { LinkifiedText } from '@seiyuu/game-sdk';
import { currentLocale } from '../i18n';
import { formatServerDay } from '@seiyuu/game-sdk';

/**
 * 站点首页（门户）右下角的公告栏。
 *
 * 规则：**当天第一次打开门户自动展开**，同一天再来就默认收起（状态记在 localStorage，
 * 只认「当天」，隔天会再展开一次）。不区分登录与否——门户本身是公开页，
 * 游客也应该看到公告。
 *
 * 显示内容来自 `/api/announcements`：只取 `show_in_board !== false` 的条目，
 * 置顶的排最前面（服务端已排好，这里再兜一层，防止旧数据没有该字段）。
 */
const SEEN_STORAGE_KEY = 'csgofriberg.announcement-board-seen';
const MAX_ITEMS = 5;

interface BoardAnnouncement {
  id: number;
  title: string;
  content: string;
  is_pinned?: boolean | number;
  show_in_board?: boolean | number;
  created_at: string;
}

/** 本地日期键 `YYYY-MM-DD`，用来判断「今天是不是第一次打开」。 */
function todayKey(): string {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function readSeen(): string | null {
  try {
    return localStorage.getItem(SEEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeSeen(value: string): void {
  try {
    localStorage.setItem(SEEN_STORAGE_KEY, value);
  } catch {
    // 隐私模式下写不进去：退化成「每次都展开」，不影响公告内容。
  }
}

function boardItems(value: unknown): BoardAnnouncement[] {
  if (!Array.isArray(value)) return [];
  const result: BoardAnnouncement[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const id = Number(row.id);
    if (!Number.isInteger(id) || id <= 0) continue;
    // 没这个字段的旧数据当作「要显示」，只有显式关掉才隐藏。
    if (row.show_in_board === false || row.show_in_board === 0) continue;
    if (typeof row.title !== 'string' || typeof row.content !== 'string') continue;
    result.push({
      id,
      title: row.title,
      content: row.content,
      is_pinned: row.is_pinned as boolean | number | undefined,
      created_at: typeof row.created_at === 'string' ? row.created_at : '',
    });
  }
  return result
    .sort((left, right) => {
      const pinnedDelta = Number(Boolean(right.is_pinned)) - Number(Boolean(left.is_pinned));
      if (pinnedDelta !== 0) return pinnedDelta;
      return right.id - left.id;
    })
    .slice(0, MAX_ITEMS);
}

export default function AnnouncementBoard() {
  const { t } = useTranslation();
  const [items, setItems] = useState<BoardAnnouncement[]>([]);
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const titleId = useId();

  useEffect(() => {
    let disposed = false;
    void api
      .get('/announcements')
      .then((response) => {
        if (disposed) return;
        const next = boardItems(response.data);
        setItems(next);
        // 有内容、且今天还没看过 → 自动展开一次（这就是「当日第一次登录自动显示」）。
        if (next.length > 0 && readSeen() !== todayKey()) {
          writeSeen(todayKey());
          setOpen(true);
        }
      })
      .catch(() => undefined);
    return () => {
      disposed = true;
    };
  }, []);

  const newest = useMemo(() => items[0] ?? null, [items]);

  if (!items.length) return null;

  const collapse = () => {
    writeSeen(todayKey());
    setOpen(false);
  };

  return (
    <div className="announcement-board">
      {open ? (
        <section className="announcement-board-panel" id={panelId} aria-labelledby={titleId}>
          <header className="announcement-board-head">
            <span className="announcement-board-heading">
              <Megaphone size={15} aria-hidden="true" />
              <strong id={titleId}>{t('announcementBoard.title')}</strong>
            </span>
            <button
              type="button"
              className="announcement-board-collapse"
              onClick={collapse}
              aria-label={t('announcementBoard.collapse')}
              title={t('announcementBoard.collapse')}
            >
              <ChevronDown size={16} aria-hidden="true" />
            </button>
          </header>
          <ul className="announcement-board-list">
            {items.map((item) => (
              <li key={item.id}>
                <p className="announcement-board-item-title">
                  {Boolean(item.is_pinned) && (
                    <span className="announcement-board-pin" title={t('announcementBoard.pinned')}>
                      <Pin size={12} aria-hidden="true" />
                      {t('announcementBoard.pinned')}
                    </span>
                  )}
                  {item.title}
                </p>
                <p className="announcement-board-item-content"><LinkifiedText text={item.content} /></p>
                {item.created_at && (
                  <p className="announcement-board-item-date">
                    {formatServerDay(item.created_at, currentLocale())}
                  </p>
                )}
              </li>
            ))}
          </ul>
          <footer className="announcement-board-foot">
            <Link to="/announcement" className="announcement-board-more">
              {t('announcementBoard.all')}
            </Link>
          </footer>
        </section>
      ) : (
        <button
          type="button"
          className="announcement-board-toggle"
          onClick={() => setOpen(true)}
          aria-expanded={false}
          aria-controls={panelId}
          title={newest?.title ?? t('announcementBoard.title')}
          data-umami-event="portal-announcement-board"
        >
          <Megaphone size={15} aria-hidden="true" />
          <span>{t('announcementBoard.title')}</span>
          <span className="announcement-board-count">{items.length}</span>
        </button>
      )}
    </div>
  );
}
