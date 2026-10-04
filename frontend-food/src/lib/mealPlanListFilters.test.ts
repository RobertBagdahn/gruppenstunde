import { describe, expect, it } from 'vitest';
import type { MealPlan } from '@/schemas/mealPlan';
import { matchesMealPlanFilters, planDurationDays, sortMealPlansByDate } from './mealPlanListFilters';

const NOW = new Date('2026-10-04T12:00:00').getTime();

function plan(id: number, start: string | null, end: string | null, extra: Partial<MealPlan> = {}): MealPlan {
  return {
    id,
    start_datetime: start,
    end_datetime: end,
    norm_portions: 10,
    visibility: 'private',
    nutritional_tag_names: [],
    has_group_members: false,
    event_name: '',
    ...extra,
  } as unknown as MealPlan;
}

const ALL = { when: 'all', size: 'all', duration: 'all', visibility: 'all', withMembers: false, withEvent: false, tags: [] };

describe('mealPlanListFilters', () => {
  it('sorts upcoming plans ascending, then past plans newest first, undated last', () => {
    const past1 = plan(1, '2026-09-01T10:00:00', '2026-09-02T10:00:00');
    const past2 = plan(2, '2026-09-20T10:00:00', '2026-09-21T10:00:00');
    const later = plan(3, '2026-12-01T10:00:00', '2026-12-02T10:00:00');
    const soon = plan(4, '2026-10-09T10:00:00', '2026-10-11T10:00:00');
    const undated = plan(5, null, null);
    const ids = sortMealPlansByDate([past1, undated, later, past2, soon], 'date_upcoming', NOW).map((p) => p.id);
    expect(ids).toEqual([4, 3, 2, 1, 5]);
  });

  it('counts calendar days and filters by duration', () => {
    const weekend = plan(1, '2026-10-09T18:00:00', '2026-10-11T14:00:00');
    expect(planDurationDays(weekend)).toBe(3);
    expect(matchesMealPlanFilters(weekend, { ...ALL, duration: 'weekend' }, NOW)).toBe(true);
    expect(matchesMealPlanFilters(weekend, { ...ALL, duration: 'week' }, NOW)).toBe(false);
  });

  it('filters by timing, size and tags', () => {
    const running = plan(1, '2026-10-03T10:00:00', '2026-10-05T10:00:00', {
      norm_portions: 50,
      nutritional_tag_names: ['vegan'],
    });
    expect(matchesMealPlanFilters(running, { ...ALL, when: 'running' }, NOW)).toBe(true);
    expect(matchesMealPlanFilters(running, { ...ALL, when: 'past' }, NOW)).toBe(false);
    expect(matchesMealPlanFilters(running, { ...ALL, size: 'large' }, NOW)).toBe(true);
    expect(matchesMealPlanFilters(running, { ...ALL, tags: ['vegan'] }, NOW)).toBe(true);
    expect(matchesMealPlanFilters(running, { ...ALL, tags: ['vegan', 'glutenfrei'] }, NOW)).toBe(false);
  });
});
