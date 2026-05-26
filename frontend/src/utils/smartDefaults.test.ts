/**
 * Tests for smart default date calculations.
 * Covers: formatLocalDatetime, getNextSaturday, getNextSunday.
 */
import { describe, it, expect } from 'vitest';
import { formatLocalDatetime, getNextSaturday, getNextSunday } from '@/utils/smartDefaults';

describe('formatLocalDatetime', () => {
  it('formats a date correctly', () => {
    const d = new Date(2026, 6, 4, 10, 30); // July 4, 2026 10:30
    expect(formatLocalDatetime(d)).toBe('2026-07-04T10:30');
  });

  it('zero-pads single-digit months and days', () => {
    const d = new Date(2026, 0, 5, 9, 5); // Jan 5, 2026 09:05
    expect(formatLocalDatetime(d)).toBe('2026-01-05T09:05');
  });

  it('handles midnight', () => {
    const d = new Date(2026, 11, 31, 0, 0); // Dec 31, 2026 00:00
    expect(formatLocalDatetime(d)).toBe('2026-12-31T00:00');
  });
});

describe('getNextSaturday', () => {
  it('from a Monday returns the same week Saturday at 10:00', () => {
    // April 13, 2026 is a Monday
    const monday = new Date(2026, 3, 13, 8, 0);
    const result = getNextSaturday(monday);
    expect(result).toBe('2026-04-18T10:00'); // Saturday April 18
  });

  it('from a Friday returns the next day Saturday at 10:00', () => {
    // April 17, 2026 is a Friday
    const friday = new Date(2026, 3, 17, 14, 0);
    const result = getNextSaturday(friday);
    expect(result).toBe('2026-04-18T10:00');
  });

  it('from a Saturday returns next Saturday (not same day)', () => {
    // April 18, 2026 is a Saturday
    const saturday = new Date(2026, 3, 18, 12, 0);
    const result = getNextSaturday(saturday);
    expect(result).toBe('2026-04-25T10:00'); // next Saturday
  });

  it('from a Sunday returns the following Saturday', () => {
    // April 19, 2026 is a Sunday
    const sunday = new Date(2026, 3, 19, 9, 0);
    const result = getNextSaturday(sunday);
    expect(result).toBe('2026-04-25T10:00');
  });

  it('always sets time to 10:00', () => {
    const d = new Date(2026, 3, 13, 23, 59);
    const result = getNextSaturday(d);
    expect(result).toMatch(/T10:00$/);
  });
});

describe('getNextSunday', () => {
  it('from a Saturday returns the next day Sunday at 14:00', () => {
    const result = getNextSunday('2026-04-18T10:00');
    expect(result).toBe('2026-04-19T14:00');
  });

  it('from a Monday returns the following Sunday', () => {
    const result = getNextSunday('2026-04-13T10:00');
    expect(result).toBe('2026-04-19T14:00');
  });

  it('from a Sunday returns next Sunday (not same day)', () => {
    const result = getNextSunday('2026-04-19T10:00');
    expect(result).toBe('2026-04-26T14:00');
  });

  it('always sets time to 14:00', () => {
    const result = getNextSunday('2026-04-18T10:00');
    expect(result).toMatch(/T14:00$/);
  });

  it('returns empty string for invalid date', () => {
    expect(getNextSunday('')).toBe('');
    expect(getNextSunday('not-a-date')).toBe('');
  });

  it('works for end-of-month boundary', () => {
    // April 30, 2026 is a Thursday — next Sunday is May 3
    const result = getNextSunday('2026-04-30T10:00');
    expect(result).toBe('2026-05-03T14:00');
  });
});
