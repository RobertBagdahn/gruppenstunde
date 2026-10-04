import { describe, expect, it } from 'vitest';
import type { MealPlan } from '@/schemas/mealPlan';
import { monthKey, planDurationDays, planTiming } from './mealPlanListDisplay';

const NOW = new Date('2026-10-04T12:00:00').getTime();

function plan(start: string | null, end: string | null): MealPlan {
  return { start_datetime: start, end_datetime: end } as unknown as MealPlan;
}

describe('mealPlanListDisplay', () => {
  it('counts calendar days', () => {
    expect(planDurationDays(plan('2026-10-09T18:00:00', '2026-10-11T14:00:00'))).toBe(3);
    expect(planDurationDays(plan('2026-10-09T08:00:00', '2026-10-09T20:00:00'))).toBe(1);
    expect(planDurationDays(plan(null, null))).toBeNull();
  });

  it('classifies timing', () => {
    expect(planTiming(plan('2026-10-09T18:00:00', '2026-10-11T14:00:00'), NOW)).toBe('upcoming');
    expect(planTiming(plan('2026-10-03T10:00:00', '2026-10-05T10:00:00'), NOW)).toBe('running');
    expect(planTiming(plan('2026-09-01T10:00:00', '2026-09-02T10:00:00'), NOW)).toBe('past');
    expect(planTiming(plan(null, null), NOW)).toBe('undated');
  });

  it('groups by start month', () => {
    expect(monthKey(plan('2026-10-09T18:00:00', null))).toBe('2026-10');
    expect(monthKey(plan(null, null))).toBe('undated');
  });
});
