/**
 * Tests for formatWeight utility.
 */
import { describe, it, expect } from 'vitest';
import { formatWeight } from '@/utils/formatWeight';

describe('formatWeight', () => {
  it('converts 1000g to kg', () => {
    expect(formatWeight(1000)).toBe('1.0 kg');
  });

  it('converts 1500g to kg', () => {
    expect(formatWeight(1500)).toBe('1.5 kg');
  });

  it('converts 2345g to kg with 1 decimal', () => {
    expect(formatWeight(2345)).toBe('2.3 kg');
  });

  it('shows 999g as grams', () => {
    expect(formatWeight(999)).toBe('999 g');
  });

  it('shows 350g as grams', () => {
    expect(formatWeight(350)).toBe('350 g');
  });

  it('shows 1g as grams', () => {
    expect(formatWeight(1)).toBe('1 g');
  });

  it('shows sub-1g with decimal', () => {
    expect(formatWeight(0.5)).toBe('0.5 g');
  });

  it('shows 0g with decimal', () => {
    expect(formatWeight(0)).toBe('0.0 g');
  });

  it('rounds fractional grams to integer', () => {
    expect(formatWeight(350.7)).toBe('351 g');
  });
});
