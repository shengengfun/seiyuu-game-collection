/**
 * 本地轻量评论审核引擎（零外部依赖）。
 *
 * 三段式：
 *   1. **归一化**：NFKC 全角折叠 → 去零宽字符 → 只保留字母 / 数字 / CJK，
 *      顺手杀掉「加 微 信」「傻*逼」这类靠空格与符号规避的写法；
 *   2. **Aho-Corasick 多模式匹配**：词库在模块加载时构建一次自动机，
 *      单次扫描 O(文本长度)，不做任何正则回溯，200 字短评耗时在微秒级；
 *   3. **启发式信号 + 声誉分**：链接 / 联系方式 / 手机号 / 重复灌水等，
 *      再按账号信誉微调，最后落在 approve / review / reject 三档。
 *
 * 纯函数、无 I/O，便于单测（`moderation/engine.test.ts`）。
 */

import {
  BENIGN_PREFIX,
  BENIGN_SUFFIX,
  CATEGORY_WEIGHT,
  MODERATION_WORDS,
  type ModerationCategory,
  type ModerationSeverity,
  type ModerationWord,
} from './words';

export type ModerationAction = 'approve' | 'review' | 'reject';

export type SignalCode =
  | 'LINK'
  | 'MANY_LINKS'
  | 'CONTACT_NUMBER'
  | 'PHONE'
  | 'ID_CARD'
  | 'REPEAT_RUN'
  | 'REPEAT_UNIT'
  | 'SYMBOL_HEAVY'
  | 'SHOUT'
  | 'TOO_SHORT'
  | 'SHORT_LINK';

export interface HeuristicSignal {
  code: SignalCode;
  weight: number;
}

export interface ModerationHit {
  word: string;
  category: ModerationCategory;
  severity: ModerationSeverity;
}

export interface Inspection {
  /** 命中的词（**仅供后台展示**，公开侧不下发，避免把词库反向暴露）。 */
  hits: ModerationHit[];
  signals: HeuristicSignal[];
  categories: ModerationCategory[];
  /** 0~100，越高风险越大。 */
  score: number;
  action: ModerationAction;
  /** 机器码，前端 / 后台按码展示（不透漏具体词）。 */
  reasons: string[];
}

/** 自动拒绝 / 转人工 的分数线。 */
export const REJECT_THRESHOLD = 80;
export const REVIEW_THRESHOLD = 40;

/** 命中即拒的严重度。 */
const HARD_SEVERITY: ModerationSeverity = 3;

const ZERO_WIDTH_RE = /[\u200b-\u200f\u2028-\u202e\u2060-\u2064\ufeff]/g;
/** 参与匹配的字符：字母、数字、CJK（其余一律当噪音丢弃）。 */
const KEEP_RE = /[\p{L}\p{N}]/u;

const LINK_RE =
  /(?:https?:\/\/|www\.|[a-z0-9-]{2,}\.[a-z]{2,6}\b)/g;
const SHORT_LINK_RE = /\b(?:t\.cn|url\.cn|dwz\.|suo\.im|bit\.ly|is\.gd)\S*/;
const PHONE_RE = /\b1[3-9]\d{9}\b/;
const ID_CARD_RE = /\b\d{17}[\dxX]\b/;
const CONTACT_NUMBER_RE = /\b\d{5,12}\b/;

/**
 * 把文本归一化成「只有字母数字汉字」的紧凑串，并保留每个字符回原串的下标，
 * 这样命中的位置可以映射回原文（后台展示片段 / 将来做高亮）。
 */
export function normalizeForMatch(input: string): { compact: string; map: number[] } {
  const text = input.normalize('NFKC').toLowerCase().replace(ZERO_WIDTH_RE, '');
  let compact = '';
  const map: number[] = [];
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (!KEEP_RE.test(char)) continue;
    compact += char;
    map.push(index);
  }
  return { compact, map };
}

/** 用于「内容去重」的稳定指纹：归一化后再折叠连续重复字符。 */
export function contentFingerprint(input: string): string {
  const { compact } = normalizeForMatch(input);
  return compact.replace(/(.)\1{2,}/gu, '$1$1');
}

/* ------------------------------------------------------- Aho-Corasick 自动机 */

class WordAutomaton {
  private readonly next: Array<Map<string, number>> = [new Map()];
  private readonly fail: number[] = [0];
  private readonly out: number[][] = [[]];
  private readonly entries: ModerationWord[];

  constructor(entries: ModerationWord[]) {
    this.entries = entries;
    entries.forEach((entry, index) => this.insert(entry.word, index));
    this.buildFallback();
  }

  private insert(word: string, index: number) {
    let node = 0;
    // 按 UTF-16 code unit 插入（与 `search` 的遍历单位一致，避免代理对被拆开）。
    for (let cursor = 0; cursor < word.length; cursor += 1) {
      const char = word[cursor];
      const existing = this.next[node].get(char);
      if (existing === undefined) {
        const created = this.next.length;
        this.next.push(new Map());
        this.fail.push(0);
        this.out.push([]);
        this.next[node].set(char, created);
        node = created;
      } else {
        node = existing;
      }
    }
    this.out[node].push(index);
  }

  /** BFS 构失败指针，并把输出集向上合并（保证一次扫描拿到所有后缀匹配）。 */
  private buildFallback() {
    const queue: number[] = [];
    for (const child of this.next[0].values()) queue.push(child);
    for (let head = 0; head < queue.length; head += 1) {
      const node = queue[head];
      for (const [char, child] of this.next[node]) {
        let fallback = this.fail[node];
        while (fallback !== 0 && !this.next[fallback].has(char)) fallback = this.fail[fallback];
        const target = this.next[fallback].get(char);
        this.fail[child] = target !== undefined && target !== child ? target : 0;
        this.out[child].push(...this.out[this.fail[child]]);
        queue.push(child);
      }
    }
  }

