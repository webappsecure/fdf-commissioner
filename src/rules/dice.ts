export type RollKind = '2d6' | '1d6';
export type RandomFn = () => number;

export const MIN_ROLL = 11;
export const MAX_ROLL = 66;

export function isValid2d6(roll: number) {
  const tens = Math.floor(roll / 10);
  const ones = roll % 10;
  return Number.isInteger(roll) && tens >= 1 && tens <= 6 && ones >= 1 && ones <= 6;
}

/** Position of a roll in the base-6 sequence 11, 12, ..., 66 as 1 to 36. */
export function rollToOrdinal(roll: number) {
  return (Math.floor(roll / 10) - 1) * 6 + (roll % 10);
}

export function ordinalToRoll(ordinal: number) {
  return (Math.floor((ordinal - 1) / 6) + 1) * 10 + ((ordinal - 1) % 6) + 1;
}

/** Adds a modifier in base-6 steps; results below 11 or above 66 count as 11 or 66. */
export function addToRoll(roll: number, modifier: number) {
  const ordinal = Math.min(36, Math.max(1, rollToOrdinal(roll) + modifier));
  return ordinalToRoll(ordinal);
}

function rollDie(random: RandomFn) {
  return Math.min(6, Math.floor(random() * 6) + 1);
}

export function rollD6(random: RandomFn = Math.random) {
  return rollDie(random);
}

/** Tens die first, then ones die. */
export function roll2d6(random: RandomFn = Math.random) {
  const tens = rollDie(random);
  const ones = rollDie(random);
  return tens * 10 + ones;
}

export type ManualRollError = 'empty' | 'not-a-roll' | 'out-of-range';

export type ManualRollParse = { ok: true; roll: number } | { ok: false; error: ManualRollError };

export function parseManualRoll(text: string, kind: RollKind): ManualRollParse {
  const trimmed = text.trim();
  if (trimmed === '') return { ok: false, error: 'empty' };

  const digits = kind === '2d6' ? 2 : 1;
  if (!new RegExp(`^\\d{${digits}}$`).test(trimmed)) return { ok: false, error: 'not-a-roll' };

  const roll = Number(trimmed);
  const valid = kind === '2d6' ? isValid2d6(roll) : roll >= 1 && roll <= 6;
  return valid ? { ok: true, roll } : { ok: false, error: 'out-of-range' };
}
