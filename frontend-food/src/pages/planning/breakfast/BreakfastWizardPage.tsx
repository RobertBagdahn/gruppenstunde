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
import { useBreakfastCatalog, useSaveBreakfastWizard, useSaveDirectMeal } from '@/api/breakfast';
import { useWizardState, STEP_LABELS, WIZARD_STEPS } from './useWizardState';
import StepBasis from './StepBasis';
import StepStreichfett from './StepStreichfett';
import StepBelag from './StepBelag';
import StepExtras from './StepExtras';
import StepGetraenke from './StepGetraenke';
import StepCockpit from './StepCockpit';
import { CreateIngredientModal } from '@/components/breakfast/CreateIngredientModal';
import { CreateRecipeModal } from '@/components/breakfast/CreateRecipeModal';
import { useMemo } from 'react';
import { toast } from 'sonner';
import type { WizardItemIn } from '@/api/breakfast';
import { refMealItemsToWizardState } from '@/lib/refMealToWizardState';
import { computeGroupKcal, breadItemGrams, toppingItemGrams, extrasKcalPerPerson, FAT_GRAMS_PER_PERSON } from '@/lib/breakfastCalc';

export default function BreakfastWizardPage() {
  const { id, mealId: mealIdParam } = useParams<{ id: string; mealId?: string }>();
  const planId = Number(id) || 0;
  const mealId = mealIdParam ? Number(mealIdParam) : null;
  const navigate = useNavigate();

  const saveMode: 'refMeal' | 'directMeal' = mealId != null ? 'directMeal' : 'refMeal';

  const { data: plan } = useMealPlan(planId);
  const { data: refMeals } = useRefMeals(planId);
  const { data: catalog } = useBreakfastCatalog();
  const saveWizardRefMeal = useSaveBreakfastWizard(planId);
  const saveWizardDirectMeal = useSaveDirectMeal(planId);

  const existingRefMeal = useMemo(
    () => (saveMode === 'refMeal' ? refMeals?.find((rm) => rm.meal_type === 'breakfast') ?? null : null),
    [saveMode, refMeals],
  );

  const normPortions = plan?.norm_portions ?? 10;
  const dayPartFactor = existingRefMeal?.day_part_factor ?? 0.25;

  // Compute initial wizard state from existing RefMeal (if any)
  const initialWizardState = useMemo(() => {
    if (saveMode !== 'refMeal' || !existingRefMeal?.items || !catalog) return undefined;
    const mapped = refMealItemsToWizardState(existingRefMeal.items as import('@/schemas/mealPlan').MealItem[], catalog, normPortions);
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

  /**
   * Build the list of items to save.
   *
   * Storage model:
   * - quantity = grams per person (derived from kcal target + kcal density)
   * - measuring_unit = gram unit
   * - factor = 1.0 (always — backend multiplies by effectivePortions)
   */
  function buildItems(): WizardItemIn[] {
    const gramUnitId = catalog?.gram_measuring_unit_id ?? null;

    const fixKcal = extrasKcalPerPerson(state);
    const { breadKcal, toppingKcal } = computeGroupKcal(state.basis, state.toppings, state.fatSelections, state.gramsPerPerson, dayPartFactor, fixKcal);
    const basisTotalShare = state.basis.reduce((s, b) => s + b.sharePercent, 0);
    const toppingTotalShare = state.toppings.reduce((s, t) => s + t.sharePercent, 0);

    // Accumulate ingredient items in grams for dedup
    const ingGrams: Record<number, number> = {};
    const items: WizardItemIn[] = [];

    // ── Basis (bread) ──
    for (const b of state.basis.filter((b) => b.sharePercent > 0)) {
      const grams = breadItemGrams(b.sharePercent, basisTotalShare, breadKcal, b.energyKcal100g);
      if (grams <= 0) continue;
      ingGrams[b.ingredientId] = (ingGrams[b.ingredientId] ?? 0) + grams;
    }

    // ── Streichfett ──
    for (const f of state.fatSelections.filter((f) => f.sharePercent > 0 && f.ingredientId > 0)) {
      const grams = (f.sharePercent / 100) * FAT_GRAMS_PER_PERSON;
      ingGrams[f.ingredientId] = (ingGrams[f.ingredientId] ?? 0) + grams;
    }

    // ── Belag (toppings) ──
    for (const t of state.toppings.filter((t) => t.sharePercent > 0)) {
      if (toppingTotalShare <= 0) continue;
      const grams = toppingItemGrams(t.sharePercent, toppingTotalShare, toppingKcal, t.energyKcal100g);
      if (grams <= 0) continue;
      ingGrams[t.ingredientId] = (ingGrams[t.ingredientId] ?? 0) + grams;
    }

    // ── Warme Gerichte ──
    for (const recipeId of state.warmDishRecipeIds) {
      items.push({
        recipe_id: recipeId,
        factor: state.warmDishFactors[String(recipeId)] ?? 1.0,
      });
    }

    // ── Extras (vegetables, garnish) — may overlap with basis/topping ──
    for (const [ingId, grams] of Object.entries(state.extraIngredients)) {
      if (grams <= 0) continue;
      const id = Number(ingId);
      ingGrams[id] = (ingGrams[id] ?? 0) + grams;
    }

    // ── Getränke-Rezepte (drink recipe-IDs analog zu warmen Gerichten) ──
    for (const drink of state.drinkRecipes.filter((d) => d.sharePercent > 0 && d.recipeId > 0)) {
      items.push({
        recipe_id: drink.recipeId,
        factor: drink.sharePercent / 100,
      });
    }

    // ── Milch & Säfte (drink ingredients — milk, juices) ──
    for (const ingredient of state.drinkIngredients.filter((d) => d.sharePercent > 0 && d.ingredientId > 0)) {
      const ml = ingredient.mlPerPerson ?? 0;
      if (ml <= 0) continue;
      ingGrams[ingredient.ingredientId] = (ingGrams[ingredient.ingredientId] ?? 0) + ml;
    }

    // ── Post-process: push accumulated ingredients (in grams) + recipe items ──
    const mergedIds = new Set<number>();
    const out: WizardItemIn[] = [];
    for (const [ingIdStr, grams] of Object.entries(ingGrams)) {
      if (grams <= 0) continue;
      const ingId = Number(ingIdStr);
      if (mergedIds.has(ingId)) continue;
      mergedIds.add(ingId);
      out.push({
        ingredient_id: ingId,
        quantity: Math.round(grams * 10) / 10,
        measuring_unit_id: gramUnitId,
        factor: 1.0,
      });
    }
    for (const item of items) {
      if (item.ingredient_id == null) {
        out.push(item);
      }
    }
    return out;
  }

  async function handleSave() {
    try {
      const items = buildItems();

      if (items.length === 0) {
        toast.error('Keine Artikel zum Speichern vorhanden.');
        return;
      }

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
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unbekannter Fehler';
      toast.error(`Speichern fehlgeschlagen: ${msg}`);
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
        {step === 'basis' && <StepBasis wiz={wiz} dayPartFactor={dayPartFactor} />}
        {step === 'fett' && <StepStreichfett wiz={wiz} />}
        {step === 'belag' && <StepBelag wiz={wiz} dayPartFactor={dayPartFactor} />}
        {step === 'extras' && <StepExtras wiz={wiz} catalog={catalog} />}
        {step === 'getraenke' && <StepGetraenke wiz={wiz} />}
        {step === 'cockpit' && (
          <StepCockpit
            wiz={wiz}
            catalog={catalog}
            dayPartFactor={dayPartFactor}
            saveMode={saveMode}
            planId={planId}
            mealId={mealId}
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

      {/* Create Modals */}
      {wiz.createModal.type === 'ingredient' && (
        <CreateIngredientModal
          isOpen={wiz.createModal.isOpen}
          onClose={wiz.closeCreateModal}
          modalState={wiz.createModal}
          onError={wiz.setCreateModalError}
        />
      )}
      {wiz.createModal.type === 'recipe' && (
        <CreateRecipeModal
          isOpen={wiz.createModal.isOpen}
          onClose={wiz.closeCreateModal}
          modalState={wiz.createModal}
          onError={wiz.setCreateModalError}
        />
      )}
    </div>
  );
}
