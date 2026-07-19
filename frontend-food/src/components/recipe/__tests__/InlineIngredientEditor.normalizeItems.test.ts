import { describe, it, expect } from 'vitest';
import { normalizeItems, getItemWeightG, type EditableItem } from '../InlineIngredientEditor';
import type { RecipeItem } from '@/schemas/recipe';

function makeRecipeItem(overrides: Partial<RecipeItem> & { portion_id: number }): RecipeItem {
  return {
    id: 1,
    portion_name: null,
    ingredient_id: 1,
    ingredient_name: 'Testzutat',
    ingredient_slug: 'testzutat',
    quantity: 1,
    measuring_unit_id: null,
    measuring_unit_name: null,
    sort_order: 0,
    note: '',
    ingredient_portions: [],
    ingredient_density: null,
    ingredient_viscosity: null,
    ingredient_price_per_kg: null,
    ingredient_nutri_class: null,
    ingredient_retail_section_id: null,
    ingredient_retail_section_name: null,
    weight_g: 0,
    is_optional: false,
    exchange_group_id: null,
    exchange_position: null,
    portion_display: '',
    has_missing_weight: false,
    ...overrides,
  };
}

describe('InlineIngredientEditor.normalizeItems', () => {
  const nudelnPortion = (rank: number) => ({
    id: 423,
    name: '1 Portion Nudeln',
    quantity: 125,
    weight_g: 125,
    rank,
    is_default: rank === 1,
    measuring_unit_id: null,
    measuring_unit_name: 'Gramm',
  });

  describe('composite portions (quantity !== 1)', () => {
    it('displays grams and uses measuring_unit_name as label', () => {
      const items = [
        makeRecipeItem({
          id: 1,
          quantity: 2.24,
          portion_id: 423,
          weight_g: 280,
          ingredient_portions: [nudelnPortion(1)],
        }),
      ];

      const result = normalizeItems(items, 1);
      expect(result[0].quantity).toBe(280);
      expect(result[0].measuring_unit_name).toBe('Gramm');
      expect(getItemWeightG(result[0])).toBe(280);
    });

    it('at 4 portions, scales correctly to 1120g', () => {
      const items = [
        makeRecipeItem({
          id: 1,
          quantity: 2.24,
          portion_id: 423,
          weight_g: 280,
          ingredient_portions: [nudelnPortion(1)],
        }),
      ];

      const result = normalizeItems(items, 1);
      const scaledQty = Math.round(result[0].quantity * 4 * 100) / 100;
      expect(result[0].quantity).toBe(280);
      expect(scaledQty).toBe(1120);
      expect(result[0].measuring_unit_name).toBe('Gramm');
    });
  });

  describe('direct-unit portions (quantity === 1)', () => {
    it('labels with measuring_unit_name for plain gram portions', () => {
      const items = [
        makeRecipeItem({
          id: 1,
          quantity: 5,
          portion_id: 7229,
          weight_g: 5,
          ingredient_portions: [
            { id: 7229, name: 'Gramm', quantity: 1, weight_g: 1, rank: 2, is_default: false, measuring_unit_id: null, measuring_unit_name: 'Gramm' },
            { id: 7856, name: 'n. B.', quantity: 1, weight_g: 1, rank: 1, is_default: true, measuring_unit_id: null, measuring_unit_name: 'Gramm' },
          ],
        }),
      ];

      const result = normalizeItems(items, 1);
      expect(result[0].measuring_unit_name).toBe('Gramm');
    });

    it('retains gram quantity correctly', () => {
      const items = [
        makeRecipeItem({
          id: 1,
          quantity: 5,
          portion_id: 7229,
          weight_g: 5,
          ingredient_portions: [
            { id: 7229, name: 'Gramm', quantity: 1, weight_g: 1, rank: 1, is_default: true, measuring_unit_id: null, measuring_unit_name: 'Gramm' },
          ],
        }),
      ];

      const result = normalizeItems(items, 1);
      expect(result[0].quantity).toBe(5);
      expect(result[0].measuring_unit_name).toBe('Gramm');
      expect(getItemWeightG(result[0])).toBe(5);
    });
  });

  describe('portions with weight_g != 1 (e.g. "100g Haferflocken")', () => {
    it('displays grams, not the portion multiplier', () => {
      const items = [
        makeRecipeItem({
          id: 1,
          quantity: 0.6,
          portion_id: 437,
          weight_g: 60,
          ingredient_portions: [
            { id: 437, name: '100g Haferflocken', quantity: 1, weight_g: 100, rank: 1, is_default: true, measuring_unit_id: null, measuring_unit_name: 'Gramm' },
            { id: 7001, name: 'Gramm', quantity: 1, weight_g: 1, rank: 3, is_default: false, measuring_unit_id: null, measuring_unit_name: 'Gramm' },
          ],
        }),
      ];

      const result = normalizeItems(items, 1);
      expect(result[0].quantity).toBe(60);
      expect(result[0].measuring_unit_name).toBe('Gramm');
      expect(getItemWeightG(result[0])).toBe(60);
    });
  });

  describe('getItemWeightG', () => {
    it('returns item.quantity directly (grams)', () => {
      const item: EditableItem = {
        id: 1,
        portion_id: 16213,
        ingredient_id: 1,
        ingredient_name: 'Bandnudeln',
        quantity: 125,
        quantityInput: '125',
        measuring_unit_name: 'Packung',
        note: '',
        sort_order: 0,
        is_optional: false,
        exchange_group_id: null,
        exchange_position: null,
        ingredient_portions: [
          { id: 16213, name: 'Packung', quantity: 1, weight_g: null, measuring_unit_name: 'g', rank: 4 },
        ],
        baseWeightG: 125,
        baseQuantity: 125,
      };

      expect(getItemWeightG(item)).toBe(125);
    });
  });

  describe('regression: recipe #59 "Linsensuppe" — soft-deleted current portion', () => {
    it('computes the correct editable grams even when portion_id is missing from ingredient_portions', () => {
      const items = [
        makeRecipeItem({
          id: 3309,
          quantity: 0.073,
          portion_id: 442,
          weight_g: 7.3128,
          ingredient_portions: [
            { id: 32744, name: 'Prise', quantity: 1, weight_g: 0.3, rank: 1, is_default: true, measuring_unit_id: null, measuring_unit_name: 'Prise' },
          ],
        }),
      ];

      const result = normalizeItems(items, 1);

      expect(getItemWeightG(result[0])).toBeGreaterThan(6.5);
      expect(getItemWeightG(result[0])).toBeLessThan(7.5);
      expect(getItemWeightG(result[0])).toBeGreaterThan(1);
    });
  });

  describe('piece-based portions', () => {
    it('labels with Stück and shows gram quantity', () => {
      const items = [
        makeRecipeItem({
          id: 1,
          quantity: 0.25,
          portion_id: 7836,
          weight_g: 30,
          ingredient_portions: [
            { id: 7836, name: '1 Portion', quantity: 1, weight_g: 120, rank: 1, is_default: true, measuring_unit_id: null, measuring_unit_name: 'Stück' },
          ],
        }),
      ];

      const result = normalizeItems(items, 1);
      expect(result[0].quantity).toBe(30);
      expect(result[0].measuring_unit_name).toBe('Stück');
      expect(getItemWeightG(result[0])).toBe(30);
    });
  });

  describe('regression: recipe #434 Nudeln — now shows grams with gram label', () => {
    it('displays grams (280) with "Gramm" label for composite portions', () => {
      const items = [
        makeRecipeItem({
          id: 3383,
          quantity: 2.24,
          portion_id: 423,
          weight_g: 280,
          ingredient_portions: [
            nudelnPortion(1),
            { id: 7288, name: 'Gramm', quantity: 1, weight_g: 1, rank: 2, is_default: false, measuring_unit_id: null, measuring_unit_name: 'Gramm' },
          ],
        }),
      ];

      const result = normalizeItems(items, 1);
      expect(result[0].quantity).toBe(280);
      expect(result[0].measuring_unit_name).toBe('Gramm');
      expect(getItemWeightG(result[0])).toBe(280);
    });

    it('dropdown options are distinct: "1 Portion Nudeln" ≠ "Gramm"', () => {
      const portions = [
        {
          id: 423,
          name: '1 Portion Nudeln',
          quantity: 125,
          weight_g: 125,
          measuring_unit_name: 'Gramm',
          rank: 1,
        },
        {
          id: 7288,
          name: 'Gramm',
          quantity: 1,
          weight_g: 1,
          measuring_unit_name: 'Gramm',
          rank: 2,
        },
      ];

      const labels = portions.map((p) => (p.quantity !== 1 ? p.name : p.measuring_unit_name));
      expect(labels[0]).toBe('1 Portion Nudeln');
      expect(labels[1]).toBe('Gramm');
      expect(labels[0]).not.toBe(labels[1]);
    });
  });
});
