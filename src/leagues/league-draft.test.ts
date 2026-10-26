import { rollWholeCoach } from './coach-draft';
import { COACH_NAMES } from './coach-name-list';
import { findDraftProblem, newLeagueDraft, type LeagueDraft, type TeamDraft } from './league-draft';

function team(index: number): TeamDraft {
  return {
    location: `City ${index}`,
    name: `Team ${index}`,
    primaryColor: '#C62828',
    secondaryColor: '#FFFFFF',
    coach: rollWholeCoach(COACH_NAMES[index], () => 0.5),
  };
}

function fullDraft(): LeagueDraft {
  const draft = newLeagueDraft(6, 'flat');
  return { ...draft, teams: draft.teams.map((_, index) => team(index)) };
}

describe('newLeagueDraft', () => {
  it('has one empty slot per team and the default group names', () => {
    const draft = newLeagueDraft(16, 'conferences-2x2');
    expect(draft.teams).toHaveLength(16);
    expect(draft.conferenceNames).toHaveLength(2);
    expect(draft.divisionNames).toHaveLength(4);
  });
});

describe('findDraftProblem', () => {
  it('accepts a complete draft', () => {
    expect(findDraftProblem(6, 'flat', fullDraft())).toBeNull();
  });

  it('rejects an unfilled slot', () => {
    const draft = fullDraft();
    draft.teams[2] = null;
    expect(findDraftProblem(6, 'flat', draft)).toBe('missing team');
  });

  it('rejects a draft for the wrong size or structure', () => {
    expect(findDraftProblem(8, 'flat', fullDraft())).toBe('wrong team count');
    expect(findDraftProblem(6, 'flat', { ...fullDraft(), divisionNames: ['Division 1'] })).toBe('wrong division count');
  });

  it('rejects duplicate teams, equal colors, and a bad color', () => {
    let draft = fullDraft();
    draft.teams[1] = { ...team(1), location: ' city 0 ', name: 'TEAM 0' };
    expect(findDraftProblem(6, 'flat', draft)).toBe('duplicate team');
    draft = fullDraft();
    draft.teams[0] = { ...team(0), secondaryColor: '#c62828' };
    expect(findDraftProblem(6, 'flat', draft)).toBe('same colors');
    draft = fullDraft();
    draft.teams[0] = { ...team(0), primaryColor: 'red' };
    expect(findDraftProblem(6, 'flat', draft)).toBe('invalid color');
  });

  it('rejects duplicate coach names and incomplete coaches', () => {
    let draft = fullDraft();
    draft.teams[1] = { ...team(1), coach: rollWholeCoach(COACH_NAMES[0].toUpperCase(), () => 0.5) };
    expect(findDraftProblem(6, 'flat', draft)).toBe('duplicate coach name');
    draft = fullDraft();
    draft.teams[1] = { ...team(1), coach: { ...team(1).coach!, gameDay: null } };
    expect(findDraftProblem(6, 'flat', draft)).toBe('incomplete coach');
  });

  it('rejects duplicate division names', () => {
    const draft = newLeagueDraft(12, 'divisions-3');
    draft.teams = draft.teams.map((_, index) => team(index));
    draft.divisionNames = ['East', 'east', 'West'];
    expect(findDraftProblem(12, 'divisions-3', draft)).toBe('duplicate group name');
  });
});
