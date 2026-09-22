import { describe, expect, it } from 'vitest';
import {
  applyPortionChange,
  getItemWeightG,
  toPersistedRecipeItemQuantity,
  type EditableItem,
} from '../InlineIngredientEditor';

const baseItem: EditableItem = {
  id: 10,
  portion_id: 38658,
  ingredient_id: 290,
  ingredient_name: 'Speisezwiebeln',
  ingredient_slug: 'speisezwiebeln',
  quantity: 1,
  quantityInput: '1',
  measuring_unit_name: 'Stück',
  note: '',
  sort_order: 4,
  is_optional: false,
  exchange_group_id: null,
  exchange_position: null,
  ingredient_portions: [],
  baseWeightG: 0,
  baseQuantity: 1,
};

const stubPiece = {
  id: 38658,
  name: 'Stück',
  quantity: 100,
  weight_g: null as number | null,
  measuring_unit_name: 'Gramm',
  rank: 2,
  is_weight_trusted: false,
  is_piece_like: true,
};

const smallOnion = {
  id: 38659,
  name: 'kleine (50g)',
  quantity: 1,
  weight_g: 50,
  measuring_unit_name: 'Gramm',
  rank: 1,
  is_weight_trusted: true,
  is_piece_like: true,
};

const gramPortion = {
  id: 85893,
  name: 'g',
  quantity: 1,
  weight_g: 1,
  measuring_unit_name: 'Gramm',
  rank: 9999,
  is_weight_trusted: true,
  is_piece_like: false,
};

describe('applyPortionChange (portion switch)', () => {
  it('reproduces the onion bug: 1 × "kleine (50g)" must mean 1 piece = 50 g', () => {
    const item = applyPortionChange({ ...baseItem, baseWeightG: 0, baseQuantity: 1 }, smallOnion);
    expect(item.portion_id).toBe(38659);
    expect(item.quantity).toBe(1);
    expect(item.quantityInput).toBe('1');
    expect(item.baseQuantity).toBe(1);
    expect(item.baseWeightG).toBe(50);
    expect(getItemWeightG(item)).toBe(50);
    expect(toPersistedRecipeItemQuantity(item, 1)).toBe(1);
    expect(toPersistedRecipeItemQuantity(item, 1) * 50).toBe(50);
  });

  it('falls back to 1 piece for non-metric portions without gram basis', () => {
    const item = applyPortionChange({ ...baseItem, baseWeightG: 0 }, stubPiece);
    expect(item.quantity).toBe(1);
    expect(item.baseQuantity).toBe(1);
    expect(item.baseWeightG).toBe(1);
  });

  it('uses the portion weight when switching to a metric direct portion without gram basis', () => {
    const item = applyPortionChange({ ...baseItem, baseWeightG: 0 }, gramPortion);
    expect(item.quantity).toBe(1);
    expect(item.baseWeightG).toBe(1);
  });

  it('preserves grams when both weights are known (piece count conversion)', () => {
    // 1 × 100 g "Stück" onion = 100 g -> keep 100 g on "kleine (50g)" (2 pieces)
    const piecePortion = { ...stubPiece, weight_g: 100 };
    const itemWareHouse: EditableItem = {
      ...baseItem,
      portion_id: piecePortion.id,
      quantity: 1,
      quantityInput: '1',
      measuring_unit_name: 'Stück',
      ingredient_portions: [piecePortion, smallOnion],
      baseWeightG: 100,
      baseQuantity: 1,
    };
    const item = applyPortionChange(itemWareHouse, smallOnion);
    expect(item.portion_id).toBe(smallOnion.id);
    expect(item.quantity).toBe(2);
    expect(item.baseWeightG).toBe(100);
    expect(item.baseQuantity).toBe(2);
    expect(getItemWeightG(item)).toBe(100);
  });

  it('never produces 0 or NaN quantities', () => {
    const item = applyPortionChange({ ...baseItem, baseWeightG: 0, quantity: 0 }, smallOnion);
    expect(Number.isFinite(item.quantity)).toBe(true);
    expect(item.quantity).toBeGreaterThan(0);
  });
});

describe('toPersistedRecipeItemQuantity (save guard)', () => {
  it('falls back to 1 instead of sending NaN', () => {
    const broken: EditableItem = {
      ...baseItem,
      portion_id: gramPortion.id,
      measuring_unit_name: 'Gramm',
      quantity: 0,
      quantityInput: '0',
      ingredient_portions: [gramPortion],
      baseWeightG: 0,
      baseQuantity: 0,
    };
    expect(toPersistedRecipeItemQuantity(broken, 1)).toBe(1);
  });

  it('keeps valid quantities unchanged', () => {
    const ok: EditableItem = {
      ...baseItem,
      portion_id: gramPortion.id,
      measuring_unit_name: 'Gramm',
      quantity: 150,
      quantityInput: '150',
      ingredient_portions: [gramPortion],
      baseWeightG: 1,
      baseQuantity: 1,
    };
    expect(toPersistedRecipeItemQuantity(ok, 1)).toBe(150);
  });

  it('never returns non-positive values', () => {
    const zero: EditableItem = {
      ...baseItem,
      portion_id: null,
      measuring_unit_name: 'Gramm',
      quantity: 0,
      quantityInput: '0',
      ingredient_portions: [],
      baseWeightG: 0,
      baseQuantity: 0,
    };
    const result = toPersistedRecipeItemQuantity(zero, 4);
    expect(Number.isFinite(result)).toBe(true);
    expect(result).toBeGreaterThan(0);
  });
});
