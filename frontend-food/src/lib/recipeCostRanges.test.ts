import { describe, expect, it } from 'vitest';
import { costBounds, recipePricePerPortion } from './recipeCostRanges';

describe('costBounds', () => {
  it('returns nothing without a selection', () => {
    expect(costBounds(undefined)).toEqual({});
    expect(costBounds([])).toEqual({});
  });

  it('maps single ranges to their bounds', () => {
    expect(costBounds(['lt2'])).toEqual({ costs_max: 2 });
    expect(costBounds(['2-5'])).toEqual({ costs_min: 2, costs_max: 5 });
    expect(costBounds(['5-10'])).toEqual({ costs_min: 5, costs_max: 10 });
    expect(costBounds(['gt10'])).toEqual({ costs_min: 10 });
  });

  it('spans adjacent ranges', () => {
    expect(costBounds(['lt2', '2-5'])).toEqual({ costs_max: 5 });
    expect(costBounds(['2-5', '5-10'])).toEqual({ costs_min: 2, costs_max: 10 });
  });

  it('leaves a side open when a range is open there', () => {
    expect(costBounds(['5-10', 'gt10'])).toEqual({ costs_min: 5 });
    expect(costBounds(['lt2', 'gt10'])).toEqual({});
  });
});

describe('recipePricePerPortion', () => {
  it('divides the total by the portions', () => {
    expect(recipePricePerPortion({ cached_price_total: 6, portions: 4 })).toBe(1.5);
  });

  it('treats missing or zero portions as one', () => {
    expect(recipePricePerPortion({ cached_price_total: 6, portions: null })).toBe(6);
    expect(recipePricePerPortion({ cached_price_total: 6, portions: 0 })).toBe(6);
  });

  it('has no price without a total', () => {
    expect(recipePricePerPortion({ cached_price_total: null, portions: 4 })).toBeNull();
    expect(recipePricePerPortion({ portions: 4 })).toBeNull();
  });
});
