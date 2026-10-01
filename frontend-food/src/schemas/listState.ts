import { z } from 'zod';
import { RecipeFilterSchema, RECIPE_SORT_OPTIONS } from '@/schemas/recipe';
import { MEALPLAN_ORIGIN_OPTIONS, MEALPLAN_SORT_OPTIONS } from '@/schemas/mealPlan';
import { IngredientStatusSchema } from '@/schemas/supply';
import { RECIPE_COST_RANGE_VALUES } from '@/lib/recipeCostRanges';

/**
 * Persisted list state per list page.
 *
 * Every field is optional and falls back to `undefined` when invalid, so one
 * outdated value (e.g. a removed sort option) only drops that field.
 */
function lenient<T extends z.ZodRawShape>(shape: T) {
  const entries = Object.entries(shape).map(([key, field]) => [key, field.optional().catch(undefined)]);
  return z.object(Object.fromEntries(entries) as { [K in keyof T]: z.ZodCatch<z.ZodOptional<T[K]>> });
}

function values<T extends readonly { value: string }[]>(options: T): [T[number]['value'], ...T[number]['value'][]] {
  return options.map((option) => option.value) as [T[number]['value'], ...T[number]['value'][]];
}

const recipeFilterFields = RecipeFilterSchema.pick({
  q: true,
  recipe_type: true,
  preparation_method: true,
  difficulty: true,
  execution_time: true,
  origin: true,
  tag_slugs: true,
}).shape;

export const RecipeListStateSchema = lenient({
  q: recipeFilterFields.q.unwrap(),
  recipe_type: recipeFilterFields.recipe_type.unwrap(),
  preparation_method: recipeFilterFields.preparation_method.unwrap(),
  difficulty: recipeFilterFields.difficulty.unwrap(),
  execution_time: recipeFilterFields.execution_time.unwrap(),
  origin: recipeFilterFields.origin.unwrap(),
  tag_slugs: recipeFilterFields.tag_slugs.unwrap(),
  // Selected price ranges; the API bounds are derived from them.
  cost: z.array(z.enum(RECIPE_COST_RANGE_VALUES)),
  sort: z.enum(values(RECIPE_SORT_OPTIONS)),
  // Seed of the random order, so all pages of one shuffle belong together.
  seed: z.coerce.number().int().min(1).max(2_147_483_647),
  view: z.enum(['grid', 'table']),
  page: z.coerce.number().int().min(1),
});

export const INGREDIENT_SORT_VALUES = ['newest', 'oldest', 'name_asc', 'name_desc'] as const;

export const IngredientListStateSchema = lenient({
  name: z.string(),
  retail_section: z.coerce.number().int().positive(),
  status: IngredientStatusSchema,
  origin: z.enum(['mine']),
  sort: z.enum(INGREDIENT_SORT_VALUES),
  page: z.coerce.number().int().min(1),
});

export const MealPlanListStateSchema = lenient({
  q: z.string(),
  origin: z.enum(values(MEALPLAN_ORIGIN_OPTIONS)),
  sort: z.enum(values(MEALPLAN_SORT_OPTIONS)),
});

export const SHOPPING_SORT_VALUES = ['newest', 'oldest', 'name_asc'] as const;

export const ShoppingListStateSchema = lenient({
  q: z.string(),
  sort: z.enum(SHOPPING_SORT_VALUES),
  mine: z.enum(['1']),
  page: z.coerce.number().int().min(1),
});

export const IngredientStatsStateSchema = lenient({
  retail_section: z.string().regex(/^\d+$/),
  tag: z.string(),
});

export const DATA_QUALITY_TABS = ['price', 'duplicates', 'completeness', 'missing', 'plausibility'] as const;

export const DataQualityIngredientsStateSchema = lenient({
  tab: z.enum(DATA_QUALITY_TABS),
});

export const MealPlanDetailStateSchema = lenient({
  view: z.enum(['cards', 'table']),
});
