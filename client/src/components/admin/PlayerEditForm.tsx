import { FormEvent, useEffect, useId, useRef, useState } from 'react';
import { X } from 'lucide-react';
import ModalPortal from '../ModalPortal';
import { toast } from '../Toast';
import { useTranslation } from 'react-i18next';
import DifficultyMultiSelect from './DifficultyMultiSelect';

/** 与管理端 seiyuuSchema 对齐(其余字段由爬虫脚本维护,不在这里编辑) */
export interface PlayerForm {
  id?: number;
  name: string;
  romaji: string;
  birth_place: string;
  agency: string;
  birth_date: string | null;
  debut_year: number | null;
  height: number | null;
  blood_type: string | null;
  voice_types: string[];
  representative_characters: string[];
  difficulties: string[];
  is_enabled: boolean;
}

export const emptyPlayer: PlayerForm = {
  name: '',
  romaji: '',
  birth_place: '',
  agency: '',
  birth_date: null,
  debut_year: null,
  height: null,
  blood_type: null,
  voice_types: [],
  representative_characters: [],
  difficulties: ['normal'],
  is_enabled: true,
};

/** 多行文本 ↔ 字符串数组 */
const linesToArray = (value: string) =>
  value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);

interface Props {
  initial: PlayerForm;
  difficultyKeys: string[];
  onSubmit: (form: PlayerForm) => Promise<void>;
  onCancel: () => void;
}

export default function PlayerEditForm({ initial, difficultyKeys, onSubmit, onCancel }: Props) {
  const { t } = useTranslation();
  const [form, setForm] = useState<PlayerForm>(() => ({ ...initial }));
  const [saving, setSaving] = useState(false);
  const titleId = useId();
  const firstInputRef = useRef<HTMLInputElement>(null);
  const set = (patch: Partial<PlayerForm>) => setForm((current) => ({ ...current, ...patch }));

  useEffect(() => {
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    firstInputRef.current?.focus();
    return () => {
      document.body.style.overflow = oldOverflow;
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !saving) onCancel();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [onCancel, saving]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await onSubmit(form);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('admin.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalPortal>
      <div
        className="admin-player-backdrop"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget && !saving) onCancel();
        }}
      >
        <div className="admin-player-dialog" role="dialog" aria-modal="true" aria-labelledby={titleId}>
          <div className="admin-player-dialog-heading">
            <div>
              <h2 id={titleId}>{form.id ? t('admin.editPlayer', { player: form.name }) : t('admin.addPlayer')}</h2>
              <p>{t('admin.formDescription')}</p>
            </div>
            <button className="confirm-close" type="button" aria-label={t('common.close')} onClick={onCancel} disabled={saving}>
              <X size={18} />
            </button>
          </div>

          <form onSubmit={submit}>
          <div className="admin-player-form-grid">
            <label className="admin-player-field">
              <span>{t('player.name')} *</span>
              <input ref={firstInputRef} className="input" value={form.name} onChange={(event) => set({ name: event.target.value })} required />
            </label>
            <label className="admin-player-field">
              <span>{t('player.romaji')}</span>
              <input className="input" value={form.romaji} onChange={(event) => set({ romaji: event.target.value })} />
            </label>
            <label className="admin-player-field">
              <span>{t('player.agency')}</span>
              <input className="input" value={form.agency} onChange={(event) => set({ agency: event.target.value })} />
            </label>
            <label className="admin-player-field">
              <span>{t('player.birthPlace')}</span>
              <input className="input" value={form.birth_place} onChange={(event) => set({ birth_place: event.target.value })} />
            </label>
            <label className="admin-player-field">
              <span>{t('player.birthDate')}</span>
              <input
                className="input"
                type="date"
                value={form.birth_date ?? ''}
                onChange={(event) => set({ birth_date: event.target.value || null })}
              />
            </label>
            <label className="admin-player-field">
              <span>{t('player.debutYear')}</span>
              <input
                className="input"
                type="number"
                min="1900"
                max="2100"
                value={form.debut_year ?? ''}
                onChange={(event) => set({ debut_year: event.target.value ? Number(event.target.value) : null })}
              />
            </label>
            <label className="admin-player-field">
              <span>{t('admin.playerHeight')}</span>
              <input
                className="input"
                type="number"
                min="100"
                max="250"
                value={form.height ?? ''}
                onChange={(event) => set({ height: event.target.value ? Number(event.target.value) : null })}
              />
            </label>
            <label className="admin-player-field">
              <span>{t('player.bloodType')}</span>
              <input
                className="input"
                maxLength={4}
                value={form.blood_type ?? ''}
                onChange={(event) => set({ blood_type: event.target.value || null })}
              />
            </label>
            <label className="admin-player-field">
              <span>{t('admin.playerVoiceTypes')}</span>
              <textarea
                className="input"
                rows={3}
                value={form.voice_types.join('\n')}
                onChange={(event) => set({ voice_types: linesToArray(event.target.value) })}
                placeholder={t('admin.playerVoiceTypesPlaceholder')}
              />
            </label>
            <label className="admin-player-field">
              <span>{t('player.representativeCharacters')}</span>
              <textarea
                className="input"
                rows={4}
                value={form.representative_characters.join('\n')}
                onChange={(event) => set({ representative_characters: linesToArray(event.target.value) })}
                placeholder={t('admin.playerCharactersPlaceholder')}
              />
            </label>
          </div>

          <div className="admin-player-flags">
            <div className="admin-player-difficulty-field">
              <span className="admin-player-flag-label">{t('player.difficulties')}</span>
              <DifficultyMultiSelect
                options={difficultyKeys}
                value={form.difficulties}
                onChange={(difficulties) => set({ difficulties })}
              />
            </div>
            <label><input type="checkbox" checked={form.is_enabled} onChange={(event) => set({ is_enabled: event.target.checked })} />{t('admin.enabledPlayer')}</label>
          </div>

          <div className="admin-player-dialog-actions">
            <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={saving}>{t('common.cancel')}</button>
            <button className="btn btn-green" disabled={saving || form.difficulties.length === 0}>{saving ? t('admin.saving') : form.id ? t('admin.saveChanges') : t('admin.addPlayer')}</button>
          </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
}
