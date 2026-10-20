import { describe, expect, it } from 'vitest';

import { bandPath, indexFrom, linePath, xAt, yAt } from './chartGeometry';

const box = { width: 100, height: 50, padding: 10 };

describe('chart geometry', () => {
  it('spreads x evenly across the inner width', () => {
    expect(xAt(0, 3, box)).toBe(10);
    expect(xAt(1, 3, box)).toBe(50);
    expect(xAt(2, 3, box)).toBe(90);
  });

  it('puts larger values higher and clamps outside the scale', () => {
    expect(yAt(0, 100, box)).toBe(40);
    expect(yAt(100, 100, box)).toBe(10);
    expect(yAt(500, 100, box)).toBe(10);
    expect(yAt(-5, 100, box)).toBe(40);
  });

  it('breaks the line at null points', () => {
    const path = linePath([{ x: 0, y: 0 }, { x: 1, y: 1 }, null, { x: 2, y: 2 }]);
    expect(path).toBe('M0.0,0.0 L1.0,1.0 M2.0,2.0');
  });

  it('closes the band around its upper and lower lines', () => {
    const path = bandPath([{ x: 0, y: 0 }, { x: 1, y: 0 }], [{ x: 0, y: 5 }, { x: 1, y: 5 }]);
    expect(path.startsWith('M0.0,0.0')).toBe(true);
    expect(path.endsWith('Z')).toBe(true);
  });

  it('finds the first index on or after a date', () => {
    expect(indexFrom(['2026-05-18', '2026-05-25', '2026-06-01'], '2026-05-25')).toBe(1);
    expect(indexFrom(['2026-05-18'], '2027-01-01')).toBe(1);
  });
});
