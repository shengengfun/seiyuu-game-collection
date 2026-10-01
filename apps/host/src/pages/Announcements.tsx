import { useEffect, useState } from 'react';
import { Megaphone } from 'lucide-react';
import { Page } from '@seiyuu/game-sdk';
import { LinkifiedText } from '@seiyuu/game-sdk';
import { api, errMsg } from '@seiyuu/game-sdk';
import { toast } from '@seiyuu/game-sdk';
import { useTranslation } from 'react-i18next';
import { currentLocale } from '../i18n';
import { formatServerDate } from '@seiyuu/game-sdk';

interface Announcement {
  id: number;
  title: string;
  content: string;
  created_at: string;
}

export default function Announcements() {
  const { t } = useTranslation();
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<Announcement[]>('/announcements')
      .then((res) => setItems(res.data))
      .catch((err) => toast.error(errMsg(err)))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Page title={t('announcements.title')} icon={<Megaphone size={17} />}>
      {loading && (
        <div className="card" role="status" aria-label={t('common.loading')}>
          <div className="table-skeleton"><i /><i /><i /></div>
        </div>
      )}
      {!loading && !items.length && <p className="muted">{t('announcements.empty')}</p>}
      {items.map((a) => (
        <div key={a.id} className="card">
          <h3 style={{ marginTop: 0 }}>{a.title}</h3>
          <p className="announcement-body" style={{ whiteSpace: 'pre-wrap' }}><LinkifiedText text={a.content} /></p>
          <p className="muted">{formatServerDate(a.created_at, currentLocale())}</p>
        </div>
      ))}
    </Page>
  );
}
