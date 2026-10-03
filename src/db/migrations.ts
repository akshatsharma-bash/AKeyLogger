import type { Db, Executor } from './types';

export const SCHEMA_VERSION = 1;

export const migrations: {
  version: number;
  up: (tx: Executor) => Promise<void>;
}[] = [
  {
    version: 1,
    up: async tx => {
      const stmts = [
        `CREATE TABLE IF NOT EXISTS exercises (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          load_type TEXT NOT NULL DEFAULT 'weighted',
          weight_step_kg REAL,
          archived INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL)`,
        `CREATE TABLE IF NOT EXISTS program_days (
          id TEXT PRIMARY KEY,
          weekday INTEGER NOT NULL UNIQUE,
          label TEXT NOT NULL,
          is_rest_day INTEGER NOT NULL DEFAULT 0,
          rest_note TEXT)`,
        `CREATE TABLE IF NOT EXISTS program_items (
          id TEXT PRIMARY KEY,
          day_id TEXT NOT NULL REFERENCES program_days(id) ON DELETE CASCADE,
          exercise_id TEXT NOT NULL REFERENCES exercises(id),
          position INTEGER NOT NULL,
          sets INTEGER NOT NULL CHECK (sets BETWEEN 1 AND 10),
          rep_min INTEGER NOT NULL,
          rep_max INTEGER NOT NULL,
          rep_suffix TEXT,
          rest_seconds INTEGER NOT NULL,
          superset_group TEXT,
          note TEXT,
          UNIQUE (day_id, exercise_id))`,
        `CREATE TABLE IF NOT EXISTS sessions (
          id TEXT PRIMARY KEY,
          date TEXT NOT NULL,
          day_id TEXT REFERENCES program_days(id) ON DELETE SET NULL,
          weekday INTEGER NOT NULL,
          started_at TEXT NOT NULL,
          finished_at TEXT,
          note TEXT,
          UNIQUE (date, day_id))`,
        `CREATE TABLE IF NOT EXISTS set_logs (
          id TEXT PRIMARY KEY,
          session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
          exercise_id TEXT NOT NULL REFERENCES exercises(id),
          set_index INTEGER NOT NULL,
          weight_kg REAL,
          reps INTEGER NOT NULL,
          is_extra INTEGER NOT NULL DEFAULT 0,
          completed_at TEXT NOT NULL,
          UNIQUE (session_id, exercise_id, set_index))`,
        'CREATE INDEX IF NOT EXISTS idx_set_logs_exercise ON set_logs(exercise_id, completed_at)',
        'CREATE INDEX IF NOT EXISTS idx_sessions_date ON sessions(date)',
      ];
      for (const s of stmts) await tx.execute(s);
    },
  },
];

/** Runs pending migrations in one transaction. Returns the resulting schema version. */
export async function migrate(db: Db): Promise<number> {
  await db.execute(
    'CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)',
  );
  const { rows } = await db.execute(
    "SELECT value FROM meta WHERE key = 'schema_version'",
  );
  const current = rows.length ? Number(rows[0].value) : 0;
  const pending = migrations.filter(m => m.version > current);
  if (!pending.length) return current;
  await db.transaction(async tx => {
    for (const m of pending) await m.up(tx);
    const v = pending[pending.length - 1].version;
    await tx.execute(
      "INSERT OR REPLACE INTO meta (key, value) VALUES ('schema_version', ?)",
      [String(v)],
    );
    if (current === 0) {
      await tx.execute(
        "INSERT OR IGNORE INTO meta (key, value) VALUES ('created_at', ?)",
        [new Date().toISOString()],
      );
    }
  });
  return pending[pending.length - 1].version;
}
