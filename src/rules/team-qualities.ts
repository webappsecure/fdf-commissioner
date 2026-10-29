import type { GameDayQuality } from './coach-tables';
import { QUALITY_PAIRS, type PlayerQuality, type PlayerRating, type QualityName } from './player-tables';

export type ScoringQuality = 'prolific' | 'prolific-semi' | 'neutral' | 'dull-semi' | 'dull';
export type PreventionQuality = 'staunch' | 'staunch-semi' | 'neutral' | 'inept-semi' | 'inept';
export type Tendency = 'P+' | 'P' | 'neutral' | 'R' | 'R+';

/** The part of a stored player that team qualities need. */
export type QualityPlayer = { position: string; rating: PlayerRating | null; qualities: readonly PlayerQuality[] };

export type TeamEvaluation = {
  offense: { sum: number; pass: number; run: number; scoring: ScoringQuality; tendency: Tendency; qualities: PlayerQuality[] };
  defense: { sum: number; prevention: PreventionQuality; qualities: PlayerQuality[] };
};

const OFFENSE_POSITIONS = new Set(['QB', 'RB', 'WR', 'TE', 'OL']);
const DEFENSE_POSITIONS = new Set(['DT', 'DE', 'LB', 'CB', 'FS', 'SS']);

/** Guide 5.1.1 and 5.2.1 share these bands: 28 or more, 25 to 27, 20 to 24, 17 to 19, 16 or less. */
function band(sum: number): 'high' | 'high-semi' | 'neutral' | 'low-semi' | 'low' {
  if (sum >= 28) return 'high';
  if (sum >= 25) return 'high-semi';
  if (sum >= 20) return 'neutral';
  if (sum >= 17) return 'low-semi';
  return 'low';
}

export function scoringQuality(sum: number): ScoringQuality {
  const result = band(sum);
  return result === 'high' ? 'prolific' : result === 'high-semi' ? 'prolific-semi' : result === 'low-semi' ? 'dull-semi' : result === 'low' ? 'dull' : 'neutral';
}

export function preventionQuality(sum: number): PreventionQuality {
  const result = band(sum);
  return result === 'high' ? 'staunch' : result === 'high-semi' ? 'staunch-semi' : result === 'low-semi' ? 'inept-semi' : result === 'low' ? 'inept' : 'neutral';
}

/** Guide 5.1.2: a gap of 3 or 4 is P or R, 5 or more is P+ or R+. */
export function tendencyOf(pass: number, run: number): Tendency {
  const gap = pass - run;
  if (gap >= 5) return 'P+';
  if (gap >= 3) return 'P';
  if (gap <= -5) return 'R+';
  if (gap <= -3) return 'R';
  return 'neutral';
}

/** The guide counts Evasive as Solid and Hesitant as Porous. */
const SAME_AS: Partial<Record<QualityName, QualityName>> = { evasive: 'solid', hesitant: 'porous' };

/**
 * Net count per opposite pair: a semi is one step and a full is two, toward the second quality of the pair
 * (negative toward the first). Two or more net steps is full, one is semi. Pairs that net to zero are omitted.
 */
export function combineTeamQualities(qualities: readonly PlayerQuality[]): PlayerQuality[] {
  const net = new Map<QualityName, number>();
  for (const quality of qualities) {
    const name = SAME_AS[quality.name] ?? quality.name;
    const pair = QUALITY_PAIRS.find((candidate) => candidate.includes(name));
    if (!pair) throw new Error(`Unknown quality ${name}`);
    const steps = quality.level === 'full' ? 2 : 1;
    net.set(pair[0], (net.get(pair[0]) ?? 0) + (name === pair[1] ? steps : -steps));
  }
  const result: PlayerQuality[] = [];
  for (const [first, second] of QUALITY_PAIRS) {
    const value = net.get(first) ?? 0;
    if (value === 0) continue;
    result.push({ name: value > 0 ? second : first, level: Math.abs(value) >= 2 ? 'full' : 'semi' });
  }
  return result;
}

function coachQualities(quality: GameDayQuality): PlayerQuality[] {
  if (quality === 'none') return [];
  return [{ name: quality.startsWith('efficient') ? 'efficient' : 'inefficient', level: quality.endsWith('semi') ? 'semi' : 'full' }];
}

function without(qualities: PlayerQuality[], name: QualityName) {
  return qualities.filter((quality) => quality.name !== name);
}

function ratingSums(players: readonly QualityPlayer[]) {
  let pass = 0;
  let run = 0;
  for (const player of players) {
    pass += player.rating?.pass ?? 0;
    run += player.rating?.run ?? 0;
  }
  return { pass, run, sum: pass + run };
}

/** Guide section 5: team qualities from the starters and the head coach's game-day quality (counted on offense). */
export function evaluateTeam(players: readonly QualityPlayer[], coachQuality: GameDayQuality): TeamEvaluation {
  const offensePlayers = players.filter((player) => OFFENSE_POSITIONS.has(player.position));
  const defensePlayers = players.filter((player) => DEFENSE_POSITIONS.has(player.position));

  const { pass, run, sum: offenseSum } = ratingSums(offensePlayers);
  const scoring = scoringQuality(offenseSum);
  let offenseQualities = combineTeamQualities([...offensePlayers.flatMap((player) => player.qualities), ...coachQualities(coachQuality)]);
  if (scoring === 'prolific' || scoring === 'prolific-semi') offenseQualities = without(offenseQualities, 'erratic');
  if (scoring === 'dull' || scoring === 'dull-semi') offenseQualities = without(offenseQualities, 'dynamic');

  const { sum: defenseSum } = ratingSums(defensePlayers);
  const prevention = preventionQuality(defenseSum);
  let defenseQualities = combineTeamQualities(defensePlayers.flatMap((player) => player.qualities));
  if (prevention === 'staunch' || prevention === 'staunch-semi') defenseQualities = without(defenseQualities, 'soft');
  if (prevention === 'inept' || prevention === 'inept-semi') defenseQualities = without(defenseQualities, 'stiff');

  return {
    offense: { sum: offenseSum, pass, run, scoring, tendency: tendencyOf(pass, run), qualities: offenseQualities },
    defense: { sum: defenseSum, prevention, qualities: defenseQualities },
  };
}
