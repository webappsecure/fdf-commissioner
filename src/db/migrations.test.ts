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
  });

  it('makes league names unique ignoring case and leaves Weekly Headline off by default', () => {
    expect(migrations[2]).toContain('COLLATE NOCASE UNIQUE');
    expect(migrations[2]).toContain('weekly_headline_enabled INTEGER NOT NULL DEFAULT 0');
  });
});
