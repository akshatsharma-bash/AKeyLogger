import { uuid } from '../../lib/uuid';
import { getDb } from '../client';
import type { Exercise, LoadType } from '../types';

export async function listExercises(
  includeArchived = false,
): Promise<Exercise[]> {
  const { rows } = await getDb().execute(
    `SELECT * FROM exercises ${
      includeArchived ? '' : 'WHERE archived = 0'
    } ORDER BY name COLLATE NOCASE`,
  );
  return rows as unknown as Exercise[];
}

export async function getExercise(id: string): Promise<Exercise | null> {
  const { rows } = await getDb().execute(
    'SELECT * FROM exercises WHERE id = ?',
    [id],
  );
  return (rows[0] as unknown as Exercise) ?? null;
}

export async function createExercise(
  name: string,
  load_type: LoadType,
  weight_step_kg: number | null,
): Promise<Exercise> {
  const ex: Exercise = {
    id: uuid(),
    name: name.trim(),
    load_type,
    weight_step_kg,
    archived: 0,
    created_at: new Date().toISOString(),
  };
  await getDb().execute(
    'INSERT INTO exercises (id, name, load_type, weight_step_kg, archived, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    [
      ex.id,
      ex.name,
      ex.load_type,
      ex.weight_step_kg,
      ex.archived,
      ex.created_at,
    ],
  );
  return ex;
}

/** Renaming applies everywhere (history is keyed by id). */
export async function updateExercise(
  id: string,
  patch: Pick<Exercise, 'name' | 'load_type' | 'weight_step_kg'>,
) {
  await getDb().execute(
    'UPDATE exercises SET name = ?, load_type = ?, weight_step_kg = ? WHERE id = ?',
    [patch.name.trim(), patch.load_type, patch.weight_step_kg, id],
  );
}

/** Exercises with history are archived, never deleted. Unused ones without history are deleted. */
export async function retireExerciseIfUnused(id: string) {
  const db = getDb();
  const used = await db.execute(
    'SELECT 1 FROM program_items WHERE exercise_id = ? LIMIT 1',
    [id],
  );
  if (used.rows.length) return;
  const hist = await db.execute(
    'SELECT 1 FROM set_logs WHERE exercise_id = ? LIMIT 1',
    [id],
  );
  if (hist.rows.length)
    await db.execute('UPDATE exercises SET archived = 1 WHERE id = ?', [id]);
  else await db.execute('DELETE FROM exercises WHERE id = ?', [id]);
}

export const unarchiveExercise = (id: string) =>
  getDb().execute('UPDATE exercises SET archived = 0 WHERE id = ?', [id]);
