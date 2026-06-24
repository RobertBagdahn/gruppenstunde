import { NUTRI_SCORE_COLORS, HealthIndicator } from '@/components/recipe/RecipeDetailHelpers';
import { RecipeNutriScoreDistribution } from '@/components/recipe/RecipeNutriScoreDistribution';
import RecipeImprovements from '@/components/recipe/RecipeImprovements';
import { useRecipeTypeStats } from '@/api/recipes';
import type { RecipeNutritionBreakdown } from '@/schemas/recipe';
import type { NutriScoreDetail } from '@/schemas/recipe';

interface Props {
  nutriScore: NutriScoreDetail;
  nb: RecipeNutritionBreakdown;
  effectivePortions: number;
  recipeId: number;
  recipeType: string;
}

export function HealthTab({ nutriScore, nb, effectivePortions, recipeId, recipeType }: Props) {
  const { data: typeStats } = useRecipeTypeStats(recipeType);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-6">
        <div className="flex flex-col items-center gap-2">
          <div className="flex gap-1">
            {['A', 'B', 'C', 'D', 'E'].map((grade) => {
              const isActive = nutriScore.nutri_label === grade;
              const colors = NUTRI_SCORE_COLORS[grade];
              return (
                <div
                  key={grade}
                  className={`flex items-center justify-center font-bold rounded-lg transition-all ${
                    isActive
                      ? `${colors.bg} ${colors.text} w-14 h-14 text-2xl shadow-lg scale-110`
                      : `${colors.bg}/20 text-muted-foreground w-10 h-10 text-sm opacity-30`
                  }`}
                >
                  {grade}
                </div>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">
            Gesamtpunkte: {nutriScore.total_points}
          </p>
        </div>
        <div className="flex-1 space-y-3">
          <div className="p-3 bg-red-50 rounded-lg border border-red-200">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-red-700">Negative Punkte</span>
              <span className="text-lg font-bold text-red-700">
                {nutriScore.negative_points}
              </span>
            </div>
            <p className="text-xs text-red-600 mt-1">
              Energie, Zucker, gesättigte Fettsäuren, Natrium
            </p>
          </div>
          <div className="p-3 bg-green-50 rounded-lg border border-green-200">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-green-700">Positive Punkte</span>
              <span className="text-lg font-bold text-green-700">
                {nutriScore.positive_points}
              </span>
            </div>
            <p className="text-xs text-green-600 mt-1">
              Ballaststoffe, Protein, Obst/Gemüse-Anteil
            </p>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-3">Gesundheitsindikatoren (pro 100g)</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <HealthIndicator
            label="Zucker"
            value={nb.per_100g_sugar_g ?? 0}
            max={25}
            unit="g"
            goodBelow={5}
            warnBelow={22.5}
          />
          <HealthIndicator
            label="Ges. Fett"
            value={nb.per_100g_fat_sat_g ?? 0}
            max={10}
            unit="g"
            goodBelow={1.5}
            warnBelow={5}
          />
          <HealthIndicator
            label="Salz"
            value={nb.per_100g_salt_g ?? 0}
            max={3}
            unit="g"
            goodBelow={0.3}
            warnBelow={1.5}
          />
          <HealthIndicator
            label="Ballaststoffe"
            value={nb.per_100g_fibre_g ?? 0}
            max={15}
            unit="g"
            goodBelow={6}
            warnBelow={999}
            inverted
          />
          <HealthIndicator
            label="Protein"
            value={nb.per_100g_protein_g ?? 0}
            max={30}
            unit="g"
            goodBelow={12}
            warnBelow={999}
            inverted
          />
          <HealthIndicator
            label="Kalorien"
            value={nb.per_100g_energy_kcal ?? 0}
            max={400}
            unit="kcal"
            goodBelow={175}
            warnBelow={275}
          />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-3">Verbesserungsvorschläge</h3>
        <RecipeImprovements
          recipeId={recipeId}
          breakdownItems={nb?.items ?? []}
          totalWeightG={nb.total_weight_g}
          portions={effectivePortions}
        />
      </div>

      {typeStats && typeStats.count >= 10 && (
        <RecipeNutriScoreDistribution
          stats={typeStats}
          currentNutriClass={nutriScore.nutri_class}
        />
      )}
    </div>
  );
}
