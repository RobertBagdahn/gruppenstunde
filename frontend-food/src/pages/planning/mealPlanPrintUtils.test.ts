import { describe, it, expect } from 'vitest';
import {
  formatDate,
  formatTime,
  groupMealsByDate,
  formatIngredients,
  aggregateIngredientsByDay,
  calculateTotalIngredients,
  type DaySection,
  type AggregatedIngredient,
} from './mealPlanPrintUtils';
import type { Meal, MealItem } from '@/schemas/mealPlan';

function makeMealItem(overrides: Partial<MealItem> = {}): MealItem {
  return {
    id: 1,
    recipe_id: null,
    recipe_title: '',
    recipe_slug: '',
    recipe_image: null,
    ingredient_id: null,
    ingredient_name: '',
    ingredient_slug: '',
    quantity: null,
    measuring_unit_id: null,
    measuring_unit_name: '',
    display_name: null,
    factor: 1,
    active_recipe_item_ids: [],
    variant_group_id: null,
    energy_kcal: null,
    cost_eur: null,
    quantity_g: null,
    ingredient_tags: [],
    recipe_type: '',
    overrides: [],
    portion_display: '',
    has_missing_weight: false,
    is_per_norm_person: true,
    ...overrides,
  };
}

function makeMeal(overrides: Partial<Meal> & { items?: MealItem[] } = {}): Meal {
  const { items, ...rest } = overrides;
  return {
    id: 1,
    start_datetime: '2026-07-15T08:00:00Z',
    end_datetime: '2026-07-15T09:00:00Z',
    meal_type: 'breakfast',
    day_part_factor: 1,
    display_name: 'Frühstück',
    override_portions: null,
    note: '',
    note_is_published: false,
    is_reference: false,
    ref_meal_id: null,
    is_synced: false,
    is_external: false,
    external_energy_kcal: null,
    external_cost_per_person: null,
    total_energy_kcal: 0,
    total_cost_eur: 0,
    items: items ?? [],
    ...rest,
  };
}

// ==========================================================================
// formatDate
// ==========================================================================

describe('formatDate', () => {
  it('formats a valid date string in German', () => {
    const result = formatDate('2026-07-15T12:00:00Z');
    expect(result).toMatch(/Mittwoch/);
    expect(result).toMatch(/15\. Juli 2026/);
  });

  it('returns the original string for invalid dates', () => {
    const result = formatDate('invalid');
    expect(result).toBe('invalid');
  });

  it('returns the original string for empty string', () => {
    const result = formatDate('');
    expect(result).toBe('');
  });
});

// ==========================================================================
// formatTime
// ==========================================================================

describe('formatTime', () => {
  it('formats a valid datetime to HH:mm', () => {
    const result = formatTime('2026-07-15T08:30:00');
    expect(result).toBe('08:30');
  });

  it('returns empty string for invalid input', () => {
    const result = formatTime('invalid');
    expect(result).toBe('');
  });

  it('returns empty string for empty input', () => {
    const result = formatTime('');
    expect(result).toBe('');
  });
});

// ==========================================================================
// groupMealsByDate
// ==========================================================================

describe('groupMealsByDate', () => {
  it('returns empty array for undefined input', () => {
    expect(groupMealsByDate(undefined)).toEqual([]);
  });

  it('returns empty array for empty meals array', () => {
    expect(groupMealsByDate([])).toEqual([]);
  });

  it('groups meals by date correctly', () => {
    const meals: Meal[] = [
      makeMeal({ id: 1, start_datetime: '2026-07-15T08:00:00Z', meal_type: 'breakfast' }),
      makeMeal({ id: 2, start_datetime: '2026-07-15T12:00:00Z', meal_type: 'lunch' }),
      makeMeal({ id: 3, start_datetime: '2026-07-16T08:00:00Z', meal_type: 'breakfast' }),
    ];

    const result = groupMealsByDate(meals);

    expect(result).toHaveLength(2);
    expect(result[0].date).toBe('2026-07-15');
    expect(result[0].meals).toHaveLength(2);
    expect(result[1].date).toBe('2026-07-16');
    expect(result[1].meals).toHaveLength(1);
  });

  it('sorts meals within a day by start_datetime', () => {
    const meals: Meal[] = [
      makeMeal({ id: 1, start_datetime: '2026-07-15T18:00:00Z', meal_type: 'dinner' }),
      makeMeal({ id: 2, start_datetime: '2026-07-15T08:00:00Z', meal_type: 'breakfast' }),
      makeMeal({ id: 3, start_datetime: '2026-07-15T12:00:00Z', meal_type: 'lunch' }),
    ];

    const result = groupMealsByDate(meals);

    expect(result[0].meals[0].id).toBe(2);
    expect(result[0].meals[1].id).toBe(3);
    expect(result[0].meals[2].id).toBe(1);
  });

  it('handles meals without start_datetime (Unbekannt grouping)', () => {
    const meals: Meal[] = [
      makeMeal({ id: 1, start_datetime: null, meal_type: 'breakfast' }),
    ];

    const result = groupMealsByDate(meals);

    expect(result).toHaveLength(1);
    expect(result[0].date).toBe('Unbekannt');
    expect(result[0].formattedDate).toBe('Unbekannt');
  });

  it('sorts days chronologically', () => {
    const meals: Meal[] = [
      makeMeal({ id: 1, start_datetime: '2026-07-17T08:00:00Z', meal_type: 'breakfast' }),
      makeMeal({ id: 2, start_datetime: '2026-07-15T08:00:00Z', meal_type: 'breakfast' }),
      makeMeal({ id: 3, start_datetime: '2026-07-16T08:00:00Z', meal_type: 'breakfast' }),
    ];

    const result = groupMealsByDate(meals);

    expect(result[0].date).toBe('2026-07-15');
    expect(result[1].date).toBe('2026-07-16');
    expect(result[2].date).toBe('2026-07-17');
  });
});

