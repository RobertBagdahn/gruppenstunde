/**
 * Display-string composition for the structured shopping-list quantity
 * fields (start_unit, portion_options, package_options). Mirrors the
 * shape the backend used to send pre-formatted (see design.md deviation for
 * `meal-plan-integrity-and-number-formatting`) but composes it client-side
 * from the raw numeric fields via `@/lib/format`.
 */
import { formatCount, formatExactWeight, formatNumber, formatVolume, formatWeight } from '@/lib/format';
import { formatAmount } from '@/lib/quantityUnits';

interface StartUnitLike {
  kind: 'grams' | 'milliliters' | 'portion' | 'standard';
  label: string;
  grams_per_unit: number | null;
  is_approx: boolean;
}

interface PortionOptionLike {
  name: string;
  weight_g: number;
  count: number;
}

interface PackageOptionLike {
  count: number;
  package_name: string;
  weight_g: number;
  /** Package size in ml for liquids, so it matches the unit of the amount. */
  volume_ml?: number | null;
}

/**
 * Amount in the start unit with its grams: "44,5 mittelgroße Zwiebel (3,6 kg)", "24 Stück (1,4 kg)".
 * Counts of 10 and more are rounded to whole pieces (shoppers buy whole pieces).
 * Returns '' for metric start units; those use the plain gram/ml amount.
 */
export function formatStartUnitAmount(grams: number, startUnit: StartUnitLike | null | undefined): string {
  if (!startUnit || (startUnit.kind !== 'portion' && startUnit.kind !== 'standard')) return '';
  if (!startUnit.grams_per_unit || startUnit.grams_per_unit <= 0 || grams <= 0) return '';
  const count = grams / startUnit.grams_per_unit;
  const shown = count >= 10 ? Math.round(count) : Math.round(count * 10) / 10;
  return formatAmount({
    count: shown,
    kind: startUnit.kind,
    label: startUnit.label,
    grams,
    gramsApprox: startUnit.is_approx,
  });
}

/** "2,5 × Scheibe (à 25 g)" */
export function formatPortionOption(option: PortionOptionLike): string {
  return `${formatNumber(option.count, { maxDecimals: 1 })} × ${option.name} (à ${formatExactWeight(option.weight_g)})`;
}

/**
 * Label of a package: names that already state a size ("400-g-Dose") are used
 * as is, otherwise the exact weight is prefixed ("500-g-Packung").
 */
export function formatPackageLabel(option: Pick<PackageOptionLike, 'package_name' | 'weight_g'>): string {
  const name = option.package_name.trim();
  if (/\d/.test(name)) return name;
  return `${formatExactWeight(option.weight_g).replace(' ', '-')}-${name || 'Packung'}`;
}

/**
 * Package label in the unit of the shopping amount: liquids ("2,6 l") show the
 * package in ml/l too ("1-l-Flasche"), not as a weight ("1-kg-Flasche").
 */
function formatShoppingPackageLabel(option: PackageOptionLike): string {
  if (option.volume_ml == null || option.volume_ml <= 0) return formatPackageLabel(option);
  const bare = option.package_name.trim().replace(/^\d+(?:[.,]\d+)?[-\s]?(?:kg|g|ml|l)\b[-\s]?/i, '').trim();
  return `${formatVolume(option.volume_ml).replace(' ', '-')}-${bare || 'Packung'}`;
}

/** "2 × 500-g-Packung" */
export function formatPackageNeed(option: PackageOptionLike): string {
  return `${option.count} × ${formatShoppingPackageLabel(option)}`;
}

export const PACKAGE_RESERVE_HELP =
  'Rest der Packung: Du kaufst ganze Packungen, daher bleibt über, was über den Bedarf hinausgeht. Das ist nicht der prozentuale Reservefaktor des Plans (z. B. +15 %), der den Bedarf selbst erhöht.';

/** "+ 50 g Reserve" for a positive package surplus, otherwise empty. */
export function formatPackageReserve(surplusG: number | null | undefined): string {
  return surplusG && surplusG > 0 ? `+ ${formatWeight(surplusG)} Reserve` : '';
}

