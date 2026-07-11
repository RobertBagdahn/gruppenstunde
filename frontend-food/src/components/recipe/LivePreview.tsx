/**
 * Live Preview Component for Step Instructions
 *
 * Shows real-time preview of instruction text with resolved placeholders.
 * Used in StepInstructionEditor for immediate feedback.
 */

import { useMemo } from 'react';
import { Eye } from 'lucide-react';
import type { RecipeStep } from '@/schemas/recipeStep';
import { resolveStepPlaceholders, type RecipeItemMap } from '@/services/stepHelpers';

interface LivePreviewProps {
  /**
   * Current instruction text (may contain unresolved placeholders)
   */
  instruction: string;

  /**
   * Step ingredients for placeholder context
   */
  stepIngredients?: RecipeStep['step_ingredients'];

  /**
   * Map of recipe items for resolution
   */
  recipeItemMap?: RecipeItemMap;

  /**
   * Optional title/label for the preview
   */
  title?: string;

  /**
   * CSS class name for custom styling
   */
  className?: string;
}

export default function LivePreview({
  instruction,
  stepIngredients = [],
  recipeItemMap = {},
  title = 'Preview',
  className = '',
}: LivePreviewProps) {
  // Resolve placeholders in real-time
  const resolvedText = useMemo(() => {
    if (!instruction) return '<Noch nicht ausgefüllt>';

    const step = {
      id: 0,
      instruction,
      step_ingredients: stepIngredients,
    } as RecipeStep;

    return resolveStepPlaceholders(step, recipeItemMap);
  }, [instruction, stepIngredients, recipeItemMap]);

  // Detect if there are unresolved placeholders
  const hasUnresolvedPlaceholders = /\{[\w_]+\}/.test(resolvedText);

  return (
    <div
      className={`rounded-lg border border-border bg-muted/50 p-3 ${className}`}
    >
      <div className="flex items-center gap-2 mb-2">
        <Eye size={16} className="text-muted-foreground" />
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          {title}
        </h4>
        {hasUnresolvedPlaceholders && (
          <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full ml-auto">
            Unaufgelöste Platzhalter
          </span>
        )}
      </div>

      <div className="text-sm leading-relaxed text-foreground whitespace-pre-wrap break-words">
        {resolvedText}
      </div>

      {!instruction && (
        <p className="text-xs text-muted-foreground italic">
          Gib eine Anweisung ein, um eine Vorschau zu sehen
        </p>
      )}
    </div>
  );
}
