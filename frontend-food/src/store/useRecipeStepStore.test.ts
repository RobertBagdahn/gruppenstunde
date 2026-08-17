/**
 * Tests for useRecipeStepStore (Zustand store)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useRecipeStepStore } from '@/store/useRecipeStepStore';
import type { RecipeStep, RecipeStepInput } from '@/schemas/recipeStep';

function toStepInput(step: RecipeStep): RecipeStepInput {
  return {
    sort_order: step.sort_order,
    instruction: step.instruction,
    duration_minutes: step.duration_minutes ?? null,
    section: step.section,
    step_ingredients: step.step_ingredients.map((si) => ({
      recipe_item_id: si.recipe_item_id,
      quantity_modifier: si.quantity_modifier,
      preparation: si.preparation,
      sort_order: si.sort_order,
    })),
  };
}

describe('useRecipeStepStore', () => {
  beforeEach(() => {
    useRecipeStepStore.setState({
      steps: [],
      selectedStepId: null,
      lastState: [],
    });
  });

  const createMockStep = (overrides?: Partial<RecipeStep>): RecipeStep => ({
    id: Date.now(),
    sort_order: 0,
    instruction: 'Test instruction',
    duration_minutes: null,
    section: '',
    step_ingredients: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  });

  describe('setSteps', () => {
    it('should set steps in store', () => {
      const steps = [createMockStep({ sort_order: 1 })];
      useRecipeStepStore.getState().setSteps(steps);

      expect(useRecipeStepStore.getState().steps).toEqual(steps);
    });

    it('should replace existing steps', () => {
      const store = useRecipeStepStore.getState();
      const step1 = createMockStep({ sort_order: 1 });
      const step2 = createMockStep({ sort_order: 2 });

      store.setSteps([step1]);
      expect(useRecipeStepStore.getState().steps).toHaveLength(1);

      store.setSteps([step2]);
      expect(useRecipeStepStore.getState().steps).toHaveLength(1);
      expect(useRecipeStepStore.getState().steps[0]).toEqual(step2);
    });
  });

  describe('addStep', () => {
    it('should add new step to store', () => {
      const store = useRecipeStepStore.getState();
      const step = toStepInput(createMockStep());

      store.addStep(step);

      expect(useRecipeStepStore.getState().steps).toHaveLength(1);
    });

    it('should maintain sort order when adding steps', () => {
      const store = useRecipeStepStore.getState();
      const step1 = toStepInput(createMockStep({ sort_order: 1 }));
      const step2 = toStepInput(createMockStep({ sort_order: 2 }));

      store.addStep(step1);
      store.addStep(step2);

      expect(useRecipeStepStore.getState().steps).toHaveLength(2);
      expect(useRecipeStepStore.getState().steps[0].sort_order).toBe(1);
      expect(useRecipeStepStore.getState().steps[1].sort_order).toBe(2);
    });
  });

  describe('deleteStep', () => {
    it('should remove step from store', () => {
      const store = useRecipeStepStore.getState();
      const step = createMockStep({ id: 123 });

      store.setSteps([step]);
      store.deleteStep(123);

      expect(useRecipeStepStore.getState().steps).toHaveLength(0);
    });

    it('should not crash when deleting non-existent step', () => {
      const store = useRecipeStepStore.getState();
      const step = createMockStep({ id: 123 });

      store.setSteps([step]);
      store.deleteStep(999);

      expect(useRecipeStepStore.getState().steps).toHaveLength(1);
    });
  });

  describe('updateStep', () => {
    it('should update step fields', () => {
      const store = useRecipeStepStore.getState();
      const step = createMockStep({ id: 123, instruction: 'Original' });

      store.setSteps([step]);
      store.updateStep(123, { instruction: 'Updated' });

      expect(useRecipeStepStore.getState().steps[0].instruction).toBe('Updated');
    });

    it('should handle partial updates', () => {
      const store = useRecipeStepStore.getState();
      const step = createMockStep({
        id: 123,
        instruction: 'Original',
        duration_minutes: 5,
      });

      store.setSteps([step]);
      store.updateStep(123, { duration_minutes: 10 });

      expect(useRecipeStepStore.getState().steps[0].instruction).toBe('Original');
      expect(useRecipeStepStore.getState().steps[0].duration_minutes).toBe(10);
    });
  });

  describe('reorderSteps', () => {
    it('should reorder steps by fromIndex and toIndex', () => {
      const store = useRecipeStepStore.getState();
      const step1 = createMockStep({ id: 1, sort_order: 1 });
      const step2 = createMockStep({ id: 2, sort_order: 2 });
      const step3 = createMockStep({ id: 3, sort_order: 3 });

      store.setSteps([step1, step2, step3]);
      store.reorderSteps(2, 0); // Move index 2 to index 0

      expect(useRecipeStepStore.getState().steps[0].id).toBe(3);
      expect(useRecipeStepStore.getState().steps[1].id).toBe(1);
      expect(useRecipeStepStore.getState().steps[2].id).toBe(2);
    });
  });

  describe('undo/redo', () => {
    it('should support undo after adding a step', () => {
      const store = useRecipeStepStore.getState();
      const step1 = createMockStep({ sort_order: 1 });
      const step2 = toStepInput(createMockStep({ sort_order: 2 }));

      store.setSteps([step1]);
      store.addStep(step2); // This triggers undo state save
      store.undo();

      expect(useRecipeStepStore.getState().steps).toHaveLength(1);
      expect(useRecipeStepStore.getState().steps[0]).toEqual(step1);
    });

    it('should have canUndo as boolean property', () => {
      expect(typeof useRecipeStepStore.getState().canUndo).toBe('boolean');
    });
  });

  describe('selectStep', () => {
    it('should set selected step ID', () => {
      const store = useRecipeStepStore.getState();
      store.selectStep(123);

      expect(useRecipeStepStore.getState().selectedStepId).toBe(123);
    });

    it('should clear selection when null is passed', () => {
      const store = useRecipeStepStore.getState();
      store.selectStep(123);
      store.selectStep(null);

      expect(useRecipeStepStore.getState().selectedStepId).toBeNull();
    });
  });

  describe('store persistence', () => {
    it('should maintain state across multiple operations', () => {
      const store = useRecipeStepStore.getState();
      const step1 = createMockStep({ id: 1 });
      const step2 = toStepInput(createMockStep({ id: 2 }));

      store.setSteps([step1]);
      store.addStep(step2);
      store.selectStep(1);

      expect(useRecipeStepStore.getState().steps).toHaveLength(2);
      expect(useRecipeStepStore.getState().selectedStepId).toBe(1);
    });
  });
});
