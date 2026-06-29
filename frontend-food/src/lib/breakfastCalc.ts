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

import type { BasisSelection, ToppingSelection, WizardState, ToppingIntensity } from '@/schemas/breakfast';

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
// Getränke-kcal (aus Rezept-Cache, nicht aus Konstanten)
// ============================================================================

/** Minimal recipe data needed for kcal calculation. */
export interface RecipeEnergyData {
  cached_energy_kcal: number | null;
  portions: number | null;
}

/**
 * Total kcal per person from selected drink recipes.
 *
 * Each drink recipe contributes:
 *   kcal_per_serving = cached_energy_kcal  (already per-recipe-portion)
 *   contribution = kcal_per_serving × factor
 *
 * `recipeDataMap` is keyed by recipe id and must include the recipes
 * referenced in `state.drinkRecipeIds`.
 */
export function drinkKcalFromRecipes(
  state: WizardState,
  recipeDataMap: Map<number, RecipeEnergyData>,
): number {
  let kcal = 0;
  for (const id of state.drinkRecipeIds) {
    const data = recipeDataMap.get(id);
    if (!data?.cached_energy_kcal) continue;
    const factor = state.drinkFactors[String(id)] ?? 1.0;
    kcal += data.cached_energy_kcal * factor;
  }
  return kcal;
}

/**
 * Estimated kcal per person from Extras (warm dishes + Gemüse).
 * Currently returns 0 — wizard state lacks kcal data for recipes/extra-ingredients.
 * Kept as placeholder for when recipe-kcal data becomes available in wizard state.
 */
export function extrasKcalPerPerson(_state: WizardState): number {
  return 0;
}

// ============================================================================
// Normalisieren (scale to target kcal)
// ============================================================================

/**
 * Scale BE per person so that total kcal per person hits target.
 * Only basis + toppings are scaled; drinks and extras (warm dishes, Gemüse) stay fixed.
 *
 * target = NORM_PERSON_DAILY_KCAL × dayPartFactor
 * extraKcal = kcal from warm dishes + Gemüse (not recalculated here, fixed)
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

  const currentBasis = basisKcalPerPerson(state.bePerPerson, state.basis);
  const currentTopping = toppingKcalPerPerson(
    state.bePerPerson,
    state.toppings,
    state.globalIntensity,
  );
  const currentTotal = currentBasis + currentTopping;
  if (currentTotal <= 0) return state.bePerPerson;

  const scaleFactor = remaining / currentTotal;
  const rawBe = state.bePerPerson * scaleFactor;
  return Math.max(1, Math.round(rawBe * 2) / 2);
}

// ============================================================================
// Slider Auto-Rebalance
// ============================================================================

/**
 * Update one slider value and rebalance all unlocked others proportionally
 * so the total stays at exactly 100%.
 *
 * Uses the Largest Remainder Method to distribute integer shares without
 * rounding drift (avoids sum ≠ 100 that Math.round per-item would cause).
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

  const unlockedIndices = updated
    .map((_item, i) => i)
    .filter((i) => !updated[i].locked && i !== changedIndex);

  if (unlockedIndices.length === 0) return updated;

  const unlockedTotal = unlockedIndices.reduce((s, i) => s + updated[i].sharePercent, 0);

  // Largest Remainder Method: compute exact proportions, floor them, then
  // distribute the leftover integers to items with the largest fractional parts.
  const proportions = unlockedIndices.map((i) => {
    const proportion = unlockedTotal > 0 ? updated[i].sharePercent / unlockedTotal : 1 / unlockedIndices.length;
    return { index: i, exact: proportion * remaining };
  });

  const floored = proportions.map((p) => ({ ...p, floor: Math.floor(p.exact), frac: p.exact - Math.floor(p.exact) }));
  const flooredSum = floored.reduce((s, p) => s + p.floor, 0);
  let leftover = remaining - flooredSum;

  // Sort by descending fractional part to assign the leftover integers
  const sorted = [...floored].sort((a, b) => b.frac - a.frac);
  const bonusSet = new Set(sorted.slice(0, leftover).map((p) => p.index));

  const shareMap = new Map<number, number>(
    floored.map((p) => [p.index, p.floor + (bonusSet.has(p.index) ? 1 : 0)]),
  );

  return updated.map((item, i) => {
    if (item.locked || i === changedIndex) return item;
    return { ...item, sharePercent: shareMap.get(i) ?? item.sharePercent };
  });
}

// ============================================================================
// Summary helpers
// ============================================================================

/**
 * Total kcal per person from basis + toppings + drinks + extras.
 *
 * @param recipeDataMap  Optional map of recipe id → energy data for drink/extra recipes.
 *                       When omitted, drink kcal contribution is 0.
 */
export function totalKcalPerPerson(
  state: WizardState,
  recipeDataMap?: Map<number, RecipeEnergyData>,
): number {
  const basis = basisKcalPerPerson(state.bePerPerson, state.basis);
  const topping = toppingKcalPerPerson(state.bePerPerson, state.toppings, state.globalIntensity);
  const drinks = recipeDataMap ? drinkKcalFromRecipes(state, recipeDataMap) : 0;
  const extras = extrasKcalPerPerson(state);
  return basis + topping + drinks + extras;
}

/** Energy target per person for a given day_part_factor. */
export function energyTargetKcal(dayPartFactor: number): number {
  return NORM_PERSON_DAILY_KCAL * dayPartFactor;
}
