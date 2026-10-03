import type { Item, LastSession, SetLog, Settings } from '../../db/types';

export const stepKgFor = (item: Item, s: Settings) =>
  item.exercise.weight_step_kg ?? s.default_step_kg;

/**
 * "Add load" applies when, last session: non-extra sets >= planned sets, every one hit rep_max,
 * and the exercise is weighted. Returns the suggested kg, or null.
 */
export function progressionHint(
  item: Item,
  last: LastSession | null | undefined,
  stepKg: number,
): number | null {
  if (!last || item.exercise.load_type !== 'weighted') return null;
  const sets = last.sets.filter(s => !s.is_extra);
  if (sets.length < item.sets || sets.some(s => s.reps < item.rep_max))
    return null;
  const weights = sets
    .map(s => s.weight_kg)
    .filter((w): w is number => w != null);
  if (!weights.length) return null;
  return Number((Math.max(...weights) + stepKg).toFixed(4));
}

/** More weight, or same weight and more reps, than the same set_index last session. */
export function beatsLast(
  log: SetLog,
  last: LastSession | null | undefined,
): boolean {
  const prev = last?.sets.find(
    s => s.set_index === log.set_index && !s.is_extra,
  );
  if (!prev || log.is_extra) return false;
  const w = log.weight_kg ?? 0;
  const pw = prev.weight_kg ?? 0;
  return w > pw || (w === pw && log.reps > prev.reps);
}

export interface ItemProgress {
  logged: Map<number, SetLog>; // planned set_index -> log
  extras: SetLog[];
  handled: number; // logged or skipped planned sets
  next: number | null; // next planned set_index, null when done
}

export function itemProgress(
  item: Item,
  logs: SetLog[],
  skipped: number[] = [],
): ItemProgress {
  const mine = logs.filter(l => l.exercise_id === item.exercise_id);
  const logged = new Map<number, SetLog>();
  const extras: SetLog[] = [];
  for (const l of mine) {
    if (l.is_extra || l.set_index >= item.sets) extras.push(l);
    else logged.set(l.set_index, l);
  }
  let next: number | null = null;
  let handled = 0;
  for (let i = 0; i < item.sets; i++) {
    if (logged.has(i) || skipped.includes(i)) handled++;
    else if (next === null) next = i;
  }
  return { logged, extras, handled, next };
}

/** Index to use for a new extra set. */
export const nextExtraIndex = (item: Item, logs: SetLog[]) =>
  logs
    .filter(l => l.exercise_id === item.exercise_id)
    .reduce((m, l) => Math.max(m, l.set_index + 1), item.sets);

/**
 * Prefill:
 * weight: progression hint; else same set_index last session; else previous set today; else null.
 * reps: same set_index last session; else rep_max.
 */
export function prefill(
  item: Item,
  last: LastSession | null | undefined,
  todayLogs: SetLog[],
  setIndex: number,
  hintKg: number | null,
) {
  const sameLast = last?.sets.find(s => s.set_index === setIndex) ?? null;
  const prevToday = todayLogs
    .filter(l => l.exercise_id === item.exercise_id && l.set_index < setIndex)
    .sort((a, b) => b.set_index - a.set_index)[0];
  const bodyweight = item.exercise.load_type === 'bodyweight';
  const weightKg = bodyweight
    ? sameLast?.weight_kg ?? null
    : hintKg ?? sameLast?.weight_kg ?? prevToday?.weight_kg ?? null;
  return { weightKg, reps: sameLast?.reps ?? item.rep_max };
}

export interface Advance {
  focusId: string | null;
  timer: boolean;
  rest: number;
}

/**
 * Decides what happens after logging a planned set of `justId`.
 * Superset partner with a set left at this round -> partner, no timer.
 * Otherwise rest timer; focus next set in the group, the same exercise, or the next unfinished one in program order.
 */
export function advance(
  items: Item[],
  logs: SetLog[],
  skipped: Record<string, number[]>,
  justId: string,
): Advance {
  const idx = items.findIndex(i => i.id === justId);
  const cur = items[idx];
  const handled = (it: Item) => itemProgress(it, logs, skipped[it.id]).handled;
  const remaining = (it: Item) => handled(it) < it.sets;
  if (!cur) return { focusId: null, timer: false, rest: 0 };

  const group = cur.superset_group
    ? items.filter(i => i.superset_group === cur.superset_group)
    : [cur];
  const round = handled(cur);

  if (group.length > 1) {
    const gi = group.findIndex(i => i.id === cur.id);
    for (let k = 1; k < group.length; k++) {
      const p = group[(gi + k) % group.length];
      if (handled(p) < Math.min(round, p.sets))
        return { focusId: p.id, timer: false, rest: 0 };
    }
  }

  let focus: Item | undefined = group
    .filter(remaining)
    .sort((a, b) => handled(a) - handled(b) || a.position - b.position)[0];
  if (!focus) {
    const after = [...items.slice(idx + 1), ...items.slice(0, idx)];
    focus = after.find(i => !group.includes(i) && remaining(i));
  }
  if (!focus) return { focusId: null, timer: false, rest: 0 };
  return { focusId: focus.id, timer: true, rest: cur.rest_seconds };
}

/** First item with unlogged planned sets, in program order. */
export const firstUnfinished = (
  items: Item[],
  logs: SetLog[],
  skipped: Record<string, number[]>,
) =>
  items.find(i => itemProgress(i, logs, skipped[i.id]).next !== null)?.id ??
  null;
