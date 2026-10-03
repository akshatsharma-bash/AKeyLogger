import ReactNativeBlobUtil from 'react-native-blob-util';
import Share from 'react-native-share';
import { Platform } from 'react-native';
import { getDb } from '../db/client';
import { SCHEMA_VERSION } from '../db/migrations';
import { getSettings, setMeta } from '../db/repositories/meta';
import type { Db } from '../db/types';
import { fileStamp } from '../lib/dates';
import { APP_VERSION } from '../version';
import type { Backup, BackupData } from './schema';

export const TABLES = [
  'exercises',
  'program_days',
  'program_items',
  'sessions',
  'set_logs',
] as const;

export async function buildBackup(db: Db): Promise<Backup> {
  const data = {} as BackupData;
  await db.transaction(async tx => {
    for (const t of TABLES)
      (data as any)[t] = (
        await tx.execute(`SELECT * FROM ${t} ORDER BY rowid`)
      ).rows;
    data.settings = await getSettings(tx);
  });
  return {
    app: 'akey-logger',
    schemaVersion: SCHEMA_VERSION,
    appVersion: APP_VERSION,
    exportedAt: new Date().toISOString(),
    counts: { sessions: data.sessions.length, set_logs: data.set_logs.length },
    data,
  };
}

export const backupFileName = (d = new Date()) =>
  `akey-logger-backup-${fileStamp(d)}.json`;

/** Writes the backup JSON to the cache dir and returns its path and name. */
export async function writeBackupFile(): Promise<{
  path: string;
  name: string;
}> {
  const backup = await buildBackup(getDb());
  const name = backupFileName();
  const path = `${ReactNativeBlobUtil.fs.dirs.CacheDir}/${name}`;
  await ReactNativeBlobUtil.fs.writeFile(
    path,
    JSON.stringify(backup, null, 2),
    'utf8',
  );
  return { path, name };
}

/** Share sheet: Drive, Files, WhatsApp, email. Returns true unless the user dismissed it. */
export async function exportBackup(): Promise<boolean> {
  const { path, name } = await writeBackupFile();
  const r = await Share.open({
    url: `file://${path}`,
    type: 'application/json',
    filename: name,
    failOnCancel: false,
  });
  if (r.dismissedAction) return false;
  await setMeta('last_backup_at', new Date().toISOString());
  return true;
}

/** Android 10+: copy into the public Downloads collection. Returns a human-readable location. */
export async function saveToDownloads(): Promise<string> {
  if (Platform.OS !== 'android') throw new Error('Android only');
  const { path, name } = await writeBackupFile();
  const fd = {
    name,
    parentFolder: '',
    mimeType: 'application/json',
  } as unknown as Parameters<
    typeof ReactNativeBlobUtil.MediaCollection.copyToMediaStore
  >[0];
  await ReactNativeBlobUtil.MediaCollection.copyToMediaStore(
    fd,
    'Download',
    path,
  );
  await setMeta('last_backup_at', new Date().toISOString());
  return `Downloads/${name}`;
}
