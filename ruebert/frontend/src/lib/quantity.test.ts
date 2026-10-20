import { describe, expect, it } from 'vitest';

import { isAllowedQuantity, nextQuantity } from './quantity';

describe('isAllowedQuantity', () => {
  it('allows 0 and multiples of the step from the minimum', () => {
    expect([0, 5_000, 10_000, 125_000].every((q) => isAllowedQuantity(q, 5_000))).toBe(true);
  });

  it('rejects values off the grid and below the minimum', () => {
    expect([1, 4_999, 6_000, 18_000, -5_000].some((q) => isAllowedQuantity(q, 5_000))).toBe(false);
  });
});

describe('nextQuantity', () => {
  it('steps up from 0 to the minimum and then by one step', () => {
    expect(nextQuantity(0, 'up', 5_000)).toBe(5_000);
    expect(nextQuantity(5_000, 'up', 5_000)).toBe(10_000);
  });

  it('steps down to 0 from the minimum and never produces an off-grid value', () => {
    expect(nextQuantity(5_000, 'down', 5_000)).toBe(0);
    expect(nextQuantity(15_000, 'down', 5_000)).toBe(10_000);
    expect(nextQuantity(0, 'down', 5_000)).toBe(0);
  });

  it('keeps every step on the allowed grid', () => {
    let q = 0;
    for (let i = 0; i < 30; i += 1) {
      q = nextQuantity(q, i % 3 === 2 ? 'down' : 'up', 5_000);
      expect(isAllowedQuantity(q, 5_000)).toBe(true);
    }
  });
});
