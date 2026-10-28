import { COACH_NAMES } from './coach-name-list';
import { nameKey } from './name-rules';
import { PLAYER_NAMES } from './player-name-list';
import { pickPlayerName } from './player-names';

describe('PLAYER_NAMES', () => {
  it('has 10,000 trimmed names of 1 to 40 characters', () => {
    expect(PLAYER_NAMES).toHaveLength(10000);
    for (const name of PLAYER_NAMES) {
      expect(name).toBe(name.trim());
      expect(name.length).toBeGreaterThanOrEqual(1);
      expect(name.length).toBeLessThanOrEqual(40);
    }
  });

  it('has no repeats ignoring case, and shares none with the coach list', () => {
    const keys = new Set(PLAYER_NAMES.map((name) => nameKey(name)));
    expect(keys.size).toBe(PLAYER_NAMES.length);
    expect(COACH_NAMES.filter((name) => keys.has(nameKey(name)))).toEqual([]);
  });
});

describe('pickPlayerName', () => {
  it('is deterministic with a seeded random', () => {
    expect(pickPlayerName([], () => 0)).toBe(PLAYER_NAMES[0]);
    expect(pickPlayerName([], () => 0.9999999)).toBe(PLAYER_NAMES[PLAYER_NAMES.length - 1]);
  });

  it('skips used names, ignoring case and spacing', () => {
    expect(pickPlayerName([` ${PLAYER_NAMES[0].toUpperCase()} `], () => 0)).toBe(PLAYER_NAMES[1]);
    expect(pickPlayerName(new Set([PLAYER_NAMES[0]]), () => 0)).toBe(PLAYER_NAMES[1]);
  });

  it('skips a run of used names and wraps around the end of the list', () => {
    expect(pickPlayerName(PLAYER_NAMES.slice(0, 3), () => 0)).toBe(PLAYER_NAMES[3]);
    const last = PLAYER_NAMES.length - 1;
    expect(pickPlayerName([PLAYER_NAMES[last], PLAYER_NAMES[last - 1]], () => 0.9999999)).toBe(PLAYER_NAMES[0]);
  });

  it('finds the only unused name wherever it is', () => {
    const open = 4321;
    const used = PLAYER_NAMES.filter((_, index) => index !== open);
    expect(pickPlayerName(used, () => 0)).toBe(PLAYER_NAMES[open]);
    expect(pickPlayerName(used, () => 0.9999999)).toBe(PLAYER_NAMES[open]);
  });

  it('returns null when every name is used', () => {
    expect(pickPlayerName(PLAYER_NAMES)).toBeNull();
  });
});
