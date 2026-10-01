/**
 * 「声优简历找茬」——给一份声优资料卡，混进 1~3 个错信息，限时挑出来。
 *
 * 资料卡固定 5 栏：姓名 / 事务所 / 所属企划 / 代表角色 / 罗马字。
 * 姓名是锚点（永远正确，玩家得先认出这是谁），其余 4 栏都可能被改：
 * - 事务所：换成别人的事务所（原档案是自由身时，填一个事务所也是错）；
 * - 所属企划：换成一个本人**没有**参与的企划（alsoIn 里的也不能算错）；
 * - 代表角色：拿别人的角色（角色 + 作品整体换，避免拼出巧合成立的组合）；
 * - 罗马字：换成别人的罗马字。
 *
 * 所有错项都来自名册里的真实数据 —— 不会有「其实也说得通」的模糊项，
 * 判断依据只有 `shared/src/seiyuu` 的名册与事务所表。
 *
 * 纯逻辑：随机走注入的 `random()`，同一个 seed 出的卡与错项一致。
 */

import {
  agencyOf,
  formatCharacter,
  PROJECTS,
  SEIYUU_BY_ID,
  SEIYUU_ROSTER,
  type SeiyuuIdentity,
} from '@seiyuu/shared';
import { FANDOM_IDS } from '@seiyuu/game-sdk';

export type ResumeFieldId = 'name' | 'agency' | 'project' | 'role' | 'romaji';

/** 资料卡的栏目顺序（页面与海报都按它渲染）。 */
export const RESUME_FIELD_IDS: ResumeFieldId[] = ['name', 'agency', 'project', 'role', 'romaji'];

/** 可以埋错的栏目：姓名是锚点，永远正确。 */
export const RESUME_ERROR_FIELDS: ResumeFieldId[] = ['agency', 'project', 'role', 'romaji'];

export interface ResumeField {
  id: ResumeFieldId;
  /** 显示值。`agency` 为空串表示自由身，由页面翻译。 */
  value: string;
  wrong: boolean;
}

export interface ResumeCard {
  seiyuuId: string;
  fields: ResumeField[];
  /** 这张卡埋了几个错。 */
  errors: number;
}

export type ResumeDifficulty = 'easy' | 'normal' | 'hard';

export interface ResumeRule {
  /** 每张卡埋几个错。 */
  errors: number;
  /** 一局几张卡。 */
  rounds: number;
  /** 每张卡的限时（秒）。 */
  seconds: number;
}

export const RESUME_RULES: Record<ResumeDifficulty, ResumeRule> = {
  easy: { errors: 1, rounds: 4, seconds: 90 },
  normal: { errors: 2, rounds: 5, seconds: 75 },
  hard: { errors: 3, rounds: 5, seconds: 55 },
};

export const RESUME_DIFFICULTIES: ResumeDifficulty[] = ['easy', 'normal', 'hard'];

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randomSeed(): number {
  return Math.floor(Math.random() * 90000) + 10000;
}

function pick<T>(items: T[], random: () => number): T {
  return items[Math.floor(random() * items.length) % items.length];
}

/** 洗牌（不改原数组）。 */
function shuffle<T>(items: T[], random: () => number): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [result[index], result[swap]] = [result[swap], result[index]];
  }
  return result;
}

/** 本人参与过的企划（主企划 + alsoIn）。 */
function projectsOf(identity: SeiyuuIdentity): Set<string> {
  const set = new Set<string>([identity.project]);
  for (const project of identity.alsoIn ?? []) set.add(project);
  return set;
}

/** 本人自己的角色（角色名 + 作品当成一个整体比对）。 */
function ownRoles(identity: SeiyuuIdentity): Set<string> {
  return new Set(identity.characters.map((character) => formatCharacter(character)));
}

/** 真的事务所显示值（空串 = 自由身）。 */
export function agencyValueOf(identity: SeiyuuIdentity): string {
  return agencyOf(identity.id);
}

/** 换成别人的事务所。 */
function wrongAgency(identity: SeiyuuIdentity, random: () => number): string {
  const own = agencyValueOf(identity);
  const pool = [...new Set(FANDOM_IDS.map((id) => agencyOf(id)))].filter(
    (agency) => agency && agency !== own,
  );
  return pick(pool, random);
}

/** 换成本人没参与过的企划。 */
function wrongProject(identity: SeiyuuIdentity, random: () => number): string {
  const own = projectsOf(identity);
  const pool = Object.values(PROJECTS).filter((project) => !own.has(project.id));
  return pick(pool, random).nameJa;
}

