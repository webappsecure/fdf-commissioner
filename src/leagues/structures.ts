export const LEAGUE_SIZES = [6, 8, 10, 12, 16, 20, 24] as const;

export type LeagueSize = (typeof LEAGUE_SIZES)[number];

export type StructureId = 'flat' | 'divisions-2' | 'divisions-3' | 'conferences-2x2';

export type StructureOption = { id: StructureId; label: string };

const STRUCTURES_BY_SIZE: Record<LeagueSize, readonly StructureId[]> = {
  6: ['flat'],
  8: ['flat', 'divisions-2'],
  10: ['flat', 'divisions-2'],
  12: ['flat', 'divisions-2', 'divisions-3'],
  16: ['flat', 'divisions-2', 'conferences-2x2'],
  20: ['conferences-2x2'],
  24: ['conferences-2x2'],
};

export function isLeagueSize(value: unknown): value is LeagueSize {
  return LEAGUE_SIZES.some((size) => size === value);
}

function divisionCount(id: StructureId) {
  if (id === 'divisions-2') return 2;
  if (id === 'divisions-3') return 3;
  if (id === 'conferences-2x2') return 4;
  return 1;
}

function label(size: LeagueSize, id: StructureId) {
  if (id === 'flat') return 'Flat';
  const perDivision = size / divisionCount(id);
  if (id === 'conferences-2x2') return `2 conferences of two ${perDivision}-team divisions`;
  return `${divisionCount(id)} divisions of ${perDivision}`;
}

export function structuresFor(size: LeagueSize): StructureOption[] {
  return STRUCTURES_BY_SIZE[size].map((id) => ({ id, label: label(size, id) }));
}

export function isValidStructure(size: unknown, id: unknown): id is StructureId {
  return isLeagueSize(size) && STRUCTURES_BY_SIZE[size].some((candidate) => candidate === id);
}

export function describeLeague(size: LeagueSize, id: StructureId) {
  if (id === 'flat') return `${size} teams, flat`;
  if (id === 'conferences-2x2') return `${size} teams, 2 conferences`;
  return `${size} teams, ${divisionCount(id)} divisions`;
}
