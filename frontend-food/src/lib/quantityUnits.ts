/**
 * Ingredient amounts: one conversion and formatting module for every place that shows or
 * edits an ingredient quantity (openspec change `switchable-quantity-units`).
 *
 * Stored is "count × unit"; grams are always derived and always shown. The backend mirrors
 * `formatAmount` in `backend/supply/services/quantity_units.py`; both are tested against
 * `backend/supply/tests/fixtures/quantity_format_cases.json`.
 */
import { formatExactWeight, formatWeight } from '@/lib/format';
import type { UnitKind, UnitOption } from '@/schemas/quantityUnits';

export interface AmountParts {
  count: number;
  kind: UnitKind | null;
  label: string;
  grams: number;
  /** The count is a conversion (e.g. a view in EL without known density). */
  countApprox?: boolean;
  /** The gram value itself is an estimate (standard measure without density). */
  gramsApprox?: boolean;
  /** The unit has no usable weight. */
  missing?: boolean;
}

/** Count with at most two decimals and German comma ("0,5", "1,25", "24"). */
export function formatCount(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  if (Number.isInteger(rounded)) return String(rounded);
  return rounded.toFixed(2).replace(/0+$/, '').replace(/\.$/, '').replace('.', ',');
}

/** Unit first, grams always visible: "0,5 Portion (15 g)", "1 TL (≈ 5 g)", "80 g". */
export function formatAmount(parts: AmountParts): string {
  const gramsText = `${parts.gramsApprox ? '≈ ' : ''}${formatWeight(parts.grams)}`;
  if (parts.kind === 'grams') return gramsText;
  const countText = `${parts.countApprox ? '≈ ' : ''}${formatCount(parts.count)} ${parts.label}`.trim();
  if (parts.missing) return `${countText} (Gewicht fehlt)`;
  return `${countText} (${gramsText})`;
}

export function optionKeyFor(unit: {
  unit_kind: UnitKind | null;
  portion_id?: number | null;
  standard_measure_key?: string | null;
}): string | null {
  switch (unit.unit_kind) {
    case 'portion':
      return unit.portion_id ? `portion:${unit.portion_id}` : null;
    case 'standard':
      return unit.standard_measure_key ? `standard:${unit.standard_measure_key}` : null;
    case 'grams':
      return 'grams';
    case 'milliliters':
      return 'milliliters';
    default:
      return null;
  }
}

export function gramsOptionOf(options: UnitOption[] | undefined): UnitOption | undefined {
  return options?.find((option) => option.kind === 'grams');
}

/** Count of `option` that weighs `grams`; null when the option has no weight. */
export function toCount(grams: number, option: UnitOption): number | null {
  if (!option.grams_per_unit || option.grams_per_unit <= 0) return null;
  return grams / option.grams_per_unit;
}

/** Grams of `count` × `option`; null when the option has no weight. */
export function toGrams(count: number, option: UnitOption): number | null {
  if (!option.grams_per_unit || option.grams_per_unit <= 0) return null;
  return count * option.grams_per_unit;
}

/** Minimal shape of a stored ingredient entry (MealItem, RefMeal item, …). */
export interface StoredAmount {
  quantity: number | null;
  quantity_g: number | null;
  unit_kind: UnitKind | null;
  unit_label: string;
  measuring_unit_name?: string;
  is_weight_approx?: boolean;
  has_missing_weight?: boolean;
}

/** Display parts of a stored entry, optionally viewed in another unit (view only). */
export function amountParts(item: StoredAmount, viewOption?: UnitOption | null): AmountParts {
  const grams = item.quantity_g ?? 0;
  const stored: AmountParts = {
    count: item.quantity ?? 0,
    kind: item.unit_kind,
    label: item.unit_label || item.measuring_unit_name || '',
    grams,
    gramsApprox: item.is_weight_approx,
    missing: item.has_missing_weight || (item.unit_kind !== 'grams' && !(grams > 0)),
  };
  if (!viewOption || stored.missing) return stored;
  if (viewOption.kind === 'grams') {
    return { count: grams, kind: 'grams', label: 'g', grams, gramsApprox: item.is_weight_approx };
  }
  const count = toCount(grams, viewOption);
  if (count == null) return { ...stored, count: 0, kind: viewOption.kind, label: viewOption.label, missing: true };
  return {
    count,
    kind: viewOption.kind,
    label: viewOption.label,
    grams,
    countApprox: viewOption.is_approx,
    gramsApprox: item.is_weight_approx,
  };
}

/** Label of an option in the picker: "Stück · 60 g", "EL · ≈ 15 g", "Stück · Gewicht fehlt". */
export function optionWeightText(option: UnitOption): string {
  if (option.kind === 'grams') return '';
  if (!option.has_weight || !option.grams_per_unit) return 'Gewicht fehlt';
  return `${option.is_approx ? '≈ ' : ''}${formatExactWeight(option.grams_per_unit)}`;
}
