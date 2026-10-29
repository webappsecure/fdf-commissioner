import { findDraftProblem, type LeagueDraft } from '@/leagues/league-draft';
import { planLeagueRows } from '@/leagues/league-plan';
import type { CoachFocus, CoachSpecialty, GameDayQuality } from '@/rules/coach-tables';
import { recordRoll } from '@/rules/roll-log';

import { getDatabase } from './database';
import { getLeague } from './leagues';
import { sqliteRollLogStore } from './roll-log';

export type TeamsErrorCode = 'league-missing' | 'already-set-up' | 'invalid-draft';

export class TeamsError extends Error {
  constructor(
    readonly code: TeamsErrorCode,
    detail?: string,
  ) {
    super(detail ? `${code}: ${detail}` : code);
    this.name = 'TeamsError';
  }
}

export type TeamWithCoach = {
  id: number;
  location: string;
  name: string;
  primaryColor: string;
  secondaryColor: string;
  divisionId: number | null;
  divisionName: string | null;
  conferenceName: string | null;
  playerCount: number;
  coach: {
    name: string;
    age: number;
    focus: CoachFocus;
    specialty: CoachSpecialty;
    gameDayQuality: GameDayQuality;
  };
};

type TeamRow = {
  id: number;
  location: string;
  name: string;
  primary_color: string;
  secondary_color: string;
  division_id: number | null;
  division_name: string | null;
  conference_name: string | null;
  player_count: number;
  coach_name: string;
  coach_age: number;
  coach_focus: CoachFocus;
  coach_specialty: CoachSpecialty;
  coach_game_day: GameDayQuality;
};

export async function listTeams(leagueId: number): Promise<TeamWithCoach[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<TeamRow>(
    `SELECT t.id, t.location, t.name, t.primary_color, t.secondary_color, t.division_id,
            d.name AS division_name, c.name AS conference_name,
            (SELECT COUNT(*) FROM players p WHERE p.team_id = t.id) AS player_count,
            h.name AS coach_name, h.age AS coach_age, h.focus AS coach_focus,
            h.specialty AS coach_specialty, h.game_day_quality AS coach_game_day
     FROM teams t
     JOIN coaches h ON h.id = t.head_coach_id
     LEFT JOIN divisions d ON d.id = t.division_id
     LEFT JOIN conferences c ON c.id = t.conference_id
     WHERE t.league_id = ?
     ORDER BY t.division_id, t.id`,
    leagueId,
  );
  return rows.map((row) => ({
    id: row.id,
    location: row.location,
    name: row.name,
    primaryColor: row.primary_color,
    secondaryColor: row.secondary_color,
    divisionId: row.division_id,
    divisionName: row.division_name,
    conferenceName: row.conference_name,
    playerCount: row.player_count,
    coach: {
      name: row.coach_name,
      age: row.coach_age,
      focus: row.coach_focus,
      specialty: row.coach_specialty,
      gameDayQuality: row.coach_game_day,
    },
  }));
}

/**
 * Saves every conference, division, team and coach of a finished wizard in one transaction, and logs the coaches'
 * rolls. League id and group membership come from the route league and its layout, never from the draft.
 */
export async function createLeagueTeams(leagueId: number, draft: LeagueDraft) {
  const db = await getDatabase();
  await db.withTransactionAsync(async () => {
    const league = await getLeague(leagueId);
    if (!league) throw new TeamsError('league-missing');
    const existing = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) AS count FROM teams WHERE league_id = ?', leagueId);
    if ((existing?.count ?? 0) > 0) throw new TeamsError('already-set-up');
    const problem = findDraftProblem(league.size, league.structure, draft);
    if (problem) throw new TeamsError('invalid-draft', problem);

    const plan = planLeagueRows(league.size, league.structure, draft);

    const conferenceIds: number[] = [];
    for (const conference of plan.conferences) {
      const result = await db.runAsync('INSERT INTO conferences (league_id, name) VALUES (?, ?)', leagueId, conference.name);
      conferenceIds.push(result.lastInsertRowId);
    }
    const divisionIds: number[] = [];
    for (const division of plan.divisions) {
      const result = await db.runAsync(
        'INSERT INTO divisions (league_id, conference_id, name) VALUES (?, ?, ?)',
        leagueId,
        division.conferenceIndex ? conferenceIds[division.conferenceIndex - 1] : null,
        division.name,
      );
      divisionIds.push(result.lastInsertRowId);
    }

    for (const team of plan.teams) {
      const coachResult = await db.runAsync(
        `INSERT INTO coaches (league_id, name, age, focus, specialty, game_day_quality, status)
         VALUES (?, ?, ?, ?, ?, ?, 'active')`,
        leagueId,
        team.coach.name,
        team.coach.age,
        team.coach.focus,
        team.coach.specialty,
        team.coach.gameDayQuality,
      );
      const coachId = coachResult.lastInsertRowId;
      const teamResult = await db.runAsync(
        `INSERT INTO teams (league_id, location, name, primary_color, secondary_color, division_id, conference_id, head_coach_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        leagueId,
        team.location,
        team.name,
        team.primaryColor,
        team.secondaryColor,
        team.divisionIndex ? divisionIds[team.divisionIndex - 1] : null,
        team.conferenceIndex ? conferenceIds[team.conferenceIndex - 1] : null,
        coachId,
      );
      const teamId = teamResult.lastInsertRowId;
      await db.runAsync('UPDATE coaches SET team_id = ? WHERE id = ?', teamId, coachId);

      for (const { step, roll } of team.rolls) {
        await recordRoll(sqliteRollLogStore, roll, { leagueId, teamId, coachId, step });
      }
    }
  });
}
