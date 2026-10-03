import {
  pick,
  keepLocalCopy,
  types,
  errorCodes,
  isErrorWithCode,
} from '@react-native-documents/picker';
import ReactNativeBlobUtil from 'react-native-blob-util';
import { SCHEMA_VERSION } from '../db/migrations';
import { saveSettings } from '../db/repositories/meta';
import type { Db, Executor, Param } from '../db/types';
import { uuid } from '../lib/uuid';
import { TABLES } from './export';
import { migrateBackup } from './migrateBackup';
import { Backup, BackupData, backupSchema } from './schema';

/** Opens the picker and returns the file text, or null if cancelled. */
export async function pickBackupText(): Promise<string | null> {
  try {
    // allFiles too: some Android file managers mislabel JSON.
    const [file] = await pick({ type: [types.json, types.allFiles] });
    const [copy] = await keepLocalCopy({
      files: [{ uri: file.uri, fileName: file.name ?? 'backup.json' }],
      destination: 'cachesDirectory',
    });
    if (copy.status !== 'success') throw new Error(copy.copyError);
    const path = decodeURIComponent(copy.localUri.replace(/^file:\/\//, ''));
    return await ReactNativeBlobUtil.fs.readFile(path, 'utf8');
  } catch (e) {
    if (isErrorWithCode(e) && e.code === errorCodes.OPERATION_CANCELED)
      return null;
    throw e;
  }
}

export type Parsed =
  | { ok: true; backup: Backup }
  | { ok: false; error: string };

export function parseBackup(text: string): Parsed {
  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, error: 'This file is not valid JSON.' };
  }
  if (json?.app !== 'akey-logger')
    return { ok: false, error: 'This is not an AKey Logger backup file.' };
  const v = json.schemaVersion;
  if (!Number.isInteger(v) || v < 1)
    return { ok: false, error: 'The backup has an invalid schema version.' };
  if (v > SCHEMA_VERSION) {
    return {
      ok: false,
      error:
        'This backup is from a newer version of the app. Update the app, then import again.',
    };
  }
  if (v < SCHEMA_VERSION) {
    try {
      json = {
        ...json,
        schemaVersion: SCHEMA_VERSION,
        data: migrateBackup(v, json.data, SCHEMA_VERSION),
      };
    } catch (e) {
      return {
        ok: false,
        error: `Could not upgrade this backup: ${(e as Error).message}`,
      };
    }
  }
  const r = backupSchema.safeParse(json);
  if (!r.success) {
    const issue = r.error.issues[0];
    return {
      ok: false,
      error: `The backup is damaged (${issue.path.join('.')}: ${
        issue.message
      }).`,
    };
  }
  const fk = checkReferences(r.data.data);
  return fk ? { ok: false, error: fk } : { ok: true, backup: r.data };
}

/** Every foreign key must resolve within the file. Returns an error message or null. */
export function checkReferences(d: BackupData): string | null {
  const ex = new Set(d.exercises.map(e => e.id));
  const days = new Set(d.program_days.map(x => x.id));
  const sessions = new Set(d.sessions.map(s => s.id));
  for (const i of d.program_items) {
    if (!days.has(i.day_id))
      return `Program item ${i.id} points to a missing day.`;
    if (!ex.has(i.exercise_id))
      return `Program item ${i.id} points to a missing exercise.`;
  }
  for (const s of d.sessions)
    if (s.day_id && !days.has(s.day_id))
      return `Session ${s.date} points to a missing day.`;
  for (const l of d.set_logs) {
    if (!sessions.has(l.session_id))
      return `A set log points to a missing session.`;
    if (!ex.has(l.exercise_id))
      return `A set log points to a missing exercise.`;
  }
  return null;
}

const insert = (tx: Executor, table: string, row: Record<string, unknown>) => {
  const cols = Object.keys(row);
  return tx.execute(
    `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${cols
      .map(() => '?')
      .join(', ')})`,
    cols.map(c => row[c] as Param),
  );
};

/** Replace all data. One transaction; rolls back on any error. */
export async function replaceAll(db: Db, b: Backup) {
  await db.transaction(async tx => {
    for (const t of [...TABLES].reverse()) await tx.execute(`DELETE FROM ${t}`);
    for (const t of TABLES)
      for (const row of b.data[t]) await insert(tx, t, row);
    await saveSettings(b.data.settings, tx);
  });
}

