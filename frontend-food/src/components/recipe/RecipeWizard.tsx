import { useState, useCallback, useRef, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { useCreateRecipe } from '@/api/recipes';
import { API_BASE_URL, fetchWithCsrf } from '@/lib/api';

import WizardStepMethod, { type WizardStepMethodHandle } from './WizardStepMethod';
import WizardStepIngredients from './WizardStepIngredients';
import type { WizardStepIngredientsHandle } from './WizardStepIngredients';
import type { DraftCreationResult, DraftIngredientItem } from './InlineIngredientEditor';
import WizardStepMetadata from './WizardStepMetadata';
import WizardStepSteps from './WizardStepSteps';
import type { WizardStepStepsHandle } from './WizardStepSteps';
import WizardStepPreview, { type WizardStepPreviewHandle } from './WizardStepPreview';

type CreationMethod = 'manual' | 'ai' | 'url' | null;

interface WizardState {
  currentStep: number;
  recipeId: number | null;
  recipeSlug: string | null;
  creationMethod: CreationMethod;
  inputServings: number | null;
  inputItemsAreContextual: boolean;
}

const STEP_LABELS = ['Methode', 'Zutaten', 'Metadaten', 'Schritte', 'Vorschau'];

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

function validateStep(state: WizardState, hasTitle: boolean, hasRecipeType: boolean): string | null {
  switch (state.currentStep) {
    case 0:
      if (!state.creationMethod) return 'Bitte wähle eine Erstellungsmethode';
      return null;
    case 1:
      if (!hasTitle) return 'Bitte gib einen Titel ein';
      if (!hasRecipeType) return 'Bitte wähle einen Rezept-Typ';
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
  const createRecipe = useCreateRecipe();

  const [state, setState] = useState<WizardState>({
    currentStep: 0,
    recipeId: null,
    recipeSlug: null,
    creationMethod: null,
    inputServings: null,
        inputItemsAreContextual: false,
  });

  const [stepTitle, setStepTitle] = useState('');
  const [stepRecipeType, setStepRecipeType] = useState<string | null>(null);

  const metadataRef = useRef<MetadataSnapshot>({
    summary: '',
    description: '',
    difficulty: '',
    executionTime: '',
    preparationTime: '',
    visibility: 'private',
    selectedTagSlugs: [],
  });

  const updateState = useCallback((patch: Partial<WizardState>) => {
    setState((prev) => ({ ...prev, ...patch }));
  }, []);

  const [isSaving, setIsSaving] = useState(false);
  const methodStepRef = useRef<WizardStepMethodHandle>(null);
  const previewStepRef = useRef<WizardStepPreviewHandle>(null);
  const ingredientsStepRef = useRef<WizardStepIngredientsHandle>(null);
  const stepsStepRef = useRef<WizardStepStepsHandle>(null);
  const createdManualRecipeRef = useRef<{ recipeId: number; recipeSlug: string } | null>(null);

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
    const error = validateStep(state, stepTitle.trim().length > 0, stepRecipeType !== null);
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
        if (!(await (ingredientsStepRef.current?.save() ?? Promise.resolve(false)))) {
          setIsSaving(false);
          return;
        }
        const createdRecipe = createdManualRecipeRef.current;
        const activeRecipeId = state.recipeId ?? createdRecipe?.recipeId ?? null;
        const body: Record<string, unknown> = {};
        if (stepTitle) body.title = stepTitle;
        if (stepRecipeType) body.recipe_type = stepRecipeType;
        if (activeRecipeId) await saveRecipe(activeRecipeId, body);
      }

      if (state.currentStep === 2 && state.recipeId) {
        const meta = metadataRef.current;
        const body: Record<string, unknown> = {};
        body.summary = meta.summary;
        body.description = meta.description;
        body.difficulty = meta.difficulty;
        body.execution_time = meta.executionTime;
        body.preparation_time = meta.preparationTime;
        body.tag_ids = meta.selectedTagSlugs;
        body.visibility = meta.visibility;
        await saveRecipe(state.recipeId, body);
      }

      if (state.currentStep === 3) {
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
      ...(createdManualRecipeRef.current && prev.recipeId === null
        ? createdManualRecipeRef.current
        : {}),
      currentStep: prev.currentStep + 1,
    }));
  }, [state, stepTitle, stepRecipeType, saveRecipe, createdManualRecipeRef]);

  const handleBack = useCallback(async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      if (state.currentStep === 1 && state.recipeId) {
        const saved = await (ingredientsStepRef.current?.save() ?? Promise.resolve(true));
        if (!saved) return;
        await saveRecipe(state.recipeId, { title: stepTitle, recipe_type: stepRecipeType });
      }
      if (state.currentStep === 2 && state.recipeId) {
        const meta = metadataRef.current;
        await saveRecipe(state.recipeId, {
          summary: meta.summary,
          description: meta.description,
          difficulty: meta.difficulty,
          execution_time: meta.executionTime,
          preparation_time: meta.preparationTime,
          tag_ids: meta.selectedTagSlugs,
          visibility: meta.visibility,
        });
      }
      if (state.currentStep === 3) {
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

  const handleCreateManualDraft = useCallback(async (items: DraftIngredientItem[]): Promise<DraftCreationResult | null> => {
    try {
      const recipe = await createRecipe.mutateAsync({
        title: stepTitle.trim(),
        recipe_type: stepRecipeType ?? 'warm_meal',
        portions: 1,
        recipe_items: items,
      });
      updateState({ recipeId: recipe.id, recipeSlug: recipe.slug });
      createdManualRecipeRef.current = { recipeId: recipe.id, recipeSlug: recipe.slug };
      return { recipeId: recipe.id, recipeSlug: recipe.slug, items: recipe.recipe_items };
    } catch (err) {
      toast.error('Rezept konnte nicht angelegt werden', {
        description: err instanceof Error ? err.message : 'Unbekannter Fehler',
      });
      return null;
    }
  }, [createRecipe, stepRecipeType, stepTitle, updateState]);

  const handleMetadataChange = useCallback((snapshot: MetadataSnapshot) => {
    metadataRef.current = snapshot;
  }, []);

  const activeRecipeId = state.recipeId ?? createdManualRecipeRef.current?.recipeId ?? null;
  const activeRecipeSlug = state.recipeSlug ?? createdManualRecipeRef.current?.recipeSlug ?? null;

  const stepComponents: Record<number, ReactNode> = {
    0: (
      <WizardStepMethod
        ref={methodStepRef}
        state={state}
        updateState={updateState}
        onCreated={handleCreated}
        onIngredientsCountChange={() => {}}
        onTitleChange={setStepTitle}
        onRecipeTypeChange={setStepRecipeType}
      />
    ),
    1: (
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
        onCreateDraft={state.creationMethod === 'manual' ? handleCreateManualDraft : undefined}
      />
    ),
    2: activeRecipeId && activeRecipeSlug ? (
      <WizardStepMetadata
        recipeId={activeRecipeId}
        recipeSlug={activeRecipeSlug}
        onDataChange={handleMetadataChange}
        initialData={metadataRef.current}
      />
    ) : null,
    3: activeRecipeSlug ? (
      <WizardStepSteps
        ref={stepsStepRef}
        recipeSlug={activeRecipeSlug}
      />
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
            {isSaving ? 'Speichert...' : (
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
