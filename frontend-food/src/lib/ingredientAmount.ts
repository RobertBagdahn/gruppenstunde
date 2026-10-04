/**
 * Shared amount/unit display helpers for recipe ingredients (detail page and wizard preview).
 * Extracted from components/supply/IngredientList.tsx without behaviour changes.
 */
import type { RecipeItem } from '@/schemas/recipe';
import type { Portion } from '@/schemas/supply';
import { formatQuantity } from '@/lib/unitConversion';

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
