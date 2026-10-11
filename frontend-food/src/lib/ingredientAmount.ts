/**
 * Shared amount/unit display helpers for recipe ingredients (detail page and wizard preview).
 * Extracted from components/supply/IngredientList.tsx without behaviour changes.
 */
import type { RecipeItem } from '@/schemas/recipe';
import type { RecipeStepIngredient } from '@/schemas/recipeStep';
import type { Portion } from '@/schemas/supply';
import { formatQuantity } from '@/lib/unitConversion';
import { formatWeight } from '@/lib/format';

/** Short display names for measuring units */
export const UNIT_SHORT: Record<string, string> = {
  'Esslöffel': 'EL',
  'Teelöffel': 'TL',
  'Kilogramm': 'kg',
  'Gramm': 'g',
  'Milliliter': 'ml',
  'Liter': 'l',
  'Prise': 'Pr.',
  'Tasse': 'Tasse',
  'Messerspitze': 'Msp.',
  'Schuss': 'Schuss',
};

const BASE_METRIC_UNIT_NAMES = new Set(['Gramm', 'g', 'kg', 'Kilogramm', 'Milliliter', 'ml', 'Liter', 'l']);

/**
 * A portion is metric when its *name* is a plain metric amount ("Gramm", "100g Reis").
 * The measuring unit only decides for unnamed portions — named portions such as "Stück"
 * are often stored in grams but still describe a natural portion.
 */
export function isGramPortion(portionName?: string | null, unitName?: string | null): boolean {
  if (!portionName) return BASE_METRIC_UNIT_NAMES.has(unitName ?? '');
  return BASE_METRIC_UNIT_NAMES.has(portionName) || /^(?:\d+(?:[.,]\d+)?\s*)?(?:g|kg|ml|l)\b/i.test(portionName);
}

export function shortUnit(name: string): string {
  return UNIT_SHORT[name] ?? name;
}

export function formatCount(value: number): string {
  return value.toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: value < 1 ? 2 : 1 });
}

export function formatPortionAmount(amount: number, portionName: string): string {
  // Pre-weighed metric portions ("100g Reis") read as a multiple of the portion.
  if (/^\d+(?:[.,]\d+)?\s*(?:g|kg|ml|l)\b/i.test(portionName)) return `${formatCount(amount)} × ${portionName}`;

  const match = portionName.match(/^(\d+(?:[.,]\d+)?)\s+(.*)$/);
  const count = match ? amount * parseFloat(match[1].replace(',', '.')) : amount;
  const name = match ? match[2] : portionName;

  return `${formatCount(count)} ${name}`;
}

export interface RecipeItemAmount {
  /** Amount with its unit, e.g. "0,31 mittelgroße Zwiebel" or "100 g"; "—" without a quantity. */
  primary: string;
  /** Gram weight when the primary amount is not already metric, e.g. "25 g". */
  secondary: string | null;
}

/**
 * Amount of a recipe item as shown in the wizard preview. The unit comes from the item's portion
 * (quantity is a portion count), then from its measuring unit; it is never guessed.
 */
export function formatRecipeItemAmount(item: RecipeItem): RecipeItemAmount {
  const quantity = item.quantity;
  if (!quantity || quantity <= 0) return { primary: '—', secondary: null };

  const portions: Portion[] = item.ingredient_portions ?? [];
  const selected = portions.find((portion) => portion.id === item.portion_id) ?? null;
  const portionName = selected?.name ?? item.portion_name ?? null;
  const unitName = selected?.measuring_unit_name ?? item.measuring_unit_name ?? null;

  if (portionName && !isGramPortion(portionName, unitName)) {
    const weightG = item.weight_g > 0 ? item.weight_g : selected?.weight_g ? quantity * selected.weight_g : 0;
    const secondary = weightG > 0 ? formatQuantity(weightG, item.ingredient_viscosity, item.ingredient_density).display : null;
    return { primary: formatPortionAmount(quantity, shortUnit(portionName)), secondary };
  }

  const metricName = portionName ?? unitName;
  if (metricName) return { primary: `${formatCount(quantity)} ${shortUnit(metricName)}`, secondary: null };

  return { primary: `${formatCount(quantity)} —`, secondary: null };
}

