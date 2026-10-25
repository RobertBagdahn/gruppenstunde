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
import FlowHeader from '@/components/shared/FlowHeader';
import ActionBar from '@/components/shared/ActionBar';
import { useEffect, useMemo, useState } from 'react';
import { notify } from '@/lib/notify';
import type { BreakfastProfileSlug } from '@/api/breakfast';
import type { MealItem } from '@/schemas/mealPlan';
import { refMealItemsToWizardState } from '@/lib/refMealToWizardState';
import { buildBreakfastWizardItems } from '@/lib/breakfastWizardItems';
import { BREAKFAST_PROFILES, buildBreakfastProfileState } from '@/lib/breakfastProfiles';
import { getApiErrorMessage } from '@/lib/api';
import { BREAKFAST_CHIP_CLASS } from './breakfastStyles';

type ManualItemsPolicy = 'preserve' | 'replace';

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
  const [selectedProfile, setSelectedProfile] = useState<BreakfastProfileSlug | null>(null);
  const [profileHints, setProfileHints] = useState<string[]>([]);
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

  function applyBreakfastProfile(profile: BreakfastProfileSlug) {
    if (!catalog) return;
    setSelectedProfile(profile);
    const { state: profileState, hints } = buildBreakfastProfileState(profile, catalog, state);
    setProfileHints(hints);
    wiz.replaceState(profileState);
    wiz.setStep('basis');
  }

  async function handleSave() {
    try {
      const items = buildBreakfastWizardItems(state, catalog, dayPartFactor);

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
  const stepIndex = Math.max(0, visibleWizardSteps.indexOf(step));
  const profileTitle = selectedProfile ? BREAKFAST_PROFILES.find((profile) => profile.id === selectedProfile)?.title ?? '' : '';

  const handleBack = () => {
    if (saveMode === 'refMeal') {
      navigate(`/meal-plans/${planId}/ref-meals/breakfast`);
    } else {
      navigate(`/meal-plans/${planId}/plan`);
    }
  };

  return (
    <div className="pb-28 md:pb-8">
      {/* Flow header: close leaves the wizard, progress shows the step (food-page-shell) */}
      <FlowHeader
        title="Frühstücksassistent"
        onClose={handleBack}
        closeLabel="Frühstücksassistent verlassen"
        progress={`Schritt ${stepIndex + 1} von ${visibleWizardSteps.length}`}
        progressValue={((stepIndex + 1) / Math.max(1, visibleWizardSteps.length)) * 100}
      />

      <div className="mx-auto max-w-3xl px-4 pt-6">
        <p className="mb-4 text-caption text-muted-foreground">
          {plan?.name ?? '…'}{profileTitle ? ` · Variante: ${profileTitle}` : ''}
        </p>

        {/* Step indicator: numbered steps with connectors, as in the meal plan wizard */}
        <nav aria-label="Frühstücksassistent: Fortschritt" className="mb-6 w-full">
          <ol className="flex items-center justify-center gap-1 sm:gap-2">
            {visibleWizardSteps.map((s, i) => {
              const isActive = s === step;
              const isCompleted = stepIndex > i;
              return (
                <li key={s} className="flex items-center" data-testid={`breakfast-wizard-indicator-${s}`}>
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-caption font-semibold transition-colors sm:h-9 sm:w-9 ${
                      isActive
                        ? 'border-primary bg-primary text-primary-foreground'
                        : isCompleted
                          ? 'border-primary bg-primary-soft text-primary-dark'
                          : 'border-border bg-card text-muted-foreground'
                    }`}
                    aria-current={isActive ? 'step' : undefined}
                    title={STEP_LABELS[s]}
                  >
                    {isCompleted ? <Check className="h-3.5 w-3.5" /> : i + 1}
                  </div>
                  <span
                    className={`ml-1.5 hidden max-w-[120px] truncate text-caption font-medium sm:block ${
                      isActive ? 'text-foreground' : 'text-muted-foreground'
                    }`}
                  >
                    {STEP_LABELS[s]}
                  </span>
                  {i < visibleWizardSteps.length - 1 && (
                    <div
                      className={`mx-1 hidden h-0.5 w-6 rounded-lg transition-colors sm:block ${
                        isCompleted ? 'bg-primary' : 'bg-border'
                      }`}
                    />
                  )}
                </li>
              );
            })}
          </ol>
          {/* Phones show only the active step name; the labels above appear from 640 px */}
          <p className="mt-3 text-center text-caption text-muted-foreground sm:hidden">
            <span className="font-medium text-foreground">{STEP_LABELS[step]}</span>
          </p>
        </nav>

        {/* Step content */}
        <div>
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
            <div className="rounded-xl border border-destructive/30 bg-card p-4 text-body shadow-card" role="alert">
              <p>Die Frühstücksauswahl konnte nicht geladen werden.</p>
              <button type="button" onClick={() => void refetchCatalog()} className={`mt-3 ${BREAKFAST_CHIP_CLASS}`}>
                Erneut versuchen
              </button>
            </div>
          )}
          {saveMode === 'directMeal' && step === 'preset' && !directMealLoading && !directMealNotFound && catalog && (
            <section className="space-y-3" aria-labelledby="breakfast-preset-heading">
              <div>
                <h2 id="breakfast-preset-heading" className="font-display font-semibold text-section">Frühstück auswählen</h2>
                <p className="text-caption text-muted-foreground">Wähle ein vollständiges Frühstück. Danach kannst du alle Slider und Items anpassen.</p>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {BREAKFAST_PROFILES.map((profile) => (
                  <button
                    key={profile.id}
                    type="button"
                    onClick={() => applyBreakfastProfile(profile.id)}
                    aria-pressed={selectedProfile === profile.id}
                    className={`rounded-xl border bg-card p-4 text-left shadow-card transition-colors hover:border-primary hover:bg-primary/5 ${selectedProfile === profile.id ? 'border-primary ring-2 ring-primary/20' : 'border-border'}`}
                  >
                    <span className="block text-body font-semibold">{profile.title}</span>
                    <span className="mt-0.5 block text-caption text-muted-foreground">{profile.description}</span>
                  </button>
                ))}
                {saveMode === 'directMeal' && mealId != null && (
                  <button
                    type="button"
                    onClick={() => setFreeBuffetOpen(true)}
                    className="rounded-xl border-2 border-primary bg-primary/5 p-4 text-left shadow-card transition-colors hover:bg-primary/10"
                  >
                    <span className="block text-body font-bold text-primary-dark">Freies Buffet</span>
                    <span className="mt-0.5 block text-caption text-muted-foreground">Alle Buffet-Rollen frei zusammenstellen.</span>
                  </button>
                )}
              </div>
            </section>
          )}
          {!directMealLoading && !directMealNotFound && step !== 'preset' && profileHints.length > 0 && (
            <div className="mb-4 rounded-xl bg-warning-soft p-4 text-body" role="status" aria-label="Hinweise zum Frühstücksprofil">
              <ul className="list-disc space-y-1 pl-5">
                {profileHints.map((hint) => <li key={hint}>{hint}</li>)}
              </ul>
            </div>
          )}
          {!directMealLoading && !directMealNotFound && step === 'basis' && (
            <>
              <StepBasis wiz={wiz} dayPartFactor={dayPartFactor} />
              {!hasActiveBasis && !catalogLoading && (
                <div className="mt-4 rounded-xl bg-warning-soft p-4 text-body" role="alert">
                  <p>Wähle eine Basis-Zutat aus, bevor du fortfährst.</p>
                  {catalog && catalog.base_ingredients.length === 0 && (
                    <button type="button" onClick={() => wiz.openCreateModal('ingredient', 'breakfast-base')} className={`mt-3 ${BREAKFAST_CHIP_CLASS}`}>
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
      </div>

      {/* Navigation: one footer, fixed on phones and part of the page from 768 px */}
      <ActionBar
        secondary={
          <div className="flex items-center gap-2">
            {!isCockpit && (
              <button
                type="button"
                onClick={handleBack}
                className="inline-flex h-11 items-center gap-1.5 rounded-lg border border-border px-4 text-body font-semibold text-muted-foreground transition-all hover:bg-muted"
              >
                <X className="h-4 w-4" />
                Abbrechen
              </button>
            )}
            {canGoPrev && (saveMode === 'directMeal' || step !== 'basis') && (
              <button
                type="button"
                onClick={goPrev}
                className="inline-flex h-11 items-center gap-1.5 rounded-lg border border-border px-4 text-body font-semibold transition-all hover:bg-muted"
              >
                <ArrowLeft className="h-4 w-4" />
                Zurück
              </button>
            )}
          </div>
        }
        primary={
          <>
            {canGoNext && step !== 'preset' && (
              <button
                type="button"
                onClick={goNext}
                disabled={step === 'basis' && !hasActiveBasis}
                className="inline-flex h-11 items-center justify-center gap-1.5 rounded-lg bg-primary px-5 text-body font-semibold text-primary-foreground transition-all hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50"
              >
                Weiter
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
            {isCockpit && (
              <button
                type="button"
                onClick={handleSave}
                disabled={savePending}
                className="inline-flex h-11 items-center justify-center gap-1.5 rounded-lg bg-primary px-5 text-body font-semibold text-primary-foreground transition-all hover:bg-primary-dark disabled:opacity-60"
              >
                <Check className="h-4 w-4" />
                {savePending ? 'Wird gespeichert…' : 'Frühstück speichern'}
              </button>
            )}
          </>
        }
      />

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
          initialTemplateSlug="free"
          normPortions={targetMeal?.override_portions ?? normPortions}
          onSaved={() => navigate(`/meal-plans/${planId}/plan`)}
        />
      )}
    </div>
  );
}
