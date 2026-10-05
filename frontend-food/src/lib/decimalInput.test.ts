import { describe, expect, it } from 'vitest';
import { formatDecimalInput, parseDecimalInput } from './decimalInput';

describe('decimalInput', () => {
  it('parses decimal comma and decimal point values', () => {
    expect(parseDecimalInput('0,6')).toBe(0.6);
    expect(parseDecimalInput('0.6')).toBe(0.6);
  });

  it('rejects empty and incomplete numeric drafts', () => {
    expect(parseDecimalInput('')).toBeNull();
    expect(parseDecimalInput('0,')).toBeNull();
    expect(parseDecimalInput('abc')).toBeNull();
    expect(parseDecimalInput('1,2,3')).toBeNull();
  });

  it('formats values with a German decimal separator', () => {
    expect(formatDecimalInput(0.6)).toBe('0,6');
    expect(formatDecimalInput(1)).toBe('1');
  });
});
