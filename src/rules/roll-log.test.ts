import { rollOneDie, rollOnTable } from './roll';
import { recordRoll, type RollLogEntry, type RollLogStore } from './roll-log';
import { defineTable } from './tables';

function memoryStore() {
  const entries: RollLogEntry[] = [];
  const store: RollLogStore = {
    async append(entry) {
      entries.push(entry);
      return entries.length;
    },
  };
  return { store, entries };
}

const table = defineTable('sample', [
  { range: '11-35', result: { label: 'low' } },
  { range: '36-66', result: { label: 'high' } },
]);
const fixedNow = () => new Date('2026-10-23T12:00:00.000Z');

describe('recordRoll', () => {
  it('stores one entry with the exact result fields', async () => {
    const { store, entries } = memoryStore();
    const outcome = rollOnTable(table, {
      manual: '52',
      modifiers: [{ label: 'Draft', value: -1 }],
    });
    if (!outcome.ok) throw new Error('expected a roll');

    const id = await recordRoll(store, outcome.result, { team: 7 }, fixedNow);

    expect(id).toBe(1);
    expect(entries).toEqual([
      {
        createdAt: '2026-10-23T12:00:00.000Z',
        kind: '2d6',
        tableName: 'sample',
        dice: 52,
        modifiers: [{ label: 'Draft', value: -1 }],
        finalRoll: 51,
        outcome: { label: 'high' },
        manual: true,
        context: { team: 7 },
      },
    ]);
  });

  it('logs a bare 1d6 roll with no table, no outcome, and null context', async () => {
    const { store, entries } = memoryStore();
    const outcome = rollOneDie({ random: () => 0.5 });
    if (!outcome.ok) throw new Error('expected a roll');

    await recordRoll(store, outcome.result, undefined, fixedNow);

    expect(entries[0]).toMatchObject({
      kind: '1d6',
      tableName: null,
      dice: 4,
      finalRoll: 4,
      outcome: null,
      manual: false,
      context: null,
    });
  });

  it('appends one entry per roll', async () => {
    const { store, entries } = memoryStore();
    const first = rollOneDie({ manual: '2' });
    const second = rollOneDie({ manual: '3' });
    if (!first.ok || !second.ok) throw new Error('expected rolls');

    expect(await recordRoll(store, first.result)).toBe(1);
    expect(await recordRoll(store, second.result)).toBe(2);
    expect(entries).toHaveLength(2);
  });
});
