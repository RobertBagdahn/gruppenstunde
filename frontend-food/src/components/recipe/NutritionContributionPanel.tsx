/**
 * Expandable panel showing which ingredients contribute most to a nutritional parameter.
 */

import { useState } from "react";
import type { RecipeItemNutrition } from "@/schemas/recipe";
import { roundToDecimals } from '@/lib/format';

/** German labels for contribution parameters, reusable across components. */
export const PARAMETER_LABELS: Record<string, string> = {
  energy: "Energie",
  protein: "Eiweiß",
  fat: "Fett",
  sat_fat: "Gesättigte Fettsäuren",
  carbs: "Kohlenhydrate",
  sugar: "Zucker",
  salt: "Salz",
  fiber: "Ballaststoffe",
};

interface NutritionContributionPanelProps {
  parameter: string;
  items: RecipeItemNutrition[];
  unit: string;
}

export function NutritionContributionPanel({
  parameter,
  items,
  unit,
}: NutritionContributionPanelProps) {
  const [showAll, setShowAll] = useState(false);

  const paramLabel = PARAMETER_LABELS[parameter] ?? parameter;

  // Extract contributions for this parameter from each item
  const contributors = items
    .map((item) => {
      const contrib = item.contributions.find((c) => c.parameter === parameter);
      return {
        name: item.ingredient_name,
        absolute: contrib?.absolute ?? 0,
        percent: contrib?.percent_of_recipe ?? 0,
      };
    })
    .filter((c) => c.percent > 0)
    .sort((a, b) => b.percent - a.percent);

  if (contributors.length === 0) {
    return (
      <p className="text-body text-muted-foreground">
        Keine Zutat trägt {paramLabel} bei.
      </p>
    );
  }

  const visible = showAll ? contributors : contributors.slice(0, 5);
  const hiddenCount = contributors.length - 5;

  return (
    <div className="space-y-2">
      {visible.map((c) => (
        <div key={c.name} className="flex items-center gap-2">
          <span className="text-body w-28 truncate shrink-0" title={c.name}>
            {c.name}
          </span>
          <div className="flex-1 h-2 bg-muted rounded-lg">
            <div
              style={{ width: `${Math.min(c.percent, 100)}%` }}
              className="h-full bg-primary/60 rounded-lg"
            />
          </div>
          <span className="text-body tabular-nums whitespace-nowrap shrink-0">
            {unit === 'kcal' ? Math.round(c.absolute) : roundToDecimals(c.absolute, 1)} {unit} &middot; {roundToDecimals(c.percent, 1)}%
          </span>
        </div>
      ))}
      {!showAll && hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="text-body text-primary hover:underline"
        >
          +{hiddenCount} weitere anzeigen
        </button>
      )}
      {showAll && hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => setShowAll(false)}
          className="text-body text-primary hover:underline"
        >
          Weniger anzeigen
        </button>
      )}
    </div>
  );
}
