/**
 * Smart default helpers for event wizard date/time.
 * Extracted from StepDateLocation.tsx for testability.
 */

/** Format Date as "YYYY-MM-DDTHH:mm" for datetime-local inputs */
export function formatLocalDatetime(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Get next Saturday 10:00 from today */
export function getNextSaturday(from?: Date): string {
  const d = from ? new Date(from) : new Date();
  const day = d.getDay();
  const daysUntil = day === 6 ? 7 : (6 - day + 7) % 7 || 7;
  const next = new Date(d);
  next.setDate(next.getDate() + daysUntil);
  next.setHours(10, 0, 0, 0);
  return formatLocalDatetime(next);
}

/** Get next Sunday 14:00 from a start date */
export function getNextSunday(startStr: string): string {
  const d = new Date(startStr);
  if (isNaN(d.getTime())) return '';
  const day = d.getDay();
  const daysUntil = day === 0 ? 7 : 7 - day;
  const next = new Date(d);
  next.setDate(next.getDate() + daysUntil);
  next.setHours(14, 0, 0, 0);
  return formatLocalDatetime(next);
}
