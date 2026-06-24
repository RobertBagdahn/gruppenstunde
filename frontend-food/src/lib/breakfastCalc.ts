/**
 * Breakfast Wizard calculation utilities.
 *
 * Conventions:
 *   1 BE (Broteinheit) = 1 belegbare Fläche
 *   1 Scheibe = 1 BE  |  ½ Brötchen = 1 BE  |  1 ganzes Brötchen = 2 BE
 *   1 Belag-Portion deckt genau 1 BE unabhängig von Intensität
 *
 * Energy norm: NORM_PERSON_DAILY_KCAL (2335 kcal, kept in sync with backend constant)
 */

import type { BasisSelection, ToppingSelection, DrinkState, WizardState, ToppingIntensity } from '@/schemas/breakfast';

export const NORM_PERSON_DAILY_KCAL = 2335;

// ============================================================================
// BE ↔ Gramm ↔ kcal
// ============================================================================

/**
 * Total grams of bread per person for a given BE count, averaged over sorted
 * basis types weighted by their share.
 */
export function beToGrams(bePerPerson: number, basis: BasisSelection[]): number {
  if (basis.length === 0) return 0;
  const totalShare = basis.reduce((s, b) => s + b.sharePercent, 0);
  if (totalShare === 0) return 0;
  // Weighted average of slice weights
  const avgSliceG = basis.reduce(
    (sum, b) => sum + b.sliceWeightG * (b.sharePercent / totalShare),
    0,
  );
  return bePerPerson * avgSliceG;
}

/**
 * Total kcal per person from basis bread items.
 */
export function basisKcalPerPerson(bePerPerson: number, basis: BasisSelection[]): number {
  let kcal = 0;
  const totalShare = basis.reduce((s, b) => s + b.sharePercent, 0);
  if (totalShare === 0) return 0;
  for (const b of basis) {
    if (!b.energyKcal100g) continue;
    const shareWeight = b.sliceWeightG * bePerPerson * (b.sharePercent / totalShare);
    kcal += (b.energyKcal100g / 100) * shareWeight;
  }
  return kcal;
}

/**
 * Find the Belag portion weight for the given intensity level.
 * Falls back to the default portion weight if intensity not found.
 */
export function toppingWeightForIntensity(
  topping: ToppingSelection,
  intensity: ToppingIntensity,
): number {
  const nameMap: Record<ToppingIntensity, string> = {
    knapp: 'Belag knapp',
    normal: 'Belag normal',
    üppig: 'Belag üppig',
  };
  const desired = nameMap[intensity];
  const portion =
    topping.portions.find((p) => p.name === desired) ??
    topping.portions.find((p) => p.is_default) ??
    topping.portions[0];
  return portion?.weight_g ?? 0;
}

/**
 * Total kcal per person from toppings.
 * Each topping covers bePerPerson BE, weighted by sharePercent.
 */
export function toppingKcalPerPerson(
  bePerPerson: number,
  toppings: ToppingSelection[],
  intensity: ToppingIntensity,
): number {
  let kcal = 0;
  const totalShare = toppings.reduce((s, t) => s + t.sharePercent, 0);
  if (totalShare === 0) return 0;
  for (const t of toppings) {
    if (!t.energyKcal100g) continue;
    const beForTopping = bePerPerson * (t.sharePercent / totalShare);
    const weightG = toppingWeightForIntensity(t, intensity) * beForTopping;
    kcal += (t.energyKcal100g / 100) * weightG;
  }
  return kcal;
}

/**
 * Total grams per person of a topping (averaged over BE share).
 */
export function toppingGramsPerPerson(
  bePerPerson: number,
  topping: ToppingSelection,
  intensity: ToppingIntensity,
  allToppings: ToppingSelection[],
): number {
  const totalShare = allToppings.reduce((s, t) => s + t.sharePercent, 0);
  if (totalShare === 0) return 0;
  const beForTopping = bePerPerson * (topping.sharePercent / totalShare);
  return toppingWeightForIntensity(topping, intensity) * beForTopping;
}

// ============================================================================
// Belag-Deckungs-Check
// ============================================================================

/**
 * Returns the fraction of BE actually covered by toppings (0.0–1.0+).
 * Should be ~1.0 when topping shares sum to 100%.
 */
export function belagCoverageRatio(toppings: ToppingSelection[]): number {
  const total = toppings.reduce((s, t) => s + t.sharePercent, 0);
  return total / 100;
}

