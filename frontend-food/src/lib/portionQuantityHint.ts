/**
 * Derives portion quantity hint from grams and available portions.
 *
 * For display formats like "85g · ≈ 1,7 Scheiben"
 * - Returns null if no suitable portion found or value < 0.1
 * - Selects primary portion by lowest priority (with weight_g > 0)
 * - Optionally adds secondary portion (different name, weight_g > 0)
 */

import type { BreakfastPortion } from '@/schemas/breakfast';

/**
 * Format a German number with comma as decimal separator.
 * @param value The numeric value
 * @param decimals Number of decimal places (default 1)
 * @returns String like "1,7" or "2"
 */
function formatGermanNumber(value: number, decimals: number = 1): string {
  if (decimals === 0) return Math.round(value).toString();

  const multiplier = Math.pow(10, decimals);
  const rounded = Math.round(value * multiplier) / multiplier;

  // If exactly an integer after rounding, return without decimals
  if (rounded === Math.round(rounded)) {
    return Math.round(rounded).toString();
  }

  // Format with decimals, then replace dot with comma
  const str = rounded.toLocaleString('de-DE', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  return str;
}

const UNCHANGED_PLURAL_NAMES = new Set(['Stück', 'Glas', 'Paar']);
const UNCHANGED_PLURAL_ENDINGS = ['chen', 'lein', 'el', 'er', 'en'];

/**
 * Simple German pluralization for single nouns: "Scheibe" → "Scheiben", "Packung" → "Packungen".
 * Unit abbreviations ("ml", "EL") and multi-word portion names ("Belag knapp")
 * stay unchanged, as do nouns whose plural equals the singular ("Stück", "Becher").
 */
export function germanPortionPlural(name: string): string {
  const isSingleCapitalizedNoun = /^[A-ZÄÖÜ][a-zäöüß]+$/.test(name);
  if (!isSingleCapitalizedNoun || UNCHANGED_PLURAL_NAMES.has(name)) return name;
  if (UNCHANGED_PLURAL_ENDINGS.some((ending) => name.endsWith(ending))) return name;
  return name.endsWith('e') ? `${name}n` : `${name}en`;
}

interface PortionHint {
  count: number;
  name: string;
}

/**
 * Portions named after a metric unit ("ml", "g", …). The breakfast steps show
 * grams, and like the ingredient table they never mix in a volume: ml is only
 * used for beverages, which these steps list in ml directly.
 */
const METRIC_UNIT_PORTION_NAMES = new Set(['g', 'gramm', 'kg', 'ml', 'milliliter', 'cl', 'dl', 'l', 'liter']);

function isHintPortion(portion: BreakfastPortion): boolean {
  return portion.weight_g !== null
    && portion.weight_g > 0
    && !METRIC_UNIT_PORTION_NAMES.has(portion.name.trim().toLocaleLowerCase('de-DE'));
}

/**
 * Get the primary portion (lowest priority with weight_g > 0).
 */
function getPrimaryPortion(portions: BreakfastPortion[]): BreakfastPortion | null {
  if (!portions || portions.length === 0) return null;

  // Sort by priority ascending, keep only household portions with a weight
  const validPortions = portions
    .filter(isHintPortion)
    .sort((a, b) => (a.priority ?? 999) - (b.priority ?? 999));

  return validPortions.length > 0 ? validPortions[0] : null;
}

/**
 * Get a secondary portion (different name, weight_g > 0, not the primary).
 */
function getSecondaryPortion(portions: BreakfastPortion[], primaryName: string): BreakfastPortion | null {
  if (!portions || portions.length === 0) return null;

  const validPortions = portions
    .filter((p) => isHintPortion(p) && p.name !== primaryName)
    .sort((a, b) => (a.priority ?? 999) - (b.priority ?? 999));

  return validPortions.length > 0 ? validPortions[0] : null;
}

/**
 * Derive portion quantity hint from grams and available portions.
 *
 * @param grams The gram amount
 * @param portions Array of available portions for the ingredient
 * @returns Formatted string like "≈ 1,7 Scheiben" or "≈ 1,7 Scheiben · ≈ 0,2 Packungen"
 *          Returns null if no suitable portion or count < 0.1
 */
export function deriveGramPortionHint(
  grams: number,
  portions?: BreakfastPortion[] | null
): string | null {
  if (!portions || portions.length === 0 || grams <= 0) {
    return null;
  }

  const primary = getPrimaryPortion(portions);
  if (!primary) {
    return null;
  }

  const hints: PortionHint[] = [];

  // Primary portion
  const primaryCount = grams / (primary.weight_g ?? 1);
  if (primaryCount >= 0.1) {
    hints.push({
      count: primaryCount,
      name: primary.name,
    });
  }

  // Secondary portion (if available and count >= 0.1)
  const secondary = getSecondaryPortion(portions, primary.name);
  if (secondary && secondary.weight_g !== null && secondary.weight_g > 0) {
    const secondaryCount = grams / secondary.weight_g;
    if (secondaryCount >= 0.1) {
      hints.push({
        count: secondaryCount,
        name: secondary.name,
      });
    }
  }

  if (hints.length === 0) {
    return null;
  }

  // Format hints
  const formattedHints = hints
    .map((h) => {
      const count = formatGermanNumber(h.count, 1);
      // Use plural if count > 1 (with small tolerance for rounding)
      const name = h.count > 1.05 ? germanPortionPlural(h.name) : h.name;
      return `≈ ${count} ${name}`;
    })
    .join(' · ');

  return formattedHints;
}

/**
 * Combine grams display with portion hint.
 *
 * @param grams The gram amount
 * @param portions Array of available portions
 * @returns String like "85g · ≈ 1,7 Scheiben" or just "85g" if no hint available
 */
export function formatGramsWithPortionHint(
  grams: number,
  portions?: BreakfastPortion[] | null
): string {
  const roundedGrams = Math.round(grams);
  const hint = deriveGramPortionHint(grams, portions);

  return hint ? `${roundedGrams}g · ${hint}` : `${roundedGrams}g`;
}
