import { forwardRef, useImperativeHandle, useRef } from 'react';
import { useRecipeBySlug } from '@/api/recipes';
import StepEditor, { type StepEditorHandle } from './StepEditor';

interface WizardStepStepsProps {
  recipeSlug: string;
}

export interface WizardStepStepsHandle {
  save: () => Promise<boolean>;
}

const WizardStepSteps = forwardRef<WizardStepStepsHandle, WizardStepStepsProps>(function WizardStepSteps(
  { recipeSlug },
  ref,
) {
  const { data: recipe } = useRecipeBySlug(recipeSlug);
  const availableRecipeItems = recipe?.recipe_items ?? [];
  const editorRef = useRef<StepEditorHandle>(null);

  useImperativeHandle(ref, () => ({
    save: () => editorRef.current?.save() ?? Promise.resolve(true),
  }), []);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-display font-bold">Zubereitungsschritte</h2>
        <p className="text-sm text-muted-foreground mt-2">
          Definiere die Zubereitungsschritte deines Rezepts.
        </p>
      </div>

      <StepEditor
        ref={editorRef}
        recipeSlug={recipeSlug}
        availableRecipeItems={availableRecipeItems}
        onSave={() => {}}
      />
    </div>
  );
});

export default WizardStepSteps;
