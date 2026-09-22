import { describe, expect, it } from 'vitest';
import { formatPortionOptionLabel } from '../InlineIngredientEditor';

describe('formatPortionOptionLabel', () => {
  it('keeps same-unit portions distinguishable by weight', () => {
    expect(formatPortionOptionLabel({
      id: 1,
      name: 'Gramm fein',
      quantity: 1,
      weight_g: 1,
      measuring_unit_name: 'Gramm',
      rank: 1,
    })).toBe('Gramm (1g)');

    expect(formatPortionOptionLabel({
      id: 2,
      name: 'Gramm grob',
      quantity: 1,
      weight_g: 100,
      measuring_unit_name: 'Gramm',
      rank: 2,
    })).toBe('Gramm grob (100g)');
  });

  it('makes an unweighted piece explicit', () => {
    expect(formatPortionOptionLabel({
      id: 3,
      name: 'Stück',
      quantity: 1,
      weight_g: null,
      measuring_unit_name: 'Stück',
      rank: 1,
    })).toBe('Stück (Gewicht fehlt)');
  });
});
