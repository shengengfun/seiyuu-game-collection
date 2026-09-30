import { Link } from 'react-router-dom';
import { Compass, Home } from 'lucide-react';
import Page from '../components/Page';
import { useTranslation } from 'react-i18next';
import { SITE_HOME } from '../config/routes';

export default function NotFound() {
  const { t } = useTranslation();
  return (
    <Page title={t('notFound.title')} icon={<Compass size={17} />}>
      <div className="game-empty">
        <Compass size={32} strokeWidth={1.5} />
        <p className="game-empty-title">{t('notFound.title')}</p>
        <p>{t('notFound.message')}</p>
        <div className="game-empty-actions">
          <Link to={SITE_HOME} className="btn">
            <Home size={15} />
            {t('portal.backToSite')}
          </Link>
        </div>
      </div>
    </Page>
  );
}
