/**
 * Breakfast wizard selections and the MealItems saved from them.
 *
 * Selection lists use one convention for "nothing chosen yet" versus
 * "explicitly nothing": an empty list means the step has not been initialised
 * and may fill in catalog defaults; a non-empty list whose real items are all
 * at 0 % (fats: "Kein Fett" at 100 %, drink recipes: "Kein Extra Getränk" at
 * 100 %) is an explicit choice and must never be replaced by defaults.
 */
import type {
  BreakfastCatalog,
  DrinkRecipeSelection,
  FatIngredient,
  FatSelection,
  ToppingIngredient,
  ToppingSelection,
  WizardItemIn,
  WizardState,
} from '@/schemas/breakfast';
import {
  FAT_GRAMS_PER_PERSON,
  breadItemGrams,
  computeGroupKcal,
  extrasKcalPerPerson,
  toppingItemGrams,
} from '@/lib/breakfastCalc';

/** Virtual selection id for "Kein Fett" / "Kein Extra Getränk". */
export const NO_SELECTION_ID = 0;

/** Share of the first fat when fat defaults are applied; "Kein Fett" gets the rest. */
export const DEFAULT_FIRST_FAT_SHARE_PERCENT = 50;

export function noFatSelection(sharePercent: number): FatSelection {
  return {
    ingredientId: NO_SELECTION_ID,
    name: 'Kein Fett',
    sharePercent,
    locked: false,
    energyKcal100g: 0,
    pricePerKg: 0,
    portions: [],
  };
}

export function noExtraDrinkSelection(sharePercent: number): DrinkRecipeSelection {
  return {
    recipeId: NO_SELECTION_ID,
    name: 'Kein Extra Getränk',
    sharePercent,
    locked: false,
    energyKcal: 0,
  };
}

export function fatSelectionFromCatalog(item: FatIngredient, sharePercent: number): FatSelection {
  return {
    ingredientId: item.id,
    name: item.name,
    sharePercent,
    locked: false,
    energyKcal100g: item.energy_kcal,
    pricePerKg: item.price_per_kg,
    portions: item.portions,
  };
}

export function toppingSelectionFromCatalog(item: ToppingIngredient, sharePercent: number): ToppingSelection {
  return {
    ingredientId: item.id,
    name: item.name,
    sharePercent,
    locked: false,
    energyKcal100g: item.energy_kcal,
    pricePerKg: item.price_per_kg,
    portions: item.portions,
  };
}

/**
 * Fat sliders for all given fats plus "Kein Fett".
 * The fat with `activeFatId` gets `activeSharePercent`, "Kein Fett" the remainder.
 * Without an active fat, "Kein Fett" is at 100 % (explicitly no fat).
 */
export function fatSelectionsWithNoFat(
  fats: FatIngredient[],
  activeFatId: number | null,
  activeSharePercent = DEFAULT_FIRST_FAT_SHARE_PERCENT,
): FatSelection[] {
  const hasActiveFat = activeFatId != null && fats.some((fat) => fat.id === activeFatId);
  return [
    ...fats.map((fat) => fatSelectionFromCatalog(fat, hasActiveFat && fat.id === activeFatId ? activeSharePercent : 0)),
    noFatSelection(hasActiveFat ? 100 - activeSharePercent : 100),
  ];
}

/**
 * Build the MealItems for a wizard state.
 *
 * Storage model:
 * - quantity = grams per person (derived from kcal target + kcal density)
 * - measuring_unit = gram unit (ml for drink ingredients)
 * - extras with a chosen portion keep portion, unit and amount
 * - factor = 1.0 for ingredients (backend multiplies by effective portions)
 */
