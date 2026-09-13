/**
 * BreakfastWizardPage — multi-step breakfast planning wizard.
 *
 * Supports two modes:
 *   refMeal:    /meal-plans/:id/ref-meals/breakfast/wizard
 *   directMeal: /meal-plans/:id/meals/:mealId/breakfast-wizard
 */
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react';
import { useMealPlan } from '@/api/mealPlans';
import { useRefMeals } from '@/api/refMeals';
import { useBreakfastCatalog, useSaveBreakfastWizard, useSaveDirectMeal, useSaveBreakfastBulk } from '@/api/breakfast';
import { useWizardState, STEP_LABELS, WIZARD_STEPS } from './useWizardState';
import StepBasis from './StepBasis';
import StepStreichfett from './StepStreichfett';
import StepBelag from './StepBelag';
import StepExtras from './StepExtras';
import StepGetraenke from './StepGetraenke';
import StepCockpit from './StepCockpit';
import { CreateIngredientModal } from '@/components/breakfast/CreateIngredientModal';
import { CreateRecipeModal } from '@/components/breakfast/CreateRecipeModal';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import type { WizardItemIn } from '@/api/breakfast';
import type { MealItem } from '@/schemas/mealPlan';
import type { WizardState } from '@/schemas/breakfast';
import { refMealItemsToWizardState } from '@/lib/refMealToWizardState';
import { computeGroupKcal, breadItemGrams, toppingItemGrams, extrasKcalPerPerson, FAT_GRAMS_PER_PERSON } from '@/lib/breakfastCalc';

type BreakfastProfile = 'classic' | 'children' | 'adults' | 'muesli' | 'vegetarian' | 'plant';

const BREAKFAST_PROFILES: Array<{ id: BreakfastProfile; title: string; description: string }> = [
  { id: 'classic', title: 'Klassisch', description: 'Brot, Belag, Obst und Getränke' },
  { id: 'children', title: 'Für Kinder', description: 'Kleinere Brotportion, milde Auswahl und Obst' },
  { id: 'adults', title: 'Für Erwachsene', description: 'Herzhaftere Portion mit vielfältigem Belag' },
  { id: 'muesli', title: 'Nur Müsli', description: 'Müsli oder Haferflocken mit Obst und Milch' },
  { id: 'vegetarian', title: 'Ohne Fleisch', description: 'Vegetarische Aufstriche und Käse' },
  { id: 'plant', title: 'Rein pflanzlich', description: 'Vegane Auswahl ohne Milch, Ei, Fleisch und Honig' },
];

function nameMatches(name: string, terms: string[]): boolean {
  const normalized = name.toLocaleLowerCase('de-DE');
  return terms.some((term) => normalized.includes(term));
}

