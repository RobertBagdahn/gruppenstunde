import { describe, it, expect } from 'vitest';
import { formatEuro } from './formatCurrency';

// Intl separates amount and symbol with a non-breaking space.
const normalize = (s: string) => s.replace(/\u00A0/g, ' ');

describe('formatEuro', () => {
  it('formats zero with German decimal comma', () => {
    expect(normalize(formatEuro(0))).toBe('0,00 €');
  });

  it('formats decimal strings from the API', () => {
    expect(normalize(formatEuro('1234.5'))).toBe('1.234,50 €');
  });

  it('falls back to zero for invalid input', () => {
    expect(normalize(formatEuro('abc'))).toBe('0,00 €');
  });
});
