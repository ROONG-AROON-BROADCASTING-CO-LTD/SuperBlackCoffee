import { describe, expect, it } from 'vitest';
import { suggestBranchCode } from './branchCode';

describe('suggestBranchCode', () => {
  it('uses the Thai area code before a generic Latin fallback', () => {
    expect(suggestBranchCode('สาขาเชียงใหม่', [])).toBe('CNX');
    expect(suggestBranchCode('Super Black Coffee พิษณุโลก', [])).toBe('PLO');
  });

  it('chooses the next unused suffix case-insensitively', () => {
    expect(suggestBranchCode('Chiang Mai', ['chi', 'CHI-02', 'CHI-03'])).toBe(
      'CHI-04',
    );
  });

  it('falls back safely for blank or generic names', () => {
    expect(suggestBranchCode('  สาขา SBC  ', ['BR'])).toBe('BR-02');
  });
});
