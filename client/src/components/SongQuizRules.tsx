import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { BookOpen, Gamepad2, Headphones, Heart, ListChecks, Timer, Trophy, Users, X } from 'lucide-react';
import ModalPortal from './ModalPortal';
import { useTranslation } from 'react-i18next';
import { SONG_DIFFICULTIES, SONG_DIFFICULTY_ORDER } from '../config/songQuiz';

/**
 * 猜歌的玩法说明弹窗。
 *
 * 与声优猜的 `GameRules` 同一套外观（`.game-rules-*` + `.rule-panel`），
 * 只不过内容是猜歌自己的：怎么听、怎么算分、专家局的红心、多人对战怎么打。
 */
export default function SongQuizRules() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const closeRules = useCallback(() => {
    setOpen(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  }, []);

  useEffect(() => {
    if (!open) return;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeRules();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = oldOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [closeRules, open]);

  const quickItems = [
    { key: 'listen', icon: <Headphones size={16} /> },
    { key: 'options', icon: <ListChecks size={16} /> },
    { key: 'speed', icon: <Timer size={16} /> },
    { key: 'hearts', icon: <Heart size={16} /> },
  ] as const;

  return (
    <>
      <button
        ref={triggerRef}
        className="game-rules-trigger"
        type="button"
        onClick={() => setOpen(true)}
        data-umami-event="song-quiz-rules-open"
      >
        <BookOpen size={14} aria-hidden="true" />
        {t('songQuiz.rules.trigger')}
      </button>

      {open && (
        <ModalPortal>
          <div
            className="game-rules-backdrop"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) closeRules();
            }}
          >
            <div
              className="game-rules-dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
            >
              <header className="game-rules-dialog-heading">
                <span className="game-rules-heading-icon" aria-hidden="true">
                  <BookOpen size={24} />
                </span>
                <div className="game-rules-heading-copy">
                  <span className="game-rules-kicker">HOW TO PLAY</span>
                  <h2 id={titleId}>{t('songQuiz.rules.title')}</h2>
                  <p>{t('songQuiz.subtitle')}</p>
                </div>
                <button
                  ref={closeRef}
                  className="confirm-close"
                  type="button"
                  aria-label={t('songQuiz.rules.close')}
                  onClick={closeRules}
                  data-umami-event="song-quiz-rules-close"
                >
                  <X size={18} />
                </button>
              </header>

              <div className="game-rules-dialog-body">
                <div className="rule-field-grid">
                  {quickItems.map((item) => (
                    <div key={item.key}>
                      <strong>
                        <span aria-hidden="true">{item.icon}</span> {t(`songQuiz.rules.quick.${item.key}`)}
                      </strong>
                      <span>{t(`songQuiz.rules.quick.${item.key}Text`)}</span>
                    </div>
                  ))}
                </div>

                <div className="rule-sections">
                  <article className="rule-panel rule-panel-main">
                    <div className="rule-panel-title">
                      <span aria-hidden="true">
                        <Gamepad2 size={20} />
                      </span>
                      <div>
                        <small>01</small>
                        <h3>{t('songQuiz.rules.singleTitle')}</h3>
                      </div>
                    </div>
                    <p>{t('songQuiz.intro')}</p>
                    <div className="rule-field-grid">
                      {SONG_DIFFICULTY_ORDER.map((item) => {
                        const config = SONG_DIFFICULTIES[item];
                        return (
                          <div key={item}>
                            <strong>{t(`songQuiz.difficulties.${item}.name`)}</strong>
                            <span>
                              {config.count === null
                                ? t('songQuiz.difficulties.expert.pool')
                                : t('songQuiz.difficulties.count', { count: config.count })}
                              {' · '}
                              {config.hearts !== null
                                ? t('songQuiz.difficulties.hearts', { count: config.hearts })
                                : t('songQuiz.difficulties.weight', { weight: config.weight })}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="rule-result-notes">
                      <p>
                        <span className="rule-result-icon rule-result-win">
                          <Timer size={15} />
                        </span>
                        <strong>{t('songQuiz.rules.scoreTitle')}</strong>
                        {t('songQuiz.rules.scoreText')}
                      </p>
                      <p>
                        <span className="rule-result-icon rule-result-loss">
                          <Trophy size={15} />
                        </span>
                        <strong>{t('songQuiz.rules.rankTitle')}</strong>
                        {t('songQuiz.rules.rankText')}
                      </p>
                    </div>
                  </article>

                  <article className="rule-panel rule-panel-multi">
                    <div className="rule-panel-title">
                      <span aria-hidden="true">
                        <Users size={20} />
                      </span>
                      <div>
                        <small>02</small>
                        <h3>{t('songQuiz.rules.multiTitle')}</h3>
                      </div>
                    </div>
                    <p>{t('songQuiz.multi.intro')}</p>
                    <div className="rule-field-grid">
                      <div>
                        <strong>{t('songQuiz.multi.modes.rush.name')}</strong>
                        <span>{t('songQuiz.multi.modes.rush.desc')}</span>
                      </div>
                      <div>
                        <strong>{t('songQuiz.multi.modes.reveal.name')}</strong>
                        <span>{t('songQuiz.multi.modes.reveal.desc')}</span>
                      </div>
                    </div>
                    <p className="muted">{t('songQuiz.multi.note')}</p>
                  </article>
                </div>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </>
  );
}
