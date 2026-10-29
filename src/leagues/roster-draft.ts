import type { RandomFn } from '@/rules/dice';

import { checkRosterPlans, planTeamRoster, type RosterPlan } from './roster-plan';
import { flipAlignment, type Alignment } from './team-layout';

/** Rolled rosters by team id. Held in memory until the commissioner saves. */
export type RosterDraft = Record<number, RosterPlan>;

type RosterTeamInfo = { id: number; alignment: Alignment | null };

function namesUsedByOthers(plans: RosterDraft, teamId: number) {
  const names: string[] = [];
  for (const plan of Object.values(plans)) {
    if (plan.teamId !== teamId) for (const player of plan.players) names.push(player.name);
  }
  return names;
}

/** Rolls (or rerolls) one team. A stored alignment is kept; an unset one gets a coin flip. */
export function rollTeamRoster(teams: readonly RosterTeamInfo[], plans: RosterDraft, teamId: number, random?: RandomFn): RosterDraft {
  const team = teams.find((candidate) => candidate.id === teamId);
  if (!team) throw new Error(`Unknown team ${teamId}`);
  const alignment = team.alignment ?? flipAlignment(random);
  const players = planTeamRoster(alignment, namesUsedByOthers(plans, teamId), random);
  return { ...plans, [teamId]: { teamId, alignment, players } };
}

/** Rolls every team that has no roster yet, leaving rolled teams as they are. */
export function rollMissingRosters(teams: readonly RosterTeamInfo[], plans: RosterDraft, random?: RandomFn): RosterDraft {
  let next = plans;
  for (const team of teams) {
    if (!next[team.id]) next = rollTeamRoster(teams, next, team.id, random);
  }
  return next;
}

/** Null only when every team has a roster and the whole set can be saved. */
export function findRosterDraftProblem(teams: readonly RosterTeamInfo[], plans: RosterDraft): string | null {
  if (teams.some((team) => !plans[team.id])) return 'unrolled teams';
  return checkRosterPlans(Object.values(plans), teams)?.code ?? null;
}