  /** 返回 `[起始下标, 结束下标) + 词条序号`，下标是归一化后的紧凑串位置。 */
  search(compact: string): Array<{ start: number; end: number; entry: number }> {
    const found: Array<{ start: number; end: number; entry: number }> = [];
    let node = 0;
    for (let index = 0; index < compact.length; index += 1) {
      const char = compact[index];
      while (node !== 0 && !this.next[node].has(char)) node = this.fail[node];
      node = this.next[node].get(char) ?? 0;
      for (const entry of this.out[node]) {
        const word = this.entries[entry].word;
        found.push({ start: index - word.length + 1, end: index + 1, entry });
      }
    }
    return found;
  }
}

const AUTOMATON = new WordAutomaton(MODERATION_WORDS);

/** 命中词是否落在良性搭配里（如「你妈妈」「不合群」）。 */
function isBenign(compact: string, word: string, start: number, end: number): boolean {
  const suffix = BENIGN_SUFFIX[word];
  if (suffix && suffix.test(compact.slice(end, end + 4))) return true;
  const prefix = BENIGN_PREFIX[word];
  if (prefix && prefix.test(compact.slice(Math.max(0, start - 2), start))) return true;
  return false;
}

/* ------------------------------------------------------------ 启发式信号 */

function collectSignals(compact: string, raw: string): HeuristicSignal[] {
  const signals: HeuristicSignal[] = [];
  const push = (code: SignalCode, weight: number) => signals.push({ code, weight });
  const lower = raw.normalize('NFKC').toLowerCase();

  const links = lower.match(LINK_RE);
  if (links?.length) {
    push('LINK', 30);
    if (links.length >= 2) push('MANY_LINKS', 30);
  }
  if (SHORT_LINK_RE.test(lower)) push('SHORT_LINK', 20);
  if (PHONE_RE.test(compact)) push('PHONE', 30);
  if (ID_CARD_RE.test(compact)) push('ID_CARD', 40);
  else if (CONTACT_NUMBER_RE.test(compact) && /(qq|群|号|微信|vx|wx|联系|私)/.test(compact)) {
    push('CONTACT_NUMBER', 25);
  }
  if (/(.)\1{6,}/u.test(compact)) push('REPEAT_RUN', 20);
  if (compact.length >= 10 && /^(.{1,5})\1{2,}$/u.test(compact)) push('REPEAT_UNIT', 25);

  const symbols = (raw.match(/[^\p{L}\p{N}\s]/gu) ?? []).length;
  if (raw.length >= 12 && symbols / raw.length > 0.4) push('SYMBOL_HEAVY', 15);

  const shout = (raw.match(/[!！?？~～]{4,}|[A-Z]{12,}/g) ?? []).length;
  if (shout > 0) push('SHOUT', 10);

  if (compact.length < 3 && raw.trim().length > 0) push('TOO_SHORT', 5);

  return signals;
}

/* --------------------------------------------------------------- 主入口 */

export interface ReputationAdjustment {
  /** 机器码 → 分值增减（正数=更可疑）。 */
  code: string;
  delta: number;
}

export interface ScoreOptions {
  reputation?: ReputationAdjustment[];
}

/**
 * 对一段评论做完整检查。
 *
 * @param body 原始评论文本（已过长度校验）
 * @param options.reputation 账号信誉调整项（由 `commentModeration.ts` 依据库内数据生成）
 */
export function inspectText(body: string, options: ScoreOptions = {}): Inspection {
  const { compact } = normalizeForMatch(body);
  const matched = AUTOMATON.search(compact);

  const hits: ModerationHit[] = [];
  const seen = new Set<string>();
  for (const match of matched) {
    const entry = MODERATION_WORDS[match.entry];
    if (seen.has(entry.word)) continue;
    if (isBenign(compact, entry.word, match.start, match.end)) continue;
    seen.add(entry.word);
    hits.push({ word: entry.word, category: entry.category, severity: entry.severity });
  }

  const signals = collectSignals(compact, body);
  const reasons: string[] = [];
  const categories = new Set<ModerationCategory>();

  let score = 0;
  let softScore = 0;
  let hard = false;

  for (const hit of hits) {
    categories.add(hit.category);
    const weight = CATEGORY_WEIGHT[hit.category];
    if (hit.severity === HARD_SEVERITY) {
      hard = true;
      score += 100;
      reasons.push(`WORD_${hit.category.toUpperCase()}_HARD`);
      continue;
    }
    softScore += (hit.severity === 2 ? 25 : 8) * weight;
    reasons.push(`WORD_${hit.category.toUpperCase()}_SOFT`);
  }
  // 轻度命中最多贡献 60 分，避免刷几个轻度词就把人打成「高风险」。
  score += Math.min(60, softScore);

  for (const signal of signals) {
    score += signal.weight;
    reasons.push(signal.code);
    if (signal.code === 'LINK' || signal.code === 'MANY_LINKS' || signal.code === 'CONTACT_NUMBER' || signal.code === 'SHORT_LINK') {
      categories.add('spam');
    }
    if (signal.code === 'PHONE' || signal.code === 'ID_CARD') categories.add('leak');
  }

  for (const adjustment of options.reputation ?? []) {
    score += adjustment.delta;
    reasons.push(adjustment.code);
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  const action: ModerationAction = hard || score >= REJECT_THRESHOLD
    ? 'reject'
    : score >= REVIEW_THRESHOLD
      ? 'review'
      : 'approve';

  return {
    hits,
    signals,
    categories: [...categories],
    score,
    action,
    reasons: [...new Set(reasons)],
  };
}
