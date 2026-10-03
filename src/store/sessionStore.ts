import { create } from 'zustand';
import { listDays } from '../db/repositories/program';
import { itemsForDay } from '../db/repositories/program';
import {
  findSession,
  finishSession,
  getOrCreateSession,
} from '../db/repositories/sessions';
import {
  deleteSet,
  insertSet,
  lastSessionFor,
  logsForSession,
  updateSet,
} from '../db/repositories/setLogs';
import type {
  Item,
  LastSession,
  ProgramDay,
  Session,
  SetLog,
} from '../db/types';
import {
  advance,
  beatsLast,
  firstUnfinished,
  itemProgress,
  nextExtraIndex,
  prefill,
  progressionHint,
  stepKgFor,
} from '../features/workout/logic';
import { useTimer } from '../features/timer/timerStore';
import { localDate, weekdayOf } from '../lib/dates';
import { hapticSuccess } from '../lib/haptics';
import { fromDisplay, roundDisplay, toDisplay } from '../lib/units';
import { useSettings } from './settingsStore';
import { useSnackbar } from './snackbarStore';
import { maybeDailySnapshot } from '../backup/snapshots';
import { reminderDue } from '../backup/reminder';

export type PanelMode = 'log' | 'edit';

export interface Draft {
  weight: number | null; // display units
  reps: number;
  bwAdded: boolean; // bodyweight with added load
}

export interface Summary {
  durationMin: number;
  sets: number;
  beat: number;
  reminder: boolean;
}

interface S {
  date: string;
  weekday: number; // selected chip
  days: ProgramDay[];
  day: ProgramDay | null;
  items: Item[];
  session: Session | null;
  logs: SetLog[];
  last: Record<string, LastSession | null>; // by exercise_id
  skipped: Record<string, number[]>; // by item id
  focusId: string | null;
  mode: PanelMode;
  extra: boolean;
  editLog: SetLog | null;
  draft: Draft;
  busy: boolean;
  summary: Summary | null;
  loaded: boolean;

  load: (weekday?: number) => Promise<void>;
  focus: (itemId: string) => void;
  setDraft: (d: Partial<Draft>) => void;
  setExtra: (on: boolean) => void;
  logSet: () => Promise<void>;
  skipSet: () => void;
  startEdit: (log: SetLog) => void;
  cancelEdit: () => void;
  saveEdit: () => Promise<void>;
  deleteEdit: () => void;
  finish: () => Promise<void>;
  closeSummary: () => void;
}

const units = () => useSettings.getState().settings.units;

function draftFor(
  st: Pick<S, 'items' | 'logs' | 'last' | 'skipped'>,
  itemId: string | null,
  extra = false,
): Draft {
  const item = st.items.find(i => i.id === itemId);
  if (!item) return { weight: null, reps: 0, bwAdded: false };
  const last = st.last[item.exercise_id];
  const p = itemProgress(item, st.logs, st.skipped[item.id]);
  const setIndex =
    extra || p.next === null ? nextExtraIndex(item, st.logs) : p.next;
  const hint = progressionHint(
    item,
    last,
    stepKgFor(item, useSettings.getState().settings),
  );
  const { weightKg, reps } = prefill(item, last, st.logs, setIndex, hint);
  return {
    weight:
      weightKg == null
        ? null
        : roundDisplay(toDisplay(weightKg, units()), units()),
    reps,
    bwAdded:
      item.exercise.load_type === 'bodyweight' &&
      weightKg != null &&
      weightKg > 0,
  };
}

const draftToKg = (item: Item, d: Draft): number | null => {
  if (item.exercise.load_type === 'bodyweight' && !d.bwAdded) return null;
  return d.weight == null ? null : fromDisplay(d.weight, units());
};

