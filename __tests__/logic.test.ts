import { localDate, weekdayOf } from '../src/lib/dates';
import {
  fmtWeight,
  fromDisplay,
  parseNumber,
  toDisplay,
  displayStep,
} from '../src/lib/units';
import {
  advance,
  beatsLast,
  prefill,
  progressionHint,
} from '../src/features/workout/logic';
import type { Item, LastSession, SetLog } from '../src/db/types';

const item = (
  id: string,
  over: Partial<Item> = {},
  load: 'weighted' | 'bodyweight' = 'weighted',
): Item => ({
  id,
  day_id: 'd',
  exercise_id: `ex-${id}`,
  position: 0,
  sets: 3,
  rep_min: 6,
  rep_max: 8,
  rep_suffix: null,
  rest_seconds: 120,
  superset_group: null,
  note: null,
  exercise: {
    id: `ex-${id}`,
    name: id,
    load_type: load,
    weight_step_kg: null,
    archived: 0,
    created_at: '',
  },
  ...over,
});

const log = (
  exId: string,
  set_index: number,
  weight_kg: number | null,
  reps: number,
  is_extra = 0,
): SetLog => ({
  id: `${exId}-${set_index}`,
  session_id: 's',
  exercise_id: exId,
  set_index,
  weight_kg,
  reps,
  is_extra,
  completed_at: '',
});

describe('dates', () => {
  test('weekday mapping: Monday = 1, Sunday = 7', () => {
    expect(weekdayOf(new Date(2026, 8, 28))).toBe(1); // Mon 28 Sep 2026
    expect(weekdayOf(new Date(2026, 9, 3))).toBe(6); // Sat 3 Oct 2026
    expect(weekdayOf(new Date(2026, 9, 4))).toBe(7); // Sun
  });
  test('local date around midnight', () => {
    expect(localDate(new Date(2026, 9, 3, 23, 59, 59))).toBe('2026-10-03');
    expect(localDate(new Date(2026, 9, 4, 0, 0, 1))).toBe('2026-10-04');
  });
});

describe('units', () => {
  test('kg/lb round trips', () => {
    for (const lb of [45, 135, 137.5, 225, 2.5]) {
      expect(Number(toDisplay(fromDisplay(lb, 'lb'), 'lb').toFixed(1))).toBe(
        lb,
      );
    }
    expect(fmtWeight(62.5, 'kg')).toBe('62.5');
    expect(fmtWeight(60, 'kg')).toBe('60');
    expect(fmtWeight(100, 'lb')).toBe('220.5');
    expect(fromDisplay(62.556, 'kg')).toBe(62.56);
  });
  test('lb step', () => {
    expect(displayStep(2.5, 'lb')).toBe(5);
    expect(displayStep(1.25, 'lb')).toBe(2.5);
    expect(displayStep(5, 'kg')).toBe(5);
  });
  test('comma decimal', () => {
    expect(parseNumber('62,5')).toBe(62.5);
    expect(parseNumber('abc')).toBeNull();
  });
});

