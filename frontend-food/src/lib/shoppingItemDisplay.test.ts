import { describe, it, expect } from 'vitest';
import {
  formatPackageLabel,
  formatPackageNeed,
  formatItemPackageReserve,
  formatPackageReserve,
  formatStartUnitAmount,
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

  const unit = (label: string, gramsPerUnit: number, kind: 'portion' | 'standard' = 'portion') => ({
    kind,
    label,
    grams_per_unit: gramsPerUnit,
    is_approx: false,
  });

  it('combines the start unit with its grams: unit first, grams in brackets', () => {
    expect(formatShoppingQuantity(320, 'g', unit('TL', 5), null, 320)).toBe('64 TL (320 g)');
    expect(formatShoppingQuantity(1300, 'g', unit('Scheibe', 50), null, 1300)).toBe('26 Scheibe (1,3 kg)');
    expect(formatShoppingQuantity(320, 'g', null, null, 320)).toBe('320 g');
  });

  it('shows metric start units as the plain amount', () => {
    expect(formatStartUnitAmount(320, { kind: 'grams', label: 'g', grams_per_unit: 1, is_approx: false })).toBe('');
    expect(formatShoppingQuantity(9126, 'ml', { kind: 'milliliters', label: 'ml', grams_per_unit: 1.03, is_approx: false }, null, 9400)).toBe('9,1 l');
  });

  it('rounds counts: one decimal below 10 and whole pieces from 10', () => {
    expect(formatStartUnitAmount(150, unit('Stück', 60))).toBe('2,5 Stück (150 g)');
    expect(formatStartUnitAmount(3560, unit('mittelgroße Zwiebel', 80))).toBe('45 mittelgroße Zwiebel (3,6 kg)');
  });

  it('marks standard measures without a known density as approximate', () => {
    expect(formatStartUnitAmount(45, { ...unit('EL', 15, 'standard'), is_approx: true })).toBe('3 EL (≈ 45 g)');
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

  it('puts the package need after the amount', () => {
    expect(
      formatShoppingQuantity(700, 'g', null, { count: 3, package_name: 'Packung', weight_g: 250 }, 700),
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

  describe('formatItemPackageReserve (reserve = package size − shown amount)', () => {
    const base: Parameters<typeof formatItemPackageReserve>[0] = {
      quantity: 0,
      unit: 'g',
      package_options: [],
      package_surplus_g: null,
    };

    it('keeps shown amount + reserve equal to a 1-kg net (Zwiebel 275 g shows 280 g)', () => {
      const item = {
        ...base,
        quantity: 275,
        package_options: [{ count: 1, package_name: 'Netz', weight_g: 1000 }],
        package_surplus_g: 725,
      };
      expect(formatShoppingAmount(275, 'g')).toBe('280 g');
      expect(formatItemPackageReserve(item)).toBe('+ 720 g Reserve');
    });

    it('matches a 200-g piece for 137,5 g shown as 140 g', () => {
      const item = {
        ...base,
        quantity: 137.5,
        package_options: [{ count: 1, package_name: 'Stück', weight_g: 200 }],
        package_surplus_g: 62.5,
      };
      expect(formatItemPackageReserve(item)).toBe('+ 60 g Reserve');
    });

    it('shows small amounts exactly (75 g in 1 kg leaves 925 g)', () => {
      const item = {
        ...base,
        quantity: 75,
        package_options: [{ count: 1, package_name: 'Netz', weight_g: 1000 }],
      };
      expect(formatItemPackageReserve(item)).toBe('+ 925 g Reserve');
    });

    it('gives liquids the reserve in ml, not grams (22 ml in an 815-ml bottle)', () => {
      const item = {
        ...base,
        quantity: 22,
        unit: 'ml',
        package_options: [{ count: 1, package_name: 'Flasche', weight_g: 750, volume_ml: 815 }],
        package_surplus_g: 730,
      };
      expect(formatItemPackageReserve(item)).toBe('+ 793 ml Reserve');
    });

    it('shows no reserve for a liquid without a volume package instead of a wrong unit', () => {
      const item = {
        ...base,
        quantity: 22,
        unit: 'ml',
        package_options: [{ count: 1, package_name: 'Flasche', weight_g: 750 }],
        package_surplus_g: 730,
      };
      expect(formatItemPackageReserve(item)).toBe('');
    });

    it('falls back to the backend gram surplus without a package option', () => {
      expect(formatItemPackageReserve({ ...base, quantity: 300, package_surplus_g: 50 })).toBe('+ 50 g Reserve');
    });

    it('shows nothing when the package is smaller than the shown amount', () => {
      const item = {
        ...base,
        quantity: 1000,
        package_options: [{ count: 2, package_name: 'Packung', weight_g: 500 }],
      };
      expect(formatItemPackageReserve(item)).toBe('');
    });
  });
});
