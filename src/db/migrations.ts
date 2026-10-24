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
  `CREATE TABLE conferences (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    league_id INTEGER NOT NULL,
    name TEXT NOT NULL
  );`,
  `CREATE TABLE divisions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    league_id INTEGER NOT NULL,
    conference_id INTEGER,
    name TEXT NOT NULL
  );`,
  `CREATE TABLE teams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    league_id INTEGER NOT NULL,
    location TEXT NOT NULL,
    name TEXT NOT NULL,
    primary_color TEXT NOT NULL,
    secondary_color TEXT NOT NULL,
    alignment TEXT NOT NULL,
    division_id INTEGER,
    conference_id INTEGER,
    head_coach_id INTEGER
  );`,
  `CREATE TABLE coaches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    league_id INTEGER NOT NULL,
    team_id INTEGER,
    name TEXT NOT NULL,
    age INTEGER NOT NULL,
    focus TEXT NOT NULL,
    specialty TEXT NOT NULL,
    game_day_quality TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active'
  );`,
];
