import { checkNameLength, nameKey } from './name-rules';

export const MAX_LEAGUE_NAME_LENGTH = 40;

export type LeagueNameResult = { ok: true; name: string } | { ok: false; error: 'empty' | 'too-long' };

export function validateLeagueName(raw: string): LeagueNameResult {
  const checked = checkNameLength(raw, MAX_LEAGUE_NAME_LENGTH);
  return checked.ok ? { ok: true, name: checked.value } : checked;
}

export function parseLeagueId(raw: string | string[] | undefined) {
  if (typeof raw !== 'string' || !/^[1-9]\d{0,9}$/.test(raw)) return null;
  return Number(raw);
}

// The database index only folds ASCII case, so the store checks names here as well. toLowerCase ignores the device locale.
export function hasDuplicateName(leagues: { id: number; name: string }[], name: string, exceptId?: number) {
  const key = nameKey(name);
  return leagues.some((league) => league.id !== exceptId && nameKey(league.name) === key);
}
