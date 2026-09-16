import MarkdownRenderer from '@/components/MarkdownRenderer';
import type { RecipeStep } from '@/schemas/recipeStep';

interface RecipeStepsReadOnlyProps {
  steps: RecipeStep[];
  scale?: number;
}

function formatQuantity(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  if (Number.isInteger(rounded)) {
    return String(rounded);
  }
  return rounded.toFixed(1).replace('.', ',');
}

export default function RecipeStepsReadOnly({ steps, scale = 1 }: RecipeStepsReadOnlyProps) {
  if (steps.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Keine Zubereitungsschritte vorhanden.
      </p>
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
              <h4 className="text-sm font-semibold text-blue-700 pt-1">{step.section}</h4>
            )}
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1 space-y-1">
                <MarkdownRenderer content={step.instruction} />
                {step.duration_minutes != null && step.duration_minutes > 0 && (
                  <p className="text-xs text-muted-foreground">
                    ⏱ ca. {step.duration_minutes} min
                  </p>
                )}
                {step.step_ingredients.length > 0 && (
                  <ul className="mt-2 flex flex-wrap gap-1.5 list-none p-0">
                    {step.step_ingredients.map((ingredient) => {
                      const quantity =
                        ingredient.quantity != null ? formatQuantity(ingredient.quantity * scale) : '';
                      const unit = ingredient.unit_short ?? '';
                      return (
                        <li
                          key={ingredient.id}
                          className="rounded-full bg-muted px-2.5 py-1 text-xs"
                        >
                          {[quantity, unit].filter(Boolean).join(' ')}{' '}
                          {ingredient.ingredient_name ?? ''}
                          {ingredient.preparation ? `, ${ingredient.preparation}` : ''}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
