import { describe, it, expect } from 'vitest';
import { scaleQuantity, toBasePerServing, rescaleForNewPortions } from './cookingQuantityScale';

describe('scaleQuantity', () => {
  it('scales a per-1-serving quantity up for display', () => {
    expect(scaleQuantity(100, 4)).toBe(400);
  });

  it('rounds to 2 decimals', () => {
    expect(scaleQuantity(33.333, 3)).toBe(100);
  });
});

describe('toBasePerServing', () => {
  // 4.1 Frontend: Eingabe für 4 Personen → gespeicherte Menge = Eingabe/4
  it('normalizes a quantity entered for 4 people down to 1 serving', () => {
    expect(toBasePerServing(400, 4)).toBe(100);
  });

  it('returns the value unchanged when scale is 1', () => {
    expect(toBasePerServing(250, 1)).toBe(250);
  });

  it('rounds to 3 decimals', () => {
    expect(toBasePerServing(100, 3)).toBeCloseTo(33.333, 3);
  });
});

describe('rescaleForNewPortions', () => {
  // 4.2 Frontend: Personenzahl ändern skaliert Anzeige live
  it('doubles quantities when person count doubles', () => {
    expect(rescaleForNewPortions(400, 4, 8)).toBe(800);
  });

  it('halves quantities when person count is halved', () => {
    expect(rescaleForNewPortions(400, 4, 2)).toBe(200);
  });

  it('is a no-op when scale does not change', () => {
    expect(rescaleForNewPortions(123.45, 4, 4)).toBe(123.45);
  });

  it('preserves round-trip consistency: scale up then back down', () => {
    const scaledFor4 = scaleQuantity(100, 4);
    const rescaledFor1 = rescaleForNewPortions(scaledFor4, 4, 1);
    expect(rescaledFor1).toBe(100);
  });
});
