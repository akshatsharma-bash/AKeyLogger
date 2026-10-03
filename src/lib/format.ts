import type { ProgramItem, SetLog } from '../db/types';
import { clock } from './dates';
import { fmtWeight, Units } from './units';

/** "60×8", "BW×12", "BW+10×12" */
export function fmtSet(
  l: Pick<SetLog, 'weight_kg' | 'reps'>,
  u: Units,
  bodyweight: boolean,
): string {
  if (bodyweight)
    return l.weight_kg
      ? `BW+${fmtWeight(l.weight_kg, u)}×${l.reps}`
      : `BW×${l.reps}`;
  return l.weight_kg == null
    ? `—×${l.reps}`
    : `${fmtWeight(l.weight_kg, u)}×${l.reps}`;
}

/** "6-8" or "8-10/leg" */
export const repRange = (
  i: Pick<ProgramItem, 'rep_min' | 'rep_max' | 'rep_suffix'>,
) =>
  `${i.rep_min === i.rep_max ? i.rep_min : `${i.rep_min}-${i.rep_max}`}${
    i.rep_suffix ?? ''
  }`;

/** "3 × 6-8 · rest 2:00" */
export const targetLine = (i: ProgramItem) =>
  `${i.sets} × ${repRange(i)} · rest ${clock(i.rest_seconds * 1000)}`;
