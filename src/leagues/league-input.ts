export const MAX_LEAGUE_NAME_LENGTH = 40;

export type LeagueNameResult = { ok: true; name: string } | { ok: false; error: 'empty' | 'too-long' };

export function validateLeagueName(raw: string): LeagueNameResult {
  const name = raw.trim();
  if (name.length === 0) return { ok: false, error: 'empty' };
  if (name.length > MAX_LEAGUE_NAME_LENGTH) return { ok: false, error: 'too-long' };
  return { ok: true, name };
}

export function parseLeagueId(raw: string | string[] | undefined) {
  if (typeof raw !== 'string' || !/^[1-9]\d{0,9}$/.test(raw)) return null;
  return Number(raw);
}
