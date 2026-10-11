/**
 * Convert saved RefMeal items back into WizardState for editing.
 *
 * This reconstructs sharePercent values as the inverse of buildBreakfastWizardItems:
 * basis and topping shares are kcal shares, fat shares are parts of FAT_GRAMS_PER_PERSON
 * and drink recipe shares are their factors. Groups without saved items are restored
 * as an explicit "nothing chosen" so the steps do not refill catalog defaults.
 */
import type { MealItem } from '@/schemas/mealPlan';
import type {
  BreakfastCatalog,
  BasisSelection,
  ToppingIngredient,
  ToppingSelection,
  DrinkIngredientSelection,
  ToppingIntensity,
  WizardState,
} from '@/schemas/breakfast';
import { defaultWizardState } from '@/schemas/breakfast';
import { FAT_GRAMS_PER_PERSON, toppingWeightForIntensity } from '@/lib/breakfastCalc';
import {
  fatSelectionFromCatalog,
  noExtraDrinkSelection,
  noFatSelection,
  toppingSelectionFromCatalog,
} from '@/lib/breakfastWizardItems';

const BASIS_TAGS = ['breakfast-base', 'buffet-bread', 'buffet-cereal'];
const FAT_TAGS = ['breakfast-fat', 'buffet-fat'];
const TOPPING_TAGS = ['breakfast-topping', 'buffet-savory', 'buffet-sweet', 'buffet-cheese'];
const DRINK_INGREDIENT_TAGS = ['buffet-drink', 'breakfast-drink'];
const EXTRA_TAGS = ['breakfast-extra', 'buffet-fresh'];

function hasAnyTag(item: MealItem, tags: string[]): boolean {
  return tags.some((tag) => (item.ingredient_tags ?? []).includes(tag));
}

/** Rounded percentage shares proportional to the given weights. */
function proportionalShares(weights: number[]): number[] {
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  if (total <= 0) return weights.map(() => 0);
  return weights.map((weight) => Math.round((weight / total) * 100));
}

