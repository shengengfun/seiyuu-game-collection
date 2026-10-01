import { ArrowUp, ArrowDown } from 'lucide-react';
import { memo } from 'react';
import { AttributeFeedback, HiddenAttributeFeedback, MultiplayerGuessFeedback } from '@seiyuu/game-sdk';
import { useTranslation } from 'react-i18next';

function Cell({
  attr,
  label,
  format,
}: {
  attr: AttributeFeedback | HiddenAttributeFeedback;
  label: string;
  format?: (value: string) => string;
}) {
  const { t } = useTranslation();
  if (!('value' in attr)) {
    // Hidden cell: show only level + hint/matched
    const hasMatched = 'matched' in attr && typeof attr.matched === 'number' && attr.matched > 0;
    return (
      <td className={`${attr.level} masked-cell`} data-label={label}>
        {attr.hint && attr.level !== 'correct' && attr.level !== 'missing' && (
          <span className="dir">
            {attr.hint === 'higher' ? <ArrowUp size={13} /> : <ArrowDown size={13} />}
          </span>
        )}
        {hasMatched && (
          <span className="match-count">{attr.matched}</span>
        )}
      </td>
    );
  }
  const isMissing = attr.level === 'missing';
  const text = isMissing
    ? t('guess.dataMissing')
    : typeof attr.value === 'boolean'
      ? attr.value
        ? t('common.active')
        : t('common.retired')
      : format
        ? format(String(attr.value))
        : String(attr.value);
  const hasMatched = 'matched' in attr && typeof attr.matched === 'number' && attr.matched > 0;
  return (
    <td className={attr.level} data-label={label}>
      {text}
      {hasMatched && attr.level !== 'correct' && !isMissing && (
        <span className="match-count">({attr.matched})</span>
      )}
      {attr.hint && attr.level !== 'correct' && !isMissing && (
        <span className="dir">
          {attr.hint === 'higher' ? <ArrowUp size={13} /> : <ArrowDown size={13} />}
        </span>
      )}
    </td>
  );
}

/** 猜测反馈表:原版 game-table 布局,每行一次猜测的逐属性对比 */
function GuessBoard({ guesses }: { guesses: MultiplayerGuessFeedback[] }) {
  const { t } = useTranslation();
  const columns = [
    t('guess.columns.name'),
    t('guess.columns.agency'),
    t('guess.columns.birthPlace'),
    t('guess.columns.birthDate'),
    t('guess.columns.debutYear'),
    t('guess.columns.voiceCount'),
    t('guess.columns.groups'),
    t('guess.columns.repChars'),
  ];
  return (
    <div className="game-table-wrap">
      <table className="game-table game-table-wide">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {guesses.map((g, i) => (
            <tr
              key={'hidden' in g ? `hidden-${i}` : `${g.playerId}-${i}`}
              className={`${i === guesses.length - 1 ? 'row-latest' : ''} ${g.correct ? 'row-correct' : ''}`}
            >
              <td
                className={`name ${g.correct ? 'correct' : ''} ${'hidden' in g ? 'masked-cell' : ''}`}
                data-label={columns[0]}
              >
                {'hidden' in g ? null : g.name}
              </td>
              <Cell attr={g.attributes.agency} label={columns[1]} />
              <Cell attr={g.attributes.birthPlace} label={columns[2]} />
              <Cell attr={g.attributes.birthDate} label={columns[3]} />
              <Cell attr={g.attributes.debutYear} label={columns[4]} />
              <Cell attr={g.attributes.voiceCount} label={columns[5]} />
              <Cell attr={g.attributes.groups} label={columns[6]} />
              <Cell attr={g.attributes.representativeCharacters} label={columns[7]} />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default memo(GuessBoard);
