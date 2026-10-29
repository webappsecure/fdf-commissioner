import type { PlayerSlotPosition, PlannedPlayer } from './roster-plan';
import type { StoredPlayer } from '@/db/players';
import { ratingText, type PlayerGrade, type PlayerQuality, type PlayerRating } from '@/rules/player-tables';

export type PlayerUnit = 'Offense' | 'Defense' | 'Special teams';

export const PLAYER_UNITS: readonly PlayerUnit[] = ['Offense', 'Defense', 'Special teams'];

/** One roster line's data, whether the player is a draft or stored. */
export type PlayerLine = {
  slot: string;
  position: PlayerSlotPosition;
  name: string;
  age: number;
  rating: PlayerRating | null;
  grade: PlayerGrade | null;
  qualities: PlayerQuality[];
};

export function unitOf(position: PlayerSlotPosition): PlayerUnit {
  switch (position) {
    case 'QB':
    case 'RB':
    case 'WR':
    case 'TE':
    case 'OL':
      return 'Offense';
    case 'DT':
    case 'DE':
    case 'LB':
    case 'CB':
    case 'FS':
    case 'SS':
      return 'Defense';
    default:
      return 'Special teams';
  }
}

function describeQuality(quality: PlayerQuality) {
  const name = quality.name.charAt(0).toUpperCase() + quality.name.slice(1);
  return quality.level === 'semi' ? `semi ${name}` : name;
}

/** Age, rating or grade, then qualities, for example `27  1/1  Reliable, semi Dynamic`. */
export function describePlayer(player: Pick<PlayerLine, 'age' | 'rating' | 'grade' | 'qualities'>) {
  const parts = [String(player.age)];
  if (player.rating) parts.push(ratingText(player.rating));
  else if (player.grade) parts.push(`Grade ${player.grade}`);
  if (player.qualities.length > 0) parts.push(player.qualities.map(describeQuality).join(', '));
  return parts.join('  ');
}

export function lineFromPlanned(player: PlannedPlayer): PlayerLine {
  const { draft } = player;
  return {
    slot: player.slot,
    position: player.position,
    name: player.name,
    age: draft.age?.outcome ?? 0,
    rating: draft.rating?.outcome ?? null,
    grade: draft.grade?.outcome ?? null,
    qualities: draft.qualities,
  };
}

export function lineFromStored(player: StoredPlayer): PlayerLine {
  return {
    slot: player.slot ?? player.position,
    position: player.position,
    name: player.name,
    age: player.age,
    rating: player.rating,
    grade: player.grade,
    qualities: player.qualities,
  };
}