export default function BreakfastWizardPage() {
  const { id, mealId: mealIdParam } = useParams<{ id: string; mealId?: string }>();
  const [searchParams] = useSearchParams();
  const planId = Number(id) || 0;
  const queryMealId = searchParams.get('mealId');
  const mealId = mealIdParam ? Number(mealIdParam) : (queryMealId ? Number(queryMealId) : null);
  const navigate = useNavigate();

  const saveMode: 'refMeal' | 'directMeal' = mealId != null ? 'directMeal' : 'refMeal';

  const { data: plan } = useMealPlan(planId);
  const { data: refMeals } = useRefMeals(planId);
  const { data: catalog } = useBreakfastCatalog();
  const saveWizardRefMeal = useSaveBreakfastWizard(planId);
  const saveWizardDirectMeal = useSaveDirectMeal(planId);
  const saveBreakfastBulk = useSaveBreakfastBulk(planId);

  const existingRefMeal = useMemo(
    () => (saveMode === 'refMeal' ? refMeals?.find((rm) => rm.meal_type === 'breakfast') ?? null : null),
    [saveMode, refMeals],
  );

  const targetMeal = useMemo(() => {
    if (saveMode !== 'directMeal' || !plan || !mealId) return null;
    return plan.meals.find((m) => m.id === mealId) ?? null;
  }, [saveMode, plan, mealId]);

  const normPortions = plan?.norm_portions ?? 10;
  const breakfastMeals = useMemo(() => plan?.meals.filter((meal) => meal.meal_type === 'breakfast' && !meal.is_reference) ?? [], [plan?.meals]);
  const [selectedBreakfastMealIds, setSelectedBreakfastMealIds] = useState<number[]>(mealId ? [mealId] : []);
  const dayPartFactor =
    (saveMode === 'directMeal' ? targetMeal?.day_part_factor : existingRefMeal?.day_part_factor) ?? 0.25;

  // Compute initial wizard state from existing items (RefMeal or directMeal)
  const initialWizardState = useMemo(() => {
    const sourceItems = (saveMode === 'directMeal' ? targetMeal?.items : existingRefMeal?.items) as MealItem[] | undefined;
    if (!sourceItems || sourceItems.length === 0 || !catalog) return undefined;
    const mapped = refMealItemsToWizardState(sourceItems, catalog, normPortions);
    // Count unmappable items
    const mappableCount = sourceItems.filter((i: MealItem) => i.ingredient_id || i.recipe_id || i.display_name).length;
    const unmappableCount = sourceItems.length - mappableCount;
    if (unmappableCount > 0) {
      toast.warning(`${unmappableCount} Item${unmappableCount === 1 ? '' : 's'} konnten nicht geladen werden.`);
    }
    return mapped;
  }, [saveMode, targetMeal, existingRefMeal, catalog, normPortions]);

  const wiz = useWizardState(initialWizardState);
  const { state, step, currentStepIndex, canGoNext, canGoPrev, goNext, goPrev } = wiz;

  function applyBreakfastProfile(profile: BreakfastProfile) {
    if (!catalog) return;
    const isMuesli = profile === 'muesli';
    const isPlant = profile === 'plant';
    const isVegetarian = profile === 'vegetarian' || isPlant;
    const base = catalog.base_ingredients.filter((item) => {
      if (!isMuesli) return !nameMatches(item.name, ['müsli', 'haferflock']);
      return nameMatches(item.name, ['müsli', 'haferflock']);
    });
    const toppings = catalog.topping_ingredients.filter((item) => {
      if (isMuesli) return false;
      if (isPlant && nameMatches(item.name, ['käse', 'edamer', 'gouda', 'emmentaler', 'frischkäse', 'leberwurst', 'salami', 'schinken', 'putenbrust', 'honig'])) return false;
      if (isVegetarian && nameMatches(item.name, ['leberwurst', 'salami', 'schinken', 'putenbrust'])) return false;
      return true;
    });
    const fats = catalog.fat_ingredients.filter((item) => !isPlant || nameMatches(item.name, ['margarine', 'pflanz']));
    const drinks = catalog.drink_recipes.filter((item) => !isPlant || !nameMatches(item.title, ['milch', 'kakao']));
    const extras = catalog.extra_ingredients.filter((item) => !isMuesli || nameMatches(item.name, ['apfel', 'banane', 'erdbeere', 'orange', 'beere']));
    const share = <T extends { id: number }>(items: T[]) => items.map((item, index) => ({ item, sharePercent: index === 0 ? 100 : 0 }));
    const selectedBase = share(base.length > 0 ? base : catalog.base_ingredients.slice(0, 1));
    const selectedToppings = share(toppings);
    const selectedFats = share(fats);
    const selectedDrinks = share(drinks);
    const nextState: WizardState = {
      ...state,
      gramsPerPerson: profile === 'children' ? 100 : 150,
      basis: selectedBase.map(({ item, sharePercent }) => ({ ingredientId: item.id, name: item.name, sharePercent, locked: false, sliceWeightG: item.standard_recipe_weight_g ?? 50, energyKcal100g: item.energy_kcal })),
      toppings: selectedToppings.map(({ item, sharePercent }) => ({ ingredientId: item.id, name: item.name, sharePercent, locked: false, energyKcal100g: item.energy_kcal, pricePerKg: item.price_per_kg, portions: item.portions })),
      fatSelections: selectedFats.map(({ item, sharePercent }) => ({ ingredientId: item.id, name: item.name, sharePercent, locked: false, energyKcal100g: item.energy_kcal, pricePerKg: item.price_per_kg, portions: item.portions })),
      drinkRecipes: selectedDrinks.map(({ item, sharePercent }) => ({ recipeId: item.id, name: item.title, sharePercent, locked: false, energyKcal: item.cached_energy_total_kcal })),
      drinkIngredients: isPlant ? [] : catalog.drink_ingredients.filter((item) => nameMatches(item.name, ['milch', 'hafermilch'])).map((item, index) => ({ ingredientId: item.id, name: item.name, sharePercent: index === 0 ? 100 : 0, locked: false, mlPerPerson: index === 0 ? 200 : null })),
      extraIngredients: Object.fromEntries(extras.slice(0, isMuesli ? 2 : 0).map((item) => [String(item.id), isMuesli ? 80 : 0])),
      extraIngredientNames: Object.fromEntries(extras.slice(0, isMuesli ? 2 : 0).map((item) => [String(item.id), item.name])),
      warmDishRecipeIds: [],
      warmDishFactors: {},
      warmDishRecipeNames: {},
      globalIntensity: profile === 'children' ? 'knapp' : 'normal',
    };
    wiz.replaceState(nextState);
  }

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
        if (selectedBreakfastMealIds.length === 0) {
          toast.error('Bitte mindestens ein Frühstück auswählen.');
          return;
        }
        const mealIds = selectedBreakfastMealIds;
        if (mealIds.length > 1) {
          await saveBreakfastBulk.mutateAsync({ planId, mealIds, items });
        } else {
          await saveWizardDirectMeal.mutateAsync({ planId, mealId, items });
        }
        navigate(`/meal-plans/${planId}/plan`);
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

  const savePending = saveMode === 'directMeal' ? saveWizardDirectMeal.isPending || saveBreakfastBulk.isPending : saveWizardRefMeal.isPending;
  const isCockpit = step === 'cockpit';
  const isEditMode = saveMode === 'refMeal' ? existingRefMeal != null : (targetMeal?.items?.length ?? 0) > 0;

  const handleBack = () => {
    if (saveMode === 'refMeal') {
      navigate(`/meal-plans/${planId}/ref-meals/breakfast`);
    } else {
      navigate(`/meal-plans/${planId}/plan`);
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
        {step === 'basis' && catalog && (
          <div className="mb-6 rounded-xl border border-border bg-card p-4 space-y-3">
            <div>
              <h2 className="font-display font-semibold text-base">Schnellstart: Frühstück auswählen</h2>
              <p className="text-xs text-muted-foreground">Wähle eine Vorlage. Danach kannst du jede Auswahl im Detail anpassen.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {BREAKFAST_PROFILES.map((profile) => (
                <button key={profile.id} type="button" onClick={() => applyBreakfastProfile(profile.id)} className="rounded-lg border border-border p-3 text-left hover:border-primary hover:bg-primary/5 transition-colors">
                  <span className="block text-sm font-semibold">{profile.title}</span>
                  <span className="block text-xs text-muted-foreground mt-0.5">{profile.description}</span>
                </button>
              ))}
            </div>
          </div>
        )}
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
            breakfastMeals={breakfastMeals}
            selectedBreakfastMealIds={selectedBreakfastMealIds}
            onSelectedBreakfastMealIdsChange={setSelectedBreakfastMealIds}
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