/** True if toppings cover at least 95% of BE (allows minor rounding). */
export function isBelagCovered(toppings: ToppingSelection[]): boolean {
  return belagCoverageRatio(toppings) >= 0.95;
}

// ============================================================================
// Milch-Merge
// ============================================================================

/**
 * Total milk ml per person across all hot drinks.
 * Coffee: coffeeMilkMlPerPerson × coffeeShare
 * Cocoa:  cocoaMilkMlPerPerson × cocoaShare
 */
export function totalMilkMlPerPerson(drinks: DrinkState): number {
  const { coffeePercent, cocoaPercent, coffeeMilkMlPerPerson, cocoaMilkMlPerPerson } = drinks;
  const coffeeShare = coffeePercent / 100;
  const cocoaShare = cocoaPercent / 100;
  return coffeeMilkMlPerPerson * coffeeShare + cocoaMilkMlPerPerson * cocoaShare;
}

// ============================================================================
// Normalisieren (scale to target kcal)
// ============================================================================

/**
 * Scale BE per person so that total kcal per person hits target.
 * Only basis + toppings are scaled; Extras (warm dishes, vegetables) stay fixed.
 *
 * target = NORM_PERSON_DAILY_KCAL × dayPartFactor
 * extraKcal = kcal from warm dishes (comes from recipe cache, not recalculated here)
 *
 * Returns the new bePerPerson (rounded to 0.5).
 */
export function normalizeBePerPerson(
  state: WizardState,
  dayPartFactor: number,
  extraKcalPerPerson: number = 0,
): number {
  const target = NORM_PERSON_DAILY_KCAL * dayPartFactor;
  const remaining = target - extraKcalPerPerson;
  if (remaining <= 0) return state.bePerPerson;

  // Current kcal from basis + toppings
  const currentBasis = basisKcalPerPerson(state.bePerPerson, state.basis);
  const currentTopping = toppingKcalPerPerson(
    state.bePerPerson,
    state.toppings,
    state.globalIntensity,
  );
  const currentTotal = currentBasis + currentTopping;
  if (currentTotal <= 0) return state.bePerPerson;

  // Linear scale: new_be = old_be × (remaining / currentTotal)
  const scaleFactor = remaining / currentTotal;
  const rawBe = state.bePerPerson * scaleFactor;
  // Round to nearest 0.5 BE
  return Math.max(1, Math.round(rawBe * 2) / 2);
}

// ============================================================================
// Slider Auto-Rebalance
// ============================================================================

/**
 * Update one slider value and rebalance all unlocked others proportionally
 * so the total stays at 100%.
 *
 * @param items   Array of items with sharePercent and locked
 * @param changedIndex  Which item was changed
 * @param newValue  The new value for that item (0–100)
 */
export function rebalanceShares<T extends { sharePercent: number; locked: boolean }>(
  items: T[],
  changedIndex: number,
  newValue: number,
): T[] {
  const updated = items.map((item, i) =>
    i === changedIndex ? { ...item, sharePercent: newValue } : item,
  );

  const lockedTotal = updated
    .filter((item, i) => item.locked || i === changedIndex)
    .reduce((s, item) => s + item.sharePercent, 0);

  const remaining = Math.max(0, 100 - lockedTotal);

  const unlocked = updated.filter((item, i) => !item.locked && i !== changedIndex);
  if (unlocked.length === 0) return updated;

  const unlockedTotal = unlocked.reduce((s, item) => s + item.sharePercent, 0);

  return updated.map((item, i) => {
    if (item.locked || i === changedIndex) return item;
    const proportion = unlockedTotal > 0 ? item.sharePercent / unlockedTotal : 1 / unlocked.length;
    return { ...item, sharePercent: Math.round(proportion * remaining) };
  });
}

// ============================================================================
// Summary helpers
// ============================================================================

/** Total kcal per person from basis + toppings + drinks (approximation). */
export function totalKcalPerPerson(state: WizardState): number {
  const basis = basisKcalPerPerson(state.bePerPerson, state.basis);
  const topping = toppingKcalPerPerson(state.bePerPerson, state.toppings, state.globalIntensity);
  // Drinks: roughly 150 kcal for full cocoa, less for coffee/tea
  const drinks = state.drinks.cocoaPercent * 0.015 * state.drinks.mlPerPerson;
  return basis + topping + drinks;
}

/** Energy target per person for a given day_part_factor. */
export function energyTargetKcal(dayPartFactor: number): number {
  return NORM_PERSON_DAILY_KCAL * dayPartFactor;
}
