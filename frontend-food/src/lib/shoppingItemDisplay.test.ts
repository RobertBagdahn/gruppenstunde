import { describe, it, expect } from 'vitest';
import {
  formatPackageOption,
  formatPieceEquivalent,
  formatPortionOption,
  formatShoppingAmount,
  formatShoppingQuantity,
} from './shoppingItemDisplay';

describe('shoppingItemDisplay', () => {
  it('formats the amount in grams with rounding and German decimals', () => {
    expect(formatShoppingAmount(320, 'g')).toBe('320 g');
    expect(formatShoppingAmount(1300, 'g')).toBe('1,3 kg');
    expect(formatShoppingAmount(0, 'g')).toBe('');
  });

  it('formats non-gram units with German decimals', () => {
    expect(formatShoppingAmount(250, 'ml')).toBe('250 ml');
    expect(formatShoppingAmount(2.5, 'l')).toBe('2,5 l');
  });

  it('combines amount and piece equivalent: amount first, pieces second', () => {
    expect(formatShoppingQuantity(320, 'g', { count: 64, portion_name: 'TL' })).toBe('320 g · ≈ 64 TL');
    expect(formatShoppingQuantity(1300, 'g', { count: 26, portion_name: 'Scheiben' })).toBe('1,3 kg · ≈ 26 Scheiben');
    expect(formatShoppingQuantity(320, 'g', null)).toBe('320 g');
  });

  it('uses a German comma for fractional piece equivalents', () => {
    expect(formatPieceEquivalent({ count: 2.5, portion_name: 'Stück' })).toBe('≈ 2,5 Stück');
  });

  it('formats portion and package options with exact weights', () => {
    expect(formatPortionOption({ count: 32.4, name: '100g', weight_g: 100 })).toBe('32,4 × 100g (à 100 g)');
    expect(formatPackageOption({ count: 2, package_name: 'Packung', weight_g: 500 })).toBe('2 × Packung (à 500 g)');
  });
});
