import { migrations } from './migrations';

describe('migrations', () => {
  it('has a non-empty statement for each schema version', () => {
    expect(migrations.length).toBeGreaterThan(0);
    migrations.forEach((statement) => expect(statement.trim()).not.toBe(''));
  });

  it('keeps the shipped migrations in order', () => {
    expect(migrations[0]).toContain('CREATE TABLE app_meta');
    expect(migrations[1]).toContain('CREATE TABLE roll_log');
    expect(migrations[2]).toContain('CREATE TABLE leagues');
    expect(migrations[3]).toContain('CREATE TABLE conferences');
    expect(migrations[4]).toContain('CREATE TABLE divisions');
    expect(migrations[5]).toContain('CREATE TABLE teams');
    expect(migrations[6]).toContain('CREATE TABLE coaches');
    expect(migrations[7]).toContain('CREATE TABLE teams_new');
  });

  it('makes league names unique ignoring case and leaves Weekly Headline off by default', () => {
    expect(migrations[2]).toContain('COLLATE NOCASE UNIQUE');
    expect(migrations[2]).toContain('weekly_headline_enabled INTEGER NOT NULL DEFAULT 0');
  });

  it('rebuilds teams with a nullable alignment and keeps every row', () => {
    const rebuild = migrations[7];
    expect(rebuild).toMatch(/alignment TEXT,/);
    expect(rebuild).not.toMatch(/alignment TEXT NOT NULL/);
    expect(rebuild).toContain('INSERT INTO teams_new');
    expect(rebuild).toContain('FROM teams;');
    expect(rebuild).toContain('DROP TABLE teams;');
    expect(rebuild).toContain('ALTER TABLE teams_new RENAME TO teams;');
  });

  it('keeps the teams id counter above every team id the roll log mentions', () => {
    const keep = migrations[8];
    expect(keep).toContain("UPDATE sqlite_sequence SET seq = MAX(seq,");
    expect(keep).toContain("json_extract(context, '$.teamId')");
    expect(keep).toContain('json_valid(context)');
    expect(keep).toContain("INSERT INTO sqlite_sequence (name, seq)");
    expect(keep).toContain("NOT EXISTS (SELECT 1 FROM sqlite_sequence WHERE name = 'teams')");
  });

  it('adds players with a name that is unique per league ignoring case', () => {
    const players = migrations[9];
    expect(players).toContain('CREATE TABLE players');
    expect(players).toContain('pass_rating INTEGER,');
    expect(players).toContain('grade TEXT,');
    expect(players).toContain("qualities TEXT NOT NULL DEFAULT '[]'");
    expect(players).toContain('CREATE UNIQUE INDEX players_league_name ON players (league_id, name COLLATE NOCASE)');
  });
});
