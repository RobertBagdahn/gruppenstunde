/**
 * BACKWARD COMPATIBILITY: Re-exports from mealPlans.ts.
 * @deprecated Import from '@/api/mealPlans' instead.
 */
export {
  useMealPlans,
  useMealPlans as useMealEvents,
  useMealPlan,
  useMealPlan as useMealEvent,
  useCreateMealPlan,
  useCreateMealPlan as useCreateMealEvent,
  useUpdateMealPlan,
  useUpdateMealPlan as useUpdateMealEvent,
  useDeleteMealPlan,
  useDeleteMealPlan as useDeleteMealEvent,
  useAddDay,
  useRemoveDay,
  useAddMeal,
  useRemoveMeal,
  useAddMealItem,
  useRemoveMealItem,
  useNutritionSummary,
  useShoppingList,
  useRecipeSearch,
} from './mealPlans';
