import { describe, expect, it } from 'vitest';
import { RecipeItemSchema } from '@/schemas/recipe';
import { formatRecipeItemAmount } from './ingredientAmount';

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
