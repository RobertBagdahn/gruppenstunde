/**
 * schema.org `Recipe` for a recipe detail page. Every value comes from the visible page;
 * missing values are left out, never guessed (food-seo-markup).
 */
import type { RecipeDetail } from '@/schemas/recipe';
import { toAbsoluteUrl, withoutEmpty, type JsonLdObject } from './jsonLd';

export type RecipeJsonLdInput = Pick<
  RecipeDetail,
  'title' | 'summary' | 'image_url' | 'portions' | 'recipe_items' | 'steps' | 'cached_energy_per_portion_kcal'
>;

/** Formats a quantity the way the page shows it (German decimal comma). */
function formatQuantity(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/0+$/, '').replace(/\.$/, '').replace('.', ',');
}

/** Total time is the sum of the step durations, and only when every step has one. */
function totalMinutes(steps: RecipeJsonLdInput['steps']): number | undefined {
  if (steps.length === 0) return undefined;
  const durations = steps.map((step) => step.duration_minutes);
  if (durations.some((minutes) => typeof minutes !== 'number')) return undefined;
  const sum = durations.reduce<number>((total, minutes) => total + (minutes ?? 0), 0);
  return sum > 0 ? sum : undefined;
}

export function buildRecipeJsonLd(recipe: RecipeJsonLdInput, origin: string, pagePath: string): JsonLdObject {
  const minutes = totalMinutes(recipe.steps);
  const kcal = recipe.cached_energy_per_portion_kcal;
  const ingredients = recipe.recipe_items
    .filter((item) => item.ingredient_name.trim() !== '')
    .map((item) => [formatQuantity(item.quantity), item.unit_label, item.ingredient_name].filter(Boolean).join(' '));

  return withoutEmpty({
    '@context': 'https://schema.org',
    '@type': 'Recipe',
    name: recipe.title,
    description: recipe.summary,
    url: toAbsoluteUrl(origin, pagePath),
    image: recipe.image_url ? toAbsoluteUrl(origin, recipe.image_url) : undefined,
    recipeYield: recipe.portions ? `${recipe.portions} Portionen` : undefined,
    totalTime: minutes ? `PT${minutes}M` : undefined,
    recipeIngredient: ingredients.length > 0 ? ingredients : undefined,
    recipeInstructions:
      recipe.steps.length > 0
        ? recipe.steps.map((step) => ({ '@type': 'HowToStep', text: step.instruction }))
        : undefined,
    nutrition:
      typeof kcal === 'number'
        ? { '@type': 'NutritionInformation', calories: `${Math.round(kcal)} kcal` }
        : undefined,
  }) as JsonLdObject;
}
