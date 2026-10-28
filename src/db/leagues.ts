import { hasDuplicateName, validateLeagueName } from '@/leagues/league-input';
import { isLeagueSize, isValidStructure, type LeagueSize, type StructureId } from '@/leagues/structures';

import { getDatabase } from './database';

export type League = {
  id: number;
  name: string;
  size: LeagueSize;
  structure: StructureId;
  weeklyHeadlineEnabled: boolean;
  createdAt: string;
};

export type LeagueErrorCode = 'empty-name' | 'name-too-long' | 'duplicate-name' | 'invalid-structure';

export class LeagueError extends Error {
  constructor(readonly code: LeagueErrorCode) {
    super(code);
    this.name = 'LeagueError';
  }
}

type LeagueRow = {
  id: number;
  name: string;
  size: number;
  structure: string;
  weekly_headline_enabled: number;
  created_at: string;
};

const COLUMNS = 'id, name, size, structure, weekly_headline_enabled, created_at';

function toLeague(row: LeagueRow): League {
  if (!isLeagueSize(row.size) || !isValidStructure(row.size, row.structure)) {
    throw new Error(`League ${row.id} has an unsupported size or structure`);
  }
  return {
    id: row.id,
    name: row.name,
    size: row.size,
    structure: row.structure,
    weeklyHeadlineEnabled: row.weekly_headline_enabled === 1,
    createdAt: row.created_at,
  };
}

function checkedName(raw: string) {
  const result = validateLeagueName(raw);
  if (!result.ok) throw new LeagueError(result.error === 'empty' ? 'empty-name' : 'name-too-long');
  return result.name;
}

function isUniqueViolation(error: unknown) {
  return error instanceof Error && /UNIQUE constraint failed/i.test(error.message);
}

export async function listLeagues() {
  const db = await getDatabase();
  const rows = await db.getAllAsync<LeagueRow>(`SELECT ${COLUMNS} FROM leagues ORDER BY name COLLATE NOCASE`);
  return rows.map(toLeague);
}

export async function getLeague(id: number) {
  const db = await getDatabase();
  const row = await db.getFirstAsync<LeagueRow>(`SELECT ${COLUMNS} FROM leagues WHERE id = ?`, id);
  return row ? toLeague(row) : null;
}

export async function createLeague(input: {
  name: string;
  size: LeagueSize;
  structure: StructureId;
  weeklyHeadlineEnabled: boolean;
}) {
  const name = checkedName(input.name);
  if (!isValidStructure(input.size, input.structure)) throw new LeagueError('invalid-structure');
  const db = await getDatabase();
  if (hasDuplicateName(await listLeagues(), name)) throw new LeagueError('duplicate-name');
  try {
    const result = await db.runAsync(
      'INSERT INTO leagues (name, size, structure, weekly_headline_enabled, created_at) VALUES (?, ?, ?, ?, ?)',
      name,
      input.size,
      input.structure,
      input.weeklyHeadlineEnabled ? 1 : 0,
      new Date().toISOString(),
    );
    return result.lastInsertRowId;
  } catch (error) {
    if (isUniqueViolation(error)) throw new LeagueError('duplicate-name');
    throw error;
  }
}

// Size and structure are fixed until feature 16 (expansion), so only these two fields can change.
export async function updateLeague(id: number, input: { name: string; weeklyHeadlineEnabled: boolean }) {
  const name = checkedName(input.name);
  const db = await getDatabase();
  if (hasDuplicateName(await listLeagues(), name, id)) throw new LeagueError('duplicate-name');
  try {
    await db.runAsync(
      'UPDATE leagues SET name = ?, weekly_headline_enabled = ? WHERE id = ?',
      name,
      input.weeklyHeadlineEnabled ? 1 : 0,
      id,
    );
  } catch (error) {
    if (isUniqueViolation(error)) throw new LeagueError('duplicate-name');
    throw error;
  }
}

export async function deleteLeague(id: number) {
  const db = await getDatabase();
  // Children first, in one transaction, so a failure cannot leave a league without its teams.
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM players WHERE league_id = ?', id);
    await db.runAsync('DELETE FROM coaches WHERE league_id = ?', id);
    await db.runAsync('DELETE FROM teams WHERE league_id = ?', id);
    await db.runAsync('DELETE FROM divisions WHERE league_id = ?', id);
    await db.runAsync('DELETE FROM conferences WHERE league_id = ?', id);
    await db.runAsync('DELETE FROM leagues WHERE id = ?', id);
  });
}
