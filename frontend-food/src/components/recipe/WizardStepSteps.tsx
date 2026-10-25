import { useEffect, useRef } from 'react';
import { useRecipeBySlug } from '@/api/recipes';
import StepEditor, { type StepEditorHandle } from './StepEditor';
import StaleStepsNotice from './StaleStepsNotice';
import { useWizardStep } from './wizardContext';

interface WizardStepStepsProps {
  recipeSlug: string;
}

export default function WizardStepSteps({ recipeSlug }: WizardStepStepsProps) {
  const { data: recipe } = useRecipeBySlug(recipeSlug);
  const availableRecipeItems = recipe?.recipe_items ?? [];
  const editorRef = useRef<StepEditorHandle>(null);
  const { registerLeave } = useWizardStep();

  useEffect(() => registerLeave(() => editorRef.current?.save() ?? true), [registerLeave]);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-section font-display font-bold">Zubereitungsschritte</h2>
        <p className="text-body text-muted-foreground mt-2">
          Definiere die Zubereitungsschritte deines Rezepts.
        </p>
      </div>

      <StaleStepsNotice />

      <section className="rounded-xl bg-card p-4 sm:p-5 shadow-card">
        <StepEditor
          ref={editorRef}
          recipeSlug={recipeSlug}
          availableRecipeItems={availableRecipeItems}
          onSave={() => {}}
        />
      </section>
    </div>
  );
}
