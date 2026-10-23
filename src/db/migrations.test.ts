import { migrations } from './migrations';

describe('migrations', () => {
  it('has a non-empty statement for each schema version', () => {
    expect(migrations.length).toBeGreaterThan(0);
    migrations.forEach((statement) => expect(statement.trim()).not.toBe(''));
  });

  it('keeps the shipped migrations in order', () => {
    expect(migrations[0]).toContain('CREATE TABLE app_meta');
    expect(migrations[1]).toContain('CREATE TABLE roll_log');
  });
});
