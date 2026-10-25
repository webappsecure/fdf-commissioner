import type { RandomFn } from '@/rules/dice';

import { COACH_NAMES } from './coach-name-list';
import { checkNameLength, nameKey } from './name-rules';

export const MAX_COACH_NAME_LENGTH = 40;

export type CoachNameResult = { ok: true; name: string } | { ok: false; error: 'empty' | 'too-long' };

export function validateCoachName(raw: string): CoachNameResult {
  const checked = checkNameLength(raw, MAX_COACH_NAME_LENGTH);
  return checked.ok ? { ok: true, name: checked.value } : checked;
}

export function hasDuplicateCoachName(names: readonly string[], name: string) {
  const key = nameKey(name);
  return names.some((candidate) => nameKey(candidate) === key);
}

/** A random unused name from the list, or null when every name is taken. */
export function pickCoachName(used: readonly string[], random: RandomFn = Math.random) {
  const taken = new Set(used.map((name) => nameKey(name)));
  const available = COACH_NAMES.filter((name) => !taken.has(nameKey(name)));
  if (available.length === 0) return null;
  return available[Math.min(available.length - 1, Math.floor(random() * available.length))];
}
