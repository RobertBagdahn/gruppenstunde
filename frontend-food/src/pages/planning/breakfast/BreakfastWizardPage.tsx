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
import { BuffetBuilder } from '@/components/buffet/BuffetBuilder';
import { WizardProgress } from '@/components/shared/WizardProgress';
import { useEffect, useMemo, useState } from 'react';
import { notify } from '@/lib/notify';
import type { BreakfastProfileSlug, WizardItemIn } from '@/api/breakfast';
import type { MealItem } from '@/schemas/mealPlan';
import type { WizardState } from '@/schemas/breakfast';
import { refMealItemsToWizardState } from '@/lib/refMealToWizardState';
import { computeGroupKcal, breadItemGrams, toppingItemGrams, extrasKcalPerPerson, FAT_GRAMS_PER_PERSON } from '@/lib/breakfastCalc';
import { getApiErrorMessage } from '@/lib/api';

type BreakfastProfile = BreakfastProfileSlug;

type ManualItemsPolicy = 'preserve' | 'replace';

const BREAKFAST_PROFILES: Array<{ id: BreakfastProfile; title: string; description: string }> = [
  { id: 'muesli', title: 'Nur Müsli', description: 'Müsli oder Haferflocken mit Obst und Getränken' },
  { id: 'bread-muesli', title: 'Brot und Müsli', description: 'Brot, Müsli, Belag, Obst und Getränke' },
  { id: 'plant', title: 'Brot pflanzlich', description: 'Pflanzliche Aufstriche, Obst und Getränke' },
  { id: 'vegetarian', title: 'Brot vegetarisch', description: 'Käse, vegetarische Aufstriche, Obst und Getränke' },
  { id: 'meat', title: 'Brot mit Fleisch', description: 'Herzhafter Belag, Käse, Obst und Getränke' },
];

function nameMatches(name: string, terms: string[]): boolean {
  const normalized = name.toLocaleLowerCase('de-DE');
  return terms.some((term) => normalized.includes(term));
}

function isBreakfastManagedItem(item: MealItem): boolean {
  return item.is_breakfast_assistant
    || item.buffet_role !== ''
    || item.ingredient_tags.some((tag) => tag.startsWith('breakfast-'));
}

function isBreakfastWizardItem(item: MealItem, includeLegacyBuffetTags: boolean): boolean {
  return isBreakfastManagedItem(item)
    || (includeLegacyBuffetTags && item.ingredient_tags.some((tag) => tag.startsWith('buffet-')))
    || (item.recipe_id != null && ['breakfast', 'drink'].includes(item.recipe_type));
}

function managedItemIds(items: MealItem[]): number[] {
  return items.filter(isBreakfastManagedItem).map((item) => item.id);
}

