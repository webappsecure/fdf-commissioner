import type { RollLogEntry, RollLogStore } from '@/rules/roll-log';

import { getDatabase } from './database';

export const sqliteRollLogStore: RollLogStore = {
  async append(entry: RollLogEntry) {
    const db = await getDatabase();
    const result = await db.runAsync(
      `INSERT INTO roll_log (created_at, kind, table_name, dice, modifiers, final_roll, outcome, manual, context)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      entry.createdAt,
      entry.kind,
      entry.tableName,
      entry.dice,
      JSON.stringify(entry.modifiers),
      entry.finalRoll,
      entry.outcome === null || entry.outcome === undefined ? null : JSON.stringify(entry.outcome),
      entry.manual ? 1 : 0,
      entry.context === null || entry.context === undefined ? null : JSON.stringify(entry.context),
    );
    return result.lastInsertRowId;
  },
};
