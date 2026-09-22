import { useCallback, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { toast } from 'sonner';
import type { IngredientReviewPreview } from '@/schemas/ingredientReview';
import { RECIPE_TYPE_OPTIONS } from '@/schemas/recipe';
import RecipeServingContextSelector from './RecipeServingContextSelector';

interface WizardStepBasisProps {
  result: IngredientReviewPreview | null;
  initialTitle: string;
  initialRecipeType: string | null;
  onTitleChange: (title: string) => void;
  onRecipeTypeChange: (type: string | null) => void;
  onDraftChange: (draft: { title: string; recipeType: string; servings: number }) => void;
}

export interface WizardStepBasisHandle {
  save: () => Promise<boolean>;
}

const WizardStepBasis = forwardRef<WizardStepBasisHandle, WizardStepBasisProps>(function WizardStepBasis({
  result,
  initialTitle,
  initialRecipeType,
  onTitleChange,
  onRecipeTypeChange,
  onDraftChange,
}, ref) {
  const [title, setTitle] = useState(initialTitle || result?.recipe_draft.title || '');
  const [recipeType, setRecipeType] = useState(initialRecipeType || result?.recipe_draft.recipe_type || 'warm_meal');
  const [servings, setServings] = useState(result?.recipe_draft.servings ?? 1);
  const [servingsConfirmed, setServingsConfirmed] = useState(false);

  useEffect(() => {
    if (!result) return;
    setTitle((current) => current || result.recipe_draft.title);
    setRecipeType((current) => current || result.recipe_draft.recipe_type || 'warm_meal');
    setServings(result.recipe_draft.servings ?? 1);
    setServingsConfirmed(false);
    onTitleChange(result.recipe_draft.title);
    onRecipeTypeChange(result.recipe_draft.recipe_type || 'warm_meal');
  }, [onRecipeTypeChange, onTitleChange, result]);

  const updateTitle = (value: string) => {
    setTitle(value);
    onTitleChange(value);
  };

  const updateRecipeType = (value: string) => {
    setRecipeType(value);
    onRecipeTypeChange(value);
  };

  const save = useCallback(async (): Promise<boolean> => {
    if (!result) {
      toast.error('Die KI-Analyse ist noch nicht abgeschlossen.');
      return false;
    }
    if (!title.trim()) {
      toast.error('Bitte gib einen Titel ein.');
      return false;
    }
    if (!recipeType) {
      toast.error('Bitte wähle einen Rezept-Typ.');
      return false;
    }
    if (!servingsConfirmed) {
      toast.error('Bitte bestätige zuerst die Personenzahl.');
      return false;
    }
    if (!Number.isInteger(servings) || servings < 1 || servings > 100) {
      toast.error('Die Personenzahl muss zwischen 1 und 100 liegen.');
      return false;
    }

    onDraftChange({ title: title.trim(), recipeType, servings });
    return true;
  }, [onDraftChange, result, servings, servingsConfirmed, title, recipeType]);

  useImperativeHandle(ref, () => ({ save }), [save]);

  if (!result) {
    return <div className="py-12 text-center text-muted-foreground">Warte auf die KI-Analyse…</div>;
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-display font-bold">Basis & Portionen</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Prüfe Titel, Rezeptart und die Originalportionen. Inspi normiert die Mengen beim Speichern intern auf eine Portion.
        </p>
      </div>

      {result.is_reconstructed && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300">
          Die Quelle hat den automatischen Abruf blockiert — die Daten wurden über die Websuche rekonstruiert. Bitte prüfe alle Angaben sorgfältig.
        </div>
      )}

      <div className="space-y-4 rounded-xl border bg-card p-4 sm:p-5">
        <div>
          <label htmlFor="recipe-basis-title" className="mb-1.5 block text-sm font-medium">Titel *</label>
          <input
            id="recipe-basis-title"
            value={title}
            onChange={(event) => updateTitle(event.target.value)}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
          />
        </div>
        <div>
          <span className="mb-2 block text-sm font-medium">Rezept-Typ *</span>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
            {RECIPE_TYPE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => updateRecipeType(option.value)}
                className={`rounded-md border px-2 py-1.5 text-xs font-medium ${recipeType === option.value ? 'border-primary bg-primary/10 text-primary' : 'hover:bg-muted'}`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <RecipeServingContextSelector
        value={servings}
        onChange={setServings}
        onConfirm={() => setServingsConfirmed(true)}
        description="Für wie viele Personen ist das Originalrezept gedacht? Diese Angabe bestimmt, wie die Mengen im nächsten Schritt angezeigt werden."
        confirmLabel="Personenzahl geprüft"
      />

    </div>
  );
});

export default WizardStepBasis;
