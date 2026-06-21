import { useMemo, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, X } from 'lucide-react';
import type { RecipeDetail } from '@/schemas/recipe';
import { parseRecipeSteps } from '@/lib/parseRecipeSteps';
import { useWakeLock } from '@/hooks/useWakeLock';
import { Button } from '@/components/ui/button';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import IngredientList from '@/components/supply/IngredientList';

interface RecipeCookingModeProps {
  recipe: RecipeDetail;
  portionsMultiplier: number;
  onPortionsChange?: (multiplier: number) => void;
}

export default function RecipeCookingMode({
  recipe,
  portionsMultiplier,
}: RecipeCookingModeProps) {
  const [searchParams, setSearchParams] = useSearchParams();

  // Parse steps from description
  const steps = useMemo(
    () => parseRecipeSteps(recipe.description),
    [recipe.description],
  );

  // Read step from URL, clamped
  const rawStep = Number(searchParams.get('step') ?? 0);
  const currentStep = Math.max(0, Math.min(rawStep, steps.length - 1));

  // Wake lock
  useWakeLock();

  // Navigation helpers
  const goToStep = useCallback(
    (step: number) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set('mode', 'cooking');
          next.set('step', String(step));
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
        <IngredientList
          items={recipe.recipe_items}
          portions={recipe.portions}
          portionsMultiplier={portionsMultiplier}
          className="text-base"
        />
      </div>

      {/* Step content (right on desktop, bottom on mobile) */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Step indicator */}
        <div className="px-6 pt-4 pb-2 text-sm text-muted-foreground font-medium">
          Schritt {currentStep + 1} / {steps.length}
        </div>

        {/* Step content */}
        <div className="flex-1 overflow-y-auto px-6 pb-4">
          {steps.length > 0 ? (
            <MarkdownRenderer
              content={steps[currentStep]}
              className="text-xl lg:text-2xl leading-relaxed"
            />
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
