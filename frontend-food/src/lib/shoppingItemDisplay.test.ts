import { describe, it, expect } from 'vitest';
import {
  formatPackageLabel,
  formatPackageNeed,
  formatPackageReserve,
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
      });

  it('combines amount and piece equivalent: amount first, pieces second', () => {
    expect(formatShoppingQuantity(320, 'g', { count: 64, portion_name: 'TL' })).toBe('320 g · ≈ 64 TL');
    expect(formatShoppingQuantity(1300, 'g', { count: 26, portion_name: 'Scheiben' })).toBe('1,3 kg · ≈ 26 Scheiben');
    expect(formatShoppingQuantity(320, 'g', null)).toBe('320 g');
  });

  it('uses a German comma for fractional piece equivalents', () => {
    expect(formatPieceEquivalent({ count: 2.5, portion_name: 'Stück' })).toBe('≈ 2,5 Stück');
    expect(formatPieceEquivalent({ count: 51.8, portion_name: '1 mittelgroße Kartoffel' })).toBe('≈ 52 mittelgroße Kartoffel');
    expect(formatPieceEquivalent({ count: 1.1, portion_name: '6 Eier' })).toBe('≈ 6,6 Eier');
    expect(formatPieceEquivalent({ count: 14.6, portion_name: '100g Gemüsebrühe' })).toBe('≈ 15 × 100g Gemüsebrühe');
  });

  it('formats portion and package options with exact weights', () => {
    expect(formatPortionOption({ count: 32.4, name: '100g', weight_g: 100 })).toBe('32,4 × 100g (à 100 g)');
  });

  it('labels packages by size unless the name already states one', () => {
    expect(formatPackageLabel({ package_name: 'Packung', weight_g: 500 })).toBe('500-g-Packung');
    expect(formatPackageLabel({ package_name: '', weight_g: 1000 })).toBe('1-kg-Packung');
    expect(formatPackageLabel({ package_name: '400-g-Dose', weight_g: 400 })).toBe('400-g-Dose');
    expect(formatPackageNeed({ count: 2, package_name: 'Packung', weight_g: 500 })).toBe('2 × 500-g-Packung');
  });

  it('puts the package need after the amount, preferring it over the piece equivalent', () => {
    expect(
      formatShoppingQuantity(700, 'g', { count: 2.8, portion_name: 'Stück' }, { count: 3, package_name: 'Packung', weight_g: 250 }),
    ).toBe('700 g · 3 × 250-g-Packung');
  });

  it('shows a reserve line only for a positive package surplus', () => {
    expect(formatPackageReserve(50)).toBe('+ 50 g Reserve');
    expect(formatPackageReserve(-20)).toBe('');
    expect(formatPackageReserve(null)).toBe('');
  });

  it('shows millilitres from 1.000 ml as litres with one decimal', () => {
    expect(formatShoppingAmount(9126, 'ml')).toBe('9,1 l');
    expect(formatShoppingAmount(1000, 'ml')).toBe('1,0 l');
    expect(formatShoppingAmount(250, 'ml')).toBe('250 ml');
  });
});

describe('formatPackageNeed for liquids', () => {
  it('shows the package in ml/l instead of grams', () => {
    expect(formatPackageNeed({ count: 3, package_name: '1-kg-Flasche', weight_g: 1000, volume_ml: 970 })).toBe(
      '3 × 970-ml-Flasche',
    );
  });

  it('keeps the weight label for solids', () => {
    expect(formatPackageNeed({ count: 2, package_name: 'Packung', weight_g: 500 })).toBe('2 × 500-g-Packung');
  });
});
