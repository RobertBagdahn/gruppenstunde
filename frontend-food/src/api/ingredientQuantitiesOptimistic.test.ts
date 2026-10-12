import { describe, expect, it, vi } from 'vitest';
import { IngredientQuantitySchema } from '@/schemas/mealPlan';

vi.mock('@/lib/api', () => ({ API_BASE_URL: '', parseApiResponse: vi.fn() }));

const { applyLineChange } = await import('./mealPlans');

const item = IngredientQuantitySchema.parse({
  ingredient_id: 7,
  ingredient_name: 'Zwiebel',
  net_quantity_g: 1000,
  total_quantity_g: 1100,
  quantity: 1100,
  lines: [
    {
      kind: 'recipe', meal_item_id: 1, recipe_item_id: 11, meal_id: 1, meal_type: 'lunch', meal_label: 'Sa',
      recipe_title: 'Soße', quantity_per_person: 2, original_quantity_per_person: 2, unit_label: 'Stück',
      factor: 1, effective_portions: 5, net_quantity_g: 800, editable: true,
    },
    {
      kind: 'recipe', meal_item_id: 2, recipe_item_id: 12, meal_id: 2, meal_type: 'dinner', meal_label: 'So',
      recipe_title: 'Burger', quantity_per_person: 1, original_quantity_per_person: 1, unit_label: 'Stück',
      factor: 1, effective_portions: 2.5, net_quantity_g: 200, editable: true,
    },
  ],
});

describe('applyLineChange', () => {
  it('scales grams of the changed line and the totals', () => {
    const [updated] = applyLineChange([item], 1, 11, { quantity_override: 0.5, excluded: false });

    expect(updated.lines[0]).toMatchObject({ quantity_per_person: 0.5, net_quantity_g: 200, is_overridden: true });
    expect(updated.net_quantity_g).toBe(400);
    expect(updated.total_quantity_g).toBeCloseTo(440);
    expect(updated.is_adjusted).toBe(true);
  });

  it('drops excluded lines from the total and resets back to the recipe', () => {
    const [excluded] = applyLineChange([item], 2, 12, { quantity_override: null, excluded: true });
    expect(excluded.net_quantity_g).toBe(800);
    expect(excluded.lines[1].excluded).toBe(true);

    const [reset] = applyLineChange([item], 1, 11, null);
    expect(reset.lines[0]).toMatchObject({ quantity_per_person: 2, is_overridden: false, net_quantity_g: 800 });
    expect(reset.is_adjusted).toBe(false);
  });
});
