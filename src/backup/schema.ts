import { z } from 'zod';

const id = z.string().min(1);
const iso = z.string().min(1);
const ymd = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const flag = z.union([z.literal(0), z.literal(1)]);
const int = z.number().int();

export const exerciseRow = z.object({
  id,
  name: z.string().min(1),
  load_type: z.enum(['weighted', 'bodyweight']),
  weight_step_kg: z.number().positive().nullable(),
  archived: flag,
  created_at: iso,
});

export const dayRow = z.object({
  id,
  weekday: int.min(1).max(7),
  label: z.string(),
  is_rest_day: flag,
  rest_note: z.string().nullable(),
});

export const itemRow = z.object({
  id,
  day_id: id,
  exercise_id: id,
  position: int,
  sets: int.min(1).max(10),
  rep_min: int.min(0),
  rep_max: int.min(0),
  rep_suffix: z.string().nullable(),
  rest_seconds: int.min(0),
  superset_group: z.string().nullable(),
  note: z.string().nullable(),
});

export const sessionRow = z.object({
  id,
  date: ymd,
  day_id: id.nullable(),
  weekday: int.min(1).max(7),
  started_at: iso,
  finished_at: iso.nullable(),
  note: z.string().nullable(),
});

export const setLogRow = z.object({
  id,
  session_id: id,
  exercise_id: id,
  set_index: int.min(0),
  weight_kg: z.number().min(0).nullable(),
  reps: int.min(0),
  is_extra: flag,
  completed_at: iso,
});

export const settingsSchema = z.object({
  units: z.enum(['kg', 'lb']),
  default_step_kg: z.number().positive(),
  timer_sound: z.boolean(),
  timer_haptics: z.boolean(),
});

export const backupSchema = z.object({
  app: z.literal('akey-logger'),
  schemaVersion: int.min(1),
  appVersion: z.string(),
  exportedAt: iso,
  counts: z.object({ sessions: int, set_logs: int }),
  data: z.object({
    exercises: z.array(exerciseRow),
    program_days: z.array(dayRow),
    program_items: z.array(itemRow),
    sessions: z.array(sessionRow),
    set_logs: z.array(setLogRow),
    settings: settingsSchema,
  }),
});

export type Backup = z.infer<typeof backupSchema>;
export type BackupData = Backup['data'];
