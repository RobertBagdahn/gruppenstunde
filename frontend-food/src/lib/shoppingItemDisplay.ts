/**
 * Display-string composition for the structured shopping-list quantity
 * fields (piece_equivalent, portion_options, package_options). Mirrors the
 * shape the backend used to send pre-formatted (see design.md deviation for
 * `meal-plan-integrity-and-number-formatting`) but composes it client-side
 * from the raw numeric fields via `@/lib/format`.
 */
import { formatExactWeight, formatNumber, formatVolume, formatWeight } from '@/lib/format';

interface PieceEquivalentLike {
  count: number;
  portion_name: string;
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
}

/** "≈ 2,5 Scheiben" */
export function formatPieceEquivalent(pe: PieceEquivalentLike): string {
  return `≈ ${formatNumber(pe.count, { maxDecimals: 1 })} ${pe.portion_name}`;
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

/** "2 × 500-g-Packung" */
export function formatPackageNeed(option: PackageOptionLike): string {
  return `${option.count} × ${formatPackageLabel(option)}`;
}

/** "+ 50 g Reserve" for a positive package surplus, otherwise empty. */
export function formatPackageReserve(surplusG: number | null | undefined): string {
  return surplusG && surplusG > 0 ? `+ ${formatWeight(surplusG)} Reserve` : '';
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
 * "1,0 kg · 2 × 500-g-Packung" or "320 g · ≈ 64 TL" — amount first, then the
 * package need (preferred, a real purchasable unit) or the piece equivalent.
 */
export function formatShoppingQuantity(
  quantity: number,
  unit: string,
  pieceEquivalent?: PieceEquivalentLike | null,
  packageOption?: PackageOptionLike | null,
): string {
  const amount = formatShoppingAmount(quantity, unit);
  let secondary = '';
  if (packageOption) secondary = formatPackageNeed(packageOption);
  else if (pieceEquivalent) secondary = formatPieceEquivalent(pieceEquivalent);
  if (!secondary) return amount;
  return amount ? `${amount} · ${secondary}` : secondary;
}
