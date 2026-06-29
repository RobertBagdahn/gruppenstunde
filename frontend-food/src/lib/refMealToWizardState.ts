/**
 * Convert saved RefMeal items back into WizardState for editing.
 *
 * This is inherently approximate — wizard state uses relative distributions (%)
 * while saved items use absolute quantities (grams). The result gives the user
 * a good starting point to adjust in the wizard.
 */
import type { MealItem } from '@/schemas/mealPlan';
import type {
  BreakfastCatalog,
  BasisSelection,
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
    let totalBe = 0;
    const bePerItem: { ingredientId: number; be: number; sliceWeightG: number }[] = [];

    for (const item of basisItems) {
      if (!item.ingredient_id || !item.quantity) continue;
      const catalogIng = catalog.base_ingredients.find((b) => b.id === item.ingredient_id);
      const sliceWeightG = catalogIng?.standard_recipe_weight_g ?? 70;
      const be = item.quantity / sliceWeightG;
      bePerItem.push({ ingredientId: item.ingredient_id, be, sliceWeightG });
      totalBe += be;
    }

    if (totalBe > 0) {
      result.bePerPerson = Math.max(1, Math.round(totalBe / normPortions));
      for (const { ingredientId, be, sliceWeightG } of bePerItem) {
        const catalogIng = catalog.base_ingredients.find((b) => b.id === ingredientId);
        basisSelections.push({
          ingredientId,
          name: catalogIng?.name ?? '',
          sharePercent: Math.round((be / totalBe) * 100),
          locked: false,
          sliceWeightG,
          energyKcal100g: catalogIng?.energy_kcal ?? null,
        });
      }
      result.basis = basisSelections;
    }
  }

  // ── 2. Topping items ──────────────────────────────────────────────────────
  const toppingItems = items.filter((i) => (i.ingredient_tags ?? []).includes('breakfast-topping'));
  if (toppingItems.length > 0) {
    const toppingSelections: ToppingSelection[] = [];
    let totalCoveredBe = 0;
    const bePerTopping: { ingredientId: number; be: number }[] = [];

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
      const baseSelection: ToppingSelection = {
        ingredientId: catIng.id,
        name: catIng.name,
        sharePercent: 100,
        locked: false,
        energyKcal100g: catIng.energy_kcal ?? null,
        pricePerKg: catIng.price_per_kg ?? null,
        portions: catIng.portions,
      };
      const portionWeight = toppingWeightForIntensity(baseSelection, globalIntensity);
      const be = portionWeight > 0 ? item.quantity / portionWeight : 0;
      bePerTopping.push({ ingredientId: item.ingredient_id, be });
      totalCoveredBe += be;
    }

    if (totalCoveredBe > 0) {
      for (const { ingredientId, be } of bePerTopping) {
        const catIng = catalog.topping_ingredients.find((t) => t.id === ingredientId);
        toppingSelections.push({
          ingredientId,
          name: catIng?.name ?? '',
          sharePercent: Math.round((be / totalCoveredBe) * 100),
          locked: false,
          energyKcal100g: catIng?.energy_kcal ?? null,
          pricePerKg: catIng?.price_per_kg ?? null,
          portions: catIng?.portions ?? [],
        });
      }
      result.toppings = toppingSelections;
    }
  }

  // ── 3. Warm dishes (recipe, not drink tag) ───────────────────────────────
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

  // ── 4. Drink items (recipe with breakfast-drink tag) ─────────────────────
  const drinkItems = items.filter(
    (i) => i.recipe_id && (i.ingredient_tags ?? []).includes('breakfast-drink'),
  );
  for (const item of drinkItems) {
    if (!item.recipe_id) continue;
    result.drinkRecipeIds.push(item.recipe_id);
    result.drinkFactors[String(item.recipe_id)] = item.factor ?? 1.0;
    if (item.recipe_title) {
      result.drinkRecipeNames[String(item.recipe_id)] = item.recipe_title;
    }
  }

  // ── 5. Extra ingredients ──────────────────────────────────────────────────
  const extraItems = items.filter(
    (i) =>
      i.ingredient_id &&
      !(i.ingredient_tags ?? []).includes('breakfast-base') &&
      !(i.ingredient_tags ?? []).includes('breakfast-topping'),
  );
  for (const item of extraItems) {
    if (!item.ingredient_id || !item.quantity) continue;
    result.extraIngredients[String(item.ingredient_id)] = Math.round(perPerson(item.quantity));
  }

  return result;
}
