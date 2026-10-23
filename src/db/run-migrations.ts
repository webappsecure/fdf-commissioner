export type MigrationTarget = {
  getVersion(): Promise<number>;
  /** Runs the statement and sets the schema version in one transaction. */
  applyInTransaction(statement: string, version: number): Promise<void>;
  onStep?(version: number): void;
};

/** Applies each migration newer than the stored schema version, in order. */
export async function runMigrations(target: MigrationTarget, migrations: readonly string[]) {
  const current = await target.getVersion();

  for (let version = current; version < migrations.length; version++) {
    target.onStep?.(version + 1);
    await target.applyInTransaction(migrations[version], version + 1);
  }
}
