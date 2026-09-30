import { useState } from 'react';
import { Search as SearchIcon, Mic } from 'lucide-react';
import Page from '../components/Page';
import GuessInputBar from '../components/GuessInputBar';
import { PlayerInfoTable } from '../components/AnswerOverlay';
import { api, errMsg } from '../api/client';
import { SeiyuuInfo } from '../types';
import { toast } from '../components/Toast';
import { useTranslation } from 'react-i18next';

/** 查声优:底部输入 + 自动补全,选中后在上方展示声优卡片(原版布局) */
export default function Search() {
  const { t } = useTranslation();
  const [seiyuu, setSeiyuu] = useState<SeiyuuInfo | null>(null);

  const lookup = async (name: string) => {
    try {
      const res = await api.get<SeiyuuInfo[]>('/players', {
        params: { search: name },
      });
      const exact =
        res.data.find((p) => p.name.toLowerCase() === name.toLowerCase()) ??
        res.data[0] ??
        null;
      setSeiyuu(exact);
    } catch (err) {
      toast.error(errMsg(err));
    }
  };

  return (
    <Page
      title={t('search.title')}
      icon={<SearchIcon size={17} />}
      dock={
        <GuessInputBar
          onPick={(p) => void lookup(p.name)}
          placeholder={t('search.placeholder')}
          buttonText={t('search.button')}
        />
      }
    >
      <div className="player-search-content">
        {seiyuu ? (
          <div className="card">
            <h3>
              <Mic size={15} color="#16a34a" />
              {seiyuu.name}
              <span className="muted" style={{ fontWeight: 400 }}>
                {seiyuu.debutYear ? t('search.debutYear', { year: seiyuu.debutYear }) : ''}
              </span>
            </h3>
            <PlayerInfoTable
              answer={{
                name: seiyuu.name,
                romaji: seiyuu.romaji,
                agency: seiyuu.agency,
                birthPlace: seiyuu.birthPlace,
                debutYear: seiyuu.debutYear,
                groups: seiyuu.groups,
                representativeCharacters: seiyuu.representativeCharacters,
                representativeWorks: seiyuu.representativeWorks,
                difficulties: seiyuu.difficulties,
              }}
            />
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--text-light)' }}>
            <SearchIcon size={32} strokeWidth={1.5} />
            <p>{t('search.empty')}</p>
            <p style={{ fontSize: '0.8rem' }}>{t('search.fuzzy')}</p>
          </div>
        )}
      </div>
    </Page>
  );
}
