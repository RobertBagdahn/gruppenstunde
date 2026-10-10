import { describe, it, expect } from 'vitest';
import { getBreakfastSummary } from './formatItemDisplay';
import type { MealItem } from '@/schemas/mealPlan';

describe('formatItemDisplay', () => {
  it('summarizes breakfast items accurately', () => {
    const items: MealItem[] = [
      {
        id: 1,
        recipe_id: null,
        recipe_title: '',
        recipe_slug: '',
        image_url: null,
        ingredient_id: 1,
        ingredient_name: 'Brot',
        ingredient_slug: 'brot',
        quantity: 1,
        measuring_unit_id: null,
        measuring_unit_name: '',
        standard_measure_key: '',
        unit_kind: 'grams',
        unit_label: 'g',
        is_weight_approx: false,
        display_name: null,
        factor: 1,
        active_recipe_item_ids: [],
        variant_group_id: null,
        energy_kcal: 2000,
        cost_eur: 10,
        quantity_g: 500,
        ingredient_tags: [],
        recipe_type: '',
        overrides: [],
        has_missing_weight: false,
        is_per_norm_person: true,
        buffet_role: '',
        is_breakfast_assistant: false,
      warnings: [],
      },
      {
        id: 2,
        recipe_id: null,
        recipe_title: '',
        recipe_slug: '',
        image_url: null,
        ingredient_id: 2,
        ingredient_name: 'Käse',
        ingredient_slug: 'kaese',
        quantity: 1,
        measuring_unit_id: null,
        measuring_unit_name: '',
        standard_measure_key: '',
        unit_kind: 'grams',
        unit_label: 'g',
        is_weight_approx: false,
        display_name: null,
        factor: 1,
        active_recipe_item_ids: [],
        variant_group_id: null,
        energy_kcal: 1000,
        cost_eur: 5,
        quantity_g: 200,
        ingredient_tags: [],
        recipe_type: '',
        overrides: [],
        has_missing_weight: false,
        is_per_norm_person: true,
        buffet_role: '',
        is_breakfast_assistant: false,
      warnings: [],
      },
    ];

    const summary = getBreakfastSummary(items, 10);
    expect(summary.itemsCount).toBe(2);
    expect(summary.totalKcalPerPerson).toBe(300); // 3000 / 10
    expect(summary.totalCostPerPerson).toBe(1.5); // 15 / 10
    expect(summary.previewNames).toEqual(['Brot', 'Käse']);
  });
});
