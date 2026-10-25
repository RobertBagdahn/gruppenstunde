/**
 * Recipe type → category tint and icon (food-design-system: Kategorie-Tönungen nur für Rezepttypen).
 * Class names are written out in full so Tailwind generates them.
 */
import { RECIPE_TYPE_OPTIONS, type RecipeType } from '@/schemas/recipe';

export type RecipeTint = 'breakfast' | 'warm' | 'cold' | 'dessert' | 'snack' | 'recipe-part' | 'drink';

export const RECIPE_TINT_CLASSES: Record<RecipeTint, string> = {
  breakfast: 'bg-category-breakfast-soft text-category-breakfast-foreground',
  warm: 'bg-category-warm-soft text-category-warm-foreground',
  cold: 'bg-category-cold-soft text-category-cold-foreground',
  dessert: 'bg-category-dessert-soft text-category-dessert-foreground',
  snack: 'bg-category-snack-soft text-category-snack-foreground',
  'recipe-part': 'bg-category-recipe-part-soft text-category-recipe-part-foreground',
  drink: 'bg-category-drink-soft text-category-drink-foreground',
};

/** Colour dot per recipe type for filter chips (food-colorful-detail: only a dot carries colour). */
export const RECIPE_DOT_CLASSES: Record<RecipeTint, string> = {
  breakfast: 'bg-category-breakfast-foreground',
  warm: 'bg-category-warm-foreground',
  cold: 'bg-category-cold-foreground',
  dessert: 'bg-category-dessert-foreground',
  snack: 'bg-category-snack-foreground',
  'recipe-part': 'bg-category-recipe-part-foreground',
  drink: 'bg-category-drink-foreground',
};

/** Neutral surface for recipes without a type (no tint, no status meaning). */
export const NEUTRAL_TINT_CLASSES = 'bg-muted text-muted-foreground';

const TINT_BY_TYPE: Record<RecipeType, RecipeTint> = {
  breakfast: 'breakfast',
  warm_meal: 'warm',
  cold_meal: 'cold',
  dessert: 'dessert',
  snack: 'snack',
  recipe_part: 'recipe-part',
  drink: 'drink',
};

export function recipeTint(type: string | null | undefined): RecipeTint | null {
  return type && type in TINT_BY_TYPE ? TINT_BY_TYPE[type as RecipeType] : null;
}

export function recipeTypeLabel(type: string | null | undefined): string | undefined {
  return RECIPE_TYPE_OPTIONS.find((option) => option.value === type)?.label;
}

export function recipeTypeIcon(type: string | null | undefined): string {
  return RECIPE_TYPE_OPTIONS.find((option) => option.value === type)?.icon ?? 'restaurant_menu';
}