/** 换成别人的代表角色。 */
function wrongRole(identity: SeiyuuIdentity, random: () => number): string {
  const own = ownRoles(identity);
  const pool = SEIYUU_ROSTER.flatMap((other) =>
    other.id === identity.id
      ? []
      : other.characters
          .map((character) => formatCharacter(character))
          .filter((line) => !own.has(line)),
  );
  return pick(pool, random);
}

/** 换成别人的罗马字。 */
function wrongRomaji(identity: SeiyuuIdentity, random: () => number): string {
  const pool = SEIYUU_ROSTER.filter(
    (other) => other.id !== identity.id && other.romaji !== identity.romaji,
  ).map((other) => other.romaji);
  return pick(pool, random);
}

/** 出一张资料卡。 */
export function makeCard(
  seed: number,
  difficulty: ResumeDifficulty = 'normal',
  ids: string[] = FANDOM_IDS,
): ResumeCard {
  const random = mulberry32(seed);
  const rule = RESUME_RULES[difficulty];
  const seiyuuId = pick(ids, random);
  const identity = SEIYUU_BY_ID.get(seiyuuId);
  if (!identity) throw new Error(`名册里没有 ${seiyuuId}`);

  const values: Record<ResumeFieldId, string> = {
    name: `${identity.name}（${identity.nameJa}）`,
    agency: agencyValueOf(identity),
    project: PROJECTS[identity.project].nameJa,
    role: identity.characters[0] ? formatCharacter(identity.characters[0]) : '',
    romaji: identity.romaji,
  };

  const wrongFields = shuffle(RESUME_ERROR_FIELDS, random).slice(
    0,
    Math.min(rule.errors, RESUME_ERROR_FIELDS.length),
  );
  const wrongSet = new Set(wrongFields);

  const fields: ResumeField[] = RESUME_FIELD_IDS.map((id) => {
    if (!wrongSet.has(id)) return { id, value: values[id], wrong: false };
    const value =
      id === 'agency'
        ? wrongAgency(identity, random)
        : id === 'project'
          ? wrongProject(identity, random)
          : id === 'role'
            ? wrongRole(identity, random)
            : wrongRomaji(identity, random);
    return { id, value, wrong: true };
  });

  return { seiyuuId, fields, errors: wrongFields.length };
}

export interface ResumeVerdict {
  /** 是不是一个不漏、一个不多。 */
  perfect: boolean;
  /** 漏掉的错项。 */
  missed: ResumeFieldId[];
  /** 冤枉的正确栏目。 */
  extra: ResumeFieldId[];
  /** 找出来的错项数。 */
  found: number;
}

/** 交卷判定。 */
export function checkCard(card: ResumeCard, picked: Iterable<ResumeFieldId>): ResumeVerdict {
  const pickedSet = new Set(picked);
  const wrongSet = new Set(card.fields.filter((field) => field.wrong).map((field) => field.id));
  const found = [...wrongSet].filter((id) => pickedSet.has(id));
  const missed = [...wrongSet].filter((id) => !pickedSet.has(id));
  const extra = [...pickedSet].filter((id) => !wrongSet.has(id));
  return { perfect: missed.length === 0 && extra.length === 0, missed, extra, found: found.length };
}

/**
 * 一张卡的得分（满分 100）。
 * 全对给 70 底分 + 最多 30 的时间奖励；没全对按「找到 1 个 20 分、冤枉 1 个 25 分」扣。
 */
export function roundScore(verdict: ResumeVerdict, secondsLeft: number, seconds: number): number {
  if (verdict.perfect) {
    const ratio = Math.max(0, Math.min(1, secondsLeft / seconds));
    return 70 + Math.round(ratio * 30);
  }
  return Math.max(0, verdict.found * 20 - verdict.extra.length * 25);
}

/** 一局总分 → 等级。 */
export function gradeOf(total: number, rounds: number): 'S' | 'A' | 'B' | 'C' {
  const ratio = rounds > 0 ? total / (rounds * 100) : 0;
  if (ratio >= 0.92) return 'S';
  if (ratio >= 0.78) return 'A';
  if (ratio >= 0.55) return 'B';
  return 'C';
}

/** 名单里的档案（页面渲染用）。 */
export function identityOf(id: string): SeiyuuIdentity | undefined {
  return SEIYUU_BY_ID.get(id);
}

/** 分享图默认文件名前缀。 */
export const RESUME_POSTER_PREFIX = 'seiyuu-resume';
