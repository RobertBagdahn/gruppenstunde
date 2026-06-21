import { PriceRow } from '@/components/recipe/RecipeDetailHelpers';
import { RecipeCategoryBenchmark } from '@/components/recipe/RecipeCategoryBenchmark';
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
        <div className="text-center p-4 bg-yellow-50 rounded-xl border border-yellow-200">
          <p className="text-2xl font-extrabold text-yellow-700">
            {displayedPriceTotal.toFixed(2)} EUR
          </p>
          <p className="text-xs text-muted-foreground mt-1">Gesamtpreis</p>
        </div>
        {displayedPricePerPortion !== null && (
          <div className="text-center p-4 bg-emerald-50 rounded-xl border border-emerald-200">
            <p className="text-2xl font-extrabold text-emerald-700">
              {displayedPricePerPortion.toFixed(2)} EUR
            </p>
            <p className="text-xs text-muted-foreground mt-1">pro Portion</p>
          </div>
        )}
        <div className="text-center p-4 bg-blue-50 rounded-xl border border-blue-200">
          <p className="text-2xl font-extrabold text-blue-700">
            {nb.items.filter((i) => i.price_eur !== null).length} / {nb.items.length}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Zutaten mit Preis</p>
        </div>
      </div>

      {topIngredientsByPrice.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-3">Kosten nach Zutat</h3>
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
        <RecipeCategoryBenchmark
          stats={typeStats}
          currentValue={displayedPricePerPortion}
          metric="price"
        />
      )}
    </div>
  );
}
