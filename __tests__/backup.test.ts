import { makeTestDb } from '../test-utils/sqliteDb';
import { seedIfEmpty } from '../src/db/seed';
import { buildBackup } from '../src/backup/export';
import { mergeInto, parseBackup, replaceAll } from '../src/backup/import';
import { migrateBackup } from '../src/backup/migrateBackup';
import { getOrCreateSession } from '../src/db/repositories/sessions';
import { insertSet } from '../src/db/repositories/setLogs';
import { itemsForDay, listDays } from '../src/db/repositories/program';
import { getSettings, saveSettings } from '../src/db/repositories/meta';
import type { Db } from '../src/db/types';

async function phoneWithData() {
  const db = await makeTestDb();
  await seedIfEmpty(db);
  await saveSettings({
    units: 'lb',
    default_step_kg: 2.5,
    timer_sound: false,
    timer_haptics: true,
  });
  const days = await listDays();
  const [bench] = await itemsForDay(days[0].id);
  const s = await getOrCreateSession('2026-09-28', days[0].id, 1);
  for (let i = 0; i < 3; i++)
    await insertSet({
      session_id: s.id,
      exercise_id: bench.exercise_id,
      set_index: i,
      weight_kg: 60,
      reps: 6,
      is_extra: 0,
    });
  return db;
}

const dump = async (db: Db) => {
  const b = await buildBackup(db);
  return { ...b.data };
};

test('export shape', async () => {
  const db = await phoneWithData();
  const b = await buildBackup(db);
  expect(b.app).toBe('akey-logger');
  expect(b.schemaVersion).toBe(1);
  expect(b.counts).toEqual({ sessions: 1, set_logs: 3 });
  expect(Object.keys(b.data).sort()).toEqual([
    'exercises',
    'program_days',
    'program_items',
    'sessions',
    'set_logs',
    'settings',
  ]);
  expect(b.data.settings.units).toBe('lb');
  expect(parseBackup(JSON.stringify(b, null, 2)).ok).toBe(true);
});

describe('validation', () => {
  let text: string;
  beforeAll(async () => {
    text = JSON.stringify(await buildBackup(await phoneWithData()));
  });
  const mutate = (f: (j: any) => void) => {
    const j = JSON.parse(text);
    f(j);
    return parseBackup(JSON.stringify(j));
  };
  test('rejects wrong app', () =>
    expect(mutate(j => (j.app = 'other')).ok).toBe(false));
  test('rejects newer version with update message', () => {
    const r = mutate(j => (j.schemaVersion = 99));
    expect(r.ok).toBe(false);
    expect(!r.ok && r.error).toMatch(/newer version/);
  });
  test('rejects broken references', () => {
    const r = mutate(j => (j.data.set_logs[0].exercise_id = 'missing'));
    expect(!r.ok && r.error).toMatch(/missing exercise/);
  });
  test('rejects bad rows and non-JSON', () => {
    expect(mutate(j => (j.data.set_logs[0].reps = 'six')).ok).toBe(false);
    expect(parseBackup('{nope').ok).toBe(false);
  });
});

test('migrateBackup: identity at current version, throws on unknown step', () => {
  expect(migrateBackup(1, { a: 1 }, 1)).toEqual({ a: 1 });
  expect(() => migrateBackup(1, {}, 2)).toThrow(/version 2/);
});

test('replace on a fresh install reproduces everything exactly (phone switch)', async () => {
  const old = await phoneWithData();
  const before = await dump(old);
  const text = JSON.stringify(await buildBackup(old));

  const fresh = await makeTestDb();
  await seedIfEmpty(fresh); // new phone has its own seed with different ids
  const r = parseBackup(text);
  if (!r.ok) throw new Error(r.error);
  await replaceAll(fresh, r.backup);
  expect(await dump(fresh)).toEqual(before);
  expect((await getSettings()).units).toBe('lb');
});

test('merge: maps by name/weekday, skips existing, idempotent', async () => {
  const old = await phoneWithData();
  const backup = await buildBackup(old);

  const other = await makeTestDb();
  await seedIfEmpty(other);
  const r1 = await mergeInto(other, backup, false);
  expect(r1).toEqual({ sessions: 1, sets: 3 });
  const r2 = await mergeInto(other, backup, false);
  expect(r2).toEqual({ sessions: 0, sets: 0 });
  const ex = await other.execute('SELECT COUNT(*) AS n FROM exercises');
  expect(Number(ex.rows[0].n)).toBe(backup.data.exercises.length); // matched by name, no duplicates
});

test('rollback on failure leaves existing data untouched', async () => {
  const db = await phoneWithData();
  const before = await dump(db);
  const b = await buildBackup(db);
  const bad = {
    ...b,
    data: {
      ...b.data,
      set_logs: [...b.data.set_logs, { ...b.data.set_logs[0] }],
    },
  }; // duplicate PK
  await expect(replaceAll(db, bad)).rejects.toThrow();
  expect(await dump(db)).toEqual(before);
});
