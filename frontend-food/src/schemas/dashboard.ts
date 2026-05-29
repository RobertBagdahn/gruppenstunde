/**
 * Zod schema for the Food Dashboard API.
 * MUST stay in sync with backend/recipe/schemas/dashboard.py
 */
import { z } from 'zod';

export const RecipeInsightSchema = z.object({
  title: z.string(),
  slug: z.string(),
  plan_count: z.number().nullable().optional(),
});
export type RecipeInsight = z.infer<typeof RecipeInsightSchema>;

export const DashboardInsightsSchema = z.object({
  most_planned_recipe: RecipeInsightSchema.nullable(),
  avg_ingredients_per_recipe: z.number(),
  newest_recipe: RecipeInsightSchema.nullable(),
  total_meal_days_planned: z.number(),
});
export type DashboardInsights = z.infer<typeof DashboardInsightsSchema>;

export const FoodDashboardSchema = z.object({
  recipe_count: z.number(),
  ingredient_count: z.number(),
  meal_plan_count: z.number(),
  shopping_list_count: z.number(),
  insights: DashboardInsightsSchema,
});
export type FoodDashboard = z.infer<typeof FoodDashboardSchema>;
