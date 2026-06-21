/**
 * HintDetailModal — Sheet/modal showing ingredient analysis for a recipe
 * improvement item, with percentage contribution breakdown and LLM suggestions.
 */
import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useLlmSuggestions } from '@/api/recipes';
import { useRecipeModificationStore } from '@/store/useRecipeModificationStore';
import type { Improvement, LlmSuggestion, RecipeItemNutrition } from '@/schemas/recipe';

interface HintDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  improvement: Improvement | null;
  recipeId: number;
  breakdownItems: RecipeItemNutrition[];
}

/** Find which ingredients contribute most to a given parameter */
function getTopContributors(
  items: RecipeItemNutrition[],
  parameter: string,
): Array<{ name: string; value: number; pct: number }> {
  // Map hint parameter names to RecipeItemNutrition fields
  const paramMap: Record<string, keyof RecipeItemNutrition> = {
    energy_kcal: 'energy_kcal',
    protein_g: 'protein_g',
    fat_g: 'fat_g',
    fat_sat_g: 'fat_sat_g',
    carbohydrate_g: 'carbohydrate_g',
    sugar_g: 'sugar_g',
    fibre_g: 'fibre_g',
    salt_g: 'salt_g',
    // Vitamins
    vitamin_c_mg: 'vitamin_c_mg',
  };

  const field = paramMap[parameter];
  if (!field) return [];

  const total = items.reduce((sum, item) => sum + (Number(item[field]) || 0), 0);
  if (total <= 0) return [];

  return items
    .map((item) => {
      const val = Number(item[field]) || 0;
      return {
        name: item.ingredient_name,
        value: val,
        pct: (val / total) * 100,
      };
    })
    .filter((c) => c.pct > 0)
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 5);
}

function SuggestionCard({
  suggestion,
  onApply,
}: {
  suggestion: LlmSuggestion;
  onApply: (suggestion: LlmSuggestion) => void;
}) {
  return (
    <div className="rounded-xl border bg-card p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <p className="font-medium text-sm">
            {suggestion.ingredient_name}
          </p>
          <p className="text-xs text-muted-foreground">
            {suggestion.recommended_amount} {suggestion.unit}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onApply(suggestion)}
          className="shrink-0"
        >
          <span className="material-symbols-outlined text-sm mr-1">add</span>
          Hinzufügen
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">{suggestion.reasoning}</p>
      <p className="text-xs text-green-700">
        <span className="material-symbols-outlined text-xs align-middle mr-0.5">trending_up</span>
        {suggestion.expected_improvement}
      </p>
    </div>
  );
}

export default function HintDetailModal({
  open,
  onOpenChange,
  improvement,
  recipeId,
  breakdownItems,
}: HintDetailModalProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const llmMutation = useLlmSuggestions(recipeId);
  const addItem = useRecipeModificationStore((s) => s.addItem);

  if (!improvement) return null;

  const parameter = improvement.parameter;
  const contributors = getTopContributors(breakdownItems, parameter);

  const handleRequestSuggestions = () => {
    setShowSuggestions(true);
    llmMutation.mutate({ objective: parameter, direction: improvement.direction });
  };

  const handleApplySuggestion = (suggestion: LlmSuggestion) => {
    // Add as a new item to the modification store
    // Generate a temporary negative ID for new items
    const tempId = -(Date.now() % 100000);
    addItem({
      recipe_item_id: tempId,
      ingredient_id: null,
      ingredient_name: suggestion.ingredient_name,
      quantity: suggestion.recommended_amount,
      portion_name: suggestion.unit,
      weight_g: suggestion.recommended_amount, // approximation
      price_eur: null,
      energy_kcal: 0,
      protein_g: 0,
      fat_g: 0,
      fat_sat_g: 0,
      carbohydrate_g: 0,
      sugar_g: 0,
      fibre_g: 0,
      salt_g: 0,
      weight_pct: 0,
      contributions: [],
    });
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <span className="material-symbols-outlined text-amber-600">
              lightbulb
            </span>
            {improvement.parameter_label}
          </SheetTitle>
          <SheetDescription>
            Aktuell {improvement.current_value} {improvement.unit} · Zielwert {improvement.threshold_value} {improvement.unit}
          </SheetDescription>
        </SheetHeader>

        {/* Recommendation text */}
        {improvement.recommendation_text && (
          <div className="mt-4 p-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-800 whitespace-pre-line">
            <div className="flex items-start gap-2">
              <span className="material-symbols-outlined text-base text-green-600 mt-0.5">
                tips_and_updates
              </span>
              <p>{improvement.recommendation_text}</p>
            </div>
          </div>
        )}

        {/* Ingredient contribution analysis */}
        {contributors.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-base">analytics</span>
              Zutat-Beiträge ({parameter.replace('_', ' ')})
            </h3>
            <div className="space-y-2">
              {contributors.map((c) => (
                <div key={c.name} className="flex items-center gap-2">
                  <span className="text-xs flex-1 truncate">{c.name}</span>
                  <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${Math.min(c.pct, 100)}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground w-12 text-right">
                    {c.pct.toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* LLM Suggestions section */}
        <div className="mt-6 border-t pt-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-base">auto_awesome</span>
            KI-Vorschläge
          </h3>

          {!showSuggestions && (
            <Button
              variant="outline"
              className="w-full"
              onClick={handleRequestSuggestions}
            >
              <span className="material-symbols-outlined text-sm mr-1.5">auto_awesome</span>
              KI-Vorschläge anfordern
            </Button>
          )}

          {llmMutation.isPending && (
            <div className="flex items-center justify-center gap-2 p-6 text-muted-foreground">
              <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
              <span className="text-sm">KI analysiert Rezept...</span>
            </div>
          )}

          {llmMutation.isError && (
            <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">
              <p>Fehler beim Laden der Vorschläge.</p>
              <Button
                variant="ghost"
                size="sm"
                className="mt-2"
                onClick={handleRequestSuggestions}
              >
                Erneut versuchen
              </Button>
            </div>
          )}

          {llmMutation.data && (
            <div className="space-y-3">
              {llmMutation.data.map((suggestion, idx) => (
                <SuggestionCard
                  key={idx}
                  suggestion={suggestion}
                  onApply={handleApplySuggestion}
                />
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
