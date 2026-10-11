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
  it('restores buffet-tagged cereal, fresh items, and drink ingredients', () => {
    const enrichedCatalog: BreakfastCatalog = {
      ...catalog,
      base_ingredients: [
        { id: 1, name: 'Haferflocken', slug: 'haferflocken', is_standalone_food: true, standard_recipe_weight_g: null, energy_kcal: 370, price_per_kg: null, portions: [] },
      ],
      extra_ingredients: [
        { id: 3, name: 'Apfel', slug: 'apfel', is_standalone_food: true, energy_kcal: 52, price_per_kg: null, portions: [
          { id: 55, name: 'Stück', measuring_unit_id: 7, quantity: 1, weight_g: 50, is_default: true, priority: 1 },
        ] },
      ],
      drink_ingredients: [
        { id: 4, name: 'Milch', slug: 'milch', is_standalone_food: true, energy_kcal: 64, price_per_kg: null, portions: [] },
      ],
    };
    const mealItem = (overrides: Partial<MealItem>): MealItem => ({
      id: 1,
      recipe_id: null,
      recipe_title: '',
      recipe_slug: '',
      recipe_type: '',
      ingredient_tags: [],
      factor: 1,
      ingredient_id: 1,
      ingredient_name: 'Haferflocken',
      ingredient_slug: 'haferflocken',
      quantity: 80,
      measuring_unit_id: 1,
      measuring_unit_name: 'Gramm',
      standard_measure_key: '',
      unit_kind: 'grams',
      unit_label: 'g',
      is_weight_approx: false,
      display_name: null,
      note: '',
      image_url: null,
      active_recipe_item_ids: [],
      variant_group_id: null,
      energy_kcal: 296,
      cost_eur: null,
      quantity_g: 80,
      overrides: [],
      has_missing_weight: false,
      is_per_norm_person: true,
      buffet_role: '',
      is_breakfast_assistant: false,
      warnings: [],
      ...overrides,
    });

    const state = refMealItemsToWizardState([
      mealItem({ id: 1, ingredient_tags: ['buffet-cereal'] }),
      mealItem({ id: 2, ingredient_id: 3, ingredient_name: 'Apfel', ingredient_slug: 'apfel', ingredient_tags: ['buffet-fresh'], quantity: 1, quantity_g: 50, measuring_unit_id: 7, measuring_unit_name: 'Stück', portion_id: 55, portion_name: 'Stück' }),
      mealItem({ id: 3, ingredient_id: 4, ingredient_name: 'Milch', ingredient_slug: 'milch', ingredient_tags: ['buffet-drink'], quantity: 200, measuring_unit_name: 'Milliliter' }),
      mealItem({ id: 4, ingredient_id: 6, ingredient_name: 'Alter Saft', ingredient_slug: 'alter-saft', ingredient_tags: ['breakfast-drink'], quantity: 100, measuring_unit_name: 'Milliliter' }),
      mealItem({ id: 5, ingredient_id: 5, ingredient_name: 'Manuelle Zutat', ingredient_slug: 'manuelle-zutat', ingredient_tags: [], quantity: 30 }),
    ], enrichedCatalog, 10);

    expect(state.basis?.map((item) => item.ingredientId)).toEqual([1]);
    expect(state.extraIngredients).toEqual({ '3': 50 });
    expect(state.extraIngredientNames).toEqual({ '3': 'Apfel' });
    expect(state.extraIngredientSelections?.['3']).toEqual({
      portionId: 55,
      measuringUnitId: 7,
      portionName: 'Stück',
      measuringUnitName: 'Stück',
      quantity: 1,
      weightG: 50,
    });
    expect(state.drinkIngredients?.map((item) => item.ingredientId)).toEqual([4, 6]);
    expect(state.extraIngredients).not.toHaveProperty('5');
  });

  it('preserves legacy RefMeal mapping of untagged extras and warm recipes', () => {
    const legacyCatalog: BreakfastCatalog = {
      ...catalog,
      extra_ingredients: [
        { id: 5, name: 'Apfel', slug: 'apfel', is_standalone_food: true, energy_kcal: 52, price_per_kg: null, portions: [] },
      ],
    };
    const item = {
      id: 8,
      recipe_id: null,
      recipe_title: '',
      recipe_slug: '',
      recipe_type: '',
      ingredient_tags: [],
      factor: 1,
      ingredient_id: 5,
      ingredient_name: 'Apfel',
      ingredient_slug: 'apfel',
      quantity: 50,
      measuring_unit_id: 1,
      measuring_unit_name: 'Gramm',
      standard_measure_key: '',
      unit_kind: 'grams',
      unit_label: 'g',
      is_weight_approx: false,
      display_name: null,
      note: '',
      image_url: null,
      active_recipe_item_ids: [],
      variant_group_id: null,
      energy_kcal: 26,
      cost_eur: null,
      quantity_g: 50,
      overrides: [],
      has_missing_weight: false,
      is_per_norm_person: true,
      buffet_role: '',
      is_breakfast_assistant: false,
      warnings: [],
    } satisfies MealItem;
    const warmRecipe = {
      ...item,
      id: 9,
      recipe_id: 42,
      recipe_title: 'Rührei',
      recipe_type: 'warm_meal',
      ingredient_id: null,
      ingredient_name: '',
      quantity: null,
      quantity_g: null,
    } satisfies MealItem;

    const state = refMealItemsToWizardState([item, warmRecipe], legacyCatalog, 10, true);

    expect(state.extraIngredients).toEqual({ '5': 50 });
    expect(state.warmDishRecipeIds).toEqual([42]);
  });

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
      standard_measure_key: '',
      unit_kind: null,
      unit_label: '',
      is_weight_approx: false,
      display_name: null,
      note: '',
      image_url: null,
      active_recipe_item_ids: [],
      variant_group_id: null,
      energy_kcal: null,
      cost_eur: null,
      quantity_g: null,
      overrides: [],
      has_missing_weight: false,
      is_per_norm_person: true,
      buffet_role: '',
      is_breakfast_assistant: false,
      warnings: [],
    } satisfies MealItem;

    const state = refMealItemsToWizardState([item], catalog, 10);

    // The saved factor is the share; the rest is the virtual "Kein Extra Getränk" (id 0).
    expect(state.drinkRecipes?.map(({ recipeId, sharePercent }) => [recipeId, sharePercent])).toEqual([[42, 100], [0, 0]]);
    expect(state.warmDishRecipeIds).not.toContain(42);
  });

  it('restores untagged assistant ingredients as extras with their portion', () => {
    const freeExtra = {
      id: 12,
      recipe_id: null,
      recipe_title: '',
      recipe_slug: '',
      recipe_type: '',
      ingredient_tags: [],
      factor: 1,
      ingredient_id: 99,
      ingredient_name: 'Tomatenmark',
      ingredient_slug: 'tomatenmark',
      quantity: 2,
      measuring_unit_id: 12,
      measuring_unit_name: 'Esslöffel',
      portion_id: 501,
      portion_name: 'EL',
      standard_measure_key: '',
      unit_kind: 'grams',
      unit_label: 'EL',
      is_weight_approx: false,
      display_name: null,
      note: '',
      image_url: null,
      active_recipe_item_ids: [],
      variant_group_id: null,
      energy_kcal: 24,
      cost_eur: null,
      quantity_g: 30,
      overrides: [],
      has_missing_weight: false,
      is_per_norm_person: true,
      buffet_role: '',
      is_breakfast_assistant: true,
      warnings: [],
    } satisfies MealItem;
    const manualItem = { ...freeExtra, id: 13, ingredient_id: 98, is_breakfast_assistant: false } satisfies MealItem;

    const state = refMealItemsToWizardState([freeExtra, manualItem], catalog, 10);

    expect(state.extraIngredients).toEqual({ '99': 30 });
    expect(state.extraIngredientNames).toEqual({ '99': 'Tomatenmark' });
    expect(state.extraIngredientSelections?.['99']).toEqual({
      portionId: 501,
      measuringUnitId: 12,
      portionName: 'EL',
      measuringUnitName: 'Esslöffel',
      quantity: 2,
      weightG: 15,
    });
  });

  it('restores explicit "no fat" and "no topping" when none were saved', () => {
    const fatCatalog: BreakfastCatalog = {
      ...catalog,
      fat_ingredients: [
        { id: 20, name: 'Butter', slug: 'butter', is_standalone_food: true, energy_kcal: 717, price_per_kg: null, portions: [] },
      ],
      topping_ingredients: [
        { id: 21, name: 'Gouda', slug: 'gouda', is_standalone_food: true, energy_kcal: 350, price_per_kg: null, portions: [] },
      ],
    };
    const cereal = {
      id: 1,
      recipe_id: null,
      recipe_title: '',
      recipe_slug: '',
      recipe_type: '',
      ingredient_tags: ['buffet-cereal'],
      factor: 1,
      ingredient_id: 1,
      ingredient_name: 'Haferflocken',
      ingredient_slug: 'haferflocken',
      quantity: 80,
      measuring_unit_id: 1,
      measuring_unit_name: 'Gramm',
      standard_measure_key: '',
      unit_kind: 'grams',
      unit_label: 'g',
      is_weight_approx: false,
      display_name: null,
      note: '',
      image_url: null,
      active_recipe_item_ids: [],
      variant_group_id: null,
      energy_kcal: 296,
      cost_eur: null,
      quantity_g: 80,
      overrides: [],
      has_missing_weight: false,
      is_per_norm_person: true,
      buffet_role: '',
      is_breakfast_assistant: true,
      warnings: [],
    } satisfies MealItem;

    const state = refMealItemsToWizardState([cereal], fatCatalog, 10);

    expect(state.fatSelections?.map(({ name, sharePercent }) => `${name}:${sharePercent}`)).toEqual(['Butter:0', 'Kein Fett:100']);
    expect(state.toppings?.map(({ name, sharePercent }) => `${name}:${sharePercent}`)).toEqual(['Gouda:0']);
  });

  it('restores a saved fat as its part of the fixed fat amount', () => {
    const fatCatalog: BreakfastCatalog = {
      ...catalog,
      fat_ingredients: [
        { id: 20, name: 'Butter', slug: 'butter', is_standalone_food: true, energy_kcal: 717, price_per_kg: null, portions: [] },
      ],
    };
    const butter = {
      id: 2,
      recipe_id: null,
      recipe_title: '',
      recipe_slug: '',
      recipe_type: '',
      ingredient_tags: ['buffet-fat'],
      factor: 1,
      ingredient_id: 20,
      ingredient_name: 'Butter',
      ingredient_slug: 'butter',
      quantity: 4,
      measuring_unit_id: 1,
      measuring_unit_name: 'Gramm',
      standard_measure_key: '',
      unit_kind: 'grams',
      unit_label: 'g',
      is_weight_approx: false,
      display_name: null,
      note: '',
      image_url: null,
      active_recipe_item_ids: [],
      variant_group_id: null,
      energy_kcal: 29,
      cost_eur: null,
      quantity_g: 4,
      overrides: [],
      has_missing_weight: false,
      is_per_norm_person: true,
      buffet_role: '',
      is_breakfast_assistant: true,
      warnings: [],
    } satisfies MealItem;

    const state = refMealItemsToWizardState([butter], fatCatalog, 10);

    expect(state.fatSelections?.map(({ name, sharePercent }) => `${name}:${sharePercent}`)).toEqual(['Butter:50', 'Kein Fett:50']);
  });
});
