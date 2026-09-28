/**
 * Display-string composition for the structured shopping-list quantity
 * fields (piece_equivalent, portion_options, package_options). Mirrors the
 * shape the backend used to send pre-formatted (see design.md deviation for
 * `meal-plan-integrity-and-number-formatting`) but composes it client-side
 * from the raw numeric fields via `@/lib/format`.
 */
import { formatExactWeight, formatNumber } from '@/lib/format';

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
