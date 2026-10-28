import { createPlayer, createPlayerDraft, type PlayerDraft } from '@/rules/player-creation';
import { PLAYER_NAMES } from './player-name-list';
import { BACKUP_PLAYERS, checkRosterPlans, findRosterProblem, planTeamRoster, rosterSlots, tablePositionFor, type PlannedPlayer, type RosterPlan } from './roster-plan';
import type { Alignment } from './team-layout';

function seeded(seed = 11) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
}

const count = (slots: { position: string }[], position: string) => slots.filter((slot) => slot.position === position).length;

describe('rosterSlots', () => {
  it('lists the 25 starters in order for a 4-3', () => {
    expect(rosterSlots('4-3').map((slot) => slot.slot)).toEqual([
      'QB1', 'RB1', 'WR1', 'WR2', 'WR3', 'TE1', 'OL1', 'OL2', 'OL3', 'OL4', 'OL5',
      'DT1', 'DT2', 'DE1', 'DE2', 'LB1', 'LB2', 'LB3',
      'CB1', 'CB2', 'FS1', 'SS1', 'PR1', 'KR1', 'K1',
    ]);
  });

  it('lists the 25 starters in order for a 3-4', () => {
    expect(rosterSlots('3-4').map((slot) => slot.slot)).toEqual([
      'QB1', 'RB1', 'WR1', 'WR2', 'WR3', 'TE1', 'OL1', 'OL2', 'OL3', 'OL4', 'OL5',
      'DT1', 'DE1', 'DE2', 'LB1', 'LB2', 'LB3', 'LB4',
      'CB1', 'CB2', 'FS1', 'SS1', 'PR1', 'KR1', 'K1',
    ]);
  });

  it.each(['4-3', '3-4'] as const)('%s has 25 starters, 3 or 4 DL and 3 or 4 LB and no punter', (alignment) => {
    const slots = rosterSlots(alignment);
    expect(slots).toHaveLength(25);
    expect(count(slots, 'DT') + count(slots, 'DE')).toBe(alignment === '4-3' ? 4 : 3);
    expect(count(slots, 'LB')).toBe(alignment === '4-3' ? 3 : 4);
    expect(count(slots, 'P')).toBe(0);
  });
});

describe('tablePositionFor', () => {
  it('rolls DT and DE on the DL tables and leaves the rest alone', () => {
    expect(tablePositionFor('DT')).toBe('DL');
    expect(tablePositionFor('DE')).toBe('DL');
    expect(tablePositionFor('LB')).toBe('LB');
    expect(tablePositionFor('K')).toBe('K');
  });
});

describe('planTeamRoster', () => {
  it.each(['4-3', '3-4'] as const)('plans a complete %s roster that passes the checks', (alignment) => {
    const players = planTeamRoster(alignment, [], seeded());
    expect(players.map((player) => player.slot)).toEqual(rosterSlots(alignment).map((slot) => slot.slot));
    expect(findRosterProblem(alignment, players)).toBeNull();
    for (const player of players) {
      expect(player.draft.position).toBe(tablePositionFor(player.position));
      expect(player.draft.age?.table).toBe(`${player.draft.position} Age`);
    }
  });

  it('gives every player a different name and avoids the taken names', () => {
    const taken = PLAYER_NAMES.slice(0, 40);
    const players = planTeamRoster('4-3', taken.map((name) => name.toUpperCase()), seeded());
    const names = players.map((player) => player.name);
    expect(new Set(names.map((name) => name.toLowerCase())).size).toBe(25);
    expect(names.filter((name) => taken.includes(name))).toEqual([]);
  });

  it('is repeatable with a seeded random', () => {
    expect(planTeamRoster('3-4', [], seeded(5))).toEqual(planTeamRoster('3-4', [], seeded(5)));
  });

  it('fails clearly when the names run out', () => {
    expect(() => planTeamRoster('4-3', PLAYER_NAMES.slice(0, PLAYER_NAMES.length - 3))).toThrow('Every player name is already used');
  });
});

describe('findRosterProblem', () => {
  const roster = (alignment: Alignment = '4-3') => planTeamRoster(alignment, [], seeded());
  const replace = (players: PlannedPlayer[], index: number, change: Partial<PlannedPlayer>) =>
    players.map((player, position) => (position === index ? { ...player, ...change } : player));

  it('accepts a planned roster', () => {
    expect(findRosterProblem('4-3', roster())).toBeNull();
  });

  it('rejects a roster for the other alignment', () => {
    expect(findRosterProblem('3-4', roster('4-3'))).not.toBeNull();
  });

  it('rejects a missing or extra player', () => {
    const players = roster();
    expect(findRosterProblem('4-3', players.slice(1))).toBe('wrong player count');
    expect(findRosterProblem('4-3', [...players, players[0]])).toBe('wrong player count');
  });

  it('rejects a wrong slot or position', () => {
    const players = roster();
    expect(findRosterProblem('4-3', replace(players, 2, { slot: 'WR9' }))).toBe('wrong slot');
    expect(findRosterProblem('4-3', replace(players, 2, { position: 'TE' }))).toBe('wrong slot');
  });

  it('rejects a player rolled on the wrong tables', () => {
    expect(findRosterProblem('4-3', replace(roster(), 0, { draft: createPlayer('RB', seeded()) }))).toBe('wrong tables');
  });

  it('rejects an incomplete player', () => {
    expect(findRosterProblem('4-3', replace(roster(), 0, { draft: createPlayerDraft('QB') }))).toBe('incomplete player');
  });

  it('rejects a blank, long, untrimmed or repeated name', () => {
    const players = roster();
    expect(findRosterProblem('4-3', replace(players, 0, { name: '  ' }))).toBe('invalid player name');
    expect(findRosterProblem('4-3', replace(players, 0, { name: 'x'.repeat(41) }))).toBe('invalid player name');
    expect(findRosterProblem('4-3', replace(players, 0, { name: ` ${players[0].name}` }))).toBe('invalid player name');
    expect(findRosterProblem('4-3', replace(players, 1, { name: players[0].name.toUpperCase() }))).toBe('duplicate player name');
  });
});

