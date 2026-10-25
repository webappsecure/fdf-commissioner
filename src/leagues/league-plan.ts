import type { CoachFocus, CoachSpecialty, GameDayQuality } from '@/rules/coach-tables';
import type { RollResult } from '@/rules/roll';

import type { LeagueDraft } from './league-draft';
import type { LeagueSize, StructureId } from './structures';
import { layoutFor, type Alignment } from './team-layout';

export type PlannedRoll = {
  step: 'coach-age' | 'coach-focus' | 'coach-specialty' | 'coach-game-day';
  roll: RollResult;
};

export type PlannedTeam = {
  /** 1-based position in the planned divisions, or null for a flat league. */
  divisionIndex: number | null;
  /** 1-based position in the planned conferences, or null when there are none. */
  conferenceIndex: number | null;
  location: string;
  name: string;
  primaryColor: string;
  secondaryColor: string;
  alignment: Alignment;
  coach: { name: string; age: number; focus: CoachFocus; specialty: CoachSpecialty; gameDayQuality: GameDayQuality };
  rolls: PlannedRoll[];
};

export type LeaguePlan = {
  conferences: { name: string }[];
  /** `conferenceIndex` is 1-based into `conferences`, or null. */
  divisions: { name: string; conferenceIndex: number | null }[];
  /** In display order, which is the order the teams are inserted. */
  teams: PlannedTeam[];
};

/**
 * Turns a finished, validated draft into the rows to save, in insert order. Group membership comes from the
 * league's layout, never from the draft. Run `findDraftProblem` first; this assumes every slot is complete.
 */
export function planLeagueRows(size: LeagueSize, structure: StructureId, draft: LeagueDraft): LeaguePlan {
  const layout = layoutFor(size, structure);
  const teams: PlannedTeam[] = [];
  let slot = 0;
  for (const group of layout.groups) {
    for (let offset = 0; offset < group.teamCount; offset++, slot++) {
      const team = draft.teams[slot]!;
      const coach = team.coach!;
      teams.push({
        divisionIndex: group.divisionIndex,
        conferenceIndex: group.conferenceIndex,
        location: team.location.trim(),
        name: team.name.trim(),
        primaryColor: team.primaryColor.toUpperCase(),
        secondaryColor: team.secondaryColor.toUpperCase(),
        alignment: team.alignment!,
        coach: {
          name: coach.name.trim(),
          age: coach.age!.outcome!,
          focus: coach.focus!.outcome!,
          specialty: coach.specialty!.outcome!,
          gameDayQuality: coach.gameDay!.outcome!,
        },
        rolls: [
          { step: 'coach-age', roll: coach.age! },
          { step: 'coach-focus', roll: coach.focus! },
          { step: 'coach-specialty', roll: coach.specialty! },
          { step: 'coach-game-day', roll: coach.gameDay! },
        ],
      });
    }
  }
  return {
    conferences: draft.conferenceNames.map((name) => ({ name: name.trim() })),
    divisions: draft.divisionNames.map((name, index) => ({ name: name.trim(), conferenceIndex: layout.groups[index].conferenceIndex })),
    teams,
  };
}
