/**
 * Upgrades backup `data` from an older schemaVersion to the current one.
 * Keep in sync with src/db/migrations.ts: every DB migration N adds a step here for N.
 */
const steps: Record<number, (data: any) => any> = {
  // 2: data => ({ ...data, bodyweight_logs: [] }),
};

export function migrateBackup(
  fromVersion: number,
  data: unknown,
  toVersion: number,
): unknown {
  let d = data;
  for (let v = fromVersion + 1; v <= toVersion; v++) {
    const step = steps[v];
    if (!step) throw new Error(`No backup migration to version ${v}`);
    d = step(d);
  }
  return d;
}