export function buildBreakfastWizardItems(
  state: WizardState,
  catalog: BreakfastCatalog | undefined,
  dayPartFactor: number,
): WizardItemIn[] {
  const gramUnitId = catalog?.gram_measuring_unit_id ?? null;
  const mlUnitId = catalog?.ml_measuring_unit_id ?? null;

  const fixKcal = extrasKcalPerPerson(state);
  const { breadKcal, toppingKcal } = computeGroupKcal(state.basis, state.toppings, state.fatSelections, state.gramsPerPerson, dayPartFactor, fixKcal);
  const basisTotalShare = state.basis.reduce((s, b) => s + b.sharePercent, 0);
  const toppingTotalShare = state.toppings.reduce((s, t) => s + t.sharePercent, 0);

  // Accumulate ingredient items in grams for dedup
  const ingGrams: Record<number, number> = {};
  const ingMilliliters: Record<number, number> = {};
  const recipeItems: WizardItemIn[] = [];

  // ── Basis (bread) ──
  for (const b of state.basis.filter((b) => b.sharePercent > 0)) {
    const grams = breadItemGrams(b.sharePercent, basisTotalShare, breadKcal, b.energyKcal100g);
    if (grams <= 0) continue;
    ingGrams[b.ingredientId] = (ingGrams[b.ingredientId] ?? 0) + grams;
  }

  // ── Streichfett ──
  for (const f of state.fatSelections.filter((f) => f.sharePercent > 0 && f.ingredientId > 0)) {
    const grams = (f.sharePercent / 100) * FAT_GRAMS_PER_PERSON;
    ingGrams[f.ingredientId] = (ingGrams[f.ingredientId] ?? 0) + grams;
  }

  // ── Belag (toppings) ──
  for (const t of state.toppings.filter((t) => t.sharePercent > 0)) {
    if (toppingTotalShare <= 0) continue;
    const grams = toppingItemGrams(t.sharePercent, toppingTotalShare, toppingKcal, t.energyKcal100g);
    if (grams <= 0) continue;
    ingGrams[t.ingredientId] = (ingGrams[t.ingredientId] ?? 0) + grams;
  }

  // ── Warme Gerichte ──
  for (const recipeId of state.warmDishRecipeIds) {
    recipeItems.push({
      recipe_id: recipeId,
      factor: state.warmDishFactors[String(recipeId)] ?? 1.0,
    });
  }

  // ── Extras (vegetables, garnish) — may overlap with basis/topping ──
  const gramsBeforeExtras = { ...ingGrams };
  for (const [ingId, grams] of Object.entries(state.extraIngredients)) {
    const id = Number(ingId);
    const selection = state.extraIngredientSelections[ingId];
    if (grams <= 0 && !selection) continue;
    ingGrams[id] = (ingGrams[id] ?? 0) + grams;
  }

  // ── Getränke-Rezepte ──
  for (const drink of state.drinkRecipes.filter((d) => d.sharePercent > 0 && d.recipeId > 0)) {
    recipeItems.push({
      recipe_id: drink.recipeId,
      factor: drink.sharePercent / 100,
    });
  }

  // ── Milch & Säfte (drink ingredients — milk, juices) ──
  for (const ingredient of state.drinkIngredients.filter((d) => d.sharePercent > 0 && d.ingredientId > 0)) {
    const ml = ingredient.mlPerPerson ?? 0;
    if (ml <= 0) continue;
    ingMilliliters[ingredient.ingredientId] = (ingMilliliters[ingredient.ingredientId] ?? 0) + ml;
  }

  // ── Post-process: push accumulated ingredients (in grams) + recipe items ──
  const out: WizardItemIn[] = [];
  for (const [ingIdStr, grams] of Object.entries(ingGrams)) {
    const ingId = Number(ingIdStr);
    const selection = state.extraIngredientSelections[ingIdStr];
    const canKeepSelectedPortion = Boolean(selection && (gramsBeforeExtras[ingId] ?? 0) <= 0);
    if (grams <= 0 && !canKeepSelectedPortion) continue;
    if (canKeepSelectedPortion && selection) {
      out.push({
        ingredient_id: ingId,
        quantity: selection.quantity,
        measuring_unit_id: selection.measuringUnitId ?? undefined,
        portion_id: selection.portionId,
        factor: 1.0,
      });
    } else {
      out.push({
        ingredient_id: ingId,
        quantity: Math.round(grams * 10) / 10,
        measuring_unit_id: gramUnitId,
        factor: 1.0,
      });
    }
  }
  for (const [ingIdStr, milliliters] of Object.entries(ingMilliliters)) {
    if (milliliters <= 0) continue;
    out.push({
      ingredient_id: Number(ingIdStr),
      quantity: Math.round(milliliters * 10) / 10,
      measuring_unit_id: mlUnitId,
      factor: 1.0,
    });
  }
  out.push(...recipeItems);
  return out;
}
