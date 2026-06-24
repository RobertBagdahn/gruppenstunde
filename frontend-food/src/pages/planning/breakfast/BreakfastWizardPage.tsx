/**
 * BreakfastWizardPage — multi-step breakfast planning wizard.
 *
 * Route: /meal-plans/:id/ref-meals/breakfast/wizard (opened from RefMealEditorPage)
 * Wizard steps: Basis → Belag → Extras → Getränke → Cockpit
 */
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { useMealPlan } from '@/api/mealPlans';
import { useRefMeals } from '@/api/refMeals';
import { useSaveBreakfastWizard } from '@/api/breakfast';
import { useWizardState, STEP_LABELS, WIZARD_STEPS } from './useWizardState';
import StepBasis from './StepBasis';
import StepBelag from './StepBelag';
import StepExtras from './StepExtras';
import StepGetraenke from './StepGetraenke';
import StepCockpit from './StepCockpit';
import { useMemo } from 'react';
import type { WizardItemIn } from '@/api/breakfast';
import { toppingGramsPerPerson } from '@/lib/breakfastCalc';

export default function BreakfastWizardPage() {
  const { id } = useParams<{ id: string }>();
  const planId = Number(id) || 0;
  const navigate = useNavigate();

  const { data: plan } = useMealPlan(planId);
  const { data: refMeals } = useRefMeals(planId);
  const saveWizard = useSaveBreakfastWizard(planId);

  const existingRefMeal = useMemo(
    () => refMeals?.find((rm) => rm.meal_type === 'breakfast') ?? null,
    [refMeals],
  );

  const normPortions = plan?.norm_portions ?? 10;
  const dayPartFactor = existingRefMeal?.day_part_factor ?? 0.25;
  const days = 1; // Could be extended to support multi-day camps

  const wiz = useWizardState();
  const { state, step, currentStepIndex, canGoNext, canGoPrev, goNext, goPrev } = wiz;

  async function handleSave() {
    // Build MealItems from wizard state
    const items: WizardItemIn[] = [];

    // Basis bread items
    for (const b of state.basis.filter((b) => b.sharePercent > 0)) {
      // Each BE generates one ingredient item per basis type
      const beCount = state.bePerPerson * (b.sharePercent / 100);
      if (beCount <= 0) continue;
      items.push({
        ingredient_id: b.ingredientId,
        quantity: Math.round(b.sliceWeightG * beCount),
        measuring_unit_id: null, // grams (default)
      });
    }

    // Topping items
    for (const t of state.toppings.filter((t) => t.sharePercent > 0)) {
      const grams = toppingGramsPerPerson(state.bePerPerson, t, state.globalIntensity, state.toppings);
      if (grams <= 0) continue;
      items.push({
        ingredient_id: t.ingredientId,
        quantity: Math.round(grams),
        measuring_unit_id: null,
      });
    }

    // Warm dish recipes
    for (const recipeId of state.warmDishRecipeIds) {
      items.push({
        recipe_id: recipeId,
        factor: state.warmDishFactors[String(recipeId)] ?? 1.0,
      });
    }

    // Extra ingredients (Gemüse etc.)
    for (const [ingId, grams] of Object.entries(state.extraIngredients)) {
      if (grams <= 0) continue;
      items.push({
        ingredient_id: Number(ingId),
        quantity: Math.round(grams),
        measuring_unit_id: null,
      });
    }

    await saveWizard.mutateAsync({
      planId,
      refMealId: existingRefMeal?.id ?? null,
      items,
    });

    navigate(`/meal-plans/${planId}`);
  }

  const isCockpit = step === 'cockpit';

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border px-4 py-3">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(`/meal-plans/${planId}`)}
              className="p-1.5 rounded-lg hover:bg-muted transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1">
              <h1 className="font-display font-bold text-lg">Frühstücksassistent</h1>
              <p className="text-xs text-muted-foreground">{plan?.name ?? '…'}</p>
            </div>
          </div>

          {/* Step progress */}
          <div className="mt-3 flex gap-1">
            {WIZARD_STEPS.map((s, i) => (
              <div
                key={s}
                className={`flex-1 h-1 rounded-full transition-colors ${
                  i <= currentStepIndex ? 'bg-primary' : 'bg-muted'
                }`}
              />
            ))}
          </div>
          <p className="mt-1 text-xs text-muted-foreground text-center">
            Schritt {currentStepIndex + 1} / {WIZARD_STEPS.length}: {STEP_LABELS[step]}
          </p>
        </div>
      </div>

      {/* Step content */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        {step === 'basis' && <StepBasis wiz={wiz} />}
        {step === 'belag' && <StepBelag wiz={wiz} />}
        {step === 'extras' && <StepExtras wiz={wiz} />}
        {step === 'getraenke' && <StepGetraenke wiz={wiz} />}
        {step === 'cockpit' && (
          <StepCockpit
            wiz={wiz}
            normPortions={normPortions}
            days={days}
            dayPartFactor={dayPartFactor}
          />
        )}
      </div>

      {/* Navigation */}
      <div className="sticky bottom-0 bg-background border-t border-border px-4 py-3">
        <div className="max-w-2xl mx-auto flex gap-3">
          {canGoPrev && (
            <button
              type="button"
              onClick={goPrev}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border hover:bg-muted transition-colors text-sm font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              Zurück
            </button>
          )}
          {canGoNext && (
            <button
              type="button"
              onClick={goNext}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm font-medium"
            >
              Weiter
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
          {isCockpit && (
            <button
              type="button"
              onClick={handleSave}
              disabled={saveWizard.isPending}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm font-medium disabled:opacity-60"
            >
              <Check className="w-4 h-4" />
              {saveWizard.isPending ? 'Wird gespeichert…' : 'Frühstück speichern'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
