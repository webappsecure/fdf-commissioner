export const migrations: readonly string[] = [
  `CREATE TABLE app_meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );`,
  `CREATE TABLE roll_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT NOT NULL,
    kind TEXT NOT NULL,
    table_name TEXT,
    dice INTEGER NOT NULL,
    modifiers TEXT NOT NULL DEFAULT '[]',
    final_roll INTEGER NOT NULL,
    outcome TEXT,
    manual INTEGER NOT NULL,
    context TEXT
  );`,
  `CREATE TABLE leagues (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL COLLATE NOCASE UNIQUE,
    size INTEGER NOT NULL,
    structure TEXT NOT NULL,
    weekly_headline_enabled INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );`,
];
