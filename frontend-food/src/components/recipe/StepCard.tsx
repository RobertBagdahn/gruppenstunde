/**
 * StepCard Component
 *
 * Displays a single recipe step with collapsible ingredient list,
 * instruction editor, and action buttons. Sortable via @dnd-kit.
 */

import { useState } from 'react';
import { ChevronDown, ChevronUp, Trash2, GripVertical, Wand2 } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { RecipeStep } from '@/schemas/recipeStep';
import StepInstructionEditor from './StepInstructionEditor';
import StepZutatenPanel from './StepZutatenPanel';
import ToneSelector from './ToneSelector';

interface StepCardProps {
  step: RecipeStep;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<RecipeStep>) => void;
  onDelete: () => void;
  /**
   * Available recipe items for ingredient assignment
   */
  availableRecipeItems?: Array<{
    id: number;
    name?: string;
    portion?: {
      ingredient?: { name?: string };
      measuring_unit?: { name?: string };
    };
  }>;
  /**
   * Slug of the recipe (for KI features)
   */
  recipeSlug?: string;
}

export default function StepCard({
  step,
  index,
  isSelected,
  onSelect,
  onUpdate,
  onDelete,
  availableRecipeItems = [],
  recipeSlug = '',
}: StepCardProps) {
  const [isExpanded, setIsExpanded] = useState(isSelected);
  const [showToneSelector, setShowToneSelector] = useState(false);

  // DnD setup
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: step.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-lg border-2 transition-all ${
        isSelected ? 'border-primary bg-primary/5' : 'border-border bg-card'
      } cursor-pointer hover:border-primary/40 ${isDragging ? 'shadow-lg' : 'shadow-sm'}`}
      onMouseEnter={() => onSelect()}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 p-4 hover:bg-muted/50"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Drag Handle */}
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded touch-none"
          title="Ziehen zum Verschieben"
        >
          <GripVertical size={18} className="text-muted-foreground" />
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-semibold text-foreground">Schritt {index + 1}</span>
            {step.section && (
              <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded">
                {step.section}
              </span>
            )}
            {step.duration_minutes && (
              <span className="text-xs text-muted-foreground">
                {step.duration_minutes} min
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
            {step.instruction || '<Anweisung eingeben>'}
          </p>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
          className="p-1 hover:bg-muted rounded"
        >
          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowToneSelector(true);
          }}
          className="p-1 text-primary hover:bg-primary/10 rounded"
          title="Anweisung mit KI umschreiben"
        >
          <Wand2 size={18} />
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="p-1 text-destructive hover:bg-destructive/10 rounded"
          title="Schritt löschen"
        >
          <Trash2 size={18} />
        </button>
      </div>

      {/* Tone Selector Modal */}
      {showToneSelector && recipeSlug && (
        <ToneSelector
          instruction={step.instruction}
          recipeSlug={recipeSlug}
          stepId={step.id}
          onApply={(improvedInstruction) => {
            onUpdate({ instruction: improvedInstruction });
            setShowToneSelector(false);
          }}
          onClose={() => setShowToneSelector(false)}
        />
      )}

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-border p-4 space-y-4">
          <StepInstructionEditor
            instruction={step.instruction}
            durationMinutes={step.duration_minutes}
            section={step.section}
            stepIngredientCount={step.step_ingredients.length}
            onUpdate={onUpdate}
          />

          <StepZutatenPanel
            stepIngredients={step.step_ingredients}
            onUpdate={(ingredients) => onUpdate({ step_ingredients: ingredients })}
            availableRecipeItems={availableRecipeItems}
            stepInstruction={step.instruction}
            recipeSlug={recipeSlug}
          />
        </div>
      )}
    </div>
  );
}
