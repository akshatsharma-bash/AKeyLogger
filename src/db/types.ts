export type LoadType = 'weighted' | 'bodyweight';

export interface Exercise {
  id: string;
  name: string;
  load_type: LoadType;
  weight_step_kg: number | null;
  archived: number;
  created_at: string;
}

export interface ProgramDay {
  id: string;
  weekday: number;
  label: string;
  is_rest_day: number;
  rest_note: string | null;
}

export interface ProgramItem {
  id: string;
  day_id: string;
  exercise_id: string;
  position: number;
  sets: number;
  rep_min: number;
  rep_max: number;
  rep_suffix: string | null;
  rest_seconds: number;
  superset_group: string | null;
  note: string | null;
}

export interface Session {
  id: string;
  date: string;
  day_id: string | null;
  weekday: number;
  started_at: string;
  finished_at: string | null;
  note: string | null;
}

export interface SetLog {
  id: string;
  session_id: string;
  exercise_id: string;
  set_index: number;
  weight_kg: number | null;
  reps: number;
  is_extra: number;
  completed_at: string;
}

export interface Settings {
  units: 'kg' | 'lb';
  default_step_kg: number;
  timer_sound: boolean;
  timer_haptics: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  units: 'kg',
  default_step_kg: 2.5,
  timer_sound: true,
  timer_haptics: true,
};

/** A program item joined with its exercise. */
export type Item = ProgramItem & { exercise: Exercise };

/** Sets from the most recent earlier session for one exercise. */
export interface LastSession {
  date: string;
  sets: SetLog[];
}

/** Minimal DB surface used by repositories; satisfied by op-sqlite's DB and Transaction. */
export type Param = string | number | null;
export interface Executor {
  execute: (
    sql: string,
    params?: Param[],
  ) => Promise<{ rows: Record<string, unknown>[] }>;
}
export interface Db extends Executor {
  transaction: (fn: (tx: Executor) => Promise<void>) => Promise<void>;
}
