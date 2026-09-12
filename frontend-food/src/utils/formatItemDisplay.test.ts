import { describe, it, expect } from 'vitest';
import { formatItemPortion, formatQuantityNumber, getBreakfastSummary } from './formatItemDisplay';
import type { MealItem } from '@/schemas/mealPlan';

describe('formatItemDisplay', () => {
  it('formats numbers with comma correctly', () => {
    expect(formatQuantityNumber(1)).toBe('1');
    expect(formatQuantityNumber(1.5)).toBe('1,5');
    expect(formatQuantityNumber(0.17)).toBe('0,17');
    expect(formatQuantityNumber(16.7)).toBe('16,7');
  });

  it('strips redundant ingredient name from portion_display', () => {
    const item: MealItem = {
      id: 1,
      recipe_id: null,
      recipe_title: '',
      recipe_slug: '',
      image_url: null,
      ingredient_id: 10,
      ingredient_name: 'Emmentaler Hartkäse',
      ingredient_slug: 'emmentaler-hartkaese',
      quantity: 16.7,
      measuring_unit_id: 1,
      measuring_unit_name: 'Gramm',
      display_name: null,
      factor: 1,
      active_recipe_item_ids: [],
      variant_group_id: null,
      energy_kcal: 63,
      cost_eur: 0.2,
      quantity_g: 16.7,
      ingredient_tags: [],
      recipe_type: '',
      overrides: [],
      portion_display: '16,7 Gramm Emmentaler Hartkäse (17g)',
      has_missing_weight: false,
      is_per_norm_person: true,
    };

    const label = formatItemPortion(item);
    // Should NOT contain "Emmentaler Hartkäse"
    expect(label).not.toContain('Emmentaler');
    expect(label).toBe('16,7 g (17g) / P.');
  });

  it('handles item without portion_display using quantity and unit', () => {
    const item: MealItem = {
      id: 2,
      recipe_id: null,
      recipe_title: '',
      recipe_slug: '',
      image_url: null,
      ingredient_id: 11,
      ingredient_name: 'Bauernbrot',
      ingredient_slug: 'bauernbrot',
      quantity: 2,
      measuring_unit_id: 2,
      measuring_unit_name: 'Scheibe',
      display_name: null,
      factor: 1,
      active_recipe_item_ids: [],
      variant_group_id: null,
      energy_kcal: 200,
      cost_eur: 0.3,
      quantity_g: 100,
      ingredient_tags: [],
      recipe_type: '',
      overrides: [],
      portion_display: '',
      has_missing_weight: false,
      is_per_norm_person: true,
    };

    const label = formatItemPortion(item);
    expect(label).toBe('2 Scheibe (100g) / P.');
  });

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
        portion_display: '',
        has_missing_weight: false,
        is_per_norm_person: true,
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
        portion_display: '',
        has_missing_weight: false,
        is_per_norm_person: true,
      },
    ];

    const summary = getBreakfastSummary(items, 10);
    expect(summary.itemsCount).toBe(2);
    expect(summary.totalKcalPerPerson).toBe(300); // 3000 / 10
    expect(summary.totalCostPerPerson).toBe(1.5); // 15 / 10
    expect(summary.previewNames).toEqual(['Brot', 'Käse']);
  });
});
