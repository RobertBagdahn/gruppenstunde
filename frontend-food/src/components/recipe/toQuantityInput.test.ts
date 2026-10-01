import { describe, expect, it } from 'vitest';
import { toQuantityInput } from './InlineIngredientEditor';

describe('toQuantityInput', () => {
  it('shows a German decimal comma', () => {
    expect(toQuantityInput(67.35)).toBe('67,35');
    expect(toQuantityInput(0.4)).toBe('0,4');
  });

  it('keeps whole numbers plain', () => {
    expect(toQuantityInput(250)).toBe('250');
  });
});
