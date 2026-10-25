export type NameLengthResult = { ok: true; value: string } | { ok: false; error: 'empty' | 'too-long' };

/** Trims, then requires 1 to `max` characters. Shared by league, coach, team and group names. */
export function checkNameLength(raw: string, max: number): NameLengthResult {
  const value = raw.trim();
  if (value.length === 0) return { ok: false, error: 'empty' };
  if (value.length > max) return { ok: false, error: 'too-long' };
  return { ok: true, value };
}

/** A case-insensitive comparison key. toLowerCase ignores the device locale, so results do not change per device. */
export function nameKey(...parts: string[]) {
  return parts.map((part) => part.trim().toLowerCase()).join(' ');
}
