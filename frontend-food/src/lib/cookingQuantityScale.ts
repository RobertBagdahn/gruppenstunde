/**
 * Pure scaling helpers for editing recipe ingredient quantities "in cooking
 * quantities" (e.g. for 4 people) instead of the backend's normalized
 * per-1-serving quantities.
 *
 * Used by `InlineIngredientEditor` to:
 * - scale per-1-serving quantities up for display while editing (`scaleQuantity`)
 * - normalize displayed quantities back down to per-1-serving on save (`toBasePerServing`)
 * - live-rescale displayed quantities when the person count changes (`rescaleForNewPortions`)
 */

export const MIN_SERVING_CONTEXT = 1;
export const MAX_SERVING_CONTEXT = 100;

/** Keep the temporary editor context within the supported whole-person range. */
export function normalizeServingContext(value: number): number {
  if (!Number.isFinite(value)) return MIN_SERVING_CONTEXT;
  return Math.max(MIN_SERVING_CONTEXT, Math.min(MAX_SERVING_CONTEXT, Math.round(value)));
}

/** Scales a per-1-serving quantity up by `scale`, rounded to 2 decimals for display. */
export function scaleQuantity(basePerServing: number, scale: number): number {
  return Math.round(basePerServing * scale * 100) / 100;
}

/** Converts a normalized quantity into the total quantity for the editor context. */
export function toServingContextQuantity(basePerServing: number, servingContext: number): number {
  return scaleQuantity(basePerServing, normalizeServingContext(servingContext));
}

/** Normalizes a displayed quantity (scaled for `scale` people) back to per-1-serving,
 *  rounded to 3 decimals (matches backend precision expectations). */
export function toBasePerServing(displayQuantity: number, scale: number): number {
  if (scale <= 1) return displayQuantity;
  return Math.round((displayQuantity / scale) * 1000) / 1000;
}

/** Converts an editor total back to the normalized per-1-person quantity. */
export function fromServingContextQuantity(totalQuantity: number, servingContext: number): number {
  return toBasePerServing(totalQuantity, normalizeServingContext(servingContext));
}

/** Re-derives the per-1-serving base from a quantity currently displayed at
 *  `oldScale`, then re-applies `newScale` — used when the person count changes
 *  live in the editor so manually edited quantities scale proportionally. */
export function rescaleForNewPortions(
  currentDisplayQuantity: number,
  oldScale: number,
  newScale: number,
): number {
  const base = currentDisplayQuantity / oldScale;
  return scaleQuantity(base, newScale);
}
