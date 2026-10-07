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

  it('formats a gram-unit item from quantity_g without duplicating the unit', () => {
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
      has_missing_weight: false,
      is_per_norm_person: true,
      buffet_role: '',
      is_breakfast_assistant: false,
      warnings: [],
    };

    const label = formatItemPortion(item);
    // Should NOT contain the ingredient name
    expect(label).not.toContain('Emmentaler');
    expect(label).toBe('16,7 g / P.');
  });

  it('formats a named-portion item using quantity and unit', () => {
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
      has_missing_weight: false,
      is_per_norm_person: true,
      buffet_role: '',
      is_breakfast_assistant: false,
      warnings: [],
    };

    const label = formatItemPortion(item);
    expect(label).toBe('2 Scheibe / P. (100 g)');
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

  it('shows the chosen portion with its weight', () => {
    const item = {
      id: 3,
      recipe_id: null,
      recipe_title: '',
      recipe_slug: '',
      image_url: null,
      ingredient_id: 11,
      ingredient_name: 'Toastbrot',
      ingredient_slug: 'toastbrot',
      quantity: 1,
      measuring_unit_id: 1,
      measuring_unit_name: 'Gramm',
      portion_id: 7,
      portion_name: 'Scheibe',
      display_name: null,
      factor: 1,
      active_recipe_item_ids: [],
      variant_group_id: null,
      energy_kcal: 80,
      cost_eur: 0.05,
      quantity_g: 30,
      ingredient_tags: [],
      recipe_type: '',
      overrides: [],
      has_missing_weight: false,
      is_per_norm_person: true,
      buffet_role: '',
      is_breakfast_assistant: false,
      warnings: [],
    } satisfies MealItem;

    expect(formatItemPortion(item)).toBe('1 Scheibe / P. (30 g)');
  });

  it('names a pre-weighed portion instead of its gram unit', () => {
    const item = {
      id: 4,
      recipe_id: null,
      recipe_title: '',
      recipe_slug: '',
      image_url: null,
      ingredient_id: 12,
      ingredient_name: 'Frischkäse',
      ingredient_slug: 'frischkaese',
      quantity: 0.5,
      measuring_unit_id: 1,
      measuring_unit_name: 'Gramm',
      portion_id: 8,
      portion_name: 'EL',
      display_name: null,
      factor: 1,
      active_recipe_item_ids: [],
      variant_group_id: null,
      energy_kcal: 37,
      cost_eur: 0.1,
      quantity_g: 15,
      ingredient_tags: [],
      recipe_type: '',
      overrides: [],
      has_missing_weight: false,
      is_per_norm_person: true,
      buffet_role: '',
      is_breakfast_assistant: false,
      warnings: [],
    } satisfies MealItem;

    expect(formatItemPortion(item)).toBe('0,5 EL / P. (15 g)');
    expect(formatItemPortion({ ...item, portion_id: null, portion_name: '', quantity: 15 })).toBe('15 g / P.');
  });
});
