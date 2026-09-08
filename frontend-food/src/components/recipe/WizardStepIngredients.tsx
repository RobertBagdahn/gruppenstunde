import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { useRecipeBySlug } from '@/api/recipes';
import { RECIPE_TYPE_OPTIONS } from '@/schemas/recipe';
import InlineIngredientEditor from './InlineIngredientEditor';
import type { InlineIngredientEditorHandle } from './InlineIngredientEditor';
import type { DraftCreationResult, DraftIngredientItem } from './InlineIngredientEditor';
import { normalizeServingContext } from '@/lib/cookingQuantityScale';
import { toast } from 'sonner';

interface WizardStepIngredientsProps {
  recipeId: number | null;
  recipeSlug: string;
  creationMethod: 'manual' | 'ai' | 'url' | 'smart' | null;
  onIngredientsCountChange: (count: number) => void;
  onTitleChange: (title: string) => void;
  onRecipeTypeChange: (type: string | null) => void;
  title: string;
  recipeType: string | null;
  initialInputPortions?: number | null;
  initialItemsAreContextual?: boolean;
  onCreateDraft?: (items: DraftIngredientItem[]) => Promise<DraftCreationResult | null>;
}

export interface WizardStepIngredientsHandle {
  save: () => Promise<boolean>;
}

const WizardStepIngredients = forwardRef<WizardStepIngredientsHandle, WizardStepIngredientsProps>(function WizardStepIngredients({
  recipeId,
  recipeSlug,
  creationMethod: _creationMethod,
  onIngredientsCountChange,
  onTitleChange,
  onRecipeTypeChange,
  title,
  recipeType,
  initialInputPortions,
  initialItemsAreContextual = false,
  onCreateDraft,
}: WizardStepIngredientsProps, ref) {
  const { data: recipe, isLoading } = useRecipeBySlug(recipeSlug);
  const items = recipe?.recipe_items ?? [];
  const portions = recipe?.portions ?? 1;
  const editorRef = useRef<InlineIngredientEditorHandle>(null);
  const inputPortions = normalizeServingContext(initialInputPortions ?? 1);

  useImperativeHandle(ref, () => ({
    save: () => {
      if (!editorRef.current) {
        toast.error('Die Zutaten werden noch geladen.');
        return Promise.resolve(false);
      }
      return editorRef.current.save();
    },
  }), []);

  void _creationMethod;

  useEffect(() => {
    onIngredientsCountChange(items.length);
  }, [items.length, onIngredientsCountChange]);

  // Wait for the freshly created recipe (with its imported/mapped ingredients) to
  // load before mounting InlineIngredientEditor — its internal state is only
  // initialized once on mount, so mounting with an empty `items` array (before
  // the fetch resolves) would permanently show an empty ingredient list.
  if (recipeId !== null && (isLoading || !recipe)) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        Lade Zutaten...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-display font-bold">Titel, Typ & Zutaten</h2>
        <p className="text-sm text-muted-foreground mt-2">
          Gib deinem Rezept einen Namen, wähle den Typ und füge Zutaten hinzu.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1.5">Titel *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="z.B. Nudelauflauf mit Hackfleisch"
            className="w-full px-3 py-2 border rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Rezept-Typ *</label>
          <div className="grid grid-cols-2 gap-1.5">
            {RECIPE_TYPE_OPTIONS.map((option) => {
              const isSelected = recipeType === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onRecipeTypeChange(option.value)}
                  className={`flex items-center gap-1 px-2 py-1.5 text-xs font-medium border rounded-md transition-colors ${
                    isSelected
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'hover:bg-muted'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">{option.icon}</span>
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5">Zutaten *</label>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          Gesamtmengen für <strong>{inputPortions} {inputPortions === 1 ? 'Person' : 'Personen'}</strong>.
          Beim Speichern werden sie auf eine Portion normiert.
        </div>
        <div className="bg-card rounded-xl border">
          <InlineIngredientEditor
            ref={editorRef}
            recipeId={recipeId}
            recipeSlug={recipeSlug}
            items={items}
            portions={portions}
            inputPortions={inputPortions}
            itemsAreContextual={initialItemsAreContextual}
            onClose={() => {}}
            onSaved={() => {}}
            onSave={() => {}}
            onCreateDraft={onCreateDraft}
          />
        </div>
      </div>
    </div>
  );
});

export default WizardStepIngredients;
