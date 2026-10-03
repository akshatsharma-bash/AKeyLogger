import { uuid } from '../../lib/uuid';
import { getDb } from '../client';
import type { LastSession, SetLog } from '../types';

export async function logsForSession(sessionId: string): Promise<SetLog[]> {
  const { rows } = await getDb().execute(
    'SELECT * FROM set_logs WHERE session_id = ? ORDER BY completed_at',
    [sessionId],
  );
  return rows as unknown as SetLog[];
}

export async function insertSet(
  input: Omit<SetLog, 'id' | 'completed_at'>,
): Promise<SetLog> {
  const row: SetLog = {
    ...input,
    id: uuid(),
    completed_at: new Date().toISOString(),
  };
  await getDb().execute(
    'INSERT INTO set_logs (id, session_id, exercise_id, set_index, weight_kg, reps, is_extra, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [
      row.id,
      row.session_id,
      row.exercise_id,
      row.set_index,
      row.weight_kg,
      row.reps,
      row.is_extra,
      row.completed_at,
    ],
  );
  return row;
}

export const updateSet = (id: string, weight_kg: number | null, reps: number) =>
  getDb().execute('UPDATE set_logs SET weight_kg = ?, reps = ? WHERE id = ?', [
    weight_kg,
    reps,
    id,
  ]);

export const deleteSet = (id: string) =>
  getDb().execute('DELETE FROM set_logs WHERE id = ?', [id]);

/**
 * Most recent session strictly before `today` (tie-break started_at) with at least one log for the exercise.
 * Works across program days.
 */
export async function lastSessionFor(
  exerciseId: string,
  today: string,
): Promise<LastSession | null> {
  const db = getDb();
  const { rows } = await db.execute(
    `SELECT s.id, s.date FROM sessions s
     WHERE s.date < ? AND EXISTS (SELECT 1 FROM set_logs l WHERE l.session_id = s.id AND l.exercise_id = ?)
     ORDER BY s.date DESC, s.started_at DESC LIMIT 1`,
    [today, exerciseId],
  );
  if (!rows.length) return null;
  const sets = await db.execute(
    'SELECT * FROM set_logs WHERE session_id = ? AND exercise_id = ? ORDER BY set_index',
    [String(rows[0].id), exerciseId],
  );
  return { date: String(rows[0].date), sets: sets.rows as unknown as SetLog[] };
}

export interface HistoryRow extends SetLog {
  date: string;
}

export async function historyForExercise(
  exerciseId: string,
): Promise<HistoryRow[]> {
  const { rows } = await getDb().execute(
    `SELECT l.*, s.date AS date FROM set_logs l JOIN sessions s ON s.id = l.session_id
     WHERE l.exercise_id = ? ORDER BY s.date DESC, l.set_index`,
    [exerciseId],
  );
  return rows as unknown as HistoryRow[];
}

/** Logs for a session joined with exercise names, in program order where possible. */
export async function sessionDetail(sessionId: string) {
  const { rows } = await getDb().execute(
    `SELECT l.*, e.name AS exercise_name, e.load_type AS load_type,
       COALESCE((SELECT i.position FROM program_items i JOIN sessions s ON s.day_id = i.day_id
                 WHERE s.id = l.session_id AND i.exercise_id = l.exercise_id), 999) AS pos
     FROM set_logs l JOIN exercises e ON e.id = l.exercise_id
     WHERE l.session_id = ? ORDER BY pos, l.exercise_id, l.set_index`,
    [sessionId],
  );
  return rows as unknown as (SetLog & {
    exercise_name: string;
    load_type: string;
    pos: number;
  })[];
}
