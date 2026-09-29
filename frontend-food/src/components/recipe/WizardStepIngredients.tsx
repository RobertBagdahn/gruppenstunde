import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useRecipeBySlug } from '@/api/recipes';
import { RECIPE_TYPE_OPTIONS } from '@/schemas/recipe';
import { normalizeServingContext } from '@/lib/cookingQuantityScale';
import InlineIngredientEditor from './InlineIngredientEditor';
import type { InlineIngredientEditorHandle } from './InlineIngredientEditor';
import { useWizardStep } from './wizardContext';
import { Icon } from '@/components/ui/icon';

interface WizardStepIngredientsProps {
  recipeId: number;
  recipeSlug: string;
  title: string;
  recipeType: string | null;
  onTitleChange: (title: string) => void;
  onRecipeTypeChange: (type: string | null) => void;
  saveRecipe: (body: Record<string, unknown>) => Promise<void>;
}

export default function WizardStepIngredients({
  recipeId,
  recipeSlug,
  title,
  recipeType,
  onTitleChange,
  onRecipeTypeChange,
  saveRecipe,
}: WizardStepIngredientsProps) {
  const { data: recipe, isLoading } = useRecipeBySlug(recipeSlug);
  const items = recipe?.recipe_items ?? [];
  const portions = recipe?.portions ?? 1;
  const editorRef = useRef<InlineIngredientEditorHandle>(null);
  // Quantities are stored per portion; show them for the original servings.
  const inputPortions = normalizeServingContext(recipe?.source_servings ?? 1);
  const { registerLeave } = useWizardStep();

  useEffect(() => registerLeave(async () => {
    if (!editorRef.current) {
      toast.error('Die Zutaten werden noch geladen.');
      return false;
    }
    if (!title.trim()) {
      toast.error('Bitte gib einen Titel ein.');
      return false;
    }
    // Save the basics first: the editor shows its own success toast, which
    // must not be followed by an error toast from this PATCH.
    const body: Record<string, unknown> = { title: title.trim() };
    if (recipeType) body.recipe_type = recipeType;
    await saveRecipe(body);
    return editorRef.current.save();
  }), [recipeType, registerLeave, saveRecipe, title]);

  // Wait for the recipe (with its imported/mapped ingredients) before mounting
  // InlineIngredientEditor — it initializes its state only once on mount.
  if (isLoading || !recipe) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        Lade Zutaten...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-section font-display font-bold">Titel, Typ & Zutaten</h2>
        <p className="text-body text-muted-foreground mt-2">
          Gib deinem Rezept einen Namen, wähle den Typ und füge Zutaten hinzu.
        </p>
        {recipe.source_servings && (
          <p className="text-caption text-muted-foreground mt-1" data-testid="recipe-source-servings">
            Originalrezept für {recipe.source_servings} {recipe.source_servings === 1 ? 'Person' : 'Personen'}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="recipe-ingredients-title" className="block text-body font-medium mb-1.5">Titel *</label>
          <input
            id="recipe-ingredients-title"
            type="text"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="z.B. Nudelauflauf mit Hackfleisch"
            className="w-full px-3 py-2 border rounded-lg text-emphasis focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div>
          <span className="block text-body font-medium mb-1.5">Rezept-Typ *</span>
          <div className="grid grid-cols-2 gap-1.5">
            {RECIPE_TYPE_OPTIONS.map((option) => {
              const isSelected = recipeType === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onRecipeTypeChange(option.value)}
                  aria-pressed={isSelected}
                  className={`flex items-center gap-1 px-2 py-1.5 text-xs font-medium border rounded-md transition-colors ${
                    isSelected
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'hover:bg-muted'
                  }`}
                >
                  <Icon name={option.icon} size={16} />
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div>
        <span className="block text-body font-medium mb-1.5">Zutaten *</span>
        <div className="bg-card rounded-xl border">
          <InlineIngredientEditor
            ref={editorRef}
            recipeId={recipeId}
            recipeSlug={recipeSlug}
            items={items}
            portions={portions}
            inputPortions={inputPortions}
            itemsAreContextual={false}
            onClose={() => {}}
            onSaved={() => {}}
            onSave={() => {}}
          />
        </div>
      </div>
    </div>
  );
}
