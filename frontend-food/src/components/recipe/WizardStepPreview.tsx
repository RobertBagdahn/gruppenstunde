import { useEffect } from 'react';
import { useRecipeBySlug, useUpdateRecipe } from '@/api/recipes';
import { useRecipeSteps } from '@/hooks/useRecipeSteps';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import RecipeIngredientsTable from '@/components/recipe/RecipeIngredientsTable';
import { Badge } from '@/components/ui/badge';
import { getRecipeExecutionTimeLabel, RECIPE_DIFFICULTY_OPTIONS, RECIPE_TYPE_OPTIONS } from '@/schemas/recipe';
import { useWizardStep } from './wizardContext';

interface WizardStepPreviewProps {
  recipeSlug: string;
}

export default function WizardStepPreview({ recipeSlug }: WizardStepPreviewProps) {
  const { data: recipe } = useRecipeBySlug(recipeSlug);
  const { data: steps } = useRecipeSteps(recipeSlug);
  const { mutateAsync: updateRecipe } = useUpdateRecipe(recipe?.id ?? 0);
  const { registerLeave } = useWizardStep();
  const isPublic = recipe?.visibility === 'public';

  // Finishing submits public recipes for review; the wizard shows the toasts.
  useEffect(() => registerLeave(async (direction) => {
    if (direction === 'next' && isPublic) {
      await updateRecipe({ status: 'submitted' });
    }
    return true;
  }), [isPublic, registerLeave, updateRecipe]);

  if (!recipe) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        Lade Rezept...
      </div>
    );
  }

  const recipeTypeLabel = RECIPE_TYPE_OPTIONS.find((o) => o.value === recipe.recipe_type)?.label || recipe.recipe_type;
  const difficultyLabel = RECIPE_DIFFICULTY_OPTIONS.find((o) => o.value === recipe.difficulty)?.label;
  const executionLabel = getRecipeExecutionTimeLabel(recipe.execution_time);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-display font-bold">Vorschau & Speichern</h2>
        <p className="text-sm text-muted-foreground mt-2">
          Überprüfe dein Rezept und schließe die Erstellung ab.
        </p>
      </div>

      <div className="bg-card rounded-xl border p-6 space-y-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-2xl font-display font-bold">{recipe.title}</h3>
            {recipeTypeLabel && (
              <Badge variant="secondary">{recipeTypeLabel}</Badge>
            )}
          </div>

          <div className="flex flex-wrap gap-2 mb-3">
            {difficultyLabel && <Badge variant="outline">{difficultyLabel}</Badge>}
            {executionLabel && <Badge variant="outline">{executionLabel}</Badge>}
            {recipe.source_servings && (
              <Badge variant="outline">Originalrezept für {recipe.source_servings} Pers.</Badge>
            )}
          </div>

          {recipe.tags && recipe.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {recipe.tags.map((tag: { id: string; name: string; slug: string }) => (
                <Badge key={tag.id} variant="secondary" className="text-xs">{tag.name}</Badge>
              ))}
            </div>
          )}
        </div>

        {recipe.summary && (
          <p className="text-muted-foreground">{recipe.summary}</p>
        )}

        {recipe.description && (
          <div>
            <h4 className="text-sm font-semibold mb-2">Beschreibung</h4>
            <div className="prose prose-sm max-w-none text-sm text-muted-foreground leading-relaxed">
              <MarkdownRenderer content={recipe.description} />
            </div>
          </div>
        )}

        {recipe.recipe_items && recipe.recipe_items.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-3">
              Zutaten ({recipe.recipe_items.length})
            </h4>
            <RecipeIngredientsTable
              items={recipe.recipe_items}
              portions={recipe.portions}
            />
          </div>
        )}

        {steps && steps.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-2">
              Schritte ({steps.length})
            </h4>
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
              {steps.map((step: { id: number; instruction: string; sort_order: number }) => (
                <li key={step.id}>{step.instruction}</li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}
