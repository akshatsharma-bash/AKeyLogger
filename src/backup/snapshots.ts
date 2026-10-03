import ReactNativeBlobUtil from 'react-native-blob-util';
import { getDb } from '../db/client';
import { getMeta, setMeta } from '../db/repositories/meta';
import { fileStamp, localDate } from '../lib/dates';
import { buildBackup } from './export';

const KEEP = 3;
const dir = () => `${ReactNativeBlobUtil.fs.dirs.DocumentDir}/auto-backups`;

/** Local safety snapshot. Protects against bad imports, not phone loss. Keeps the latest 3. */
export async function writeSnapshot(): Promise<string> {
  const fs = ReactNativeBlobUtil.fs;
  if (!(await fs.exists(dir()))) await fs.mkdir(dir());
  const now = new Date();
  const path = `${dir()}/akey-snapshot-${fileStamp(now)}-${String(
    now.getSeconds(),
  ).padStart(2, '0')}.json`;
  await fs.writeFile(path, JSON.stringify(await buildBackup(getDb())), 'utf8');
  const files = (await fs.ls(dir()))
    .filter(f => f.startsWith('akey-snapshot-'))
    .sort();
  for (const old of files.slice(0, Math.max(0, files.length - KEEP)))
    await fs.unlink(`${dir()}/${old}`);
  return path;
}

/** On finishing a session: at most once per day. */
export async function maybeDailySnapshot() {
  const today = localDate();
  if ((await getMeta('last_snapshot_date')) === today) return;
  await writeSnapshot();
  await setMeta('last_snapshot_date', today);
}
