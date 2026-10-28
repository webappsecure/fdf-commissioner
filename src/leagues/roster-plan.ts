import type { RandomFn } from '@/rules/dice';
import { createPlayer, isPlayerComplete, type PlayerDraft } from '@/rules/player-creation';
import type { PlayerGrade, PlayerPosition, PlayerRating } from '@/rules/player-tables';

import { checkNameLength, nameKey } from './name-rules';
import { pickPlayerName } from './player-names';
import type { Alignment } from './team-layout';

/** The 14 positions a roster slot can have. DT and DE both roll on the DL tables. */
export type PlayerSlotPosition = 'QB' | 'RB' | 'WR' | 'TE' | 'OL' | 'DT' | 'DE' | 'LB' | 'CB' | 'FS' | 'SS' | 'K' | 'KR' | 'PR';

export type RosterSlot = { slot: string; position: PlayerSlotPosition };

export type PlannedPlayer = { slot: string; position: PlayerSlotPosition; name: string; draft: PlayerDraft };

export type RosterPlan = { teamId: number; alignment: Alignment; players: PlannedPlayer[] };

export const MAX_PLAYER_NAME_LENGTH = 40;

const OFFENSE: [PlayerSlotPosition, number][] = [['QB', 1], ['RB', 1], ['WR', 3], ['TE', 1], ['OL', 5]];
const BACK_END: [PlayerSlotPosition, number][] = [['CB', 2], ['FS', 1], ['SS', 1], ['PR', 1], ['KR', 1], ['K', 1]];
const DEFENSE_LINE: Record<Alignment, [PlayerSlotPosition, number][]> = {
  '4-3': [['DT', 2], ['DE', 2], ['LB', 3]],
  '3-4': [['DT', 1], ['DE', 2], ['LB', 4]],
};

/** The 25 starters in insert and display order, for example `WR2`. */
export function rosterSlots(alignment: Alignment): RosterSlot[] {
  return [...OFFENSE, ...DEFENSE_LINE[alignment], ...BACK_END].flatMap(([position, count]) =>
    Array.from({ length: count }, (_, index) => ({ slot: `${position}${index + 1}`, position })),
  );
}

/** The creation tables a slot's player is rolled on. */
export function tablePositionFor(position: PlayerSlotPosition): PlayerPosition {
  return position === 'DT' || position === 'DE' ? 'DL' : position;
}

/**
 * Rolls a whole team with dice, in slot order. Names are drawn from the player list and avoid `takenNames`
 * (names used by earlier teams and stored players) and each other. Typed rolls build on the same player steps.
 */
export function planTeamRoster(alignment: Alignment, takenNames: Iterable<string>, random?: RandomFn): PlannedPlayer[] {
  const taken = new Set<string>(takenNames);
  return rosterSlots(alignment).map(({ slot, position }) => {
    const name = pickPlayerName(taken, random);
    if (name === null) throw new Error('Every player name is already used');
    taken.add(name);
    return { slot, position, name, draft: createPlayer(tablePositionFor(position), random) };
  });
}

/** What is wrong with a roster that is about to be saved, or null when it can be saved. */
export function findRosterProblem(alignment: Alignment, players: readonly PlannedPlayer[]): string | null {
  const slots = rosterSlots(alignment);
  if (players.length !== slots.length) return 'wrong player count';
  const names = new Set<string>();
  for (let index = 0; index < slots.length; index++) {
    const player = players[index];
    if (player.slot !== slots[index].slot || player.position !== slots[index].position) return 'wrong slot';
    if (player.draft.position !== tablePositionFor(player.position)) return 'wrong tables';
    if (!isPlayerComplete(player.draft)) return 'incomplete player';
    const checked = checkNameLength(player.name, MAX_PLAYER_NAME_LENGTH);
    if (!checked.ok || checked.value !== player.name) return 'invalid player name';
    if (names.has(nameKey(player.name))) return 'duplicate player name';
    names.add(nameKey(player.name));
  }
  return null;
}

export type RosterPlanProblem = {
  code: 'wrong-teams' | 'alignment-conflict' | 'invalid-roster' | 'duplicate-name';
  detail?: string;
};

/**
 * What is wrong with the plans for a league about to be saved, or null. `teams` are the league's stored teams.
 * Checks in order: the plans cover every team exactly once, each stored alignment matches its plan, each roster
 * is valid, and no player name repeats across the league.
 */
export function checkRosterPlans(
  plans: readonly RosterPlan[],
  teams: readonly { id: number; alignment: Alignment | null }[],
): RosterPlanProblem | null {
  const stored = new Map(teams.map((team) => [team.id, team.alignment]));
  const seen = new Set<number>();
  for (const plan of plans) {
    if (!stored.has(plan.teamId) || seen.has(plan.teamId)) return { code: 'wrong-teams' };
    seen.add(plan.teamId);
  }
  if (seen.size !== stored.size) return { code: 'wrong-teams' };

  const names = new Set<string>();
  for (const plan of plans) {
    const alignment = stored.get(plan.teamId);
    if (alignment !== null && alignment !== plan.alignment) return { code: 'alignment-conflict' };
    const problem = findRosterProblem(plan.alignment, plan.players);
    if (problem) return { code: 'invalid-roster', detail: problem };
    for (const player of plan.players) {
      const key = nameKey(player.name);
      if (names.has(key)) return { code: 'duplicate-name' };
      names.add(key);
    }
  }
  return null;
}

export type BackupPlayer =
  | { rating: PlayerRating }
  | { grade: PlayerGrade; fieldGoal?: string; extraPoint?: string };

const rating = (pass: 0 | 1, run: 0 | 1): BackupPlayer => ({ rating: { pass, run } });

/** The guide's fixed injury backups (section 2.5). Special teams backups have no quality. */
export const BACKUP_PLAYERS: Record<PlayerSlotPosition, BackupPlayer> = {
  QB: rating(0, 1),
  RB: rating(0, 1),
  WR: rating(1, 0),
  TE: rating(0, 1),
  OL: rating(0, 1),
  DT: rating(0, 1),
  DE: rating(1, 0),
  LB: rating(0, 1),
  CB: rating(1, 0),
  SS: rating(0, 1),
  FS: rating(1, 0),
  K: { grade: 'D', fieldGoal: '11-51', extraPoint: '11-61' },
  KR: { grade: 'D' },
  PR: { grade: 'D' },
};
