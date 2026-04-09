/**
 * BACKWARD COMPATIBILITY: Re-exports from mealEvents.ts.
 * @deprecated Import from '@/api/mealEvents' instead.
 */
export {
  useMealEvents,
  useMealEvents as useMealPlans,
  useMealEvent,
  useMealEvent as useMealPlan,
  useCreateMealEvent,
  useCreateMealEvent as useCreateMealPlan,
  useUpdateMealEvent,
  useUpdateMealEvent as useUpdateMealPlan,
  useDeleteMealEvent,
  useDeleteMealEvent as useDeleteMealPlan,
  useAddDay,
  useRemoveDay,
  useAddMeal,
  useRemoveMeal,
  useAddMealItem,
  useRemoveMealItem,
  useNutritionSummary,
  useShoppingList,
  useRecipeSearch,
} from './mealEvents';
