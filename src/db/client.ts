import { open } from '@op-engineering/op-sqlite';
import type { Db } from './types';

let db: Db | null = null;

export async function openDb(): Promise<Db> {
  if (db) return db;
  const raw = open({ name: 'akey-logger.sqlite' });
  await raw.execute('PRAGMA journal_mode = WAL');
  await raw.execute('PRAGMA foreign_keys = ON');
  db = raw as unknown as Db;
  return db;
}

export function getDb(): Db {
  if (!db) throw new Error('DB not open');
  return db;
}

/** Tests inject an in-memory DB. */
export function setDb(next: Db | null) {
  db = next;
}
