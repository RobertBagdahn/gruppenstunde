import { BookOpen, Users } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { RecipeSearchResult } from '@/schemas/mealPlan';
import { kjToKcal } from '@/utils/nutritionUnits';

const RECIPE_TYPE_LABELS: Record<string, string> = {
  breakfast: 'Frühstück',
  warm_meal: 'Warme Mahlzeit',
  cold_meal: 'Kalte Mahlzeit',
  dessert: 'Nachtisch',
  side_dish: 'Beilage',
  drink: 'Getränk',
  simple_meal: 'Einfache Mahlzeit',
};

const NUTRI_SCORE_LABELS: Record<number, { letter: string; color: string }> = {
  1: { letter: 'A', color: 'bg-green-600 text-white' },
  2: { letter: 'B', color: 'bg-lime-500 text-white' },
  3: { letter: 'C', color: 'bg-yellow-400 text-black' },
  4: { letter: 'D', color: 'bg-orange-500 text-white' },
  5: { letter: 'E', color: 'bg-red-600 text-white' },
};

interface RecipePreviewDialogProps {
  recipe: RecipeSearchResult | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (recipeId: number) => void;
}

export default function RecipePreviewDialog({
  recipe,
  open,
  onOpenChange,
  onConfirm,
}: RecipePreviewDialogProps) {
  if (!recipe) return null;

  const servings = recipe.servings || 1;
  const energyPerPortion = recipe.cached_energy_kj
    ? Math.round(kjToKcal(recipe.cached_energy_kj / servings))
    : null;
  const proteinPerPortion = recipe.cached_protein_g
    ? Math.round((recipe.cached_protein_g / servings) * 10) / 10
    : null;
  const fatPerPortion = recipe.cached_fat_g
    ? Math.round((recipe.cached_fat_g / servings) * 10) / 10
    : null;
  const carbsPerPortion = recipe.cached_carbohydrate_g
    ? Math.round((recipe.cached_carbohydrate_g / servings) * 10) / 10
    : null;
  const pricePerPortion = recipe.cached_price_total
    ? (recipe.cached_price_total / servings).toFixed(2)
    : null;
  const nutriScore = recipe.cached_nutri_class
    ? NUTRI_SCORE_LABELS[recipe.cached_nutri_class]
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-display">
            <BookOpen className="w-5 h-5 text-primary" />
            {recipe.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Image */}
          {recipe.image && (
            <img
              src={recipe.image}
              alt={recipe.title}
              className="w-full max-h-[200px] rounded-lg object-cover"
              loading="lazy"
            />
          )}

          {/* Type + Servings */}
          <div className="flex items-center gap-3 text-sm">
            <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
              {RECIPE_TYPE_LABELS[recipe.recipe_type] ?? recipe.recipe_type}
            </span>
            {recipe.servings && (
              <span className="flex items-center gap-1 text-muted-foreground">
                <Users className="w-4 h-4 text-muted-foreground" />
                {recipe.servings} Portionen
              </span>
            )}
          </div>

          {/* Nutrition Grid */}
          {(energyPerPortion || proteinPerPortion || fatPerPortion || carbsPerPortion) && (
            <div className="grid grid-cols-4 gap-2 text-center">
              {energyPerPortion != null && (
                <div className="rounded-lg bg-muted/50 p-2">
                  <div className="text-sm font-semibold">{energyPerPortion}</div>
                  <div className="text-xs text-muted-foreground">kcal</div>
                </div>
              )}
              {proteinPerPortion != null && (
                <div className="rounded-lg bg-muted/50 p-2">
                  <div className="text-sm font-semibold">{proteinPerPortion}g</div>
                  <div className="text-xs text-muted-foreground">Eiweiß</div>
                </div>
              )}
              {fatPerPortion != null && (
                <div className="rounded-lg bg-muted/50 p-2">
                  <div className="text-sm font-semibold">{fatPerPortion}g</div>
                  <div className="text-xs text-muted-foreground">Fett</div>
                </div>
              )}
              {carbsPerPortion != null && (
                <div className="rounded-lg bg-muted/50 p-2">
                  <div className="text-sm font-semibold">{carbsPerPortion}g</div>
                  <div className="text-xs text-muted-foreground">KH</div>
                </div>
              )}
            </div>
          )}

          {/* Price + Nutri-Score */}
          <div className="flex items-center gap-3">
            {pricePerPortion && (
              <span className="text-sm text-muted-foreground">
                ~{pricePerPortion}€ / Portion
              </span>
            )}
            {nutriScore && (
              <span className={`text-xs font-bold px-2 py-0.5 rounded ${nutriScore.color}`}>
                Nutri {nutriScore.letter}
              </span>
            )}
          </div>

          {/* Nutritional Tags */}
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

          {/* Ingredients Preview */}
          {recipe.ingredients_preview && recipe.ingredients_preview.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Zutaten:</p>
              <p className="text-sm">
                {recipe.ingredients_preview.join(', ')}
                {recipe.ingredients_preview.length >= 8 && '…'}
              </p>
            </div>
          )}

          {/* Description */}
          {recipe.description && (
            <p className="text-sm text-muted-foreground">{recipe.description}</p>
          )}

          {/* Actions */}
          <div className="flex gap-2 justify-end pt-2 border-t">
            <button
              onClick={() => onOpenChange(false)}
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
      </DialogContent>
    </Dialog>
  );
}
