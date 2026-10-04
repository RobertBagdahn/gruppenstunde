/**
 * RecipeImprovements — Unified top-5 improvement list for a recipe.
 *
 * Merges Nutri-Score candidates and Rule-based suggestions into a single ranked list.
 * Each card shows parameter, current → threshold value, delta progress,
 * recommendation text and a details button.
 */
import { useState } from 'react';
import { Info, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NutritionBaseBadge } from '@/components/recipe/NutritionBaseBadge';
import { useRecipeImprovements } from '@/api/recipes';
import type { Improvement, RecipeItemNutrition } from '@/schemas/recipe';
import HintDetailModal from './HintDetailModal';
import { formatNumber } from '@/lib/format';
import { Icon } from '@/components/ui/icon';
import { SkeletonTableRows } from '@/components/ui/skeleton';

interface RecipeImprovementsProps {
  recipeId: number;
  breakdownItems: RecipeItemNutrition[];
  totalWeightG: number;
  portions: number;
}

const DIRECTION_META: Record<string, { label: string; icon: string; color: string }> = {
  reduce: { label: 'Reduzieren', icon: 'arrow_downward', color: 'text-danger' },
  increase: { label: 'Erhöhen', icon: 'arrow_upward', color: 'text-success' },
};

function formatValue(value: number, unit: string): string {
  const rounded = value >= 100 ? formatNumber(value, { maxDecimals: 0 }) : formatNumber(value, { maxDecimals: 1 });
  return `${rounded} ${unit}`.trim();
}

export default function RecipeImprovements({ recipeId, breakdownItems, totalWeightG, portions }: RecipeImprovementsProps) {
  const { data, isLoading, error, refetch } = useRecipeImprovements(recipeId);
  const [selected, setSelected] = useState<Improvement | null>(null);

  // Convert per-100g values from backend to per-serving for display consistency
  const perServingFactor = totalWeightG > 0 && portions > 0
    ? (totalWeightG / 100) / portions
    : 1;

  if (isLoading) {
    return (
      <SkeletonTableRows rows={2} columns={1} label="Verbesserungen werden geladen" />
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-xl border border-border bg-muted/40 p-4 flex items-start gap-3">
        <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-body text-muted-foreground">
            Verbesserungsvorschläge konnten nicht geladen werden.
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 h-7 px-2 text-caption"
            onClick={() => refetch()}
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Erneut versuchen
          </Button>
        </div>
      </div>
    );
  }

  if (data.all_good) {
    return (
      <div className="rounded-xl border bg-success-soft border-success-border p-4 flex items-start gap-3">
        <Icon name="check_circle" size={24} className="text-success mt-0.5" />
        <div>
          <p className="text-body font-medium text-success">
            {data.message || 'Dieses Rezept sieht gut aus.'}
          </p>
          <p className="text-caption text-success mt-0.5">
            Keine Verbesserungsvorschläge – alle Nährwerte liegen im grünen Bereich.
          </p>
        </div>
      </div>
    );
  }

  if (!data.is_applicable || data.items.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-muted/40 p-4 flex items-start gap-3">
        <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-body text-muted-foreground leading-relaxed">
          {data.message || 'Keine Verbesserungsvorschläge verfügbar.'}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {data.items.map((imp, idx) => {
          const dir = DIRECTION_META[imp.direction] ?? DIRECTION_META.reduce;
          const canShowDetails = imp.source !== 'nutri_score';
          // Convert per-100g current value from backend to per-serving for display
          // Threshold values are already per-serving targets (e.g. DGE recommendations)
          const displayCurrent = imp.current_value * perServingFactor;
          const displayThreshold = imp.threshold_value;
          const displayDelta = Math.abs(displayThreshold - displayCurrent);
          // Progress bar: how close current is to threshold
          const progressPct = (() => {
            if (displayThreshold <= 0) return 0;
            if (imp.direction === 'reduce') {
              if (displayCurrent <= 0) return 100;
              return Math.min(100, (displayThreshold / displayCurrent) * 100);
            }
            return Math.min(100, (displayCurrent / displayThreshold) * 100);
          })();
          return (
            <div
              key={`${imp.parameter}-${idx}`}
              className="rounded-xl bg-card p-4 space-y-3 shadow-card"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Icon name={dir.icon} size={16} className={dir.color} />
                    <span className="text-body font-semibold">{imp.parameter_label}</span>
                    <span className={`text-caption font-medium ${dir.color}`}>{dir.label}</span>
                    <NutritionBaseBadge base="per_portion" />
                    {imp.source === 'merged' && (
                      <span className="inline-flex items-center rounded-full bg-info-soft px-2 py-0.5 text-caption font-medium text-info">
                        Doppel-Treffer
                      </span>
                    )}
                  </div>
                  <p className="text-caption text-muted-foreground mt-1">
                    Aktuell: <span className="font-medium text-foreground">{formatValue(displayCurrent, imp.unit)}</span>
                    {' '} → Ziel: <span className="font-medium text-foreground">{formatValue(displayThreshold, imp.unit)}</span>
                    {' '} (Δ {formatValue(displayDelta, imp.unit)})
                  </p>
                </div>
              </div>

              {/* Progress bar toward threshold */}
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${imp.direction === 'reduce' ? 'bg-danger' : 'bg-success'}`}
                  style={{ width: `${progressPct}%` }}
                />
              </div>

              {imp.recommendation_text && (
                <p className="text-caption text-muted-foreground">{imp.recommendation_text}</p>
              )}

              {imp.suggested_ingredients.length > 0 && (
                <div className="space-y-1">
                  <p className="text-caption font-medium text-muted-foreground">Hauptverursacher:</p>
                  {imp.suggested_ingredients.slice(0, 3).map((ing) => (
                    <div key={ing.id} className="flex items-center gap-2 text-caption">
                      <span className="flex-1 truncate">{ing.name}</span>
                      <span className="text-muted-foreground">
                        {formatNumber(ing.contribution_g, { maxDecimals: 0 })}{ing.unit}
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
                  <Icon name="info" size={16} className="mr-1" />
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
