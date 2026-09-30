import { ReactNode, useEffect } from 'react';
import { Building2, MapPin, Calendar, Users, Sparkles, Cake, Mic, Gamepad2 } from 'lucide-react';
import ModalPortal from './ModalPortal';
import { useTranslation } from 'react-i18next';
import { difficultyLabel } from '../utils/difficulty';

export interface AnswerInfo {
  name: string;
  romaji?: string;
  agency: string;
  birthPlace: string;
  birthDate?: string | null;
  debutYear?: number;
  voiceCount?: number;
  gameVoiceCount?: number;
  groups?: string[];
  representativeCharacters?: string[];
  representativeGames?: { work: string; character: string }[];
  representativeWorks?: { work: string; character: string }[];
  difficulties?: string[];
}

/** 声优信息表(答案卡片/查询结果共用) */
export function PlayerInfoTable({ answer }: { answer: AnswerInfo }) {
  const { t } = useTranslation();
  const formatVoiceCount = (n?: number) => (n ? `${n} ${t('guess.columns.voiceCount')}` : '-');
  const rows: [ReactNode, string, ReactNode][] = [
    [<Building2 size={14} key="i" />, t('player.agency'), answer.agency || '-'],
    [<MapPin size={14} key="i" />, t('player.birthPlace'), answer.birthPlace || '-'],
    [<Cake size={14} key="i" />, t('player.birthDate'), answer.birthDate || t('guess.dataMissing')],
    [<Calendar size={14} key="i" />, t('player.debutYear'), answer.debutYear ? `${answer.debutYear} 年` : '-'],
    [<Mic size={14} key="i" />, t('player.voiceCount'), formatVoiceCount(answer.voiceCount)],
    [<Users size={14} key="i" />, t('player.groups'), answer.groups?.length ? answer.groups.join('、') : '-'],
    [<Sparkles size={14} key="i" />, t('player.representativeCharacters'), answer.representativeCharacters?.length ? answer.representativeCharacters.join('、') : '-'],
  ];
  if (answer.representativeGames && answer.representativeGames.length > 0) {
    rows.push([
      <Gamepad2 size={14} key="i" />,
      t('player.representativeGames'),
      answer.representativeGames.slice(0, 6).map((w) =>
        w.character ? `${w.work}（${w.character}）` : w.work
      ).join(' / '),
    ]);
  }
  if (answer.representativeWorks && answer.representativeWorks.length > 0) {
    rows.push([
      <Sparkles size={14} key="i" />,
      t('player.representativeWorks'),
      answer.representativeWorks.slice(0, 5).map((w) =>
        w.character ? `${w.work}(${w.character})` : w.work
      ).join(' / '),
    ]);
  }
  if (answer.difficulties) {
    rows.push([
      <Sparkles size={14} key="i" />,
      t('player.difficulties'),
      answer.difficulties.length
        ? answer.difficulties.map((key) => difficultyLabel(t, key)).join(', ')
        : '-',
    ]);
  }
  return (
    <table className="player-info-table">
      <tbody>
        {rows.map(([icon, label, value]) => (
          <tr key={label}>
            <td className="label">
              {icon}
              {label}
            </td>
            <td className="value">{value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

interface Props {
  title: string;
  answer: AnswerInfo | null;
  extra?: ReactNode;
  actions: ReactNode;
  onClose?: () => void;
  /** 胜负配色:win 绿色调头部,lose 中性 */
  tone?: 'win' | 'lose';
}

/** 结算/答案遮罩卡片 */
export default function AnswerOverlay({ title, answer, extra, actions, onClose, tone }: Props) {
  useEffect(() => {
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = oldOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);

  return (
    <ModalPortal>
      <div
        className="overlay"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) onClose?.();
        }}
      >
        <div
          className={`overlay-card${tone ? ` overlay-card-${tone}` : ''}`}
          role="dialog"
          aria-modal="true"
        >
          <h2>{title}</h2>
          {extra}
          {answer && (
            <>
              <p className="answer-name">{answer.name}</p>
              <PlayerInfoTable answer={answer} />
            </>
          )}
          <div className="btns">{actions}</div>
        </div>
      </div>
    </ModalPortal>
  );
}
