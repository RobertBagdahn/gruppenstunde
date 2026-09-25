import { describe, expect, it } from 'vitest';
import { IngredientDetailSchema, IngredientStatusSchema } from '@/schemas/supply';
import { INGREDIENT_STATUS_OPTIONS, ingredientStatusLabel, parseIngredientStatus } from './ingredientStatus';

describe('ingredient status', () => {
  it('only allows draft and verified', () => {
    expect(IngredientStatusSchema.safeParse('draft').success).toBe(true);
    expect(IngredientStatusSchema.safeParse('verified').success).toBe(true);
    expect(IngredientStatusSchema.safeParse('approved').success).toBe(false);
    expect(IngredientStatusSchema.safeParse('user_content').success).toBe(false);
  });

  it('offers exactly the two status options', () => {
    expect(INGREDIENT_STATUS_OPTIONS.map((option) => option.value)).toEqual(['draft', 'verified']);
  });

  it('labels and parses status values', () => {
    expect(ingredientStatusLabel('verified')).toBe('Verifiziert');
    expect(parseIngredientStatus('draft')).toBe('draft');
    expect(parseIngredientStatus('approved')).toBeUndefined();
  });

  it('rejects the removed visibility value group', () => {
    const shape = IngredientDetailSchema.shape.visibility;
    expect(shape.safeParse('public').success).toBe(true);
    expect(shape.safeParse('group').success).toBe(false);
  });
});
