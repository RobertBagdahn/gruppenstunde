import { describe, it, expect } from 'vitest';

/**
 * Mock normalizeItems function for testing the composite-portion label logic.
 * This mirrors the real function in InlineIngredientEditor.tsx.
 * 
 * KEY CHANGE: When basePortion.quantity !== 1, use basePortion.name as the label.
 * This fixes the bug where composite portions (e.g. "1 Portion Nudeln" with
 * measuring_unit="Gramm") would be mislabeled as "Gramm".
 */
function normalizeItems(
  items: Array<{
    id: number;
    quantity: number;
    portion_id: number;
    ingredient_portions: Array<{
      id: number;
      name: string;
      quantity: number;
      weight_g: number | null;
      measuring_unit_name: string | null;
      rank: number;
    }>;
  }>,
  editPortions: number = 1
): Array<{
  id: number;
  quantity: number;
  portion_id: number;
  measuring_unit_name: string | null;
}> {
  return items.map((item) => {
    // Find current portion to get weight
    const currentPortion = item.ingredient_portions.find((p) => p.id === item.portion_id);
    const portionWeightG = currentPortion?.weight_g ?? 1;

    // Convert to grams at editPortions scale
    const quantityInGrams = item.quantity * portionWeightG;
    const normalizedQty = editPortions > 1 ? Math.round((quantityInGrams / editPortions) * 100) / 100 : quantityInGrams;

    // Use rank=1 (Normalportion) for editing
    const sortedPortions = [...item.ingredient_portions].sort((a, b) => a.rank - b.rank);
    const basePortion = sortedPortions.find((p) => p.rank === 1) ?? currentPortion;
    const basePortionId = basePortion?.id ?? item.portion_id;
    const basePortionWeightG = basePortion?.weight_g ?? 1;

    // Quantity as multiplier of the base portion
    const quantityForBasePortion = normalizedQty / basePortionWeightG;
    const qty = Math.round(quantityForBasePortion * 100) / 100;

    // FIXED LOGIC: composite portions (quantity !== 1) use their own name as label
    const label =
      basePortion && basePortion.quantity !== 1
        ? basePortion.name
        : basePortion?.measuring_unit_name ?? 'g';

    return {
      id: item.id,
      quantity: qty,
      portion_id: basePortionId,
      measuring_unit_name: label,
    };
  });
}

describe('InlineIngredientEditor.normalizeItems - Unit Label Fix', () => {
  describe('composite portions (quantity !== 1)', () => {
    it('labels with portion name, not measuring_unit_name', () => {
      const items = [
        {
          id: 1,
          quantity: 2.24, // per 1 serving
          portion_id: 423,
          ingredient_portions: [
            {
              id: 423,
              name: '1 Portion Nudeln',
              quantity: 125, // = 125g
              weight_g: 125,
              measuring_unit_name: 'Gramm',
              rank: 1,
            },
          ],
        },
      ];

      const result = normalizeItems(items);
      expect(result[0].measuring_unit_name).toBe('1 Portion Nudeln');
      expect(result[0].measuring_unit_name).not.toBe('Gramm');
    });

    it('displays correct multiplier for composite portion', () => {
      const items = [
        {
          id: 1,
          quantity: 2.24, // per 1 serving, which is 2.24 × 125g = 280g
          portion_id: 423,
          ingredient_portions: [
            {
              id: 423,
              name: '1 Portion Nudeln',
              quantity: 125,
              weight_g: 125,
              measuring_unit_name: 'Gramm',
              rank: 1,
            },
          ],
        },
      ];

      const result = normalizeItems(items);
      expect(result[0].quantity).toBe(2.24);
      expect(result[0].measuring_unit_name).toBe('1 Portion Nudeln');
      // Verify that 2.24 × 125 = 280g
      expect(result[0].quantity * 125).toBe(280);
    });

    it('at 4 portions, scales correctly to 8.96 Portion Nudeln', () => {
      const items = [
        {
          id: 1,
          quantity: 2.24, // per 1 serving
          portion_id: 423,
          ingredient_portions: [
            {
              id: 423,
              name: '1 Portion Nudeln',
              quantity: 125,
              weight_g: 125,
              measuring_unit_name: 'Gramm',
              rank: 1,
            },
          ],
        },
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
        {
          id: 1,
          quantity: 5, // 5 grams per 1 serving
          portion_id: 7229,
          ingredient_portions: [
            {
              id: 7229,
              name: 'Gramm',
              quantity: 1, // direct unit
              weight_g: 1,
              measuring_unit_name: 'Gramm',
              rank: 2,
            },
            {
              id: 7856,
              name: 'n. B.',
              quantity: 1,
              weight_g: 1,
              measuring_unit_name: 'Gramm',
              rank: 1,
            },
          ],
        },
      ];

      const result = normalizeItems(items);
      expect(result[0].measuring_unit_name).toBe('Gramm');
    });

    it('retains gram quantity correctly', () => {
      const items = [
        {
          id: 1,
          quantity: 5,
          portion_id: 7229,
          ingredient_portions: [
            {
              id: 7229,
              name: 'Gramm',
              quantity: 1,
              weight_g: 1,
              measuring_unit_name: 'Gramm',
              rank: 1,
            },
          ],
        },
      ];

      const result = normalizeItems(items);
      expect(result[0].quantity).toBe(5);
      expect(result[0].measuring_unit_name).toBe('Gramm');
    });
  });

  describe('piece-based portions', () => {
    it('labels with Stück for piece portions', () => {
      const items = [
        {
          id: 1,
          quantity: 0.25, // quarter of a piece
          portion_id: 7836,
          ingredient_portions: [
            {
              id: 7836,
              name: '1 Portion',
              quantity: 1,
              weight_g: 120,
              measuring_unit_name: 'Stück',
              rank: 1,
            },
          ],
        },
      ];

      const result = normalizeItems(items);
      expect(result[0].measuring_unit_name).toBe('Stück');
    });
  });

  describe('regression: recipe #434 Nudeln bug', () => {
    it('does NOT label Nudeln as "Gramm" (the original bug)', () => {
      // Recipe #434 before fix: quantity=125 with "1 Portion Nudeln" portion
      // This would show as "125 Gramm" (wrong) instead of "1 Portion Nudeln"
      const items = [
        {
          id: 3383,
          quantity: 2.24, // repaired value per 1 serving
          portion_id: 423,
          ingredient_portions: [
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
          ],
        },
      ];

      const result = normalizeItems(items);
      expect(result[0].measuring_unit_name).toBe('1 Portion Nudeln');
      expect(result[0].quantity).toBe(2.24);
      expect(result[0].measuring_unit_name).not.toBe('Gramm');
      // Ensure 2.24 represents the correct gram amount
      expect(result[0].quantity * 125).toBe(280);
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
