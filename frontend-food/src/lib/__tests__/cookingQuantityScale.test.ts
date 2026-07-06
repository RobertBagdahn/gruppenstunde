import { describe, it, expect } from 'vitest';
import { scaleQuantity, toBasePerServing, rescaleForNewPortions } from '../cookingQuantityScale';

describe('cookingQuantityScale helpers', () => {
  describe('scaleQuantity', () => {
    it('scales a per-1-serving quantity by scale factor', () => {
      expect(scaleQuantity(280, 4)).toBe(1120);
      expect(scaleQuantity(5, 2)).toBe(10);
    });

    it('rounds to 2 decimals for display', () => {
      expect(scaleQuantity(0.1, 3)).toBe(0.3);
      expect(scaleQuantity(0.33, 2)).toBe(0.66);
    });

    it('handles very small quantities', () => {
      expect(scaleQuantity(0.004, 4)).toBe(0.02);
    });

    it('returns 0 when base is 0', () => {
      expect(scaleQuantity(0, 4)).toBe(0);
    });
  });

  describe('toBasePerServing', () => {
    it('normalizes a displayed quantity back to per-1-serving', () => {
      expect(toBasePerServing(1120, 4)).toBe(280);
      expect(toBasePerServing(10, 2)).toBe(5);
    });

    it('rounds to 3 decimals (backend precision)', () => {
      expect(toBasePerServing(127.5, 4)).toBe(31.875);
    });

    it('returns quantity unchanged when scale <= 1', () => {
      expect(toBasePerServing(280, 1)).toBe(280);
      expect(toBasePerServing(280, 0.5)).toBe(280);
    });

    it('handles very small quantities', () => {
      expect(toBasePerServing(0.016, 4)).toBe(0.004);
    });

    it('returns 0 when quantity is 0', () => {
      expect(toBasePerServing(0, 4)).toBe(0);
    });
  });

  describe('rescaleForNewPortions', () => {
    it('re-derives base from current display and applies new scale', () => {
      // At 4 portions, user sees 1120 (base is 280)
      // Now switch to 6 portions: 280 × 6 = 1680
      expect(rescaleForNewPortions(1120, 4, 6)).toBe(1680);
    });

    it('preserves the per-1-serving base through rescaling', () => {
      const base = 280;
      const displayAt4 = scaleQuantity(base, 4); // 1120
      const displayAt6 = rescaleForNewPortions(displayAt4, 4, 6); // should be 1680
      expect(displayAt6).toBe(1680);
      // Verify base is still the same
      expect(toBasePerServing(displayAt6, 6)).toBe(base);
    });

    it('works with very small numbers (grams)', () => {
      expect(rescaleForNewPortions(0.02, 4, 6)).toBe(0.03);
    });

    it('handles scale=1 (no change)', () => {
      expect(rescaleForNewPortions(1120, 4, 4)).toBe(1120);
    });
  });
});
