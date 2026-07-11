import { useRecipeBySlug } from '@/api/recipes';
import StepEditor from './StepEditor';

interface WizardStepStepsProps {
  recipeSlug: string;
}

export default function WizardStepSteps({ recipeSlug }: WizardStepStepsProps) {
  const { data: recipe } = useRecipeBySlug(recipeSlug);
  const availableRecipeItems = recipe?.recipe_items ?? [];

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-display font-bold">Schritte</h2>
        <p className="text-sm text-muted-foreground mt-2">
          Definiere die Zubereitungsschritte deines Rezepts.
        </p>
      </div>

      <StepEditor
        recipeSlug={recipeSlug}
        availableRecipeItems={availableRecipeItems}
        onSave={() => {}}
      />
    </div>
  );
}
