/**
 * Display-string composition for the structured shopping-list quantity
 * fields (piece_equivalent, portion_options, package_options). Mirrors the
 * shape the backend used to send pre-formatted (see design.md deviation for
 * `meal-plan-integrity-and-number-formatting`) but composes it client-side
 * from the raw numeric fields via `@/lib/format`.
 */
import { formatExactWeight, formatNumber, formatWeight } from '@/lib/format';

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

/** "2 × Packung (à 500 g)" */
export function formatPackageOption(option: PackageOptionLike): string {
  return `${option.count} × ${option.package_name} (à ${formatExactWeight(option.weight_g)})`;
}

/**
 * Amount of a shopping item in its display unit: grams via `formatWeight`
 * ("1,3 kg", "320 g"), other units with German decimals ("250 ml").
 */
export function formatShoppingAmount(quantity: number, unit: string): string {
  if (quantity <= 0) return '';
  if (unit === 'g') return formatWeight(quantity);
  return `${formatNumber(quantity, { maxDecimals: 1 })} ${unit}`;
}

/** "320 g · ≈ 64 TL" — amount first, piece equivalent second. */
export function formatShoppingQuantity(
  quantity: number,
  unit: string,
  pieceEquivalent?: PieceEquivalentLike | null,
): string {
  const amount = formatShoppingAmount(quantity, unit);
  if (!pieceEquivalent) return amount;
  const pieces = formatPieceEquivalent(pieceEquivalent);
  return amount ? `${amount} · ${pieces}` : pieces;
}
