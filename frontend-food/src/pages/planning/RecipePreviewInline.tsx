import { X } from 'lucide-react';
import type { RecipeSearchResult } from '@/schemas/mealPlan';

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

const NUTRI_SCORE_LABELS: Record<number, { letter: string; color: string }> = {
  1: { letter: 'A', color: 'bg-green-600 text-white' },
  2: { letter: 'B', color: 'bg-lime-500 text-white' },
  3: { letter: 'C', color: 'bg-yellow-400 text-black' },
  4: { letter: 'D', color: 'bg-orange-500 text-white' },
  5: { letter: 'E', color: 'bg-red-600 text-white' },
};

interface RecipePreviewInlineProps {
  recipe: RecipeSearchResult;
  onConfirm: (recipeId: number) => void;
  onCancel: () => void;
}

export default function RecipePreviewInline({
  recipe,
  onConfirm,
  onCancel,
}: RecipePreviewInlineProps) {
  const energyPer100g = recipe.cached_energy_kcal
    ? Math.round(recipe.cached_energy_kcal)
    : null;
  const proteinPer100g = recipe.cached_protein_g
    ? Math.round(recipe.cached_protein_g * 10) / 10
    : null;
  const fatPer100g = recipe.cached_fat_g
    ? Math.round(recipe.cached_fat_g * 10) / 10
    : null;
  const carbsPer100g = recipe.cached_carbohydrate_g
    ? Math.round(recipe.cached_carbohydrate_g * 10) / 10
    : null;
  const pricePerServing = recipe.price_per_serving
    ? recipe.price_per_serving.toFixed(2)
    : null;
  const nutriScore = recipe.cached_nutri_class
    ? NUTRI_SCORE_LABELS[recipe.cached_nutri_class]
    : null;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-display font-bold">{recipe.title}</h3>
        <button
          onClick={onCancel}
          className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4">
        {recipe.image && (
          <img
            src={recipe.image}
            alt={recipe.title}
            className="w-full max-h-[200px] rounded-lg object-cover"
            loading="lazy"
          />
        )}

        <div className="flex items-center gap-3 text-sm">
          <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
            {RECIPE_TYPE_LABELS[recipe.recipe_type] ?? recipe.recipe_type}
          </span>
        </div>

        {(energyPer100g || proteinPer100g || fatPer100g || carbsPer100g) && (
          <div className="grid grid-cols-4 gap-2 text-center">
            {energyPer100g != null && (
              <div className="rounded-lg bg-muted/50 p-2">
                <div className="text-sm font-semibold">{energyPer100g}</div>
                <div className="text-xs text-muted-foreground">kcal/100g</div>
              </div>
            )}
            {proteinPer100g != null && (
              <div className="rounded-lg bg-muted/50 p-2">
                <div className="text-sm font-semibold">{proteinPer100g}g</div>
                <div className="text-xs text-muted-foreground">Eiweiß</div>
              </div>
            )}
            {fatPer100g != null && (
              <div className="rounded-lg bg-muted/50 p-2">
                <div className="text-sm font-semibold">{fatPer100g}g</div>
                <div className="text-xs text-muted-foreground">Fett</div>
              </div>
            )}
            {carbsPer100g != null && (
              <div className="rounded-lg bg-muted/50 p-2">
                <div className="text-sm font-semibold">{carbsPer100g}g</div>
                <div className="text-xs text-muted-foreground">KH</div>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center gap-3">
          {pricePerServing && (
            <span className="text-sm text-muted-foreground">
              ~{pricePerServing}€ / Portion
            </span>
          )}
          {nutriScore && (
            <span className={`text-xs font-bold px-2 py-0.5 rounded ${nutriScore.color}`}>
              Nutri {nutriScore.letter}
            </span>
          )}
        </div>

        {recipe.nutritional_tags && recipe.nutritional_tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {recipe.nutritional_tags.map((tag) => (
              <span
                key={tag.id}
                className="px-2 py-0.5 text-xs rounded-full border bg-muted text-muted-foreground"
              >
                {tag.name}
              </span>
            ))}
          </div>
        )}

        {recipe.ingredients_preview && recipe.ingredients_preview.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">Zutaten:</p>
            <p className="text-sm">
              {recipe.ingredients_preview.join(', ')}
              {recipe.ingredients_preview.length >= 8 && '…'}
            </p>
          </div>
        )}

        {recipe.description && (
          <p className="text-sm text-muted-foreground">{recipe.description}</p>
        )}
      </div>

      <div className="flex gap-2 justify-end pt-3 border-t mt-3">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm rounded-md border hover:bg-muted transition-colors"
        >
          Abbrechen
        </button>
        <button
          onClick={() => onConfirm(recipe.id)}
          className="px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Hinzufügen
        </button>
      </div>
    </div>
  );
}