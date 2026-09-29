import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { RECIPE_TYPE_OPTIONS } from '@/schemas/recipe';
import RecipeServingContextSelector from './RecipeServingContextSelector';
import { useWizardStep } from './wizardContext';

export interface BasisDraft {
  title: string;
  recipeType: string;
  servings: number;
}

interface WizardStepBasisProps {
  /** Manual mode starts empty and needs no servings confirmation. */
  isManual: boolean;
  isReconstructed: boolean;
  initialTitle: string;
  initialRecipeType: string | null;
  initialServings: number | null;
  initialServingsConfirmed: boolean;
  onDraftChange: (draft: BasisDraft) => void;
}

export default function WizardStepBasis({
  isManual,
  isReconstructed,
  initialTitle,
  initialRecipeType,
  initialServings,
  initialServingsConfirmed,
  onDraftChange,
}: WizardStepBasisProps) {
  const [title, setTitle] = useState(initialTitle);
  const [recipeType, setRecipeType] = useState<string | null>(initialRecipeType);
  const [servings, setServings] = useState<number | null>(initialServings);
  const [servingsConfirmed, setServingsConfirmed] = useState(isManual || initialServingsConfirmed);
  const { registerLeave } = useWizardStep();

  useEffect(() => registerLeave((direction) => {
    if (direction === 'back') return true;
    if (!title.trim()) {
      toast.error('Bitte gib einen Titel ein.');
      return false;
    }
    if (!recipeType) {
      toast.error('Bitte wähle einen Rezept-Typ.');
      return false;
    }
    if (servings === null) {
      toast.error('Bitte gib die Personenzahl des Originalrezepts an.');
      return false;
    }
    if (!Number.isInteger(servings) || servings < 1 || servings > 100) {
      toast.error('Die Personenzahl muss zwischen 1 und 100 liegen.');
      return false;
    }
    if (!servingsConfirmed) {
      toast.error('Bitte bestätige zuerst die Personenzahl.');
      return false;
    }
    onDraftChange({ title: title.trim(), recipeType, servings });
    return true;
  }), [onDraftChange, recipeType, registerLeave, servings, servingsConfirmed, title]);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-section font-display font-bold">Basis & Portionen</h2>
        <p className="mt-2 text-body text-muted-foreground">
          {isManual
            ? 'Lege Titel, Rezeptart und die Personenzahl fest. Zutaten ergänzt du im nächsten Schritt.'
            : 'Prüfe Titel, Rezeptart und die Originalportionen. Inspi normiert die Mengen beim Speichern intern auf eine Portion.'}
        </p>
      </div>

      {isReconstructed && (
        <div className="rounded-lg border border-warning-border bg-warning-soft p-3 text-body text-warning">
          Die Quelle hat den automatischen Abruf blockiert — die Daten wurden über die Websuche rekonstruiert. Bitte prüfe alle Angaben sorgfältig.
        </div>
      )}

      <div className="space-y-4 rounded-xl border bg-card p-4 sm:p-5">
        <div>
          <label htmlFor="recipe-basis-title" className="mb-1.5 block text-body font-medium">Titel *</label>
          <input
            id="recipe-basis-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="z. B. Nudelauflauf mit Hackfleisch"
            data-testid="recipe-basis-title"
            className="w-full rounded-lg border bg-background px-3 py-2 text-body"
          />
        </div>
        <div>
          <span className="mb-2 block text-body font-medium">Rezept-Typ *</span>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
            {RECIPE_TYPE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setRecipeType(option.value)}
                aria-pressed={recipeType === option.value}
                className={`rounded-lg border px-2 py-1.5 text-caption font-medium ${recipeType === option.value ? 'border-primary bg-primary/10 text-primary' : 'hover:bg-muted'}`}
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
        onConfirm={isManual ? undefined : () => setServingsConfirmed(true)}
        description={isManual
          ? 'Für wie viele Personen gibst du die Mengen im nächsten Schritt ein?'
          : 'Für wie viele Personen ist das Originalrezept gedacht? Diese Angabe bestimmt, wie die Mengen im nächsten Schritt angezeigt werden.'}
        confirmLabel={servingsConfirmed ? 'Personenzahl bestätigt' : 'Personenzahl geprüft'}
      />
    </div>
  );
}
