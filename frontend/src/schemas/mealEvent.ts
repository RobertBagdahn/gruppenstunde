/**
 * Zod schemas for MealEvent API.
 * MUST stay in sync with backend/planner/schemas.py (MealEvent section)
 */
import { z } from 'zod';

// ==========================================================================
// MealItem
// ==========================================================================

export const MealItemSchema = z.object({
  id: z.number(),
  recipe_id: z.number(),
  recipe_title: z.string(),
  recipe_slug: z.string(),
  recipe_image: z.string().nullable(),
  factor: z.number(),
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
  items: z.array(MealItemSchema),
});
export type Meal = z.infer<typeof MealSchema>;

// ==========================================================================
// MealEvent (list item)
// ==========================================================================

export const MealEventSchema = z.object({
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
export type MealEvent = z.infer<typeof MealEventSchema>;

// ==========================================================================
// MealEvent Detail (with nested meals/items)
// ==========================================================================

export const MealEventDetailSchema = z.object({
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
export type MealEventDetail = z.infer<typeof MealEventDetailSchema>;

// ==========================================================================
// Nutrition Summary
// ==========================================================================

export const NutritionSummarySchema = z.object({
  energy_kj: z.number(),
  protein_g: z.number(),
  fat_g: z.number(),
  carbohydrate_g: z.number(),
  sugar_g: z.number(),
  fibre_g: z.number(),
  salt_g: z.number(),
});
export type NutritionSummary = z.infer<typeof NutritionSummarySchema>;

// ==========================================================================
// Shopping List Item
// ==========================================================================

export const ShoppingListItemSchema = z.object({
  ingredient_name: z.string(),
  total_quantity_g: z.number(),
  unit: z.string(),
  retail_section: z.string(),
  estimated_price_eur: z.number().nullable(),
});
export type ShoppingListItem = z.infer<typeof ShoppingListItemSchema>;

// ==========================================================================
// Recipe Search Result
// ==========================================================================

export const RecipeSearchResultSchema = z.object({
  id: z.number(),
  title: z.string(),
  slug: z.string(),
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

/** @deprecated Use MealEventSchema */
export const MealPlanSchema = MealEventSchema;
/** @deprecated Use MealEvent */
export type MealPlan = MealEvent;
/** @deprecated Use MealEventDetailSchema */
export const MealPlanDetailSchema = MealEventDetailSchema;
/** @deprecated Use MealEventDetail */
export type MealPlanDetail = MealEventDetail;
