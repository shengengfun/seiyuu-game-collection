import { useCallback, useEffect, useState } from 'react';
import { api, errMsg } from '../../api/client';
import { useConfirm } from '../ConfirmDialog';
import { toast } from '../Toast';
import { useTranslation } from 'react-i18next';
import { currentLocale } from '../../i18n';
import { formatServerDate } from '../../utils/serverDate';

interface Announcement {
  id: number;
  title: string;
  content: string;
  is_popup: boolean | number;
  is_pinned?: boolean | number;
  show_in_board?: boolean | number;
  created_at: string;
}

/** 正在编辑的公告草稿（含三个开关，保存时一起提交）。 */
interface AnnouncementDraft {
  id: number;
  title: string;
  content: string;
  isPopup: boolean;
  isPinned: boolean;
  showInBoard: boolean;
}

/** 管理后台 - 公告管理：发布 / 编辑 / 置顶 / 控制是否进首页公告栏 */
export default function AdminAnnouncements() {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const [items, setItems] = useState<Announcement[]>([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isPopup, setIsPopup] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [showInBoard, setShowInBoard] = useState(true);
  const [editing, setEditing] = useState<AnnouncementDraft | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get<Announcement[]>('/announcements');
      setItems(res.data);
    } catch (err) {
      toast.error(errMsg(err));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const publish = async () => {
    try {
      await api.post('/admin/announcements', {
        title,
        content,
        is_popup: isPopup,
        is_pinned: isPinned,
        show_in_board: showInBoard,
      });
      setTitle('');
      setContent('');
      setIsPopup(false);
      setIsPinned(false);
      setShowInBoard(true);
      toast.success(t('admin.announcementPublished'));
      await load();
    } catch (err) {
      toast.error(errMsg(err));
    }
  };

  const saveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await api.patch(`/admin/announcements/${editing.id}`, {
        title: editing.title.trim(),
        content: editing.content.trim(),
        is_popup: editing.isPopup,
        is_pinned: editing.isPinned,
        show_in_board: editing.showInBoard,
      });
      toast.success(t('admin.announcementSaved'));
      setEditing(null);
      await load();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: number) => {
    if (!await confirm({
      title: t('admin.deleteAnnouncementTitle'),
      message: t('admin.deleteAnnouncementMessage'),
      confirmLabel: t('admin.deleteAnnouncementConfirm'),
      tone: 'danger',
    })) return;
    try {
      await api.delete(`/admin/announcements/${id}`);
      toast.success(t('admin.announcementDeleted'));
      await load();
    } catch (err) {
      toast.error(errMsg(err));
    }
  };

  return (
    <div className="card admin-announcements-card">
      <h3>{t('admin.announcementsTitle')}</h3>
      <div className="admin-announcement-form">
        <input className="input" placeholder={t('admin.announcementTitle')} value={title} onChange={(e) => setTitle(e.target.value)} />
        <textarea className="input" rows={4} placeholder={t('admin.announcementContent')} value={content} onChange={(e) => setContent(e.target.value)} />
        <label className="admin-announcement-option">
          <input type="checkbox" checked={isPopup} onChange={(event) => setIsPopup(event.target.checked)} />
          <span>{t('admin.popupAnnouncement')}</span>
        </label>
        <label className="admin-announcement-option">
          <input type="checkbox" checked={isPinned} onChange={(event) => setIsPinned(event.target.checked)} />
          <span>{t('admin.announcementPin')}</span>
        </label>
        <label className="admin-announcement-option">
          <input type="checkbox" checked={showInBoard} onChange={(event) => setShowInBoard(event.target.checked)} />
          <span>{t('admin.announcementShowInBoard')}</span>
        </label>
        <button className="btn btn-green" onClick={() => void publish()} disabled={!title.trim() || !content.trim()}>
          {t('admin.publish')}
        </button>
      </div>
      <div className="admin-announcement-list">
        {items.map((a) => (
          <div className="admin-announcement-row" key={a.id}>
            {editing?.id === a.id ? (
              <div className="admin-announcement-edit">
                <input
                  className="input"
                  aria-label={t('admin.announcementTitle')}
                  value={editing.title}
                  onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                />
                <textarea
                  className="input"
                  rows={3}
                  aria-label={t('admin.announcementContent')}
                  value={editing.content}
                  onChange={(e) => setEditing({ ...editing, content: e.target.value })}
                />
                <div className="admin-announcement-edit-flags">
                  <label className="admin-announcement-option">
                    <input
                      type="checkbox"
                      checked={editing.isPopup}
                      onChange={(event) => setEditing({ ...editing, isPopup: event.target.checked })}
                    />
                    <span>{t('admin.popupAnnouncement')}</span>
                  </label>
                  <label className="admin-announcement-option">
                    <input
                      type="checkbox"
                      checked={editing.isPinned}
                      onChange={(event) => setEditing({ ...editing, isPinned: event.target.checked })}
                    />
                    <span>{t('admin.announcementPin')}</span>
                  </label>
                  <label className="admin-announcement-option">
                    <input
                      type="checkbox"
                      checked={editing.showInBoard}
                      onChange={(event) => setEditing({ ...editing, showInBoard: event.target.checked })}
                    />
                    <span>{t('admin.announcementShowInBoard')}</span>
                  </label>
                </div>
                <div className="admin-announcement-edit-actions">
                  <button
                    className="btn btn-green"
                    disabled={!editing.title.trim() || !editing.content.trim() || saving}
                    onClick={() => void saveEdit()}
                  >
                    {t('admin.announcementSave')}
                  </button>
                  <button className="btn btn-ghost" onClick={() => setEditing(null)}>{t('common.cancel')}</button>
                </div>
              </div>
            ) : (
              <>
                <span>
                  <b>{a.title}</b>{' '}
                  {Boolean(a.is_pinned) && <span className="badge">{t('admin.announcementPinned')}</span>}{' '}
                  {Boolean(a.is_popup) && <span className="badge">{t('admin.popupAnnouncementBadge')}</span>}{' '}
                  {a.show_in_board === false || a.show_in_board === 0 ? (
                    <span className="badge">{t('admin.announcementBoardHidden')}</span>
                  ) : null}{' '}
                  <span className="muted">{formatServerDate(a.created_at, currentLocale())}</span>
                </span>
                <span className="admin-announcement-actions">
                  <button
                    className="btn"
                    onClick={() => setEditing({
                      id: a.id,
                      title: a.title,
                      content: a.content,
                      isPopup: Boolean(a.is_popup),
                      isPinned: Boolean(a.is_pinned),
                      // 接口返回的是 0/1，别用 `!== false` 判断
                      showInBoard: !(a.show_in_board === false || a.show_in_board === 0),
                    })}
                  >
                    {t('admin.announcementEdit')}
                  </button>
                  <button className="btn btn-red" onClick={() => void remove(a.id)}>{t('admin.deleteAnnouncementConfirm')}</button>
                </span>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
