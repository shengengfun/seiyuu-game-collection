/**
 * 「声优关系网」——一条一条把关系连起来的连线游戏。
 *
 * 数据全部来自公共名册（`@seiyuu/shared`）里的企划与代表角色，不用后端接口：
 * - **共演**：两个人的代表作里有同名作品（例：同一部《BanG Dream!》）
 * - **同企划**：两个人属于同一个企划（例：都在 LoveLive! 系列里）
 *
 * 出题有两种题型，难度不一样：
 * - `coStar`（难）：问「谁和 TA 共演过」，干扰项是**同企划但没共演**的人，只认作品；
 * - `sameProject`（易）：问「谁和 TA 同企划」，干扰项都是别的企划的人。
 *
 * 答对就把新面孔连进网络，答错掉一条命；网络没法再扩展（出题的素材用光）就结算。
 */

import {
  PROJECTS,
  SEIYUU_ROSTER,
  agencyOf,
  agencyPeersOf,
  formatCharacter,
  seiyuuPhotoPath,
  type ProjectId,
  type SeiyuuIdentity,
} from '@seiyuu/shared';

/** 上传的关系类型。 */
export type RelationKind = 'coStar' | 'sameAgency' | 'sameProject';

/** 三种题型（也是出题时的候选顺序）。 */
export const RELATION_KINDS: RelationKind[] = ['coStar', 'sameAgency', 'sameProject'];

/** 出题权重：共演是主力，同事务所、同企划也要能露脸。 */
const KIND_WEIGHT: Record<RelationKind, number> = {
  coStar: 3,
  sameAgency: 2,
  sameProject: 1,
};

/** 按权重从可用题型里挑一个。 */
function weightedPick(kinds: RelationKind[], random: () => number): RelationKind {
  const total = kinds.reduce((sum, kind) => sum + KIND_WEIGHT[kind], 0);
  let roll = random() * total;
  for (const kind of kinds) {
    roll -= KIND_WEIGHT[kind];
    if (roll <= 0) return kind;
  }
  return kinds[kinds.length - 1];
}

/** 起始生命值。 */
export const INITIAL_LIVES = 3;

/** id → 档案。 */
const BY_ID = new Map<string, SeiyuuIdentity>(SEIYUU_ROSTER.map((item) => [item.id, item]));

/** id → 代表作里的作品集合。 */
const WORKS_BY_ID = new Map<string, Set<string>>(
  SEIYUU_ROSTER.map((item) => [item.id, new Set(item.characters.map((character) => character.work))]),
);

/** id → 同作品的其他人。 */
const CO_STARS_BY_ID = new Map<string, Set<string>>();
for (const item of SEIYUU_ROSTER) {
  const works = WORKS_BY_ID.get(item.id)!;
  const peers = new Set<string>();
  for (const other of SEIYUU_ROSTER) {
    if (other.id === item.id) continue;
    const otherWorks = WORKS_BY_ID.get(other.id)!;
    for (const work of otherWorks) {
      if (works.has(work)) {
        peers.add(other.id);
        break;
      }
    }
  }
  CO_STARS_BY_ID.set(item.id, peers);
}

/** id → 同企划的其他人。 */
const SAME_PROJECT_BY_ID = new Map<string, Set<string>>(
  SEIYUU_ROSTER.map((item) => [
    item.id,
    new Set(
      SEIYUU_ROSTER.filter((other) => other.id !== item.id && other.project === item.project).map(
        (other) => other.id,
      ),
    ),
  ]),
);

/** 名册里所有声优 id。 */
export const ALL_SEIYUU_IDS: string[] = SEIYUU_ROSTER.map((item) => item.id);

export function identityOf(id: string): SeiyuuIdentity | undefined {
  return BY_ID.get(id);
}

/** 公式照路径。 */
export function photoOf(id: string): string {
  return seiyuuPhotoPath(id);
}

/** 两个人的共同作品。 */
export function sharedWorks(a: string, b: string): string[] {
  const left = WORKS_BY_ID.get(a);
  const right = WORKS_BY_ID.get(b);
  if (!left || !right) return [];
  return [...left].filter((work) => right.has(work));
}

/** 两人是不是共演关系（有共同作品）。 */
export function isCoStar(a: string, b: string): boolean {
  return a !== b && sharedWorks(a, b).length > 0;
}

/** 两人是不是同企划。 */
export function isSameProject(a: string, b: string): boolean {
  return a !== b && BY_ID.get(a)?.project === BY_ID.get(b)?.project;
}

/** 两人是不是同一家事务所（没收录或自由身都不算）。 */
export function isSameAgency(a: string, b: string): boolean {
  if (a === b) return false;
  const agency = agencyOf(a);
  return Boolean(agency) && agency === agencyOf(b);
}

/** 两人之间最强的关系；没有关系返回 null。 */
export function relationOf(a: string, b: string): RelationKind | null {
  if (isCoStar(a, b)) return 'coStar';
  if (isSameAgency(a, b)) return 'sameAgency';
  if (isSameProject(a, b)) return 'sameProject';
  return null;
}

/** 某人的共演伙伴。 */
export function coStarsOf(id: string): string[] {
  return [...(CO_STARS_BY_ID.get(id) ?? [])];
}

/** 某人的同事务所伙伴。 */
export function sameAgencyPeersOf(id: string): string[] {
  return agencyPeersOf(id);
}

