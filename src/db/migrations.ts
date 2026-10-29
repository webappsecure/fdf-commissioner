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
  // Alignment moves to roster creation (feature 5), so it is unset for new teams. SQLite cannot drop NOT NULL in place.
  `CREATE TABLE teams_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    league_id INTEGER NOT NULL,
    location TEXT NOT NULL,
    name TEXT NOT NULL,
    primary_color TEXT NOT NULL,
    secondary_color TEXT NOT NULL,
    alignment TEXT,
    division_id INTEGER,
    conference_id INTEGER,
    head_coach_id INTEGER
  );
  INSERT INTO teams_new (id, league_id, location, name, primary_color, secondary_color, alignment, division_id, conference_id, head_coach_id)
    SELECT id, league_id, location, name, primary_color, secondary_color, alignment, division_id, conference_id, head_coach_id FROM teams;
  DROP TABLE teams;
  ALTER TABLE teams_new RENAME TO teams;`,
  // Migration 8 reset the teams id counter to the highest id still present, so a deleted team's id could be reused.
  // Roll-log rows still name those ids in their context, so keep the counter above every id they mention.
  `UPDATE sqlite_sequence SET seq = MAX(seq, COALESCE((SELECT MAX(CAST(json_extract(context, '$.teamId') AS INTEGER)) FROM roll_log WHERE context IS NOT NULL AND json_valid(context)), 0)) WHERE name = 'teams';
  INSERT INTO sqlite_sequence (name, seq)
    SELECT 'teams', COALESCE((SELECT MAX(CAST(json_extract(context, '$.teamId') AS INTEGER)) FROM roll_log WHERE context IS NOT NULL AND json_valid(context)), 0)
    WHERE COALESCE((SELECT MAX(CAST(json_extract(context, '$.teamId') AS INTEGER)) FROM roll_log WHERE context IS NOT NULL AND json_valid(context)), 0) > 0 AND NOT EXISTS (SELECT 1 FROM sqlite_sequence WHERE name = 'teams');`,
  // Feature 5b: starters and, later, free agents. Names are unique per league ignoring ASCII case, like league names.
  `CREATE TABLE players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    league_id INTEGER NOT NULL,
    team_id INTEGER,
    name TEXT NOT NULL,
    position TEXT NOT NULL,
    slot TEXT,
    age INTEGER NOT NULL,
    pass_rating INTEGER,
    run_rating INTEGER,
    grade TEXT,
    qualities TEXT NOT NULL DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'active'
  );
  CREATE UNIQUE INDEX players_league_name ON players (league_id, name COLLATE NOCASE);`,
  // Special teams rolls (guide 5.3): ELECTRIC for KR and PR ('none', 'semi', 'full'), and the top of the 11-NN FG and XP
  // success ranges for K. NULL for other positions and for rosters saved before this migration.
  `ALTER TABLE players ADD COLUMN electric TEXT;
  ALTER TABLE players ADD COLUMN fg_range INTEGER;
  ALTER TABLE players ADD COLUMN xp_range INTEGER;`,
];
