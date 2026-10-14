import { describe, expect, it } from 'vitest';
import { validateBasics } from './validateBasics';

const valid = { norm_portions: 12, start_datetime: '2026-10-10T18:00', end_datetime: '2026-10-12T12:00' };

describe('validateBasics', () => {
  it('accepts a normal plan', () => {
    expect(validateBasics(valid)).toEqual({});
  });

  it('rejects zero, negative and non-numeric persons', () => {
    expect(validateBasics({ ...valid, norm_portions: 0 }).portions).toBeDefined();
    expect(validateBasics({ ...valid, norm_portions: -2 }).portions).toBeDefined();
    expect(validateBasics({ ...valid, norm_portions: Number.NaN }).portions).toBeDefined();
    expect(validateBasics({ ...valid, norm_portions: 1001 }).portions).toBeDefined();
  });

  it('rejects an end before or at the start', () => {
    expect(validateBasics({ ...valid, end_datetime: '2026-10-08T12:00' }).period).toBeDefined();
    expect(validateBasics({ ...valid, end_datetime: valid.start_datetime }).period).toBeDefined();
  });

  it('allows an open period', () => {
    expect(validateBasics({ ...valid, end_datetime: '' })).toEqual({});
    expect(validateBasics({ ...valid, start_datetime: '' })).toEqual({});
  });

  it('rejects a period longer than 60 days', () => {
    expect(validateBasics({ ...valid, end_datetime: '2026-12-31T12:00' }).period).toContain('60 Tage');
    expect(validateBasics({ ...valid, end_datetime: '2026-12-08T12:00' }).period).toBeUndefined();
  });

  it('rejects a reserve factor outside 1,0 to 2,0', () => {
    expect(validateBasics({ ...valid, reserve_factor: 2.5 }).reserve).toContain('1,0 und 2,0');
    expect(validateBasics({ ...valid, reserve_factor: -100 }).reserve).toBeDefined();
    expect(validateBasics({ ...valid, reserve_factor: 1.1 }).reserve).toBeUndefined();
  });
});
