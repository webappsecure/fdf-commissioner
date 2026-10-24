import { isCoachComplete, type CoachDraft } from './coach-draft';
import { hasDuplicateCoachName, validateCoachName } from './coach-names';
import type { LeagueSize, StructureId } from './structures';
import { hasDuplicateGroupName, hasDuplicateTeam, parseHexColor, validateGroupName, validateTeamText } from './team-input';
import { layoutFor, type Alignment } from './team-layout';

export type TeamDraft = {
  location: string;
  name: string;
  primaryColor: string;
  secondaryColor: string;
  alignment: Alignment | null;
  coach: CoachDraft | null;
};

/** Everything the wizard collects. `teams` has one entry per slot, null until filled. */
export type LeagueDraft = {
  conferenceNames: string[];
  divisionNames: string[];
  teams: (TeamDraft | null)[];
};

export function newLeagueDraft(size: LeagueSize, structure: StructureId): LeagueDraft {
  const layout = layoutFor(size, structure);
  return {
    conferenceNames: layout.conferences,
    divisionNames: layout.divisions,
    teams: Array.from({ length: size }, () => null),
  };
}

/** Returns what is wrong with a draft that is about to be saved, or null when it can be saved. */
export function findDraftProblem(size: LeagueSize, structure: StructureId, draft: LeagueDraft): string | null {
  const layout = layoutFor(size, structure);
  if (draft.conferenceNames.length !== layout.conferences.length) return 'wrong conference count';
  if (draft.divisionNames.length !== layout.divisions.length) return 'wrong division count';
  for (const names of [draft.conferenceNames, draft.divisionNames]) {
    for (let index = 0; index < names.length; index++) {
      if (!validateGroupName(names[index]).ok) return 'invalid group name';
      if (hasDuplicateGroupName(names, names[index], index)) return 'duplicate group name';
    }
  }
  if (draft.teams.length !== size) return 'wrong team count';

  const coachNames: string[] = [];
  for (let index = 0; index < draft.teams.length; index++) {
    const team = draft.teams[index];
    if (!team) return 'missing team';
    if (!validateTeamText(team.location).ok || !validateTeamText(team.name).ok) return 'invalid team text';
    if (hasDuplicateTeam(draft.teams, team, index)) return 'duplicate team';
    const primary = parseHexColor(team.primaryColor);
    const secondary = parseHexColor(team.secondaryColor);
    if (!primary || !secondary) return 'invalid color';
    if (primary === secondary) return 'same colors';
    if (team.alignment !== '4-3' && team.alignment !== '3-4') return 'missing alignment';
    if (!team.coach || !isCoachComplete(team.coach)) return 'incomplete coach';
    if (!validateCoachName(team.coach.name).ok) return 'invalid coach name';
    if (hasDuplicateCoachName(coachNames, team.coach.name)) return 'duplicate coach name';
    coachNames.push(team.coach.name);
  }
  return null;
}