describe('BACKUP_PLAYERS (guide 2.5)', () => {
  it('has the guide ratings for offense and defense', () => {
    const expected = { QB: [0, 1], RB: [0, 1], WR: [1, 0], TE: [0, 1], OL: [0, 1], DT: [0, 1], DE: [1, 0], LB: [0, 1], CB: [1, 0], SS: [0, 1], FS: [1, 0] } as const;
    for (const [position, [pass, run]] of Object.entries(expected)) {
      expect(BACKUP_PLAYERS[position as keyof typeof BACKUP_PLAYERS]).toEqual({ rating: { pass, run } });
    }
  });

  it('has D grades for special teams, with the kicker ranges', () => {
    expect(BACKUP_PLAYERS.K).toEqual({ grade: 'D', fieldGoal: '11-51', extraPoint: '11-61' });
    expect(BACKUP_PLAYERS.KR).toEqual({ grade: 'D' });
    expect(BACKUP_PLAYERS.PR).toEqual({ grade: 'D' });
  });
});

describe('findRosterProblem with null outcomes', () => {
  it('rejects a player whose roll found no result', () => {
    const players = planTeamRoster('4-3', [], seeded());
    const draft: PlayerDraft = { ...players[0].draft, age: { ...players[0].draft.age!, outcome: null } };
    expect(findRosterProblem('4-3', [{ ...players[0], draft }, ...players.slice(1)])).toBe('incomplete player');
  });
});

describe('checkRosterPlans', () => {
  const random = seeded(3);
  const teams = [
    { id: 1, alignment: null },
    { id: 2, alignment: '3-4' as Alignment | null },
  ];
  const good = (): RosterPlan[] => {
    const first = planTeamRoster('4-3', [], random);
    const second = planTeamRoster('3-4', first.map((player) => player.name), random);
    return [
      { teamId: 1, alignment: '4-3', players: first },
      { teamId: 2, alignment: '3-4', players: second },
    ];
  };

  it('accepts plans that cover every team once', () => {
    expect(checkRosterPlans(good(), teams)).toBeNull();
    expect(checkRosterPlans(good().reverse(), teams)).toBeNull();
  });

  it('rejects a missing, repeated or foreign team', () => {
    const [one, two] = good();
    expect(checkRosterPlans([one], teams)).toEqual({ code: 'wrong-teams' });
    expect(checkRosterPlans([one, one], teams)).toEqual({ code: 'wrong-teams' });
    expect(checkRosterPlans([one, { ...two, teamId: 9 }], teams)).toEqual({ code: 'wrong-teams' });
    expect(checkRosterPlans([], teams)).toEqual({ code: 'wrong-teams' });
  });

  it('keeps a stored alignment and rejects a plan that changes it', () => {
    const [one, two] = good();
    expect(checkRosterPlans([one, { ...two, alignment: '4-3' }], teams)).toEqual({ code: 'alignment-conflict' });
    expect(checkRosterPlans([one, two], [{ id: 1, alignment: '4-3' }, teams[1]])).toBeNull();
    expect(checkRosterPlans([one, two], [{ id: 1, alignment: '3-4' }, teams[1]])).toEqual({ code: 'alignment-conflict' });
  });

  it('rejects an invalid roster with the reason', () => {
    const [one, two] = good();
    expect(checkRosterPlans([{ ...one, players: one.players.slice(1) }, two], teams)).toEqual({
      code: 'invalid-roster',
      detail: 'wrong player count',
    });
  });

  it('rejects a name used by two teams, ignoring case', () => {
    const [one, two] = good();
    const players = two.players.map((player, index) => (index === 0 ? { ...player, name: one.players[5].name.toUpperCase() } : player));
    expect(checkRosterPlans([one, { ...two, players }], teams)).toEqual({ code: 'duplicate-name' });
  });

  it('reports problems in order: teams, then alignment, then roster, then names', () => {
    const [one, two] = good();
    const broken = { ...two, alignment: '4-3' as const, players: two.players.slice(1) };
    expect(checkRosterPlans([one], teams)).toEqual({ code: 'wrong-teams' });
    expect(checkRosterPlans([one, broken], teams)).toEqual({ code: 'alignment-conflict' });
    expect(checkRosterPlans([one, { ...two, players: two.players.slice(1) }], teams)).toEqual({
      code: 'invalid-roster',
      detail: 'wrong player count',
    });
  });
});