/** Structural subset of a recipe item or a step ingredient needed to format its scaled amount. */
export interface ScaledRecipeAmountInput {
  /** Portion count for portion items, grams for direct-gram items. */
  quantity?: number | null;
  weight_g?: number | null;
  portion_name?: string | null;
  measuring_unit_name?: string | null;
  /** Stored unit label of a step ingredient, used only when no weight is known. */
  unit_short?: string | null;
  ingredient_viscosity?: string | null;
  ingredient_density?: number | null;
}

/**
 * Amount of a recipe item, or its share in a preparation step, for `scale` servings — the same
 * amounts as the recipe ingredient list: a natural portion as "0,35 Portion" with its grams as
 * secondary value, everything else (direct grams, metric portions) as grams. Beverages with a density
 * show that weight in ml, as in the ingredient list. Mirrored for PDFs by
 * backend/recipe/services/recipe_amount_display.py.
 */
export function formatScaledRecipeAmount(item: ScaledRecipeAmountInput, scale = 1): RecipeItemAmount {
  const quantity = (item.quantity ?? 0) * scale;
  const weightG = (item.weight_g ?? 0) * scale;
  const grams = weightG > 0
    ? formatQuantity(weightG, item.ingredient_viscosity, item.ingredient_density).display
    : null;
  const portionName = item.portion_name || null;

  if (portionName && quantity > 0 && !isGramPortion(portionName, item.measuring_unit_name)) {
    return { primary: formatPortionAmount(quantity, shortUnit(portionName)), secondary: grams };
  }
  if (grams != null) return { primary: grams, secondary: null };

  const unitName = item.unit_short || item.measuring_unit_name;
  if (quantity > 0 && unitName) return { primary: `${formatCount(quantity)} ${shortUnit(unitName)}`, secondary: null };
  return { primary: '—', secondary: null };
}

/** Step ingredient with its scaled amount: "0,35 Portion (18 g) Sojagranulat". */
export function formatStepIngredientLabel(ingredient: RecipeStepIngredient, scale = 1): string {
  const amount = formatScaledRecipeAmount(ingredient, scale);
  const amountText = amount.primary === '—'
    ? ''
    : amount.secondary ? `${amount.primary} (${amount.secondary})` : amount.primary;
  const name = ingredient.ingredient_name || ingredient.note || '';
  return [amountText, name].filter(Boolean).join(' ');
}

/** Structural subset of a meal-plan item needed to format its amount. */
export interface MealItemAmountInput {
  quantity: number | null;
  quantity_g: number | null;
  measuring_unit_name: string;
  portion_name?: string;
}

/**
 * Amount of a single ingredient in the meal plan, formatted like the recipe views.
 * With a portion the quantity is a portion count ("0,5 EL" + "7,5 g"); the portion's own
 * measuring unit ("Gramm" of a pre-weighed "EL 15 g") is never used as the label.
 */
export function formatMealItemAmount(item: MealItemAmountInput): RecipeItemAmount {
  const quantity = item.quantity;
  const grams = item.quantity_g != null && item.quantity_g > 0 ? item.quantity_g : null;
  if (quantity != null && quantity > 0) {
    const portionName = item.portion_name || null;
    const unitName = item.measuring_unit_name || null;

    if (portionName && !BASE_METRIC_UNIT_NAMES.has(portionName)) {
      return { primary: formatPortionAmount(quantity, shortUnit(portionName)), secondary: grams != null ? formatWeight(grams) : null };
    }
    const metricName = portionName ?? unitName;
    if (metricName && BASE_METRIC_UNIT_NAMES.has(metricName)) {
      return { primary: `${formatCount(quantity)} ${shortUnit(metricName)}`, secondary: null };
    }
    const count = formatCount(quantity);
    const label = metricName && metricName.toLowerCase() !== 'stück' ? `${count} ${shortUnit(metricName)}` : count;
    return { primary: label, secondary: grams != null ? formatWeight(grams) : null };
  }
  if (grams != null) return { primary: formatWeight(grams), secondary: null };
  return { primary: '—', secondary: null };
}
