import { checkNameLength, nameKey, type NameLengthResult } from './name-rules';

export const MAX_TEAM_TEXT_LENGTH = 40;
export const MAX_GROUP_NAME_LENGTH = 40;

export type TextResult = NameLengthResult;

/** Location or team name. */
export function validateTeamText(raw: string) {
  return checkNameLength(raw, MAX_TEAM_TEXT_LENGTH);
}

export function validateGroupName(raw: string) {
  return checkNameLength(raw, MAX_GROUP_NAME_LENGTH);
}

type TeamText = { location: string; name: string };

/** True when another team already has this "location name". `exceptIndex` skips the team being edited. */
export function hasDuplicateTeam(teams: readonly (TeamText | null)[], candidate: TeamText, exceptIndex?: number) {
  const wanted = nameKey(candidate.location, candidate.name);
  return teams.some((team, index) => team !== null && index !== exceptIndex && nameKey(team.location, team.name) === wanted);
}

export function hasDuplicateGroupName(names: readonly string[], name: string, exceptIndex?: number) {
  const wanted = nameKey(name);
  return names.some((candidate, index) => index !== exceptIndex && nameKey(candidate) === wanted);
}

export const PALETTE = [
  { name: 'Red', hex: '#C62828' },
  { name: 'Orange', hex: '#EF6C00' },
  { name: 'Gold', hex: '#F9A825' },
  { name: 'Green', hex: '#2E7D32' },
  { name: 'Teal', hex: '#00838F' },
  { name: 'Blue', hex: '#1565C0' },
  { name: 'Navy', hex: '#0D2A5B' },
  { name: 'Purple', hex: '#6A1B9A' },
  { name: 'Maroon', hex: '#6D1B2B' },
  { name: 'Silver', hex: '#9E9E9E' },
  { name: 'Black', hex: '#111111' },
  { name: 'White', hex: '#FFFFFF' },
] as const;

/** Accepts #RRGGBB or RRGGBB in any case and returns uppercase #RRGGBB, or null. */
export function parseHexColor(raw: string) {
  const match = /^#?([0-9a-fA-F]{6})$/.exec(raw.trim());
  return match ? `#${match[1].toUpperCase()}` : null;
}

function hslToHex(hue: number, saturation: number, lightness: number) {
  const s = saturation / 100;
  const l = lightness / 100;
  const a = s * Math.min(l, 1 - l);
  const channel = (n: number) => {
    const k = (n + hue / 30) % 12;
    const value = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(value * 255)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${channel(0)}${channel(8)}${channel(4)}`.toUpperCase();
}

const HUES = Array.from({ length: 12 }, (_, index) => index * 30);
const LIGHTNESS_STEPS = [85, 70, 55, 40, 25];

/** Rows of 12 colors: five shades of each of 12 hues, then a row from white to black. */
export function colorGrid() {
  const shades = LIGHTNESS_STEPS.map((lightness) => HUES.map((hue) => hslToHex(hue, 80, lightness)));
  const grays = Array.from({ length: 12 }, (_, index) => hslToHex(0, 0, 100 - (index * 100) / 11));
  return [...shades, grays];
}
