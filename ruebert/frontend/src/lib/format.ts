// German number and date formatting (UI-07, NFA-06). The only place where numbers become text.

const TIME_ZONE = 'Europe/Berlin';

const integerFormat = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 });
const percentFormat = new Intl.NumberFormat('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const timeFormat = new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit', timeZone: TIME_ZONE });
const weekdayFormat = new Intl.DateTimeFormat('de-DE', { weekday: 'short', timeZone: TIME_ZONE });
const dateFormat = new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: TIME_ZONE });

/** Placeholder for values that are missing; never show "NaN" or "undefined". */
export const MISSING = '–';

/** Integer with thousands separator: 15000 → "15.000". Rounds to the nearest integer. */
export function formatInt(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return MISSING;
  return integerFormat.format(Math.round(value));
}

/** Share as percent with one decimal and a German comma: 0.4216 → "42,2 %". */
export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return MISSING;
  return `${percentFormat.format(value * 100)} %`;
}

/** Local time of an ISO timestamp: "2026-05-21T07:41:01+02:00" → "07:41". */
export function formatTime(iso: string | null | undefined): string {
  const date = parseDate(iso);
  return date ? timeFormat.format(date) : MISSING;
}

/** Date line of the top bar: "2026-05-18" → "MO 18.05.2026". */
export function formatDayLine(isoDate: string | null | undefined): string {
  const date = parseDate(isoDate);
  if (!date) return MISSING;
  const weekday = weekdayFormat.format(date).replace('.', '').toUpperCase();
  return `${weekday} ${dateFormat.format(date)}`;
}

/** ISO 8601 calendar week of a date (weeks start on Monday, week 1 contains 4 January). */
export function isoWeek(date: Date): number {
  const day = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const weekday = day.getUTCDay() || 7;
  day.setUTCDate(day.getUTCDate() + 4 - weekday);
  const yearStart = new Date(Date.UTC(day.getUTCFullYear(), 0, 1));
  return Math.ceil(((day.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
}

/** Today as ISO date string in Europe/Berlin. */
export function todayIso(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  return parts;
}

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  // Plain dates are calendar days, not UTC midnight: pin them to noon so no time zone shifts the day.
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00Z`) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}
