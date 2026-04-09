/**
 * Tests for unitConversion.ts utility.
 */
import { describe, it, expect } from 'vitest';
import {
  formatWeight,
  formatVolume,
  formatQuantity,
  gramsToMl,
  mlToGrams,
  scaleQuantity,
} from './unitConversion';

// ---------------------------------------------------------------------------
// formatWeight
// ---------------------------------------------------------------------------

describe('formatWeight', () => {
  it('returns 0 g for zero', () => {
    const r = formatWeight(0);
    expect(r.value).toBe(0);
    expect(r.unit).toBe('g');
  });

  it('rounds small values to nearest 5', () => {
    // 47 -> round to nearest 5 = 45
    const r = formatWeight(47);
    expect(r.value).toBe(45);
    expect(r.unit).toBe('g');
  });

  it('rounds medium values to nearest 10', () => {
    // 235 -> round to nearest 10 = 240
    const r = formatWeight(235);
    expect(r.value).toBe(240);
    expect(r.unit).toBe('g');
  });

  it('converts to kg for >= 1000g', () => {
    const r = formatWeight(1500);
    expect(r.unit).toBe('kg');
    expect(r.value).toBe(1.5);
    expect(r.display).toContain('kg');
  });

  it('rounds large values to nearest 50', () => {
    // 1234g -> round to nearest 50 = 1250g = 1.25kg -> formatted as 1.3 (1 decimal)
    const r = formatWeight(1234);
    expect(r.unit).toBe('kg');
    expect(r.value).toBe(1.25); // 1250 / 1000
  });

  it('shows whole numbers without decimals', () => {
    const r = formatWeight(2000);
    expect(r.value).toBe(2);
    expect(r.display).toContain('2');
    expect(r.display).toContain('kg');
  });
});

// ---------------------------------------------------------------------------
// formatVolume
// ---------------------------------------------------------------------------

describe('formatVolume', () => {
  it('returns ml for small volumes', () => {
    const r = formatVolume(250);
    expect(r.unit).toBe('ml');
    expect(r.value).toBe(250);
  });

  it('converts to l for >= 1000ml', () => {
    const r = formatVolume(1500);
    expect(r.unit).toBe('l');
    expect(r.value).toBe(1.5);
  });

  it('returns 0 for zero', () => {
    const r = formatVolume(0);
    expect(r.value).toBe(0);
    expect(r.unit).toBe('ml');
  });
});

// ---------------------------------------------------------------------------
// gramsToMl / mlToGrams
// ---------------------------------------------------------------------------

describe('gramsToMl', () => {
  it('converts grams to ml using density', () => {
    // 1000g water (density 1.0) = 1000ml
    expect(gramsToMl(1000, 1.0)).toBe(1000);
    // 1000g honey (density ~1.4) ≈ 714ml
    expect(gramsToMl(1000, 1.4)).toBeCloseTo(714.3, 0);
  });

  it('returns grams unchanged for density <= 0', () => {
    expect(gramsToMl(500, 0)).toBe(500);
    expect(gramsToMl(500, -1)).toBe(500);
  });
});

describe('mlToGrams', () => {
  it('converts ml to grams using density', () => {
    expect(mlToGrams(1000, 1.0)).toBe(1000);
    expect(mlToGrams(500, 0.8)).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// formatQuantity
// ---------------------------------------------------------------------------

describe('formatQuantity', () => {
  it('returns 0 g for zero or negative', () => {
    expect(formatQuantity(0, null, null).display).toBe('0 g');
    expect(formatQuantity(-5, null, null).display).toBe('0 g');
  });

  it('formats solids as weight', () => {
    const r = formatQuantity(500, 'solid', null);
    expect(r.unit).toBe('g');
    expect(r.value).toBe(500);
  });

  it('formats beverages as volume when density is available', () => {
    // 1000g water (density 1.0) -> 1000ml -> 1l
    const r = formatQuantity(1000, 'beverage', 1.0);
    expect(r.unit).toBe('l');
    expect(r.value).toBe(1);
  });

  it('falls back to weight for beverages without density', () => {
    const r = formatQuantity(500, 'beverage', null);
    expect(r.unit).toBe('g');
  });
});

// ---------------------------------------------------------------------------
// scaleQuantity
// ---------------------------------------------------------------------------

describe('scaleQuantity', () => {
  it('scales base quantity by servings', () => {
    expect(scaleQuantity(100, 4)).toBe(400);
    expect(scaleQuantity(50, 1)).toBe(50);
    expect(scaleQuantity(200, 0.5)).toBe(100);
  });
});
