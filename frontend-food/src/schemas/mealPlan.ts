/**
 * Zod schemas for MealPlan API.
 * MUST stay in sync with backend/planner/schemas.py (MealPlan section)
 */
import { z } from 'zod';

// ==========================================================================
// MealItem Override
// ==========================================================================

export const MealItemOverrideSchema = z.object({
  id: z.number(),
  recipe_item_id: z.number(),
  quantity_override: z.number().nullable(),
  excluded: z.boolean(),
});
export type MealItemOverride = z.infer<typeof MealItemOverrideSchema>;

// ==========================================================================
// MealItem
// ==========================================================================

export const MealItemSchema = z.object({
  id: z.number(),
  recipe_id: z.number().nullable(),
  recipe_title: z.string(),
  recipe_slug: z.string(),
  recipe_image: z.string().nullable(),
  ingredient_id: z.number().nullable(),
  ingredient_name: z.string(),
  quantity: z.number().nullable(),
  measuring_unit_id: z.number().nullable(),
  measuring_unit_name: z.string(),
  display_name: z.string().nullable(),
  factor: z.number(),
  energy_kj: z.number().nullable(),
  cost_eur: z.number().nullable(),
  overrides: z.array(MealItemOverrideSchema),
});
export type MealItem = z.infer<typeof MealItemSchema>;

// ==========================================================================
// Meal (with start_datetime / end_datetime)
// ==========================================================================

export const MealSchema = z.object({
  id: z.number(),
  start_datetime: z.string().nullable(),
  end_datetime: z.string().nullable(),
  meal_type: z.string(),
  day_part_factor: z.number(),
  override_portions: z.number().nullable(),
  note: z.string(),
  note_is_published: z.boolean(),
  is_reference: z.boolean(),
  ref_meal_id: z.number().nullable(),
  is_synced: z.boolean(),
  total_energy_kj: z.number(),
  total_cost_eur: z.number(),
  items: z.array(MealItemSchema),
});
export type Meal = z.infer<typeof MealSchema>;

// ==========================================================================
// MealPlan (list item)
// ==========================================================================

export const MealPlanSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  description: z.string(),
  norm_portions: z.number(),
  activity_factor: z.number(),
  reserve_factor: z.number(),
  budget_per_person_per_day: z.number().nullable(),
  event_id: z.number().nullable(),
  event_name: z.string(),
  start_datetime: z.string().nullable(),
  end_datetime: z.string().nullable(),
  created_by_id: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
  meals_count: z.number(),
});
export type MealPlan = z.infer<typeof MealPlanSchema>;

// ==========================================================================
// MealPlan Detail (with nested meals/items)
// ==========================================================================

export const MealPlanDetailSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  description: z.string(),
  norm_portions: z.number(),
  activity_factor: z.number(),
  reserve_factor: z.number(),
  budget_per_person_per_day: z.number().nullable(),
  event_id: z.number().nullable(),
  event_name: z.string(),
  start_datetime: z.string().nullable(),
  end_datetime: z.string().nullable(),
  created_by_id: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
  meals: z.array(MealSchema),
  can_edit: z.boolean(),
});
export type MealPlanDetail = z.infer<typeof MealPlanDetailSchema>;

// ==========================================================================
// Nutrition Summary
// ==========================================================================

export const NutritionSummarySchema = z.object({
  // Total values (entire MealPlan)
  energy_kj: z.number(),
  protein_g: z.number(),
  fat_g: z.number(),
  carbohydrate_g: z.number(),
  sugar_g: z.number(),
  fibre_g: z.number(),
  salt_g: z.number(),

  // Per Normportion values (total / norm_portions)
  per_portion_energy_kj: z.number(),
  per_portion_protein_g: z.number(),
  per_portion_fat_g: z.number(),
  per_portion_carbohydrate_g: z.number(),
  per_portion_sugar_g: z.number(),
  per_portion_fibre_g: z.number(),
  per_portion_salt_g: z.number(),

  // Scaling metadata
  norm_portions: z.number(),
  activity_factor: z.number(),
  reserve_factor: z.number(),
  scaling_factor: z.number(),
});
export type NutritionSummary = z.infer<typeof NutritionSummarySchema>;

// ==========================================================================
// Shopping List Item
// ==========================================================================

export const ShoppingItemSourceSchema = z.object({
  recipe_id: z.number(),
  recipe_name: z.string().default(''),
  recipe_slug: z.string().default(''),
  meal_label: z.string().default(''),
  quantity_g: z.number().default(0),
});

