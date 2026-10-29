import { checkRosterPlans, type PlannedPlayer, type PlayerSlotPosition, type RosterPlan } from '@/leagues/roster-plan';
import type { Alignment } from '@/leagues/team-layout';
import { playerRolls } from '@/rules/player-creation';
import type { Electric } from '@/rules/special-teams-tables';
import type { PlayerGrade, PlayerQuality, PlayerRating, RatingPoint } from '@/rules/player-tables';
import { recordRoll } from '@/rules/roll-log';

import { getDatabase } from './database';
import { getLeague } from './leagues';
import { sqliteRollLogStore } from './roll-log';

export type RostersErrorCode =
  | 'league-missing'
  | 'no-teams'
  | 'already-rostered'
  | 'wrong-teams'
  | 'alignment-conflict'
  | 'invalid-roster'
  | 'duplicate-name';

export class RostersError extends Error {
  constructor(
    readonly code: RostersErrorCode,
    detail?: string,
  ) {
    super(detail ? `${code}: ${detail}` : code);
    this.name = 'RostersError';
  }
}

export type RosterTeam = {
  id: number;
  location: string;
  name: string;
  /** Null until roster creation flips it, unless the team already had one. */
  alignment: Alignment | null;
  playerCount: number;
};

export type StoredPlayer = {
  id: number;
  name: string;
  position: PlayerSlotPosition;
  slot: string | null;
  age: number;
  rating: PlayerRating | null;
  grade: PlayerGrade | null;
  qualities: PlayerQuality[];
  /** KR and PR only. Null for other positions and for rosters saved before special teams were rolled. */
  electric: Electric | null;
  /** K only: the top of the 11-NN success range, for example 62. Null as for `electric`. */
  fieldGoalRange: number | null;
  extraPointRange: number | null;
};

type RosterTeamRow = { id: number; location: string; name: string; alignment: Alignment | null; player_count: number };

type PlayerRow = {
  id: number;
  name: string;
  position: PlayerSlotPosition;
  slot: string | null;
  age: number;
  pass_rating: number | null;
  run_rating: number | null;
  grade: PlayerGrade | null;
  qualities: string;
  electric: Electric | null;
  fg_range: number | null;
  xp_range: number | null;
};

export async function listRosterTeams(leagueId: number): Promise<RosterTeam[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<RosterTeamRow>(
    `SELECT t.id, t.location, t.name, t.alignment,
            (SELECT COUNT(*) FROM players p WHERE p.team_id = t.id) AS player_count
     FROM teams t
     WHERE t.league_id = ?
     ORDER BY t.division_id, t.id`,
    leagueId,
  );
  return rows.map((row) => ({ id: row.id, location: row.location, name: row.name, alignment: row.alignment, playerCount: row.player_count }));
}

/** A team's players in insert order, which is the roster's display order. */
export async function listPlayers(teamId: number): Promise<StoredPlayer[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<PlayerRow>(
    `SELECT id, name, position, slot, age, pass_rating, run_rating, grade, qualities, electric, fg_range, xp_range
     FROM players WHERE team_id = ? ORDER BY id`,
    teamId,
  );
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    position: row.position,
    slot: row.slot,
    age: row.age,
    rating:
      row.pass_rating === null || row.run_rating === null
        ? null
        : { pass: row.pass_rating as RatingPoint, run: row.run_rating as RatingPoint },
    grade: row.grade,
    qualities: JSON.parse(row.qualities) as PlayerQuality[],
    electric: row.electric,
    fieldGoalRange: row.fg_range,
    extraPointRange: row.xp_range,
  }));
}

function insertPlayer(leagueId: number, teamId: number, player: PlannedPlayer) {
  const { draft } = player;
  const rating = draft.rating?.outcome;
  return [
    `INSERT INTO players (league_id, team_id, name, position, slot, age, pass_rating, run_rating, grade, qualities,
                          electric, fg_range, xp_range, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
    leagueId,
    teamId,
    player.name,
    player.position,
    player.slot,
    draft.age!.outcome!,
    rating ? rating.pass : null,
    rating ? rating.run : null,
    draft.grade?.outcome ?? null,
    JSON.stringify(draft.qualities),
    draft.electric?.outcome ?? null,
    draft.fieldGoal?.outcome ?? null,
    draft.extraPoint?.outcome ?? null,
  ] as const;
}

/**
 * Saves the rosters of every team in a league in one transaction, writes any alignment a team still lacks, and
 * logs every roll. League and team ids come from the route and the database, never from the plans' own claims.
 */
export async function createLeagueRosters(leagueId: number, plans: readonly RosterPlan[]) {
  const db = await getDatabase();
  await db.withTransactionAsync(async () => {
    const league = await getLeague(leagueId);
    if (!league) throw new RostersError('league-missing');
    const teams = await db.getAllAsync<{ id: number; alignment: Alignment | null }>(
      'SELECT id, alignment FROM teams WHERE league_id = ? ORDER BY id',
      leagueId,
    );
    if (teams.length === 0) throw new RostersError('no-teams');
    const existing = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) AS count FROM players WHERE league_id = ?', leagueId);
    if ((existing?.count ?? 0) > 0) throw new RostersError('already-rostered');
    const problem = checkRosterPlans(plans, teams);
    if (problem) throw new RostersError(problem.code, problem.detail);

    for (const plan of plans) {
      await db.runAsync('UPDATE teams SET alignment = ? WHERE id = ? AND alignment IS NULL', plan.alignment, plan.teamId);
      for (const player of plan.players) {
        const [sql, ...params] = insertPlayer(leagueId, plan.teamId, player);
        const result = await db.runAsync(sql, ...params);
        const playerId = result.lastInsertRowId;
        for (const { step, roll } of playerRolls(player.draft)) {
          await recordRoll(sqliteRollLogStore, roll, { leagueId, teamId: plan.teamId, playerId, step, position: player.position });
        }
      }
    }
  });
}
