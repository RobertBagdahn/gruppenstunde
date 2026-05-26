/**
 * Tests for nutritionCalculator utility.
 */
import { describe, it, expect } from 'vitest';
import {
  calculateNutrition,
  calculatePer100g,
  type ModifiedItem,
  type NutritionTotals,
} from '@/utils/nutritionCalculator';

/** Helper to create a ModifiedItem with sensible defaults. */
function makeItem(overrides: Partial<ModifiedItem> = {}): ModifiedItem {
  return {
    recipe_item_id: 1,
    ingredient_id: 100,
    ingredient_name: 'Test Ingredient',
    quantity: 1,
    portion_name: 'Stück',
    weight_g: 100,
    price_eur: null,
    per100g: {
      energy_kj: 200,
      energy_kcal: 50,
      protein_g: 5,
      fat_g: 2,
      fat_sat_g: 1,
      carbohydrate_g: 10,
      sugar_g: 3,
      fibre_g: 1,
      salt_g: 0.5,
    },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// calculateNutrition
// ---------------------------------------------------------------------------

describe('calculateNutrition', () => {
  it('calculates totals for a single 100g item', () => {
    const items = [makeItem({ weight_g: 100 })];
    const result = calculateNutrition(items, null);

    expect(result.total_weight_g).toBe(100);
    expect(result.total_energy_kj).toBe(200);
    expect(result.total_energy_kcal).toBe(50);
    expect(result.total_protein_g).toBe(5);
    expect(result.total_fat_g).toBe(2);
    expect(result.total_fat_sat_g).toBe(1);
    expect(result.total_carbohydrate_g).toBe(10);
    expect(result.total_sugar_g).toBe(3);
    expect(result.total_fibre_g).toBe(1);
    expect(result.total_salt_g).toBe(0.5);
  });

  it('scales values for a 200g item (2x per100g)', () => {
    const items = [makeItem({ weight_g: 200 })];
    const result = calculateNutrition(items, null);

    expect(result.total_weight_g).toBe(200);
    expect(result.total_energy_kcal).toBe(100);
    expect(result.total_protein_g).toBe(10);
    expect(result.total_fat_g).toBe(4);
    expect(result.total_carbohydrate_g).toBe(20);
  });

  it('sums values for two items', () => {
    const items = [
      makeItem({ recipe_item_id: 1, weight_g: 100 }),
      makeItem({
        recipe_item_id: 2,
        ingredient_name: 'Second',
        weight_g: 200,
        per100g: {
          energy_kj: 100,
          energy_kcal: 25,
          protein_g: 2,
          fat_g: 1,
          fat_sat_g: 0.5,
          carbohydrate_g: 5,
          sugar_g: 1,
          fibre_g: 0.5,
          salt_g: 0.2,
        },
      }),
    ];
    const result = calculateNutrition(items, null);

    expect(result.total_weight_g).toBe(300);
    // Item 1: 100g * (50/100) = 50 kcal. Item 2: 200g * (25/100) = 50 kcal.
    expect(result.total_energy_kcal).toBe(100);
    // Item 1: 5g. Item 2: 200g * (2/100) = 4g.
    expect(result.total_protein_g).toBe(9);
  });

  it('calculates per-serving values when servings is provided', () => {
    const items = [makeItem({ weight_g: 400 })];
    const result = calculateNutrition(items, 4);

    // Total kcal: 400 * (50/100) = 200
    expect(result.total_energy_kcal).toBe(200);
    expect(result.per_serving_energy_kcal).toBe(50);
    expect(result.per_serving_protein_g).toBe(5);
    expect(result.per_serving_fat_g).toBe(2);
    expect(result.per_serving_carbohydrate_g).toBe(10);
  });

  it('returns null per-serving values when servings is null', () => {
    const items = [makeItem({ weight_g: 200 })];
    const result = calculateNutrition(items, null);

    expect(result.per_serving_energy_kcal).toBeNull();
    expect(result.per_serving_protein_g).toBeNull();
    expect(result.per_serving_fat_g).toBeNull();
    expect(result.per_serving_carbohydrate_g).toBeNull();
  });

  it('returns all zeros for empty items', () => {
    const result = calculateNutrition([], null);

    expect(result.total_weight_g).toBe(0);
    expect(result.total_energy_kj).toBe(0);
    expect(result.total_energy_kcal).toBe(0);
    expect(result.total_protein_g).toBe(0);
    expect(result.total_fat_g).toBe(0);
    expect(result.total_carbohydrate_g).toBe(0);
    expect(result.items).toHaveLength(0);
  });

  it('aggregates prices when all items have price_eur', () => {
    const items = [
      makeItem({ recipe_item_id: 1, price_eur: 1.5 }),
      makeItem({ recipe_item_id: 2, price_eur: 2.5 }),
    ];
    const result = calculateNutrition(items, null);

    expect(result.total_price_eur).toBe(4.0);
  });

  it('returns null total_price_eur when all items have null price', () => {
    const items = [
      makeItem({ recipe_item_id: 1, price_eur: null }),
      makeItem({ recipe_item_id: 2, price_eur: null }),
    ];
    const result = calculateNutrition(items, null);

    expect(result.total_price_eur).toBeNull();
  });

  it('calculates weight_pct that adds to 100', () => {
    const items = [
      makeItem({ recipe_item_id: 1, weight_g: 300 }),
      makeItem({ recipe_item_id: 2, weight_g: 200 }),
    ];
    const result = calculateNutrition(items, null);

    const pctSum = result.items.reduce((sum, item) => sum + item.weight_pct, 0);
    expect(pctSum).toBeCloseTo(100, 5);
    expect(result.items[0].weight_pct).toBeCloseTo(60, 5);
    expect(result.items[1].weight_pct).toBeCloseTo(40, 5);
  });
});

// ---------------------------------------------------------------------------
// calculatePer100g
// ---------------------------------------------------------------------------

describe('calculatePer100g', () => {
  it('converts totals to per-100g values', () => {
    const totals: NutritionTotals = {
      total_weight_g: 500,
      total_price_eur: null,
      total_energy_kj: 1000,
      total_energy_kcal: 250,
      total_protein_g: 25,
      total_fat_g: 10,
      total_fat_sat_g: 5,
      total_carbohydrate_g: 50,
      total_sugar_g: 15,
      total_fibre_g: 5,
      total_salt_g: 2.5,
      per_serving_energy_kcal: null,
      per_serving_protein_g: null,
      per_serving_fat_g: null,
      per_serving_carbohydrate_g: null,
      items: [],
    };

    const per100 = calculatePer100g(totals);

    // factor = 100 / 500 = 0.2
    expect(per100.energy_kj).toBeCloseTo(200, 5);
    expect(per100.energy_kcal).toBeCloseTo(50, 5);
    expect(per100.protein_g).toBeCloseTo(5, 5);
    expect(per100.fat_g).toBeCloseTo(2, 5);
    expect(per100.fat_sat_g).toBeCloseTo(1, 5);
    expect(per100.carbohydrate_g).toBeCloseTo(10, 5);
    expect(per100.sugar_g).toBeCloseTo(3, 5);
    expect(per100.fibre_g).toBeCloseTo(1, 5);
    expect(per100.salt_g).toBeCloseTo(0.5, 5);
  });

  it('returns zeros when total weight is 0', () => {
    const totals: NutritionTotals = {
      total_weight_g: 0,
      total_price_eur: null,
      total_energy_kj: 0,
      total_energy_kcal: 0,
      total_protein_g: 0,
      total_fat_g: 0,
      total_fat_sat_g: 0,
      total_carbohydrate_g: 0,
      total_sugar_g: 0,
      total_fibre_g: 0,
      total_salt_g: 0,
      per_serving_energy_kcal: null,
      per_serving_protein_g: null,
      per_serving_fat_g: null,
      per_serving_carbohydrate_g: null,
      items: [],
    };

    const per100 = calculatePer100g(totals);

    expect(per100.energy_kj).toBe(0);
    expect(per100.energy_kcal).toBe(0);
    expect(per100.protein_g).toBe(0);
    expect(per100.fat_g).toBe(0);
    expect(per100.carbohydrate_g).toBe(0);
  });
});
