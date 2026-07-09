/**
 * Tests for portionQuantityHint.ts
 */

import { describe, it, expect } from 'vitest';
import { deriveGramPortionHint, formatGramsWithPortionHint } from './portionQuantityHint';
import type { BreakfastPortion } from '@/schemas/breakfast';

describe('portionQuantityHint', () => {
  const mockPortion = (
    name: string,
    weight_g: number,
    priority: number = 1,
    id: number = 1,
    measuring_unit_id: number = 1,
    quantity: number = 1,
    is_default: boolean = false
  ): BreakfastPortion => ({
    id,
    name,
    measuring_unit_id,
    quantity,
    weight_g,
    is_default,
    priority,
  });

  describe('deriveGramPortionHint', () => {
    it('should return null for no portions', () => {
      expect(deriveGramPortionHint(100, undefined)).toBeNull();
      expect(deriveGramPortionHint(100, null)).toBeNull();
      expect(deriveGramPortionHint(100, [])).toBeNull();
    });

    it('should return null for grams <= 0', () => {
      const portions = [mockPortion('Scheibe', 50)];
      expect(deriveGramPortionHint(0, portions)).toBeNull();
      expect(deriveGramPortionHint(-10, portions)).toBeNull();
    });

    it('should return null if no portion with weight_g > 0', () => {
      const portions = [mockPortion('g', 0)];
      expect(deriveGramPortionHint(100, portions)).toBeNull();
    });

    it('should format single portion correctly', () => {
      const portions = [mockPortion('Scheibe', 50, 1)];
      const result = deriveGramPortionHint(85, portions);
      expect(result).toBe('≈ 1,7 Scheiben');
    });

    it('should use German comma as decimal separator', () => {
      const portions = [mockPortion('Packung', 500, 1)];
      const result = deriveGramPortionHint(750, portions);
      expect(result).toBe('≈ 1,5 Packungen');
    });

    it('should hide portions under 0.1', () => {
      const portions = [mockPortion('Packung', 5000, 1)];
      const result = deriveGramPortionHint(100, portions);
      expect(result).toBeNull(); // 100 / 5000 = 0.02 < 0.1
    });

    it('should show 0.1 exactly', () => {
      const portions = [mockPortion('Packung', 1000, 1)];
      const result = deriveGramPortionHint(100, portions);
      expect(result).toBe('≈ 0,1 Packung'); // 100 / 1000 = 0.1
    });

    it('should select primary portion by lowest priority', () => {
      const portions = [
        mockPortion('Packung', 500, 2, 1),
        mockPortion('Scheibe', 50, 1, 2),
      ];
      const result = deriveGramPortionHint(85, portions);
      // Both are shown; primary is selected by priority (Scheibe=1), secondary by priority (Packung=2)
      // Note: 0.2 is singular in German, > 1 is plural
      expect(result).toBe('≈ 1,7 Scheiben · ≈ 0,2 Packung');
    });

    it('should ignore portions with null weight_g', () => {
      const portions = [
        mockPortion('Scheibe', 50, 1, 1),
        { ...mockPortion('Invalid', 100, 2, 2), weight_g: null },
      ];
      const result = deriveGramPortionHint(85, portions);
      expect(result).toBe('≈ 1,7 Scheiben');
    });

    it('should include secondary portion with different name', () => {
      const portions = [
        mockPortion('Scheibe', 50, 1, 1),
        mockPortion('Packung', 500, 2, 2),
      ];
      const result = deriveGramPortionHint(85, portions);
      // Note: 0.2 is singular in German, > 1 is plural
      expect(result).toBe('≈ 1,7 Scheiben · ≈ 0,2 Packung');
    });

    it('should exclude secondary portion if count < 0.1', () => {
      const portions = [
        mockPortion('Scheibe', 50, 1, 1),
        mockPortion('Packung', 5000, 2, 2),
      ];
      const result = deriveGramPortionHint(85, portions);
      expect(result).toBe('≈ 1,7 Scheiben'); // Packung = 0.017 < 0.1
    });

    it('should format portion names with plurals (Scheiben vs Packungen)', () => {
      const portions = [mockPortion('Scheibe', 50, 1)];
      expect(deriveGramPortionHint(50, portions)).toBe('≈ 1 Scheibe');
      expect(deriveGramPortionHint(85, portions)).toBe('≈ 1,7 Scheiben');
      expect(deriveGramPortionHint(100, portions)).toBe('≈ 2 Scheiben');
    });

    it('should round to 1 decimal place', () => {
      const portions = [mockPortion('Portion', 100, 1)];
      expect(deriveGramPortionHint(73, portions)).toBe('≈ 0,7 Portion');
      expect(deriveGramPortionHint(74, portions)).toBe('≈ 0,7 Portion');
      expect(deriveGramPortionHint(75, portions)).toBe('≈ 0,8 Portion');
    });
  });

  describe('formatGramsWithPortionHint', () => {
    it('should include grams first', () => {
      const portions = [mockPortion('Scheibe', 50, 1)];
      const result = formatGramsWithPortionHint(85, portions);
      expect(result).toBe('85g · ≈ 1,7 Scheiben');
    });

    it('should round grams', () => {
      const portions = [mockPortion('Scheibe', 50, 1)];
      expect(formatGramsWithPortionHint(84.3, portions)).toBe('84g · ≈ 1,7 Scheiben');
      expect(formatGramsWithPortionHint(84.7, portions)).toBe('85g · ≈ 1,7 Scheiben');
    });

    it('should show only grams if no portion hint', () => {
      const portions = [mockPortion('Packung', 5000, 1)];
      expect(formatGramsWithPortionHint(100, portions)).toBe('100g');
    });

    it('should show only grams for empty portions', () => {
      expect(formatGramsWithPortionHint(85, [])).toBe('85g');
      expect(formatGramsWithPortionHint(85, null)).toBe('85g');
    });
  });
});
