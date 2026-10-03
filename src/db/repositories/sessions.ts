import { uuid } from '../../lib/uuid';
import { getDb } from '../client';
import type { Session } from '../types';

export interface SessionSummary extends Session {
  label: string | null;
  set_count: number;
}

export async function findSession(
  date: string,
  dayId: string,
): Promise<Session | null> {
  const { rows } = await getDb().execute(
    'SELECT * FROM sessions WHERE date = ? AND day_id = ?',
    [date, dayId],
  );
  return (rows[0] as unknown as Session) ?? null;
}

/** Created on the first logged set. Same day + date resumes the existing one. */
export async function getOrCreateSession(
  date: string,
  dayId: string,
  weekday: number,
): Promise<Session> {
  const existing = await findSession(date, dayId);
  if (existing) return existing;
  const s: Session = {
    id: uuid(),
    date,
    day_id: dayId,
    weekday,
    started_at: new Date().toISOString(),
    finished_at: null,
    note: null,
  };
  await getDb().execute(
    'INSERT INTO sessions (id, date, day_id, weekday, started_at, finished_at, note) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [s.id, s.date, s.day_id, s.weekday, s.started_at, s.finished_at, s.note],
  );
  return s;
}

export async function finishSession(id: string): Promise<string> {
  const at = new Date().toISOString();
  await getDb().execute('UPDATE sessions SET finished_at = ? WHERE id = ?', [
    at,
    id,
  ]);
  return at;
}

export async function listSessions(): Promise<SessionSummary[]> {
  const { rows } = await getDb().execute(
    `SELECT s.*, d.label AS label, (SELECT COUNT(*) FROM set_logs l WHERE l.session_id = s.id) AS set_count
     FROM sessions s LEFT JOIN program_days d ON d.id = s.day_id
     ORDER BY s.date DESC, s.started_at DESC`,
  );
  return rows as unknown as SessionSummary[];
}

export async function getSession(id: string): Promise<SessionSummary | null> {
  const { rows } = await getDb().execute(
    `SELECT s.*, d.label AS label, (SELECT COUNT(*) FROM set_logs l WHERE l.session_id = s.id) AS set_count
     FROM sessions s LEFT JOIN program_days d ON d.id = s.day_id WHERE s.id = ?`,
    [id],
  );
  return (rows[0] as unknown as SessionSummary) ?? null;
}

export const deleteSession = (id: string) =>
  getDb().execute('DELETE FROM sessions WHERE id = ?', [id]);

export async function countSessionsSince(iso: string | null): Promise<number> {
  const { rows } = iso
    ? await getDb().execute(
        'SELECT COUNT(*) AS n FROM sessions WHERE started_at > ?',
        [iso],
      )
    : await getDb().execute('SELECT COUNT(*) AS n FROM sessions');
  return Number(rows[0].n);
}
