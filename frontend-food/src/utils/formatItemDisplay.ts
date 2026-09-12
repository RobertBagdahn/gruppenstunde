import type { MealItem } from '@/schemas/mealPlan';

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
 * Generates a clean portion label for an ingredient or meal item.
 * Strips the repeated ingredient name from `portion_display` to prevent
 * squashing and duplication in item cards.
 */
export function formatItemPortion(item: MealItem): string {
  const perPersonSuffix = item.is_per_norm_person ? ' / P.' : '';

  if (item.portion_display) {
    let clean = item.portion_display;

    // Remove the ingredient name if it's contained inside the portion display
    if (item.ingredient_name) {
      // Escape regex special chars in ingredient name
      const escaped = item.ingredient_name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\s*${escaped}\\s*`, 'gi');
      clean = clean.replace(regex, ' ').trim();
    }

    // Simplify "Gramm (Xg)" or "g (Xg)"
    clean = clean.replace(/\bGramm\b/gi, 'g');
    clean = clean.replace(/\s+/g, ' ').trim();

    // If clean is empty or just parentheses, fall back to weight
    if (!clean || clean === '()' || clean === '(g)') {
      if (item.quantity_g != null) {
        return `${Math.round(item.quantity_g)} g${perPersonSuffix}`;
      }
      return perPersonSuffix.trim();
    }

    return `${clean}${perPersonSuffix}`;
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
