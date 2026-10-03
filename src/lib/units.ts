export type Units = 'kg' | 'lb';
export const LB_PER_KG = 2.20462;

const strip = (n: number, decimals: number) =>
  String(Number(n.toFixed(decimals)));

/** kg -> number in display units (unrounded). */
export const toDisplay = (kg: number, u: Units) =>
  u === 'kg' ? kg : kg * LB_PER_KG;

/** display value -> kg for storage. lb keeps 4 decimals so it round-trips to 1 lb decimal. */
export const fromDisplay = (v: number, u: Units) =>
  u === 'kg' ? Number(v.toFixed(2)) : Number((v / LB_PER_KG).toFixed(4));

/** Rounded display number: kg 2 decimals, lb 1 decimal. */
export const roundDisplay = (v: number, u: Units) =>
  Number(v.toFixed(u === 'kg' ? 2 : 1));

/** "62.5" / "137.8" without unit, trailing zeros stripped. */
export const fmtWeight = (kg: number, u: Units) =>
  strip(toDisplay(kg, u), u === 'kg' ? 2 : 1);

/** Step in display units. */
export const displayStep = (stepKg: number, u: Units) =>
  u === 'kg' ? stepKg : stepKg < 2.5 ? 2.5 : 5;

/** Parse user text: comma converts to dot. Returns null for invalid. */
export function parseNumber(text: string): number | null {
  const t = text.trim().replace(',', '.');
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? n : null;
}
