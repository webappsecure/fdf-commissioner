import type { PlayerSlotPosition, PlannedPlayer } from './roster-plan';
import type { StoredPlayer } from '@/db/players';
import { rangeText, type Electric } from '@/rules/special-teams-tables';
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

export function describeQuality(quality: PlayerQuality) {
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

function shout(name: string, semi: boolean) {
  return `${name.toUpperCase()}${semi ? '•' : ''}`;
}

/**
 * A team's qualities as the guide prints them: capitals, a bullet after a semi quality, for example
 * `PROLIFIC•, SOLID, INEFFICIENT`. The scoring or prevention quality (`prolific-semi`, `neutral`) comes first.
 */
export function describeTeamQualities(rating: string, qualities: readonly PlayerQuality[]) {
  const labels: string[] = [];
  if (rating !== 'neutral') {
    const [name, semi] = rating.split('-');
    labels.push(shout(name, Boolean(semi)));
  }
  for (const quality of qualities) labels.push(shout(quality.name, quality.level === 'semi'));
  return labels.length === 0 ? 'None' : labels.join(', ');
}

type SpecialTeamsPlayer = Pick<StoredPlayer, 'position' | 'name' | 'electric' | 'fieldGoalRange' | 'extraPointRange'>;

const NOT_ROLLED = 'Not rolled';

function describeElectric(electric: Electric | null) {
  if (electric === null) return NOT_ROLLED;
  return electric === 'none' ? 'No quality' : electric === 'semi' ? 'ELECTRIC•' : 'ELECTRIC';
}

/** The Special teams card: returns (each returner with ELECTRIC or no quality) and kicking (the kicker's FG and XP ranges). */
export function summarizeSpecialTeams(players: readonly SpecialTeamsPlayer[]) {
  const find = (position: string) => players.find((player) => player.position === position);
  const kick = find('KR');
  const punt = find('PR');
  const kicker = find('K');
  const range = (top: number | null | undefined) => (top == null ? NOT_ROLLED : rangeText(top));
  return [
    {
      title: 'Returns',
      rows: [
        { label: 'Kick returner', value: kick ? kick.name : '-' },
        { label: 'Kick quality', value: describeElectric(kick?.electric ?? null) },
        { label: 'Punt returner', value: punt ? punt.name : '-' },
        { label: 'Punt quality', value: describeElectric(punt?.electric ?? null) },
      ],
    },
    {
      title: 'Kicking',
      rows: [
        { label: 'Kicker', value: kicker ? kicker.name : '-' },
        { label: 'FG range', value: range(kicker?.fieldGoalRange) },
        { label: 'XP range', value: range(kicker?.extraPointRange) },
      ],
    },
  ];
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
