import { Seiyuu, GuessFeedback, AttributeFeedback, FeedbackLevel } from '../types';

const DEBUT_YEAR_CLOSE_RANGE = 3;

function textAttr(guess: string, target: string): AttributeFeedback {
  return { value: guess, level: guess === target ? 'correct' : 'wrong' };
}

function numberAttr(
  guessVal: number,
  targetVal: number,
  closeRange: number
): AttributeFeedback {
  if (guessVal === targetVal) return { value: guessVal, level: 'correct' };
  const level = Math.abs(guessVal - targetVal) <= closeRange ? 'close' : 'wrong';
  return {
    value: guessVal,
    level,
    hint: targetVal > guessVal ? 'higher' : 'lower',
  };
}

/**
 * 出生日期反馈:
 *  - 任何一方为 null/空 → missing("数据暂缺")
 *  - 同年同月同日 → correct
 *  - 同年(或相邻年 ±1) → close,带方向提示
 *  - 否则 wrong,带方向提示
 * 展示值用 "YYYY-MM-DD" 或 "YYYY" 或 "数据暂缺"
 */
function birthDateAttr(guess: string | null | undefined, target: string | null | undefined): AttributeFeedback {
  const MISSING: AttributeFeedback = { value: '数据暂缺', level: 'missing' };
  if (!guess || !target) return MISSING;
  const parseYear = (d: string) => {
    const m = d.match(/(\d{4})/);
    return m ? Number(m[1]) : null;
  };
  const gYear = parseYear(guess);
  const tYear = parseYear(target);
  if (gYear === null || tYear === null) return MISSING;
  const diff = Math.abs(gYear - tYear);
  const display = guess.length >= 10 ? guess.slice(0, 10) : guess;
  let level: FeedbackLevel = 'wrong';
  if (guess === target) level = 'correct';
  else if (diff <= 1) level = 'close';
  return {
    value: display,
    level,
    hint: tYear > gYear ? 'higher' : 'lower',
  };
}

/**
 * 配音数量反馈:
 *  - 任一方为 0 且另一方 > 0 → 仍按数值比较(不是 missing,只是数量少)
 *  - 两者都为 0 → missing("数据暂缺")
 * close 判定:差值 ≤ max(5, ceil(target * 0.1))
 */
function voiceCountAttr(guessVal: number, targetVal: number): AttributeFeedback {
  const MISSING: AttributeFeedback = { value: '数据暂缺', level: 'missing' };
  if (guessVal === 0 && targetVal === 0) return MISSING;
  if (guessVal === targetVal) return { value: guessVal, level: 'correct' };
  const closeRange = Math.max(5, Math.ceil(targetVal * 0.1));
  const level = Math.abs(guessVal - targetVal) <= closeRange ? 'close' : 'wrong';
  return {
    value: guessVal,
    level,
    hint: targetVal > guessVal ? 'higher' : 'lower',
  };
}

/**
 * 所属团体匹配：返回匹配数量，用于黄色反馈。
 * 匹配时不区分大小写，也去除常见符号。
 */
function groupsAttr(guess: string[], target: string[]): AttributeFeedback {
  const norm = (s: string) => s.trim().toLowerCase().replace(/[^\w\u4e00-\u9fa5]/g, '');
  const targetSet = new Set(target.map(norm).filter(Boolean));
  const matchSet = new Set<string>();
  for (const g of guess) {
    const k = norm(g);
    if (!k) continue;
    if (targetSet.has(k)) matchSet.add(k);
  }
  const matched = matchSet.size;
  const total = Math.max(targetSet.size, guess.filter((g) => norm(g)).length, 1);
  const allMatch = matched > 0 && matched === targetSet.size && matched === guess.filter((g) => norm(g)).length;
  return {
    value: guess.length ? guess.join('、') : '-',
    level: allMatch ? 'correct' : matched > 0 ? 'close' : 'wrong',
    matched,
  };
}

/**
 * 代表角色/代表作匹配：取 `角色+作品` 组合作为唯一键。
 * 只要猜测的列表与目标的列表之间存在任何共同条目，就给 close。
 * 全部条目都对应匹配（且数量相同），则给 correct。
 * 如果两个声优同属一个五大企划（LoveLive!、BanG Dream!等），也给 close。
 */
