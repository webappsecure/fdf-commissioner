import { LEAGUE_SIZES, structuresFor } from './structures';
import { flipAlignment, layoutFor, parseSlot, teamSlots } from './team-layout';

describe('layoutFor', () => {
  it('gives every size and structure the right number of slots', () => {
    for (const size of LEAGUE_SIZES) {
      for (const option of structuresFor(size)) {
        expect(teamSlots(layoutFor(size, option.id))).toHaveLength(size);
      }
    }
  });

  it('has one unnamed group for a flat league', () => {
    const layout = layoutFor(6, 'flat');
    expect(layout.groups).toEqual([{ divisionIndex: null, conferenceIndex: null, teamCount: 6 }]);
    expect(layout.divisions).toEqual([]);
    expect(layout.conferences).toEqual([]);
  });

  it('splits 12 teams into 3 divisions of 4', () => {
    const layout = layoutFor(12, 'divisions-3');
    expect(layout.groups.map((group) => group.teamCount)).toEqual([4, 4, 4]);
    expect(layout.divisions).toEqual(['Division 1', 'Division 2', 'Division 3']);
    expect(layout.groups.every((group) => group.conferenceIndex === null)).toBe(true);
  });

  it('puts two divisions in each of two conferences', () => {
    const layout = layoutFor(24, 'conferences-2x2');
    expect(layout.conferences).toEqual(['Conference 1', 'Conference 2']);
    expect(layout.groups.map((group) => [group.divisionIndex, group.conferenceIndex, group.teamCount])).toEqual([
      [1, 1, 6],
      [2, 1, 6],
      [3, 2, 6],
      [4, 2, 6],
    ]);
  });
});

describe('flipAlignment', () => {
  it('is 4-3 on heads and 3-4 on tails', () => {
    expect(flipAlignment(() => 0.1)).toBe('4-3');
    expect(flipAlignment(() => 0.5)).toBe('3-4');
    expect(flipAlignment(() => 0.9)).toBe('3-4');
  });
});

describe('parseSlot', () => {
  it('accepts slots inside the league only', () => {
    expect(parseSlot('0', 6)).toBe(0);
    expect(parseSlot('5', 6)).toBe(5);
    for (const bad of ['6', '-1', '1.5', 'x', '', undefined]) expect(parseSlot(bad, 6)).toBeNull();
    expect(parseSlot(['1'], 6)).toBeNull();
  });
});
