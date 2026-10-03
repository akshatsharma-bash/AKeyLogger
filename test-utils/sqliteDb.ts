/* In-memory SQLite (Node's built-in node:sqlite) implementing the repository Db interface, so SQL runs for real in tests. */
import { setDb } from '../src/db/client';
import { migrate } from '../src/db/migrations';
import type { Db, Executor, Param } from '../src/db/types';

type Stmt = { all: (...p: Param[]) => Record<string, unknown>[] };
type Raw = { prepare: (sql: string) => Stmt; exec: (sql: string) => void };

export async function makeTestDb(): Promise<Db> {
  const { DatabaseSync } = (
    (globalThis as any).process as { getBuiltinModule: (m: string) => any }
  ).getBuiltinModule('node:sqlite');
  const raw: Raw = new DatabaseSync(':memory:');
  raw.exec('PRAGMA foreign_keys = ON');
  const execute: Executor['execute'] = async (sql, params = []) => ({
    rows: raw
      .prepare(sql)
      .all(...params)
      .map(r => ({ ...r })),
  });
  const db: Db = {
    execute,
    transaction: async fn => {
      raw.exec('BEGIN');
      try {
        await fn({ execute });
        raw.exec('COMMIT');
      } catch (e) {
        raw.exec('ROLLBACK');
        throw e;
      }
    },
  };
  setDb(db);
  await migrate(db);
  return db;
}
