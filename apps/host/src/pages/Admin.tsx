import { useEffect, useState } from 'react';
import { AlertTriangle, Activity, BarChart3, ClipboardCheck, ClipboardList, Gamepad2, MessageCircle, Swords, Users, Wrench } from 'lucide-react';
import { Page } from '@seiyuu/game-sdk';
import AdminOverview from '../components/admin/AdminOverview';
import AdminTraffic from '../components/admin/AdminTraffic';
import AdminPlayers from '../components/admin/AdminPlayers';
import AdminAnnouncements from '../components/admin/AdminAnnouncements';
import AdminResourceVersion from '../components/admin/AdminResourceVersion';
import AdminUsers, { AdminGuests } from '../components/admin/AdminUsers';
import AdminApiTokens from '../components/admin/AdminApiTokens';
import AdminReports from '../components/admin/AdminReports';
import AdminPlayerChanges from '../components/admin/AdminPlayerChanges';
import AdminQuizSubmissions from '../components/admin/AdminQuizSubmissions';
import AdminSukikiraiComments from '../components/admin/AdminSukikiraiComments';
import { getSocket } from '@seiyuu/game-sdk';
import { PresenceStats } from '@seiyuu/game-sdk';
import { useTranslation } from 'react-i18next';

/** 管理后台的 Tab 标识；数据概览页里的「待办」按钮需要用它做跳转。 */
export type AdminTab =
  | 'overview'
  | 'traffic'
  | 'players'
  | 'playerChanges'
  | 'users'
  | 'guests'
  | 'reports'
  | 'quizSubmissions'
  | 'sukikiraiComments'
  | 'announcements'
  | 'apiTokens'
  | 'resources';

export default function Admin() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<AdminTab>('overview');
  const [presence, setPresence] = useState<PresenceStats | null>(null);

  useEffect(() => {
    const socket = getSocket();
    const onStats = (stats: PresenceStats) => setPresence(stats);
    const subscribe = () => socket.emit('presence:subscribe');
    socket.on('presence:stats', onStats);
    socket.on('connect', subscribe);
    if (socket.connected) subscribe();
    return () => {
      socket.emit('presence:unsubscribe');
      socket.off('presence:stats', onStats);
      socket.off('connect', subscribe);
    };
  }, []);

  return (
    <Page title={t('admin.title')} icon={<Wrench size={17} />}>
      <section className="presence-grid" aria-label={t('admin.presence')}>
        <div className="presence-item">
          <Users size={20} />
          <span>{t('admin.online')}</span>
          <strong>{presence?.onlineUsers ?? '-'}</strong>
        </div>
        <div className="presence-item">
          <Swords size={20} />
          <span>{t('admin.multiRooms')}</span>
          <strong>{presence?.multiplayerRooms ?? '-'}</strong>
        </div>
        <div className="presence-item">
          <Gamepad2 size={20} />
          <span>{t('admin.singleGames')}</span>
          <strong>{presence?.singleGames ?? '-'}</strong>
        </div>
      </section>
      <div className="admin-tabs">
        <button className={tab === 'overview' ? 'btn' : 'btn btn-ghost'} onClick={() => setTab('overview')}>
          <BarChart3 size={15} />
          {t('admin.overviewTab')}
        </button>
        <button className={tab === 'traffic' ? 'btn' : 'btn btn-ghost'} onClick={() => setTab('traffic')}>
          <Activity size={15} />
          {t('admin.trafficTab')}
        </button>
        <button className={tab === 'players' ? 'btn' : 'btn btn-ghost'} onClick={() => setTab('players')}>
          {t('admin.playersTab')}
        </button>
        <button className={tab === 'playerChanges' ? 'btn' : 'btn btn-ghost'} onClick={() => setTab('playerChanges')}>
          <ClipboardCheck size={15} />
          {t('admin.playerChangesTab')}
        </button>
        <button className={tab === 'users' ? 'btn' : 'btn btn-ghost'} onClick={() => setTab('users')}>
          {t('admin.usersTab')}
        </button>
        <button className={tab === 'guests' ? 'btn' : 'btn btn-ghost'} onClick={() => setTab('guests')}>
          {t('admin.guestsTab')}
        </button>
        <button className={tab === 'reports' ? 'btn' : 'btn btn-ghost'} onClick={() => setTab('reports')}>
          <AlertTriangle size={15} />
          {t('admin.reportsTab')}
        </button>
        <button className={tab === 'announcements' ? 'btn' : 'btn btn-ghost'} onClick={() => setTab('announcements')}>
          {t('admin.announcementsTab')}
        </button>
        <button className={tab === 'quizSubmissions' ? 'btn' : 'btn btn-ghost'} onClick={() => setTab('quizSubmissions')}>
          <ClipboardList size={15} />
          {t('admin.quizSubmissionsTab')}
        </button>
        <button className={tab === 'sukikiraiComments' ? 'btn' : 'btn btn-ghost'} onClick={() => setTab('sukikiraiComments')}>
          <MessageCircle size={15} />
          {t('admin.sukikiraiCommentsTab')}
        </button>
        <button className={tab === 'apiTokens' ? 'btn' : 'btn btn-ghost'} onClick={() => setTab('apiTokens')}>
          {t('admin.apiTokensTab')}
        </button>
        <button className={tab === 'resources' ? 'btn' : 'btn btn-ghost'} onClick={() => setTab('resources')}>
          {t('admin.resourcesTab')}
        </button>
      </div>
      {tab === 'overview' && <AdminOverview onJump={setTab} />}
      {tab === 'traffic' && <AdminTraffic />}
      {tab === 'players' && <AdminPlayers />}
      {tab === 'playerChanges' && <AdminPlayerChanges />}
      {tab === 'users' && <AdminUsers />}
      {tab === 'guests' && <AdminGuests />}
      {tab === 'reports' && <AdminReports />}
      {tab === 'announcements' && <AdminAnnouncements />}
      {tab === 'quizSubmissions' && <AdminQuizSubmissions />}
      {tab === 'sukikiraiComments' && <AdminSukikiraiComments />}
      {tab === 'apiTokens' && <AdminApiTokens />}
      {tab === 'resources' && <AdminResourceVersion />}
    </Page>
  );
}
