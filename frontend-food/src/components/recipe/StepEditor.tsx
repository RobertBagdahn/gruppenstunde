/**
 * Main Step Editor Component
 *
 * Container for editing recipe steps with drag-and-drop, undo/redo,
 * and inline editing of instructions and ingredients.
 */

import { useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { toast } from 'sonner';
import { useRecipeStepStore } from '@/store/useRecipeStepStore';
import { useRecipeSteps, useBatchUpdateSteps, useGenerateStepsFromItems } from '@/hooks/useRecipeSteps';
import type { RecipeStep } from '@/schemas/recipeStep';
import StepCard from './StepCard';
import StepActionsBar from './StepActionsBar';
import { Button } from '@/components/ui/button';

interface StepEditorProps {
  recipeSlug: string;
  onSave?: () => void;
  onError?: (error: string) => void;
  /**
   * Available recipe items for ingredient assignment in steps
   */
  availableRecipeItems?: Array<{
    id: number;
    name?: string;
    ingredient_name?: string;
    portion?: {
      ingredient?: { name?: string };
      measuring_unit?: { name?: string };
    };
  }>;
}

export default function StepEditor({
  recipeSlug,
  onSave,
  onError,
  availableRecipeItems = [],
}: StepEditorProps) {
  const { data: steps, isLoading, error: fetchError } = useRecipeSteps(recipeSlug);
  const { mutate: batchUpdate, isPending: isSaving } = useBatchUpdateSteps();
  const { mutate: generateSteps, isPending: isGenerating } = useGenerateStepsFromItems();

  const {
    steps: storeSteps,
    selectedStepId,
    hasChanges,
    canUndo,
    canRedo,
    isLoading: storeLoading,
    error: storeError,
    setSteps,
    addStep,
    deleteStep,
    updateStep,
    selectStep,
    undo,
    redo,
    setChanges,
    setError,
  } = useRecipeStepStore();

  // DnD setup
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Load initial steps from API
  useEffect(() => {
    if (steps && !storeLoading) {
      setSteps(steps);
    }
  }, [steps, storeLoading, setSteps]);

  // Show errors
  useEffect(() => {
    if (fetchError) {
      const message = fetchError instanceof Error ? fetchError.message : 'Failed to load steps';
      setError(message);
      onError?.(message);
    }
  }, [fetchError, setError, onError]);

  useEffect(() => {
    if (storeError) {
      onError?.(storeError);
    }
  }, [storeError, onError]);

  // Handle save
  const handleSave = async () => {
    if (!hasChanges) return;

    try {
      batchUpdate(
        {
          recipe_slug: recipeSlug,
          steps: storeSteps.map((step) => ({
            sort_order: step.sort_order,
            instruction: step.instruction,
            duration_minutes: step.duration_minutes ?? null,
            section: step.section ?? '',
            step_ingredients: step.step_ingredients.map((ing) => ({
              recipe_item_id: ing.recipe_item_id,
              quantity_modifier: ing.quantity_modifier,
              preparation: ing.preparation,
              sort_order: ing.sort_order,
            })),
          })),
        },
        {
          onSuccess: () => {
            setChanges(false);
            onSave?.();
          },
          onError: (error) => {
            const message = error instanceof Error ? error.message : 'Failed to save steps';
            setError(message);
            onError?.(message);
          },
        }
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      onError?.(message);
    }
  };

  const handleAddStep = () => {
    addStep({
      sort_order: storeSteps.length,
      instruction: '',
      duration_minutes: null,
      section: '',
      step_ingredients: [],
    });
  };

  const handleDeleteStep = (stepId: number) => {
    deleteStep(stepId);
  };

  const handleUpdateStep = (stepId: number, updates: Partial<RecipeStep>) => {
    updateStep(stepId, updates);
  };

  const handleGenerateSteps = () => {
    generateSteps(
      { recipe_slug: recipeSlug },
      {
        onSuccess: (generatedSteps) => {
          setSteps(generatedSteps || []);
          toast.success('Schritte wurden von KI generiert!');
        },
        onError: (error) => {
          const message = error instanceof Error ? error.message : 'Fehler beim Generieren';
          setError(message);
          toast.error('KI-Generierung fehlgeschlagen', { description: message });
        },
      }
    );
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = storeSteps.findIndex((s) => s.id === active.id);
      const newIndex = storeSteps.findIndex((s) => s.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newSteps = arrayMove(storeSteps, oldIndex, newIndex);
        // Update sort_order
        const sortedSteps = newSteps.map((step, index) => ({
          ...step,
          sort_order: index,
        }));
        setSteps(sortedSteps);
      }
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-8">Laden...</div>;
  }

  return (
    <div className="space-y-4">
      <StepActionsBar
        hasChanges={hasChanges}
        canUndo={canUndo}
        canRedo={canRedo}
        isSaving={isSaving}
        onSave={handleSave}
        onUndo={undo}
        onRedo={redo}
        onAddStep={handleAddStep}
        onGenerateSteps={handleGenerateSteps}
        isGenerating={isGenerating}
      />

      {storeError && <div className="rounded-lg bg-destructive/10 p-4 text-destructive text-sm">{storeError}</div>}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={storeSteps.map((s) => s.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-3">
            {storeSteps.map((step, index) => (
              <StepCard
                key={step.id}
                step={step}
                index={index}
                isSelected={selectedStepId === step.id}
                onSelect={() => selectStep(step.id)}
                onUpdate={(updates) => handleUpdateStep(step.id, updates)}
                onDelete={() => handleDeleteStep(step.id)}
                availableRecipeItems={availableRecipeItems}
                recipeSlug={recipeSlug}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {storeSteps.length === 0 && (
        <div className="rounded-lg border-2 border-dashed border-border p-8 text-center text-muted-foreground">
          <p>Keine Schritte vorhanden</p>
          <Button className="mt-3" size="sm" onClick={handleAddStep}>
            Ersten Schritt hinzufügen
          </Button>
        </div>
      )}
    </div>
  );
}
