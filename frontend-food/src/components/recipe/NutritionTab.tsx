import { lazy, Suspense } from 'react';
import {
  MacroBar,
  MicronutrientSection,
  CollapsibleContributions,
  NutrientCard,
} from '@/components/recipe/RecipeDetailHelpers';
import { RecipeCategoryBenchmark } from '@/components/recipe/RecipeCategoryBenchmark';
import { useRecipeTypeStats } from '@/api/recipes';
import { formatWeight } from '@/utils/formatWeight';
import type { RecipeNutritionBreakdown } from '@/schemas/recipe';

const LazyNutritionPieChart = lazy(() => import('@/components/charts/NutritionPieChart'));

interface Props {
  nb: RecipeNutritionBreakdown;
  effectivePortions: number;
  recipeType: string;
}

export function NutritionTab({ nb, effectivePortions, recipeType }: Props) {
  const { data: typeStats } = useRecipeTypeStats(recipeType);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold mb-3">
          Nährwerte pro Portion{' '}
          <span className="font-normal text-muted-foreground">
            ({formatWeight(nb.total_weight_g / effectivePortions)})
          </span>
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <NutrientCard
            label="Kalorien"
            value={nb.per_serving_energy_kcal ?? 0}
            unit="kcal"
            icon="local_fire_department"
            color="text-orange-600"
            bgColor="bg-orange-50 border-orange-200"
          />
          <NutrientCard
            label="Protein"
            value={nb.per_serving_protein_g ?? 0}
            unit="g"
            icon="fitness_center"
            color="text-red-600"
            bgColor="bg-red-50 border-red-200"
          />
          <NutrientCard
            label="Fett"
            value={nb.per_serving_fat_g ?? 0}
            unit="g"
            icon="water_drop"
            color="text-amber-600"
            bgColor="bg-amber-50 border-amber-200"
          />
          <NutrientCard
            label="Kohlenhydrate"
            value={nb.per_serving_carbohydrate_g ?? 0}
            unit="g"
            icon="grain"
            color="text-teal-600"
            bgColor="bg-teal-50 border-teal-200"
          />
        </div>
      </div>

      <CollapsibleContributions items={nb.items} />

      {(nb.per_serving_protein_g || nb.per_serving_fat_g || nb.per_serving_carbohydrate_g) && (
        <div>
          <h3 className="text-sm font-semibold mb-3">Makronährstoff-Verteilung</h3>
          <div className="bg-muted/30 rounded-xl p-4">
            <Suspense fallback={<div className="h-[260px] bg-muted rounded-xl animate-pulse" />}>
              <LazyNutritionPieChart
                proteinG={nb.per_serving_protein_g ?? 0}
                fatG={nb.per_serving_fat_g ?? 0}
                carbsG={nb.per_serving_carbohydrate_g ?? 0}
              />
            </Suspense>
          </div>
        </div>
      )}

      <div>
        <h3 className="text-sm font-semibold mb-3">Gesamtnährwerte</h3>
        {(Object.keys(nb.dge_reference).length > 0) && (
          <p className="text-[10px] text-muted-foreground mb-2">
            DGE-Referenzwerte (25 Jahre, männlich)
          </p>
        )}
        <div className="space-y-3 bg-muted/30 rounded-xl p-4">
          <MacroBar
            label="Protein"
            value={nb.total_protein_g}
            max={Math.max(nb.total_protein_g, nb.total_fat_g, nb.total_carbohydrate_g)}
            color="bg-red-500"
            dgeRef={nb.dge_reference.protein_g}
            dgeCoverage={nb.dge_coverage.protein_g}
          />
          <MacroBar
            label="Fett"
            value={nb.total_fat_g}
            max={Math.max(nb.total_protein_g, nb.total_fat_g, nb.total_carbohydrate_g)}
            color="bg-amber-500"
            dgeRef={nb.dge_reference.fat_g}
            dgeCoverage={nb.dge_coverage.fat_g}
          />
          <MacroBar
            label="davon gesättigt"
            value={nb.total_fat_sat_g}
            max={nb.total_fat_g || 1}
            color="bg-amber-300"
            dgeRef={nb.dge_reference.fat_sat_g}
            dgeCoverage={nb.dge_coverage.fat_sat_g}
          />
          <MacroBar
            label="Kohlenhydrate"
            value={nb.total_carbohydrate_g}
            max={Math.max(nb.total_protein_g, nb.total_fat_g, nb.total_carbohydrate_g)}
            color="bg-teal-500"
            dgeRef={nb.dge_reference.carbohydrate_g}
            dgeCoverage={nb.dge_coverage.carbohydrate_g}
          />
          <MacroBar
            label="davon Zucker"
            value={nb.total_sugar_g}
            max={nb.total_carbohydrate_g || 1}
            color="bg-teal-300"
            dgeRef={nb.dge_reference.sugar_g}
            dgeCoverage={nb.dge_coverage.sugar_g}
          />
          <MacroBar
            label="Ballaststoffe"
            value={nb.total_fibre_g}
            max={nb.dge_reference.fibre_g ?? 30}
            color="bg-green-500"
            dgeRef={nb.dge_reference.fibre_g}
            dgeCoverage={nb.dge_coverage.fibre_g}
          />
          <MacroBar
            label="Salz"
            value={nb.total_salt_g}
            max={nb.dge_reference.salt_g ?? 6}
            color="bg-blue-500"
            dgeRef={nb.dge_reference.salt_g}
            dgeCoverage={nb.dge_coverage.salt_g}
          />
        </div>
      </div>

      <MicronutrientSection
        title="Vitamine"
        icon="medication"
        accentColor="text-amber-600"
        nutrients={[
          { label: 'Vitamin C', value: nb.total_vitamin_c_mg, unit: 'mg', dgeKey: 'vitamin_c_mg' },
        ]}
        dgeCoverage={nb.dge_coverage}
        portions={effectivePortions}
      />

      {typeStats && typeStats.count >= 10 && (
        <RecipeCategoryBenchmark
          stats={typeStats}
          currentValue={nb.per_serving_energy_kcal ?? 0}
          metric="energy"
        />
      )}
    </div>
  );
}
