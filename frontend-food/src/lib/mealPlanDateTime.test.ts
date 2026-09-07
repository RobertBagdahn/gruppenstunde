import { describe, expect, it } from 'vitest';
import { fromLocalDateTimeInput, toLocalDateTimeInput } from './mealPlanDateTime';

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
