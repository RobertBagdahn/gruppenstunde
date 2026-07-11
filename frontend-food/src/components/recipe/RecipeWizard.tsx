import { useState, useCallback, useRef, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { useCreateRecipe } from '@/api/recipes';

import WizardStepMethod from './WizardStepMethod';
import WizardStepIngredients from './WizardStepIngredients';
import WizardStepMetadata from './WizardStepMetadata';
import WizardStepSteps from './WizardStepSteps';
import WizardStepPreview from './WizardStepPreview';

type CreationMethod = 'manual' | 'ai' | 'url' | null;

interface WizardState {
  currentStep: number;
  recipeId: number | null;
  recipeSlug: string | null;
  creationMethod: CreationMethod;
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
      if (state.creationMethod === 'ai' && !state.recipeId) return 'Bitte generiere zuerst ein Rezept';
      if (state.creationMethod === 'url' && !state.recipeId) return 'Bitte importiere zuerst ein Rezept';
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

export default function RecipeWizard() {
  const navigate = useNavigate();
  const createRecipe = useCreateRecipe();

  const [state, setState] = useState<WizardState>({
    currentStep: 0,
    recipeId: null,
    recipeSlug: null,
    creationMethod: null,
  });

  const [stepTitle, setStepTitle] = useState('');
  const [stepRecipeType, setStepRecipeType] = useState<string | null>(null);

  const metadataRef = useRef<MetadataSnapshot>({
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

  const saveRecipe = useCallback(async (recipeId: number, body: Record<string, unknown>) => {
    const url = `/api/recipes/${recipeId}/`;
    const res = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() },
      credentials: 'include',
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error('Speichern fehlgeschlagen');
  }, []);

  const handleNext = useCallback(async () => {
    const error = validateStep(state, stepTitle.trim().length > 0, stepRecipeType !== null);
    if (error) {
      toast.error(error);
      return;
    }

    setIsSaving(true);

    try {
      if (state.currentStep === 0 && state.creationMethod === 'manual' && !state.recipeId) {
        const recipe = await createRecipe.mutateAsync({
          title: stepTitle || 'Neues Rezept',
          recipe_type: stepRecipeType || 'warm_meal',
          portions: 1,
        });
        updateState({ recipeId: recipe.id, recipeSlug: recipe.slug });
      }

      if (state.currentStep === 1 && state.recipeId) {
        const body: Record<string, unknown> = {};
        if (stepTitle) body.title = stepTitle;
        if (stepRecipeType) body.recipe_type = stepRecipeType;
        if (Object.keys(body).length > 0) {
          await saveRecipe(state.recipeId, body);
        }
      }

      if (state.currentStep === 2 && state.recipeId) {
        const meta = metadataRef.current;
        const body: Record<string, unknown> = {};
        if (meta.description) body.description = meta.description;
        if (meta.difficulty) body.difficulty = meta.difficulty;
        if (meta.executionTime) body.execution_time = meta.executionTime;
        if (meta.preparationTime) body.preparation_time = meta.preparationTime;
        if (meta.visibility) body.visibility = meta.visibility;
        if (meta.selectedTagSlugs.length > 0) {
          body.tag_ids = meta.selectedTagSlugs;
        }
        if (Object.keys(body).length > 0) {
          await saveRecipe(state.recipeId, body);
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
    setState((prev) => ({ ...prev, currentStep: prev.currentStep + 1 }));
  }, [state, stepTitle, stepRecipeType, createRecipe, updateState, saveRecipe]);

  const handleBack = useCallback(() => {
    setState((prev) => ({ ...prev, currentStep: Math.max(0, prev.currentStep - 1) }));
  }, []);

  const handleCreated = useCallback((recipeId: number, recipeSlug: string) => {
    updateState({ recipeId, recipeSlug });
  }, [updateState]);

  const handleMetadataChange = useCallback((snapshot: MetadataSnapshot) => {
    metadataRef.current = snapshot;
  }, []);

  const stepComponents: Record<number, ReactNode> = {
    0: (
      <WizardStepMethod
        state={state}
        updateState={updateState}
        onCreated={handleCreated}
        onIngredientsCountChange={() => {}}
        onTitleChange={setStepTitle}
        onRecipeTypeChange={setStepRecipeType}
      />
    ),
    1: state.recipeId && state.recipeSlug ? (
      <WizardStepIngredients
        recipeId={state.recipeId}
        recipeSlug={state.recipeSlug}
        creationMethod={state.creationMethod}
        onIngredientsCountChange={() => {}}
        onTitleChange={setStepTitle}
        onRecipeTypeChange={setStepRecipeType}
        title={stepTitle}
        recipeType={stepRecipeType}
      />
    ) : (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        Erstelle dein Rezept...
      </div>
    ),
    2: state.recipeId && state.recipeSlug ? (
      <WizardStepMetadata
        recipeId={state.recipeId}
        recipeSlug={state.recipeSlug}
        onDataChange={handleMetadataChange}
        initialData={metadataRef.current}
      />
    ) : null,
    3: state.recipeSlug ? (
      <WizardStepSteps
        recipeSlug={state.recipeSlug}
      />
    ) : null,
    4: state.recipeSlug ? (
      <WizardStepPreview
        recipeSlug={state.recipeSlug}
        onFinish={() => {
          if (state.recipeSlug) navigate(`/recipes/${state.recipeSlug}`);
        }}
        onGoToStep={(step) => updateState({ currentStep: step })}
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
      </div>
    </div>
  );
}