/**
 * The value a formatted amount actually shows, i.e. the number behind `formatShoppingAmount`
 * after its display rounding (10 g steps from 100 g, 5 g steps from 50 g, 0,1 kg / 0,1 l above 1.000).
 * The reserve is derived from it so that shown amount + shown reserve = package size.
 */
export function displayedAmountValue(quantity: number, unit: 'g' | 'ml'): number {
  const step = (value: number, size: number) => Math.round(value / size) * size;
  if (unit === 'ml') return quantity < 1000 ? Math.round(quantity) : step(quantity / 1000, 0.1) * 1000;
  if (quantity < 1) return quantity;
  if (quantity >= 1000) return Math.round(quantity / 100) * 100;
  if (quantity >= 100) return step(quantity, 10);
  if (quantity >= 50) return step(quantity, 5);
  return Math.round(quantity);
}

interface ReserveItemLike {
  quantity?: number | null;
  quantity_g?: number | null;
  total_quantity_g?: number | null;
  unit: string;
  package_options: PackageOptionLike[];
  package_surplus_g: number | null;
}

/**
 * "+ 925 g Reserve" / "+ 793 ml Reserve": the rest of the package in the unit of the amount and
 * computed from the *shown* (rounded) amount. Without a package of the same unit it falls back to
 * the gram surplus from the backend; liquids without a volume package show no reserve instead of a wrong unit.
 */
export function formatItemPackageReserve(item: ReserveItemLike): string {
  const option = item.package_options[0];
  const amount = item.quantity || item.quantity_g || item.total_quantity_g || 0;
  if (option && amount > 0) {
    if (item.unit === 'g' && option.weight_g > 0) {
      const reserve = Math.round(option.count * option.weight_g - displayedAmountValue(amount, 'g'));
      return reserve > 0 ? `+ ${formatExactWeight(reserve)} Reserve` : '';
    }
    if (item.unit === 'ml' && option.volume_ml != null && option.volume_ml > 0) {
      const reserve = Math.round(option.count * option.volume_ml - displayedAmountValue(amount, 'ml'));
      if (reserve <= 0) return '';
      return `+ ${reserve < 1000 ? `${formatCount(reserve)} ml` : formatVolume(reserve)} Reserve`;
    }
  }
  if (item.unit === 'ml') return '';
  return formatPackageReserve(item.package_surplus_g);
}

/**
 * Amount of a shopping item in its display unit: grams via `formatWeight`
 * ("1,3 kg", "320 g"), millilitres via `formatVolume` ("250 ml", "9,1 l").
 */
export function formatShoppingAmount(quantity: number, unit: string): string {
  if (quantity <= 0) return '';
  if (unit === 'g') return formatWeight(quantity);
  if (unit === 'ml') return formatVolume(quantity);
  return `${formatNumber(quantity, { maxDecimals: 1 })} ${unit}`;
}

/**
 * "44 Zwiebeln (3,6 kg) · 2 × 500-g-Packung" or "320 g · 2 × 500-g-Packung": the start unit with its
 * grams first (plain gram/ml amount for metric start units), then the package need.
 */
export function formatShoppingQuantity(
  quantity: number,
  unit: string,
  startUnit?: StartUnitLike | null,
  packageOption?: PackageOptionLike | null,
  grams?: number | null,
): string {
  const natural = formatStartUnitAmount(grams ?? (unit === 'g' ? quantity : 0), startUnit);
  const amount = natural || formatShoppingAmount(quantity, unit);
  const secondary = packageOption ? formatPackageNeed(packageOption) : '';
  if (!secondary) return amount;
  return amount ? `${amount} · ${secondary}` : secondary;
}

/** "14:32 Uhr" for today, "12.10., 14:32 Uhr" for earlier days; empty for a missing or invalid timestamp. */
export function formatWhen(iso: string | null | undefined, now: Date = new Date()): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const time = date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  if (date.toDateString() === now.toDateString()) return `${time} Uhr`;
  const day = date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
  return `${day}, ${time} Uhr`;
}
