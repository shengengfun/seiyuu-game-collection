import { useCallback, useEffect, useState } from 'react';
import { Trophy } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';
import {
  SONG_DIFFICULTIES,
  SONG_DIFFICULTY_ORDER,
  formatSeconds,
  type SongDifficulty,
} from '../config/songQuiz';
import { SONG_GROUP_LABELS, labelOf } from '../config/songQuiz/labels';

export interface LeaderboardRow {
  rank: number;
  displayId: string;
  score: number;
  correct: number;
  total: number;
  accuracy: number;
  avgMs: number | null;
  groupId: string;
  me?: boolean;
}

interface Payload {
  difficulty: SongDifficulty;
  items: LeaderboardRow[];
  currentUser: { rank: number; displayId: string; score: number } | null;
}

/** 猜歌全站排行榜：按难度分页，取每人在该难度的最好成绩。 */
export default function SongQuizLeaderboard({ initialDifficulty = 'normal' }: { initialDifficulty?: SongDifficulty }) {
  const { t, i18n } = useTranslation();
  const [difficulty, setDifficulty] = useState<SongDifficulty>(initialDifficulty);
  const [data, setData] = useState<Payload | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>('loading');

  const load = useCallback(
    async (target: SongDifficulty) => {
      setState('loading');
      try {
        const response = await api.get('/song-quiz/leaderboard', { params: { difficulty: target } });
        setData(response.data as Payload);
        setState('ready');
      } catch {
        setData(null);
        setState('failed');
      }
    },
    [],
  );

  useEffect(() => {
    void load(difficulty);
  }, [difficulty, load]);

  return (
    <section className="sg-board">
      <h3>
        <Trophy size={16} aria-hidden="true" />
        {t('songQuiz.leaderboard.title')}
      </h3>
      <div className="sg-board-tabs" role="group" aria-label={t('songQuiz.difficultyLabel')}>
        {SONG_DIFFICULTY_ORDER.map((item) => (
          <button
            key={item}
            type="button"
            className={`sg-chip${difficulty === item ? ' is-active' : ''}`}
            aria-pressed={difficulty === item}
            onClick={() => setDifficulty(item)}
          >
            {t(`songQuiz.difficulties.${item}.name`)}
          </button>
        ))}
      </div>

      {state === 'loading' && <p className="muted">{t('songQuiz.leaderboard.loading')}</p>}
      {state === 'failed' && (
        <p className="sg-failed">
          {t('songQuiz.leaderboard.failed')}
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => load(difficulty)}>
            {t('songQuiz.retry')}
          </button>
        </p>
      )}

      {state === 'ready' && data && (
        <>
          <p className="muted sg-board-meta">
            {t('songQuiz.leaderboard.meta', {
              weight: SONG_DIFFICULTIES[difficulty].weight,
              count: SONG_DIFFICULTIES[difficulty].count ?? t('songQuiz.difficulties.expert.pool'),
            })}
          </p>
          {data.items.length === 0 ? (
            <p className="muted">{t('songQuiz.leaderboard.empty')}</p>
          ) : (
            <ol className="sg-board-list">
              {data.items.map((row) => (
                <li key={`${row.rank}-${row.displayId}`} className={row.me ? 'is-me' : undefined}>
                  <span className="sg-board-rank">{row.rank}</span>
                  <span className="sg-board-player">
                    <span className="sg-board-name">{row.displayId}</span>
                    <span className="sg-board-sub">
                      {`${t('songQuiz.leaderboard.group')} ${
                        SONG_GROUP_LABELS[row.groupId as keyof typeof SONG_GROUP_LABELS]
                          ? labelOf(
                              SONG_GROUP_LABELS[row.groupId as keyof typeof SONG_GROUP_LABELS],
                              i18n.language,
                            )
                          : row.groupId
                      } · ${t('songQuiz.result.accuracyLabel')} ${Math.round(row.accuracy * 100)}%`}
                    </span>
                  </span>
                  <span className="sg-board-speed">
                    {t('songQuiz.result.avgLabel')} {formatSeconds(row.avgMs)}
                  </span>
                  <span className="sg-board-score">{row.score}</span>
                </li>
              ))}
            </ol>
          )}
          {data.currentUser && (
            <p className="sg-board-me">
              {t('songQuiz.leaderboard.mine', {
                rank: data.currentUser.rank,
                score: data.currentUser.score,
              })}
            </p>
          )}
        </>
      )}
    </section>
  );
}
