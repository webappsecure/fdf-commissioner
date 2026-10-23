import { runMigrations, type MigrationTarget } from './run-migrations';

const migrations = ['CREATE one', 'CREATE two', 'CREATE three'];

function fakeTarget(startVersion: number, failOn?: string) {
  const state = { version: startVersion, applied: [] as string[] };
  const target: MigrationTarget = {
    async getVersion() {
      return state.version;
    },
    async applyInTransaction(statement, version) {
      if (statement === failOn) throw new Error(`failed: ${statement}`);
      state.applied.push(statement);
      state.version = version;
    },
  };
  return { state, target };
}

describe('runMigrations', () => {
  it('runs every migration in order on a fresh database', async () => {
    const { state, target } = fakeTarget(0);
    await runMigrations(target, migrations);
    expect(state.applied).toEqual(migrations);
    expect(state.version).toBe(3);
  });

  it('runs only the migrations after the stored version', async () => {
    const { state, target } = fakeTarget(1);
    await runMigrations(target, migrations);
    expect(state.applied).toEqual(['CREATE two', 'CREATE three']);
    expect(state.version).toBe(3);
  });

  it('does nothing when already at the latest version', async () => {
    const { state, target } = fakeTarget(3);
    await runMigrations(target, migrations);
    expect(state.applied).toEqual([]);
    expect(state.version).toBe(3);
  });

  it('does nothing and keeps the version when the database is newer than the app', async () => {
    const { state, target } = fakeTarget(5);
    await runMigrations(target, migrations);
    expect(state.applied).toEqual([]);
    expect(state.version).toBe(5);
  });

  it('leaves the version unchanged and rethrows when a statement fails', async () => {
    const { state, target } = fakeTarget(0, 'CREATE two');
    await expect(runMigrations(target, migrations)).rejects.toThrow('failed: CREATE two');
    expect(state.applied).toEqual(['CREATE one']);
    expect(state.version).toBe(1);
  });
});
