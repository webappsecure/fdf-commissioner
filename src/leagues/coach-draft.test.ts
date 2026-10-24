import { COACH_AGE_TABLE, COACH_FOCUS_TABLE, DEFENSE_SPECIALTY_TABLE, GAME_DAY_QUALITY_TABLE, OFFENSE_SPECIALTY_TABLE } from '@/rules/coach-tables';
import { findTableIssues, lookup } from '@/rules/tables';

import { coachProblem, createCoachDraft, describeDraftCoach, isCoachComplete, rollCoachAge, rollCoachFocus, rollCoachSpecialty, rollWholeCoach } from './coach-draft';
import { COACH_NAMES } from './coach-name-list';
import { hasDuplicateCoachName, pickCoachName, validateCoachName } from './coach-names';

describe('coach tables', () => {
  it('cover every roll exactly once', () => {
    for (const table of [COACH_AGE_TABLE, COACH_FOCUS_TABLE, OFFENSE_SPECIALTY_TABLE, DEFENSE_SPECIALTY_TABLE, GAME_DAY_QUALITY_TABLE]) {
      expect(findTableIssues(table.rows)).toEqual([]);
    }
  });

  it('gives ages from 39 to 66 as printed', () => {
    expect(lookup(COACH_AGE_TABLE, 11)).toBe(39);
    expect(lookup(COACH_AGE_TABLE, 24)).toBe(47);
    expect(lookup(COACH_AGE_TABLE, 46)).toBe(54);
    expect(lookup(COACH_AGE_TABLE, 55)).toBe(59);
    expect(lookup(COACH_AGE_TABLE, 66)).toBe(66);
  });

  it('splits focus at 42 and 43', () => {
    expect(lookup(COACH_FOCUS_TABLE, 42)).toBe('offense');
    expect(lookup(COACH_FOCUS_TABLE, 43)).toBe('defense');
  });

  it('looks up specialties at range edges', () => {
    expect(lookup(OFFENSE_SPECIALTY_TABLE, 56)).toBe('receivers-coach');
    expect(lookup(OFFENSE_SPECIALTY_TABLE, 61)).toBe('special-teams-coach');
    expect(lookup(DEFENSE_SPECIALTY_TABLE, 32)).toBe('defensive-line-guru');
    expect(lookup(DEFENSE_SPECIALTY_TABLE, 33)).toBe('lb-development');
    expect(lookup(DEFENSE_SPECIALTY_TABLE, 56)).toBe('secondary-coach');
  });

  it('resolves the guide overlap at 21, 22 and 23', () => {
    expect(lookup(GAME_DAY_QUALITY_TABLE, 21)).toBe('inefficient-semi');
    expect(lookup(GAME_DAY_QUALITY_TABLE, 22)).toBe('inefficient-semi');
    expect(lookup(GAME_DAY_QUALITY_TABLE, 23)).toBe('none');
    expect(lookup(GAME_DAY_QUALITY_TABLE, 54)).toBe('none');
    expect(lookup(GAME_DAY_QUALITY_TABLE, 55)).toBe('efficient-semi');
    expect(lookup(GAME_DAY_QUALITY_TABLE, 66)).toBe('efficient');
  });
});

describe('coach draft', () => {
  it('rolls from a manual value and keeps it flagged manual', () => {
    const result = rollCoachAge(createCoachDraft('A B'), { manual: '23' });
    expect(result.ok && result.draft.age).toMatchObject({ final: 23, outcome: 47, manual: true });
  });

  it('reports an invalid manual roll', () => {
    expect(rollCoachAge(createCoachDraft('A B'), { manual: '17' })).toEqual({ ok: false, error: 'out-of-range' });
  });

  it('uses the table for the focus and clears the specialty when the focus changes', () => {
    let draft = createCoachDraft('A B');
    const focus = rollCoachFocus(draft, { manual: '11' });
    if (!focus.ok) throw new Error('focus');
    const specialty = rollCoachSpecialty(focus.draft, { manual: '21' });
    if (!specialty.ok) throw new Error('specialty');
    expect(specialty.draft.specialty?.outcome).toBe('qb-development');
    draft = specialty.draft;
    const changed = rollCoachFocus(draft, { manual: '66' });
    expect(changed.ok && changed.draft.specialty).toBeNull();
    expect(changed.ok && changed.draft.focus?.outcome).toBe('defense');
  });

  it('leaves the draft alone when the specialty is rolled without a focus', () => {
    const draft = createCoachDraft('A B');
    expect(rollCoachSpecialty(draft, { manual: '11' })).toEqual({ ok: true, draft });
  });

  it('rolls a whole coach to a complete draft', () => {
    const draft = rollWholeCoach('A B', () => 0.5);
    expect(isCoachComplete(draft)).toBe(true);
    expect(isCoachComplete(createCoachDraft('A B'))).toBe(false);
  });
});

describe('coach names', () => {
  it('has 1,000 unique two-word names', () => {
    expect(COACH_NAMES).toHaveLength(1000);
    expect(new Set(COACH_NAMES.map((name) => name.toLowerCase())).size).toBe(1000);
    COACH_NAMES.forEach((name) => expect(name).toMatch(/^\S+ \S+$/));
  });

  it('skips used names case-insensitively and is deterministic with a seeded random', () => {
    expect(pickCoachName([], () => 0)).toBe(COACH_NAMES[0]);
    expect(pickCoachName([COACH_NAMES[0].toUpperCase()], () => 0)).toBe(COACH_NAMES[1]);
    expect(pickCoachName([], () => 0.9999)).toBe(COACH_NAMES[999]);
  });

  it('returns null when every name is used', () => {
    expect(pickCoachName(COACH_NAMES)).toBeNull();
  });

  it('validates typed names', () => {
    expect(validateCoachName('  Ann Lee ')).toEqual({ ok: true, name: 'Ann Lee' });
    expect(validateCoachName('   ')).toEqual({ ok: false, error: 'empty' });
    expect(validateCoachName('x'.repeat(41))).toEqual({ ok: false, error: 'too-long' });
    expect(hasDuplicateCoachName(['Ann Lee'], ' ann lee ')).toBe(true);
  });
});

describe('coachProblem', () => {
  it('reports name, duplicate and unfinished roll problems in that order', () => {
    const done = rollWholeCoach('Ann Lee', () => 0.5);
    expect(coachProblem(done, ['Ann Lee', 'Bob Ray'], 0)).toBeNull();
    expect(coachProblem({ ...done, name: ' ' }, ['', 'Bob Ray'], 0)).toBe('Needs a name.');
    expect(coachProblem({ ...done, name: 'bob ray' }, ['bob ray', 'Bob Ray'], 0)).toBe('Another coach already has this name.');
    expect(coachProblem({ ...done, gameDay: null }, ['Ann Lee'], 0)).toBe('Needs all four rolls.');
  });

  it('describes a finished coach for the summary lines', () => {
    expect(describeDraftCoach(createCoachDraft('A B'))).toBe('Rolls unfinished');
    expect(describeDraftCoach(rollWholeCoach('A B', () => 0))).toBe('Age 39, Offense, Talent Spotter, INEFFICIENT');
  });
});
