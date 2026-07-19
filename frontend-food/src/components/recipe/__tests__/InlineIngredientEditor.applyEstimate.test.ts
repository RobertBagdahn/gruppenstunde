import { describe, it, expect } from 'vitest';
import { applyEstimateToItem, getItemWeightG, type EditableItem } from '../InlineIngredientEditor';
import type { EstimateQuantityItem } from '@/schemas/recipe';

/**
 * Regression tests for the AI-Mengenschätzung "Übernehmen" data-corruption bug
 * (fix-portion-integrity-and-ai-estimate): applying an estimate MUST update
 * `portion_id` and `quantity` atomically. Previously only `quantity` was
 * applied, leaving the item on its old portion — if that portion differed
 * from the one the AI's `quantity_per_portion` was computed for, the
 * resulting gram amount was silently wrong by whatever factor separated the
 * two portions' `weight_g` (observed live: 10x–333x on recipe #59 "Linsensuppe").
 */

function makeItem(overrides: Partial<EditableItem> = {}): EditableItem {
  return {
    id: 3309,
    portion_id: 442,
    ingredient_id: 145,
    ingredient_name: 'Jodsalz',
    quantity: 7.3128,
    quantityInput: '7.3128',
    measuring_unit_name: 'Gramm',
    note: '',
    sort_order: 0,
    is_optional: false,
    exchange_group_id: null,
    exchange_position: null,
    ingredient_portions: [],
    baseWeightG: 7.3128,
    baseQuantity: 0.073,
    ...overrides,
  };
}

function makeEstimate(overrides: Partial<EstimateQuantityItem> = {}): EstimateQuantityItem {
  return {
    item_id: 3309,
    ingredient_name: 'Jodsalz',
    quantity_per_portion: 10.0,
    portion_id: 32744, // the ingredient's live rank=1 "Prise" portion, weight_g=0.3
    unit: 'Prise',
    grams_total: 3.0,
    ...overrides,
  };
}

describe('applyEstimateToItem', () => {
  it('updates portion_id AND quantity together when the estimate targets a different portion', () => {
    const item = makeItem();
    const estimate = makeEstimate();

    const result = applyEstimateToItem(item, estimate);

    expect(result.portion_id).toBe(32744);
    expect(result.portion_id).not.toBe(item.portion_id);
    expect(result.quantity).toBe(3.0);
    expect(result.measuring_unit_name).toBe('Prise');
    expect(result.isDirty).toBe(true);
  });

  it('results in the AI-intended gram amount, not a value inflated by the old mismatched portion', () => {
    const item = makeItem();
    const estimate = makeEstimate();

    const result = applyEstimateToItem(item, estimate);

    // getItemWeightG() must reflect the estimate's true intent (3g), not
    // 10 * old_portion.weight_g (100g) = 1000g — the exact corruption bug.
    expect(getItemWeightG(result)).toBe(3.0);
  });

  it('sets aiExpectedGramsTotal so the save path can verify the result server-side', () => {
    const result = applyEstimateToItem(makeItem(), makeEstimate());
    expect(result.aiExpectedGramsTotal).toBe(3.0);
  });

  it('keeps portion_id unchanged when the estimate targets the same portion the item already has', () => {
    const item = makeItem({
      portion_id: 470,
      quantity: 731.28,
      quantityInput: '731.28',
      baseWeightG: 731.28,
      baseQuantity: 7.3128,
    });
    const estimate = makeEstimate({
      portion_id: 470,
      unit: 'Gramm',
      quantity_per_portion: 0.8,
      grams_total: 80.0,
    });

    const result = applyEstimateToItem(item, estimate);

    expect(result.portion_id).toBe(470);
    expect(result.quantity).toBe(80.0);
    expect(getItemWeightG(result)).toBe(80.0);
  });

  it('regression: reproduces and fixes the recipe #59 "Linsensuppe" Olivenöl case (10x corruption)', () => {
    const item = makeItem({
      id: 3306,
      ingredient_name: 'Olivenöl nativ extra',
      portion_id: 430,
      quantity: 48.8,
      quantityInput: '48.8',
      baseWeightG: 48.8,
      baseQuantity: 0.488,
    });
    const estimate = makeEstimate({
      item_id: 3306,
      ingredient_name: 'Olivenöl nativ extra',
      portion_id: 16764, // "Portion" (1 EL), rank=1, weight_g=10
      quantity_per_portion: 1.0,
      unit: 'Esslöffel',
      grams_total: 10.0,
    });

    const result = applyEstimateToItem(item, estimate);

    expect(result.portion_id).toBe(16764);
    expect(getItemWeightG(result)).toBe(10.0); // not 1.0 * 100 = 100g
  });
});