// ==========================================================================
// formatIngredients
// ==========================================================================

describe('formatIngredients', () => {
  it('returns placeholder for undefined items', () => {
    expect(formatIngredients(undefined)).toBe('[Zutaten nicht verfügbar]');
  });

  it('returns placeholder for empty items array', () => {
    expect(formatIngredients([])).toBe('[Zutaten nicht verfügbar]');
  });

  it('formats recipe-based items with portion display', () => {
    const items: MealItem[] = [
      makeMealItem({
        recipe_title: 'Pancakes',
        portion_display: '4 Port.',
        quantity: null,
      }),
    ];

    expect(formatIngredients(items)).toBe('Pancakes (4 Port.)');
  });

  it('formats recipe-based items without portion display', () => {
    const items: MealItem[] = [
      makeMealItem({ recipe_title: 'Spaghetti Bolognese', portion_display: '' }),
    ];

    expect(formatIngredients(items)).toBe('Spaghetti Bolognese');
  });

  it('formats ingredient-based items with quantity and unit', () => {
    const items: MealItem[] = [
      makeMealItem({
        ingredient_name: 'Mehl',
        quantity: 500,
        measuring_unit_name: 'g',
      }),
    ];

    expect(formatIngredients(items)).toBe('Mehl (500 g)');
  });

  it('formats ingredient-based items without quantity', () => {
    const items: MealItem[] = [
      makeMealItem({ ingredient_name: 'Salz' }),
    ];

    expect(formatIngredients(items)).toBe('Salz');
  });

  it('returns placeholder when all items have no recipe_title or ingredient_name', () => {
    const items: MealItem[] = [
      makeMealItem({ recipe_title: '', ingredient_name: '', id: 99 }),
    ];

    expect(formatIngredients(items)).toBe('[Zutaten nicht verfügbar]');
  });

  it('joins multiple items with commas', () => {
    const items: MealItem[] = [
      makeMealItem({
        recipe_title: 'Pancakes',
        portion_display: '4 Port.',
        id: 1,
      }),
      makeMealItem({
        ingredient_name: 'Sirup',
        quantity: 100,
        measuring_unit_name: 'ml',
        id: 2,
      }),
    ];

    const result = formatIngredients(items);
    expect(result).toBe('Pancakes (4 Port.), Sirup (100 ml)');
  });

  it('handles mixed items (recipe and ingredient types)', () => {
    const items: MealItem[] = [
      makeMealItem({ recipe_title: 'Rührei', id: 1 }),
      makeMealItem({ ingredient_name: 'Brötchen', quantity: 10, measuring_unit_name: 'Stück', id: 2 }),
      makeMealItem({ recipe_title: 'Obstsalat', portion_display: '6 Port.', id: 3 }),
    ];

    const result = formatIngredients(items);
    expect(result).toBe('Rührei, Brötchen (10 Stück), Obstsalat (6 Port.)');
  });
});

// ==========================================================================
// aggregateIngredientsByDay
// ==========================================================================

