import { BookOpen } from 'lucide-react';
import type { RecipeSearchResult } from '@/schemas/mealPlan';
import RecipeBadge from './RecipeBadge';

const RECIPE_TYPE_LABELS: Record<string, string> = {
  breakfast: 'Frühstück',
  warm_meal: 'Warme Mahlzeit',
  cold_meal: 'Kalte Mahlzeit',
  dessert: 'Nachtisch',
  recipe_part: 'Rezeptteil',
  drink: 'Getränk',
  snack: 'Snack',
  ingredient: 'Zutat',
};

const RECIPE_TYPE_COLORS: Record<string, string> = {
  breakfast: 'bg-amber-100 text-amber-800',
  warm_meal: 'bg-orange-100 text-orange-800',
  cold_meal: 'bg-blue-100 text-blue-800',
  dessert: 'bg-pink-100 text-pink-800',
  recipe_part: 'bg-purple-100 text-purple-800',
  drink: 'bg-cyan-100 text-cyan-800',
  snack: 'bg-yellow-100 text-yellow-800',
  ingredient: 'bg-teal-100 text-teal-800',
};

interface RecipeSearchCardProps {
  recipe: RecipeSearchResult;
  onClick: () => void;
}
export default function RecipeSearchCard({ recipe, onClick }: RecipeSearchCardProps) {
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
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ${
              RECIPE_TYPE_COLORS[recipe.recipe_type] ?? 'bg-muted text-muted-foreground'
            }`}
          >
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
