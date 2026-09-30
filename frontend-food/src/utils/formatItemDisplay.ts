import type { MealItem } from '@/schemas/mealPlan';
import { formatWeight } from '@/lib/format';

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
 * fall through to the empty string).
 */
export function formatItemPortion(item: MealItem): string {
  const perPersonSuffix = item.is_per_norm_person ? ' / P.' : '';

  if (item.quantity != null && item.quantity > 0 && item.portion_name) {
    // A chosen portion defines what the quantity counts: "1 Scheibe / P. (30 g)".
    const weight = item.quantity_g != null && item.quantity_g > 0 ? ` (${formatWeight(item.quantity_g)})` : '';
    return `${formatQuantityNumber(item.quantity)} ${item.portion_name}${perPersonSuffix}${weight}`;
  }

  if (item.quantity != null && item.quantity > 0) {
    const qtyStr = formatQuantityNumber(item.quantity);
    const unit = item.measuring_unit_name && item.measuring_unit_name.toLowerCase() !== 'stück'
      ? ` ${item.measuring_unit_name}`
      : '';
    const weightStr = item.quantity_g != null && item.measuring_unit_name?.toLowerCase() !== 'gramm' && item.measuring_unit_name?.toLowerCase() !== 'g'
      ? ` (${Math.round(item.quantity_g)}g)`
      : '';
    return `${qtyStr}${unit}${weightStr}${perPersonSuffix}`;
  }

  if (item.quantity_g != null && item.quantity_g > 0) {
    return `${Math.round(item.quantity_g)} g${perPersonSuffix}`;
  }

  return '';
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