function manualItemCount(items: MealItem[]): number {
  return items.filter((item) => !isBreakfastManagedItem(item)).length;
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
  const {
    data: catalog,
    isLoading: catalogLoading,
    isError: catalogError,
    refetch: refetchCatalog,
  } = useBreakfastCatalog();
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

  const directMealLoading = saveMode === 'directMeal' && !plan;
  const directMealNotFound = saveMode === 'directMeal' && Boolean(plan) && !targetMeal;
  const normPortions = plan?.norm_portions ?? 10;
  const breakfastMeals = useMemo(() => plan?.meals.filter((meal) => meal.meal_type === 'breakfast' && !meal.is_reference) ?? [], [plan?.meals]);
  const [selectedBreakfastMealIds, setSelectedBreakfastMealIds] = useState<number[]>(mealId ? [mealId] : []);
  const dayPartFactor =
    (saveMode === 'directMeal' ? targetMeal?.day_part_factor : existingRefMeal?.day_part_factor) ?? 0.25;

  // Compute initial wizard state from existing items (RefMeal or directMeal)
  const initialWizardState = useMemo(() => {
    const allItems = (saveMode === 'directMeal' ? targetMeal?.items : existingRefMeal?.items) as MealItem[] | undefined;
    const hasAssistantProvenance = (allItems ?? []).some((item) => item.is_breakfast_assistant);
    const includeLegacyBuffetTags = saveMode === 'refMeal'
      || (!targetMeal?.breakfast_profile && !hasAssistantProvenance);
    const sourceItems = saveMode === 'refMeal'
      ? allItems ?? []
      : (allItems ?? []).filter((item) => isBreakfastWizardItem(item, includeLegacyBuffetTags));
    if (sourceItems.length === 0 || !catalog) return undefined;
    const mapped = refMealItemsToWizardState(sourceItems, catalog, normPortions, saveMode === 'refMeal');
    const mappableCount = sourceItems.filter((item) => item.ingredient_id || item.recipe_id || item.display_name).length;
    const unmappableCount = sourceItems.length - mappableCount;
    if (unmappableCount > 0) {
      notify.warning(`${unmappableCount} Item${unmappableCount === 1 ? '' : 's'} konnten nicht geladen werden.`);
    }
    return mapped;
  }, [saveMode, targetMeal, existingRefMeal, catalog, normPortions]);

  const wiz = useWizardState(initialWizardState, saveMode === 'directMeal' ? 'preset' : 'basis');
  const visibleWizardSteps = saveMode === 'refMeal' ? WIZARD_STEPS.filter((wizardStep) => wizardStep !== 'preset') : WIZARD_STEPS;
  const { state, step, canGoNext, canGoPrev, goNext, goPrev, setStep } = wiz;
  const [freeBuffetOpen, setFreeBuffetOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<BreakfastProfile | null>(null);
  const [manualItemsPolicy, setManualItemsPolicy] = useState<ManualItemsPolicy>('preserve');

  useEffect(() => {
    const savedProfile = BREAKFAST_PROFILES.find((profile) => profile.id === targetMeal?.breakfast_profile);
    setSelectedProfile(savedProfile?.id ?? null);
  }, [targetMeal?.breakfast_profile]);

  const manualItemsCount = useMemo(() => {
    if (saveMode !== 'directMeal') return 0;
    return breakfastMeals
      .filter((meal) => selectedBreakfastMealIds.includes(meal.id))
      .reduce((total, meal) => total + manualItemCount(meal.items), 0);
  }, [saveMode, breakfastMeals, selectedBreakfastMealIds]);

  useEffect(() => {
    if (saveMode === 'directMeal' && initialWizardState) setStep('basis');
  }, [saveMode, initialWizardState, setStep]);

  function applyBreakfastProfile(profile: BreakfastProfile) {
    if (!catalog) return;
    setSelectedProfile(profile);
    const isMuesliOnly = profile === 'muesli';
    const isBreadAndMuesli = profile === 'bread-muesli';
    const isPlant = profile === 'plant';
    const isVegetarian = profile === 'vegetarian' || isPlant;
    const isMeat = profile === 'meat';
    const isCereal = (name: string) => nameMatches(name, ['müsli', 'haferflock', 'cornflake']);
    const breads = catalog.base_ingredients.filter((item) => !isCereal(item.name));
    const cereals = catalog.base_ingredients.filter((item) => isCereal(item.name));
    const bases = isMuesliOnly ? cereals : isBreadAndMuesli ? [...breads.slice(0, 1), ...cereals.slice(0, 1)] : breads;
    const toppings = catalog.topping_ingredients.filter((item) => {
      if (isMuesliOnly) return false;
      if (isPlant && nameMatches(item.name, ['käse', 'edamer', 'gouda', 'emmentaler', 'frischkäse', 'leberwurst', 'salami', 'schinken', 'putenbrust', 'honig'])) return false;
      if (isVegetarian && nameMatches(item.name, ['leberwurst', 'salami', 'schinken', 'putenbrust', 'thunfisch'])) return false;
      if (isMeat) return nameMatches(item.name, ['leberwurst', 'salami', 'schinken', 'putenbrust', 'thunfisch', 'gouda', 'käse', 'frischkäse']);
      return true;
    });
    const fats = isMuesliOnly
      ? []
      : catalog.fat_ingredients.filter((item) => !isPlant || nameMatches(item.name, ['margarine', 'pflanz']));
    const drinks = catalog.drink_recipes.filter((item) => !isPlant || !nameMatches(item.title, ['milch', 'kakao']));
    const extras = catalog.extra_ingredients.filter((item) =>
      isMuesliOnly || isBreadAndMuesli
        ? nameMatches(item.name, ['apfel', 'banane', 'erdbeere', 'orange', 'beere'])
        : true,
    );
    const share = <T extends { id: number }>(items: T[]) => items.map((item, index) => ({ item, sharePercent: index === 0 ? 100 : 0 }));
    let selectedBase = share(bases);
    if (isBreadAndMuesli && selectedBase.length > 1) {
      selectedBase = selectedBase.map((selection, index) => ({
        ...selection,
        sharePercent: index === 0 ? 60 : 40,
      }));
    }
    const selectedToppings = share(toppings);
    const selectedFats = share(fats);
    const selectedDrinks = share(drinks);
    const drinkIngredients = catalog.drink_ingredients.filter((item) =>
      isPlant
        ? nameMatches(item.name, ['hafer', 'soja', 'mandel', 'pflanz'])
        : isMuesliOnly || isBreadAndMuesli
          ? nameMatches(item.name, ['milch'])
          : nameMatches(item.name, ['saft', 'milch']),
    );
    const selectedDrinkIngredients = share(drinkIngredients.slice(0, 1));
    const selectedExtras = share(extras.slice(0, isMuesliOnly || isBreadAndMuesli ? 2 : 1));
    const nextState: WizardState = {
      ...state,
      gramsPerPerson: isMuesliOnly ? 80 : isBreadAndMuesli ? 120 : 150,
      basis: selectedBase.map(({ item, sharePercent }) => ({ ingredientId: item.id, name: item.name, sharePercent, locked: false, sliceWeightG: item.standard_recipe_weight_g ?? 50, energyKcal100g: item.energy_kcal })),
      toppings: selectedToppings.map(({ item, sharePercent }) => ({ ingredientId: item.id, name: item.name, sharePercent, locked: false, energyKcal100g: item.energy_kcal, pricePerKg: item.price_per_kg, portions: item.portions })),
      fatSelections: selectedFats.map(({ item, sharePercent }) => ({ ingredientId: item.id, name: item.name, sharePercent, locked: false, energyKcal100g: item.energy_kcal, pricePerKg: item.price_per_kg, portions: item.portions })),
      drinkRecipes: selectedDrinks.map(({ item, sharePercent }) => ({ recipeId: item.id, name: item.title, sharePercent, locked: false, energyKcal: item.cached_energy_total_kcal })),
      drinkIngredients: selectedDrinkIngredients.map(({ item, sharePercent }) => ({ ingredientId: item.id, name: item.name, sharePercent, locked: false, mlPerPerson: 200 })),
      extraIngredients: Object.fromEntries(selectedExtras.map(({ item }) => [String(item.id), 80])),
      extraIngredientNames: Object.fromEntries(selectedExtras.map(({ item }) => [String(item.id), item.name])),
      warmDishRecipeIds: [],
      warmDishFactors: {},
      warmDishRecipeNames: {},
      globalIntensity: 'normal',
    };
    wiz.replaceState(nextState);
    wiz.setStep('basis');
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
    const mlUnitId = catalog?.ml_measuring_unit_id ?? null;

    const fixKcal = extrasKcalPerPerson(state);
    const { breadKcal, toppingKcal } = computeGroupKcal(state.basis, state.toppings, state.fatSelections, state.gramsPerPerson, dayPartFactor, fixKcal);
    const basisTotalShare = state.basis.reduce((s, b) => s + b.sharePercent, 0);
    const toppingTotalShare = state.toppings.reduce((s, t) => s + t.sharePercent, 0);

    // Accumulate ingredient items in grams for dedup
    const ingGrams: Record<number, number> = {};
    const ingMilliliters: Record<number, number> = {};
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
      ingMilliliters[ingredient.ingredientId] = (ingMilliliters[ingredient.ingredientId] ?? 0) + ml;
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
    for (const [ingIdStr, milliliters] of Object.entries(ingMilliliters)) {
      if (milliliters <= 0) continue;
      out.push({
        ingredient_id: Number(ingIdStr),
        quantity: Math.round(milliliters * 10) / 10,
        measuring_unit_id: mlUnitId,
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
        notify.error('Keine Artikel zum Speichern vorhanden');
        return;
      }

      if (saveMode === 'directMeal' && mealId != null) {
        if (selectedBreakfastMealIds.length === 0) {
          notify.error('Bitte mindestens ein Frühstück auswählen');
          return;
        }
        const mealIds = selectedBreakfastMealIds;
        if (mealIds.length > 1) {
          const selectedMeals = breakfastMeals.filter((meal) => mealIds.includes(meal.id));
          const managedItemIdsByMeal = Object.fromEntries(
            selectedMeals.map((meal) => [meal.id, managedItemIds(meal.items)]),
          );
          await saveBreakfastBulk.mutateAsync({
            planId,
            mealIds,
            items,
            manualItemsPolicy,
            managedItemIdsByMeal,
            breakfastProfile: selectedProfile,
          });
        } else {
          await saveWizardDirectMeal.mutateAsync({
            planId,
            mealId,
            items,
            manualItemsPolicy,
            managedItemIds: managedItemIds(targetMeal?.items ?? []),
            breakfastProfile: selectedProfile,
          });
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
      const msg = getApiErrorMessage(err, 'Unbekannter Fehler');
      notify.error(`Speichern fehlgeschlagen: ${msg}`);
    }
  }

  const savePending = saveMode === 'directMeal' ? saveWizardDirectMeal.isPending || saveBreakfastBulk.isPending : saveWizardRefMeal.isPending;
  const isCockpit = step === 'cockpit';
  const hasActiveBasis = state.basis.some((item) => item.sharePercent > 0);

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
              <h1 className="font-display font-bold text-section">Frühstücksassistent</h1>
              <p className="text-caption text-muted-foreground">
                {plan?.name ?? '…'}{selectedProfile ? ` · Variante: ${BREAKFAST_PROFILES.find((profile) => profile.id === selectedProfile)?.title ?? ''}` : ''}
              </p>
            </div>
          </div>

          <div className="mt-3">
            <WizardProgress
              steps={visibleWizardSteps.map((id) => ({ id, label: STEP_LABELS[id] }))}
              currentStep={step}
            />
          </div>
        </div>
      </div>

      {/* Step content */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        {directMealLoading && (
          <p className="rounded-xl bg-card p-4 text-body text-muted-foreground shadow-card" role="status">
            Frühstück wird geladen…
          </p>
        )}
        {directMealNotFound && (
          <p className="rounded-xl border border-destructive/30 bg-card p-4 text-body" role="alert">
            Dieses Frühstück wurde im Essensplan nicht gefunden.
          </p>
        )}
        {step === 'preset' && !directMealLoading && !directMealNotFound && catalogLoading && (
          <p className="rounded-xl bg-card p-4 text-body text-muted-foreground shadow-card" role="status">
            Frühstücksauswahl wird geladen…
          </p>
        )}
        {step === 'preset' && !directMealLoading && !directMealNotFound && catalogError && (
          <div className="rounded-xl border border-destructive/30 bg-card p-4 text-body" role="alert">
            <p>Die Frühstücksauswahl konnte nicht geladen werden.</p>
            <button type="button" onClick={() => void refetchCatalog()} className="mt-3 rounded-lg border border-border px-3 py-2 font-semibold">
              Erneut versuchen
            </button>
          </div>
        )}
        {saveMode === 'directMeal' && step === 'preset' && !directMealLoading && !directMealNotFound && catalog && (
          <section className="space-y-3" aria-labelledby="breakfast-preset-heading">
            <div>
              <h2 id="breakfast-preset-heading" className="font-display font-semibold text-emphasis">Frühstück auswählen</h2>
              <p className="text-caption text-muted-foreground">Wähle ein vollständiges Frühstück. Danach kannst du alle Slider und Items anpassen.</p>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {BREAKFAST_PROFILES.map((profile) => (
                <button
                  key={profile.id}
                  type="button"
                  onClick={() => applyBreakfastProfile(profile.id)}
                  aria-pressed={selectedProfile === profile.id}
                  className={`rounded-xl border bg-card p-4 text-left transition-colors hover:border-primary hover:bg-primary/5 ${selectedProfile === profile.id ? 'border-primary ring-2 ring-primary/20' : 'border-border'}`}
                >
                  <span className="block text-body font-semibold">{profile.title}</span>
                  <span className="mt-0.5 block text-caption text-muted-foreground">{profile.description}</span>
                </button>
              ))}
              {saveMode === 'directMeal' && mealId != null && (
                <button
                  type="button"
                  onClick={() => setFreeBuffetOpen(true)}
                  className="rounded-xl border-2 border-primary bg-primary/5 p-4 text-left transition-colors hover:bg-primary/10"
                >
                  <span className="block text-body font-bold text-primary">Freies Buffet</span>
                  <span className="mt-0.5 block text-caption text-muted-foreground">Alle Buffet-Rollen frei zusammenstellen.</span>
                </button>
              )}
            </div>
          </section>
        )}
        {!directMealLoading && !directMealNotFound && step === 'basis' && (
          <>
            <StepBasis wiz={wiz} dayPartFactor={dayPartFactor} />
            {!hasActiveBasis && !catalogLoading && (
              <div className="mt-4 rounded-xl bg-warning-soft p-4 text-body" role="alert">
                <p>Wähle eine Basis-Zutat aus, bevor du fortfährst.</p>
                {catalog && catalog.base_ingredients.length === 0 && (
                  <button type="button" onClick={() => wiz.openCreateModal('ingredient', 'breakfast-base')} className="mt-3 rounded-lg bg-primary-soft px-3 py-2 font-medium text-primary">
                    Basis-Zutat erstellen
                  </button>
                )}
              </div>
            )}
          </>
        )}
        {!directMealLoading && !directMealNotFound && step === 'fett' && <StepStreichfett wiz={wiz} />}
        {!directMealLoading && !directMealNotFound && step === 'belag' && <StepBelag wiz={wiz} dayPartFactor={dayPartFactor} />}
        {!directMealLoading && !directMealNotFound && step === 'extras' && <StepExtras wiz={wiz} catalog={catalog} />}
        {!directMealLoading && !directMealNotFound && step === 'getraenke' && <StepGetraenke wiz={wiz} />}
        {!directMealLoading && !directMealNotFound && step === 'cockpit' && (
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
            manualItemCount={manualItemsCount}
            manualItemsPolicy={manualItemsPolicy}
            onManualItemsPolicyChange={setManualItemsPolicy}
          />
        )}
      </div>

      {/* Navigation */}
      <div className="sticky bottom-0 bg-background border-t border-border px-4 py-3">
        <div className="max-w-2xl mx-auto flex gap-3">
          {!isCockpit && (
            <button
              type="button"
              onClick={handleBack}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border hover:bg-muted transition-colors text-body font-medium text-muted-foreground"
            >
              <X className="w-4 h-4" />
              Abbrechen
            </button>
          )}
          {canGoPrev && (saveMode === 'directMeal' || step !== 'basis') && (
            <button
              type="button"
              onClick={goPrev}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border hover:bg-muted transition-colors text-body font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              Zurück
            </button>
          )}
          {canGoNext && step !== 'preset' && (
            <button
              type="button"
              onClick={goNext}
              disabled={step === 'basis' && !hasActiveBasis}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-body font-medium disabled:cursor-not-allowed disabled:opacity-50"
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
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-body font-medium disabled:opacity-60"
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
      {freeBuffetOpen && saveMode === 'directMeal' && mealId != null && (
        <BuffetBuilder
          open={freeBuffetOpen}
          onOpenChange={setFreeBuffetOpen}
          mealPlanId={planId}
          mealId={mealId}
          mealType="breakfast"
          normPortions={targetMeal?.override_portions ?? normPortions}
          onSaved={() => navigate(`/meal-plans/${planId}/plan`)}
        />
      )}
    </div>
  );
}
