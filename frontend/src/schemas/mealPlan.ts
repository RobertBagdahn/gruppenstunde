/**
 * BACKWARD COMPATIBILITY: Re-exports from mealEvent.ts.
 * @deprecated Import from '@/schemas/mealEvent' instead.
 */
export {
  MealItemSchema,
  type MealItem,
  MealSchema,
  type Meal,
  MealEventSchema,
  MealEventSchema as MealPlanSchema,
  type MealEvent,
  type MealEvent as MealPlan,
  MealEventDetailSchema,
  MealEventDetailSchema as MealPlanDetailSchema,
  type MealEventDetail,
  type MealEventDetail as MealPlanDetail,
  NutritionSummarySchema,
  type NutritionSummary,
  ShoppingListItemSchema,
  type ShoppingListItem,
  RecipeSearchResultSchema,
  type RecipeSearchResult,
  MEAL_TYPE_LABELS,
  MEAL_TYPE_ICONS,
} from './mealEvent';
