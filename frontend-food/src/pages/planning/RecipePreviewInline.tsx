import { X } from 'lucide-react';
import type { RecipeSearchResult } from '@/schemas/mealPlan';
import RecipeThumbnail from '@/components/recipe/RecipeThumbnail';
import { formatNumber } from '@/lib/format';

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
  1: { letter: 'A', color: 'bg-primary text-primary-foreground' },
  2: { letter: 'B', color: 'bg-primary/80 text-primary-foreground' },
  3: { letter: 'C', color: 'bg-accent text-accent-foreground' },
  4: { letter: 'D', color: 'bg-warning text-primary-foreground' },
  5: { letter: 'E', color: 'bg-destructive text-destructive-foreground' },
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
    ? formatNumber(recipe.price_per_serving, { maxDecimals: 2 })
    : null;
  const nutriScore = recipe.cached_nutri_class
    ? NUTRI_SCORE_LABELS[recipe.cached_nutri_class]
    : null;

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div className="mb-3 flex shrink-0 items-center justify-between">
        <h3 className="text-section font-display font-bold">{recipe.title}</h3>
        <button
          onClick={onCancel}
          className="p-1 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain">
        <RecipeThumbnail
          imageUrl={recipe.image_url}
          title={recipe.title}
          size="full"
          eager
          imgClassName="rounded-lg"
          className="rounded-lg"
        />

        <div className="flex items-center gap-3 text-body">
          <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
            {RECIPE_TYPE_LABELS[recipe.recipe_type] ?? recipe.recipe_type}
          </span>
        </div>

        {(energyPer100g || proteinPer100g || fatPer100g || carbsPer100g) && (
          <div className="grid grid-cols-4 gap-2 text-center">
            {energyPer100g != null && (
              <div className="rounded-lg bg-muted/50 p-2">
                <div className="text-body font-semibold">{energyPer100g}</div>
                <div className="text-caption text-muted-foreground">kcal/100g</div>
              </div>
            )}
            {proteinPer100g != null && (
              <div className="rounded-lg bg-muted/50 p-2">
                <div className="text-body font-semibold">{proteinPer100g}g</div>
                <div className="text-caption text-muted-foreground">Eiweiß</div>
              </div>
            )}
            {fatPer100g != null && (
              <div className="rounded-lg bg-muted/50 p-2">
                <div className="text-body font-semibold">{fatPer100g}g</div>
                <div className="text-caption text-muted-foreground">Fett</div>
              </div>
            )}
            {carbsPer100g != null && (
              <div className="rounded-lg bg-muted/50 p-2">
                <div className="text-body font-semibold">{carbsPer100g}g</div>
                <div className="text-caption text-muted-foreground">KH</div>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center gap-3">
          {pricePerServing && (
            <span className="text-body text-muted-foreground">
              ~{pricePerServing}€ / Portion
            </span>
          )}
          {nutriScore && (
            <span className={`text-caption font-bold px-2 py-0.5 rounded-lg ${nutriScore.color}`}>
              Nutri {nutriScore.letter}
            </span>
          )}
        </div>

        {recipe.nutritional_tags && recipe.nutritional_tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {recipe.nutritional_tags.map((tag) => (
              <span
                key={tag.id}
                className="px-2 py-0.5 text-caption rounded-full border bg-muted text-muted-foreground"
              >
                {tag.name}
              </span>
            ))}
          </div>
        )}

        {recipe.ingredients_preview && recipe.ingredients_preview.length > 0 && (
          <div>
            <p className="text-caption font-medium text-muted-foreground mb-1">Zutaten:</p>
            <p className="text-body">
              {recipe.ingredients_preview.join(', ')}
              {recipe.ingredients_preview.length >= 8 && '…'}
            </p>
          </div>
        )}

        {recipe.description && (
          <p className="text-body text-muted-foreground">{recipe.description}</p>
        )}
      </div>

      <div className="mt-3 flex shrink-0 justify-end gap-2 border-t bg-card pt-3">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-body rounded-lg border hover:bg-muted transition-colors"
        >
          Abbrechen
        </button>
        <button
          onClick={() => onConfirm(recipe.id)}
          className="px-4 py-2 text-body rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Hinzufügen
        </button>
      </div>
    </div>
  );
}
