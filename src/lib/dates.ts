const pad = (n: number) => String(n).padStart(2, '0');

/** Local-time YYYY-MM-DD. */
export function localDate(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Monday = 1 ... Sunday = 7 */
export function weekdayOf(d: Date = new Date()): number {
  return ((d.getDay() + 6) % 7) + 1;
}

export const WEEKDAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const WEEKDAY_LONG = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];
const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

/** Parse YYYY-MM-DD as a local date (not UTC). */
export function parseLocalDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** "02 Oct" */
export function shortDate(s: string): string {
  const d = parseLocalDate(s);
  return `${pad(d.getDate())} ${MONTHS[d.getMonth()]}`;
}

/** "Fri 3 Oct" */
export function headerDate(d: Date = new Date()): string {
  return `${WEEKDAY_SHORT[weekdayOf(d) - 1]} ${d.getDate()} ${
    MONTHS[d.getMonth()]
  }`;
}

/** "Fri 3 Oct 2026" */
export function longDate(s: string): string {
  const d = parseLocalDate(s);
  return `${WEEKDAY_SHORT[weekdayOf(d) - 1]} ${d.getDate()} ${
    MONTHS[d.getMonth()]
  } ${d.getFullYear()}`;
}

/** "YYYY-MM-DD-HHmm" for file names, local time. */
export function fileStamp(d: Date = new Date()): string {
  return `${localDate(d)}-${pad(d.getHours())}${pad(d.getMinutes())}`;
}

/** mm:ss */
export function clock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(total / 60)}:${pad(total % 60)}`;
}

/** "1h 05m" / "42m" */
export function duration(startIso: string, endIso: string | null): string {
  if (!endIso) return '—';
  const mins = Math.max(
    0,
    Math.round((Date.parse(endIso) - Date.parse(startIso)) / 60000),
  );
  return mins >= 60
    ? `${Math.floor(mins / 60)}h ${pad(mins % 60)}m`
    : `${mins}m`;
}

export const daysBetween = (a: Date, b: Date) =>
  (b.getTime() - a.getTime()) / 86400000;
