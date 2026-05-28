/**
 * BACKWARD COMPATIBILITY: Re-exports from mealPlan.ts.
 * @deprecated Import from '@/schemas/mealPlan' instead.
 */
export {
  MealItemSchema,
  type MealItem,
  MealSchema,
  type Meal,
  MealPlanSchema,
  MealPlanSchema as MealEventSchema,
  type MealPlan,
  type MealPlan as MealEvent,
  MealPlanDetailSchema,
  MealPlanDetailSchema as MealEventDetailSchema,
  type MealPlanDetail,
  type MealPlanDetail as MealEventDetail,
  NutritionSummarySchema,
  type NutritionSummary,
  ShoppingListItemSchema,
  type ShoppingListItem,
  RecipeSearchResultSchema,
  type RecipeSearchResult,
  MEAL_TYPE_LABELS,
  MEAL_TYPE_ICONS,
} from './mealPlan';
