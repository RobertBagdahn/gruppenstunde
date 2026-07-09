/**
 * Convert saved RefMeal items back into WizardState for editing.
 *
 * This reconstructs sharePercent values from gram quantities.
 * The wizard will then derive absolute grams from the kcal target + distribution.
 */
import type { MealItem } from '@/schemas/mealPlan';
import type {
  BreakfastCatalog,
  BasisSelection,
  FatSelection,
  ToppingSelection,
  ToppingIntensity,
  WizardState,
} from '@/schemas/breakfast';
import { defaultWizardState } from '@/schemas/breakfast';
import { toppingWeightForIntensity } from '@/lib/breakfastCalc';

export function refMealItemsToWizardState(
  items: MealItem[],
  catalog: BreakfastCatalog,
  normPortions: number,
): Partial<WizardState> {
  const result = defaultWizardState();

  if (items.length === 0) return result;

  const perPerson = (total: number) => (normPortions > 0 ? total / normPortions : total);

  // ── 1. Basis items ────────────────────────────────────────────────────────
  const basisItems = items.filter((i) => (i.ingredient_tags ?? []).includes('breakfast-base'));
  if (basisItems.length > 0) {
    const basisSelections: BasisSelection[] = [];
    let totalGrams = 0;
    const gramPerItem: { ingredientId: number; grams: number; sliceWeightG: number }[] = [];

    for (const item of basisItems) {
      if (!item.ingredient_id || !item.quantity) continue;
      const catalogIng = catalog.base_ingredients.find((b) => b.id === item.ingredient_id);
      const sliceWeightG = catalogIng?.standard_recipe_weight_g ?? 70;
      const grams = perPerson(item.quantity);
      gramPerItem.push({ ingredientId: item.ingredient_id, grams, sliceWeightG });
      totalGrams += grams;
    }

    if (totalGrams > 0) {
      for (const { ingredientId, grams, sliceWeightG } of gramPerItem) {
        const catalogIng = catalog.base_ingredients.find((b) => b.id === ingredientId);
        basisSelections.push({
          ingredientId,
          name: catalogIng?.name ?? '',
          sharePercent: Math.round((grams / totalGrams) * 100),
          locked: false,
          sliceWeightG,
          energyKcal100g: catalogIng?.energy_kcal ?? null,
        });
      }
      result.basis = basisSelections;
      // Set gramsPerPerson from total basis grams
      result.gramsPerPerson = Math.round(totalGrams);
    }
  }

  // ── 2. Fat items ──────────────────────────────────────────────────────────
  const fatItems = items.filter((i) => (i.ingredient_tags ?? []).includes('breakfast-fat'));
  if (fatItems.length > 0) {
    const fatSelections: FatSelection[] = [];
    let totalGrams = 0;
    const gramPerFat: { ingredientId: number; grams: number }[] = [];

    for (const item of fatItems) {
      if (!item.ingredient_id || !item.quantity) continue;
      const catIng = catalog.fat_ingredients.find((f) => f.id === item.ingredient_id);
      if (!catIng) continue;
      const grams = perPerson(item.quantity);
      gramPerFat.push({ ingredientId: item.ingredient_id, grams });
      totalGrams += grams;
    }

    if (totalGrams > 0) {
      for (const { ingredientId, grams } of gramPerFat) {
        const catIng = catalog.fat_ingredients.find((f) => f.id === ingredientId);
        fatSelections.push({
          ingredientId,
          name: catIng?.name ?? '',
          sharePercent: Math.round((grams / totalGrams) * 100),
          locked: false,
          energyKcal100g: catIng?.energy_kcal ?? null,
          pricePerKg: catIng?.price_per_kg ?? null,
          portions: catIng?.portions ?? [],
        });
      }
      result.fatSelections = fatSelections;
    }
  }

  // ── 3. Topping items (exclude items with breakfast-fat tag — migration) ──
  const toppingItems = items.filter(
    (i) => (i.ingredient_tags ?? []).includes('breakfast-topping') && !(i.ingredient_tags ?? []).includes('breakfast-fat'),
  );
  if (toppingItems.length > 0) {
    const toppingSelections: ToppingSelection[] = [];
    let totalGrams = 0;
    const gramPerTopping: { ingredientId: number; grams: number }[] = [];

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
      const grams = perPerson(item.quantity);
      gramPerTopping.push({ ingredientId: item.ingredient_id, grams });
      totalGrams += grams;
    }

    if (totalGrams > 0) {
      for (const { ingredientId, grams } of gramPerTopping) {
        const catIng = catalog.topping_ingredients.find((t) => t.id === ingredientId);
        toppingSelections.push({
          ingredientId,
          name: catIng?.name ?? '',
          sharePercent: Math.round((grams / totalGrams) * 100),
          locked: false,
          energyKcal100g: catIng?.energy_kcal ?? null,
          pricePerKg: catIng?.price_per_kg ?? null,
          portions: catIng?.portions ?? [],
        });
      }
      result.toppings = toppingSelections;
    }
  }

  // ── 4. Warm dishes (recipe, not drink tag) ───────────────────────────────
  const warmItems = items.filter(
    (i) => i.recipe_id && !(i.ingredient_tags ?? []).includes('breakfast-drink'),
  );
  for (const item of warmItems) {
    if (!item.recipe_id) continue;
    result.warmDishRecipeIds.push(item.recipe_id);
    result.warmDishFactors[String(item.recipe_id)] = item.factor ?? 1.0;
    if (item.recipe_title) {
      result.warmDishRecipeNames[String(item.recipe_id)] = item.recipe_title;
    }
  }

  // ── 5. Drink items (recipe with breakfast-drink tag) ─────────────────────
  const drinkItems = items.filter(
    (i) => i.recipe_id && (i.ingredient_tags ?? []).includes('breakfast-drink'),
  );
  if (drinkItems.length > 0) {
    const totalFactor = drinkItems.reduce((sum, item) => sum + (item.factor ?? 1.0), 0);
    const drinkRecipes = drinkItems.map((item) => ({
      recipeId: item.recipe_id ?? 0,
      name: item.recipe_title ?? `Rezept #${item.recipe_id}`,
      sharePercent: totalFactor > 0 ? ((item.factor ?? 1.0) / totalFactor) * 100 : 0,
      locked: false,
      energyKcal: null,
    }));
    result.drinkRecipes = drinkRecipes;
  }

  // ── 6. Extra ingredients ──────────────────────────────────────────────────
  const extraItems = items.filter(
    (i) =>
      i.ingredient_id &&
      !(i.ingredient_tags ?? []).includes('breakfast-base') &&
      !(i.ingredient_tags ?? []).includes('breakfast-topping') &&
      !(i.ingredient_tags ?? []).includes('breakfast-fat'),
  );
  for (const item of extraItems) {
    if (!item.ingredient_id || !item.quantity) continue;
    result.extraIngredients[String(item.ingredient_id)] = Math.round(perPerson(item.quantity));
  }

  return result;
}
