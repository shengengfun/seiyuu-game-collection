import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Download, RotateCcw, ScanSearch, Share2, Timer, X } from 'lucide-react';
import Page from '../components/Page';
import ModalPortal from '../components/ModalPortal';
import { SITE_HOME } from '../config/routes';
import {
  RESUME_DIFFICULTIES,
  RESUME_POSTER_PREFIX,
  RESUME_RULES,
  checkCard,
  gradeOf,
  makeCard,
  randomSeed,
  roundScore,
  type ResumeCard,
  type ResumeDifficulty,
  type ResumeFieldId,
} from '../config/seiyuuResume';
import { shareToQq } from '../utils/share';
import { downloadPoster, posterFileName, renderScorePoster } from '../utils/poster';

type Stage = 'intro' | 'play' | 'result';

export default function SeiyuuResume() {
  const { t } = useTranslation();
  const [stage, setStage] = useState<Stage>('intro');
  const [difficulty, setDifficulty] = useState<ResumeDifficulty>('normal');
  const [round, setRound] = useState(0);
  const [card, setCard] = useState<ResumeCard | null>(null);
  const [picked, setPicked] = useState<ResumeFieldId[]>([]);
  const [secondsLeft, setSecondsLeft] = useState(RESUME_RULES.normal.seconds);
  const [submitted, setSubmitted] = useState(false);
  const [total, setTotal] = useState(0);
  const [perfectCount, setPerfectCount] = useState(0);
  const [foundCount, setFoundCount] = useState(0);
  const [errorCount, setErrorCount] = useState(0);
  const [posterUrl, setPosterUrl] = useState('');
  const [posterBusy, setPosterBusy] = useState(false);
  const [posterError, setPosterError] = useState('');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const rule = RESUME_RULES[difficulty];

  const deal = (index: number, nextDifficulty: ResumeDifficulty = difficulty) => {
    const next = makeCard(randomSeed(), nextDifficulty);
    setCard(next);
    setRound(index);
    setPicked([]);
    setSecondsLeft(RESUME_RULES[nextDifficulty].seconds);
    setSubmitted(false);
  };

  const start = () => {
    setTotal(0);
    setPerfectCount(0);
    setFoundCount(0);
    setErrorCount(0);
    setPosterUrl('');
    setPosterError('');
    canvasRef.current = null;
    deal(0);
    setStage('play');
  };

  const submit = (timedOut = false) => {
    if (!card || submitted) return;
    const verdict = checkCard(card, picked);
    const gained = timedOut ? 0 : roundScore(verdict, secondsLeft, rule.seconds);
    setTotal((value) => value + gained);
    if (verdict.perfect) setPerfectCount((value) => value + 1);
    setFoundCount((value) => value + verdict.found);
    setErrorCount((value) => value + card.errors);
    setSubmitted(true);
  };

  const next = () => {
    if (round + 1 >= rule.rounds) {
      setStage('result');
      return;
    }
    deal(round + 1);
  };

  // 计时：交卷或离场后停表
  useEffect(() => {
    if (stage !== 'play' || submitted) return;
    const timer = window.setInterval(() => {
      setSecondsLeft((value) => {
        if (value <= 1) {
          window.clearInterval(timer);
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [stage, submitted, round]);

  // 倒计时归零即自动交卷（submit 每次渲染都会重建，这里只依赖秒数）
  useEffect(() => {
    if (stage === 'play' && !submitted && secondsLeft === 0) submit(true);
  }, [secondsLeft, stage, submitted]);

  const toggle = (id: ResumeFieldId) => {
    if (submitted) return;
    setPicked((value) => (value.includes(id) ? value.filter((item) => item !== id) : [...value, id]));
  };

  const openPoster = async () => {
    setPosterBusy(true);
    setPosterError('');
    try {
      const grade = gradeOf(total, rule.rounds);
      const canvas = await renderScorePoster({
        kicker: t('seiyuuResume.poster.kicker'),
        grade,
        gradeTitle: t('seiyuuResume.grades.' + grade),
        scoreLabel: t('common.scoreLabel'),
        score: total,
        stats: [
          { label: t('seiyuuResume.result.perfect'), value: `${perfectCount} / ${rule.rounds}` },
          { label: t('seiyuuResume.result.found'), value: `${foundCount} / ${errorCount}` },
        ],
        tags: [
          `${t('seiyuuResume.result.perfect')} ${perfectCount}/${rule.rounds}`,
          `${t('seiyuuResume.result.found')} ${foundCount}/${errorCount}`,
        ],
        progress: {
          label: t('seiyuuResume.result.found'),
          percent: errorCount > 0 ? Math.round((foundCount / errorCount) * 100) : 100,
          note: `${foundCount}/${errorCount}`,
        },
        comment: t('seiyuuResume.result.comment.' + grade),
        site: t('common.siteName'),
        hint: t('seiyuuResume.poster.hint'),
        qrCaption: t('seiyuuResume.poster.qrCaption'),
        qrName: 'resume',
      });
      canvasRef.current = canvas;
      setPosterUrl(canvas.toDataURL('image/png'));
    } catch {
      setPosterError(t('seiyuuResume.poster.failed'));
    } finally {
      setPosterBusy(false);
    }
  };

  const savePoster = async () => {
    if (!canvasRef.current) return;
    try {
      await downloadPoster(canvasRef.current, posterFileName(RESUME_POSTER_PREFIX));
    } catch {
      setPosterError(t('seiyuuResume.poster.failed'));
    }
  };

  const share = () => {
    const grade = gradeOf(total, rule.rounds);
    shareToQq({
      url: window.location.href,
      title: t('seiyuuResume.result.shareTitle'),
      summary: t('seiyuuResume.result.shareSummary', { score: total, grade }),
      site: t('common.siteName'),
    });
  };

  const verdict = card && submitted ? checkCard(card, picked) : null;

  const fieldText = (id: ResumeFieldId, value: string) =>
    id === 'agency' && !value ? t('seiyuuResume.freelance') : value;

  return (
    <Page
      title={t('seiyuuResume.title')}
      icon={<ScanSearch size={17} />}
      homeTo={SITE_HOME}
      className="resume-page"
    >
      {stage === 'intro' && (
        <div className="card ly-intro">
          <p className="ly-kicker">{t('seiyuuResume.kicker')}</p>
          <p>{t('seiyuuResume.intro')}</p>
          <ol className="ly-steps">
            <li>{t('seiyuuResume.rule1')}</li>
            <li>{t('seiyuuResume.rule2')}</li>
            <li>{t('seiyuuResume.rule3')}</li>
          </ol>

          <div className="diff-grid">
            {RESUME_DIFFICULTIES.map((key) => (
              <button
                key={key}
                type="button"
                className={`diff-option${difficulty === key ? ' is-active' : ''}`}
                onClick={() => setDifficulty(key)}
              >
                <span className="diff-name">{t('seiyuuResume.difficulties.' + key + '.name')}</span>
                <span className="diff-desc">{t('seiyuuResume.difficulties.' + key + '.desc')}</span>
              </button>
            ))}
          </div>

          <button type="button" className="btn btn-primary" onClick={start}>
            <ScanSearch size={16} />
            {t('seiyuuResume.start')}
          </button>
        </div>
      )}

      {stage === 'play' && card && (
        <div className="rs-play">
          <div className="ly-hud">
            <span className="ly-hud-step">
              {t('seiyuuResume.hud.round', { index: round + 1, total: rule.rounds })}
            </span>
            <span className={`ly-hud-picked${secondsLeft <= 10 && !submitted ? ' is-urgent' : ''}`}>
              <Timer size={14} aria-hidden="true" />{' '}
              {t('seiyuuResume.hud.time', { seconds: secondsLeft })}
            </span>
            <span className="ly-hud-picked">
              {t('seiyuuResume.hud.picked', { count: picked.length })}
            </span>
          </div>

          <p className="muted rs-hint">{t('seiyuuResume.pickHint', { count: card.errors })}</p>

          <ul className="rs-card">
            {card.fields.map((field) => {
              const isPicked = picked.includes(field.id);
              const missed = Boolean(verdict && field.wrong && !isPicked);
              const extra = Boolean(verdict && !field.wrong && isPicked);
              const hit = Boolean(verdict && field.wrong && isPicked);
              const stateClass = hit ? ' is-hit' : missed ? ' is-missed' : extra ? ' is-extra' : isPicked ? ' is-picked' : '';
              return (
                <li key={field.id}>
                  <button
                    type="button"
                    className={`rs-field${stateClass}`}
                    onClick={() => toggle(field.id)}
                    disabled={submitted}
                  >
                    <span className="rs-field-label">{t('seiyuuResume.fields.' + field.id)}</span>
                    <span className="rs-field-value">{fieldText(field.id, field.value)}</span>
                    <span className="rs-field-mark" aria-hidden="true">
                      {hit && <Check size={16} />}
                      {(missed || extra) && <X size={16} />}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          {verdict && (
            <div className="rs-verdict">
              <p className={verdict.perfect ? 'rs-verdict-perfect' : 'rs-verdict-missed'}>
                {secondsLeft === 0 && <>{t('seiyuuResume.verdict.timeout')} </>}
                {verdict.perfect
                  ? t('seiyuuResume.verdict.perfect')
                  : t('seiyuuResume.verdict.partial', {
                      missed: verdict.missed.length,
                      extra: verdict.extra.length,
                    })}
              </p>
              {!verdict.perfect && (
                <p className="muted">
                  {t('seiyuuResume.verdict.answer', {
                    fields: card.fields
                      .filter((field) => field.wrong)
                      .map((field) => t('seiyuuResume.fields.' + field.id))
                      .join('、'),
                  })}
                </p>
              )}
            </div>
          )}

          {posterError && <p className="ly-notice is-error">{posterError}</p>}

          <div className="ly-actions">
            {!submitted ? (
              <button type="button" className="btn btn-primary" onClick={() => submit(false)}>
                <Check size={16} />
                {t('seiyuuResume.submit')}
              </button>
            ) : (
              <button type="button" className="btn btn-primary" onClick={next}>
                {round + 1 >= rule.rounds ? t('seiyuuResume.result.finish') : t('seiyuuResume.next')}
              </button>
            )}
          </div>
        </div>
      )}

      {stage === 'result' && (
        <div className="rs-result">
          <p className="ly-kicker">{t('seiyuuResume.poster.kicker')}</p>
          <h2 className="lf-ending-name">{t('seiyuuResume.grades.' + gradeOf(total, rule.rounds))}</h2>
          <p className="muted rs-result-score">
            {t('common.scoreLabel')} {total}
          </p>

          <ul className="rs-summary">
            <li>
              <span>{t('seiyuuResume.result.perfect')}</span>
              <strong>
                {perfectCount} / {rule.rounds}
              </strong>
            </li>
            <li>
              <span>{t('seiyuuResume.result.found')}</span>
              <strong>
                {foundCount} / {errorCount}
              </strong>
            </li>
          </ul>

          <p className="muted">{t('seiyuuResume.result.comment.' + gradeOf(total, rule.rounds))}</p>

          {posterError && <p className="ly-notice is-error">{posterError}</p>}

          <div className="ly-actions">
            <button type="button" className="btn btn-primary" onClick={openPoster} disabled={posterBusy}>
              <Download size={16} />
              {posterBusy ? t('seiyuuResume.poster.building') : t('seiyuuResume.poster.open')}
            </button>
            <button type="button" className="btn rs-share-qq" onClick={share}>
              <Share2 size={16} />
              {t('common.shareToQq')}
            </button>
            <button type="button" className="btn btn-ghost" onClick={start}>
              <RotateCcw size={16} />
              {t('seiyuuResume.result.restart')}
            </button>
          </div>
        </div>
      )}

      {posterUrl && (
        <ModalPortal>
          <div className="rs-poster-backdrop" role="dialog" aria-modal="true" aria-label={t('seiyuuResume.poster.label')}>
            <div className="rs-poster-panel">
              <button
                type="button"
                className="rs-poster-close"
                onClick={() => setPosterUrl('')}
                aria-label={t('common.close')}
              >
                <X size={18} />
              </button>
              <img className="rs-poster-image" src={posterUrl} alt={t('seiyuuResume.poster.label')} />
              <p className="muted rs-poster-hint">{t('seiyuuResume.poster.saveHint')}</p>
              <div className="ly-actions">
                <button type="button" className="btn btn-primary" onClick={savePoster}>
                  <Download size={16} />
                  {t('seiyuuResume.poster.download')}
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setPosterUrl('')}>
                  {t('common.close')}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </Page>
  );
}
