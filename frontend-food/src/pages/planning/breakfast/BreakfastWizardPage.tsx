/**
 * BreakfastWizardPage — multi-step breakfast planning wizard.
 *
 * Supports two modes:
 *   refMeal:    /meal-plans/:id/ref-meals/breakfast/wizard
 *   directMeal: /meal-plans/:id/meals/:mealId/breakfast-wizard
 */
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react';
import { useMealPlan } from '@/api/mealPlans';
import { useRefMeals } from '@/api/refMeals';
import { useBreakfastCatalog, useDrinkRecipes, useSaveBreakfastWizard, useSaveDirectMeal } from '@/api/breakfast';
import { useWizardState, STEP_LABELS, WIZARD_STEPS } from './useWizardState';
import StepBasis from './StepBasis';
import StepBelag from './StepBelag';
import StepExtras from './StepExtras';
import StepGetraenke from './StepGetraenke';
import StepCockpit from './StepCockpit';
import { useMemo } from 'react';
import { toast } from 'sonner';
import type { WizardItemIn } from '@/api/breakfast';
import { toppingGramsPerPerson } from '@/lib/breakfastCalc';
import { refMealItemsToWizardState } from '@/lib/refMealToWizardState';

export default function BreakfastWizardPage() {
  const { id, mealId: mealIdParam } = useParams<{ id: string; mealId?: string }>();
  const planId = Number(id) || 0;
  const mealId = mealIdParam ? Number(mealIdParam) : null;
  const navigate = useNavigate();

  const saveMode: 'refMeal' | 'directMeal' = mealId != null ? 'directMeal' : 'refMeal';

  const { data: plan } = useMealPlan(planId);
  const { data: refMeals } = useRefMeals(planId);
  const { data: catalog } = useBreakfastCatalog();
  const { data: drinkRecipes } = useDrinkRecipes();
  const saveWizardRefMeal = useSaveBreakfastWizard(planId);
  const saveWizardDirectMeal = useSaveDirectMeal(planId);

  const existingRefMeal = useMemo(
    () => (saveMode === 'refMeal' ? refMeals?.find((rm) => rm.meal_type === 'breakfast') ?? null : null),
    [saveMode, refMeals],
  );

  const normPortions = plan?.norm_portions ?? 10;
  const dayPartFactor = existingRefMeal?.day_part_factor ?? 0.25;
  const days = 1;

  // Compute initial wizard state from existing RefMeal (if any)
  const initialWizardState = useMemo(() => {
    if (saveMode !== 'refMeal' || !existingRefMeal?.items || !catalog) return undefined;
    const mapped = refMealItemsToWizardState(existingRefMeal.items, catalog, normPortions);
    // Count unmappable items
    const mappableCount = existingRefMeal.items.filter((i) => i.ingredient_id || i.recipe_id || i.display_name).length;
    const unmappableCount = existingRefMeal.items.length - mappableCount;
    if (unmappableCount > 0) {
      toast.warning(`${unmappableCount} Item${unmappableCount === 1 ? '' : 's'} konnten nicht geladen werden.`);
    }
    return mapped;
  }, [saveMode, existingRefMeal, catalog, normPortions]);

  const wiz = useWizardState(initialWizardState);
  const { state, step, currentStepIndex, canGoNext, canGoPrev, goNext, goPrev } = wiz;

  // Build drink-id map from drink recipes
  const drinkNameToId = useMemo(() => {
    if (!drinkRecipes) return {} as Record<string, number>;
    const map: Record<string, number> = {};
    for (const d of drinkRecipes) {
      map[d.title] = d.id;
    }
    return map;
  }, [drinkRecipes]);

  function buildItems(): WizardItemIn[] {
    const items: WizardItemIn[] = [];
    const gramUnitId = catalog?.gram_measuring_unit_id ?? null;
    const mlUnitId = catalog?.ml_measuring_unit_id ?? null;

    for (const b of state.basis.filter((b) => b.sharePercent > 0)) {
      const beCount = state.bePerPerson * (b.sharePercent / 100);
      if (beCount <= 0) continue;
      items.push({
        ingredient_id: b.ingredientId,
        quantity: Math.round(b.sliceWeightG * beCount * normPortions),
        measuring_unit_id: gramUnitId,
      });
    }

    for (const t of state.toppings.filter((t) => t.sharePercent > 0)) {
      const grams = toppingGramsPerPerson(state.bePerPerson, t, state.globalIntensity, state.toppings);
      if (grams <= 0) continue;
      items.push({
        ingredient_id: t.ingredientId,
        quantity: Math.round(grams * normPortions),
        measuring_unit_id: gramUnitId,
      });
    }

    for (const recipeId of state.warmDishRecipeIds) {
      items.push({
        recipe_id: recipeId,
        factor: state.warmDishFactors[String(recipeId)] ?? 1.0,
      });
    }

    for (const [ingId, grams] of Object.entries(state.extraIngredients)) {
      if (grams <= 0) continue;
      items.push({
        ingredient_id: Number(ingId),
        quantity: Math.round(grams * normPortions),
        measuring_unit_id: gramUnitId,
      });
    }

    const drinks = state.drinks;
    const drinkConfigs: { percent: number; drinkName: string }[] = [
      { percent: drinks.coffeePercent, drinkName: 'Kaffee' },
      { percent: drinks.cocoaPercent, drinkName: 'Kakao' },
      { percent: drinks.teaPercent, drinkName: 'Tee' },
    ];
    for (const cfg of drinkConfigs) {
      if (cfg.percent <= 0) continue;
      const totalMl = Math.round(drinks.mlPerPerson * (cfg.percent / 100) * normPortions);
      const recipeId = drinkNameToId[cfg.drinkName];
      if (recipeId) {
        items.push({ recipe_id: recipeId, quantity: totalMl, measuring_unit_id: mlUnitId, factor: 1.0 });
      } else {
        toast.warning(`Kein Rezept für "${cfg.drinkName}" gefunden — wird als Text gespeichert.`);
        items.push({ display_name: cfg.drinkName, quantity: totalMl, measuring_unit_id: mlUnitId });
      }
    }
    const totalMilkMl = drinks.coffeeMilkMlPerPerson + drinks.cocoaMilkMlPerPerson;
    if (totalMilkMl > 0) {
      const milkRecipeId = drinkNameToId['Milch'];
      const totalMilk = Math.round(totalMilkMl * normPortions);
      if (milkRecipeId) {
        items.push({ recipe_id: milkRecipeId, quantity: totalMilk, measuring_unit_id: mlUnitId, factor: 1.0 });
      } else {
        items.push({ display_name: 'Milch', quantity: totalMilk, measuring_unit_id: mlUnitId });
      }
    }

    return items;
  }

  async function handleSave() {
    const items = buildItems();

    if (saveMode === 'directMeal' && mealId != null) {
      await saveWizardDirectMeal.mutateAsync({ planId, mealId, items });
      navigate(`/meal-plans/${planId}`);
    } else {
      await saveWizardRefMeal.mutateAsync({
        planId,
        refMealId: existingRefMeal?.id ?? null,
        items,
      });
      navigate(`/meal-plans/${planId}/ref-meals/breakfast`);
    }
  }

  const savePending = saveMode === 'directMeal' ? saveWizardDirectMeal.isPending : saveWizardRefMeal.isPending;
  const isCockpit = step === 'cockpit';
  const isEditMode = saveMode === 'refMeal' && existingRefMeal != null;

  const handleBack = () => {
    if (saveMode === 'refMeal') {
      navigate(`/meal-plans/${planId}/ref-meals/breakfast`);
    } else {
      navigate(`/meal-plans/${planId}`);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border px-4 py-3">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleBack}
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
          {isEditMode && !isCockpit && (
            <button
              type="button"
              onClick={handleBack}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border hover:bg-muted transition-colors text-sm font-medium text-muted-foreground"
            >
              <X className="w-4 h-4" />
              Abbrechen
            </button>
          )}
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
              disabled={savePending}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm font-medium disabled:opacity-60"
            >
              <Check className="w-4 h-4" />
              {savePending ? 'Wird gespeichert…' : 'Frühstück speichern'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
