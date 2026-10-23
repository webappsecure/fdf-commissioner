import { rollOneDie, rollOnTable, rollTwoDice } from './roll';
import { defineTable } from './tables';

const table = defineTable('sample', [
  { range: '11-16', result: 'low' },
  { range: '21-45', result: 'mid' },
  { range: '46-65', result: 'high' },
  { range: '66', result: 'top' },
]);

function scripted(...values: number[]) {
  return () => values.shift() ?? 0;
}

describe('rollOnTable', () => {
  it('rolls, applies the modifier, and looks up the outcome', () => {
    // 0.5 -> 4, 0.5 -> 4: dice 44, +2 in base 6 is 46
    const outcome = rollOnTable(table, {
      random: scripted(0.5, 0.5),
      modifiers: [{ label: 'Primary need', value: 2 }],
    });
    expect(outcome).toEqual({
      ok: true,
      result: {
        kind: '2d6',
        dice: 44,
        modifiers: [{ label: 'Primary need', value: 2 }],
        final: 46,
        table: 'sample',
        outcome: 'high',
        manual: false,
      },
    });
  });

  it('sums modifiers, then clamps', () => {
    const outcome = rollTwoDice({
      random: scripted(0.99, 0.99),
      modifiers: [
        { label: 'a', value: 2 },
        { label: 'b', value: -1 },
        { label: 'c', value: 5 },
      ],
    });
    expect(outcome).toMatchObject({ ok: true, result: { dice: 66, final: 66 } });

    const low = rollTwoDice({
      random: scripted(0, 0.2),
      modifiers: [{ label: 'a', value: -4 }],
    });
    expect(low).toMatchObject({ ok: true, result: { dice: 12, final: 11 } });
  });

  it('uses a manual roll without rolling and flags it', () => {
    const random = jest.fn(() => 0.5);
    const outcome = rollOnTable(table, { manual: '43', random });
    expect(outcome).toMatchObject({
      ok: true,
      result: { dice: 43, final: 43, outcome: 'mid', manual: true },
    });
    expect(random).not.toHaveBeenCalled();
  });

  it('applies modifiers to a manual roll', () => {
    const outcome = rollOnTable(table, { manual: '65', modifiers: [{ label: 'x', value: 1 }] });
    expect(outcome).toMatchObject({ ok: true, result: { dice: 65, final: 66, outcome: 'top', manual: true } });
  });

  it('returns the typed error for invalid manual input and does not roll', () => {
    const random = jest.fn(() => 0.5);
    expect(rollOnTable(table, { manual: '17', random })).toEqual({ ok: false, error: 'out-of-range' });
    expect(rollOnTable(table, { manual: 'x', random })).toEqual({ ok: false, error: 'not-a-roll' });
    expect(rollOnTable(table, { manual: '', random })).toEqual({ ok: false, error: 'empty' });
    expect(random).not.toHaveBeenCalled();
  });
});

describe('rollOneDie', () => {
  it('returns a 1d6 result with no modifiers and no table', () => {
    expect(rollOneDie({ random: scripted(0.5) })).toEqual({
      ok: true,
      result: { kind: '1d6', dice: 4, modifiers: [], final: 4, table: null, outcome: null, manual: false },
    });
  });

  it('accepts a manual die and rejects a bad one', () => {
    expect(rollOneDie({ manual: '6' })).toMatchObject({ ok: true, result: { dice: 6, manual: true } });
    expect(rollOneDie({ manual: '7' })).toEqual({ ok: false, error: 'out-of-range' });
  });
});
