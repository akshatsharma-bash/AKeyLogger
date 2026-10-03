import { uuid } from '../lib/uuid';
import type { Db, LoadType } from './types';

type Row = [
  name: string,
  sets: number,
  reps: string,
  rest: number,
  ss: string | null,
  load?: LoadType,
  step?: number,
  note?: string,
  suffix?: string,
];
type Day = {
  weekday: number;
  label: string;
  rest?: string | true;
  items?: Row[];
};

const W: LoadType = 'weighted';
const BW: LoadType = 'bodyweight';

export const SEED: Day[] = [
  {
    weekday: 1,
    label: 'Upper A',
    items: [
      ['Flat Barbell Bench Press', 3, '5-6', 150, null],
      ['Weighted Pull-Up (or Lat Pulldown)', 3, '5-6', 150, null],
      ['Standing Barbell Overhead Press', 3, '6-8', 120, null],
      ['T-Bar Row (landmine)', 2, '8-10', 90, null],
      ['Cable Triceps Pushdown', 2, '10-15', 60, 'A'],
      ['EZ-Bar Curl', 2, '10-15', 60, 'A'],
    ],
  },
  {
    weekday: 2,
    label: 'Lower A',
    items: [
      ['Barbell Back Squat', 3, '5-6', 150, null],
      ['Romanian Deadlift', 3, '6-8', 150, null],
      ['Leg Press', 2, '8-10', 90, null, W, 5, 'feet mid-to-low'],
      ['Lying Leg Curl', 2, '8-10', 90, null],
      ['Leg Press Calf Raise', 3, '10-15', 60, 'A', W, 5],
      ['Hanging Knee Raise', 2, '12-15', 60, 'A', BW],
    ],
  },
  {
    weekday: 3,
    label: 'Recovery & Mobility',
    rest: '10 min easy walk or cycle, thoracic rotations, hip flexor stretch + glute bridge, 90/90 hips, ankle mobility, band pull-aparts.',
  },
  {
    weekday: 4,
    label: 'Upper B',
    items: [
      ['Incline DB Press', 3, '8-10', 120, null, W, undefined, '~30°'],
      ['Lat Pulldown', 3, '8-10', 90, null, W, undefined, 'close/neutral grip'],
      ['Seated DB Shoulder Press', 2, '8-10', 90, null],
      ['Seated Cable Row', 2, '8-10', 75, null],
      ['Cable Lateral Raise', 2, '12-15', 60, 'A', W, 1.25],
      ['Reverse Pec Deck', 2, '12-15', 60, 'A'],
    ],
  },
  {
    weekday: 5,
    label: 'Lower B',
    items: [
      ['Smith Machine Squat', 3, '6-8', 120, null],
      ['Walking Lunge', 2, '8-10', 90, null, W, undefined, undefined, '/leg'],
      ['Hip Thrust', 3, '8-10', 90, null, W, 5],
      ['Leg Extension', 2, '10-15', 60, null],
      ['Seated Calf Raise', 2, '12-15', 60, 'A'],
      ['Ab Wheel', 2, '12-15', 60, 'A', BW],
    ],
  },
  {
    weekday: 6,
    label: 'Delts + Arms',
    items: [
      ['Smith Machine Seated Press', 2, '8-10', 90, null],
      ['Cable Lateral Raise', 3, '12-15', 60, null, W, 1.25],
      ['Cable Rear Delt Fly', 2, '12-15', 60, null, W, 1.25],
      ['Rope Triceps Pushdown', 2, '10-15', 60, 'A'],
      ['DB Curl', 2, '10-15', 60, 'A'],
      ['EZ-Bar Skull Crusher', 2, '12-15', 60, 'B'],
      ['DB Hammer Curl', 2, '12-15', 60, 'B'],
    ],
  },
  { weekday: 7, label: 'Rest', rest: true },
];

/** Seeds the program when there are no exercises. Returns true if it seeded. */
export async function seedIfEmpty(db: Db): Promise<boolean> {
  const { rows } = await db.execute('SELECT COUNT(*) AS n FROM exercises');
  if (Number(rows[0].n) > 0) return false;
  const now = new Date().toISOString();
  await db.transaction(async tx => {
    const exIds = new Map<string, string>(); // name -> id (shared exercises, e.g. Cable Lateral Raise)
    for (const day of SEED) {
      const dayId = uuid();
      await tx.execute(
        'INSERT INTO program_days (id, weekday, label, is_rest_day, rest_note) VALUES (?, ?, ?, ?, ?)',
        [
          dayId,
          day.weekday,
          day.label,
          day.rest ? 1 : 0,
          typeof day.rest === 'string' ? day.rest : null,
        ],
      );
      for (const [
        i,
        [name, sets, reps, rest, ss, load = W, step, note, suffix],
      ] of (day.items ?? []).entries()) {
        let exId = exIds.get(name);
        if (!exId) {
          exId = uuid();
          exIds.set(name, exId);
          await tx.execute(
            'INSERT INTO exercises (id, name, load_type, weight_step_kg, archived, created_at) VALUES (?, ?, ?, ?, 0, ?)',
            [exId, name, load, step ?? null, now],
          );
        }
        const [min, max] = reps.split('-').map(Number);
        await tx.execute(
          `INSERT INTO program_items (id, day_id, exercise_id, position, sets, rep_min, rep_max, rep_suffix, rest_seconds, superset_group, note)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            uuid(),
            dayId,
            exId,
            i,
            sets,
            min,
            max,
            suffix ?? null,
            rest,
            ss,
            note ?? null,
          ],
        );
      }
    }
  });
  return true;
}

/** Danger zone: delete everything (history, program, settings, meta except schema) and reseed the default program. */
export async function wipeAndReseed(db: Db) {
  await db.transaction(async tx => {
    for (const t of [
      'set_logs',
      'sessions',
      'program_items',
      'program_days',
      'exercises',
    ])
      await tx.execute(`DELETE FROM ${t}`);
    await tx.execute(
      "DELETE FROM meta WHERE key NOT IN ('schema_version', 'created_at')",
    );
  });
  await seedIfEmpty(db);
}
