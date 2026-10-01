import { describe, it, expect } from 'vitest';
import { compareMealsByTime, getCoverageBadge, groupMealsByDate, type Meal } from './mealPlan';

function meal(id: number, meal_type: string, start_datetime: string | null): Meal {
  return {
    id,
    start_datetime,
    end_datetime: null,
    meal_type,
    day_part_factor: 0.25,
    display_name: '',
    override_portions: null,
    note: '',
    note_is_published: false,
    is_reference: false,
    ref_meal_id: null,
    is_synced: false,
    buffet_template_id: null,
    is_external: false,
    external_energy_kcal: null,
    external_cost_per_person: null,
    total_energy_kcal: 0,
    total_cost_eur: 0,
    price_coverage: null,
    items: [],
  };
}

describe('getCoverageBadge', () => {
  it('labels a fully planned day', () => {
    expect(getCoverageBadge(0.9)).toMatchObject({ label: 'Alle Mahlzeiten geplant', status: 'green' });
    expect(getCoverageBadge(0.8).label).toBe('Alle Mahlzeiten geplant');
  });

  it('labels a partially planned day with its percentage', () => {
    expect(getCoverageBadge(0.25)).toMatchObject({ label: 'Teilweise geplant (25 %)', status: 'red' });
    expect(getCoverageBadge(0.6)).toMatchObject({ label: 'Teilweise geplant (60 %)', status: 'yellow' });
  });

  it('labels an overplanned day in warning colour instead of capping at 100 %', () => {
    expect(getCoverageBadge(1.1)).toMatchObject({ label: 'Überplant (110 %)', status: 'overplanned' });
  });
});

describe('meal sorting by time', () => {
  it('orders a day by start time: lunch, snack, dinner', () => {
    const [day] = groupMealsByDate([
      meal(3, 'dinner', '2026-06-26T18:00:00'),
      meal(2, 'snack', '2026-06-26T15:00:00'),
      meal(1, 'lunch', '2026-06-26T12:00:00'),
    ]);
    expect(day.meals.map((m) => m.meal_type)).toEqual(['lunch', 'snack', 'dinner']);
  });

  it('falls back to the meal type order at the same time', () => {
    const sorted = [
      meal(1, 'drinks', '2026-06-26T12:00:00'),
      meal(2, 'snack', '2026-06-26T12:00:00'),
      meal(3, 'lunch', '2026-06-26T12:00:00'),
    ].sort(compareMealsByTime);
    expect(sorted.map((m) => m.meal_type)).toEqual(['lunch', 'snack', 'drinks']);
  });

  it('groups by date in ascending order and skips meals without date', () => {
    const groups = groupMealsByDate([
      meal(1, 'lunch', '2026-06-27T12:00:00'),
      meal(2, 'breakfast', null),
      meal(3, 'lunch', '2026-06-26T12:00:00'),
    ]);
    expect(groups.map((g) => g.date)).toEqual(['2026-06-26', '2026-06-27']);
    expect(groups.flatMap((g) => g.meals).map((m) => m.id)).toEqual([3, 1]);
  });

  it('does not mutate the input array', () => {
    const meals = [meal(2, 'dinner', '2026-06-26T18:00:00'), meal(1, 'lunch', '2026-06-26T12:00:00')];
    groupMealsByDate(meals);
    expect(meals.map((m) => m.id)).toEqual([2, 1]);
  });
});
