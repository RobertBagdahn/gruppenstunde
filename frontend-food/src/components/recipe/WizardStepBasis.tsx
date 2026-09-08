import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { toast } from 'sonner';
import { useCreateRecipe } from '@/api/recipes';
import type { RecipeImportUrlResponse } from '@/api/recipeImport';
import { RECIPE_TYPE_OPTIONS } from '@/schemas/recipe';
import RecipeServingContextSelector from './RecipeServingContextSelector';
import { toBasePerServing } from '@/lib/cookingQuantityScale';

interface WizardStepBasisProps {
  result: RecipeImportUrlResponse | null;
  initialTitle: string;
  initialRecipeType: string | null;
  onTitleChange: (title: string) => void;
  onRecipeTypeChange: (type: string | null) => void;
  onCreated: (recipeId: number, recipeSlug: string, inputServings: number) => void;
  existingRecipeId: number | null;
  existingRecipeSlug: string | null;
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
  onCreated,
  existingRecipeId,
  existingRecipeSlug,
}, ref) {
  const createRecipe = useCreateRecipe();
  const [title, setTitle] = useState(initialTitle || result?.recipe_draft.title || '');
  const [recipeType, setRecipeType] = useState(initialRecipeType || result?.recipe_draft.recipe_type || 'warm_meal');
  const [servings, setServings] = useState(result?.recipe_draft.servings ?? 1);
  const [selectedPortions, setSelectedPortions] = useState<Record<number, number>>({});
  const createdRef = useRef<{ id: number; slug: string } | null>(
    existingRecipeId && existingRecipeSlug ? { id: existingRecipeId, slug: existingRecipeSlug } : null,
  );
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

  const save = async (): Promise<boolean> => {
    if (!result) {
      toast.error('Die KI-Analyse ist noch nicht abgeschlossen.');
      return false;
    }
    if (createdRef.current) {
      onCreated(createdRef.current.id, createdRef.current.slug, servings);
      return true;
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

    const unresolved = result.recipe_items
      .map((item, index) => ({ item, index }))
      .filter(({ item, index }) => item.needs_unit_clarification && !selectedPortions[index]);
    if (unresolved.length > 0) {
      toast.error('Bitte wähle für alle markierten Zutaten eine Einheit.');
      return false;
    }

    try {
      const recipe = await createRecipe.mutateAsync({
        title: title.trim(),
        description: result.recipe_draft.description,
        summary: result.recipe_draft.summary,
        recipe_type: recipeType,
        portions: 1,
        difficulty: result.recipe_draft.difficulty || 'easy',
        execution_time: result.recipe_draft.execution_time_choice || 'less_30',
        preparation_time: result.recipe_draft.preparation_time_choice || 'none',
        source_url: result.recipe_draft.source_url,
        image_url: result.recipe_draft.image_url,
        scout_level_ids: result.recipe_draft.scout_level_ids,
        tag_ids: result.recipe_draft.tag_ids,
        recipe_items: result.recipe_items.map((item, index) => ({
          portion_id: item.needs_unit_clarification
            ? selectedPortions[index]
            : item.portion_id,
          quantity: toBasePerServing(item.quantity, servings),
          sort_order: index,
          note: item.note,
          is_optional: false,
        })),
        steps: result.recipe_draft.steps.map((instruction, index) => ({
          sort_order: index,
          instruction,
          duration_minutes: null,
          section: '',
          step_ingredients: [],
        })),
      });
      createdRef.current = { id: recipe.id, slug: recipe.slug };
      onCreated(recipe.id, recipe.slug, servings);
      toast.success('Rezeptdaten übernommen.');
      return true;
    } catch (error) {
      toast.error('Rezept konnte nicht angelegt werden', {
        description: error instanceof Error ? error.message : 'Unbekannter Fehler',
      });
      return false;
    }
  };

  useImperativeHandle(ref, () => ({ save }), [createRecipe, onCreated, result, selectedPortions, servings, servingsConfirmed, title, recipeType]);

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
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950" role="status">
          Die Seite war nicht direkt abrufbar. Die KI hat die Angaben über die Websuche rekonstruiert. Bitte prüfe sie sorgfältig.
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

      {result.recipe_items.some((item) => item.needs_unit_clarification) && (
        <div className="space-y-3 rounded-xl border border-amber-300 bg-amber-50 p-4">
          <div>
            <h3 className="text-sm font-semibold text-amber-950">Einheiten prüfen</h3>
            <p className="mt-1 text-sm text-amber-900">
              Für diese Zutaten wurde keine sichere Einheit erkannt. Ohne Auswahl würde die Menge fälschlich als Gramm gespeichert.
            </p>
          </div>
          {result.recipe_items.map((item, index) => item.needs_unit_clarification && (
            <label key={`${item.ingredient_id}-${index}`} className="flex flex-col gap-1 text-sm text-amber-950 sm:flex-row sm:items-center sm:justify-between">
              <span>{item.quantity} {item.ingredient_name}</span>
              <select
                value={selectedPortions[index] ?? ''}
                onChange={(event) => setSelectedPortions((current) => ({ ...current, [index]: Number(event.target.value) }))}
                className="rounded-md border border-amber-300 bg-white px-2 py-1.5"
                data-testid={`recipe-unit-review-${index}`}
              >
                <option value="">Einheit auswählen</option>
                {item.available_portions.map((portion) => (
                  <option key={portion.id} value={portion.id}>{portion.name}</option>
                ))}
              </select>
            </label>
          ))}
        </div>
      )}
    </div>
  );
});

export default WizardStepBasis;
