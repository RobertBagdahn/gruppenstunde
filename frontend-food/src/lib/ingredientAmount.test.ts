import { describe, expect, it } from 'vitest';
import { RecipeItemSchema } from '@/schemas/recipe';
import { RecipeStepIngredientSchema } from '@/schemas/recipeStep';
import {
  formatPortionAmount,
  formatRecipeItemAmount,
  formatScaledRecipeAmount,
  formatStepIngredientLabel,
} from './ingredientAmount';

function item(overrides: Record<string, unknown>) {
  return RecipeItemSchema.parse({
    id: 1,
    portion_id: null,
    quantity: 1,
    sort_order: 0,
    note: '',
    weight_g: 0,
    ...overrides,
  });
}

describe('formatRecipeItemAmount (wizard preview cases from the production test)', () => {
  it('shows a pre-weighed portion with its name and grams, not "1 g"', () => {
    const amount = formatRecipeItemAmount(
      item({ ingredient_name: 'Spaghetti', portion_name: 'Portion trocken (100g)', measuring_unit_name: 'Gramm', quantity: 1, weight_g: 100 }),
    );
    expect(amount.primary).toBe('1 Portion trocken (100g)');
    expect(amount.secondary).toBe('100 g');
  });

  it('shows a piece portion with its count and grams, not "0,31 g"', () => {
    const amount = formatRecipeItemAmount(
      item({ ingredient_name: 'Zwiebel', portion_name: 'mittelgroße Zwiebel', measuring_unit_name: 'Gramm', quantity: 0.31, weight_g: 24.8 }),
    );
    expect(amount.primary).toBe('0,31 mittelgroße Zwiebel');
    expect(amount.secondary).toBe('25 g');
  });

  it('abbreviates spoon units', () => {
    const amount = formatRecipeItemAmount(
      item({ ingredient_name: 'Olivenöl', portion_name: 'Esslöffel', measuring_unit_name: 'Esslöffel', quantity: 0.46, weight_g: 6.9 }),
    );
    expect(amount.primary).toBe('0,46 EL');
  });

  it('keeps metric amounts without a secondary line', () => {
    const amount = formatRecipeItemAmount(item({ portion_name: 'Gramm', measuring_unit_name: 'Gramm', quantity: 250, weight_g: 250 }));
    expect(amount).toEqual({ primary: '250 g', secondary: null });
  });

  it('never guesses "Gramm" when neither portion nor unit exists', () => {
    const amount = formatRecipeItemAmount(item({ quantity: 2 }));
    expect(amount.primary).toBe('2 —');
    expect(amount.primary).not.toMatch(/g$/);
  });

  it('shows a dash without a quantity', () => {
    expect(formatRecipeItemAmount(item({ quantity: 0 })).primary).toBe('—');
  });
});

function stepIngredient(overrides: Record<string, unknown>) {
  return RecipeStepIngredientSchema.parse({ id: 1, recipe_item_id: 1, ...overrides });
}

describe('formatScaledRecipeAmount (ingredient list and step chips)', () => {
  it('shows a portion item as portion count with grams, not as "0,35 g"', () => {
    const amount = formatScaledRecipeAmount({ quantity: 0.35, weight_g: 17.5, portion_name: 'Portion', unit_short: 'Portion' });
    expect(amount).toEqual({ primary: '0,35 Portion', secondary: '18 g' });
  });

  it('shows a direct-gram item in grams and scales it by servings', () => {
    expect(formatScaledRecipeAmount({ quantity: 200, weight_g: 200, unit_short: 'g' }, 3)).toEqual({ primary: '600 g', secondary: null });
  });

  it('shows a metric portion by its weight', () => {
    const amount = formatScaledRecipeAmount({ quantity: 250, weight_g: 250, portion_name: 'Gramm', measuring_unit_name: 'Gramm' }, 2);
    expect(amount).toEqual({ primary: '500 g', secondary: null });
  });

  it('keeps the portion count when the weight is unknown', () => {
    expect(formatScaledRecipeAmount({ quantity: 2, weight_g: null, portion_name: 'Stück' }, 2)).toEqual({ primary: '4 Stück', secondary: null });
  });

  it('matches the cooking-mode ingredient list for a recipe item', () => {
    const recipeItem = item({ ingredient_name: 'Sojagranulat', portion_id: 7, portion_name: 'Portion', measuring_unit_name: 'Gramm', quantity: 0.35, weight_g: 17.5 });
    const step = stepIngredient({ ingredient_name: 'Sojagranulat', portion_name: 'Portion', unit_short: 'Portion', quantity: 0.35, weight_g: 17.5 });
    expect(formatScaledRecipeAmount(step, 4)).toEqual(formatScaledRecipeAmount(recipeItem, 4));
  });
});

describe('formatStepIngredientLabel', () => {
  it('combines amount, grams and ingredient name', () => {
    const step = stepIngredient({ ingredient_name: 'Sojagranulat', portion_name: 'Portion', unit_short: 'Portion', quantity: 0.35, weight_g: 17.5 });
    expect(formatStepIngredientLabel(step)).toBe('0,35 Portion (18 g) Sojagranulat');
  });

  it('names a direct-gram item', () => {
    const step = stepIngredient({ ingredient_name: 'Reis', unit_short: 'g', quantity: 100, weight_g: 100 });
    expect(formatStepIngredientLabel(step, 2)).toBe('200 g Reis');
  });

  it('shows a beverage in ml like the ingredient list', () => {
    const step = stepIngredient({
      ingredient_name: 'Milch', unit_short: 'g', quantity: 206, weight_g: 206,
      ingredient_viscosity: 'beverage', ingredient_density: 1.03,
    });
    expect(formatStepIngredientLabel(step, 2)).toBe('400 ml Milch');
  });

  it('shows the grams of a beverage portion in ml, matching the cooking-mode ingredient list', () => {
    const fields = { ingredient_name: 'Milch', portion_name: 'Glas', quantity: 1, weight_g: 206, ingredient_viscosity: 'beverage', ingredient_density: 1.03 };
    const step = stepIngredient({ ...fields, unit_short: 'Glas' });
    const recipeItem = item({ ...fields, portion_id: 3, measuring_unit_name: 'Gramm' });
    expect(formatStepIngredientLabel(step, 2)).toBe('2 Glas (400 ml) Milch');
    expect(formatScaledRecipeAmount(step, 2)).toEqual(formatScaledRecipeAmount(recipeItem, 2));
  });

  it('keeps grams for a liquid that is not a beverage', () => {
    const step = stepIngredient({
      ingredient_name: 'Öl', unit_short: 'g', quantity: 50, weight_g: 50,
      ingredient_viscosity: 'liquid', ingredient_density: 0.92,
    });
    expect(formatStepIngredientLabel(step)).toBe('50 g Öl');
  });

  it('falls back to the note without amount', () => {
    expect(formatStepIngredientLabel(stepIngredient({ note: 'Prise Salz' }))).toBe('Prise Salz');
  });
});

describe('formatPortionAmount plural', () => {
  it('uses "Portion" for exactly one', () => {
    expect(formatPortionAmount(1, 'Portion Nudeln')).toBe('1 Portion Nudeln');
  });

  it('uses "Portionen" for several', () => {
    expect(formatPortionAmount(7, 'Portion Nudeln')).toBe('7 Portionen Nudeln');
    expect(formatPortionAmount(7, '1 Portion Nudeln')).toBe('7 Portionen Nudeln');
  });

  it('leaves other portion names untouched', () => {
    expect(formatPortionAmount(3, 'Scheibe Brot')).toBe('3 Scheibe Brot');
  });
});
