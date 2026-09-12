import { useState, useCallback, useRef, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ChevronLeft, ChevronRight, Check, Sparkles } from 'lucide-react';
import type { RecipeImportUrlResponse } from '@/api/recipeImport';
import { useIngredient } from '@/api/supplies';
import { API_BASE_URL, fetchWithCsrf } from '@/lib/api';

import WizardStepMethod, { type WizardStepMethodHandle, type WizardState } from './WizardStepMethod';
import WizardStepIngredients from './WizardStepIngredients';
import type { WizardStepIngredientsHandle } from './WizardStepIngredients';
import WizardStepBasis, { type WizardStepBasisHandle } from './WizardStepBasis';
import WizardStepMetadata from './WizardStepMetadata';
import WizardStepSteps from './WizardStepSteps';
import type { WizardStepStepsHandle } from './WizardStepSteps';
import WizardStepPreview, { type WizardStepPreviewHandle } from './WizardStepPreview';

interface RecipeWizardState extends WizardState {
  inputServings: number | null;
  inputItemsAreContextual: boolean;
}

const STEP_LABELS = ['KI-Eingabe', 'Basis & Portionen', 'Zutaten', 'Zubereitung', 'Vorschau'];

function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <nav aria-label="Rezept-Erstellungs-Fortschritt" className="w-full">
      <ol className="flex items-center justify-center gap-1 sm:gap-2">
        {STEP_LABELS.map((label, i) => {
          const isActive = i === currentStep;
          const isCompleted = i < currentStep;
          return (
            <li key={i} className="flex items-center">
              <div
                className={`
                  flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full text-xs sm:text-sm font-semibold border-2 transition-colors
                  ${isActive ? 'border-primary bg-primary text-primary-foreground' : ''}
                  ${isCompleted ? 'border-primary bg-primary/20 text-primary' : ''}
                  ${!isActive && !isCompleted ? 'border-muted-foreground/30 text-muted-foreground' : ''}
                `}
                aria-current={isActive ? 'step' : undefined}
              >
                {isCompleted ? <Check className="w-3.5 h-3.5" /> : i + 1}
              </div>
              <span className="hidden sm:block ml-1.5 text-xs font-medium text-muted-foreground truncate max-w-[70px]">
                {label}
              </span>
              {i < STEP_LABELS.length - 1 && (
                <div
                  className={`hidden sm:block w-6 h-0.5 mx-1 rounded transition-colors ${i < currentStep ? 'bg-primary' : 'bg-muted-foreground/20'}`}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function validateStep(state: RecipeWizardState): string | null {
  switch (state.currentStep) {
    case 1:
      return null;
    default:
      return null;
  }
}

export interface MetadataSnapshot {
  summary: string;
  description: string;
  difficulty: string;
  executionTime: string;
  preparationTime: string;
  visibility: string;
  selectedTagSlugs: string[];
}

/**
 * Build the metadata PATCH body.
 *
 * Returns null while the metadata step has not reported its state yet, so
 * clicking through the step cannot overwrite existing content with defaults.
 * Choice fields are omitted when empty because the backend rejects empty
 * values for them; free-text fields stay clearable on purpose.
 */
export function buildMetadataPatch(
  meta: MetadataSnapshot | null,
): Record<string, unknown> | null {
  if (!meta) return null;

  const body: Record<string, unknown> = {
    summary: meta.summary,
    description: meta.description,
    tag_ids: meta.selectedTagSlugs,
  };
  if (meta.visibility) body.visibility = meta.visibility;
  if (meta.difficulty) body.difficulty = meta.difficulty;
  if (meta.executionTime) body.execution_time = meta.executionTime;
  if (meta.preparationTime) body.preparation_time = meta.preparationTime;
  return body;
}

function getCsrfToken(): string {
  const cookie = document.cookie
    .split('; ')
    .find((row) => row.startsWith('csrftoken='));
  return cookie ? cookie.split('=')[1] : '';
}

export function formatSaveError(body: unknown): string {
  if (body && typeof body === 'object' && 'msg' in body) {
    const message = (body as { msg?: unknown }).msg;
    if (typeof message === 'string' && message.trim()) return message;
  }
  if (typeof body === 'string' && body.trim()) return body;
  if (Array.isArray(body)) {
    const messages = body.map(formatSaveError).filter(Boolean);
    if (messages.length > 0) return messages.join(', ');
  }
  if (body && typeof body === 'object') {
    const record = body as Record<string, unknown>;
    for (const key of ['detail', 'message', 'errors']) {
      const message = formatSaveError(record[key]);
      if (message) return message;
    }
    const fields = Object.entries(record)
      .map(([field, value]) => {
        const message = formatSaveError(value);
        return message ? `${field}: ${message}` : '';
      })
      .filter(Boolean);
    if (fields.length > 0) return fields.join('; ');
  }
  return 'Speichern fehlgeschlagen';
}

export default function RecipeWizard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const ingredientSlug = searchParams.get('ingredient')?.trim() ?? '';
  const { data: linkedIngredient } = useIngredient(ingredientSlug);
  const [state, setState] = useState<RecipeWizardState>({
    currentStep: 0,
    recipeId: null,
    recipeSlug: null,
    creationMethod: null,
    aiInteractionId: null,
    inputServings: null,
        inputItemsAreContextual: false,
  });

  const [stepTitle, setStepTitle] = useState('');
  const [stepRecipeType, setStepRecipeType] = useState<string | null>(null);
  const [smartResult, setSmartResult] = useState<RecipeImportUrlResponse | null>(null);

  // Stays null until the metadata step reported its state from the loaded
  // recipe. Sending the uninitialised defaults wiped AI-generated content.
  const metadataRef = useRef<MetadataSnapshot | null>(null);

  const updateState = useCallback((patch: Partial<RecipeWizardState>) => {
    setState((prev) => ({ ...prev, ...patch }));
  }, []);

  const [isSaving, setIsSaving] = useState(false);
  const methodStepRef = useRef<WizardStepMethodHandle>(null);
  const basisStepRef = useRef<WizardStepBasisHandle>(null);
  const previewStepRef = useRef<WizardStepPreviewHandle>(null);
  const ingredientsStepRef = useRef<WizardStepIngredientsHandle>(null);
  const stepsStepRef = useRef<WizardStepStepsHandle>(null);

  const saveRecipe = useCallback(async (recipeId: number, body: Record<string, unknown>) => {
    const res = await fetchWithCsrf(`${API_BASE_URL}/api/recipes/${recipeId}/`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() },
      credentials: 'include',
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(formatSaveError(body));
    }
  }, []);

  const handleNext = useCallback(async () => {
    const error = validateStep(state);
    if (error) {
      toast.error(error);
      return;
    }

    setIsSaving(true);

    try {
      if (state.currentStep === 0) {
        const shouldAdvance = await methodStepRef.current?.primaryAction();
        if (!shouldAdvance) {
          setIsSaving(false);
          return;
        }
      }

      if (state.currentStep === 1) {
        if (!(await (basisStepRef.current?.save() ?? Promise.resolve(false)))) {
          setIsSaving(false);
          return;
        }
      }

      if (state.currentStep === 2) {
        if (!(await (ingredientsStepRef.current?.save() ?? Promise.resolve(false)))) {
          setIsSaving(false);
          return;
        }
        const activeRecipeId = state.recipeId;
        const body: Record<string, unknown> = {};
        if (stepTitle) body.title = stepTitle;
        if (stepRecipeType) body.recipe_type = stepRecipeType;
        if (activeRecipeId) await saveRecipe(activeRecipeId, body);
      }

      if (state.currentStep === 3) {
        if (state.recipeId) {
          const body = buildMetadataPatch(metadataRef.current);
          if (body) await saveRecipe(state.recipeId, body);
        }
        if (!(await (stepsStepRef.current?.save() ?? Promise.resolve(true)))) {
          setIsSaving(false);
          return;
        }
      }
    } catch (err) {
      toast.error('Speichern fehlgeschlagen', {
        description: err instanceof Error ? err.message : 'Unbekannter Fehler',
      });
      setIsSaving(false);
      return;
    }

    setIsSaving(false);
    setState((prev) => ({
      ...prev,
      currentStep: prev.currentStep + 1,
    }));
  }, [state, stepTitle, stepRecipeType, saveRecipe]);

  const handleBack = useCallback(async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      if (state.currentStep === 2 && state.recipeId) {
        const saved = await (ingredientsStepRef.current?.save() ?? Promise.resolve(true));
        if (!saved) return;
        await saveRecipe(state.recipeId, { title: stepTitle, recipe_type: stepRecipeType });
      }
      if (state.currentStep === 3) {
        if (state.recipeId) {
          const body = buildMetadataPatch(metadataRef.current);
          if (body) await saveRecipe(state.recipeId, body);
        }
        const saved = await (stepsStepRef.current?.save() ?? Promise.resolve(true));
        if (!saved) return;
      }
      setState((prev) => ({ ...prev, currentStep: Math.max(0, prev.currentStep - 1) }));
    } catch (err) {
      toast.error('Speichern fehlgeschlagen', { description: err instanceof Error ? err.message : 'Unbekannter Fehler' });
    } finally {
      setIsSaving(false);
    }
  }, [isSaving, state.currentStep, state.recipeId, stepTitle, stepRecipeType, saveRecipe]);

  const handleFinish = useCallback(async () => {
    setIsSaving(true);
    const success = await previewStepRef.current?.primaryAction();
    setIsSaving(false);
    return success;
  }, []);

  const handleCreated = useCallback((
    recipeId: number,
    recipeSlug: string,
    inputServings?: number | null,
    inputItemsAreContextual = false,
  ) => {
    updateState({
      recipeId,
      recipeSlug,
      inputServings: inputServings ?? null,
      inputItemsAreContextual,
    });
  }, [updateState]);

  const handleMetadataChange = useCallback((snapshot: MetadataSnapshot) => {
    metadataRef.current = snapshot;
  }, []);

  const handleSmartResult = useCallback((result: RecipeImportUrlResponse) => {
    setSmartResult(result);
    setStepTitle(result.recipe_draft.title);
    setStepRecipeType(result.recipe_draft.recipe_type || 'warm_meal');
    updateState({
      creationMethod: 'smart',
      aiInteractionId: result.ai_interaction_id ?? null,
      inputServings: result.recipe_draft.servings ?? 1,
      inputItemsAreContextual: false,
    });
  }, [updateState]);

  const activeRecipeId = state.recipeId;
  const activeRecipeSlug = state.recipeSlug;

  const stepComponents: Record<number, ReactNode> = {
    0: (
      <WizardStepMethod
        ref={methodStepRef}
        state={state}
        updateState={updateState}
        onSmartResult={handleSmartResult}
        initialInput={linkedIngredient ? `Erstelle ein Rezept mit ${linkedIngredient.name}.` : ''}
      />
    ),
    1: (
      <WizardStepBasis
        ref={basisStepRef}
        result={smartResult}
        initialTitle={stepTitle}
        initialRecipeType={stepRecipeType}
        onTitleChange={setStepTitle}
        onRecipeTypeChange={setStepRecipeType}
        onCreated={handleCreated}
        existingRecipeId={state.recipeId}
        existingRecipeSlug={state.recipeSlug}
      />
    ),
    2: (
      <WizardStepIngredients
        ref={ingredientsStepRef}
        recipeId={state.recipeId}
        recipeSlug={state.recipeSlug ?? ''}
        creationMethod={state.creationMethod}
        onIngredientsCountChange={() => {}}
        onTitleChange={setStepTitle}
        onRecipeTypeChange={setStepRecipeType}
        title={stepTitle}
        recipeType={stepRecipeType}
        initialInputPortions={state.inputServings}
        initialItemsAreContextual={state.inputItemsAreContextual}
      />
    ),
    3: activeRecipeSlug ? (
      <div className="space-y-6">
        <WizardStepMetadata
          recipeId={activeRecipeId ?? 0}
          recipeSlug={activeRecipeSlug}
          onDataChange={handleMetadataChange}
          initialData={metadataRef.current ?? undefined}
        />
        <WizardStepSteps ref={stepsStepRef} recipeSlug={activeRecipeSlug} />
      </div>
    ) : null,
    4: activeRecipeSlug ? (
      <WizardStepPreview
        ref={previewStepRef}
        recipeSlug={activeRecipeSlug}
        onFinish={() => {
          if (activeRecipeSlug) navigate(`/recipes/${activeRecipeSlug}`);
        }}
      />
    ) : null,
  };

  const isFirst = state.currentStep === 0;
  const isLast = state.currentStep === 4;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 sm:py-8">
      <div className="mb-8">
        <StepIndicator currentStep={state.currentStep} />
      </div>

      <div className="min-h-[400px]">
        {stepComponents[state.currentStep]}
      </div>

      <div className="flex items-center justify-between mt-8 pt-6 border-t sticky bottom-0 bg-background py-4">
        <div>
          {!isFirst && (
            <button
              type="button"
              onClick={handleBack}
              disabled={isSaving}
              data-testid="recipe-wizard-back"
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium border rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
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
            className="flex items-center gap-1.5 px-5 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors ml-auto disabled:opacity-50"
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
            onClick={handleFinish}
            disabled={isSaving}
            data-testid="recipe-wizard-finish"
            className="flex items-center gap-1.5 px-5 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors ml-auto disabled:opacity-50"
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
    </div>
  );
}