describe('aggregateIngredientsByDay', () => {
  it('returns empty record for empty days', () => {
    expect(aggregateIngredientsByDay([])).toEqual({});
  });

  it('aggregates single ingredient within a day', () => {
    const days: DaySection[] = [
      {
        date: '2026-07-15',
        formattedDate: 'Mittwoch, 15. Juli 2026',
        meals: [
          makeMeal({
            items: [
              makeMealItem({
                ingredient_name: 'Mehl',
                quantity: 500,
                measuring_unit_name: 'g',
                quantity_g: 500,
              }),
            ],
          }),
        ],
      },
    ];

    const result = aggregateIngredientsByDay(days);
    const dayKey = 'Mittwoch, 15. Juli 2026';

    expect(Object.keys(result)).toHaveLength(1);
    expect(result[dayKey]).toHaveLength(1);
    expect(result[dayKey][0].ingredient_name).toBe('Mehl');
    expect(result[dayKey][0].display_text).toBe('500 g');
    expect(result[dayKey][0].total_quantity_g).toBe(500);
  });

  it('sums same ingredient across multiple meals in a day', () => {
    const days: DaySection[] = [
      {
        date: '2026-07-15',
        formattedDate: 'Tag 1',
        meals: [
          makeMeal({
            items: [
              makeMealItem({
                ingredient_name: 'Mehl',
                quantity: 300,
                measuring_unit_name: 'g',
                quantity_g: 300,
              }),
            ],
          }),
          makeMeal({
            items: [
              makeMealItem({
                ingredient_name: 'Mehl',
                quantity: 200,
                measuring_unit_name: 'g',
                quantity_g: 200,
              }),
            ],
          }),
        ],
      },
    ];

    const result = aggregateIngredientsByDay(days);

    expect(result['Tag 1']).toHaveLength(1);
    expect(result['Tag 1'][0].total_quantity_g).toBe(500);
    expect(result['Tag 1'][0].net_quantity_g).toBe(500);
  });

  it('handles multiple days with different ingredients', () => {
    const days: DaySection[] = [
      {
        date: '2026-07-15',
        formattedDate: 'Tag 1',
        meals: [
          makeMeal({
            items: [
              makeMealItem({
                ingredient_name: 'Mehl',
                quantity: 500,
                measuring_unit_name: 'g',
                quantity_g: 500,
              }),
            ],
          }),
        ],
      },
      {
        date: '2026-07-16',
        formattedDate: 'Tag 2',
        meals: [
          makeMeal({
            items: [
              makeMealItem({
                ingredient_name: 'Zucker',
                quantity: 100,
                measuring_unit_name: 'g',
                quantity_g: 100,
              }),
            ],
          }),
        ],
      },
    ];

    const result = aggregateIngredientsByDay(days);

    expect(Object.keys(result)).toHaveLength(2);
    expect(result['Tag 1'][0].ingredient_name).toBe('Mehl');
    expect(result['Tag 2'][0].ingredient_name).toBe('Zucker');
  });

  it('skips items without ingredient_name', () => {
    const days: DaySection[] = [
      {
        date: '2026-07-15',
        formattedDate: 'Tag 1',
        meals: [
          makeMeal({
            items: [
              makeMealItem({ ingredient_name: '', id: 1 }),
              makeMealItem({
                ingredient_name: 'Mehl',
                quantity: 500,
                measuring_unit_name: 'g',
                quantity_g: 500,
                id: 2,
              }),
            ],
          }),
        ],
      },
    ];

    const result = aggregateIngredientsByDay(days);

    expect(result['Tag 1']).toHaveLength(1);
    expect(result['Tag 1'][0].ingredient_name).toBe('Mehl');
  });

  it('handles meals with no items (undefined)', () => {
    const days: DaySection[] = [
      {
        date: '2026-07-15',
        formattedDate: 'Tag 1',
        meals: [
          makeMeal({ items: undefined as unknown as MealItem[] }),
        ],
      },
    ];

    const result = aggregateIngredientsByDay(days);

    expect(result).toEqual({});
  });

  it('sorts ingredients alphabetically (German locale)', () => {
    const days: DaySection[] = [
      {
        date: '2026-07-15',
        formattedDate: 'Tag 1',
        meals: [
          makeMeal({
            items: [
              makeMealItem({
                ingredient_name: 'Zitrone',
                quantity: 1,
                measuring_unit_name: 'Stück',
              }),
              makeMealItem({
                ingredient_name: 'Apfel',
                quantity: 3,
                measuring_unit_name: 'Stück',
              }),
              makeMealItem({
                ingredient_name: 'Butter',
                quantity: 250,
                measuring_unit_name: 'g',
              }),
            ],
          }),
        ],
      },
    ];

    const result = aggregateIngredientsByDay(days);

    const names = result['Tag 1'].map((i) => i.ingredient_name);
    expect(names).toEqual(['Apfel', 'Butter', 'Zitrone']);
  });

  it('uses quantity_g for display_text when quantity is null', () => {
    const days: DaySection[] = [
      {
        date: '2026-07-15',
        formattedDate: 'Tag 1',
        meals: [
          makeMeal({
            items: [
              makeMealItem({
                ingredient_name: 'Salz',
                quantity: null,
                measuring_unit_name: 'g',
                quantity_g: 15,
              }),
            ],
          }),
        ],
      },
    ];

    const result = aggregateIngredientsByDay(days);

    expect(result['Tag 1'][0].display_text).toBe('15g');
  });

  it('excludes days that have no ingredients after filtering', () => {
    const days: DaySection[] = [
      {
        date: '2026-07-15',
        formattedDate: 'Tag 1',
        meals: [
          makeMeal({
            items: [
              makeMealItem({ ingredient_name: '', id: 1 }),
            ],
          }),
        ],
      },
    ];

    const result = aggregateIngredientsByDay(days);

    expect(result).toEqual({});
  });
});

