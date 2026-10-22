// @vitest-environment node
/**
 * The mocked API answers of the UI baselines (`e2e/fixtures/ui/*.json`, food-ui-quality-gates)
 * must stay valid against the schemas the app parses them with. A schema change that breaks a
 * fixture fails here instead of silently turning a baseline page into an error screen.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { aiQuotaSchema } from '@/schemas/ai';
import { FoodDashboardSchema } from '@/schemas/dashboard';
import {
  MealPlanDetailSchema,
  MealPlanSchema,
  NutritionalTagScanResponseSchema,
  PlanCheckResponseSchema,
  RecentlyUsedResponseSchema,
  UnifiedSearchResponseSchema,
} from '@/schemas/mealPlan';
import {
  NutriScoreDetailSchema,
  PaginatedRecipesSchema,
  RecipeDetailSchema,
  RecipeNutritionBreakdownSchema,
  RecipeRulesSchema,
} from '@/schemas/recipe';
import {
  PaginatedShoppingListsSchema,
  ShoppingListDetailSchema,
  ShoppingListWarningsSchema,
} from '@/schemas/shoppingList';
import {
  AvailableConversionBatchSchema,
  IngredientDetailSchema,
  RankingsOutSchema,
} from '@/schemas/supply';
import { OffensiveSummarySchema } from '@/schemas/dataOffensive';

const FIXTURE_DIR = new URL('../../../e2e/fixtures/ui/', import.meta.url);

function load(name: string): unknown {
  return JSON.parse(readFileSync(new URL(`${name}.json`, FIXTURE_DIR), 'utf-8'));
}

const CASES: [string, z.ZodTypeAny][] = [
  ['ai-quota', aiQuotaSchema],
  ['dashboard', FoodDashboardSchema],
  ['recipes-page', PaginatedRecipesSchema],
  ['recipe-detail', RecipeDetailSchema],
  ['meal-plans', z.array(MealPlanSchema)],
  ['meal-plan-detail', MealPlanDetailSchema],
  ['shopping-list-detail', ShoppingListDetailSchema],
  ['shopping-list-warnings', ShoppingListWarningsSchema],
  ['shopping-lists-page', PaginatedShoppingListsSchema],
  ['ingredient-detail', IngredientDetailSchema],
  ['recipe-rules', RecipeRulesSchema],
  ['recipe-nutri-score', NutriScoreDetailSchema],
  ['recipe-nutrition-breakdown', RecipeNutritionBreakdownSchema],
  ['plan-check', PlanCheckResponseSchema],
  ['ingredient-scan', NutritionalTagScanResponseSchema],
  ['recently-used', RecentlyUsedResponseSchema],
  ['unified-search', UnifiedSearchResponseSchema],
  ['conversion-batch', AvailableConversionBatchSchema],
  ['rankings', RankingsOutSchema],
  ['offensive-summary', OffensiveSummarySchema],
];

describe('UI baseline fixtures', () => {
  it.each(CASES)('%s matches its Zod schema', (name, schema) => {
    const result = schema.safeParse(load(name));
    expect(result.success, result.success ? '' : JSON.stringify(result.error.issues.slice(0, 3))).toBe(true);
  });
});
