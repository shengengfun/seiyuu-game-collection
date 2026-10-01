import { describe, expect, it } from 'vitest';
import { contentFingerprint, inspectText, normalizeForMatch } from './engine';

describe('moderation normalization', () => {
  it('folds full-width characters, zero-width characters and separators away', () => {
    expect(normalizeForMatch('加　微\u200b信').compact).toBe('加微信');
    expect(normalizeForMatch('ＡＢＣ').compact).toBe('abc');
    expect(normalizeForMatch('傻*逼').compact).toBe('傻逼');
  });

  it('produces the same fingerprint for obfuscated duplicates', () => {
    const a = contentFingerprint('好喜欢她的声音！！！');
    const b = contentFingerprint('好喜欢她的声音!!!');
    expect(a).toBe(b);
  });
});

describe('moderation decision', () => {
  it('auto-approves a normal comment', () => {
    const result = inspectText('她的声线在这部作品里特别合适，期待新曲。');
    expect(result.action).toBe('approve');
    expect(result.score).toBeLessThan(40);
    expect(result.hits).toHaveLength(0);
  });

  it('hard-rejects abusive words even when obfuscated', () => {
    const result = inspectText('傻 逼 一个');
    expect(result.action).toBe('reject');
    expect(result.categories).toContain('abuse');
    expect(result.reasons).toContain('WORD_ABUSE_HARD');
  });

  it('does not flag benign compounds around guarded words', () => {
    const benign = [
      '你妈妈也很喜欢这位声优',
      '今日你们都在吗',
      '群里交流氛围很好',
      '她在《调教咖啡厅》里的表现很棒',
      '不合群也没关系',
    ];
    for (const body of benign) {
      const result = inspectText(body);
      expect(result.action, body).toBe('approve');
    }
  });

  it('rejects off-site contact bait', () => {
    const result = inspectText('需要资源的加微信 13800001111');
    expect(result.action).toBe('reject');
    expect(result.categories).toContain('spam');
    expect(result.reasons).toContain('PHONE');
  });

  it('sends link-only spam to manual review instead of rejecting it outright', () => {
    const result = inspectText('详情见 https://example.com/page');
    expect(result.action).toBe('review');
    expect(result.categories).toContain('spam');
  });

  it('flags repeated-character flooding', () => {
    const result = inspectText('啊啊啊啊啊啊啊啊啊啊');
    expect(result.signals.map((signal) => signal.code)).toContain('REPEAT_RUN');
  });

  it('applies reputation adjustments (positive and negative)', () => {
    const body = '这个角色配得非常有层次感';
    const trusted = inspectText(body, {
      reputation: [{ code: 'REP_TRUSTED_AUTHOR', delta: -12 }],
    });
    const flagged = inspectText(body, {
      reputation: [{ code: 'DUPLICATE_CONTENT', delta: 40 }],
    });
    expect(trusted.score).toBeLessThan(flagged.score);
    expect(flagged.action).toBe('review');
  });

  it('clamps the score into 0~100', () => {
    const result = inspectText('傻逼 '.repeat(20));
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.score).toBeGreaterThanOrEqual(0);
  });
});
