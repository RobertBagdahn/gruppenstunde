/**
 * Frontend-only nutrition calculator for recipe modifications.
 *
 * Calculates nutritional values based on modified recipe items,
 * using per-100g ingredient values.
 */
import type { RecipeItemNutrition } from '@/schemas/recipe';

/** A modified recipe item with weight and per-100g ingredient data */
export interface ModifiedItem {
  recipe_item_id: number;
  ingredient_id: number | null;
  ingredient_name: string;
  quantity: number;
  portion_name: string;
  /** Total weight of this item in grams */
  weight_g: number;
  /** Price in EUR for this amount (nullable) */
  price_eur: number | null;
  /** Per-100g nutritional values from the ingredient */
  per100g: {
    energy_kj: number;
    energy_kcal: number;
    protein_g: number;
    fat_g: number;
    fat_sat_g: number;
    carbohydrate_g: number;
    sugar_g: number;
    fibre_g: number;
    salt_g: number;
  };
}

export interface NutritionTotals {
  total_weight_g: number;
  total_price_eur: number | null;
  total_energy_kj: number;
  total_energy_kcal: number;
  total_protein_g: number;
  total_fat_g: number;
  total_fat_sat_g: number;
  total_carbohydrate_g: number;
  total_sugar_g: number;
  total_fibre_g: number;
  total_salt_g: number;
  per_serving_energy_kcal: number | null;
  per_serving_protein_g: number | null;
  per_serving_fat_g: number | null;
  per_serving_carbohydrate_g: number | null;
  items: RecipeItemNutrition[];
}

/**
 * Scale a per-100g value to an actual weight.
 */
function scaleNutrient(per100g: number, weight_g: number): number {
  return (per100g * weight_g) / 100;
}

/**
 * Calculate complete nutrition breakdown from modified items.
 */
export function calculateNutrition(
  items: ModifiedItem[],
  servings: number | null,
): NutritionTotals {
  const totalWeight = items.reduce((sum, item) => sum + item.weight_g, 0);

  const itemResults: RecipeItemNutrition[] = items.map((item) => ({
    recipe_item_id: item.recipe_item_id,
    ingredient_id: item.ingredient_id,
    ingredient_name: item.ingredient_name,
    quantity: item.quantity,
    portion_name: item.portion_name,
    weight_g: item.weight_g,
    price_eur: item.price_eur,
    energy_kj: scaleNutrient(item.per100g.energy_kj, item.weight_g),
    energy_kcal: scaleNutrient(item.per100g.energy_kcal, item.weight_g),
    protein_g: scaleNutrient(item.per100g.protein_g, item.weight_g),
    fat_g: scaleNutrient(item.per100g.fat_g, item.weight_g),
    fat_sat_g: scaleNutrient(item.per100g.fat_sat_g, item.weight_g),
    carbohydrate_g: scaleNutrient(item.per100g.carbohydrate_g, item.weight_g),
    sugar_g: scaleNutrient(item.per100g.sugar_g, item.weight_g),
    fibre_g: scaleNutrient(item.per100g.fibre_g, item.weight_g),
    salt_g: scaleNutrient(item.per100g.salt_g, item.weight_g),
    weight_pct: totalWeight > 0 ? (item.weight_g / totalWeight) * 100 : 0,
    contributions: [],
  }));

  const totals = itemResults.reduce(
    (acc, item) => ({
      energy_kj: acc.energy_kj + item.energy_kj,
      energy_kcal: acc.energy_kcal + item.energy_kcal,
      protein_g: acc.protein_g + item.protein_g,
      fat_g: acc.fat_g + item.fat_g,
      fat_sat_g: acc.fat_sat_g + item.fat_sat_g,
      carbohydrate_g: acc.carbohydrate_g + item.carbohydrate_g,
      sugar_g: acc.sugar_g + item.sugar_g,
      fibre_g: acc.fibre_g + item.fibre_g,
      salt_g: acc.salt_g + item.salt_g,
    }),
    {
      energy_kj: 0, energy_kcal: 0, protein_g: 0, fat_g: 0, fat_sat_g: 0,
      carbohydrate_g: 0, sugar_g: 0, fibre_g: 0, salt_g: 0,
    },
  );

  const totalPriceEur = items.reduce((sum, item) => {
    if (item.price_eur === null) return sum;
    return (sum ?? 0) + item.price_eur;
  }, null as number | null);

  const effectiveServings = servings && servings > 0 ? servings : null;

  return {
    total_weight_g: totalWeight,
    total_price_eur: totalPriceEur,
    total_energy_kj: totals.energy_kj,
    total_energy_kcal: totals.energy_kcal,
    total_protein_g: totals.protein_g,
    total_fat_g: totals.fat_g,
    total_fat_sat_g: totals.fat_sat_g,
    total_carbohydrate_g: totals.carbohydrate_g,
    total_sugar_g: totals.sugar_g,
    total_fibre_g: totals.fibre_g,
    total_salt_g: totals.salt_g,
    per_serving_energy_kcal: effectiveServings
      ? totals.energy_kcal / effectiveServings
      : null,
    per_serving_protein_g: effectiveServings
      ? totals.protein_g / effectiveServings
      : null,
    per_serving_fat_g: effectiveServings
      ? totals.fat_g / effectiveServings
      : null,
    per_serving_carbohydrate_g: effectiveServings
      ? totals.carbohydrate_g / effectiveServings
      : null,
    items: itemResults,
  };
}
