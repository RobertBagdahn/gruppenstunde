/**
 * Breakfast Wizard calculation utilities.
 *
 * All gram amounts are derived from the kcal target (day_part_factor × NORM_PERSON_DAILY_KCAL)
 * and the kcal density of each ingredient. No BE (Broteinheit) concept.
 *
 * Energy norm: NORM_PERSON_DAILY_KCAL (2335 kcal, kept in sync with backend constant)
 */

import type { BasisSelection, ToppingSelection, FatSelection, WizardState, ToppingIntensity } from '@/schemas/breakfast';

export const NORM_PERSON_DAILY_KCAL = 2335;

/** Fixed grams per person for Streichfett (spread fat). */
export const FAT_GRAMS_PER_PERSON = 8;

// ============================================================================
// Kcal distribution between bread and toppings
// ============================================================================

/**
 * How much kcal is available for bread + toppings combined,
 * after subtracting fixed kcal (extras, warm dishes).
 */
export function distributableKcal(dayPartFactor: number, fixKcal: number): number {
  return Math.max(0, NORM_PERSON_DAILY_KCAL * dayPartFactor - fixKcal);
}

/**
 * Compute Streichfett kcal for the given fat selections.
 * "Kein Fett" (ingredientId=0) contributes 0 kcal.
 */
export function computeFatKcal(fats: FatSelection[]): number {
  let kcal = 0;
  for (const f of fats) {
    if (f.ingredientId === 0) continue;
    const grams = (f.sharePercent / 100) * FAT_GRAMS_PER_PERSON;
    kcal += grams * ((f.energyKcal100g ?? 0) / 100);
  }
  return kcal;
}

/**
 * Split distributable kcal between bread, fat, and topping groups.
 * Bread Kcal is fixed from gramsPerPerson × weighted kcal density.
 * Fat Kcal is fixed from fatSelections × FAT_GRAMS_PER_PERSON.
 * Topping Kcal gets the remainder.
 */
export function computeGroupKcal(
  basis: BasisSelection[],
  _toppings: ToppingSelection[],
  fats: FatSelection[],
  gramsPerPerson: number,
  dayPartFactor: number,
  fixKcal: number,
): { breadKcal: number; fatKcal: number; toppingKcal: number } {
  const total = distributableKcal(dayPartFactor, fixKcal);

  // Bread Kcal: fixed from gramsPerPerson × weighted kcal density
  const totalBasisShare = basis.reduce((s, b) => s + b.sharePercent, 0);
  let breadKcal = 0;
  if (totalBasisShare > 0) {
    for (const b of basis) {
      if (b.sharePercent <= 0 || !b.energyKcal100g) continue;
      const grams = gramsPerPerson * (b.sharePercent / totalBasisShare);
      breadKcal += grams * (b.energyKcal100g / 100);
    }
  }

  // Fat Kcal
  const fatKcal = computeFatKcal(fats);

  // Topping Kcal = remaining
  const toppingKcal = Math.max(0, total - breadKcal - fatKcal);

  return { breadKcal, fatKcal, toppingKcal };
}

// ============================================================================
// Per-item gram helpers
// ============================================================================

/** Grams for one bread item from its share and kcal density. */
export function breadItemGrams(
  sharePercent: number,
  totalShare: number,
  groupKcal: number,
  energyKcal100g: number | null,
): number {
  if (!energyKcal100g || totalShare <= 0 || groupKcal <= 0) return 0;
  const itemKcal = groupKcal * (sharePercent / totalShare);
  return itemKcal / (energyKcal100g / 100);
}

