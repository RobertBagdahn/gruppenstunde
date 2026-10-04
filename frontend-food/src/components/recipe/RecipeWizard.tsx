import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Check, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import type { IngredientReviewPreview } from '@/schemas/ingredientReview';
import type { RecipeDetail } from '@/schemas/recipe';
import { useIngredient } from '@/api/supplies';
import { useCreateRecipe, useRecipe, useUpdateRecipe, type RecipeCreatePayload } from '@/api/recipes';
import { useRecipeIngredientReviewStore } from '@/store/useRecipeIngredientReviewStore';
import { useCurrentUser } from '@/api/auth';
import { RESTORE_DRAFT_PARAM, clearDraft, loadDraft, saveDraft, withRestoreParam } from '@/hooks/useDraft';
import { useLoginPrompt } from '@/store/loginPromptStore';
import type { IngredientReviewRow } from '@/schemas/ingredientReview';

import WizardStepMethod from './WizardStepMethod';
import WizardStepBasis, { type BasisDraft } from './WizardStepBasis';
import RecipeIngredientReviewStep from './RecipeIngredientReviewStep';
import WizardStepIngredients from './WizardStepIngredients';
import WizardStepMaterials from './WizardStepMaterials';
import WizardStepMetadata from './WizardStepMetadata';
import WizardStepSteps from './WizardStepSteps';
import WizardStepPreview from './WizardStepPreview';
import { WizardStepContext, type LeaveDirection, type LeaveHandler, type WizardStepContextValue } from './wizardContext';
import {
  FIRST_DRAFT_STEP,
  WIZARD_STEP_IDS,
  getCreationStepId,
  getProgressSteps,
  getVisibleSteps,
  resolveStepId,
  type CreationMethod,
  type WizardCtx,
  type WizardStepDef,
  type WizardStepId,
} from './wizardSteps';

function StepIndicator({ steps, activeIndex }: { steps: WizardStepDef[]; activeIndex: number }) {
  const active = steps[activeIndex];
  return (
    <nav aria-label="Rezept-Erstellungs-Fortschritt" className="w-full">
      <ol className="flex items-center justify-center gap-1 sm:gap-2">
        {steps.map((step, i) => {
          const isActive = i === activeIndex;
          const isCompleted = i < activeIndex;
          return (
            <li key={step.id} className="flex items-center" data-testid={`recipe-wizard-indicator-${step.id}`}>
              <div
                className={`
                  flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full text-caption sm:text-body font-semibold border-2 transition-colors
                  ${isActive ? 'border-primary bg-primary text-primary-foreground' : ''}
                  ${isCompleted ? 'border-primary bg-primary/20 text-primary' : ''}
                  ${!isActive && !isCompleted ? 'border-muted-foreground/30 text-muted-foreground' : ''}
                `}
                aria-current={isActive ? 'step' : undefined}
                title={step.label}
              >
                {isCompleted ? <Check className="w-3.5 h-3.5" /> : i + 1}
              </div>
              <span className="hidden sm:block ml-1.5 text-caption font-medium text-muted-foreground truncate max-w-[70px]">
                {step.label}
              </span>
              {i < steps.length - 1 && (
                <div
                  className={`hidden sm:block w-6 h-0.5 mx-1 rounded-lg transition-colors ${i < activeIndex ? 'bg-primary' : 'bg-muted-foreground/20'}`}
                />
              )}
            </li>
          );
        })}
      </ol>
      {active && (
        <p className="mt-3 text-center text-caption text-muted-foreground" data-testid="recipe-wizard-step-help">
          <span className="font-medium text-foreground">
            Schritt {activeIndex + 1} von {steps.length}: {active.label}
          </span>
          {' – '}
          {active.help}
        </p>
      )}
    </nav>
  );
}

function parseDraftId(raw: string | null): number | null {
  if (!raw || !/^\d+$/.test(raw)) return null;
  const id = Number.parseInt(raw, 10);
  return id > 0 ? id : null;
}

