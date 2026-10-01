import { describe, expect, it } from 'vitest';
import { fromLocalDateTimeInput, planDateKey, toLocalDateTimeInput } from './mealPlanDateTime';

describe('meal plan datetime conversion', () => {
  it('converts API UTC datetimes to Europe/Berlin input values', () => {
    expect(toLocalDateTimeInput('2026-01-15T12:00:00Z')).toBe('2026-01-15T13:00');
  });

  it('converts Europe/Berlin input values back to UTC', () => {
    expect(fromLocalDateTimeInput('2026-01-15T13:00')).toBe('2026-01-15T12:00:00.000Z');
  });

  it('returns null for empty or malformed values', () => {
    expect(fromLocalDateTimeInput('')).toBeNull();
    expect(fromLocalDateTimeInput('not-a-date')).toBeNull();
  });
});

describe('planDateKey', () => {
  it('returns a plain date unchanged', () => {
    expect(planDateKey('2026-12-11')).toBe('2026-12-11');
  });

  it('uses the plan day (Berlin), not the UTC day', () => {
    // 00:30 in Berlin on 12 Dec is still 11 Dec in UTC.
    expect(planDateKey('2026-12-11T23:30:00Z')).toBe('2026-12-12');
    expect(planDateKey('2026-12-11T17:00:00Z')).toBe('2026-12-11');
  });

  it('follows daylight saving time', () => {
    expect(planDateKey('2026-07-01T22:30:00Z')).toBe('2026-07-02');
  });

  it('falls back to the leading date for unparsable input', () => {
    expect(planDateKey('2026-13-45-nonsense')).toBe('2026-13-45');
  });
});
