/**
 * Validation utilities for portion data quality
 */

/**
 * Heuristic: Flag portions where weight_g ≈ 1.0 but the portion name
 * doesn't indicate a legitimate small unit. This helps identify
 * data-quality issues like "große Dose" with weight_g=1.0 (placeholder).
 */
export function isSuspiciousPlaceholderWeight(portion: {
  name: string;
  weight_g: number | null;
}): boolean {
  const w = portion.weight_g ?? 0;
  // Check if weight is approximately 1.0 (with float tolerance)
  if (Math.abs(w - 1.0) > 0.01) return false;

  // Whitelist of portion names that legitimately have weight_g≈1.0
  const legitimateSmallUnits = ['Gramm', 'g', 'Prise', 'Messerspitze', 'Tropfen', 'Blatt', 'Stück'];

  const lowerName = portion.name.toLowerCase();
  return !legitimateSmallUnits.some((unit) => lowerName.includes(unit.toLowerCase()));
}
