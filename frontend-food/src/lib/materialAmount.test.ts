import { describe, expect, it } from 'vitest';
import {
  buildMaterialListText,
  formatMaterialAmount,
  parseAmountInput,
  scaledMaterialAmount,
} from './materialAmount';
import type { MaterialListResult } from '@/schemas/supply';

describe('scaledMaterialAmount', () => {
  it('scales per-portion amounts with the servings', () => {
    expect(scaledMaterialAmount({ amount: 1, quantity_mode: 'per_portion' }, 8)).toBe(8);
  });

  it('keeps total amounts fixed', () => {
    expect(scaledMaterialAmount({ amount: 30, quantity_mode: 'total' }, 8)).toBe(30);
  });

  it('rounds up to whole pieces without float noise', () => {
    expect(scaledMaterialAmount({ amount: 0.1, quantity_mode: 'per_portion' }, 30)).toBe(3);
    expect(scaledMaterialAmount({ amount: 0.1, quantity_mode: 'per_portion' }, 31)).toBe(4);
  });
});

describe('formatMaterialAmount', () => {
  it('hides the multiplier for a single device', () => {
    expect(formatMaterialAmount(1, false)).toBe('');
    expect(formatMaterialAmount(2, false)).toBe('2×');
  });

  it('always shows the amount of consumables', () => {
    expect(formatMaterialAmount(1, true)).toBe('1×');
    expect(formatMaterialAmount(40, true)).toBe('40×');
  });
});

describe('parseAmountInput', () => {
  it('accepts a German decimal comma', () => {
    expect(parseAmountInput('1,5')).toBe(1.5);
  });

  it('rejects empty, zero, negative and text input', () => {
    for (const value of ['', '  ', '0', '-2', 'abc']) {
      expect(parseAmountInput(value)).toBeNull();
    }
  });
});

describe('buildMaterialListText', () => {
  const list: MaterialListResult = {
    title: 'Sommerlager',
    devices: [
      { material_id: 1, name: 'Backofen', slug: 'backofen', is_consumable: false, amount: 1, price_per_piece: null, cost: null, recipes: [] },
      { material_id: 2, name: 'Topf', slug: 'topf', is_consumable: false, amount: 3, price_per_piece: null, cost: null, recipes: [] },
    ],
    consumables: [
      { material_id: 3, name: 'Pappteller', slug: 'pappteller', is_consumable: true, amount: 40, price_per_piece: 0.06, cost: 2.4, recipes: [] },
    ],
    total_cost: 2.4,
  };

  it('writes both groups with amounts', () => {
    expect(buildMaterialListText(list)).toBe(
      'Materialliste: Sommerlager\n\nGeräte\n- Backofen\n- Topf: 3×\n\nVerbrauchsmaterial\n- Pappteller: 40×',
    );
  });

  it('skips empty groups', () => {
    expect(buildMaterialListText({ ...list, devices: [] })).not.toContain('Geräte');
  });
});
