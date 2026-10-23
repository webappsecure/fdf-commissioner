import * as SQLite from 'expo-sqlite';

import { migrations } from './migrations';
import { runMigrations } from './run-migrations';

const DATABASE_NAME = 'fdf-commissioner.db';

export let openStage = 'not started';

let opening: Promise<SQLite.SQLiteDatabase> | null = null;

function migrate(db: SQLite.SQLiteDatabase) {
  openStage = 'reading schema version';
  return runMigrations(
    {
      async getVersion() {
        const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
        return row?.user_version ?? 0;
      },
      applyInTransaction: (statement, version) =>
        db.withTransactionAsync(async () => {
          await db.execAsync(statement);
          await db.execAsync(`PRAGMA user_version = ${version}`);
        }),
      onStep: (version) => {
        openStage = `running migration ${version}`;
      },
    },
    migrations,
  );
}

export function getDatabase() {
  if (!opening) {
    openStage = 'opening database';
    opening = SQLite.openDatabaseAsync(DATABASE_NAME)
      .then(async (db) => {
        await migrate(db);
        openStage = 'ready';
        return db;
      })
      .catch((error) => {
        opening = null;
        throw error;
      });
  }
  return opening;
}

export async function getMeta(key: string) {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM app_meta WHERE key = ?',
    key,
  );
  return row?.value ?? null;
}

export async function setMeta(key: string, value: string) {
  const db = await getDatabase();
  await db.runAsync(
    'INSERT INTO app_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    key,
    value,
  );
}

export async function incrementLaunchCount() {
  const current = Number(await getMeta('launch_count'));
  const next = (Number.isFinite(current) ? current : 0) + 1;
  await setMeta('launch_count', String(next));
  return next;
}