export const ShoppingListItemSchema = z.object({
  ingredient_name: z.string(),
  ingredient_slug: z.string().default(''),
  total_quantity_g: z.number(),
  unit: z.string(),
  retail_section: z.string(),
  estimated_price_eur: z.number().nullable(),
  display_quantity: z.string().default(''),
  display_text: z.string().default(''),
  natural_portions: z.string().default(''),
  sources: z.array(ShoppingItemSourceSchema).default([]),
});
export type ShoppingListItem = z.infer<typeof ShoppingListItemSchema>;

// ==========================================================================
// Recipe Search Result (with preview fields)
// ==========================================================================

export const NutritionalTagSchema = z.object({
  id: z.number(),
  name: z.string(),
});
export type NutritionalTag = z.infer<typeof NutritionalTagSchema>;

export const RecipeSearchResultSchema = z.object({
  id: z.number(),
  title: z.string(),
  slug: z.string(),
  recipe_type: z.string(),
  image: z.string().nullable().optional(),
  servings: z.number().nullable().optional(),
  cached_energy_kj: z.number().nullable().optional(),
  cached_protein_g: z.number().nullable().optional(),
  cached_fat_g: z.number().nullable().optional(),
  cached_carbohydrate_g: z.number().nullable().optional(),
  cached_price_total: z.number().nullable().optional(),
  cached_nutri_class: z.number().nullable().optional(),
  nutritional_tags: z.array(NutritionalTagSchema).optional(),
  usage_count: z.number().optional(),
  description: z.string().nullable().optional(),
  ingredients_preview: z.array(z.string()).optional(),
});
export type RecipeSearchResult = z.infer<typeof RecipeSearchResultSchema>;

// ==========================================================================
// Popular Recipes
// ==========================================================================

export const RecipePopularItemSchema = z.object({
  id: z.number(),
  title: z.string(),
  recipe_type: z.string(),
  image: z.string().nullable(),
  usage_count: z.number(),
});
export type RecipePopularItem = z.infer<typeof RecipePopularItemSchema>;

export const RecipePopularResponseSchema = z.object({
  personal: z.array(RecipePopularItemSchema),
  community: z.array(RecipePopularItemSchema),
});
export type RecipePopularResponse = z.infer<typeof RecipePopularResponseSchema>;

// ==========================================================================
// Recipe Suggestions
// ==========================================================================

export const RecipeSuggestionSchema = z.object({
  id: z.number(),
  title: z.string(),
  usage_count: z.number(),
  image_thumbnail: z.string().nullable(),
});
export type RecipeSuggestion = z.infer<typeof RecipeSuggestionSchema>;

export const RecipeSuggestionsResponseSchema = z.array(RecipeSuggestionSchema);
export type RecipeSuggestionsResponse = z.infer<typeof RecipeSuggestionsResponseSchema>;

export const IngredientPortionSchema = z.object({
  id: z.number(),
  name: z.string(),
  measuring_unit: z.string().nullable(),
  measuring_unit_id: z.number().nullable(),
  quantity: z.number().nullable(),
  weight_g: z.number().nullable(),
});
export type IngredientPortion = z.infer<typeof IngredientPortionSchema>;

export const IngredientSearchResultSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  standalone_type: z.string().nullable(),
  portions: z.array(IngredientPortionSchema),
});
export type IngredientSearchResult = z.infer<typeof IngredientSearchResultSchema>;

export const UnifiedSearchResponseSchema = z.object({
  recipes: z.array(RecipeSearchResultSchema),
  ingredients: z.array(IngredientSearchResultSchema),
});
export type UnifiedSearchResponse = z.infer<typeof UnifiedSearchResponseSchema>;

// ==========================================================================
// Meal Type Labels (German)
// ==========================================================================

export const MEAL_TYPE_LABELS: Record<string, string> = {
  breakfast: 'Frühstück',
  lunch: 'Mittagessen',
  dinner: 'Abendessen',
  snack: 'Snack',
  dessert: 'Dessert',
};

export const MEAL_TYPE_ICONS: Record<string, string> = {
  breakfast: 'bakery_dining',
  lunch: 'restaurant',
  dinner: 'dinner_dining',
  snack: 'cookie',
  dessert: 'cake',
};