function representativeCharactersAttr(
  guess: Array<{ work: string; character: string }>,
  target: Array<{ work: string; character: string }>,
  guessFiveGroups: string[] = [],
  targetFiveGroups: string[] = [],
): AttributeFeedback {
  const keyOf = (x: { work: string; character: string }) =>
    `${x.character?.trim() || ''}||${x.work?.trim() || ''}`.toLowerCase();
  const targetKeys = new Set(target.map(keyOf).filter((k) => k !== '||'));
  const guessKeys = new Set(guess.map(keyOf).filter((k) => k !== '||'));
  let matched = 0;
  for (const k of guessKeys) if (targetKeys.has(k)) matched += 1;
  const sharedFranchise = guessFiveGroups.some((g) => targetFiveGroups.includes(g));
  const allMatch =
    matched > 0 && matched === targetKeys.size && matched === guessKeys.size;
  const display = guess.length
    ? guess.slice(0, 5).map((r) =>
        r.work ? `${r.character}《${r.work}》` : r.character,
      ).join(' / ')
    : '-';
  return {
    value: display,
    level: allMatch ? 'correct' : (matched > 0 || sharedFranchise) ? 'close' : 'wrong',
    matched,
  };
}

/** 逐属性对比猜测声优与目标声优，产出反馈 */
export function compareGuess(guess: Seiyuu, target: Seiyuu): GuessFeedback {
  const correct = guess.id === target.id;
  return {
    playerId: guess.id,
    name: guess.name,
    correct,
    attributes: {
      birthPlace: textAttr(guess.birth_place, target.birth_place),
      agency: textAttr(guess.agency, target.agency),
      birthDate: birthDateAttr(guess.birth_date, target.birth_date),
      debutYear: numberAttr(guess.debut_year, target.debut_year, DEBUT_YEAR_CLOSE_RANGE),
      voiceCount: voiceCountAttr(guess.voice_count ?? 0, target.voice_count ?? 0),
      groups: groupsAttr(guess.groups ?? [], target.groups ?? []),
      representativeCharacters: representativeCharactersAttr(
        guess.representative_characters ?? [],
        target.representative_characters ?? [],
        guess.five_groups ?? [],
        target.five_groups ?? [],
      ),
    },
  };
}

/** Upgrade Redis game snapshots created before a feedback attribute was added. */
export function completeGuessFeedback(
  feedback: GuessFeedback,
  guess?: Seiyuu,
  target?: Seiyuu
): GuessFeedback {
  const missing = { value: '数据暂缺', level: 'missing' as const };
  const wrongFallback = { value: '-', level: 'wrong' as const };
  const haveBoth = guess && target;

  const birthDate = haveBoth
    ? birthDateAttr(guess.birth_date, target.birth_date)
    : (feedback.attributes.birthDate ?? missing);
  const voiceCount = haveBoth
    ? voiceCountAttr(guess.voice_count ?? 0, target.voice_count ?? 0)
    : (feedback.attributes.voiceCount ?? missing);
  const agency = haveBoth
    ? textAttr(guess.agency, target.agency)
    : (feedback.attributes.agency ?? wrongFallback);
  const groupsFB = haveBoth
    ? groupsAttr(guess.groups ?? [], target.groups ?? [])
    : ((feedback.attributes as any).height ?? (feedback.attributes.groups ?? wrongFallback));
  const repChars = haveBoth
    ? representativeCharactersAttr(
        guess.representative_characters ?? [],
        target.representative_characters ?? [],
        guess.five_groups ?? [],
        target.five_groups ?? [],
      )
    : ((feedback.attributes as any).voiceTypes ?? (feedback.attributes.representativeCharacters ?? wrongFallback));
  const birthPlace = feedback.attributes.birthPlace ?? wrongFallback;
  const debutYear = feedback.attributes.debutYear ?? wrongFallback;

  return {
    ...feedback,
    attributes: {
      birthPlace,
      agency,
      birthDate,
      debutYear,
      voiceCount,
      groups: groupsFB,
      representativeCharacters: repChars,
    },
  };
}

export const MAX_GUESSES = 8;