export interface MergeResult {
  sessions: number;
  sets: number;
}

/**
 * Merge: rows that already exist are skipped, new rows get new ids.
 * Exercises match by id, then by name (case-insensitive). Days match by weekday.
 * Sessions match by id, then by (date, day). Set logs skip on (session, exercise, set_index).
 */
export async function mergeInto(
  db: Db,
  b: Backup,
  replaceProgram: boolean,
): Promise<MergeResult> {
  const d = b.data;
  const res: MergeResult = { sessions: 0, sets: 0 };
  await db.transaction(async tx => {
    const rows = async <T>(sql: string, p: Param[] = []) =>
      (await tx.execute(sql, p)).rows as unknown as T[];

    const exMap = new Map<string, string>();
    const existingEx = await rows<{ id: string; name: string }>(
      'SELECT id, name FROM exercises',
    );
    const byId = new Set(existingEx.map(e => e.id));
    const byName = new Map(
      existingEx.map(e => [e.name.trim().toLowerCase(), e.id]),
    );
    for (const e of d.exercises) {
      const hit = byId.has(e.id)
        ? e.id
        : byName.get(e.name.trim().toLowerCase());
      if (hit) exMap.set(e.id, hit);
      else {
        const nid = uuid();
        await insert(tx, 'exercises', { ...e, id: nid });
        exMap.set(e.id, nid);
        byName.set(e.name.trim().toLowerCase(), nid);
      }
    }

    const dayMap = new Map<string, string>();
    const localDays = await rows<{ id: string; weekday: number }>(
      'SELECT id, weekday FROM program_days',
    );
    for (const day of d.program_days) {
      const local = localDays.find(x => x.weekday === day.weekday);
      if (local) {
        dayMap.set(day.id, local.id);
        if (replaceProgram) {
          await tx.execute(
            'UPDATE program_days SET label = ?, is_rest_day = ?, rest_note = ? WHERE id = ?',
            [day.label, day.is_rest_day, day.rest_note, local.id],
          );
        }
      } else {
        const nid = uuid();
        await insert(tx, 'program_days', { ...day, id: nid });
        dayMap.set(day.id, nid);
      }
    }
    if (replaceProgram) {
      await tx.execute('DELETE FROM program_items');
      for (const it of d.program_items) {
        await insert(tx, 'program_items', {
          ...it,
          id: uuid(),
          day_id: dayMap.get(it.day_id)!,
          exercise_id: exMap.get(it.exercise_id)!,
        });
      }
    }

    const sessMap = new Map<string, string>();
    for (const s of d.sessions) {
      const dayId = s.day_id ? dayMap.get(s.day_id)! : null;
      const hit =
        (
          await rows<{ id: string }>('SELECT id FROM sessions WHERE id = ?', [
            s.id,
          ])
        )[0] ??
        (dayId
          ? (
              await rows<{ id: string }>(
                'SELECT id FROM sessions WHERE date = ? AND day_id = ?',
                [s.date, dayId],
              )
            )[0]
          : undefined);
      if (hit) sessMap.set(s.id, hit.id);
      else {
        const nid = uuid();
        await insert(tx, 'sessions', { ...s, id: nid, day_id: dayId });
        sessMap.set(s.id, nid);
        res.sessions++;
      }
    }

    for (const l of d.set_logs) {
      const sid = sessMap.get(l.session_id)!;
      const eid = exMap.get(l.exercise_id)!;
      const dup = await rows(
        'SELECT 1 FROM set_logs WHERE id = ? OR (session_id = ? AND exercise_id = ? AND set_index = ?)',
        [l.id, sid, eid, l.set_index],
      );
      if (dup.length) continue;
      await insert(tx, 'set_logs', {
        ...l,
        id: uuid(),
        session_id: sid,
        exercise_id: eid,
      });
      res.sets++;
    }
  });
  return res;
}

export function summarize(b: Backup) {
  const dates = b.data.sessions.map(s => s.date).sort();
  return {
    exportedAt: b.exportedAt,
    sessions: b.data.sessions.length,
    setLogs: b.data.set_logs.length,
    from: dates[0] ?? null,
    to: dates[dates.length - 1] ?? null,
    days: [...b.data.program_days]
      .sort((a, c) => a.weekday - c.weekday)
      .map(x => x.label),
  };
}
