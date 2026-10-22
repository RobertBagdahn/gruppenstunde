import { useMemo, useEffect, useCallback, useState } from 'react';
import FlowHeader from '@/components/shared/FlowHeader';
import ActionBar from '@/components/shared/ActionBar';
import { useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, X } from 'lucide-react';
import type { RecipeDetail } from '@/schemas/recipe';
import type { RecipeStep } from '@/schemas/recipeStep';
import { parsePreparationSteps } from '@/lib/parseRecipeSteps';
import { useWakeLock } from '@/hooks/useWakeLock';
import { Button } from '@/components/ui/button';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import StepIngredientChips from '@/components/recipe/StepIngredientChips';
import { formatScaledRecipeAmount } from '@/lib/ingredientAmount';

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

/** True from 1024 px up; the title is rendered once per layout so the page has one H1. */
function useIsDesktopLayout(): boolean {
  const query = '(min-width: 1024px)';
  const [isDesktop, setIsDesktop] = useState(() => typeof window.matchMedia === 'function' && window.matchMedia(query).matches);
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return undefined;
    const media = window.matchMedia(query);
    const update = () => setIsDesktop(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  return isDesktop;
}

export default function RecipeCookingMode({
  recipe,
  portionsMultiplier,
}: RecipeCookingModeProps) {
  const isDesktop = useIsDesktopLayout();
  const [searchParams, setSearchParams] = useSearchParams();
  const storageKey = `cooking_mode_ingredients_${recipe.id}`;
  // Same serving scale for the ingredient list and the step chips;
  // recipe quantities are stored per person.
  const scale = portionsMultiplier;

  const [checkedIngredients, setCheckedIngredients] = useState<Set<number>>(() => {
    if (typeof window === 'undefined') return new Set();
    try {
      const saved = sessionStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return new Set<number>(parsed);
        }
      }
    } catch {
      // ignore storage errors
    }
    return new Set();
  });

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
      const parsedSteps = parsePreparationSteps(recipe.description);
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

  // Toggle ingredient checkbox (session-scoped, persisted in sessionStorage)
  const toggleIngredientCheck = useCallback((itemId: number) => {
    setCheckedIngredients((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      try {
        sessionStorage.setItem(storageKey, JSON.stringify(Array.from(newSet)));
      } catch {
        // ignore storage errors
      }
      return newSet;
    });
  }, [storageKey]);

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
    <div className="fixed inset-0 z-50 flex flex-col bg-background pb-[calc(5.5rem+env(safe-area-inset-bottom))] lg:pb-0 lg:flex-row">
      {/* Flow header on phones: close, the recipe as H1, progress (food-page-shell) */}
      {!isDesktop && (
        <div className="absolute inset-x-0 top-0 z-10">
          <FlowHeader
            title={recipe.title}
            onClose={exit}
            closeLabel="Kochmodus verlassen"
            progress={`Schritt ${currentStep + 1} von ${steps.length}`}
            progressValue={steps.length > 0 ? ((currentStep + 1) / steps.length) * 100 : 0}
          />
        </div>
      )}

      {/* Ingredients panel (left on desktop, top on mobile) */}
      <div className="mt-[7.5rem] lg:mt-0 lg:w-80 lg:border-r border-line overflow-y-auto p-4 lg:p-6 shrink-0 max-h-[36vh] lg:max-h-full">
        <h2 className="text-body font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Zutaten
        </h2>
        <div className="space-y-2">
          {recipe.recipe_items.map((item) => {
            const amount = formatScaledRecipeAmount(item, scale);
            const isChecked = checkedIngredients.has(item.id);

            return (
              <label
                key={item.id}
                className="flex items-start gap-2 p-2 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggleIngredientCheck(item.id)}
                  className="w-4 h-4 mt-1 rounded-lg border-2 border-muted-foreground accent-primary"
                  aria-label={`Mark ${item.ingredient_name} as done`}
                />
                <div className={`flex-1 min-w-0 ${isChecked ? 'opacity-50 line-through' : ''}`}>
                  <div className="font-medium text-body">
                    {amount.primary}
                    {amount.secondary && (
                      <span className="ml-1 text-caption font-normal text-muted-foreground">({amount.secondary})</span>
                    )}
                  </div>
                  <div className="text-caption text-muted-foreground">
                    {item.ingredient_name}
                    {item.note && <span className="italic ml-1">({item.note.trim().replace(/^\((.*)\)$/, '$1').trim()})</span>}
                  </div>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {/* Step content (right on desktop, bottom on mobile) */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Desktop: the header of the flow sits above the step */}
        {isDesktop && (
          <div className="flex px-6 pt-4 pb-2 lg:items-center lg:justify-between lg:gap-4">
            <h1 className="min-w-0 truncate font-display text-section font-bold text-foreground">{recipe.title}</h1>
            <span className="shrink-0 text-body font-semibold tabular-nums text-muted-foreground">
              Schritt {currentStep + 1} von {steps.length}
            </span>
            <Button variant="ghost" size="icon" onClick={exit} aria-label="Kochmodus verlassen">
              <X className="h-5 w-5" aria-hidden="true" />
            </Button>
          </div>
        )}

        {/* Step content */}
        <div className="flex-1 overflow-y-auto px-4 pb-4 pt-4 md:px-6 lg:pt-0">
          {steps.length > 0 && step ? (
            <>
              {/* Step section tag (if structured) */}
              {step.section && (
                <div className="text-caption font-semibold text-primary uppercase tracking-wide mb-3">
                  {step.section}
                </div>
              )}

              {/* Step instruction */}
              <MarkdownRenderer
                content={step.content}
                className="text-section lg:text-title leading-relaxed"
              />

              {step.stepIngredients && (
                <StepIngredientChips ingredients={step.stepIngredients} scale={scale} className="mt-4" />
              )}

              {/* Duration (if structured) */}
              {step.durationMinutes && (
                <div className="mt-4 pt-4 border-t border-border text-body text-muted-foreground">
                  ⏱ ca. {step.durationMinutes} min
                </div>
              )}
            </>
          ) : (
            <p className="text-muted-foreground text-emphasis">
              Keine Zubereitungsschritte vorhanden.
            </p>
          )}
        </div>

        <div className="px-4 pb-0 md:px-6 md:pb-4">
          <ActionBar
            secondary={
              <Button variant="outline" size="lg" onClick={() => goToStep(currentStep - 1)} disabled={currentStep <= 0} className="h-11 font-semibold">
                <ArrowLeft className="mr-2 h-4 w-4 md:block" />
                Zurück
              </Button>
            }
            primary={
              <Button size="lg" onClick={() => goToStep(currentStep + 1)} disabled={currentStep >= steps.length - 1} className="h-11 font-semibold">
                Weiter
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            }
          />
        </div>
      </div>
    </div>
  );
}
