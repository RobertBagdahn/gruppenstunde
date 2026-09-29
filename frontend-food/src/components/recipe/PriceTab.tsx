import { PriceRow } from '@/components/recipe/RecipeDetailHelpers';
import { RecipeCategoryBenchmark } from '@/components/recipe/RecipeCategoryBenchmark';
import RecipeHistogram from '@/components/recipe/RecipeHistogram';
import { useRecipeTypeStats } from '@/api/recipes';
import type { RecipeNutritionBreakdown } from '@/schemas/recipe';

interface Props {
  nb: RecipeNutritionBreakdown;
  displayedPriceTotal: number;
  displayedPricePerPortion: number | null;
  topIngredientsByPrice: RecipeNutritionBreakdown['items'];
  ingredientSlugById: Map<number, string>;
  recipeType: string;
}

export function PriceTab({
  nb,
  displayedPriceTotal,
  displayedPricePerPortion,
  topIngredientsByPrice,
  ingredientSlugById,
  recipeType,
}: Props) {
  const { data: typeStats } = useRecipeTypeStats(recipeType);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="text-center p-4 bg-warning-soft rounded-xl border border-warning-border">
          <p className="text-title font-extrabold text-warning">
            {displayedPriceTotal.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
          </p>
          <p className="text-caption text-muted-foreground mt-1">Gesamtpreis</p>
        </div>
        {displayedPricePerPortion !== null && (
          <div className="text-center p-4 bg-success-soft rounded-xl border border-success-border">
            <p className="text-title font-extrabold text-success">
              {displayedPricePerPortion.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
            </p>
            <p className="text-caption text-muted-foreground mt-1">pro Portion</p>
          </div>
        )}
        <div className="text-center p-4 bg-info-soft rounded-xl border border-info-border">
          <p className="text-title font-extrabold text-info">
            {nb.items.filter((i) => i.price_eur !== null).length} / {nb.items.length}
          </p>
          <p className="text-caption text-muted-foreground mt-1">Zutaten mit Preis</p>
        </div>
      </div>

      {topIngredientsByPrice.length > 0 && (
        <div>
          <h3 className="text-body font-semibold mb-3">Kosten nach Zutat</h3>
          <div className="space-y-2">
            {topIngredientsByPrice.map((item) => (
              <PriceRow
                key={item.recipe_item_id}
                item={item}
                totalPrice={nb.total_price_eur ?? 1}
                ingredientSlugById={ingredientSlugById}
              />
            ))}
          </div>
        </div>
      )}

      {typeStats && typeStats.count >= 10 && displayedPricePerPortion !== null && (
        <>
          <RecipeHistogram
            buckets={typeStats.price_buckets}
            recipeValue={displayedPricePerPortion}
            label="Preisverteilung (€ pro Portion)"
            unit="€"
          />
          <RecipeCategoryBenchmark
            stats={typeStats}
            currentValue={displayedPricePerPortion}
            metric="price"
          />
        </>
      )}
    </div>
  );
}
