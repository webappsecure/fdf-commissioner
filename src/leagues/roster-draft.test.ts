import { findRosterDraftProblem, rollMissingRosters, rollTeamRoster } from './roster-draft';

function seeded(seed: number) {
  let state = seed;
  return () => {
    state = (state * 16807) % 2147483647;
    return state / 2147483647;
  };
}

const teams = [
  { id: 1, alignment: '3-4' as const },
  { id: 2, alignment: null },
  { id: 3, alignment: '4-3' as const },
];

const names = (plans: ReturnType<typeof rollMissingRosters>, id: number) => plans[id].players.map((p) => p.name);

describe('rollTeamRoster', () => {
  it('keeps a stored alignment and flips an unset one', () => {
    const plans = rollTeamRoster(teams, {}, 1, seeded(3));
    expect(plans[1].alignment).toBe('3-4');
    const flipped = new Set<string>();
    for (const first of [0.1, 0.9]) {
      const rest = seeded(7);
      let called = false;
      const random = () => (called ? rest() : ((called = true), first));
      flipped.add(rollTeamRoster(teams, {}, 2, random)[2].alignment);
    }
    expect(flipped).toEqual(new Set(['4-3', '3-4']));
  });

  it('rolls 25 players with unique names', () => {
    const plans = rollTeamRoster(teams, {}, 3, seeded(5));
    expect(plans[3].players).toHaveLength(25);
    expect(new Set(names(plans, 3).map((n) => n.toLowerCase())).size).toBe(25);
  });

  it('never repeats a name used by another team', () => {
    const random = seeded(9);
    let plans = rollTeamRoster(teams, {}, 1, random);
    plans = rollTeamRoster(teams, plans, 3, random);
    const other = new Set(names(plans, 1).map((n) => n.toLowerCase()));
    expect(names(plans, 3).some((n) => other.has(n.toLowerCase()))).toBe(false);
  });

  it('replaces only the rerolled team', () => {
    const random = seeded(11);
    const first = rollMissingRosters(teams, {}, random);
    const again = rollTeamRoster(teams, first, 2, random);
    expect(again[1]).toBe(first[1]);
    expect(again[3]).toBe(first[3]);
    expect(again[2]).not.toBe(first[2]);
    expect(findRosterDraftProblem(teams, again)).toBeNull();
  });

  it('throws for an unknown team', () => {
    expect(() => rollTeamRoster(teams, {}, 99)).toThrow('Unknown team');
  });
});

describe('rollMissingRosters', () => {
  it('leaves rolled teams alone and fills the rest', () => {
    const random = seeded(2);
    const one = rollTeamRoster(teams, {}, 3, random);
    const all = rollMissingRosters(teams, one, random);
    expect(all[3]).toBe(one[3]);
    expect(Object.keys(all).sort()).toEqual(['1', '2', '3']);
  });
});

describe('findRosterDraftProblem', () => {
  it('reports an unrolled team and passes a complete set', () => {
    const random = seeded(4);
    const partial = rollTeamRoster(teams, {}, 1, random);
    expect(findRosterDraftProblem(teams, partial)).toBe('unrolled teams');
    expect(findRosterDraftProblem(teams, rollMissingRosters(teams, partial, random))).toBeNull();
  });
});
