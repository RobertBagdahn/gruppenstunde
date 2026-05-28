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
  overrides: z.array(MealItemOverrideSchema),
});
export type MealItem = z.infer<typeof MealItemSchema>;

// ==========================================================================
// Meal (with start_datetime / end_datetime)
// ==========================================================================

export const MealSchema = z.object({
  id: z.number(),
  start_datetime: z.string(),
  end_datetime: z.string(),
  meal_type: z.string(),
  day_part_factor: z.number(),
  override_portions: z.number().nullable(),
  note: z.string(),
  note_is_published: z.boolean(),
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
  event_id: z.number().nullable(),
  event_name: z.string(),
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
  event_id: z.number().nullable(),
  event_name: z.string(),
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
  natural_portions: z.string().default(''),
  sources: z.array(ShoppingItemSourceSchema).default([]),
});
export type ShoppingListItem = z.infer<typeof ShoppingListItemSchema>;

// ==========================================================================
// Recipe Search Result
// ==========================================================================

export const RecipeSearchResultSchema = z.object({
  id: z.number(),
  title: z.string(),
  slug: z.string(),
  recipe_type: z.string(),
});
export type RecipeSearchResult = z.infer<typeof RecipeSearchResultSchema>;

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
