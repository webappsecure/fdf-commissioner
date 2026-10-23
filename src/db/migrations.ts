export const migrations: readonly string[] = [
  `CREATE TABLE app_meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );`,
];
