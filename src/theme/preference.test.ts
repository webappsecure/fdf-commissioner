import { parsePreference } from './preference';

describe('parsePreference', () => {
  it('keeps the two forced schemes', () => {
    expect(parsePreference('light')).toBe('light');
    expect(parsePreference('dark')).toBe('dark');
  });

  it('falls back to system for missing or unrecognized values', () => {
    expect(parsePreference(null)).toBe('system');
    expect(parsePreference('')).toBe('system');
    expect(parsePreference('sepia')).toBe('system');
  });
});
