import { describe, expect, it } from 'vitest';
import type { MealItem } from '@/schemas/mealPlan';
import type { BreakfastCatalog } from '@/schemas/breakfast';
import { refMealItemsToWizardState } from './refMealToWizardState';

const catalog: BreakfastCatalog = {
  base_ingredients: [],
  topping_ingredients: [],
  fat_ingredients: [],
  extra_ingredients: [],
  drink_ingredients: [],
  drink_recipes: [],
  warm_meal_recipes: [],
  gram_measuring_unit_id: null,
  ml_measuring_unit_id: null,
  scheibe_measuring_unit_id: null,
  portion_measuring_unit_id: null,
  tasse_measuring_unit_id: null,
  schuss_measuring_unit_id: null,
};

describe('refMealItemsToWizardState', () => {
  it('classifies drink recipes by recipe_type', () => {
    const item = {
      id: 1,
      recipe_id: 42,
      recipe_title: 'Tee',
      recipe_slug: 'tee',
      recipe_type: 'drink',
      ingredient_tags: [],
      factor: 1,
      ingredient_id: null,
      ingredient_name: '',
      ingredient_slug: '',
      quantity: null,
      measuring_unit_id: null,
      measuring_unit_name: '',
      display_name: null,
      image_url: null,
      active_recipe_item_ids: [],
      variant_group_id: null,
      energy_kcal: null,
      cost_eur: null,
      quantity_g: null,
      overrides: [],
      portion_display: '',
      has_missing_weight: false,
      is_per_norm_person: true,
    } satisfies MealItem;

    const state = refMealItemsToWizardState([item], catalog, 10);

    expect(state.drinkRecipes?.map((recipe) => recipe.recipeId)).toEqual([42]);
    expect(state.warmDishRecipeIds).not.toContain(42);
  });
});
