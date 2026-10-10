import { describe, expect, it } from 'vitest';
import cases from '../../../backend/supply/tests/fixtures/quantity_format_cases.json';
import type { UnitOption } from '@/schemas/quantityUnits';
import { amountParts, formatAmount, formatCount, toCount, toGrams, type StoredAmount } from './quantityUnits';

const piece: UnitOption = {
  key: 'portion:7',
  kind: 'portion',
  label: 'Stück',
  grams_per_unit: 60,
  is_approx: false,
  has_weight: true,
  portion_id: 7,
  measuring_unit_id: null,
  standard_measure_key: null,
};
const tablespoon: UnitOption = {
  key: 'standard:el',
  kind: 'standard',
  label: 'EL',
  grams_per_unit: 15,
  is_approx: true,
  has_weight: true,
  portion_id: null,
  measuring_unit_id: null,
  standard_measure_key: 'el',
};
const grams: UnitOption = { ...piece, key: 'grams', kind: 'grams', label: 'g', grams_per_unit: 1, portion_id: null, measuring_unit_id: 1 };

const cheese: StoredAmount = {
  quantity: 0.5,
  quantity_g: 15,
  unit_kind: 'portion',
  unit_label: 'Portion',
  measuring_unit_name: '',
  is_weight_approx: false,
  has_missing_weight: false,
};

describe('formatAmount', () => {
  it.each(cases)('matches the backend for "$expected"', (c) => {
    expect(
      formatAmount({
        count: c.quantity,
        kind: c.unit_kind as UnitOption['kind'],
        label: c.unit_label,
        grams: c.grams,
        gramsApprox: c.is_approx,
        missing: c.missing,
      }),
    ).toBe(c.expected);
  });
});

describe('amountParts', () => {
  it('shows the screenshot case with its stored portion, never as "Gramm"', () => {
    expect(formatAmount(amountParts({ ...cheese, measuring_unit_name: 'Gramm' }))).toBe('0,5 Portion (15 g)');
  });

  it('views the amount in another unit without changing the grams', () => {
    expect(formatAmount(amountParts(cheese, tablespoon))).toBe('≈ 1 EL (15 g)');
    expect(formatAmount(amountParts({ ...cheese, quantity: 2, quantity_g: 120 }, piece))).toBe('2 Stück (120 g)');
  });

  it('shows only grams in the grams view', () => {
    expect(formatAmount(amountParts(cheese, grams))).toBe('15 g');
  });

  it('marks a missing weight instead of hiding the grams silently', () => {
    expect(
      formatAmount(
        amountParts({ ...cheese, unit_label: 'Stück', quantity: 2, quantity_g: null, has_missing_weight: true }),
      ),
    ).toBe('2 Stück (Gewicht fehlt)');
  });
});

describe('conversion', () => {
  it('keeps grams when switching units', () => {
    const count = toCount(90, piece);
    expect(count).toBe(1.5);
    expect(toGrams(count ?? 0, piece)).toBe(90);
  });

  it('has no conversion for options without weight', () => {
    expect(toCount(90, { ...piece, grams_per_unit: null, has_weight: false })).toBeNull();
  });

  it('formats counts with at most two decimals', () => {
    expect(formatCount(0.333)).toBe('0,33');
    expect(formatCount(24)).toBe('24');
    expect(formatCount(1.5)).toBe('1,5');
  });
});
