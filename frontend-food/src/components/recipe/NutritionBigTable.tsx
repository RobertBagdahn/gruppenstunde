/**
 * NutritionBigTable - Three-column nutrition table
 * Shows: per 100g | pro Portion | Gesamt (× n Portionen) | DGE-%
 */

import type { RecipeDetail } from '@/schemas/recipe';

interface NutritionBigTableProps {
  recipe: RecipeDetail;
  portions: number;
}

export default function NutritionBigTable({ recipe, portions }: NutritionBigTableProps) {
  const nutrients = [
    { key: 'energy', label: 'Energie', value: recipe.cached_energy_kcal, unit: 'kcal', dge: 2000 },
    { key: 'protein', label: 'Protein', value: recipe.cached_protein_g, unit: 'g', dge: 50 },
    { key: 'fat', label: 'Fett', value: recipe.cached_fat_g, unit: 'g', dge: 78 },
    { key: 'carbs', label: 'Kohlenhydrate', value: recipe.cached_carbohydrate_g, unit: 'g', dge: 310 },
    { key: 'fiber', label: 'Ballaststoffe', value: recipe.cached_fibre_g, unit: 'g', dge: 30 },
  ];

  const weight = (recipe as any).cached_weight_g || 100;

  return (
    <div className="rounded-lg border divide-y">
      <div className="grid grid-cols-5 gap-4 p-4 bg-muted/30 text-xs font-semibold text-muted-foreground">
        <div>Nährstoff</div>
        <div className="text-right">Pro 100g</div>
        <div className="text-right">Pro Portion</div>
        <div className="text-right">Gesamt</div>
        <div className="text-right">% DGE</div>
      </div>
      <div className="divide-y">
        {nutrients.map((nut) => {
          const per100g = nut.value || 0;
          const perPortion = (per100g * (weight / 100)) / (portions || 1);
          const total = per100g * (weight / 100);
          const dgePct = (total / nut.dge) * 100;

          return (
            <div key={nut.key} className="grid grid-cols-5 gap-4 p-4 text-sm">
              <div className="font-medium">{nut.label}</div>
              <div className="text-right text-muted-foreground">
                {per100g.toFixed(1)} {nut.unit}
              </div>
              <div className="text-right">{perPortion.toFixed(1)} {nut.unit}</div>
              <div className="text-right font-semibold">{total.toFixed(1)} {nut.unit}</div>
              <div className="text-right">
                {dgePct > 0 && (
                  <span className={dgePct > 100 ? 'text-orange-600' : 'text-green-600'}>
                    {dgePct.toFixed(0)}%
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
