import { checkNameLength, nameKey } from './name-rules';

describe('checkNameLength', () => {
  it('trims and enforces 1 to max characters', () => {
    expect(checkNameLength('  Ann ', 5)).toEqual({ ok: true, value: 'Ann' });
    expect(checkNameLength('   ', 5)).toEqual({ ok: false, error: 'empty' });
    expect(checkNameLength('12345', 5).ok).toBe(true);
    expect(checkNameLength('123456', 5)).toEqual({ ok: false, error: 'too-long' });
  });

  it('counts the trimmed length, not the typed length', () => {
    expect(checkNameLength('  12345  ', 5).ok).toBe(true);
  });
});

describe('nameKey', () => {
  it('ignores case and surrounding spaces and joins parts with one space', () => {
    expect(nameKey(' Boston ')).toBe('boston');
    expect(nameKey(' Boston ', 'BULLDOGS')).toBe('boston bulldogs');
    expect(nameKey('Ann Lee')).toBe(nameKey('  ann lee'));
  });
});
