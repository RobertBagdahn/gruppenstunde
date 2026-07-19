/**
 * Tests for costsLabel formatting in detail pages.
 * Tests the pure function logic: number → formatted string.
 */
import { describe, it, expect } from 'vitest';

function formatCostsPerPerson(value: number | null | undefined): string | null {
  if (value == null) return null;
  return `${Number(value).toFixed(2).replace('.', ',')} € pro Person`;
}

describe('formatCostsPerPerson', () => {
  it('returns null for null input', () => {
    expect(formatCostsPerPerson(null)).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(formatCostsPerPerson(undefined)).toBeNull();
  });

  it('formats whole euro amount', () => {
    expect(formatCostsPerPerson(5)).toBe('5,00 € pro Person');
  });

  it('formats decimal euro amount', () => {
    expect(formatCostsPerPerson(2.5)).toBe('2,50 € pro Person');
  });

  it('formats zero', () => {
    expect(formatCostsPerPerson(0)).toBe('0,00 € pro Person');
  });

  it('formats large amount', () => {
    expect(formatCostsPerPerson(150.99)).toBe('150,99 € pro Person');
  });

  it('handles string input from API', () => {
    expect(formatCostsPerPerson('3.50' as any)).toBe('3,50 € pro Person');
  });

  it('handles small decimal', () => {
    expect(formatCostsPerPerson(0.5)).toBe('0,50 € pro Person');
  });
});
