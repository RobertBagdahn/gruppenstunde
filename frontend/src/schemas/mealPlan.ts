/**
 * Zod schemas for MealPlan API.
 * MUST stay in sync with backend/planner/schemas.py (MealPlan section)
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
// Meal
// ==========================================================================

export const MealSchema = z.object({
  id: z.number(),
  meal_type: z.string(),
  time_start: z.string().nullable(),
  time_end: z.string().nullable(),
  day_part_factor: z.number(),
  items: z.array(MealItemSchema),
});
export type Meal = z.infer<typeof MealSchema>;

// ==========================================================================
// MealDay
// ==========================================================================

export const MealDaySchema = z.object({
  id: z.number(),
  date: z.string(),
  meals: z.array(MealSchema),
});
export type MealDay = z.infer<typeof MealDaySchema>;

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
  days_count: z.number(),
});
export type MealPlan = z.infer<typeof MealPlanSchema>;

// ==========================================================================
// MealPlan Detail (with nested days/meals/items)
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
  days: z.array(MealDaySchema),
  can_edit: z.boolean(),
});
export type MealPlanDetail = z.infer<typeof MealPlanDetailSchema>;

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