describe('progression', () => {
  const sq = item('sq');
  const last = (sets: SetLog[]): LastSession => ({ date: '2026-10-02', sets });
  test('shown when all planned sets hit rep_max', () => {
    expect(
      progressionHint(
        sq,
        last([
          log('ex-sq', 0, 60, 8),
          log('ex-sq', 1, 60, 8),
          log('ex-sq', 2, 60, 9),
        ]),
        2.5,
      ),
    ).toBe(62.5);
  });
  test('hidden when a set missed rep_max', () => {
    expect(
      progressionHint(
        sq,
        last([
          log('ex-sq', 0, 60, 8),
          log('ex-sq', 1, 60, 8),
          log('ex-sq', 2, 60, 7),
        ]),
        2.5,
      ),
    ).toBeNull();
  });
  test('hidden when fewer sets than planned; extras ignored', () => {
    expect(
      progressionHint(
        sq,
        last([
          log('ex-sq', 0, 60, 8),
          log('ex-sq', 1, 60, 8),
          log('ex-sq', 3, 60, 10, 1),
        ]),
        2.5,
      ),
    ).toBeNull();
    expect(
      progressionHint(
        sq,
        last([
          log('ex-sq', 0, 60, 8),
          log('ex-sq', 1, 60, 8),
          log('ex-sq', 2, 60, 8),
          log('ex-sq', 3, 50, 3, 1),
        ]),
        2.5,
      ),
    ).toBe(62.5);
  });
  test('bodyweight excluded', () => {
    const kr = item('kr', { sets: 2 }, 'bodyweight');
    expect(
      progressionHint(
        kr,
        last([log('ex-kr', 0, null, 8), log('ex-kr', 1, null, 8)]),
        2.5,
      ),
    ).toBeNull();
  });
  test('prefill uses hint, then last session, then reps fallback', () => {
    const l = last([log('ex-sq', 0, 60, 8), log('ex-sq', 1, 60, 7)]);
    expect(prefill(sq, l, [], 0, 62.5)).toEqual({ weightKg: 62.5, reps: 8 });
    expect(prefill(sq, l, [], 1, null)).toEqual({ weightKg: 60, reps: 7 });
    expect(prefill(sq, l, [log('ex-sq', 1, 65, 6)], 2, null)).toEqual({
      weightKg: 65,
      reps: 8,
    });
    expect(prefill(sq, null, [], 0, null)).toEqual({ weightKg: null, reps: 8 });
  });
  test('beats last', () => {
    const l = last([log('ex-sq', 0, 60, 8)]);
    expect(beatsLast(log('ex-sq', 0, 62.5, 5), l)).toBe(true);
    expect(beatsLast(log('ex-sq', 0, 60, 9), l)).toBe(true);
    expect(beatsLast(log('ex-sq', 0, 60, 8), l)).toBe(false);
  });
});

describe('superset advance', () => {
  const a = item('a', { position: 0, sets: 3, rest_seconds: 150 });
  const b = item('b', {
    position: 1,
    sets: 2,
    superset_group: 'A',
    rest_seconds: 60,
  });
  const c = item('c', {
    position: 2,
    sets: 2,
    superset_group: 'A',
    rest_seconds: 60,
  });
  const items = [a, b, c];

  test('partner focused without timer, timer after the pair', () => {
    expect(advance(items, [log('ex-b', 0, 20, 12)], {}, 'b')).toEqual({
      focusId: 'c',
      timer: false,
      rest: 0,
    });
    expect(
      advance(items, [log('ex-b', 0, 20, 12), log('ex-c', 0, 10, 12)], {}, 'c'),
    ).toEqual({ focusId: 'b', timer: true, rest: 60 });
  });
  test('straight set: stays on exercise with timer, then moves on after last set', () => {
    expect(advance(items, [log('ex-a', 0, 60, 6)], {}, 'a')).toEqual({
      focusId: 'a',
      timer: true,
      rest: 150,
    });
    const done = [
      log('ex-a', 0, 60, 6),
      log('ex-a', 1, 60, 6),
      log('ex-a', 2, 60, 6),
    ];
    expect(advance(items, done, {}, 'a')).toEqual({
      focusId: 'b',
      timer: true,
      rest: 150,
    });
  });
  test('out of order: after group is done, wraps to unfinished earlier exercise', () => {
    const logs = [
      log('ex-b', 0, 1, 1),
      log('ex-c', 0, 1, 1),
      log('ex-b', 1, 1, 1),
      log('ex-c', 1, 1, 1),
    ];
    expect(advance(items, logs, {}, 'c')).toEqual({
      focusId: 'a',
      timer: true,
      rest: 60,
    });
  });
  test('workout complete: no timer', () => {
    const logs = [0, 1, 2].map(i => log('ex-a', i, 1, 1));
    expect(advance([a], logs, {}, 'a')).toEqual({
      focusId: null,
      timer: false,
      rest: 0,
    });
  });
});
