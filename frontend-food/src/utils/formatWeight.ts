/**
 * Format a weight in grams for German-locale display.
 *
 * Tiers (mirrors backend supply.utils.format_weight):
 * - < 1g    → mg  (e.g. "300 mg")
 * - 1–49g   → 1g steps (e.g. "12 g")
 * - 50–99g  → 5g steps (e.g. "55 g")
 * - 100–999g → 10g steps (e.g. "150 g")
 * - >= 1000g → kg with 1 decimal, German comma (e.g. "1,5 kg")
 */
export function formatWeight(grams: number): string {
  if (grams <= 0) return '0 g';
  if (grams < 1) {
    const mg = Math.round(grams * 1000);
    return `${mg} mg`;
  }
  if (grams >= 1000) {
    const kg = grams / 1000;
    // German locale: always 1 decimal place
    return `${kg.toFixed(1).replace('.', ',')} kg`;
  }
  if (grams >= 100) {
    const rounded = Math.round(grams / 10) * 10;
    return `${rounded} g`;
  }
  if (grams >= 50) {
    const rounded = Math.round(grams / 5) * 5;
    return `${rounded} g`;
  }
  return `${Math.round(grams)} g`;
}
