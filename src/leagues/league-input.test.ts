import { MAX_LEAGUE_NAME_LENGTH, parseLeagueId, validateLeagueName } from './league-input';

describe('validateLeagueName', () => {
  it('trims surrounding space', () => {
    expect(validateLeagueName('  Metro League ')).toEqual({ ok: true, name: 'Metro League' });
  });

  it('rejects empty and whitespace-only names', () => {
    expect(validateLeagueName('')).toEqual({ ok: false, error: 'empty' });
    expect(validateLeagueName('   ')).toEqual({ ok: false, error: 'empty' });
  });

  it('allows the limit and rejects one past it', () => {
    expect(validateLeagueName('a'.repeat(MAX_LEAGUE_NAME_LENGTH)).ok).toBe(true);
    expect(validateLeagueName('a'.repeat(MAX_LEAGUE_NAME_LENGTH + 1))).toEqual({ ok: false, error: 'too-long' });
  });

  it('measures length after trimming', () => {
    expect(validateLeagueName(` ${'a'.repeat(MAX_LEAGUE_NAME_LENGTH)} `).ok).toBe(true);
  });
});

describe('parseLeagueId', () => {
  it('accepts positive whole numbers', () => {
    expect(parseLeagueId('7')).toBe(7);
    expect(parseLeagueId('120')).toBe(120);
  });

  it('rejects anything else', () => {
    ['new', '0', '-1', '1.5', '007', '', '12abc', '99999999999'].forEach((raw) => expect(parseLeagueId(raw)).toBeNull());
    expect(parseLeagueId(undefined)).toBeNull();
    expect(parseLeagueId(['1', '2'])).toBeNull();
  });
});
