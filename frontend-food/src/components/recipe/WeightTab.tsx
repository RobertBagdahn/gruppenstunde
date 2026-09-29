import { EntityLink } from '@/components/shared/EntityLink';
import { RecipeCategoryBenchmark } from '@/components/recipe/RecipeCategoryBenchmark';
import { useRecipeTypeStats } from '@/api/recipes';
import { formatWeight, formatNumber } from '@/lib/format';
import type { RecipeNutritionBreakdown } from '@/schemas/recipe';

interface Props {
  nb: RecipeNutritionBreakdown;
  effectivePortions: number;
  topIngredientsByWeight: RecipeNutritionBreakdown['items'];
  ingredientSlugById: Map<number, string>;
  recipeType: string;
}

export function WeightTab({
  nb,
  effectivePortions,
  topIngredientsByWeight,
  ingredientSlugById,
  recipeType,
}: Props) {
  const { data: typeStats } = useRecipeTypeStats(recipeType);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 p-3 bg-info-soft rounded-lg border border-info-border">
        <span className="material-symbols-outlined text-2xl text-info">scale</span>
        <div>
          <p className="text-section font-bold text-info">
            {formatWeight(nb.total_weight_g)}
          </p>
          <p className="text-caption text-muted-foreground">
            Gesamtgewicht ({formatWeight(nb.total_weight_g / effectivePortions)})
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {topIngredientsByWeight.map((item) => (
          <div key={item.recipe_item_id} className="flex items-center gap-3">
            {item.ingredient_id && ingredientSlugById.get(item.ingredient_id) ? (
              <EntityLink
                type="ingredient"
                slug={ingredientSlugById.get(item.ingredient_id)!}
                name={item.ingredient_name}
                variant="muted"
                className="text-body font-medium w-32 truncate"
              />
            ) : (
              <span className="text-body font-medium w-32 truncate">
                {item.ingredient_name}
              </span>
            )}
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-info rounded-full"
                style={{ width: `${item.weight_pct}%` }}
              />
            </div>
            <span className="text-caption text-muted-foreground w-20 text-right">
              {formatWeight(item.weight_g)} ({formatNumber(item.weight_pct, { maxDecimals: 0 })}%)
            </span>
          </div>
        ))}
      </div>

      {typeStats && typeStats.count >= 10 && (
        <RecipeCategoryBenchmark
          stats={typeStats}
          currentValue={nb.total_weight_g / effectivePortions}
          metric="weight"
        />
      )}
    </div>
  );
}