function newIdempotencyKey(): string {
  return `recipe-wizard-${crypto.randomUUID()}`;
}

function errorMessage(error: unknown): string {
  return error instanceof Error && error.message ? error.message : 'Unbekannter Fehler';
}

interface BasicsState {
  title: string;
  recipeType: string | null;
  servings: number | null;
  servingsConfirmed: boolean;
}

const EMPTY_BASICS: BasicsState = { title: '', recipeType: null, servings: null, servingsConfirmed: false };

// Visitors fill the wizard without an account; this key stores their work across the OAuth redirect.
const RECIPE_DRAFT_KEY = 'recipe:new';

interface StoredRecipeWizardDraft {
  creationMethod: CreationMethod | null;
  smartResult: IngredientReviewPreview | null;
  basics: BasicsState;
  reviewRows: IngredientReviewRow[];
}

export default function RecipeWizard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const ingredientSlug = searchParams.get('ingredient')?.trim() ?? '';
  const { data: linkedIngredient } = useIngredient(ingredientSlug);
  const { data: user } = useCurrentUser();
  const showLogin = useLoginPrompt((state) => state.show);
  const [draftStashed, setDraftStashed] = useState(false);

  // --- Client state before the draft exists ---
  const [creationMethod, setCreationMethod] = useState<CreationMethod | null>(null);
  const [smartResult, setSmartResult] = useState<IngredientReviewPreview | null>(null);
  const [basics, setBasicsState] = useState<BasicsState>(EMPTY_BASICS);
  // Leave handlers update the basics right before the draft is created, so
  // the creation reads them from a ref instead of a stale render closure.
  const basicsRef = useRef<BasicsState>(EMPTY_BASICS);
  const setBasics = useCallback((update: BasicsState | ((current: BasicsState) => BasicsState)) => {
    basicsRef.current = typeof update === 'function' ? update(basicsRef.current) : update;
    setBasicsState(basicsRef.current);
  }, []);
  const idempotencyKeyRef = useRef(newIdempotencyKey());

  const initializeReview = useRecipeIngredientReviewStore((store) => store.initialize);
  const getFinalizedRows = useRecipeIngredientReviewStore((store) => store.getFinalizedRows);
  const setReviewError = useRecipeIngredientReviewStore((store) => store.setError);
  const resetReview = useRecipeIngredientReviewStore((store) => store.reset);
  const reviewRowCount = useRecipeIngredientReviewStore((store) => store.rows.length);
  const reviewIsDirty = useRecipeIngredientReviewStore((store) => store.isDirty);

  const ctx: WizardCtx = useMemo(() => ({ creationMethod, reviewRowCount }), [creationMethod, reviewRowCount]);
  const visibleSteps = useMemo(() => getVisibleSteps(ctx), [ctx]);
  const creationStepId = getCreationStepId(visibleSteps);

  // --- URL state: ?draft=<recipeId>&step=<stepId> ---
  const draftId = parseDraftId(searchParams.get('draft'));
  const rawStep = searchParams.get('step');
  const urlStepId = resolveStepId(rawStep, draftId !== null, ctx);
  const [activeStepId, setActiveStepId] = useState<WizardStepId>(urlStepId);
  const knownDraftIdRef = useRef<number | null>(draftId);

  const draftQuery = useRecipe(draftId ?? 0, { retry: false });
  const draft: RecipeDetail | null = draftQuery.data?.can_edit ? draftQuery.data : null;
  const draftNotFound = draftId !== null && (draftQuery.isError || (draftQuery.data !== undefined && !draftQuery.data.can_edit));

  const createRecipe = useCreateRecipe();
  const { mutateAsync: updateRecipe } = useUpdateRecipe(draftId ?? 0);

  // Title and type come from the server when a draft is resumed.
  const loadedDraftIdRef = useRef<number | null>(null);
  useEffect(() => {
    if (!draft || loadedDraftIdRef.current === draft.id) return;
    loadedDraftIdRef.current = draft.id;
    setBasics((current) => ({
      ...current,
      title: draft.title,
      recipeType: draft.recipe_type || null,
      servings: draft.source_servings ?? null,
    }));
  }, [draft, setBasics]);

  // --- Restore a visitor's draft after the login round trip ---
  const restoredRef = useRef(false);
  useEffect(() => {
    if (restoredRef.current || !user || searchParams.get(RESTORE_DRAFT_PARAM) !== RECIPE_DRAFT_KEY) return;
    restoredRef.current = true;
    const stored = loadDraft<StoredRecipeWizardDraft>(RECIPE_DRAFT_KEY);
    if (!stored) return;
    setCreationMethod(stored.creationMethod);
    setSmartResult(stored.smartResult);
    setBasics(stored.basics);
    if (stored.smartResult) {
      initializeReview(stored.smartResult);
      useRecipeIngredientReviewStore.setState({ rows: stored.reviewRows, isDirty: true });
    }
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.delete(RESTORE_DRAFT_PARAM);
      return next;
    }, { replace: true });
    toast.info('Willkommen zurück! Dein Rezept ist wiederhergestellt – klicke auf „Weiter“, um es zu speichern.');
  }, [initializeReview, searchParams, setBasics, setSearchParams, user]);

  // --- Leave handlers registered by the rendered step ---
  const leaveHandlersRef = useRef(new Map<WizardStepId, Set<LeaveHandler>>());
  const stepContexts = useMemo(() => {
    const entries = WIZARD_STEP_IDS.map((id): [WizardStepId, WizardStepContextValue] => [id, {
      registerLeave: (handler) => {
        const handlers = leaveHandlersRef.current.get(id) ?? new Set<LeaveHandler>();
        leaveHandlersRef.current.set(id, handlers);
        handlers.add(handler);
        return () => {
          handlers.delete(handler);
        };
      },
    }]);
    return Object.fromEntries(entries) as Record<WizardStepId, WizardStepContextValue>;
  }, []);

  const runLeave = useCallback(async (id: WizardStepId, direction: LeaveDirection): Promise<boolean> => {
    for (const handler of [...(leaveHandlersRef.current.get(id) ?? [])]) {
      if (!(await handler(direction))) return false;
    }
    return true;
  }, []);

  // --- One action at a time; a ref also blocks clicks before the re-render ---
  const busyRef = useRef(false);
  const [isSaving, setIsSaving] = useState(false);
  const runExclusive = useCallback(async (action: () => Promise<void>) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setIsSaving(true);
    try {
      await action();
    } finally {
      busyRef.current = false;
      setIsSaving(false);
    }
  }, []);

  const showError = useCallback((stepId: WizardStepId, error: unknown) => {
    const message = errorMessage(error);
    if (stepId === 'review') setReviewError(message);
    toast.error(stepId === 'input' ? 'Analyse fehlgeschlagen' : 'Speichern fehlgeschlagen', { description: message });
  }, [setReviewError]);

  const writeUrl = useCallback((stepId: WizardStepId, nextDraftId: number | null, replace: boolean) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set('step', stepId);
      if (nextDraftId === null) next.delete('draft');
      else next.set('draft', String(nextDraftId));
      return next;
    }, { replace });
  }, [setSearchParams]);

  const goToStep = useCallback((stepId: WizardStepId, nextDraftId: number | null) => {
    if (nextDraftId !== null) knownDraftIdRef.current = nextDraftId;
    setActiveStepId(stepId);
    writeUrl(stepId, nextDraftId, false);
  }, [writeUrl]);

  // --- Browser back/forward and manual URL changes ---
  useEffect(() => {
    if (draftId !== null) knownDraftIdRef.current = draftId;
    const knownDraftId = knownDraftIdRef.current;
    if (knownDraftId !== null && draftId === null) {
      // History entries from before the draft existed carry no client state.
      writeUrl(activeStepId, knownDraftId, true);
      toast.info('Das Rezept ist bereits angelegt. Titel und Typ änderst du im Schritt Zutaten.');
      return;
    }
    if (urlStepId === activeStepId) {
      if (rawStep !== urlStepId) writeUrl(urlStepId, draftId, true);
      return;
    }
    if (busyRef.current) {
      writeUrl(activeStepId, draftId, true);
      return;
    }
    const from = activeStepId;
    const order = visibleSteps.map((step) => step.id);
    const direction: LeaveDirection = order.indexOf(urlStepId) < order.indexOf(from) ? 'back' : 'next';
    void runExclusive(async () => {
      let canLeave = false;
      try {
        canLeave = await runLeave(from, direction);
      } catch (error) {
        showError(from, error);
      }
      if (canLeave) setActiveStepId(urlStepId);
      else writeUrl(from, draftId, true);
    });
  }, [activeStepId, draftId, rawStep, runExclusive, runLeave, showError, urlStepId, visibleSteps, writeUrl]);

  // Warn before losing client-only state (nothing is on the server yet).
  const hasUnsavedClientState = draftId === null && !draftStashed && (creationMethod !== null || reviewIsDirty);
  useEffect(() => {
    if (!hasUnsavedClientState) return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedClientState]);

  useEffect(() => () => resetReview(), [resetReview]);

  // --- The single creation point ---
  const createDraft = useCallback(async (): Promise<RecipeDetail | null> => {
    const reviewIsVisible = visibleSteps.some((step) => step.id === 'review');
    const finalizedRows = reviewIsVisible ? getFinalizedRows() : null;
    if (reviewIsVisible && !finalizedRows) {
      toast.error('Bitte bestätige alle Zutaten und löse offene Zuordnungen.');
      return null;
    }
    if (!user) {
      // Saving needs an account: keep everything the visitor entered and ask them to log in.
      const stored: StoredRecipeWizardDraft = {
        creationMethod,
        smartResult,
        basics: basicsRef.current,
        reviewRows: useRecipeIngredientReviewStore.getState().rows,
      };
      saveDraft(RECIPE_DRAFT_KEY, stored);
      setDraftStashed(true);
      showLogin({
        reason: 'Melde dich an, um dein Rezept zu speichern. Deine Eingaben bleiben erhalten.',
        next: withRestoreParam(window.location.pathname + window.location.search, RECIPE_DRAFT_KEY),
      });
      return null;
    }
    const recipeDraft = smartResult?.recipe_draft;
    const basics = basicsRef.current;
    const payload: RecipeCreatePayload = {
      title: basics.title.trim(),
      recipe_type: basics.recipeType ?? 'warm_meal',
      portions: 1,
      description: recipeDraft?.description,
      summary: recipeDraft?.summary,
      difficulty: recipeDraft?.difficulty || 'easy',
      execution_time: recipeDraft?.execution_time_choice || 'less_30',
      preparation_time: recipeDraft?.preparation_time_choice || 'none',
      source_url: recipeDraft?.source_url,
      image_url: recipeDraft?.image_url,
      scout_level_ids: recipeDraft?.scout_level_ids,
      tag_ids: recipeDraft?.tag_ids,
      steps: (recipeDraft?.steps ?? []).map((instruction, index) => ({
        sort_order: index,
        instruction,
        duration_minutes: null,
        section: '',
        step_ingredients: [],
      })),
      idempotency_key: idempotencyKeyRef.current,
      ...(basics.servings !== null ? { input_servings: basics.servings } : {}),
    };
    if (finalizedRows) {
      // Totals for the original servings; the backend normalizes to one portion.
      payload.recipe_items = finalizedRows.map((row, index) => ({
        portion_id: row.selected_portion_id,
        quantity: row.quantity,
        sort_order: index,
        note: '',
        is_optional: false,
      }));
      payload.ingredient_review_rows = finalizedRows;
    }
    const recipe = await createRecipe.mutateAsync(payload);
    clearDraft(RECIPE_DRAFT_KEY);
    queryClient.setQueryData(['recipe', recipe.id], recipe);
    queryClient.setQueryData(['recipe', 'slug', recipe.slug], recipe);
    return recipe;
  }, [createRecipe, creationMethod, getFinalizedRows, queryClient, showLogin, smartResult, user, visibleSteps]);

  const saveRecipe = useCallback(async (body: Record<string, unknown>) => {
    await updateRecipe(body);
  }, [updateRecipe]);

  const activeIndex = Math.max(0, visibleSteps.findIndex((step) => step.id === activeStepId));
  const progressSteps = getProgressSteps(ctx);
  const progressActiveIndex = Math.max(0, progressSteps.findIndex((step) => step.id === activeStepId));
  const isFirst = activeIndex === 0;
  const isLast = activeIndex === visibleSteps.length - 1;
  const backLocked = draftId !== null && activeStepId === FIRST_DRAFT_STEP;

  const handleNext = useCallback(() => runExclusive(async () => {
    const from = activeStepId;
    try {
      if (!(await runLeave(from, 'next'))) return;
      if (from === 'preview') {
        toast.success('Rezept fertiggestellt!');
        if (draft) navigate(`/recipes/${draft.slug}`);
        return;
      }
      let nextDraftId = draftId;
      if (from === creationStepId && draftId === null) {
        const created = await createDraft();
        if (!created) return;
        nextDraftId = created.id;
      }
      const next = visibleSteps[activeIndex + 1];
      if (next) goToStep(next.id, nextDraftId);
    } catch (error) {
      showError(from, error);
    }
  }), [activeIndex, activeStepId, createDraft, creationStepId, draft, draftId, goToStep, navigate, runExclusive, runLeave, showError, visibleSteps]);

  const handleBack = useCallback(() => runExclusive(async () => {
    const from = activeStepId;
    const target = visibleSteps[activeIndex - 1];
    if (!target || backLocked) return;
    try {
      if (!(await runLeave(from, 'back'))) return;
      goToStep(target.id, draftId);
    } catch (error) {
      showError(from, error);
    }
  }), [activeIndex, activeStepId, backLocked, draftId, goToStep, runExclusive, runLeave, showError, visibleSteps]);

  const handleSmartResult = useCallback((result: IngredientReviewPreview) => {
    setCreationMethod('smart');
    setSmartResult(result);
    setBasics({
      title: result.recipe_draft.title,
      recipeType: result.recipe_draft.recipe_type || 'warm_meal',
      servings: result.recipe_draft.servings ?? 1,
      servingsConfirmed: false,
    });
    initializeReview(result);
  }, [initializeReview, setBasics]);

  const handleManualStart = useCallback(() => {
    if (busyRef.current) return;
    setCreationMethod('manual');
    setSmartResult(null);
    setBasics(EMPTY_BASICS);
    resetReview();
    goToStep('basis', null);
  }, [goToStep, resetReview, setBasics]);

  const handleBasisChange = useCallback((next: BasisDraft) => {
    setBasics({ title: next.title, recipeType: next.recipeType, servings: next.servings, servingsConfirmed: true });
  }, [setBasics]);

  const handleRestart = useCallback(() => {
    knownDraftIdRef.current = null;
    loadedDraftIdRef.current = null;
    idempotencyKeyRef.current = newIdempotencyKey();
    setCreationMethod(null);
    setSmartResult(null);
    setBasics(EMPTY_BASICS);
    resetReview();
    setActiveStepId('input');
    setSearchParams(new URLSearchParams({ step: 'input' }), { replace: true });
  }, [resetReview, setBasics, setSearchParams]);

  if (draftNotFound) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-4" data-testid="recipe-wizard-draft-not-found">
        <h2 className="text-section font-display font-bold">Entwurf nicht gefunden</h2>
        <p className="text-body text-muted-foreground">
          Dieser Rezept-Entwurf existiert nicht oder gehört nicht zu deinem Konto.
        </p>
        <button
          type="button"
          onClick={handleRestart}
          className="inline-flex items-center gap-1.5 px-5 py-2 text-body font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
        >
          Neu beginnen
        </button>
      </div>
    );
  }

  const renderStep = (): ReactNode => {
    switch (activeStepId) {
      case 'input':
        return (
          <WizardStepMethod
            aiInteractionId={smartResult?.ai_interaction_id ?? null}
            hasResult={smartResult !== null}
            onSmartResult={handleSmartResult}
            onManualStart={handleManualStart}
            initialInput={linkedIngredient ? `Erstelle ein Rezept mit ${linkedIngredient.name}.` : ''}
          />
        );
      case 'basis':
        return (
          <WizardStepBasis
            isManual={creationMethod === 'manual'}
            isReconstructed={smartResult?.is_reconstructed ?? false}
            initialTitle={basics.title}
            initialRecipeType={basics.recipeType}
            initialServings={basics.servings}
            initialServingsConfirmed={basics.servingsConfirmed}
            onDraftChange={handleBasisChange}
          />
        );
      case 'review':
        return <RecipeIngredientReviewStep />;
      default:
        break;
    }
    if (!draft) {
      return (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          Lade Entwurf...
        </div>
      );
    }
    switch (activeStepId) {
      case 'ingredients':
        return (
          <WizardStepIngredients
            recipeId={draft.id}
            recipeSlug={draft.slug}
          />
        );
      case 'materials':
        return <WizardStepMaterials recipeId={draft.id} />;
      case 'preparation':
        return (
          <div className="space-y-6">
            <WizardStepMetadata recipeSlug={draft.slug} saveRecipe={saveRecipe} />
            <WizardStepSteps recipeSlug={draft.slug} />
          </div>
        );
      case 'preview':
        return <WizardStepPreview recipeSlug={draft.slug} />;
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 sm:py-8">
      <div className="mb-8">
        <StepIndicator steps={progressSteps} activeIndex={progressActiveIndex} />
      </div>

      <div className="min-h-[400px]" data-testid={`recipe-wizard-step-${activeStepId}`}>
        <WizardStepContext.Provider key={activeStepId} value={stepContexts[activeStepId]}>
          {renderStep()}
        </WizardStepContext.Provider>
      </div>

      <div className="mt-8 pt-6 border-t sticky bottom-0 bg-background py-4">
        <div className="flex items-center justify-between">
          <div>
            {!isFirst && (
              <button
                type="button"
                onClick={handleBack}
                disabled={isSaving || backLocked}
                title={backLocked ? 'Das Rezept ist bereits angelegt.' : undefined}
                data-testid="recipe-wizard-back"
                className="flex items-center gap-1.5 px-4 py-2 text-body font-medium border rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4" />
                Zurück
              </button>
            )}
          </div>
          {!isLast && (
            <button
              type="button"
              onClick={handleNext}
              disabled={isSaving}
              data-testid="recipe-wizard-next"
              className="flex items-center gap-1.5 px-5 py-2 text-body font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors ml-auto disabled:opacity-50"
            >
              {isFirst ? (
                isSaving ? (
                  <>
                    <Sparkles className="w-4 h-4 animate-spin" />
                    Analysiert…
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Rezept analysieren
                  </>
                )
              ) : isSaving ? (
                'Speichert...'
              ) : (
                <>
                  Weiter
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          )}
          {isLast && (
            <button
              type="button"
              onClick={handleNext}
              disabled={isSaving}
              data-testid="recipe-wizard-finish"
              className="flex items-center gap-1.5 px-5 py-2 text-body font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors ml-auto disabled:opacity-50"
            >
              {isSaving ? 'Speichert...' : (
                <>
                  Fertigstellen
                  <Check className="w-4 h-4" />
                </>
              )}
            </button>
          )}
        </div>
        {backLocked && (
          <p className="mt-2 text-caption text-muted-foreground" data-testid="recipe-wizard-back-locked-hint">
            Das Rezept ist bereits angelegt. Titel und Typ änderst du direkt hier.
          </p>
        )}
      </div>
    </div>
  );
}
