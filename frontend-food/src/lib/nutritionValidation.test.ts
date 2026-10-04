import { describe, expect, it } from 'vitest';
import { fieldErrorsFromApi, validateNutritionValues } from './nutritionValidation';

describe('validateNutritionValues (mirrors backend hard rules)', () => {
  it('accepts a plausible profile', () => {
    expect(validateNutritionValues({ energy_kcal: 64, protein_g: 3.3, fat_g: 3.5, carbohydrate_g: 4.7, sugar_g: 4.7 })).toEqual({});
  });

  it('rejects protein above 100 g', () => {
    const errors = validateNutritionValues({ energy_kcal: 500, protein_g: 200 });
    expect(errors.protein_g).toMatch(/100 g/);
  });

  it('rejects negative values', () => {
    expect(validateNutritionValues({ fat_g: -1 }).fat_g).toBeTruthy();
  });

  it('rejects sugar above carbohydrates', () => {
    expect(validateNutritionValues({ energy_kcal: 40, carbohydrate_g: 3, sugar_g: 8 }).sugar_g).toBeTruthy();
  });

  it('rejects saturated fat above fat', () => {
    expect(validateNutritionValues({ fat_g: 2, fat_sat_g: 5 }).fat_sat_g).toBeTruthy();
  });

  it('rejects a macro sum above the limit', () => {
    const errors = validateNutritionValues({ protein_g: 60, fat_g: 50, carbohydrate_g: 10 });
    expect(errors.protein_g).toBeTruthy();
    expect(errors.fat_g).toBeTruthy();
  });

  it('tolerates rounding slack on the macro sum', () => {
    expect(validateNutritionValues({ protein_g: 40, fat_g: 30, carbohydrate_g: 30.5 })).toEqual({});
  });

  it('does not flag sugar for a broken import signature (backend treats it as a soft finding)', () => {
    expect(validateNutritionValues({ fat_g: 0, fat_sat_g: 0.1, carbohydrate_g: 0, sugar_g: 8.7, energy_kcal: 330 })).toEqual({});
  });

  it('maps backend fields to inline errors and ignores unknown fields', () => {
    expect(fieldErrorsFromApi(['protein_g', 'name'], 'Nope')).toEqual({ protein_g: 'Nope' });
  });
});
