import type { RandomFn } from '@/rules/dice';

import { COACH_NAMES } from './coach-name-list';

export const MAX_COACH_NAME_LENGTH = 40;

export type CoachNameResult = { ok: true; name: string } | { ok: false; error: 'empty' | 'too-long' };

export function validateCoachName(raw: string): CoachNameResult {
  const name = raw.trim();
  if (name.length === 0) return { ok: false, error: 'empty' };
  if (name.length > MAX_COACH_NAME_LENGTH) return { ok: false, error: 'too-long' };
  return { ok: true, name };
}

export function hasDuplicateCoachName(names: readonly string[], name: string) {
  const key = name.trim().toLowerCase();
  return names.some((candidate) => candidate.trim().toLowerCase() === key);
}

/** A random unused name from the list, or null when every name is taken. */
export function pickCoachName(used: readonly string[], random: RandomFn = Math.random) {
  const taken = new Set(used.map((name) => name.trim().toLowerCase()));
  const available = COACH_NAMES.filter((name) => !taken.has(name.toLowerCase()));
  if (available.length === 0) return null;
  return available[Math.min(available.length - 1, Math.floor(random() * available.length))];
}
