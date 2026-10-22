import { describe, expect, it } from 'vitest';
import { formatClock, formatDateRange, formatTripDay, formatTripTime, toLocalDateTime, toLocalFields } from './tripTime';

describe('tripTime', () => {
  it('formats trip times like the generated trip names', () => {
    const iso = new Date(2026, 9, 17, 9, 0).toISOString();
    expect(formatTripTime(iso)).toBe('Sa 17.10. 09:00');
    expect(formatTripDay(iso)).toBe('Sa 17.10.');
    expect(formatClock(iso)).toBe('09:00');
    expect(formatTripTime(null)).toBe('');
  });

  it('round-trips local input fields', () => {
    const iso = new Date(2026, 9, 25, 8, 30).toISOString();
    const fields = toLocalFields(iso);
    expect(fields).toEqual({ date: '2026-10-25', time: '08:30' });
    expect(toLocalDateTime(fields.date, fields.time)).toBe('2026-10-25T08:30');
    expect(toLocalDateTime('2026-10-25', '')).toBe('');
  });

  it('describes event periods', () => {
    expect(formatDateRange(new Date(2026, 9, 17).toISOString(), new Date(2026, 9, 25).toISOString())).toBe('17.10. – 25.10.2026');
    expect(formatDateRange(new Date(2026, 9, 17).toISOString(), null)).toBe('17.10.2026');
    expect(formatDateRange(null, null)).toBe('');
  });
});
