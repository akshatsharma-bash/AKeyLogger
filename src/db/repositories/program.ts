import { uuid } from '../../lib/uuid';
import { getDb } from '../client';
import type { Exercise, Item, ProgramDay, ProgramItem } from '../types';

export interface DaySummary extends ProgramDay {
  item_count: number;
}

export async function listDays(): Promise<DaySummary[]> {
  const { rows } = await getDb().execute(
    `SELECT d.*, (SELECT COUNT(*) FROM program_items i WHERE i.day_id = d.id) AS item_count
     FROM program_days d ORDER BY d.weekday`,
  );
  return rows as unknown as DaySummary[];
}

export async function getDay(id: string): Promise<ProgramDay | null> {
  const { rows } = await getDb().execute(
    'SELECT * FROM program_days WHERE id = ?',
    [id],
  );
  return (rows[0] as unknown as ProgramDay) ?? null;
}

export async function updateDay(d: ProgramDay) {
  await getDb().execute(
    'UPDATE program_days SET label = ?, is_rest_day = ?, rest_note = ? WHERE id = ?',
    [d.label, d.is_rest_day, d.rest_note, d.id],
  );
}

const ITEM_COLS =
  'id, day_id, exercise_id, position, sets, rep_min, rep_max, rep_suffix, rest_seconds, superset_group, note';

export async function itemsForDay(dayId: string): Promise<Item[]> {
  const { rows } = await getDb().execute(
    `SELECT i.*, e.name AS e_name, e.load_type AS e_load_type, e.weight_step_kg AS e_step, e.archived AS e_archived, e.created_at AS e_created_at
     FROM program_items i JOIN exercises e ON e.id = i.exercise_id
     WHERE i.day_id = ? ORDER BY i.position`,
    [dayId],
  );
  return rows.map(r => {
    const { e_name, e_load_type, e_step, e_archived, e_created_at, ...item } =
      r;
    const exercise: Exercise = {
      id: String(item.exercise_id),
      name: String(e_name),
      load_type: e_load_type as Exercise['load_type'],
      weight_step_kg: (e_step as number | null) ?? null,
      archived: Number(e_archived),
      created_at: String(e_created_at),
    };
    return { ...(item as unknown as ProgramItem), exercise };
  });
}

export async function getItem(id: string): Promise<ProgramItem | null> {
  const { rows } = await getDb().execute(
    'SELECT * FROM program_items WHERE id = ?',
    [id],
  );
  return (rows[0] as unknown as ProgramItem) ?? null;
}

/** Insert (no id) or update. New items go to the end of the day. */
export async function saveItem(
  item: Omit<ProgramItem, 'id' | 'position'> & {
    id?: string;
    position?: number;
  },
): Promise<string> {
  const db = getDb();
  if (item.id) {
    await db.execute(
      `UPDATE program_items SET exercise_id = ?, sets = ?, rep_min = ?, rep_max = ?, rep_suffix = ?, rest_seconds = ?, superset_group = ?, note = ?
       WHERE id = ?`,
      [
        item.exercise_id,
        item.sets,
        item.rep_min,
        item.rep_max,
        item.rep_suffix,
        item.rest_seconds,
        item.superset_group,
        item.note,
        item.id,
      ],
    );
    return item.id;
  }
  const { rows } = await db.execute(
    'SELECT COALESCE(MAX(position), -1) + 1 AS p FROM program_items WHERE day_id = ?',
    [item.day_id],
  );
  const id = uuid();
  await db.execute(
    `INSERT INTO program_items (${ITEM_COLS}) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      item.day_id,
      item.exercise_id,
      Number(rows[0].p),
      item.sets,
      item.rep_min,
      item.rep_max,
      item.rep_suffix,
      item.rest_seconds,
      item.superset_group,
      item.note,
    ],
  );
  return id;
}

export const deleteItem = (id: string) =>
  getDb().execute('DELETE FROM program_items WHERE id = ?', [id]);

export async function reorderItems(orderedIds: string[]) {
  await getDb().transaction(async tx => {
    for (const [i, id] of orderedIds.entries())
      await tx.execute('UPDATE program_items SET position = ? WHERE id = ?', [
        i,
        id,
      ]);
  });
}
