import { describe, it, expect } from 'vitest';
import { formatNumber, formatCount, formatEuro, formatWeight, formatExactWeight, plural } from './format';
// Shared fixture with the backend (backend/supply/tests/test_format_weight_fixture.py
// runs the same file), so both implementations are provably identical.
import cases from '../../../backend/supply/tests/fixtures/format_weight_cases.json';

describe('formatNumber', () => {
  it('formats a whole number without decimals', () => {
    expect(formatNumber(15)).toBe('15');
  });

  it('uses a thousands separator for large numbers', () => {
    expect(formatNumber(5918)).toBe('5.918');
  });

  it('uses a comma for fractional numbers', () => {
    expect(formatNumber(3.4)).toBe('3,4');
  });
});

describe('formatCount', () => {
  it('rounds to a whole number with a thousands separator', () => {
    expect(formatCount(5918)).toBe('5.918');
    expect(formatCount(1)).toBe('1');
  });
});

describe('formatEuro', () => {
  it('formats a Euro amount with comma and symbol', () => {
    expect(formatEuro(0.47)).toBe('0,47 €');
  });
});

describe('plural', () => {
  it('uses the singular for count 1', () => {
    expect(plural(1, 'Plan', 'Pläne')).toBe('1 Plan');
  });

  it('uses the plural otherwise', () => {
    expect(plural(17, 'Plan', 'Pläne')).toBe('17 Pläne');
    expect(plural(0, 'Plan', 'Pläne')).toBe('0 Pläne');
    expect(plural(270, 'Rezept', 'Rezepte')).toBe('270 Rezepte');
  });
});

describe('formatWeight (shared fixture with the backend)', () => {
  for (const { grams, expected } of cases.format_weight) {
    it(`${grams}g -> "${expected}"`, () => {
      expect(formatWeight(grams)).toBe(expected);
    });
  }
});

describe('formatExactWeight (shared fixture with the backend)', () => {
  for (const { grams, expected } of cases.format_exact_weight) {
    it(`${grams}g -> "${expected}"`, () => {
      expect(formatExactWeight(grams)).toBe(expected);
    });
  }
});
