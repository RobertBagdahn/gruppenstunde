/**
 * Unit conversion utilities for recipe ingredient quantities.
 *
 * Handles:
 * - g → kg conversion (>= 1000g)
 * - ml → l conversion (>= 1000ml)
 * - Smart rounding (5g/10g/50g steps)
 * - Density-based g ↔ ml conversion
 * - Default unit selection based on ingredient viscosity
 */

export type UnitType = 'g' | 'kg' | 'ml' | 'l';

export interface FormattedQuantity {
  /** The rounded/converted value */
  value: number;
  /** The display unit */
  unit: UnitType;
  /** Formatted string ready for display, e.g. "1,2 kg" */
  display: string;
}

/**
 * Smart rounding based on quantity magnitude.
 * - Under 100: round to nearest 5
 * - 100-999: round to nearest 10
 * - 1000+: round to nearest 50
 */
function smartRound(value: number): number {
  if (value <= 0) return 0;
  if (value < 100) {
    return Math.round(value / 5) * 5;
  }
  if (value < 1000) {
    return Math.round(value / 10) * 10;
  }
  return Math.round(value / 50) * 50;
}

/**
 * Format a number for German locale display (comma as decimal separator).
 */
function formatNumber(value: number): string {
  if (Number.isInteger(value)) {
    return value.toString();
  }
  // Up to 1 decimal place for kg/l, no trailing zeros
  return value.toLocaleString('de-DE', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  });
}

/**
 * Convert grams to the most appropriate weight unit with smart rounding.
 */
export function formatWeight(grams: number): FormattedQuantity {
  const rounded = smartRound(grams);
  if (rounded >= 1000) {
    const kg = rounded / 1000;
    return {
      value: kg,
      unit: 'kg',
      display: `${formatNumber(kg)} kg`,
    };
  }
  return {
    value: rounded,
    unit: 'g',
    display: `${formatNumber(rounded)} g`,
  };
}

/**
 * Convert milliliters to the most appropriate volume unit with smart rounding.
 */
export function formatVolume(ml: number): FormattedQuantity {
  const rounded = smartRound(ml);
  if (rounded >= 1000) {
    const l = rounded / 1000;
    return {
      value: l,
      unit: 'l',
      display: `${formatNumber(l)} l`,
    };
  }
  return {
    value: rounded,
    unit: 'ml',
    display: `${formatNumber(rounded)} ml`,
  };
}

/**
 * Convert grams to milliliters using density.
 * density = g/ml, so ml = g / density
 */
export function gramsToMl(grams: number, density: number): number {
  if (density <= 0) return grams;
  return grams / density;
}

/**
 * Convert milliliters to grams using density.
 * density = g/ml, so g = ml * density
 */
export function mlToGrams(ml: number, density: number): number {
  return ml * density;
}

/**
 * Format a quantity in grams to the best display unit based on ingredient properties.
 *
 * @param grams - The quantity in grams
 * @param viscosity - "solid" or "beverage" — determines default unit type
 * @param density - Physical density (g/ml) for volume conversion, null if unavailable
 */
export function formatQuantity(
  grams: number,
  viscosity: string | null | undefined,
  density: number | null | undefined,
): FormattedQuantity {
  if (grams <= 0) {
    return { value: 0, unit: 'g', display: '0 g' };
  }

  // Beverages: display as volume if density is available
  if (viscosity === 'beverage' && density && density > 0) {
    const ml = gramsToMl(grams, density);
    return formatVolume(ml);
  }

  // Solids or no density info: display as weight
  return formatWeight(grams);
}

/**
 * Scale a recipe item quantity for a given number of servings.
 * Base quantities are for 1 Normportion.
 *
 * @param baseQuantity - Quantity for 1 portion
 * @param servings - Number of portions to scale to
 * @returns Scaled quantity in grams
 */
export function scaleQuantity(baseQuantity: number, servings: number): number {
  return baseQuantity * servings;
}
