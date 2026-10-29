import type { RandomFn } from './dice';
import {
  isGradedPosition,
  playerTablesFor,
  QUALITY_PAIRS,
  qualityTableFor,
  type PlayerGrade,
  type PlayerPosition,
  type PlayerQuality,
  type PlayerRating,
} from './player-tables';
import { rollOnTable, type RollOutcome, type RollResult } from './roll';
import { ELECTRIC_TABLES, EXTRA_POINT_TABLES, FIELD_GOAL_TABLES, type Electric } from './special-teams-tables';

export type PlayerRollStep = 'age' | 'rating' | 'grade' | 'quality-count' | 'quality' | 'electric' | 'field-goal' | 'extra-point';

export type PlayerDraft = {
  position: PlayerPosition;
  age: RollResult<number> | null;
  /** Set for rated positions, never together with `grade`. */
  rating: RollResult<PlayerRating> | null;
  /** Set for KR, PR and K. */
  grade: RollResult<PlayerGrade> | null;
  qualityCount: RollResult<0 | 1 | 2> | null;
  /** One entry per quality roll, in the order rolled. */
  qualityRolls: RollResult<PlayerQuality>[];
  /** The rolled qualities after the guide's full and cancel rules. */
  qualities: PlayerQuality[];
  /** Set for KR and PR (guide 5.3.1). */
  electric: RollResult<Electric> | null;
  /** Set for K: the top of the 11-NN field goal success range (guide 5.3.2). */
  fieldGoal: RollResult<number> | null;
  /** Set for K: the top of the 11-NN extra point success range (guide 5.3.3). */
  extraPoint: RollResult<number> | null;
};

type RollOptions = { manual?: string; random?: RandomFn };

type Applied = { ok: true; draft: PlayerDraft } | { ok: false; error: Extract<RollOutcome<never>, { ok: false }>['error'] };

export function createPlayerDraft(position: PlayerPosition): PlayerDraft {
  return { position, age: null, rating: null, grade: null, qualityCount: null, qualityRolls: [], qualities: [], electric: null, fieldGoal: null, extraPoint: null };
}

function apply<T>(outcome: RollOutcome<T>, update: (result: RollResult<T>) => PlayerDraft): Applied {
  return outcome.ok ? { ok: true, draft: update(outcome.result) } : { ok: false, error: outcome.error };
}

/**
 * Combines quality results on each opposite pair's line (-2 full first quality, -1 semi, 0 none, +1 semi second,
 * +2 full second). A semi result moves one step, a full result two, and steps past either end are lost.
 * Results from different pairs do not interact. Pairs keep the order they first appear in.
 */
export function mergeQualities(results: readonly PlayerQuality[]): PlayerQuality[] {
  const positions = new Map<number, number>();
  for (const { name, level } of results) {
    const pairIndex = QUALITY_PAIRS.findIndex((pair) => pair.includes(name));
    if (pairIndex < 0) throw new Error(`Unknown quality "${name}"`);
    const step = (QUALITY_PAIRS[pairIndex][0] === name ? -1 : 1) * (level === 'full' ? 2 : 1);
    positions.set(pairIndex, Math.max(-2, Math.min(2, (positions.get(pairIndex) ?? 0) + step)));
  }
  const merged: PlayerQuality[] = [];
  for (const [pairIndex, position] of positions) {
    if (position === 0) continue;
    merged.push({ name: QUALITY_PAIRS[pairIndex][position < 0 ? 0 : 1], level: Math.abs(position) === 2 ? 'full' : 'semi' });
  }
  return merged;
}

export function rollPlayerAge(draft: PlayerDraft, options: RollOptions = {}) {
  return apply(rollOnTable(playerTablesFor(draft.position).age, options), (age) => ({ ...draft, age }));
}

/** Rolls the Pass/Run rating, or the A to D grade for KR, PR and K. A new rating clears everything after it. */
export function rollPlayerRating(draft: PlayerDraft, options: RollOptions = {}) {
  const tables = playerTablesFor(draft.position);
  const cleared = { ...draft, rating: null, grade: null, qualityCount: null, qualityRolls: [], qualities: [], electric: null, fieldGoal: null, extraPoint: null };
  if (tables.kind === 'graded') return apply(rollOnTable(tables.grade, options), (grade) => ({ ...cleared, grade }));
  return apply(rollOnTable(tables.rating, options), (rating) => ({ ...cleared, rating }));
}

/** Needs a rating first, and does nothing for graded positions. A new count clears the quality rolls. */
export function rollPlayerQualityCount(draft: PlayerDraft, options: RollOptions = {}): Applied {
  const tables = playerTablesFor(draft.position);
  if (tables.kind === 'graded' || !draft.rating) return { ok: true, draft };
  return apply(rollOnTable(tables.count, options), (qualityCount) => ({ ...draft, qualityCount, qualityRolls: [], qualities: [] }));
}

