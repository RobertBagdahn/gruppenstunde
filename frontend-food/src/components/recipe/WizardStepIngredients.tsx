import { useEffect, useRef } from 'react';
import { notify } from '@/lib/notify';
import { useRecipeBySlug } from '@/api/recipes';
import { normalizeServingContext } from '@/lib/cookingQuantityScale';
import InlineIngredientEditor from './InlineIngredientEditor';
import type { InlineIngredientEditorHandle } from './InlineIngredientEditor';
import { useWizardStep } from './wizardContext';
import { SkeletonTableRows } from '@/components/ui/skeleton';

interface WizardStepIngredientsProps {
  recipeId: number;
  recipeSlug: string;
}

export default function WizardStepIngredients({
  recipeId,
  recipeSlug,
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
      notify.error('Die Zutaten werden noch geladen');
      return false;
    }
    return editorRef.current.save();
  }), [registerLeave]);

  // Wait for the recipe (with its imported/mapped ingredients) before mounting
  // InlineIngredientEditor — it initializes its state only once on mount.
  if (isLoading || !recipe) {
    return (
      <SkeletonTableRows rows={5} columns={2} label="Zutaten werden geladen" className="py-4" />
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-section font-display font-bold">Zutaten</h2>
        <p className="text-body text-muted-foreground mt-2">
          Titel, Rezeptart und Originalportionen hast du im Schritt „Basis &amp; Portionen“ festgelegt. Ergänze jetzt die Zutaten.
        </p>
        {recipe.source_servings && (
          <p className="text-caption text-muted-foreground mt-1" data-testid="recipe-source-servings">
            Originalrezept für {recipe.source_servings} {recipe.source_servings === 1 ? 'Person' : 'Personen'}
          </p>
        )}
      </div>

      <div>
        <span className="block text-body font-medium mb-1.5">Zutaten *</span>
        <div className="bg-card rounded-xl shadow-card">
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
