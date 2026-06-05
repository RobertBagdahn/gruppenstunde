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
 * Format the display of a natural portion, multiplying out leading numbers if present.
 * For example:
 * - count=0.2, portionName="1 TL Salz" -> "ca. 0,2 TL Salz" (instead of "ca. 0,2 x 1 TL Salz")
 * - count=1.5, portionName="2 EL" -> "ca. 3 EL" (instead of "ca. 1,5 x 2 EL")
 * - count=3.0, portionName="1.5 Becher" -> "ca. 4,5 Becher" (instead of "ca. 3 x 1.5 Becher")
 */
function formatNaturalPortionDisplay(count: number, portionName: string): string {
  // Regex to match a leading integer or decimal (with period or comma)
  const leadingNumberRegex = /^(\d+(?:[.,]\d+)?)\s*(.*)$/;
  const match = portionName.match(leadingNumberRegex);

  if (match) {
    const leadingNumStr = match[1].replace(',', '.');
    const val = parseFloat(leadingNumStr);
    if (!isNaN(val)) {
      const multipliedCount = count * val;
      const rest = match[2];
      return `ca. ${formatCount(multipliedCount)} ${rest}`;
    }
  }

  // Fallback: Check if portionName is/starts with a known unit to omit "x "
  const unitsWithoutX = [
    'el', 'tl', 'esslöffel', 'teelöffel', 'g', 'kg', 'gramm', 'kilogramm',
    'ml', 'l', 'milliliter', 'liter', 'st.', 'stk', 'stück', 'prise', 'pr.',
    'dose', 'dosen', 'tasse', 'tassen', 'becher', 'portion', 'portionen',
    'handvoll', 'tropfen', 'zehe', 'zehen', 'packung', 'packungen', 'beutel'
  ];

  const firstWord = portionName.split(/\s+/)[0].toLowerCase().replace(/[^a-zäöüß.]/g, '');
  const shouldOmitX = unitsWithoutX.includes(firstWord) || unitsWithoutX.includes(portionName.toLowerCase());

  if (shouldOmitX) {
    return `ca. ${formatCount(count)} ${portionName}`;
  }

  return `ca. ${formatCount(count)} x ${portionName}`;
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

  // Sort: is_default first, then by priority desc, then known weight before unknown
  const sorted = [...portions].sort((a, b) => {
    if (a.is_default !== b.is_default) return a.is_default ? -1 : 1;
    const aHasWeight = a.weight_g != null && a.weight_g >= 0.01;
    const bHasWeight = b.weight_g != null && b.weight_g >= 0.01;
    if (aHasWeight !== bHasWeight) return aHasWeight ? -1 : 1;
    return b.priority - a.priority;
  });

  for (const portion of sorted) {
    const portionName = portion.name || 'Stück';

    if (portion.weight_g != null && portion.weight_g < 0.01) {
      // Skip tiny portions (below 0.01g — effectively zero)
      continue;
    }

    if (portion.weight_g == null) {
      // Unknown weight: show as label only (e.g., "1 Liter Milch", "1 Glas")
      results.push({
        name: portionName,
        count: 0,
        display: portionName,
        isDefault: portion.is_default,
      });
      continue;
    }

    const rawCount = weightG / portion.weight_g;
    const rounded = roundPortionCount(rawCount);

    if (rounded <= 0) continue;

    results.push({
      name: portionName,
      count: rounded,
      display: formatNaturalPortionDisplay(rounded, portionName),
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
