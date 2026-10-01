import { FormEvent, useEffect, useId, useRef, useState } from 'react';
import { Check, Plus, Send, Trash2, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api, errMsg } from '@seiyuu/game-sdk';
import { ModalPortal } from '@seiyuu/game-sdk';
import { toast } from '@seiyuu/game-sdk';
import { useAuth } from '@seiyuu/game-sdk';
import { LEVEL_IDS, type QuestionLevel } from './model/seiyuuQuiz/types';

const MAX_OPTIONS = 4;
const MIN_OPTIONS = 2;
const MIN_PROMPT_LENGTH = 6;
const MIN_EXPLAIN_LENGTH = 2;

interface FieldErrors {
  prompt?: string;
  options?: string;
  explain?: string;
}

/**
 * 「声优问答」结果页的投稿入口。
 *
 * 玩家把自己知道的题目提交给管理员人工审核，通过后才会进题库
 * （服务端 `/api/seiyuu-quiz/submissions` 存草稿，审核通过的由 `/api/seiyuu-quiz/community` 下发）。
 * 投稿需要登录：审核要能追溯到人，也顺手挡掉刷屏。
 */
export default function QuizSubmissionForm({
  seiyuuId,
  seiyuuName,
}: {
  seiyuuId: string;
  seiyuuName: string;
}) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [options, setOptions] = useState<string[]>(['', '', '', '']);
  const [answer, setAnswer] = useState(0);
  const [level, setLevel] = useState<QuestionLevel>('normal');
  const [explain, setExplain] = useState('');
  const [source, setSource] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.querySelector<HTMLElement>('input, textarea, button')?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  /** 换声优时清空草稿，免得把上一位的题目带过去。 */
  useEffect(() => {
    setPrompt('');
    setOptions(['', '', '', '']);
    setAnswer(0);
    setLevel('normal');
    setExplain('');
    setSource('');
    setErrors({});
    setDone(false);
  }, [seiyuuId]);

  const filledOptions = options.map((option) => option.trim());
  const usedOptions = filledOptions.filter(Boolean);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors: FieldErrors = {};
    if (prompt.trim().length < MIN_PROMPT_LENGTH) nextErrors.prompt = t('seiyuuQuiz.contribute.errors.prompt');
    if (usedOptions.length < MIN_OPTIONS || new Set(usedOptions).size !== usedOptions.length) {
      nextErrors.options = t('seiyuuQuiz.contribute.errors.options');
    }
    if (explain.trim().length < MIN_EXPLAIN_LENGTH) nextErrors.explain = t('seiyuuQuiz.contribute.errors.explain');
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    if (answer >= usedOptions.length) {
      setErrors({ options: t('seiyuuQuiz.contribute.errors.options') });
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/seiyuu-quiz/submissions', {
        seiyuuId,
        seiyuuName,
        level,
        prompt: prompt.trim(),
        options: usedOptions,
        answer,
        explain: explain.trim(),
        source: source.trim(),
      });
      setDone(true);
      toast.success(t('seiyuuQuiz.contribute.done'));
    } catch (error) {
      toast.error(errMsg(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="sq-contribute">
      <h3>{t('seiyuuQuiz.contribute.title')}</h3>
      <p className="muted">{t('seiyuuQuiz.contribute.intro', { name: seiyuuName })}</p>
      {user ? (
        <button type="button" className="btn" onClick={() => setOpen(true)}>
          <Plus size={15} />
          {t('seiyuuQuiz.contribute.open')}
        </button>
      ) : (
        <Link className="btn" to="/login">
          {t('seiyuuQuiz.contribute.loginRequired')}
        </Link>
      )}

      {open && (
        <ModalPortal>
          <div className="confirm-backdrop">
            <div
              ref={dialogRef}
              className="confirm-dialog sq-contribute-dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
            >
              <div className="confirm-heading">
                <h2 id={titleId}>{`${t('seiyuuQuiz.contribute.title')} · ${seiyuuName}`}</h2>
                <button
                  type="button"
                  className="confirm-close"
                  aria-label={t('common.close')}
                  onClick={() => setOpen(false)}
                >
                  <X size={18} />
                </button>
              </div>

              {done ? (
                <div className="sq-contribute-done">
                  <p className="sq-copied">
                    <Check size={15} aria-hidden="true" />
                    {t('seiyuuQuiz.contribute.done')}
                  </p>
                  <div className="confirm-actions">
                    <button type="button" className="btn" onClick={() => setOpen(false)}>
                      {t('common.close')}
                    </button>
                  </div>
                </div>
              ) : (
                <form className="form sq-contribute-form" onSubmit={submit} noValidate>
                  <label className="sq-contribute-field">
                    <span>{t('seiyuuQuiz.contribute.promptLabel')}</span>
                    <textarea
                      className="input"
                      rows={2}
                      value={prompt}
                      onChange={(event) => {
                        setPrompt(event.target.value);
                        setErrors((current) => ({ ...current, prompt: undefined }));
                      }}
                      placeholder={t('seiyuuQuiz.contribute.promptPlaceholder')}
                      aria-invalid={Boolean(errors.prompt)}
                    />
                    {errors.prompt && <span className="auth-field-error">{errors.prompt}</span>}
                  </label>

                  <fieldset className="sq-contribute-options">
                    <legend>{t('seiyuuQuiz.contribute.optionsLabel')}</legend>
                    {options.map((option, index) => (
                      <div className="sq-contribute-option" key={`option-${index}`}>
                        <label className="sq-contribute-option-pick">
                          <input
                            type="radio"
                            name="sq-contribute-answer"
                            checked={answer === index}
                            onChange={() => setAnswer(index)}
                            aria-label={`${t('seiyuuQuiz.contribute.answerLabel')} ${index + 1}`}
                          />
                          <span>{String.fromCharCode(65 + index)}</span>
                        </label>
                        <input
                          className="input"
                          value={option}
                          onChange={(event) => {
                            setOptions((current) =>
                              current.map((item, position) => (position === index ? event.target.value : item)),
                            );
                            setErrors((current) => ({ ...current, options: undefined }));
                          }}
                          placeholder={t('seiyuuQuiz.contribute.optionPlaceholder', { index: index + 1 })}
                        />
                        {options.length > MIN_OPTIONS && (
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            aria-label={t('seiyuuQuiz.contribute.removeOption', { index: index + 1 })}
                            onClick={() => {
                              setOptions((current) => current.filter((_item, position) => position !== index));
                              setAnswer((current) => (current > index ? current - 1 : Math.min(current, options.length - 2)));
                            }}
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    ))}
                    {options.length < MAX_OPTIONS && (
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => setOptions((current) => [...current, ''])}
                      >
                        <Plus size={15} />
                        {t('seiyuuQuiz.contribute.addOption')}
                      </button>
                    )}
                    {errors.options && <span className="auth-field-error">{errors.options}</span>}
                  </fieldset>

                  <label className="sq-contribute-field">
                    <span>{t('seiyuuQuiz.contribute.levelLabel')}</span>
                    <select
                      className="input"
                      value={level}
                      onChange={(event) => setLevel(event.target.value as QuestionLevel)}
                    >
                      {LEVEL_IDS.map((item) => (
                        <option key={item} value={item}>
                          {t(`seiyuuQuiz.levels.${item}`)}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="sq-contribute-field">
                    <span>{t('seiyuuQuiz.contribute.explainLabel')}</span>
                    <textarea
                      className="input"
                      rows={2}
                      value={explain}
                      onChange={(event) => {
                        setExplain(event.target.value);
                        setErrors((current) => ({ ...current, explain: undefined }));
                      }}
                      placeholder={t('seiyuuQuiz.contribute.explainPlaceholder')}
                      aria-invalid={Boolean(errors.explain)}
                    />
                    {errors.explain && <span className="auth-field-error">{errors.explain}</span>}
                  </label>

                  <label className="sq-contribute-field">
                    <span>{t('seiyuuQuiz.contribute.sourceLabel')}</span>
                    <input
                      className="input"
                      value={source}
                      onChange={(event) => setSource(event.target.value)}
                      placeholder={t('seiyuuQuiz.contribute.sourcePlaceholder')}
                      maxLength={300}
                    />
                  </label>

                  <div className="confirm-actions">
                    <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>
                      {t('seiyuuQuiz.contribute.cancel')}
                    </button>
                    <button type="submit" className="btn" disabled={submitting}>
                      <Send size={15} />
                      {submitting ? t('seiyuuQuiz.contribute.submitting') : t('seiyuuQuiz.contribute.submit')}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </ModalPortal>
      )}
    </section>
  );
}
