/**
 * RecipeImprovements — Unified top-5 improvement list for a recipe.
 *
 * Merges Nutri-Score candidates and RecipeHints into a single ranked list.
 * Each card shows parameter, current → threshold value, delta progress,
 * recommendation text and (for hint-based items) a details button.
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useRecipeImprovements } from '@/api/recipes';
import type { Improvement, RecipeItemNutrition } from '@/schemas/recipe';
import HintDetailModal from './HintDetailModal';

interface RecipeImprovementsProps {
  recipeId: number;
  breakdownItems: RecipeItemNutrition[];
}

const DIRECTION_META: Record<string, { label: string; icon: string; color: string }> = {
  reduce: { label: 'Reduzieren', icon: 'arrow_downward', color: 'text-red-600' },
  increase: { label: 'Erhöhen', icon: 'arrow_upward', color: 'text-green-600' },
};

const HINT_LEVEL_STYLES: Record<string, { border: string; bar: string }> = {
  error: { border: 'border-red-300 bg-red-50', bar: 'bg-red-400' },
  warn: { border: 'border-amber-300 bg-amber-50', bar: 'bg-amber-400' },
  info: { border: 'border-blue-200 bg-blue-50', bar: 'bg-blue-400' },
};

function computeProgressPct(improvement: Improvement): number {
  const { current_value, threshold_value, direction } = improvement;
  if (threshold_value <= 0) return 0;
  if (direction === 'reduce') {
    // current > threshold → over target; progress = threshold / current
    if (current_value <= 0) return 100;
    return Math.min(100, (threshold_value / current_value) * 100);
  }
  // increase: current < threshold → progress = current / threshold
  return Math.min(100, (current_value / threshold_value) * 100);
}

function formatValue(value: number, unit: string): string {
  const rounded = value >= 100 ? value.toFixed(0) : value.toFixed(1);
  return `${rounded} ${unit}`.trim();
}

export default function RecipeImprovements({ recipeId, breakdownItems }: RecipeImprovementsProps) {
  const { data, isLoading, error } = useRecipeImprovements(recipeId);
  const [selected, setSelected] = useState<Improvement | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-2">
        <div className="h-20 rounded-xl bg-muted animate-pulse" />
        <div className="h-20 rounded-xl bg-muted animate-pulse" />
      </div>
    );
  }

  if (error || !data) return null;

  if (data.all_good) {
    return (
      <div className="rounded-xl border bg-emerald-50 border-emerald-200 p-4 flex items-start gap-3">
        <span className="material-symbols-outlined text-emerald-600 mt-0.5">check_circle</span>
        <div>
          <p className="text-sm font-medium text-emerald-800">
            {data.message || 'Dieses Rezept sieht gut aus.'}
          </p>
          <p className="text-xs text-emerald-700 mt-0.5">
            Keine Verbesserungsvorschläge – alle Nährwerte liegen im grünen Bereich.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {data.items.map((imp, idx) => {
          const dir = DIRECTION_META[imp.direction] ?? DIRECTION_META.reduce;
          const progressPct = computeProgressPct(imp);
          const canShowDetails = imp.source !== 'nutri_score';
          const levelStyle = HINT_LEVEL_STYLES[imp.hint_level];
          const cardClass = levelStyle
            ? `rounded-xl border p-4 space-y-3 ${levelStyle.border}`
            : 'rounded-xl border bg-card p-4 space-y-3';
          const barClass = levelStyle
            ? `h-full rounded-full ${levelStyle.bar}`
            : `h-full rounded-full ${imp.direction === 'reduce' ? 'bg-red-400' : 'bg-green-400'}`;
          return (
            <div
              key={`${imp.parameter}-${idx}`}
              className={cardClass}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`material-symbols-outlined text-base ${dir.color}`}>
                      {dir.icon}
                    </span>
                    <span className="text-sm font-semibold">{imp.parameter_label}</span>
                    <span className={`text-xs font-medium ${dir.color}`}>{dir.label}</span>
                    {imp.source === 'merged' && (
                      <span className="inline-flex items-center rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-medium text-indigo-700">
                        Doppel-Treffer
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Aktuell: <span className="font-medium text-foreground">{formatValue(imp.current_value, imp.unit)}</span>
                    {' '} → Ziel: <span className="font-medium text-foreground">{formatValue(imp.threshold_value, imp.unit)}</span>
                    {' '} (Δ {formatValue(Math.abs(imp.delta), imp.unit)})
                  </p>
                </div>
              </div>

              {/* Progress bar toward threshold */}
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={barClass}
                  style={{ width: `${progressPct}%` }}
                />
              </div>

              {imp.recommendation_text && (
                <p className="text-xs text-muted-foreground">{imp.recommendation_text}</p>
              )}

              {imp.suggested_ingredients.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Hauptverursacher:</p>
                  {imp.suggested_ingredients.slice(0, 3).map((ing) => (
                    <div key={ing.id} className="flex items-center gap-2 text-xs">
                      <span className="flex-1 truncate">{ing.name}</span>
                      <span className="text-muted-foreground">
                        {ing.contribution_g.toFixed(0)}{ing.unit}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {canShowDetails && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setSelected(imp)}
                >
                  <span className="material-symbols-outlined text-sm mr-1">info</span>
                  Details anzeigen
                </Button>
              )}
            </div>
          );
        })}
      </div>

      <HintDetailModal
        open={selected !== null}
        onOpenChange={(open) => { if (!open) setSelected(null); }}
        improvement={selected}
        recipeId={recipeId}
        breakdownItems={breakdownItems}
      />
    </>
  );
}
