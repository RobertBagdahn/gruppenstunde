/**
 * Dates of shopping trips. The backend stores UTC; people read and type local time.
 */
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

/** "Sa 17.10. 09:00" – the format of generated trip names. */
export function formatTripTime(iso: string | null): string {
  if (!iso) return '';
  return format(new Date(iso), 'EEEEEE dd.MM. HH:mm', { locale: de });
}

/** "Sa 10:00" – next-trip hint on event cards, where the date is clear from context. */
export function formatWeekdayClock(iso: string | null): string {
  if (!iso) return '';
  return format(new Date(iso), 'EEEEEE HH:mm', { locale: de });
}

/** "Sa 17.10." for grouping by day. */
export function formatTripDay(iso: string | null): string {
  if (!iso) return '';
  return format(new Date(iso), 'EEEEEE dd.MM.', { locale: de });
}

export function formatClock(iso: string | null): string {
  if (!iso) return '';
  return format(new Date(iso), 'HH:mm', { locale: de });
}

/** "17.10. – 25.10." / "17.10.2026" for event cards. */
export function formatDateRange(start: string | null, end: string | null): string {
  if (!start) return '';
  const from = new Date(start);
  if (!end) return format(from, 'dd.MM.yyyy', { locale: de });
  const to = new Date(end);
  if (format(from, 'yyyyMMdd') === format(to, 'yyyyMMdd')) return format(from, 'dd.MM.yyyy', { locale: de });
  return `${format(from, 'dd.MM.', { locale: de })} – ${format(to, 'dd.MM.yyyy', { locale: de })}`;
}

/** Splits an ISO instant into the local values `<input type="date">` and `<input type="time">` expect. */
export function toLocalFields(iso: string | null): { date: string; time: string } {
  if (!iso) return { date: '', time: '' };
  const value = new Date(iso);
  return { date: format(value, 'yyyy-MM-dd'), time: format(value, 'HH:mm') };
}

/**
 * Local date and time as the naive `YYYY-MM-DDTHH:mm` the API reads as Berlin time.
 * Returns an empty string while either part is missing, so the form can report the missing time.
 */
export function toLocalDateTime(date: string, time: string): string {
  return date && time ? `${date}T${time}` : '';
}
