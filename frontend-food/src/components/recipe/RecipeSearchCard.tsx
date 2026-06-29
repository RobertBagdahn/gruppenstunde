import { BookOpen, Apple } from 'lucide-react';
import type { RecipeSearchResult, IngredientSearchResult } from '@/schemas/mealPlan';
import RecipeBadge from './RecipeBadge';
import { RECIPE_TYPE_LABELS } from './CategoryPills';

interface SearchResultCardProps {
  result: RecipeSearchResult | IngredientSearchResult;
  onClick: () => void;
}

export default function SearchResultCard({ result, onClick }: SearchResultCardProps) {
  const isRecipe = 'recipe_type' in result;

  if (isRecipe) {
    const recipe = result as RecipeSearchResult;
    const badge = recipe.recipe_badge ?? 'community';
    const price = recipe.price_per_serving != null
      ? `${recipe.price_per_serving.toFixed(2).replace('.', ',')} €/P.`
      : '—';
    const dietTags = (recipe.nutritional_tags ?? []).slice(0, 3);

    return (
      <button
        onClick={onClick}
        className="w-full text-left px-3 py-2.5 hover:bg-accent hover:shadow-sm transition-all flex items-center gap-2.5"
      >
        <RecipeBadge badge={badge} />
        <BookOpen className="w-4 h-4 text-muted-foreground shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-medium truncate">{recipe.title}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0 bg-muted text-muted-foreground">
              {RECIPE_TYPE_LABELS[recipe.recipe_type] ?? recipe.recipe_type}
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            {dietTags.map((tag) => (
              <span
                key={tag.id}
                className="text-[10px] px-1 py-0 rounded bg-muted/60 text-muted-foreground"
              >
                {tag.name}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
            <span>{price}</span>
            <span>{recipe.usage_count ?? 0}× verwendet</span>
          </div>
        </div>
      </button>
    );
  }

  const ingredient = result as IngredientSearchResult;
  const ingredientBadgeMap: Record<string, 'verified' | 'community' | 'draft'> = {
    verified: 'verified',
    user_content: 'community',
    draft: 'draft',
  };
  const badge = ingredientBadgeMap[ingredient.status ?? 'community'] ?? 'community';
  const price = ingredient.price_per_kg != null
    ? `${ingredient.price_per_kg.toFixed(2).replace('.', ',')} €/kg`
    : '—';
  const dietTags = (ingredient.nutritional_tags ?? []).slice(0, 3);

  return (
    <button
      onClick={onClick}
      className="w-full text-left px-3 py-2.5 hover:bg-accent hover:shadow-sm transition-all flex items-center gap-2.5"
    >
      <RecipeBadge badge={badge} />
      <Apple className="w-4 h-4 text-muted-foreground shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium truncate">{ingredient.name}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0 bg-muted text-muted-foreground">
            Zutat
          </span>
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          {dietTags.map((tag) => (
            <span
              key={tag.id}
              className="text-[10px] px-1 py-0 rounded bg-muted/60 text-muted-foreground"
            >
              {tag.name}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
          <span>{price}</span>
          <span>{ingredient.usage_count ?? 0}× verwendet</span>
        </div>
      </div>
    </button>
  );
}
