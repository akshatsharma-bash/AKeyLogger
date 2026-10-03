import { getDb } from '../client';
import { DEFAULT_SETTINGS, Executor, Settings } from '../types';

export async function getMeta(
  key: string,
  ex: Executor = getDb(),
): Promise<string | null> {
  const { rows } = await ex.execute('SELECT value FROM meta WHERE key = ?', [
    key,
  ]);
  return rows.length ? String(rows[0].value) : null;
}

export async function setMeta(
  key: string,
  value: string,
  ex: Executor = getDb(),
) {
  await ex.execute('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)', [
    key,
    value,
  ]);
}

export async function getSettings(ex: Executor = getDb()): Promise<Settings> {
  const raw = await getMeta('settings', ex);
  if (!raw) return { ...DEFAULT_SETTINGS };
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export const saveSettings = (s: Settings, ex: Executor = getDb()) =>
  setMeta('settings', JSON.stringify(s), ex);
