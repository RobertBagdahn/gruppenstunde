import MarkdownRenderer from '@/components/MarkdownRenderer';
import type { RecipeStep } from '@/schemas/recipeStep';
import StepIngredientChips from '@/components/recipe/StepIngredientChips';

/** Step numbers share one neutral petrol badge; the canvas uses no per-step colour. */
const STEP_BADGE = 'bg-primary text-primary-foreground';

interface RecipeStepsReadOnlyProps {
  steps: RecipeStep[];
  fallbackInstructions?: string[];
  scale?: number;
}

export default function RecipeStepsReadOnly({
  steps,
  fallbackInstructions = [],
  scale = 1,
}: RecipeStepsReadOnlyProps) {
  if (steps.length === 0) {
    if (fallbackInstructions.length === 0) {
      return (
        <p className="text-body text-muted-foreground">
          Keine Zubereitungsschritte vorhanden.
        </p>
      );
    }

    return (
      <ol className="space-y-4 list-none p-0" data-testid="recipe-steps-readonly">
        {fallbackInstructions.map((instruction, index) => (
          <li key={`legacy-step-${index}`} className="flex items-start gap-3">
            <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-bold text-caption ${STEP_BADGE}`}>
              {index + 1}
            </span>
            <div className="min-w-0 flex-1">
              <MarkdownRenderer content={instruction.replace(/^\d+[.)]\s+/, '')} />
            </div>
          </li>
        ))}
      </ol>
    );
  }

  let lastSection = '';
  return (
    <ol className="space-y-4 list-none p-0" data-testid="recipe-steps-readonly">
      {steps.map((step, index) => {
        const showSection = step.section !== '' && step.section !== lastSection;
        lastSection = step.section || lastSection;
        return (
          <li key={step.id} className="space-y-2">
            {showSection && (
              <h4 className="text-body font-semibold text-info pt-1">{step.section}</h4>
            )}
            <div className="flex items-start gap-3">
              <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-bold text-caption ${STEP_BADGE}`}>
                {index + 1}
              </span>
              <div className="min-w-0 flex-1 space-y-1">
                <MarkdownRenderer content={step.instruction} />
                {step.duration_minutes != null && step.duration_minutes > 0 && (
                  <p className="text-caption text-muted-foreground">
                    ⏱ ca. {step.duration_minutes} min
                  </p>
                )}
                <StepIngredientChips ingredients={step.step_ingredients} scale={scale} className="mt-2" />
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