/** 某人的所属事务所名（未收录返回空串）。 */
export function agencyNameOf(id: string): string {
  return agencyOf(id);
}

/** 某人的同企划伙伴。 */
export function sameProjectPeersOf(id: string): string[] {
  return [...(SAME_PROJECT_BY_ID.get(id) ?? [])];
}

/** 企划 id → 展示用名（日文官方写法）。 */
export function projectNameOf(id: string): string {
  const identity = BY_ID.get(id);
  if (!identity) return '';
  return PROJECTS[identity.project as ProjectId]?.nameJa ?? identity.project;
}

/** 某人的代表角色一行文本（用作结果页与选项的小字）。 */
export function roleLineOf(id: string): string {
  const identity = BY_ID.get(id);
  const character = identity?.characters[0];
  return character ? formatCharacter(character) : '';
}

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

function shuffle<T>(items: T[], random: () => number): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [result[index], result[swap]] = [result[swap], result[index]];
  }
  return result;
}

export function randomSeed(): number {
  return Math.floor(Math.random() * 90000) + 10000;
}

export interface NetworkQuestion {
  /** 从谁身上出题（一定已经在网络里）。 */
  sourceId: string;
  kind: RelationKind;
  answerId: string;
  /** 四个选项（已打乱，含答案）。 */
  options: string[];
  /** 答案为共演题时，两人的共同作品。 */
  works: string[];
  /** 答案为同事务所题时的事务所名。 */
  agency: string;
}

/** 某个题型下，和某人「算有关系」的候选人。 */
function peersFor(kind: RelationKind, id: string): string[] {
  if (kind === 'coStar') return coStarsOf(id);
  if (kind === 'sameAgency') return sameAgencyPeersOf(id);
  return sameProjectPeersOf(id);
}

/**
 * 生成下一题；素材用光返回 null（游戏结束）。
 *
 * 题型按权重随机：共演 3、同事务所 2、同企划 1 —— 都能出，但共演是主力。
 * （只按优先级出题的话，共演素材太多会把另外两种题型彻底挤掉。）
 */
export function pickQuestion(
  network: string[],
  random: () => number = Math.random,
): NetworkQuestion | null {
  const inNetwork = new Set(network);
  const sources = shuffle(network, random);

  // 每个还能出题的人，先算清楚他自己有哪些题型可出
  const options = sources
    .map((sourceId) => ({
      sourceId,
      kinds: RELATION_KINDS.filter((kind) =>
        peersFor(kind, sourceId).some((id) => !inNetwork.has(id)),
      ),
    }))
    .filter((item) => item.kinds.length > 0);
  if (!options.length) return null;

  const chosen = options[Math.floor(random() * options.length)];
  const kind = weightedPick(chosen.kinds, random);
  const answers = peersFor(kind, chosen.sourceId).filter((id) => !inNetwork.has(id));
  if (!answers.length) return null;

  const sourceId = chosen.sourceId;
  const answerId = answers[Math.floor(random() * answers.length)];
  const source = BY_ID.get(sourceId);
  if (!source || answerId === sourceId) return null;

  const pool = shuffle(
    ALL_SEIYUU_IDS.filter((id) => id !== sourceId && !inNetwork.has(id) && id !== answerId),
    random,
  );
  const distractors: string[] = [];
  const push = (id: string) => {
    if (id !== answerId && !distractors.includes(id)) distractors.push(id);
  };

  // 共演题：先用「和 source 有关系但不是共演」的人做干扰项（最能迷惑人）
  if (kind === 'coStar') {
    for (const id of pool) {
      if (distractors.length >= 3) break;
      const related = isSameAgency(sourceId, id) || isSameProject(sourceId, id);
      // 注意：同事务所的人也可能一起演过 —— 那种人放进共演题里就是「也算对」，必须排除
      if (related && !isCoStar(sourceId, id)) push(id);
    }
  }
  // 兜底：干扰项必须和 source 完全没关系（否则「选它也算对」，题目就不成立）
  for (const id of pool) {
    if (distractors.length >= 3) break;
    if (!isCoStar(sourceId, id) && !isSameAgency(sourceId, id) && !isSameProject(sourceId, id)) {
      push(id);
    }
  }
  if (distractors.length < 3) return null;

  return {
    sourceId,
    kind,
    answerId,
    options: shuffle([answerId, ...distractors.slice(0, 3)], random),
    works: kind === 'coStar' ? sharedWorks(sourceId, answerId) : [],
    agency: kind === 'sameAgency' ? agencyOf(answerId) : '',
  };
}

/**
 * 螺旋布局：第一个节点在圆心，其余按黄金角向外扩散。
 * 返回归一化到 [-1, 1] 的坐标，页面按自己的半径映射。
 */
export function spiralLayout(count: number): { x: number; y: number }[] {
  const golden = 2.39996;
  return Array.from({ length: count }, (_, index) => {
    if (index === 0) return { x: 0, y: 0 };
    const ratio = count <= 2 ? 1 : index / (count - 1);
    const radius = 0.26 + 0.74 * Math.sqrt(ratio);
    const angle = index * golden;
    return { x: radius * Math.cos(angle), y: radius * Math.sin(angle) };
  });
}

/** 分享图默认文件名前缀。 */
export const NETWORK_POSTER_PREFIX = 'seiyuu-network';
