import {
  addToRoll,
  isValid2d6,
  ordinalToRoll,
  parseManualRoll,
  roll2d6,
  rollD6,
  rollToOrdinal,
} from './dice';

const ALL_ROLLS = [1, 2, 3, 4, 5, 6].flatMap((tens) => [1, 2, 3, 4, 5, 6].map((ones) => tens * 10 + ones));

describe('base-6 ordinals', () => {
  it('round trips every roll from 11 to 66', () => {
    expect(ALL_ROLLS).toHaveLength(36);
    ALL_ROLLS.forEach((roll, index) => {
      expect(rollToOrdinal(roll)).toBe(index + 1);
      expect(ordinalToRoll(index + 1)).toBe(roll);
    });
  });

  it('only accepts digits 1 to 6', () => {
    expect(isValid2d6(66)).toBe(true);
    [10, 17, 67, 70, 7, 0, 111, 4.5].forEach((value) => expect(isValid2d6(value)).toBe(false));
  });
});

describe('addToRoll', () => {
  it('counts in base 6', () => {
    expect(addToRoll(61, -2)).toBe(55);
    expect(addToRoll(46, 2)).toBe(52);
    expect(addToRoll(16, 1)).toBe(21);
    expect(addToRoll(31, 0)).toBe(31);
  });

  it('clamps to 11 and 66', () => {
    expect(addToRoll(65, 3)).toBe(66);
    expect(addToRoll(12, -5)).toBe(11);
  });
});

describe('rolling', () => {
  it('reads tens then ones from the random source', () => {
    const values = [0.5, 0.9];
    expect(roll2d6(() => values.shift() ?? 0)).toBe(46);
  });

  it('never produces an invalid roll across the random range', () => {
    for (const random of [0, 0.0001, 0.1666, 0.1667, 0.5, 0.8333, 0.99999999, 1]) {
      expect(isValid2d6(roll2d6(() => random))).toBe(true);
      const die = rollD6(() => random);
      expect(die).toBeGreaterThanOrEqual(1);
      expect(die).toBeLessThanOrEqual(6);
    }
  });
});

describe('parseManualRoll', () => {
  it('accepts valid rolls, ignoring surrounding space', () => {
    expect(parseManualRoll('43', '2d6')).toEqual({ ok: true, roll: 43 });
    expect(parseManualRoll(' 66 ', '2d6')).toEqual({ ok: true, roll: 66 });
    expect(parseManualRoll('4', '1d6')).toEqual({ ok: true, roll: 4 });
  });

  it('rejects anything else with a stable error code', () => {
    expect(parseManualRoll('', '2d6')).toEqual({ ok: false, error: 'empty' });
    expect(parseManualRoll('   ', '1d6')).toEqual({ ok: false, error: 'empty' });
    ['7', '4a', '123', '4.5'].forEach((text) =>
      expect(parseManualRoll(text, '2d6')).toEqual({ ok: false, error: 'not-a-roll' }),
    );
    ['07', '17', '67', '10'].forEach((text) =>
      expect(parseManualRoll(text, '2d6')).toEqual({ ok: false, error: 'out-of-range' }),
    );
    expect(parseManualRoll('7', '1d6')).toEqual({ ok: false, error: 'out-of-range' });
    expect(parseManualRoll('0', '1d6')).toEqual({ ok: false, error: 'out-of-range' });
    expect(parseManualRoll('43', '1d6')).toEqual({ ok: false, error: 'not-a-roll' });
  });
});
