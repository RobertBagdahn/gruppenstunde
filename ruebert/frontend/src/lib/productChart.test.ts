import { describe, expect, it } from 'vitest';

import { chartPoints } from './productChart';

describe('chartPoints', () => {
  it('keeps sales in the past and the forecast band in the future, in date order', () => {
    const points = chartPoints(
      [{ week_start: '2026-05-11', total: 90, excluded: false }],
      [{ week_start: '2026-05-18', quantity: 120, lower_80: 90, upper_80: 150, capped: true }],
    );
    expect(points).toEqual([
      { date: '2026-05-11', sales: 90, excluded: false },
      { date: '2026-05-18', forecast: 120, p10: 90, p90: 150, capped: true },
    ]);
  });

  it('leaves the band out when the API has no interval', () => {
    const [point] = chartPoints([], [{ week_start: '2026-05-18', quantity: 5, lower_80: null, upper_80: null, capped: false }]);
    expect(point).toMatchObject({ forecast: 5, p10: undefined, p90: undefined });
  });
});
