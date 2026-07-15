import { describe, it, expect } from 'vitest';
import { normalizeItems, getItemWeightG, type EditableItem } from '../InlineIngredientEditor';
import type { RecipeItem } from '@/schemas/recipe';

/**
 * These tests exercise the REAL `normalizeItems`/`getItemWeightG` implementations
 * from `InlineIngredientEditor.tsx` (not a hand-copied mock). A previous version
 * of this file duplicated the logic locally, which silently drifted from the
 * real code and let the "AI-Mengenschätzung zeigt falsche Alt-Werte" bug slip
 * through undetected — the mock never exercised `getItemWeightG`, which is
 * where the bug lived.
 */
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

describe('InlineIngredientEditor.normalizeItems - Unit Label Fix', () => {
  const nudelnPortion = (rank: number) => ({
    id: 423,
    name: '1 Portion Nudeln',
    quantity: 125,
    weight_g: 125,
    rank,
    is_system: true,
    measuring_unit_id: null,
    measuring_unit_name: 'Gramm',
  });

  describe('composite portions (quantity !== 1)', () => {
    it('labels with portion name, not measuring_unit_name', () => {
      const items = [
        makeRecipeItem({
          id: 1,
          quantity: 2.24, // per 1 serving
          portion_id: 423,
          weight_g: 280,
          ingredient_portions: [nudelnPortion(1)],
        }),
      ];

      const result = normalizeItems(items, 1);
      expect(result[0].measuring_unit_name).toBe('1 Portion Nudeln');
      expect(result[0].measuring_unit_name).not.toBe('Gramm');
    });

    it('displays correct multiplier for composite portion (2.24 × 125g = 280g)', () => {
      const items = [
        makeRecipeItem({
          id: 1,
          quantity: 2.24, // per 1 serving, which is 2.24 × 125g = 280g
          portion_id: 423,
          weight_g: 280,
          ingredient_portions: [nudelnPortion(1)],
        }),
      ];

      const result = normalizeItems(items, 1);
      expect(result[0].quantity).toBe(2.24);
      expect(result[0].measuring_unit_name).toBe('1 Portion Nudeln');
      // getItemWeightG (not a hand-rolled `quantity * 125`) is the authoritative check.
      expect(getItemWeightG(result[0])).toBe(280);
    });

    it('at 4 portions, scales correctly to 8.96 Portion Nudeln', () => {
      const items = [
        makeRecipeItem({
          id: 1,
          quantity: 2.24, // per 1 serving
          portion_id: 423,
          weight_g: 280,
          ingredient_portions: [nudelnPortion(1)],
        }),
      ];

      const result = normalizeItems(items, 1); // portions is always 1 (DB constraint)
      // For display at 4 persons, scaleQuantity is applied AFTER normalizeItems
      const scaledQty = Math.round(result[0].quantity * 4 * 100) / 100; // 2.24 × 4 = 8.96
      expect(result[0].quantity).toBe(2.24); // Normalized to per-1-serving
      expect(scaledQty).toBe(8.96); // After scaleQuantity for 4 persons
      expect(result[0].measuring_unit_name).toBe('1 Portion Nudeln');
    });
  });

  describe('direct-unit portions (quantity === 1)', () => {
    it('labels with measuring_unit_name for plain gram portions', () => {
      const items = [
        makeRecipeItem({
          id: 1,
          quantity: 5, // 5 grams per 1 serving
          portion_id: 7229,
          weight_g: 5,
          ingredient_portions: [
            { id: 7229, name: 'Gramm', quantity: 1, weight_g: 1, rank: 2, is_system: true, measuring_unit_id: null, measuring_unit_name: 'Gramm' },
            { id: 7856, name: 'n. B.', quantity: 1, weight_g: 1, rank: 1, is_system: true, measuring_unit_id: null, measuring_unit_name: 'Gramm' },
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
            { id: 7229, name: 'Gramm', quantity: 1, weight_g: 1, rank: 1, is_system: true, measuring_unit_id: null, measuring_unit_name: 'Gramm' },
          ],
        }),
      ];

      const result = normalizeItems(items, 1);
      expect(result[0].quantity).toBe(5);
      expect(result[0].measuring_unit_name).toBe('Gramm');
      expect(getItemWeightG(result[0])).toBe(5);
    });
  });

  describe('regression: AI-Mengenschätzung "Alt" value bug (duplicate "Gramm"-labeled portions)', () => {
    // Real-world case found on recipe "Müsli mit frischem Obst": the ingredient
    // has TWO portions both displayed as "Gramm" — id 437 ("100g Haferflocken",
    // weight_g=100, rank=1, the item's actual saved portion) and id 7001
    // ("Gramm", weight_g=1, rank=3). The AI-estimate preview's "Alt" column used
    // to recompute grams as `quantity * portion.weight_g` looked up via
    // `ingredient_portions.find(p => p.id === portion_id)` — fragile whenever
    // that lookup silently picked the wrong/missing entry. `getItemWeightG` must
    // use the backend-authoritative `baseWeightG`/`baseQuantity` ratio instead.
    it('getItemWeightG resolves the correct weight even with duplicate "Gramm" portions', () => {
      const items = [
        makeRecipeItem({
          id: 1,
          quantity: 0.6,
          portion_id: 437,
          weight_g: 60, // backend-authoritative: 0.6 × 100g
          ingredient_portions: [
            { id: 437, name: '100g Haferflocken', quantity: 1, weight_g: 100, rank: 1, is_system: true, measuring_unit_id: null, measuring_unit_name: 'Gramm' },
            { id: 7001, name: 'Gramm', quantity: 1, weight_g: 1, rank: 3, is_system: true, measuring_unit_id: null, measuring_unit_name: 'Gramm' },
          ],
        }),
      ];

      const result = normalizeItems(items, 1);
      expect(result[0].quantity).toBe(0.6);
      expect(getItemWeightG(result[0])).toBe(60);
    });

    it('getItemWeightG stays correct even when the current portion has weight_g=null (e.g. "Packung")', () => {
      // Simulates the state produced by handlePortionChange when switching to a
      // portion with a NULL weight_g — the ratio must use the carried-over
      // authoritative grams instead of silently becoming 0.
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

  describe('regression: recipe #59 "Linsensuppe" — soft-deleted current portion (fix-portion-integrity-and-ai-estimate)', () => {
    // Real-world case: a Jodsalz RecipeItem's stored portion (id 442, "100g
    // Salz", weight_g=100) had been soft-deleted server-side. The backend
    // correctly excludes deleted portions from `ingredient_portions`
    // (resolve_ingredient_portions filters deleted_at__isnull=True), so the
    // item's OWN portion_id is not present in the list it receives. The old
    // `normalizeItems()` looked up `ingredient_portions.find(p => p.id ===
    // portion_id)`, got `undefined`, and fell back to `weight_g ?? 1` — turning
    // a true 7.3g quantity into a displayed/editable ~0.07g. The fix must
    // instead derive the gram-per-unit ratio from the backend-authoritative
    // `item.weight_g`, which is always correct regardless of whether the
    // current portion is still listed.
    it('computes the correct editable quantity even when portion_id is missing from ingredient_portions', () => {
      const items = [
        makeRecipeItem({
          id: 3309,
          quantity: 0.073, // stored per-1-portion value
          portion_id: 442, // soft-deleted — NOT present in ingredient_portions below
          weight_g: 7.3128, // backend-authoritative total: 0.073 * 100
          ingredient_portions: [
            // Only the OTHER (live) portions of the ingredient are listed —
            // portion 442 itself is absent because it was soft-deleted.
            { id: 32744, name: 'Prise', quantity: 1, weight_g: 0.3, rank: 1, is_system: false, measuring_unit_id: null, measuring_unit_name: 'Prise' },
          ],
        }),
      ];

      const result = normalizeItems(items, 1);

      // Must reflect the true ~7.3g, NOT the buggy fallback (0.073 * 1 = 0.073).
      // Note: the editable `quantity` is rounded to 2 decimals by existing
      // normalizeItems logic (unrelated to this fix), so a tiny amount of
      // precision loss for very small per-portion quantities is expected —
      // the important assertion is that it's in the ~7g ballpark, not ~0.07g.
      expect(getItemWeightG(result[0])).toBeGreaterThan(6.5);
      expect(getItemWeightG(result[0])).toBeLessThan(7.5);
      // Explicit regression guard: must NOT collapse to the old fallback
      // value (weight_g=1 fallback would have produced ~0.073g here).
      expect(getItemWeightG(result[0])).toBeGreaterThan(1);
    });
  });

  describe('piece-based portions', () => {
    it('labels with Stück for piece portions', () => {
      const items = [
        makeRecipeItem({
          id: 1,
          quantity: 0.25, // quarter of a piece
          portion_id: 7836,
          weight_g: 30,
          ingredient_portions: [
            { id: 7836, name: '1 Portion', quantity: 1, weight_g: 120, rank: 1, is_system: true, measuring_unit_id: null, measuring_unit_name: 'Stück' },
          ],
        }),
      ];

      const result = normalizeItems(items, 1);
      expect(result[0].measuring_unit_name).toBe('Stück');
    });
  });

  describe('regression: recipe #434 Nudeln bug', () => {
    it('does NOT label Nudeln as "Gramm" (the original bug)', () => {
      // Recipe #434 before fix: quantity=125 with "1 Portion Nudeln" portion
      // This would show as "125 Gramm" (wrong) instead of "1 Portion Nudeln"
      const items = [
        makeRecipeItem({
          id: 3383,
          quantity: 2.24, // repaired value per 1 serving
          portion_id: 423,
          weight_g: 280,
          ingredient_portions: [
            nudelnPortion(1),
            { id: 7288, name: 'Gramm', quantity: 1, weight_g: 1, rank: 2, is_system: true, measuring_unit_id: null, measuring_unit_name: 'Gramm' },
          ],
        }),
      ];

      const result = normalizeItems(items, 1);
      expect(result[0].measuring_unit_name).toBe('1 Portion Nudeln');
      expect(result[0].quantity).toBe(2.24);
      expect(result[0].measuring_unit_name).not.toBe('Gramm');
      // Ensure 2.24 represents the correct gram amount (via the authoritative helper)
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

      // Apply the labeling rule for dropdown rendering
      const labels = portions.map((p) => (p.quantity !== 1 ? p.name : p.measuring_unit_name));
      expect(labels[0]).toBe('1 Portion Nudeln');
      expect(labels[1]).toBe('Gramm');
      expect(labels[0]).not.toBe(labels[1]); // Must be distinct!
    });
  });
});
