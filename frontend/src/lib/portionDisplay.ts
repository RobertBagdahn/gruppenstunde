/**
 * Natural portion display utilities.
 *
 * Converts weight-based quantities into human-readable portion counts
 * like "ca. 3 Stück" or "ca. 2 Beutel".
 */

import type { Portion } from '@/schemas/supply';

export interface NaturalPortion {
  /** Portion name, e.g. "Stück", "Beutel" */
  name: string;
  /** Calculated count (may be fractional) */
  count: number;
  /** Formatted display string, e.g. "ca. 3 Stück" */
  display: string;
  /** Whether this is the default portion */
  isDefault: boolean;
}

/**
 * Round a natural portion count to a human-friendly value.
 * - Rounds to nearest 0.5 for values < 10
 * - Rounds to nearest whole number for values >= 10
 */
function roundPortionCount(count: number): number {
  if (count < 0.5) {
    return Math.round(count * 10) / 10; // 1 decimal
  }
  if (count < 10) {
    return Math.round(count * 2) / 2; // nearest 0.5
  }
  return Math.round(count);
}

/**
 * Format a portion count for display.
 */
function formatCount(count: number): string {
  if (Number.isInteger(count)) {
    return count.toString();
  }
  return count.toLocaleString('de-DE', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  });
}

/**
 * Calculate natural portion counts from a weight in grams.
 *
 * @param weightG - Total weight in grams
 * @param portions - Available portions for the ingredient
 * @returns Array of natural portions, sorted by priority (default first)
 */
export function calculateNaturalPortions(
  weightG: number,
  portions: Portion[],
): NaturalPortion[] {
  if (weightG <= 0 || portions.length === 0) {
    return [];
  }

  const results: NaturalPortion[] = [];

  // Sort: is_default first, then by priority desc
  const sorted = [...portions].sort((a, b) => {
    if (a.is_default !== b.is_default) return a.is_default ? -1 : 1;
    return b.priority - a.priority;
  });

  for (const portion of sorted) {
    if (!portion.weight_g || portion.weight_g <= 0) continue;

    const rawCount = weightG / portion.weight_g;
    const rounded = roundPortionCount(rawCount);

    if (rounded <= 0) continue;

    const portionName = portion.name || 'Stück';
    results.push({
      name: portionName,
      count: rounded,
      display: `ca. ${formatCount(rounded)} x ${portionName}`,
      isDefault: portion.is_default,
    });
  }

  return results;
}

/**
 * Get the primary natural portion display for a given weight.
 * Returns the default portion display, or the first available one.
 *
 * @param weightG - Total weight in grams
 * @param portions - Available portions for the ingredient
 * @returns Display string or null if no portions available
 */
export function getPrimaryPortionDisplay(
  weightG: number,
  portions: Portion[],
): string | null {
  const naturals = calculateNaturalPortions(weightG, portions);
  if (naturals.length === 0) return null;

  // Prefer default, otherwise first
  const defaultPortion = naturals.find((n) => n.isDefault);
  return (defaultPortion ?? naturals[0]).display;
}