export const useSession = create<S>((set, get) => ({
  date: localDate(),
  weekday: weekdayOf(),
  days: [],
  day: null,
  items: [],
  session: null,
  logs: [],
  last: {},
  skipped: {},
  focusId: null,
  mode: 'log',
  extra: false,
  editLog: null,
  draft: { weight: null, reps: 0, bwAdded: false },
  busy: false,
  summary: null,
  loaded: false,

  load: async weekday => {
    const date = localDate();
    const wd = weekday ?? get().weekday;
    const days = await listDays();
    const day = days.find(d => d.weekday === wd) ?? null;
    const items = day && !day.is_rest_day ? await itemsForDay(day.id) : [];
    const session = day ? await findSession(date, day.id) : null;
    const logs = session ? await logsForSession(session.id) : [];
    const lastList = await Promise.all(
      items.map(i => lastSessionFor(i.exercise_id, date)),
    );
    const last: S['last'] = {};
    items.forEach((i, n) => (last[i.exercise_id] = lastList[n]));
    const sameDay = get().day?.id === day?.id && get().date === date;
    const skipped = sameDay ? get().skipped : {};
    const keepFocus =
      sameDay && items.some(i => i.id === get().focusId) ? get().focusId : null;
    const focusId =
      keepFocus ??
      firstUnfinished(items, logs, skipped) ??
      items[0]?.id ??
      null;
    const base = { items, logs, last, skipped };
    set({
      date,
      weekday: wd,
      days,
      day,
      ...base,
      session,
      focusId,
      mode: 'log',
      extra: false,
      editLog: null,
      draft: draftFor(base, focusId),
      loaded: true,
    });
  },

  focus: itemId => {
    const st = get();
    if (useTimer.getState().endAt) useTimer.setState({ compact: true });
    if (st.mode === 'edit')
      return set({
        focusId: itemId,
        mode: 'log',
        editLog: null,
        extra: false,
        draft: draftFor(st, itemId),
      });
    set({ focusId: itemId, extra: false, draft: draftFor(st, itemId) });
  },

  setDraft: d => set({ draft: { ...get().draft, ...d } }),

  setExtra: on => set({ extra: on, draft: draftFor(get(), get().focusId, on) }),

  logSet: async () => {
    const st = get();
    const item = st.items.find(i => i.id === st.focusId);
    if (!item || !st.day || st.busy) return;
    const weightKg = draftToKg(item, st.draft);
    if (item.exercise.load_type === 'weighted' && !(weightKg && weightKg > 0))
      return;
    set({ busy: true });
    try {
      await useSnackbar.getState().flush(); // commit any pending delete first
      const cur = get();
      const p = itemProgress(item, cur.logs, cur.skipped[item.id]);
      const isExtra = cur.extra || p.next === null;
      const setIndex = isExtra
        ? nextExtraIndex(item, cur.logs)
        : (p.next as number);
      const session =
        cur.session ??
        (await getOrCreateSession(cur.date, st.day.id, weekdayOf()));
      const row = await insertSet({
        session_id: session.id,
        exercise_id: item.exercise_id,
        set_index: setIndex,
        weight_kg: weightKg,
        reps: st.draft.reps,
        is_extra: isExtra ? 1 : 0,
      });
      hapticSuccess();
      const logs = [...cur.logs, row];
      const next = { ...cur, logs, session };
      if (isExtra) {
        set({
          logs,
          session,
          extra: false,
          draft: draftFor(next, item.id, true),
        });
        useTimer.getState().start(item.rest_seconds, 'Rest · next: Extra set');
        return;
      }
      const adv = advance(cur.items, logs, cur.skipped, item.id);
      const focusId = adv.focusId ?? item.id;
      set({
        logs,
        session,
        focusId,
        extra: false,
        draft: draftFor(next, focusId),
      });
      if (adv.timer) {
        const f = cur.items.find(i => i.id === focusId)!;
        const fp = itemProgress(f, logs, cur.skipped[f.id]);
        const label =
          f.id === item.id && fp.next !== null
            ? `Set ${fp.next + 1} of ${f.sets}`
            : f.exercise.name;
        useTimer.getState().start(adv.rest, `Rest · next: ${label}`);
      }
    } finally {
      set({ busy: false });
    }
  },

  skipSet: () => {
    const st = get();
    const item = st.items.find(i => i.id === st.focusId);
    if (!item) return;
    const p = itemProgress(item, st.logs, st.skipped[item.id]);
    if (p.next === null) return;
    const skipped = {
      ...st.skipped,
      [item.id]: [...(st.skipped[item.id] ?? []), p.next],
    };
    const adv = advance(st.items, st.logs, skipped, item.id);
    const focusId = adv.focusId ?? item.id;
    set({ skipped, focusId, draft: draftFor({ ...st, skipped }, focusId) });
  },

  startEdit: log => {
    const item = get().items.find(i => i.exercise_id === log.exercise_id);
    if (!item) return;
    set({
      mode: 'edit',
      editLog: log,
      focusId: item.id,
      draft: {
        weight:
          log.weight_kg == null
            ? null
            : roundDisplay(toDisplay(log.weight_kg, units()), units()),
        reps: log.reps,
        bwAdded:
          item.exercise.load_type === 'bodyweight' && (log.weight_kg ?? 0) > 0,
      },
    });
  },

  cancelEdit: () =>
    set({ mode: 'log', editLog: null, draft: draftFor(get(), get().focusId) }),

  saveEdit: async () => {
    const st = get();
    const log = st.editLog;
    const item = st.items.find(i => i.exercise_id === log?.exercise_id);
    if (!log || !item) return;
    const weightKg = draftToKg(item, st.draft);
    await updateSet(log.id, weightKg, st.draft.reps);
    const logs = st.logs.map(l =>
      l.id === log.id ? { ...l, weight_kg: weightKg, reps: st.draft.reps } : l,
    );
    set({
      logs,
      mode: 'log',
      editLog: null,
      draft: draftFor({ ...st, logs }, st.focusId),
    });
  },

  deleteEdit: () => {
    const st = get();
    const log = st.editLog;
    if (!log) return;
    const logs = st.logs.filter(l => l.id !== log.id);
    set({
      logs,
      mode: 'log',
      editLog: null,
      draft: draftFor({ ...st, logs }, st.focusId),
    });
    useSnackbar.getState().show({
      message: 'Set deleted',
      actionLabel: 'Undo',
      onAction: () => {
        const cur = get();
        if (cur.session?.id !== log.session_id) return;
        const restored = [...cur.logs, log].sort((a, b) =>
          a.completed_at.localeCompare(b.completed_at),
        );
        set({
          logs: restored,
          draft: draftFor({ ...cur, logs: restored }, cur.focusId),
        });
      },
      onExpire: async () => {
        await deleteSet(log.id);
      },
    });
  },

  finish: async () => {
    const st = get();
    if (!st.session) return;
    await useSnackbar.getState().flush();
    const finishedAt = await finishSession(st.session.id);
    useTimer.getState().skip();
    const beat = st.logs.filter(l =>
      beatsLast(l, st.last[l.exercise_id]),
    ).length;
    const durationMin = Math.round(
      (Date.parse(finishedAt) - Date.parse(st.session.started_at)) / 60000,
    );
    set({
      session: { ...st.session, finished_at: finishedAt },
      summary: { durationMin, sets: st.logs.length, beat, reminder: false },
    });
    maybeDailySnapshot().catch(() => {});
    const reminder = await reminderDue().catch(() => false);
    if (reminder && get().summary)
      set({ summary: { ...get().summary!, reminder } });
  },

  closeSummary: () => set({ summary: null }),
}));
