/**
 * Tests for portionDisplay.ts utility.
 */
import { describe, it, expect } from 'vitest';
import { calculateNaturalPortions, getPrimaryPortionDisplay } from './portionDisplay';
import type { Portion } from '@/schemas/supply';

// Helper to create a minimal Portion object
function makePortion(overrides: Partial<Portion> = {}): Portion {
  return {
    id: 1,
    name: 'Stueck',
    quantity: 1,
    rank: 1,
    weight_g: 100,
    priority: 0,
    is_default: false,
    measuring_unit_id: null,
    measuring_unit_name: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// calculateNaturalPortions
// ---------------------------------------------------------------------------

describe('calculateNaturalPortions', () => {
  it('returns empty for zero weight', () => {
    const portions = [makePortion()];
    expect(calculateNaturalPortions(0, portions)).toEqual([]);
  });

  it('returns empty for no portions', () => {
    expect(calculateNaturalPortions(500, [])).toEqual([]);
  });

  it('calculates correct count for simple division', () => {
    const portions = [makePortion({ weight_g: 100 })];
    const result = calculateNaturalPortions(300, portions);
    expect(result).toHaveLength(1);
    expect(result[0].count).toBe(3);
    expect(result[0].display).toContain('3');
  });

  it('rounds to nearest 0.5 for values < 10', () => {
    const portions = [makePortion({ weight_g: 200 })];
    // 700g / 200g = 3.5 -> rounds to 3.5
    const result = calculateNaturalPortions(700, portions);
    expect(result[0].count).toBe(3.5);
  });

  it('rounds to whole number for values >= 10', () => {
    const portions = [makePortion({ weight_g: 10 })];
    // 125g / 10g = 12.5 -> rounds to 13
    const result = calculateNaturalPortions(125, portions);
    expect(result[0].count).toBe(13);
  });

  it('puts default portion first', () => {
    const portions = [
      makePortion({ id: 1, name: 'Normal', weight_g: 100, is_default: false, priority: 5 }),
      makePortion({ id: 2, name: 'Default', weight_g: 50, is_default: true, priority: 0 }),
    ];
    const result = calculateNaturalPortions(200, portions);
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('Default');
    expect(result[0].isDefault).toBe(true);
  });

  it('skips portions with weight_g=0 or null', () => {
    const portions = [
      makePortion({ id: 1, name: 'Zero', weight_g: 0 }),
      makePortion({ id: 2, name: 'Null', weight_g: null }),
      makePortion({ id: 3, name: 'Valid', weight_g: 100 }),
    ];
    const result = calculateNaturalPortions(200, portions);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Valid');
  });

  it('uses "Stueck" as fallback name for empty portion name', () => {
    const portions = [makePortion({ name: '', weight_g: 100 })];
    const result = calculateNaturalPortions(300, portions);
    expect(result[0].display).toContain('Stück');
  });

  it('formats display with "ca." prefix', () => {
    const portions = [makePortion({ name: 'Apfel', weight_g: 200 })];
    const result = calculateNaturalPortions(600, portions);
    expect(result[0].display).toBe('ca. 3 x Apfel');
  });

  it('negative weight returns empty', () => {
    const portions = [makePortion()];
    expect(calculateNaturalPortions(-100, portions)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// getPrimaryPortionDisplay
// ---------------------------------------------------------------------------

describe('getPrimaryPortionDisplay', () => {
  it('returns null for no portions', () => {
    expect(getPrimaryPortionDisplay(500, [])).toBeNull();
  });

  it('returns null for zero weight', () => {
    const portions = [makePortion()];
    expect(getPrimaryPortionDisplay(0, portions)).toBeNull();
  });

  it('returns the default portion display if available', () => {
    const portions = [
      makePortion({ id: 1, name: 'Normal', weight_g: 100, is_default: false }),
      makePortion({ id: 2, name: 'Standard', weight_g: 50, is_default: true }),
    ];
    const result = getPrimaryPortionDisplay(200, portions);
    expect(result).toContain('Standard');
  });

  it('returns first portion if no default is set', () => {
    const portions = [
      makePortion({ id: 1, name: 'A', weight_g: 100, is_default: false, priority: 5 }),
      makePortion({ id: 2, name: 'B', weight_g: 50, is_default: false, priority: 3 }),
    ];
    const result = getPrimaryPortionDisplay(200, portions);
    // A has higher priority so it comes first
    expect(result).toContain('A');
  });
});
