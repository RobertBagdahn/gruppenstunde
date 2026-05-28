/**
 * Format a weight in grams for display.
 *
 * Rules:
 * - >= 1000g -> kg with 1 decimal (e.g. "1.5 kg")
 * - >= 1g and < 1000g -> integer grams (e.g. "350 g")
 * - < 1g -> 1 decimal place (e.g. "0.5 g")
 */
export function formatWeight(grams: number): string {
  if (grams >= 1000) {
    const kg = grams / 1000;
    return `${kg.toFixed(1)} kg`;
  }
  if (grams >= 1) {
    return `${Math.round(grams)} g`;
  }
  return `${grams.toFixed(1)} g`;
}
