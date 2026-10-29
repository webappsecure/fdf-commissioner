import { ELECTRIC_TABLES, EXTRA_POINT_TABLES, FIELD_GOAL_TABLES, rangeText } from './special-teams-tables';
import { lookup } from './tables';

const grades = ['A', 'B', 'C', 'D'] as const;

describe('special teams tables', () => {
  it('cover every roll for every grade', () => {
    for (const grade of grades) {
      for (const table of [ELECTRIC_TABLES[grade], FIELD_GOAL_TABLES[grade], EXTRA_POINT_TABLES[grade]]) {
        expect(table.rows.length).toBeGreaterThan(0);
      }
    }
  });

  it('read the ELECTRIC edges from guide 5.3.1', () => {
    expect(lookup(ELECTRIC_TABLES.A, 21)).toBe('none');
    expect(lookup(ELECTRIC_TABLES.A, 22)).toBe('semi');
    expect(lookup(ELECTRIC_TABLES.A, 42)).toBe('full');
    expect(lookup(ELECTRIC_TABLES.D, 65)).toBe('semi');
    expect(lookup(ELECTRIC_TABLES.D, 66)).toBe('full');
    expect(lookup(ELECTRIC_TABLES.C, 61)).toBe('semi');
    expect(lookup(ELECTRIC_TABLES.C, 62)).toBe('full');
    expect(lookup(ELECTRIC_TABLES.B, 31)).toBe('none');
    expect(lookup(ELECTRIC_TABLES.B, 53)).toBe('full');
  });

  it('read the FG range edges from guide 5.3.2', () => {
    expect(lookup(FIELD_GOAL_TABLES.A, 11)).toBe(62);
    expect(lookup(FIELD_GOAL_TABLES.A, 66)).toBe(66);
    expect(lookup(FIELD_GOAL_TABLES.B, 16)).toBe(61);
    expect(lookup(FIELD_GOAL_TABLES.C, 21)).toBe(55);
    expect(lookup(FIELD_GOAL_TABLES.D, 11)).toBe(46);
    expect(lookup(FIELD_GOAL_TABLES.D, 12)).toBe(51);
    expect(lookup(FIELD_GOAL_TABLES.D, 51)).toBe(55);
    expect(lookup(FIELD_GOAL_TABLES.D, 66)).toBe(56);
  });

  it('read the XP range edges from guide 5.3.3', () => {
    expect(lookup(EXTRA_POINT_TABLES.A, 11)).toBe(63);
    expect(lookup(EXTRA_POINT_TABLES.A, 24)).toBe(66);
    expect(lookup(EXTRA_POINT_TABLES.B, 21)).toBe(63);
    expect(lookup(EXTRA_POINT_TABLES.C, 51)).toBe(64);
    expect(lookup(EXTRA_POINT_TABLES.D, 26)).toBe(61);
    expect(lookup(EXTRA_POINT_TABLES.D, 66)).toBe(64);
  });

  it('prints ranges as the guide does', () => {
    expect(rangeText(62)).toBe('11-62');
  });
});