/** Rolls the next quality on the chart column for the player's rating, until the rolled count is reached. */
export function rollPlayerQuality(draft: PlayerDraft, options: RollOptions = {}): Applied {
  const rating = draft.rating?.outcome;
  const wanted = draft.qualityCount?.outcome;
  if (isGradedPosition(draft.position) || !rating || wanted == null || draft.qualityRolls.length >= wanted) {
    return { ok: true, draft };
  }
  const table = qualityTableFor(draft.position, rating);
  if (!table) throw new Error(`${draft.position} has no quality chart column for rating ${rating.pass}/${rating.run}`);
  return apply(rollOnTable(table, options), (roll) => {
    const qualityRolls = [...draft.qualityRolls, roll];
    return { ...draft, qualityRolls, qualities: mergeQualities(qualityRolls.map((entry) => entry.outcome!)) };
  });
}

/** KR and PR roll ELECTRIC by grade. Does nothing without a grade or for other positions. */
export function rollPlayerElectric(draft: PlayerDraft, options: RollOptions = {}): Applied {
  const grade = draft.grade?.outcome;
  if ((draft.position !== 'KR' && draft.position !== 'PR') || !grade) return { ok: true, draft };
  return apply(rollOnTable(ELECTRIC_TABLES[grade], options), (electric) => ({ ...draft, electric }));
}

/** K rolls the FG success range by grade. */
export function rollPlayerFieldGoal(draft: PlayerDraft, options: RollOptions = {}): Applied {
  const grade = draft.grade?.outcome;
  if (draft.position !== 'K' || !grade) return { ok: true, draft };
  return apply(rollOnTable(FIELD_GOAL_TABLES[grade], options), (fieldGoal) => ({ ...draft, fieldGoal }));
}

/** K rolls the XP success range by grade. */
export function rollPlayerExtraPoint(draft: PlayerDraft, options: RollOptions = {}): Applied {
  const grade = draft.grade?.outcome;
  if (draft.position !== 'K' || !grade) return { ok: true, draft };
  return apply(rollOnTable(EXTRA_POINT_TABLES[grade], options), (extraPoint) => ({ ...draft, extraPoint }));
}

/** True when every roll the position needs has been made and found a result (a roll's outcome can be null). */
export function isPlayerComplete(draft: PlayerDraft) {
  if (draft.age?.outcome == null) return false;
  if (isGradedPosition(draft.position)) {
    if (draft.grade?.outcome == null) return false;
    if (draft.position === 'K') return draft.fieldGoal?.outcome != null && draft.extraPoint?.outcome != null;
    return draft.electric?.outcome != null;
  }
  const count = draft.qualityCount?.outcome;
  return (
    draft.rating?.outcome != null &&
    count != null &&
    draft.qualityRolls.length === count &&
    draft.qualityRolls.every((roll) => roll.outcome != null)
  );
}

/** Rolls a whole player with dice, in the guide's order. */
export function createPlayer(position: PlayerPosition, random?: RandomFn): PlayerDraft {
  let draft = createPlayerDraft(position);
  for (const step of [rollPlayerAge, rollPlayerRating, rollPlayerQualityCount, rollPlayerElectric, rollPlayerFieldGoal, rollPlayerExtraPoint]) {
    const next = step(draft, { random });
    if (next.ok) draft = next.draft;
  }
  while (!isPlayerComplete(draft)) {
    const next = rollPlayerQuality(draft, { random });
    if (!next.ok) break;
    draft = next.draft;
  }
  return draft;
}

/** Every roll made for this player, in the guide's order, with the step each belongs to. */
export function playerRolls(draft: PlayerDraft): { step: PlayerRollStep; roll: RollResult }[] {
  const rolls: { step: PlayerRollStep; roll: RollResult }[] = [];
  if (draft.age) rolls.push({ step: 'age', roll: draft.age });
  if (draft.rating) rolls.push({ step: 'rating', roll: draft.rating });
  if (draft.grade) rolls.push({ step: 'grade', roll: draft.grade });
  if (draft.qualityCount) rolls.push({ step: 'quality-count', roll: draft.qualityCount });
  for (const roll of draft.qualityRolls) rolls.push({ step: 'quality', roll });
  if (draft.electric) rolls.push({ step: 'electric', roll: draft.electric });
  if (draft.fieldGoal) rolls.push({ step: 'field-goal', roll: draft.fieldGoal });
  if (draft.extraPoint) rolls.push({ step: 'extra-point', roll: draft.extraPoint });
  return rolls;
}