// ==========================================================================
// calculateTotalIngredients
// ==========================================================================

describe('calculateTotalIngredients', () => {
  it('returns empty array for empty input', () => {
    expect(calculateTotalIngredients({})).toEqual([]);
  });

  it('sums ingredients across days', () => {
    const byDay: Record<string, AggregatedIngredient[]> = {
      'Tag 1': [
        {
          ingredient_name: 'Mehl',
          total_quantity_g: 500,
          net_quantity_g: 500,
          reserve_quantity_g: 0,
          unit: 'g',
          display_text: '500 g',
        },
      ],
      'Tag 2': [
        {
          ingredient_name: 'Mehl',
          total_quantity_g: 300,
          net_quantity_g: 300,
          reserve_quantity_g: 0,
          unit: 'g',
          display_text: '300 g',
        },
      ],
    };

    const result = calculateTotalIngredients(byDay);

    expect(result).toHaveLength(1);
    expect(result[0].ingredient_name).toBe('Mehl');
    expect(result[0].total_quantity_g).toBe(800);
    expect(result[0].net_quantity_g).toBe(800);
  });

  it('handles multiple different ingredients across days', () => {
    const byDay: Record<string, AggregatedIngredient[]> = {
      'Tag 1': [
        {
          ingredient_name: 'Mehl',
          total_quantity_g: 500,
          net_quantity_g: 500,
          reserve_quantity_g: 0,
          unit: 'g',
          display_text: '500 g',
        },
        {
          ingredient_name: 'Zucker',
          total_quantity_g: 200,
          net_quantity_g: 200,
          reserve_quantity_g: 0,
          unit: 'g',
          display_text: '200 g',
        },
      ],
      'Tag 2': [
        {
          ingredient_name: 'Zucker',
          total_quantity_g: 100,
          net_quantity_g: 100,
          reserve_quantity_g: 0,
          unit: 'g',
          display_text: '100 g',
        },
      ],
    };

    const result = calculateTotalIngredients(byDay);

    expect(result).toHaveLength(2);
    expect(result[0].ingredient_name).toBe('Mehl');
    expect(result[0].total_quantity_g).toBe(500);
    expect(result[1].ingredient_name).toBe('Zucker');
    expect(result[1].total_quantity_g).toBe(300);
  });

  it('sorts totals alphabetically (German locale)', () => {
    const byDay: Record<string, AggregatedIngredient[]> = {
      'Tag 1': [
        {
          ingredient_name: 'Zitrone',
          total_quantity_g: 1,
          net_quantity_g: 1,
          reserve_quantity_g: 0,
          unit: 'Stück',
          display_text: '1 Stück',
        },
        {
          ingredient_name: 'Apfel',
          total_quantity_g: 3,
          net_quantity_g: 3,
          reserve_quantity_g: 0,
          unit: 'Stück',
          display_text: '3 Stück',
        },
      ],
    };

    const result = calculateTotalIngredients(byDay);

    const names = result.map((i) => i.ingredient_name);
    expect(names).toEqual(['Apfel', 'Zitrone']);
  });

  it('preserves display_text from first occurrence', () => {
    const byDay: Record<string, AggregatedIngredient[]> = {
      'Tag 1': [
        {
          ingredient_name: 'Mehl',
          total_quantity_g: 500,
          net_quantity_g: 500,
          reserve_quantity_g: 0,
          unit: 'g',
          display_text: 'Erste Meldung',
        },
      ],
      'Tag 2': [
        {
          ingredient_name: 'Mehl',
          total_quantity_g: 300,
          net_quantity_g: 300,
          reserve_quantity_g: 0,
          unit: 'g',
          display_text: 'Zweite Meldung',
        },
      ],
    };

    const result = calculateTotalIngredients(byDay);

    expect(result[0].display_text).toBe('Erste Meldung');
  });
});
