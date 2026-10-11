import type { RecipeStepIngredient } from '@/schemas/recipeStep';
import { formatStepIngredientLabel } from '@/lib/ingredientAmount';

interface StepIngredientChipsProps {
  ingredients: RecipeStepIngredient[];
  /** Serving multiplier, the same one the recipe ingredient list uses. */
  scale?: number;
  className?: string;
}

/** Ingredients of a preparation step as chips, with the amounts of the recipe ingredient list. */
export default function StepIngredientChips({ ingredients, scale = 1, className = '' }: StepIngredientChipsProps) {
  if (ingredients.length === 0) return null;
  return (
    <ul className={`flex flex-wrap gap-1.5 list-none p-0 ${className}`} data-testid="step-ingredient-chips">
      {ingredients.map((ingredient) => (
        <li key={ingredient.id} className="rounded-full bg-muted px-2.5 py-1 text-caption">
          {formatStepIngredientLabel(ingredient, scale)}
          {ingredient.preparation ? `, ${ingredient.preparation}` : ''}
        </li>
      ))}
    </ul>
  );
}
