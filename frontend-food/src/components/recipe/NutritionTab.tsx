import { lazy, Suspense } from 'react';
import {
  MacroBar,
  MicronutrientSection,
  CollapsibleContributions,
  NutrientCard,
} from '@/components/recipe/RecipeDetailHelpers';
import { NutritionBaseBadge } from '@/components/recipe/NutritionBaseBadge';
import { RecipeCategoryBenchmark } from '@/components/recipe/RecipeCategoryBenchmark';
import RecipeHistogram from '@/components/recipe/RecipeHistogram';
import { useRecipeTypeStats } from '@/api/recipes';
import type { RecipeNutritionBreakdown } from '@/schemas/recipe';

const LazyNutritionPieChart = lazy(() => import('@/components/charts/NutritionPieChart'));

interface Props {
  nb: RecipeNutritionBreakdown;
  recipeType: string;
}

export function NutritionTab({ nb, recipeType }: Props) {
  const { data: typeStats } = useRecipeTypeStats(recipeType);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          Nährwerte pro 100g
          <NutritionBaseBadge base="per_100g" />
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <NutrientCard
            label="Kalorien"
            value={nb.per_100g_energy_kcal ?? 0}
            unit="kcal"
            icon="local_fire_department"
            color="text-orange-600"
            bgColor="bg-orange-50 border-orange-200"
          />
          <NutrientCard
            label="Protein"
            value={nb.per_100g_protein_g ?? 0}
            unit="g"
            icon="fitness_center"
            color="text-red-600"
            bgColor="bg-red-50 border-red-200"
          />
          <NutrientCard
            label="Fett"
            value={nb.per_100g_fat_g ?? 0}
            unit="g"
            icon="water_drop"
            color="text-amber-600"
            bgColor="bg-amber-50 border-amber-200"
          />
          <NutrientCard
            label="Kohlenhydrate"
            value={nb.per_100g_carbohydrate_g ?? 0}
            unit="g"
            icon="grain"
            color="text-teal-600"
            bgColor="bg-teal-50 border-teal-200"
          />
        </div>
      </div>

      <CollapsibleContributions items={nb.items} />

      {(nb.per_100g_protein_g || nb.per_100g_fat_g || nb.per_100g_carbohydrate_g) && (
        <div>
          <h3 className="text-sm font-semibold mb-3">Makronährstoff-Verteilung</h3>
          <div className="bg-muted/30 rounded-xl p-4">
            <Suspense fallback={<div className="h-[260px] bg-muted rounded-xl animate-pulse" />}>
              <LazyNutritionPieChart
                proteinG={nb.per_100g_protein_g ?? 0}
                fatG={nb.per_100g_fat_g ?? 0}
                carbsG={nb.per_100g_carbohydrate_g ?? 0}
              />
            </Suspense>
          </div>
        </div>
      )}

      <div>
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          Gesamtnährwerte
          <NutritionBaseBadge base="total" />
        </h3>
        {(Object.keys(nb.dge_reference).length > 0) && (
          <p className="text-[10px] text-muted-foreground mb-2">
            DGE-Referenzwerte (25 Jahre, männlich)
          </p>
        )}
        <div className="space-y-3 bg-muted/30 rounded-xl p-4">
          <MacroBar
            label="Protein"
            value={nb.per_100g_protein_g ?? 0}
            max={Math.max(nb.per_100g_protein_g ?? 0, nb.per_100g_fat_g ?? 0, nb.per_100g_carbohydrate_g ?? 0)}
            color="bg-red-500"
            dgeRef={nb.dge_reference.protein_g}
            dgeCoverage={nb.dge_coverage.protein_g}
          />
          <MacroBar
            label="Fett"
            value={nb.per_100g_fat_g ?? 0}
            max={Math.max(nb.per_100g_protein_g ?? 0, nb.per_100g_fat_g ?? 0, nb.per_100g_carbohydrate_g ?? 0)}
            color="bg-amber-500"
            dgeRef={nb.dge_reference.fat_g}
            dgeCoverage={nb.dge_coverage.fat_g}
          />
          <MacroBar
            label="davon gesättigt"
            value={nb.per_100g_fat_sat_g ?? 0}
            max={nb.per_100g_fat_g ?? 1}
            color="bg-amber-300"
            dgeRef={nb.dge_reference.fat_sat_g}
            dgeCoverage={nb.dge_coverage.fat_sat_g}
          />
          <MacroBar
            label="Kohlenhydrate"
            value={nb.per_100g_carbohydrate_g ?? 0}
            max={Math.max(nb.per_100g_protein_g ?? 0, nb.per_100g_fat_g ?? 0, nb.per_100g_carbohydrate_g ?? 0)}
            color="bg-teal-500"
            dgeRef={nb.dge_reference.carbohydrate_g}
            dgeCoverage={nb.dge_coverage.carbohydrate_g}
          />
          <MacroBar
            label="davon Zucker"
            value={nb.per_100g_sugar_g ?? 0}
            max={nb.per_100g_carbohydrate_g ?? 1}
            color="bg-teal-300"
            dgeRef={nb.dge_reference.sugar_g}
            dgeCoverage={nb.dge_coverage.sugar_g}
          />
          <MacroBar
            label="Ballaststoffe"
            value={nb.per_100g_fibre_g ?? 0}
            max={nb.dge_reference.fibre_g ?? 30}
            color="bg-green-500"
            dgeRef={nb.dge_reference.fibre_g}
            dgeCoverage={nb.dge_coverage.fibre_g}
          />
          <MacroBar
            label="Salz"
            value={nb.per_100g_salt_g ?? 0}
            max={nb.dge_reference.salt_g ?? 6}
            color="bg-blue-500"
            dgeRef={nb.dge_reference.salt_g}
            dgeCoverage={nb.dge_coverage.salt_g}
          />
        </div>
      </div>

      <MicronutrientSection
        title="Vitamine (pro 100g)"
        icon="medication"
        accentColor="text-amber-600"
        nutrients={[
          { label: 'Vitamin C', value: nb.per_100g_vitamin_c_mg, unit: 'mg', dgeKey: 'vitamin_c_mg', per100g: true },
        ]}
        dgeCoverage={nb.dge_coverage}
      />

      {typeStats && typeStats.count >= 10 && (
        <>
          <RecipeHistogram
            buckets={typeStats.energy_buckets}
            recipeValue={nb.per_serving_energy_kcal ?? 0}
            label="Kalorienverteilung (kcal pro Portion)"
            unit="kcal"
          />
          {typeStats.protein_buckets.length > 0 && (
            <RecipeHistogram
              buckets={typeStats.protein_buckets}
              recipeValue={nb.per_serving_protein_g ?? 0}
              label="Proteinverteilung (g pro Portion)"
              unit="g"
              className="mt-4"
            />
          )}
          <RecipeCategoryBenchmark
            stats={typeStats}
            currentValue={nb.per_serving_energy_kcal ?? 0}
            metric="energy"
          />
        </>
      )}
    </div>
  );
}
