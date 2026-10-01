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
        <h3 className="text-body font-semibold mb-3 flex items-center gap-2">
          Inhaltsstoffe
          <NutritionBaseBadge base="per_portion" />
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <NutrientCard
            label="Kalorien"
            value={nb.per_serving_energy_kcal ?? 0}
            unit="kcal"
            icon="local_fire_department"
            color="text-warning"
            bgColor="bg-warning-soft border-warning-border"
          />
          <NutrientCard
            label="Protein"
            value={nb.per_serving_protein_g ?? 0}
            unit="g"
            icon="fitness_center"
            color="text-danger"
            bgColor="bg-danger-soft border-danger-border"
          />
          <NutrientCard
            label="Fett"
            value={nb.per_serving_fat_g ?? 0}
            unit="g"
            icon="water_drop"
            color="text-warning"
            bgColor="bg-warning-soft border-warning-border"
          />
          <NutrientCard
            label="Kohlenhydrate"
            value={nb.per_serving_carbohydrate_g ?? 0}
            unit="g"
            icon="grain"
            color="text-success"
            bgColor="bg-success-soft border-success-border"
          />
        </div>
      </div>

      <CollapsibleContributions items={nb.items} />

      {(nb.per_100g_protein_g || nb.per_100g_fat_g || nb.per_100g_carbohydrate_g) && (
        <div>
          <h3 className="text-body font-semibold mb-3">Makronährstoff-Verteilung</h3>
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
        <h3 className="text-body font-semibold mb-3 flex items-center gap-2">
          Gesamtnährwerte
          <NutritionBaseBadge base="total" />
        </h3>
        {(Object.keys(nb.dge_reference).length > 0) && (
          <p className="text-caption text-muted-foreground mb-2">
            Anteil am Tagesbedarf laut DGE (25 Jahre, männlich), bezogen auf das ganze Rezept
          </p>
        )}
        <div className="space-y-3 bg-muted/30 rounded-xl p-4">
          <MacroBar
            label="Protein"
            value={nb.total_protein_g ?? 0}
            max={Math.max(nb.total_protein_g ?? 0, nb.total_fat_g ?? 0, nb.total_carbohydrate_g ?? 0)}
            color="bg-danger"
            dgeRef={nb.dge_reference.protein_g}
            dgeCoverage={nb.dge_coverage.protein_g}
          />
          <MacroBar
            label="Fett"
            value={nb.total_fat_g ?? 0}
            max={Math.max(nb.total_protein_g ?? 0, nb.total_fat_g ?? 0, nb.total_carbohydrate_g ?? 0)}
            color="bg-warning"
            dgeRef={nb.dge_reference.fat_g}
            dgeCoverage={nb.dge_coverage.fat_g}
          />
          <MacroBar
            label="davon gesättigt"
            value={nb.total_fat_sat_g ?? 0}
            max={nb.total_fat_g ?? 1}
            color="bg-warning"
            dgeRef={nb.dge_reference.fat_sat_g}
            dgeCoverage={nb.dge_coverage.fat_sat_g}
          />
          <MacroBar
            label="Kohlenhydrate"
            value={nb.total_carbohydrate_g ?? 0}
            max={Math.max(nb.total_protein_g ?? 0, nb.total_fat_g ?? 0, nb.total_carbohydrate_g ?? 0)}
            color="bg-success"
            dgeRef={nb.dge_reference.carbohydrate_g}
            dgeCoverage={nb.dge_coverage.carbohydrate_g}
          />
          <MacroBar
            label="davon Zucker"
            value={nb.total_sugar_g ?? 0}
            max={nb.total_carbohydrate_g ?? 1}
            color="bg-success"
            dgeRef={nb.dge_reference.sugar_g}
            dgeCoverage={nb.dge_coverage.sugar_g}
          />
          <MacroBar
            label="Ballaststoffe"
            value={nb.total_fibre_g ?? 0}
            max={nb.dge_reference.fibre_g ?? 30}
            color="bg-success"
            dgeRef={nb.dge_reference.fibre_g}
            dgeCoverage={nb.dge_coverage.fibre_g}
          />
          <MacroBar
            label="Salz"
            value={nb.total_salt_g ?? 0}
            max={nb.dge_reference.salt_g ?? 6}
            color="bg-info"
            dgeRef={nb.dge_reference.salt_g}
            dgeCoverage={nb.dge_coverage.salt_g}
          />
        </div>
      </div>

      <MicronutrientSection
        title="Vitamine (pro 100g)"
        icon="medication"
        accentColor="text-warning"
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
