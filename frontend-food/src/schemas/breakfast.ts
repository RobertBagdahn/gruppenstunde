/**
 * Zod schemas for the Breakfast Wizard.
 * MUST stay in sync with:
 *   backend/supply/api/breakfast_catalog.py
 *   (PortionOut, BaseIngredientOut, ToppingIngredientOut, BreakfastCatalogOut,
 *    ToppingPortionIn, BreakfastLeftoversIn, ToppingLeftoverOut, BreakfastLeftoversOut)
 */
import { z } from 'zod';
import { MealItemSchema } from './mealPlan';

// ============================================================================
// Catalog schemas
// ============================================================================

export const BreakfastPortionSchema = z.object({
  id: z.number(),
  name: z.string(),
  measuring_unit_id: z.number(),
  quantity: z.number(),
  weight_g: z.number().nullable(),
  is_default: z.boolean(),
  priority: z.number(),
});
export type BreakfastPortion = z.infer<typeof BreakfastPortionSchema>;

export const BaseIngredientSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  is_standalone_food: z.boolean(),
  standard_recipe_weight_g: z.number().nullable(),
  energy_kcal: z.number().nullable(),
  portions: z.array(BreakfastPortionSchema),
});
export type BaseIngredient = z.infer<typeof BaseIngredientSchema>;

export const ToppingIngredientSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  is_standalone_food: z.boolean(),
  energy_kcal: z.number().nullable(),
  price_per_kg: z.number().nullable(),
  portions: z.array(BreakfastPortionSchema),
});
export type ToppingIngredient = z.infer<typeof ToppingIngredientSchema>;

export const DrinkRecipeSchema = z.object({
  id: z.number(),
  title: z.string(),
  recipe_type: z.string(),
  cached_energy_kcal: z.number().nullable(),
});
export type DrinkRecipe = z.infer<typeof DrinkRecipeSchema>;

export const WarmMealRecipeSchema = z.object({
  id: z.number(),
  title: z.string(),
  recipe_type: z.string(),
  cached_energy_kcal: z.number().nullable(),
});
export type WarmMealRecipe = z.infer<typeof WarmMealRecipeSchema>;

export const BreakfastCatalogSchema = z.object({
  base_ingredients: z.array(BaseIngredientSchema),
  topping_ingredients: z.array(ToppingIngredientSchema),
  drink_recipes: z.array(DrinkRecipeSchema),
  warm_meal_recipes: z.array(WarmMealRecipeSchema),
  gram_measuring_unit_id: z.number().nullable(),
  ml_measuring_unit_id: z.number().nullable(),
  scheibe_measuring_unit_id: z.number().nullable(),
  portion_measuring_unit_id: z.number().nullable(),
  tasse_measuring_unit_id: z.number().nullable(),
  schuss_measuring_unit_id: z.number().nullable(),
});
export type BreakfastCatalog = z.infer<typeof BreakfastCatalogSchema>;

// ============================================================================
// Leftovers schemas (request + response)
// ============================================================================

export const ToppingPortionInSchema = z.object({
  ingredient_id: z.number(),
  grams_per_person: z.number(),
});
export type ToppingPortionIn = z.infer<typeof ToppingPortionInSchema>;

export const BreakfastLeftoversInSchema = z.object({
  toppings: z.array(ToppingPortionInSchema),
  norm_portions: z.number().int(),
  days: z.number().int().default(1),
});
export type BreakfastLeftoversIn = z.infer<typeof BreakfastLeftoversInSchema>;

export const ToppingLeftoverOutSchema = z.object({
  ingredient_id: z.number(),
  ingredient_name: z.string(),
  total_needed_g: z.number(),
  package_size_g: z.number().nullable(),
  packages_needed: z.number().nullable(),
  leftover_g: z.number().nullable(),
  leftover_eur: z.number().nullable(),
  price_per_kg: z.number().nullable(),
});
export type ToppingLeftoverOut = z.infer<typeof ToppingLeftoverOutSchema>;

export const BreakfastLeftoversOutSchema = z.object({
  toppings: z.array(ToppingLeftoverOutSchema),
});
export type BreakfastLeftoversOut = z.infer<typeof BreakfastLeftoversOutSchema>;

// ============================================================================
// Wizard State  (client-side only, not persisted)
// ============================================================================

/** Intensity level for topping portions */
export type ToppingIntensity = 'knapp' | 'normal' | 'üppig';

/** One basis bread type with share (0–100%) */
export const BasisSelectionSchema = z.object({
  ingredientId: z.number(),
  name: z.string(),
  sharePercent: z.number().min(0).max(100),
  locked: z.boolean(),
  /** Scheibenwicht in g */
  sliceWeightG: z.number(),
  /** kcal/100g */
  energyKcal100g: z.number().nullable(),
});
export type BasisSelection = z.infer<typeof BasisSelectionSchema>;

/** One topping with share and intensity */
export const ToppingSelectionSchema = z.object({
  ingredientId: z.number(),
  name: z.string(),
  sharePercent: z.number().min(0).max(100),
  locked: z.boolean(),
  energyKcal100g: z.number().nullable(),
  pricePerKg: z.number().nullable(),
  portions: z.array(BreakfastPortionSchema),
});
export type ToppingSelection = z.infer<typeof ToppingSelectionSchema>;

/** Complete wizard state */
export const WizardStateSchema = z.object({
  /** Breakfast units per person */
  bePerPerson: z.number().min(1).max(10),
  basis: z.array(BasisSelectionSchema),
  toppings: z.array(ToppingSelectionSchema),
  globalIntensity: z.enum(['knapp', 'normal', 'üppig']),
  /** IDs of warm-dish recipes chosen in Extras step */
  warmDishRecipeIds: z.array(z.number()),
  /** Scaling factor for each warm-dish recipe */
  warmDishFactors: z.record(z.string(), z.number()),
  /** Names of warm-dish recipes for display */
  warmDishRecipeNames: z.record(z.string(), z.string()),
  /** Extra standalone ingredients (Gemüse etc.) — id → grams_per_person */
  extraIngredients: z.record(z.string(), z.number()),
  /** Names of extra ingredients for display */
  extraIngredientNames: z.record(z.string(), z.string()),
  /** IDs of drink recipes chosen in Getränke step */
  drinkRecipeIds: z.array(z.number()).default([]),
  /** Scaling factor for each drink recipe */
  drinkFactors: z.record(z.string(), z.number()).default({}),
  /** Names of drink recipes for display */
  drinkRecipeNames: z.record(z.string(), z.string()).default({}),
});
export type WizardState = z.infer<typeof WizardStateSchema>;

// ============================================================================
// WizardItemsResponse (from batch endpoint)
// ============================================================================

export const WizardItemsResponseSchema = z.object({
  meal_id: z.number(),
  items: z.array(MealItemSchema),
});
export type WizardItemsResponse = z.infer<typeof WizardItemsResponseSchema>;

/** Breakfast day tag */
export const BreakfastDaySchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  sort_order: z.number(),
  recipe_count: z.number().optional(),
});
export type BreakfastDay = z.infer<typeof BreakfastDaySchema>;

/** Default empty wizard state */
export function defaultWizardState(): WizardState {
  return {
    bePerPerson: 4,
    basis: [],
    toppings: [],
    globalIntensity: 'normal',
    warmDishRecipeIds: [],
    warmDishFactors: {},
    warmDishRecipeNames: {},
    extraIngredients: {},
    extraIngredientNames: {},
    drinkRecipeIds: [],
    drinkFactors: {},
    drinkRecipeNames: {},
  };
}
