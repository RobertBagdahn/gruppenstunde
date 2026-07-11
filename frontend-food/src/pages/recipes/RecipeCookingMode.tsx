import { useMemo, useEffect, useCallback, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, X } from 'lucide-react';
import type { RecipeDetail } from '@/schemas/recipe';
import type { RecipeStep } from '@/schemas/recipeStep';
import { parseRecipeSteps } from '@/lib/parseRecipeSteps';
import { useWakeLock } from '@/hooks/useWakeLock';
import { Button } from '@/components/ui/button';
import MarkdownRenderer from '@/components/MarkdownRenderer';

interface RecipeCookingModeProps {
  recipe: RecipeDetail;
  portionsMultiplier: number;
  onPortionsChange?: (multiplier: number) => void;
}

interface CookingStep {
  id: string | number;
  content: string; // Instruction text
  durationMinutes?: number;
  section?: string;
  stepIngredients?: RecipeStep['step_ingredients'];
}

export default function RecipeCookingMode({
  recipe,
  portionsMultiplier,
}: RecipeCookingModeProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [checkedIngredients, setCheckedIngredients] = useState<Set<number>>(new Set());

  // Determine steps: use structured steps if available, otherwise parse from description
  const steps = useMemo(() => {
    const cookingSteps: CookingStep[] = [];

    // Use structured steps if available
    if (recipe.steps && recipe.steps.length > 0) {
      cookingSteps.push(
        ...recipe.steps.map((step) => ({
          id: step.id,
          content: step.instruction,
          durationMinutes: step.duration_minutes ?? undefined,
          section: step.section || undefined,
          stepIngredients: step.step_ingredients,
        }))
      );
    } else {
      // Fallback: parse from description
      const parsedSteps = parseRecipeSteps(recipe.description);
      cookingSteps.push(
        ...parsedSteps.map((content, index) => ({
          id: index,
          content,
        }))
      );
    }

    return cookingSteps;
  }, [recipe.steps, recipe.description]);

  // Read step from URL, clamped
  const rawStep = Number(searchParams.get('step') ?? 0);
  const currentStep = Math.max(0, Math.min(rawStep, steps.length - 1));
  const step = steps[currentStep];

  // Wake lock
  useWakeLock();

  // Navigation helpers
  const goToStep = useCallback(
    (stepIndex: number) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set('mode', 'cooking');
          next.set('step', String(stepIndex));
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const exit = useCallback(() => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete('mode');
        next.delete('step');
        return next;
      },
      { replace: true },
    );
  }, [setSearchParams]);

  // Toggle ingredient checkbox (session-scoped, no server save)
  const toggleIngredientCheck = useCallback((itemId: number) => {
    setCheckedIngredients((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        exit();
      } else if (e.key === 'ArrowRight' && currentStep < steps.length - 1) {
        goToStep(currentStep + 1);
      } else if (e.key === 'ArrowLeft' && currentStep > 0) {
        goToStep(currentStep - 1);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [exit, goToStep, currentStep, steps.length]);

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col lg:flex-row">
      {/* Exit button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={exit}
        className="absolute top-3 right-3 z-10 animate-fade-in"
        aria-label="Kochmodus verlassen"
      >
        <X className="w-5 h-5 text-muted-foreground hover:text-foreground" />
      </Button>

      {/* Ingredients panel (left on desktop, top on mobile) */}
      <div className="lg:w-80 lg:border-r border-border overflow-y-auto p-4 lg:p-6 shrink-0 max-h-[40vh] lg:max-h-full">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Zutaten
        </h2>
        <div className="space-y-2">
          {recipe.recipe_items.map((item) => {
            const basePortions = recipe.portions ?? 1;
            const scale = basePortions > 0 ? portionsMultiplier / basePortions : 1;
            const scaledQty = item.quantity * scale;
            const isChecked = checkedIngredients.has(item.id);
            
            return (
              <label
                key={item.id}
                className="flex items-start gap-2 p-2 rounded cursor-pointer hover:bg-muted/50 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggleIngredientCheck(item.id)}
                  className="w-4 h-4 mt-1 rounded border-2 border-muted-foreground accent-primary"
                  aria-label={`Mark ${item.ingredient_name} as done`}
                />
                <div className={`flex-1 min-w-0 ${isChecked ? 'opacity-50 line-through' : ''}`}>
                  <div className="font-medium text-sm">
                    {scaledQty % 1 === 0 ? scaledQty : parseFloat(scaledQty.toFixed(2))} {item.measuring_unit_name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {item.ingredient_name}
                    {item.note && <span className="italic ml-1">({item.note})</span>}
                  </div>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {/* Step content (right on desktop, bottom on mobile) */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Step indicator */}
        <div className="px-6 pt-4 pb-2 text-sm text-muted-foreground font-medium">
          Schritt {currentStep + 1} / {steps.length}
        </div>

        {/* Step content */}
        <div className="flex-1 overflow-y-auto px-6 pb-4">
          {steps.length > 0 && step ? (
            <>
              {/* Step section tag (if structured) */}
              {step.section && (
                <div className="text-xs font-semibold text-primary uppercase tracking-wide mb-3">
                  {step.section}
                </div>
              )}

              {/* Step instruction */}
              <MarkdownRenderer
                content={step.content}
                className="text-xl lg:text-2xl leading-relaxed"
              />

              {/* Duration (if structured) */}
              {step.durationMinutes && (
                <div className="mt-4 pt-4 border-t border-border text-sm text-muted-foreground">
                  ⏱ ca. {step.durationMinutes} min
                </div>
              )}
            </>
          ) : (
            <p className="text-muted-foreground text-lg">
              Keine Zubereitungsschritte vorhanden.
            </p>
          )}
        </div>

        {/* Navigation buttons */}
        <div className="flex items-center justify-between gap-4 p-4 border-t border-border">
          <Button
            variant="outline"
            size="lg"
            onClick={() => goToStep(currentStep - 1)}
            disabled={currentStep <= 0}
            className="font-semibold"
          >
            <ArrowLeft className="mr-2 w-4 h-4" />
            Zurück
          </Button>
          <Button
            size="lg"
            onClick={() => goToStep(currentStep + 1)}
            disabled={currentStep >= steps.length - 1}
            className="bg-primary hover:bg-primary/90 text-white font-semibold"
          >
            Weiter
            <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
