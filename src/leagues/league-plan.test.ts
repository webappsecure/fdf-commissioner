import { rollWholeCoach } from './coach-draft';
import { COACH_NAMES } from './coach-name-list';
import { findDraftProblem, newLeagueDraft, type LeagueDraft } from './league-draft';
import { planLeagueRows } from './league-plan';
import { LEAGUE_SIZES, structuresFor, type LeagueSize, type StructureId } from './structures';

function filledDraft(size: LeagueSize, structure: StructureId): LeagueDraft {
  const draft = newLeagueDraft(size, structure);
  return {
    ...draft,
    teams: draft.teams.map((_, index) => ({
      location: ` City ${index} `,
      name: `Team ${index}`,
      primaryColor: '#c62828',
      secondaryColor: '#FFFFFF',
      alignment: index % 2 === 0 ? '4-3' : '3-4',
      coach: rollWholeCoach(COACH_NAMES[index], () => 0.5),
    })),
  };
}

describe('planLeagueRows', () => {
  for (const size of LEAGUE_SIZES) {
    for (const option of structuresFor(size)) {
      it(`plans ${size} teams as ${option.id}`, () => {
        const draft = filledDraft(size, option.id);
        expect(findDraftProblem(size, option.id, draft)).toBeNull();
        const plan = planLeagueRows(size, option.id, draft);

        expect(plan.teams).toHaveLength(size);
        expect(plan.conferences).toHaveLength(draft.conferenceNames.length);
        expect(plan.divisions).toHaveLength(draft.divisionNames.length);

        // Slot order is draft order, so team N in the draft is planned team N.
        plan.teams.forEach((team, index) => expect(team.name).toBe(`Team ${index}`));

        // Every division holds the same number of teams, in consecutive slots.
        if (plan.divisions.length > 0) {
          const perDivision = size / plan.divisions.length;
          plan.teams.forEach((team, index) => expect(team.divisionIndex).toBe(Math.floor(index / perDivision) + 1));
        } else {
          plan.teams.forEach((team) => expect(team.divisionIndex).toBeNull());
        }

        // A team's conference is its division's conference.
        plan.teams.forEach((team) => {
          const expected = team.divisionIndex === null ? null : plan.divisions[team.divisionIndex - 1].conferenceIndex;
          expect(team.conferenceIndex).toBe(expected);
        });
      });
    }
  }

  it('puts two divisions in each of two conferences for conferences-2x2', () => {
    const plan = planLeagueRows(16, 'conferences-2x2', filledDraft(16, 'conferences-2x2'));
    expect(plan.conferences).toHaveLength(2);
    expect(plan.divisions.map((division) => division.conferenceIndex)).toEqual([1, 1, 2, 2]);
    expect(plan.teams.slice(0, 4).every((team) => team.divisionIndex === 1 && team.conferenceIndex === 1)).toBe(true);
    expect(plan.teams.slice(8, 12).every((team) => team.divisionIndex === 3 && team.conferenceIndex === 2)).toBe(true);
  });

  it('has no groups for a flat league and no conference for plain divisions', () => {
    const flat = planLeagueRows(6, 'flat', filledDraft(6, 'flat'));
    expect(flat.divisions).toEqual([]);
    expect(flat.conferences).toEqual([]);
    const divisions = planLeagueRows(12, 'divisions-3', filledDraft(12, 'divisions-3'));
    expect(divisions.divisions.map((division) => division.conferenceIndex)).toEqual([null, null, null]);
  });

  it('trims text, uppercases colors and keeps the coach rolls in the guide order', () => {
    const plan = planLeagueRows(6, 'flat', filledDraft(6, 'flat'));
    const team = plan.teams[0];
    expect(team.location).toBe('City 0');
    expect(team.primaryColor).toBe('#C62828');
    expect(team.alignment).toBe('4-3');
    expect(team.coach.name).toBe(COACH_NAMES[0]);
    expect(team.rolls.map((entry) => entry.step)).toEqual(['coach-age', 'coach-focus', 'coach-specialty', 'coach-game-day']);
    expect(team.rolls[0].roll.outcome).toBe(team.coach.age);
  });

  it('uses the division names the commissioner typed', () => {
    const draft = filledDraft(12, 'divisions-3');
    draft.divisionNames = [' East ', 'West', 'North'];
    expect(planLeagueRows(12, 'divisions-3', draft).divisions.map((division) => division.name)).toEqual(['East', 'West', 'North']);
  });
});
