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

export const FatIngredientSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  is_standalone_food: z.boolean(),
  energy_kcal: z.number().nullable(),
  price_per_kg: z.number().nullable(),
  portions: z.array(BreakfastPortionSchema),
});
export type FatIngredient = z.infer<typeof FatIngredientSchema>;

export const DrinkRecipeSchema = z.object({
  id: z.number(),
  title: z.string(),
  recipe_type: z.string(),
  cached_energy_total_kcal: z.number().nullable(),
  cached_weight_g: z.number().nullable(),
});
export type DrinkRecipe = z.infer<typeof DrinkRecipeSchema>;

export const DrinkIngredientSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  is_standalone_food: z.boolean(),
  energy_kcal: z.number().nullable(),
  price_per_kg: z.number().nullable(),
  portions: z.array(BreakfastPortionSchema),
});
export type DrinkIngredient = z.infer<typeof DrinkIngredientSchema>;

export const WarmMealRecipeSchema = z.object({
  id: z.number(),
  title: z.string(),
  recipe_type: z.string(),
  cached_energy_total_kcal: z.number().nullable(),
  cached_weight_g: z.number().nullable(),
});
export type WarmMealRecipe = z.infer<typeof WarmMealRecipeSchema>;

export const BreakfastCatalogSchema = z.object({
  base_ingredients: z.array(BaseIngredientSchema),
  topping_ingredients: z.array(ToppingIngredientSchema),
  fat_ingredients: z.array(FatIngredientSchema),
  drink_ingredients: z.array(DrinkIngredientSchema),
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

/** One fat/spread with share (0–100%) for the Streichfett step */
export const FatSelectionSchema = z.object({
  ingredientId: z.number(),
  name: z.string(),
  sharePercent: z.number().min(0).max(100),
  locked: z.boolean(),
  energyKcal100g: z.number().nullable(),
  pricePerKg: z.number().nullable(),
  portions: z.array(BreakfastPortionSchema),
});
export type FatSelection = z.infer<typeof FatSelectionSchema>;

/** One drink recipe with share (0–100%) for the Getränke step */
export const DrinkRecipeSelectionSchema = z.object({
  recipeId: z.number(),
  name: z.string(),
  sharePercent: z.number().min(0).max(100),
  locked: z.boolean(),
  energyKcal: z.number().nullable(),
});
export type DrinkRecipeSelection = z.infer<typeof DrinkRecipeSelectionSchema>;

/** One drink ingredient (Milch, Saft) with share (0–100%) */
export const DrinkIngredientSelectionSchema = z.object({
  ingredientId: z.number(),
  name: z.string(),
  sharePercent: z.number().min(0).max(100),
  locked: z.boolean(),
  mlPerPerson: z.number().nullable(),
});
export type DrinkIngredientSelection = z.infer<typeof DrinkIngredientSelectionSchema>;

/** Complete wizard state */
export const WizardStateSchema = z.object({
  /** Grams of bread per person */
  gramsPerPerson: z.number().min(50).max(300),
  basis: z.array(BasisSelectionSchema),
  fatSelections: z.array(FatSelectionSchema),
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
  /** Drink recipes with share distribution */
  drinkRecipes: z.array(DrinkRecipeSelectionSchema).default([]),
  /** Drink ingredients (Milch, Saft) with share distribution */
  drinkIngredients: z.array(DrinkIngredientSelectionSchema).default([]),
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
    gramsPerPerson: 150,
    basis: [],
    fatSelections: [],
    toppings: [],
    globalIntensity: 'normal',
    warmDishRecipeIds: [],
    warmDishFactors: {},
    warmDishRecipeNames: {},
    extraIngredients: {},
    extraIngredientNames: {},
    drinkRecipes: [],
    drinkIngredients: [],
  };
}
