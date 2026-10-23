import { describeLeague, isValidStructure, LEAGUE_SIZES, structuresFor } from './structures';

describe('structuresFor', () => {
  it('matches the supported structures in the overview table', () => {
    const ids = (size: (typeof LEAGUE_SIZES)[number]) => structuresFor(size).map((option) => option.id);
    expect(ids(6)).toEqual(['flat']);
    expect(ids(8)).toEqual(['flat', 'divisions-2']);
    expect(ids(10)).toEqual(['flat', 'divisions-2']);
    expect(ids(12)).toEqual(['flat', 'divisions-2', 'divisions-3']);
    expect(ids(16)).toEqual(['flat', 'divisions-2', 'conferences-2x2']);
    expect(ids(20)).toEqual(['conferences-2x2']);
    expect(ids(24)).toEqual(['conferences-2x2']);
  });

  it('labels divisions with their team counts', () => {
    const labels = (size: (typeof LEAGUE_SIZES)[number]) => structuresFor(size).map((option) => option.label);
    expect(labels(12)).toEqual(['Flat', '2 divisions of 6', '3 divisions of 4']);
    expect(labels(10)).toContain('2 divisions of 5');
    expect(labels(16)).toContain('2 conferences of two 4-team divisions');
    expect(labels(20)).toEqual(['2 conferences of two 5-team divisions']);
    expect(labels(24)).toEqual(['2 conferences of two 6-team divisions']);
  });
});

describe('isValidStructure', () => {
  it('accepts a structure that belongs to the size', () => {
    expect(isValidStructure(12, 'divisions-3')).toBe(true);
    expect(isValidStructure(24, 'conferences-2x2')).toBe(true);
  });

  it('rejects a structure from another size, an unknown id, and an unsupported size', () => {
    expect(isValidStructure(6, 'divisions-2')).toBe(false);
    expect(isValidStructure(10, 'divisions-3')).toBe(false);
    expect(isValidStructure(20, 'flat')).toBe(false);
    expect(isValidStructure(12, 'nope')).toBe(false);
    expect(isValidStructure(14, 'flat')).toBe(false);
    expect(isValidStructure('12', 'flat')).toBe(false);
  });
});

describe('describeLeague', () => {
  it('summarizes size and structure', () => {
    expect(describeLeague(6, 'flat')).toBe('6 teams, flat');
    expect(describeLeague(12, 'divisions-3')).toBe('12 teams, 3 divisions');
    expect(describeLeague(16, 'conferences-2x2')).toBe('16 teams, 2 conferences');
  });
});
