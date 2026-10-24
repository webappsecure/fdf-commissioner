import type { RandomFn } from '@/rules/dice';

import type { LeagueSize, StructureId } from './structures';

export type Alignment = '4-3' | '3-4';

export type TeamGroup = {
  /** 1-based; null for a flat league. Groups are numbered in order, across conferences. */
  divisionIndex: number | null;
  /** 1-based; null when the structure has no conferences. */
  conferenceIndex: number | null;
  teamCount: number;
};

export type TeamLayout = {
  /** Default conference names, in order. Empty when there are no conferences. */
  conferences: string[];
  /** Default division names, in order. Empty for a flat league. */
  divisions: string[];
  groups: TeamGroup[];
};

export function layoutFor(size: LeagueSize, structure: StructureId): TeamLayout {
  if (structure === 'flat') {
    return { conferences: [], divisions: [], groups: [{ divisionIndex: null, conferenceIndex: null, teamCount: size }] };
  }
  const divisionCount = structure === 'divisions-2' ? 2 : structure === 'divisions-3' ? 3 : 4;
  const perDivision = size / divisionCount;
  const conferenceCount = structure === 'conferences-2x2' ? 2 : 0;
  return {
    conferences: Array.from({ length: conferenceCount }, (_, index) => `Conference ${index + 1}`),
    divisions: Array.from({ length: divisionCount }, (_, index) => `Division ${index + 1}`),
    groups: Array.from({ length: divisionCount }, (_, index) => ({
      divisionIndex: index + 1,
      conferenceIndex: conferenceCount > 0 ? Math.floor(index / 2) + 1 : null,
      teamCount: perDivision,
    })),
  };
}

/** One entry per team slot, in display order. */
export function teamSlots(layout: TeamLayout) {
  return layout.groups.flatMap((group) =>
    Array.from({ length: group.teamCount }, () => ({
      divisionIndex: group.divisionIndex,
      conferenceIndex: group.conferenceIndex,
    })),
  );
}

/** A fair coin: heads is 4-3. */
export function flipAlignment(random: RandomFn = Math.random): Alignment {
  return random() < 0.5 ? '4-3' : '3-4';
}

/** A 0-based team slot from a route parameter, or null when it is not a slot of this league. */
export function parseSlot(raw: string | string[] | undefined, size: number) {
  if (typeof raw !== 'string' || !/^\d{1,3}$/.test(raw)) return null;
  const slot = Number(raw);
  return slot < size ? slot : null;
}
