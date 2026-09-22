/**
 * Shared portion-label formatting for the recipe ingredient editors.
 */

/** Structural shape needed for label formatting (Portion, EditablePortion, …). */
export interface PortionLabelInput {
  id?: number;
  name: string;
  quantity: number;
  weight_g: number | null | undefined;
  measuring_unit_name: string | null | undefined;
  rank?: number;
}

export const BASE_METRIC_UNIT_NAMES = new Set(['Gramm', 'g', 'kg', 'Kilogramm', 'Milliliter', 'ml', 'Liter', 'l']);

/** Grams per single measuring unit for base metric units (ml ≈ g). */
const METRIC_UNIT_GRAMS: Record<string, number> = {
  gramm: 1, g: 1, milliliter: 1, ml: 1,
  kilogramm: 1000, kg: 1000, liter: 1000, l: 1000,
};

export interface PortionMetricInput {
  quantity?: number;
  weight_g?: number | null;
  measuring_unit_name?: string | null;
  is_piece_like?: boolean | null;
}

/** A portion is entered directly in a metric unit (the quantity IS grams/ml)
 * only when it is a single, non-piece portion whose weight equals one unit
 * ("Gramm" = 1 g, "Liter" = 1000 g).
 *
 * Everything else is a count of that portion:
 * - composite portions ("1 Portion Nudeln", quantity=125)
 * - piece-like portions ("kleine (50g)", "Zehe")
 * - pre-weighed portions that merely use a gram unit ("100g Reis",
 *   "Dose 400g", "EL 15g": quantity=1, unit=Gramm, weight_g≠1) —
 *   otherwise "125 × 100g Reis" would compute as 125 g. */
export function isDirectMetricPortion(
  portion: PortionMetricInput | undefined,
  fallbackUnit: string | null | undefined,
): boolean {
  if (portion && portion.quantity !== 1) return false;
  if (portion?.is_piece_like) return false;
  const unitName = portion?.measuring_unit_name ?? fallbackUnit ?? 'g';
  if (!BASE_METRIC_UNIT_NAMES.has(unitName)) return false;
  const unitGrams = METRIC_UNIT_GRAMS[unitName.toLowerCase()];
  const weightG = portion?.weight_g;
  return !(unitGrams != null && weightG != null && weightG > 0 && Math.abs(weightG - unitGrams) > 1e-6);
}

/** Formats a gram value compactly, e.g. "125g" or "1,3kg". */
export function formatGramsShort(grams: number): string {
  if (!Number.isFinite(grams) || grams <= 0) return '0g';
  if (grams >= 1000) {
    return `${(grams / 1000).toFixed(1).replace('.', ',')}kg`;
  }
  return `${Math.round(grams * 10) / 10}g`;
}

/**
 * Keep portion choices distinct and make missing piece weights actionable.
 * Count portions (composite, pre-weighed like "100g Reis") show their own
 * name, direct-unit portions show the measuring-unit name; the weight is appended in brackets.
 */
export function formatPortionOptionLabel(portion: PortionLabelInput): string {
  const unitName = portion.measuring_unit_name || portion.name;
  const isCount = portion.quantity !== 1 || !isDirectMetricPortion(portion, unitName);
  const portionName = isCount ? portion.name : unitName;
  const weight =
    portion.weight_g && portion.weight_g > 0
      ? ` (${formatGramsShort(portion.weight_g)})`
      : ' (Gewicht fehlt)';
  return `${portionName}${weight}`;
}