export const MEAL_TYPE_COLORS: Record<string, { text: string; bg: string; border: string }> = {
  breakfast: { text: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-300' },
  lunch: { text: 'text-cyan-600', bg: 'bg-cyan-50', border: 'border-cyan-300' },
  dinner: { text: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-300' },
  snack: { text: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-300' },
  dessert: { text: 'text-pink-600', bg: 'bg-pink-50', border: 'border-pink-300' },
};

export type CoverageStatus = 'good' | 'warning' | 'critical';

/** Calculate how well a meal covers its expected calorie share. */
export function getCoverageStatus(
  totalEnergyKj: number,
  dayPartFactor: number,
  activityFactor: number,
): { percent: number; status: CoverageStatus } {
  // Base daily need: 2000 kcal = 8368 kJ, scaled by activity factor
  const dailyTargetKj = 8368 * activityFactor;
  const expectedKj = dailyTargetKj * dayPartFactor;
  if (expectedKj <= 0) return { percent: 0, status: 'critical' };
  const percent = Math.round((totalEnergyKj / expectedKj) * 100);
  let status: CoverageStatus = 'good';
  if (percent < 50 || percent > 150) status = 'critical';
  else if (percent < 80 || percent > 120) status = 'warning';
  return { percent, status };
}

// ==========================================================================
// Backward compatibility re-exports
// ==========================================================================

// ==========================================================================
// Cost Summary
// ==========================================================================

export const MealCostSchema = z.object({
  meal_id: z.number(),
  meal_type: z.string(),
  date: z.string(),
  cost: z.coerce.number(),
  cost_per_person: z.coerce.number(),
});
export type MealCost = z.infer<typeof MealCostSchema>;

export const DayCostSchema = z.object({
  date: z.string(),
  total_cost: z.coerce.number(),
  cost_per_person: z.coerce.number(),
  meals: z.array(MealCostSchema),
});
export type DayCost = z.infer<typeof DayCostSchema>;

export const RecipeCostSchema = z.object({
  recipe_id: z.number(),
  recipe_title: z.string(),
  recipe_slug: z.string(),
  total_cost: z.coerce.number(),
  cost_per_person: z.coerce.number(),
  priced_ingredients: z.number().default(0),
  total_ingredients: z.number().default(0),
});
export type RecipeCost = z.infer<typeof RecipeCostSchema>;

export const MealPlanCostSummarySchema = z.object({
  total_cost: z.coerce.number(),
  cost_per_person: z.coerce.number(),
  norm_portions: z.number(),
  total_ingredients: z.number(),
  priced_ingredients: z.number(),
  days: z.array(DayCostSchema),
  recipes: z.array(RecipeCostSchema),
});
export type MealPlanCostSummary = z.infer<typeof MealPlanCostSummarySchema>;

// ==========================================================================
// MealPlan Duplicate Input
// ==========================================================================

export const MealPlanDuplicateInSchema = z.object({
  name: z.string().min(1),
  start_datetime: z.string().min(1),
  norm_portions: z.number().int().min(1),
});
export type MealPlanDuplicateIn = z.infer<typeof MealPlanDuplicateInSchema>;

// ==========================================================================
// RefMeal (Reference Meal)
// ==========================================================================

export const RefMealSchema = z.object({
  id: z.number(),
  meal_type: z.string(),
  day_part_factor: z.number(),
  items: z.array(MealItemSchema),
  synced_meals_count: z.number(),
  total_meals_count: z.number(),
});
export type RefMeal = z.infer<typeof RefMealSchema>;

export const RefMealCreateInSchema = z.object({
  meal_type: z.string(),
  day_part_factor: z.number().optional(),
});
export type RefMealCreateIn = z.infer<typeof RefMealCreateInSchema>;

export const RefMealItemInSchema = z.object({
  recipe_id: z.number().nullable().optional(),
  ingredient_id: z.number().nullable().optional(),
  quantity: z.number().nullable().optional(),
  measuring_unit_id: z.number().nullable().optional(),
  display_name: z.string().nullable().optional(),
  factor: z.number().default(1.0),
});
export type RefMealItemIn = z.infer<typeof RefMealItemInSchema>;

export const RefMealUpdateInSchema = z.object({
  day_part_factor: z.number().optional(),
  items: z.array(RefMealItemInSchema).optional(),
});
export type RefMealUpdateIn = z.infer<typeof RefMealUpdateInSchema>;

export const LinkMealInSchema = z.object({
  ref_meal_id: z.number(),
});
export type LinkMealIn = z.infer<typeof LinkMealInSchema>;

// ==========================================================================
// Backward compatibility re-exports
// ==========================================================================

/** @deprecated Use MealPlanSchema */
export const MealEventSchema = MealPlanSchema;
/** @deprecated Use MealPlan */
export type MealEvent = MealPlan;
/** @deprecated Use MealPlanDetailSchema */
export const MealEventDetailSchema = MealPlanDetailSchema;
/** @deprecated Use MealPlanDetail */
export type MealEventDetail = MealPlanDetail;
