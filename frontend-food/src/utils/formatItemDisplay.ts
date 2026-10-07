import type { MealItem } from '@/schemas/mealPlan';
import { formatMealItemAmount } from '@/lib/ingredientAmount';

/**
 * Formats a number with comma as decimal separator, max 2 decimals.
 */
export function formatQuantityNumber(value: number): string {
  if (Number.isInteger(value)) {
    return value.toString();
  }
  const fixed = value.toFixed(2).replace(/\.?0+$/, '');
  return fixed.replace('.', ',');
}

/**
 * Generates a clean portion label for an ingredient or meal item from its
 * structured quantity fields (recipe items have no per-portion quantity and
 * fall through to the empty string). Shares its amount logic with the recipe views.
 */
export function formatItemPortion(item: MealItem): string {
  const { primary, secondary } = formatMealItemAmount(item);
  if (primary === '—') return '';
  const perPersonSuffix = item.is_per_norm_person ? ' / P.' : '';
  return `${primary}${perPersonSuffix}${secondary ? ` (${secondary})` : ''}`;
}

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
