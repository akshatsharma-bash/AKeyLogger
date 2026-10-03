import { makeTestDb } from '../test-utils/sqliteDb';
import { seedIfEmpty } from '../src/db/seed';
import { getOrCreateSession } from '../src/db/repositories/sessions';
import { insertSet, lastSessionFor } from '../src/db/repositories/setLogs';
import { itemsForDay, listDays } from '../src/db/repositories/program';
import type { Db } from '../src/db/types';

let db: Db;
beforeEach(async () => {
  db = await makeTestDb();
  await seedIfEmpty(db);
});

test('seed: 7 days, shared Cable Lateral Raise row, rest days', async () => {
  const days = await listDays();
  expect(days.map(d => d.label)).toEqual([
    'Upper A',
    'Lower A',
    'Recovery & Mobility',
    'Upper B',
    'Lower B',
    'Delts + Arms',
    'Rest',
  ]);
  expect(days.filter(d => d.is_rest_day).map(d => d.weekday)).toEqual([3, 7]);
  const thu = await itemsForDay(days[3].id);
  const sat = await itemsForDay(days[5].id);
  const lat = (xs: typeof thu) =>
    xs.find(i => i.exercise.name === 'Cable Lateral Raise')!;
  expect(lat(thu).exercise_id).toBe(lat(sat).exercise_id);
  expect(lat(thu).exercise.weight_step_kg).toBe(1.25);
  expect(sat.length).toBe(7);
  expect(await seedIfEmpty(db)).toBe(false);
});

describe('lastSession', () => {
  test('cross-day lookup and ignores today', async () => {
    const days = await listDays();
    const thu = (await itemsForDay(days[3].id)).find(
      i => i.exercise.name === 'Cable Lateral Raise',
    )!;
    const sat = days[5];

    const s1 = await getOrCreateSession('2026-10-01', days[3].id, 4); // Thursday
    await insertSet({
      session_id: s1.id,
      exercise_id: thu.exercise_id,
      set_index: 0,
      weight_kg: 10,
      reps: 15,
      is_extra: 0,
    });
    const today = await getOrCreateSession('2026-10-03', sat.id, 6);
    await insertSet({
      session_id: today.id,
      exercise_id: thu.exercise_id,
      set_index: 0,
      weight_kg: 12.5,
      reps: 12,
      is_extra: 0,
    });

    const last = await lastSessionFor(thu.exercise_id, '2026-10-03');
    expect(last?.date).toBe('2026-10-01');
    expect(last?.sets.map(s => s.weight_kg)).toEqual([10]);
    expect(await lastSessionFor('nope', '2026-10-03')).toBeNull();
  });

  test('same day and date resumes the existing session', async () => {
    const d = (await listDays())[0];
    const a = await getOrCreateSession('2026-10-03', d.id, 1);
    const b = await getOrCreateSession('2026-10-03', d.id, 1);
    expect(a.id).toBe(b.id);
  });
});