export function refMealItemsToWizardState(
  items: MealItem[],
  catalog: BreakfastCatalog,
  normPortions: number,
  preserveLegacyRefMealMapping = false,
): Partial<WizardState> {
  const result = defaultWizardState();

  if (items.length === 0) return result;

  // Direct ingredient MealItem.quantity is already stored per norm person in grams / portion unit.
  // We only divide if is_per_norm_person is explicitly false.
  const perPerson = (item: MealItem) => {
    const q = item.quantity ?? 0;
    if (item.is_per_norm_person === false && normPortions > 0) {
      return q / normPortions;
    }
    return q;
  };

  // ── 1. Basis items ────────────────────────────────────────────────────────
  // The wizard splits the bread kcal by share; restore kcal shares and the gram
  // amount that yields the same bread kcal. Without kcal data, fall back to grams.
  const basisItems = items.filter((i) => hasAnyTag(i, BASIS_TAGS));
  if (basisItems.length > 0) {
    const gramPerItem: { ingredientId: number; grams: number; sliceWeightG: number; energyKcal100g: number | null; name: string }[] = [];

    for (const item of basisItems) {
      if (!item.ingredient_id || !item.quantity) continue;
      const catalogIng = catalog.base_ingredients.find((b) => b.id === item.ingredient_id);
      gramPerItem.push({
        ingredientId: item.ingredient_id,
        grams: perPerson(item),
        sliceWeightG: catalogIng?.standard_recipe_weight_g ?? 70,
        energyKcal100g: catalogIng?.energy_kcal ?? null,
        name: catalogIng?.name ?? '',
      });
    }

    const totalGrams = gramPerItem.reduce((sum, entry) => sum + entry.grams, 0);
    if (totalGrams > 0) {
      const hasAllKcal = gramPerItem.every((entry) => entry.energyKcal100g != null && entry.energyKcal100g > 0);
      const kcalPerItem = gramPerItem.map((entry) => entry.grams * ((entry.energyKcal100g ?? 0) / 100));
      const shares = proportionalShares(hasAllKcal ? kcalPerItem : gramPerItem.map((entry) => entry.grams));
      const basisSelections: BasisSelection[] = gramPerItem.map((entry, index) => ({
        ingredientId: entry.ingredientId,
        name: entry.name,
        sharePercent: shares[index],
        locked: false,
        sliceWeightG: entry.sliceWeightG,
        energyKcal100g: entry.energyKcal100g,
      }));
      result.basis = basisSelections;
      const totalShare = shares.reduce((sum, share) => sum + share, 0);
      const kcalPerGram = totalShare > 0
        ? gramPerItem.reduce((sum, entry, index) => sum + (shares[index] / totalShare) * ((entry.energyKcal100g ?? 0) / 100), 0)
        : 0;
      const totalKcal = kcalPerItem.reduce((sum, kcal) => sum + kcal, 0);
      result.gramsPerPerson = Math.round(hasAllKcal && kcalPerGram > 0 ? totalKcal / kcalPerGram : totalGrams);
    }
  }

  // ── 2. Fat items ──────────────────────────────────────────────────────────
  // Fat shares are parts of FAT_GRAMS_PER_PERSON; the rest is "Kein Fett".
  const fatGramsById = new Map<number, number>();
  for (const item of items.filter((i) => hasAnyTag(i, FAT_TAGS))) {
    if (!item.ingredient_id || !item.quantity) continue;
    if (!catalog.fat_ingredients.some((f) => f.id === item.ingredient_id)) continue;
    fatGramsById.set(item.ingredient_id, (fatGramsById.get(item.ingredient_id) ?? 0) + perPerson(item));
  }
  const totalFatGrams = [...fatGramsById.values()].reduce((sum, grams) => sum + grams, 0);
  const fatScale = totalFatGrams > FAT_GRAMS_PER_PERSON ? totalFatGrams : FAT_GRAMS_PER_PERSON;
  result.fatSelections = catalog.fat_ingredients.map((fat) =>
    fatSelectionFromCatalog(fat, Math.round(((fatGramsById.get(fat.id) ?? 0) / fatScale) * 100)),
  );
  const fatSharesTotal = result.fatSelections.reduce((sum, fat) => sum + fat.sharePercent, 0);
  result.fatSelections.push(noFatSelection(Math.max(0, 100 - fatSharesTotal)));

  // ── 3. Topping items (exclude items with breakfast-fat tag — migration) ──
  const toppingItems = items.filter((i) => hasAnyTag(i, TOPPING_TAGS) && !hasAnyTag(i, FAT_TAGS));
  if (toppingItems.length > 0) {
    const toppingSelections: ToppingSelection[] = [];
    const gramPerTopping: { ingredient: ToppingIngredient; grams: number }[] = [];

    // Determine intensity from avg grams per portion
    let globalIntensity: ToppingIntensity = 'normal';
    if (toppingItems.length > 0) {
      const firstTopping = toppingItems[0];
      if (firstTopping.ingredient_id) {
        const catIng = catalog.topping_ingredients.find((t) => t.id === firstTopping.ingredient_id);
        if (catIng && firstTopping.quantity && normPortions > 0) {
          const gramsPerPerson = firstTopping.quantity / normPortions;
          const baseSelection: ToppingSelection = {
            ingredientId: catIng.id,
            name: catIng.name,
            sharePercent: 100,
            locked: false,
            energyKcal100g: catIng.energy_kcal ?? null,
            pricePerKg: catIng.price_per_kg ?? null,
            portions: catIng.portions,
          };
          const normalWeight = toppingWeightForIntensity(baseSelection, 'normal');
          if (normalWeight > 0) {
            const ratio = gramsPerPerson / normalWeight;
            if (ratio < 0.8) globalIntensity = 'knapp';
            else if (ratio > 1.3) globalIntensity = 'üppig';
          }
        }
      }
    }
    result.globalIntensity = globalIntensity;

    for (const item of toppingItems) {
      if (!item.ingredient_id || !item.quantity) continue;
      const catIng = catalog.topping_ingredients.find((t) => t.id === item.ingredient_id);
      if (!catIng) continue;
      gramPerTopping.push({ ingredient: catIng, grams: perPerson(item) });
    }

    // Topping grams come from kcal shares; restore kcal shares when every item has kcal data.
    const hasAllKcal = gramPerTopping.every(({ ingredient }) => ingredient.energy_kcal != null && ingredient.energy_kcal > 0);
    const shares = proportionalShares(gramPerTopping.map(({ ingredient, grams }) =>
      hasAllKcal ? grams * ((ingredient.energy_kcal ?? 0) / 100) : grams,
    ));
    gramPerTopping.forEach(({ ingredient }, index) => {
      toppingSelections.push(toppingSelectionFromCatalog(ingredient, shares[index]));
    });
    if (toppingSelections.some((topping) => topping.sharePercent > 0)) {
      result.toppings = toppingSelections;
    }
  }
  if (result.toppings.length === 0) {
    // No saved topping: explicit "no topping" with all catalog toppings selectable at 0 %.
    result.toppings = catalog.topping_ingredients.map((topping) => toppingSelectionFromCatalog(topping, 0));
  }

  // ── 4. Warm dishes (recipe, not drink tag) ───────────────────────────────
  const warmItems = items.filter(
    (item) => item.recipe_id && (preserveLegacyRefMealMapping ? item.recipe_type !== 'drink' : item.recipe_type === 'breakfast'),
  );
  for (const item of warmItems) {
    if (!item.recipe_id) continue;
    result.warmDishRecipeIds.push(item.recipe_id);
    result.warmDishFactors[String(item.recipe_id)] = item.factor ?? 1.0;
    if (item.recipe_title) {
      result.warmDishRecipeNames[String(item.recipe_id)] = item.recipe_title;
    }
  }

  // ── 5. Drink items (recipe_type drink) ────────────────────────────────────
  // The saved factor is share / 100; the rest is "Kein Extra Getränk".
  const drinkItems = items.filter((i) => i.recipe_id && i.recipe_type === 'drink');
  const totalFactor = drinkItems.reduce((sum, item) => sum + (item.factor ?? 1.0), 0);
  const factorScale = totalFactor > 1 ? totalFactor : 1;
  result.drinkRecipes = drinkItems.map((item) => ({
    recipeId: item.recipe_id ?? 0,
    name: item.recipe_title || (catalog.drink_recipes.find((recipe) => recipe.id === item.recipe_id)?.title ?? `Rezept #${item.recipe_id}`),
    sharePercent: Math.round(((item.factor ?? 1.0) / factorScale) * 100),
    locked: false,
    energyKcal: catalog.drink_recipes.find((recipe) => recipe.id === item.recipe_id)?.cached_energy_total_kcal ?? null,
  }));
  if (drinkItems.length === 0) {
    result.drinkRecipes = catalog.drink_recipes.map((recipe) => ({
      recipeId: recipe.id,
      name: recipe.title,
      sharePercent: 0,
      locked: false,
      energyKcal: recipe.cached_energy_total_kcal,
    }));
  }
  const drinkSharesTotal = result.drinkRecipes.reduce((sum, drink) => sum + drink.sharePercent, 0);
  result.drinkRecipes.push(noExtraDrinkSelection(Math.max(0, 100 - drinkSharesTotal)));

  // ── 6. Drink ingredients (milk, juices) ──────────────────────────────────
  const drinkIngredientItems = preserveLegacyRefMealMapping
    ? []
    : items.filter((item) => item.ingredient_id && hasAnyTag(item, DRINK_INGREDIENT_TAGS));
  if (drinkIngredientItems.length > 0) {
    const drinkAmounts = drinkIngredientItems.map((item) => ({ item, amount: perPerson(item) }));
    const totalMl = drinkAmounts.reduce((sum, entry) => sum + entry.amount, 0);
    result.drinkIngredients = drinkAmounts.map(({ item, amount }) => ({
      ingredientId: item.ingredient_id ?? 0,
      name: item.ingredient_name,
      sharePercent: totalMl > 0 ? Math.round((amount / totalMl) * 100) : 0,
      locked: false,
      mlPerPerson: amount,
    } satisfies DrinkIngredientSelection));
  }

  // ── 7. Extra ingredients ──────────────────────────────────────────────────
  // Direct mode: tagged extras plus assistant items no other group claims
  // (freely searched extras without catalog tags).
  const extraItems = items.filter((item) => {
    if (!item.ingredient_id) return false;
    const claimedByGroup = hasAnyTag(item, [...BASIS_TAGS, ...FAT_TAGS, ...TOPPING_TAGS]);
    if (preserveLegacyRefMealMapping) return !claimedByGroup;
    if (hasAnyTag(item, EXTRA_TAGS)) return true;
    return item.is_breakfast_assistant && !claimedByGroup && !hasAnyTag(item, DRINK_INGREDIENT_TAGS);
  });
  for (const item of extraItems) {
    if (!item.ingredient_id || !item.quantity) continue;
    const key = String(item.ingredient_id);
    const catalogExtra = catalog.extra_ingredients.find((extra) => extra.id === item.ingredient_id);
    const catalogPortion = catalogExtra?.portions.find((portion) => portion.id === item.portion_id);
    const quantity = perPerson(item);
    const weightG = catalogPortion?.weight_g
      ?? (item.quantity_g != null && item.quantity > 0 ? item.quantity_g / item.quantity : null);
    result.extraIngredients[key] = Math.round(
      item.quantity_g ?? (weightG != null ? quantity * weightG : item.portion_id ? 0 : quantity),
    );
    const ingredientName = item.ingredient_name || catalogExtra?.name;
    if (ingredientName) result.extraIngredientNames[key] = ingredientName;
    if (item.portion_id) {
      result.extraIngredientSelections[key] = {
        portionId: item.portion_id,
        measuringUnitId: item.measuring_unit_id ?? catalogPortion?.measuring_unit_id ?? null,
        portionName: item.portion_name || catalogPortion?.name || item.measuring_unit_name,
        measuringUnitName: item.measuring_unit_name || null,
        quantity,
        weightG,
      };
    }
  }

  return result;
}
