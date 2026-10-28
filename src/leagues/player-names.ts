import type { RandomFn } from '@/rules/dice';

import { nameKey } from './name-rules';
import { PLAYER_NAMES } from './player-name-list';

// The list is constant, so its comparison keys are built once.
const LIST_KEYS = PLAYER_NAMES.map((name) => nameKey(name));

/**
 * A random unused name from the list, or null when every name is taken. A random start position is chosen and
 * taken names are skipped forward (wrapping), so a pick costs about the number of used names, not the list size.
 */
export function pickPlayerName(used: Iterable<string>, random: RandomFn = Math.random) {
  const taken = new Set<string>();
  for (const name of used) taken.add(nameKey(name));
  const size = PLAYER_NAMES.length;
  const start = Math.min(size - 1, Math.floor(random() * size));
  for (let offset = 0; offset < size; offset++) {
    const index = (start + offset) % size;
    if (!taken.has(LIST_KEYS[index])) return PLAYER_NAMES[index];
  }
  return null;
}
