import { migrations } from './migrations';

describe('migrations', () => {
  it('has a non-empty statement for each schema version, in order', () => {
    expect(migrations).toHaveLength(2);
    migrations.forEach((statement) => expect(statement.trim()).not.toBe(''));
    expect(migrations[0]).toContain('CREATE TABLE app_meta');
    expect(migrations[1]).toContain('CREATE TABLE roll_log');
  });
});