/** Grams for one topping item from its share, intensity, and kcal density. */
export function toppingItemGrams(
  sharePercent: number,
  totalShare: number,
  groupKcal: number,
  energyKcal100g: number | null,
): number {
  if (!energyKcal100g || totalShare <= 0 || groupKcal <= 0) return 0;
  const itemKcal = groupKcal * (sharePercent / totalShare);
  return itemKcal / (energyKcal100g / 100);
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

// ============================================================================
// ============================================================================
// Getränke-kcal (aus Rezept-Cache, nicht aus Konstanten)
// ============================================================================

/** Minimal recipe data needed for kcal calculation. */
export interface RecipeEnergyData {
  cached_energy_total_kcal: number | null;
  cached_weight_g: number | null;
  portions: number | null;
}

/**
 * Total kcal per person from selected drink recipes.
 *
 * Each drink recipe contributes:
 *   kcal_per_serving = cached_energy_total_kcal  (total energy for recipe)
 *   contribution = kcal_per_serving × factor
 *
 * `recipeDataMap` is keyed by recipe id and must include the recipes
 * referenced in `state.drinkRecipeIds`.
 */
export function drinkKcalFromRecipes(
  state: WizardState,
  _recipeDataMap: Map<number, RecipeEnergyData>,
): number {
  let kcal = 0;
  for (const drink of state.drinkRecipes.filter((d) => d.sharePercent > 0 && d.recipeId > 0)) {
    const energyKcal = drink.energyKcal ?? 0;
    kcal += energyKcal * (drink.sharePercent / 100);
  }
  return kcal;
}

/**
 * Kcal per person from warm-dish recipes.
 *
 * `recipeDataMap` is keyed by recipe id and contains the energy data for each recipe.
 * Each recipe's contribution is: cached_energy_total_kcal × factor.
 */
export function warmDishKcalFromRecipes(
  state: WizardState,
  recipeDataMap: Map<number, RecipeEnergyData>,
): number {
  let kcal = 0;
  for (const id of state.warmDishRecipeIds) {
    const data = recipeDataMap.get(id);
    if (!data?.cached_energy_total_kcal) continue;
    const factor = state.warmDishFactors[String(id)] ?? 1.0;
    kcal += data.cached_energy_total_kcal * factor;
  }
  return kcal;
}

/**
 * Kcal per person from extra ingredients (fetched from backend).
 * `kcalMap` maps ingredient_id → energy_kcal (already scaled to quantity_g).
 */
export function extraIngredientsKcal(kcalMap: Map<number, number>): number {
  let total = 0;
  for (const kcal of kcalMap.values()) {
    total += kcal;
  }
  return total;
}

/**
 * Total kcal per person from Extras (warm dishes + Gemüse).
 * Pass recipeDataMap for warm dishes and kcalMap for extra ingredients.
 */
export function extrasKcalPerPerson(
  state: WizardState,
  recipeDataMap?: Map<number, RecipeEnergyData>,
  ingredientKcalMap?: Map<number, number>,
): number {
  const warmKcal = recipeDataMap ? warmDishKcalFromRecipes(state, recipeDataMap) : 0;
  const extraKcal = ingredientKcalMap ? extraIngredientsKcal(ingredientKcalMap) : 0;
  return warmKcal + extraKcal;
}

// ============================================================================
// Total kcal per person
// ============================================================================

/** Total kcal per person from basis + fats + toppings + extras. */
export function totalKcalPerPerson(
  basis: BasisSelection[],
  toppings: ToppingSelection[],
  fats: FatSelection[],
  gramsPerPerson: number,
  dayPartFactor: number,
  fixKcal: number,
): number {
  const { breadKcal, fatKcal, toppingKcal } = computeGroupKcal(basis, toppings, fats, gramsPerPerson, dayPartFactor, fixKcal);
  return breadKcal + fatKcal + toppingKcal + fixKcal;
}

/** Energy target per person for a given day_part_factor. */
export function energyTargetKcal(dayPartFactor: number): number {
  return NORM_PERSON_DAILY_KCAL * dayPartFactor;
}

// ============================================================================
// Normalize — scale quantities to hit target
// ============================================================================

/**
 * Compute a scale factor that, when applied to topping quantities,
 * brings total kcal to the target.
 * Bread Kcal and Fat Kcal are fixed — only toppings get scaled.
 * Returns 1.0 if already at target or scale would be meaningless.
 */
export function normalizeScale(
  basis: BasisSelection[],
  toppings: ToppingSelection[],
  fats: FatSelection[],
  gramsPerPerson: number,
  dayPartFactor: number,
  fixKcal: number,
): number {
  const { breadKcal, fatKcal, toppingKcal } = computeGroupKcal(basis, toppings, fats, gramsPerPerson, dayPartFactor, fixKcal);
  const currentTotal = breadKcal + fatKcal + toppingKcal;
  if (currentTotal <= 0) return 1.0;
  const target = NORM_PERSON_DAILY_KCAL * dayPartFactor - fixKcal;
  if (target <= 0) return 1.0;
  // Scale only the topping portion to hit target
  const targetTopping = Math.max(0, target - breadKcal - fatKcal);
  if (toppingKcal <= 0) return targetTopping > 0 ? 1.0 : 1.0;
  return Math.max(0.5, Math.min(2.0, targetTopping / toppingKcal));
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
  const leftover = remaining - flooredSum;

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
