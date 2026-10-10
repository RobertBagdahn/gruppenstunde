import type { MealItem } from '@/schemas/mealPlan';
export interface BreakfastSummary {
  totalKcalPerPerson: number;
  totalCostPerPerson: number;
  itemsCount: number;
  previewNames: string[];
  hasAllergens: boolean;
}

/**
 * Calculates summary metrics for a breakfast or multi-item meal.
 */
export function getBreakfastSummary(items: MealItem[], effPortions: number): BreakfastSummary {
  const activeItems = items.filter((it) => it.factor >= 0.01);
  const totalKcal = activeItems.reduce((acc, it) => acc + (it.energy_kcal ?? 0), 0);
  const totalCost = activeItems.reduce((acc, it) => acc + (it.cost_eur ?? 0), 0);

  const previewNames = activeItems
    .map((it) => it.recipe_title || it.ingredient_name || it.display_name || '')
    .filter(Boolean)
    .slice(0, 4);

  return {
    totalKcalPerPerson: effPortions > 0 ? Math.round(totalKcal / effPortions) : 0,
    totalCostPerPerson: effPortions > 0 ? totalCost / effPortions : 0,
    itemsCount: activeItems.length,
    previewNames,
    hasAllergens: false,
  };
}
