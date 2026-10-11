/**
 * Standard measures (EL, Tasse, …) stay the unit of a recipe item in the
 * inline editor (openspec change `switchable-quantity-units`, requirement
 * "Standardmaß-Auswahl behält die Einheit").
 */
import { describe, it, expect } from 'vitest';
import {
  applyPortionChange,
  applyStandardMeasureChange,
  getItemWeightG,
  normalizeItems,
  toPersistedRecipeItemQuantity,
} from '../InlineIngredientEditor';
import type { RecipeItem } from '@/schemas/recipe';

const gramPortion = {
  id: 10,
  name: 'g',
  quantity: 1,
  weight_g: 1,
  rank: 9999,
  is_default: false,
  measuring_unit_id: null,
  measuring_unit_name: 'Gramm',
};
const handvollPortion = {
  id: 11,
  name: 'Handvoll',
  quantity: 1,
  weight_g: 30,
  rank: 1,
  is_default: true,
  measuring_unit_id: null,
  measuring_unit_name: 'Handvoll',
};

function makeRecipeItem(overrides: Partial<RecipeItem>): RecipeItem {
  return {
    id: 1,
    portion_id: 10,
    portion_name: 'g',
    ingredient_id: 1,
    ingredient_name: 'Brotchips',
    ingredient_slug: 'brotchips',
    quantity: 200,
    measuring_unit_id: null,
    measuring_unit_name: 'Gramm',
    sort_order: 0,
    note: '',
    ingredient_portions: [handvollPortion, gramPortion],
    weight_g: 200,
    is_optional: false,
    exchange_group_id: null,
    exchange_position: null,
    portion_display: '',
    has_missing_weight: false,
    ...overrides,
  };
}

const tasse = { key: 'tasse', name: '1 Tasse', grams: 200, volume_ml: 200, is_approx: true };
const el = { key: 'el', name: '1 EL', grams: 15, volume_ml: 15, is_approx: true };

describe('InlineIngredientEditor standard measures', () => {
  it('switches 200 g to 1 Tasse and keeps the measure as unit', () => {
    const [item] = normalizeItems([makeRecipeItem({})], 1);

    const next = applyStandardMeasureChange(item, tasse);

    expect(next.standard_measure_key).toBe('tasse');
    expect(next.portion_id).toBe(10);
    expect(next.measuring_unit_name).toBe('Tasse');
    expect(next.quantity).toBe(1);
    expect(getItemWeightG(next)).toBe(200);
    expect(toPersistedRecipeItemQuantity(next, 1)).toBe(1);
  });

  it('is gram-preserving: 30 g become 2 EL', () => {
    const [item] = normalizeItems([makeRecipeItem({ quantity: 30, weight_g: 30 })], 1);

    const next = applyStandardMeasureChange(item, el);

    expect(next.quantity).toBe(2);
    expect(getItemWeightG(next)).toBe(30);
  });

  it('counts the measure when the user edits the quantity', () => {
    const [item] = normalizeItems([makeRecipeItem({})], 1);
    const next = { ...applyStandardMeasureChange(item, tasse), quantity: 3 };

    expect(getItemWeightG(next)).toBe(600);
    expect(toPersistedRecipeItemQuantity(next, 1)).toBe(3);
  });

  it('loads a stored standard measure as a count', () => {
    const [item] = normalizeItems(
      [makeRecipeItem({ quantity: 2, weight_g: 400, standard_measure_key: 'tasse', unit_label: 'Tasse' })],
      1,
    );

    expect(item.standard_measure_key).toBe('tasse');
    expect(item.quantity).toBe(2);
    expect(item.measuring_unit_name).toBe('Tasse');
    expect(getItemWeightG(item)).toBe(400);
  });

  it('clears the standard measure when a portion is chosen', () => {
    const [item] = normalizeItems(
      [makeRecipeItem({ quantity: 2, weight_g: 30, standard_measure_key: 'el', unit_label: 'EL' })],
      1,
    );

    const next = applyPortionChange(item, item.ingredient_portions[0]);

    expect(next.standard_measure_key).toBeNull();
    expect(next.portion_id).toBe(11);
    expect(next.quantity).toBe(1);
  });
});
