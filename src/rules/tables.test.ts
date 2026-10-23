import { defineTable, findTableIssues, lookup } from './tables';

const full = [
  { range: '11-16', result: 'a' },
  { range: '21-45', result: 'b' },
  { range: '46', result: 'c' },
  { range: '51-65', result: 'd' },
  { range: '66', result: 'e' },
];

describe('lookup', () => {
  const table = defineTable('sample', full);

  it('finds rows at their first, last, and boundary rolls', () => {
    expect(lookup(table, 11)).toBe('a');
    expect(lookup(table, 16)).toBe('a');
    expect(lookup(table, 21)).toBe('b');
    expect(lookup(table, 45)).toBe('b');
    expect(lookup(table, 46)).toBe('c');
    expect(lookup(table, 51)).toBe('d');
    expect(lookup(table, 65)).toBe('d');
    expect(lookup(table, 66)).toBe('e');
  });

  it('rejects rolls that are not 2d6 rolls', () => {
    expect(() => lookup(table, 17)).toThrow('not a valid 2d6 roll');
  });
});

describe('findTableIssues', () => {
  it('finds nothing in a table that covers 11 to 66 once', () => {
    expect(findTableIssues(full)).toEqual([]);
  });

  it('reports a gap with its span', () => {
    const issues = findTableIssues(full.filter((row) => row.range !== '46'));
    expect(issues).toEqual([expect.objectContaining({ kind: 'gap', range: '46' })]);
  });

  it('reports an overlap with its span', () => {
    const issues = findTableIssues([...full.slice(0, 1), { range: '16-26', result: 'x' }, ...full.slice(1)]);
    expect(issues).toEqual([
      expect.objectContaining({ kind: 'overlap', range: '16-26' }),
    ]);
  });

  it('reports a reversed range', () => {
    const issues = findTableIssues([{ range: '45-21', result: 'x' }, ...full]);
    expect(issues).toContainEqual(expect.objectContaining({ kind: 'reversed', range: '45-21' }));
  });

  it('reports digits outside 1 to 6 and rolls outside 11 to 66', () => {
    for (const range of ['10-16', '17', '60-66', '67', '1-6', 'abc']) {
      expect(findTableIssues([{ range, result: 'x' }, ...full])).toContainEqual(
        expect.objectContaining({ kind: 'invalid-range', range }),
      );
    }
  });
});

describe('defineTable', () => {
  it('throws with the table name and the offending range', () => {
    expect(() => defineTable('Coach age', [{ range: '11-16', result: 1 }])).toThrow(
      /Table "Coach age" is invalid: gap 21-66/,
    );
  });
});
