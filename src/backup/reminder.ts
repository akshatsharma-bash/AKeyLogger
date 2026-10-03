import { getMeta, setMeta } from '../db/repositories/meta';
import { countSessionsSince } from '../db/repositories/sessions';

const DAY = 86400000;

/** Due when the last backup (or install) is older than 14 days and 5+ sessions were logged since, unless dismissed. */
export async function reminderDue(now = Date.now()): Promise<boolean> {
  const dismissed = await getMeta('backup_reminder_dismissed_until');
  if (dismissed && Date.parse(dismissed) > now) return false;
  const last =
    (await getMeta('last_backup_at')) ?? (await getMeta('created_at'));
  if (last && now - Date.parse(last) < 14 * DAY) return false;
  return (await countSessionsSince(await getMeta('last_backup_at'))) >= 5;
}

export const dismissReminder = () =>
  setMeta(
    'backup_reminder_dismissed_until',
    new Date(Date.now() + 7 * DAY).toISOString(),
  );
