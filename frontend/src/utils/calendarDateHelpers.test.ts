/**
 * Tests for calendar date helper functions.
 * Covers: getMonthDays, getWeekDays, isSameDay, isToday.
 */
import { describe, it, expect } from 'vitest';
import { getMonthDays, getWeekDays, isSameDay, isToday } from '@/utils/calendarDateHelpers';

describe('getMonthDays', () => {
  it('returns 31 days for January', () => {
    const days = getMonthDays(2026, 0); // January
    expect(days).toHaveLength(31);
  });

  it('returns 28 days for February (non-leap year)', () => {
    const days = getMonthDays(2026, 1); // February 2026
    expect(days).toHaveLength(28);
  });

  it('returns 29 days for February (leap year)', () => {
    const days = getMonthDays(2028, 1); // February 2028 is leap
    expect(days).toHaveLength(29);
  });

  it('returns 30 days for April', () => {
    const days = getMonthDays(2026, 3); // April
    expect(days).toHaveLength(30);
  });

  it('first day is 1st of month', () => {
    const days = getMonthDays(2026, 6); // July
    expect(days[0].getDate()).toBe(1);
    expect(days[0].getMonth()).toBe(6);
    expect(days[0].getFullYear()).toBe(2026);
  });

  it('last day is last of month', () => {
    const days = getMonthDays(2026, 6); // July
    expect(days[days.length - 1].getDate()).toBe(31);
  });

  it('all days are in the correct month', () => {
    const days = getMonthDays(2026, 3);
    for (const d of days) {
      expect(d.getMonth()).toBe(3);
      expect(d.getFullYear()).toBe(2026);
    }
  });
});

describe('getWeekDays', () => {
  it('returns exactly 7 days', () => {
    const days = getWeekDays(new Date(2026, 3, 15)); // April 15, 2026 (Wednesday)
    expect(days).toHaveLength(7);
  });

  it('starts on Monday', () => {
    const days = getWeekDays(new Date(2026, 3, 15)); // Wednesday
    expect(days[0].getDay()).toBe(1); // Monday
  });

  it('ends on Sunday', () => {
    const days = getWeekDays(new Date(2026, 3, 15));
    expect(days[6].getDay()).toBe(0); // Sunday
  });

  it('contains the reference date', () => {
    const ref = new Date(2026, 3, 15);
    const days = getWeekDays(ref);
    const found = days.some((d) => isSameDay(d, ref));
    expect(found).toBe(true);
  });

  it('handles Monday as reference (stays same week)', () => {
    // April 13, 2026 is Monday
    const ref = new Date(2026, 3, 13);
    const days = getWeekDays(ref);
    expect(days[0].getDate()).toBe(13); // Same Monday
    expect(days[6].getDate()).toBe(19); // Sunday
  });

  it('handles Sunday as reference (gets that week Mon-Sun)', () => {
    // April 19, 2026 is Sunday
    const ref = new Date(2026, 3, 19);
    const days = getWeekDays(ref);
    expect(days[0].getDate()).toBe(13); // Monday
    expect(days[6].getDate()).toBe(19); // Sunday (the ref)
  });

  it('handles month boundary', () => {
    // April 30, 2026 is Thursday — week should span Apr 27 to May 3
    const ref = new Date(2026, 3, 30);
    const days = getWeekDays(ref);
    expect(days[0].getDate()).toBe(27); // Monday Apr 27
    expect(days[6].getDate()).toBe(3); // Sunday May 3
    expect(days[6].getMonth()).toBe(4); // May
  });
});

describe('isSameDay', () => {
  it('returns true for same date', () => {
    const a = new Date(2026, 3, 15, 10, 0);
    const b = new Date(2026, 3, 15, 22, 30);
    expect(isSameDay(a, b)).toBe(true);
  });

  it('returns false for different days', () => {
    const a = new Date(2026, 3, 15);
    const b = new Date(2026, 3, 16);
    expect(isSameDay(a, b)).toBe(false);
  });

  it('returns false for same day different month', () => {
    const a = new Date(2026, 3, 15);
    const b = new Date(2026, 4, 15);
    expect(isSameDay(a, b)).toBe(false);
  });

  it('returns false for same day different year', () => {
    const a = new Date(2026, 3, 15);
    const b = new Date(2027, 3, 15);
    expect(isSameDay(a, b)).toBe(false);
  });
});

describe('isToday', () => {
  it('returns true for today', () => {
    expect(isToday(new Date())).toBe(true);
  });

  it('returns false for yesterday', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    expect(isToday(yesterday)).toBe(false);
  });

  it('returns false for tomorrow', () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    expect(isToday(tomorrow)).toBe(false);
  });
});
