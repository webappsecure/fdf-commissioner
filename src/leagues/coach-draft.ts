import type { RandomFn } from '@/rules/dice';
import {
  COACH_AGE_TABLE,
  COACH_FOCUS_TABLE,
  GAME_DAY_QUALITY_TABLE,
  specialtyTableFor,
  summarizeCoach,
  type CoachFocus,
  type CoachSpecialty,
  type GameDayQuality,
} from '@/rules/coach-tables';
import { hasDuplicateCoachName, validateCoachName } from './coach-names';
import { rollOnTable, type RollOutcome, type RollResult } from '@/rules/roll';

export type CoachRollStep = 'age' | 'focus' | 'specialty' | 'game-day';

export type CoachDraft = {
  name: string;
  age: RollResult<number> | null;
  focus: RollResult<CoachFocus> | null;
  specialty: RollResult<CoachSpecialty> | null;
  gameDay: RollResult<GameDayQuality> | null;
};

type RollOptions = { manual?: string; random?: RandomFn };

export function createCoachDraft(name: string): CoachDraft {
  return { name, age: null, focus: null, specialty: null, gameDay: null };
}

export function isCoachComplete(draft: CoachDraft) {
  return draft.name.trim() !== '' && !!draft.age && !!draft.focus && !!draft.specialty && !!draft.gameDay;
}

type Applied = { ok: true; draft: CoachDraft } | { ok: false; error: Extract<RollOutcome<never>, { ok: false }>['error'] };

function apply<T>(outcome: RollOutcome<T>, update: (result: RollResult<T>) => CoachDraft): Applied {
  return outcome.ok ? { ok: true, draft: update(outcome.result) } : { ok: false, error: outcome.error };
}

export function rollCoachAge(draft: CoachDraft, options: RollOptions = {}) {
  return apply(rollOnTable(COACH_AGE_TABLE, options), (age) => ({ ...draft, age }));
}

/** A new focus clears the specialty, because the specialty table depends on it. */
export function rollCoachFocus(draft: CoachDraft, options: RollOptions = {}) {
  return apply(rollOnTable(COACH_FOCUS_TABLE, options), (focus) => ({ ...draft, focus, specialty: null }));
}

/** Needs a focus first; returns the draft unchanged when there is none. */
export function rollCoachSpecialty(draft: CoachDraft, options: RollOptions = {}): Applied {
  if (!draft.focus?.outcome) return { ok: true, draft };
  return apply(rollOnTable(specialtyTableFor(draft.focus.outcome), options), (specialty) => ({ ...draft, specialty }));
}

export function rollCoachGameDay(draft: CoachDraft, options: RollOptions = {}) {
  return apply(rollOnTable(GAME_DAY_QUALITY_TABLE, options), (gameDay) => ({ ...draft, gameDay }));
}

/** Rolls every step with dice, in the guide's order. */
export function rollWholeCoach(name: string, random?: RandomFn): CoachDraft {
  let draft = createCoachDraft(name);
  for (const step of [rollCoachAge, rollCoachFocus, rollCoachSpecialty, rollCoachGameDay]) {
    const next = step(draft, { random });
    if (next.ok) draft = next.draft;
  }
  return draft;
}

/** What still stops this coach from being saved, or null. `index` is the coach's position in `allNames`. */
export function coachProblem(draft: CoachDraft, allNames: readonly string[], index: number) {
  const checked = validateCoachName(draft.name);
  if (!checked.ok) return checked.error === 'empty' ? 'Needs a name.' : 'Name is too long.';
  if (hasDuplicateCoachName(allNames.filter((_, position) => position !== index), draft.name)) return 'Another coach already has this name.';
  if (!isCoachComplete(draft)) return 'Needs all four rolls.';
  return null;
}

export function describeDraftCoach(draft: CoachDraft) {
  if (!isCoachComplete(draft)) return 'Rolls unfinished';
  return summarizeCoach(draft.age!.outcome!, draft.focus!.outcome!, draft.specialty!.outcome!, draft.gameDay!.outcome!);
}
