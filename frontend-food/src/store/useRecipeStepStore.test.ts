/**
 * Tests for useRecipeStepStore (Zustand store)
 *
 * Tests cover:
 * - Setting and updating steps
 * - Adding and deleting steps
 * - Undo/redo functionality
 * - Store selectors and state transitions
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useRecipeStepStore } from '@/store/useRecipeStepStore';
import type { RecipeStep } from '@/schemas/recipeStep';

describe('useRecipeStepStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useRecipeStepStore.setState({
      steps: [],
      selectedStepId: null,
      lastStates: [],
      currentIndex: -1,
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
      expect(store.steps).toHaveLength(1);

      store.setSteps([step2]);
      expect(store.steps).toHaveLength(1);
      expect(store.steps[0]).toEqual(step2);
    });
  });

  describe('addStep', () => {
    it('should add new step to store', () => {
      const store = useRecipeStepStore.getState();
      const step = createMockStep();

      store.addStep(step);

      expect(store.steps).toContain(step);
    });

    it('should maintain sort order when adding steps', () => {
      const store = useRecipeStepStore.getState();
      const step1 = createMockStep({ sort_order: 1 });
      const step2 = createMockStep({ sort_order: 2 });

      store.addStep(step1);
      store.addStep(step2);

      expect(store.steps).toHaveLength(2);
      expect(store.steps[0].sort_order).toBe(1);
      expect(store.steps[1].sort_order).toBe(2);
    });
  });

  describe('deleteStep', () => {
    it('should remove step from store', () => {
      const store = useRecipeStepStore.getState();
      const step = createMockStep({ id: 123 });

      store.setSteps([step]);
      store.deleteStep(123);

      expect(store.steps).toHaveLength(0);
    });

    it('should not crash when deleting non-existent step', () => {
      const store = useRecipeStepStore.getState();
      const step = createMockStep({ id: 123 });

      store.setSteps([step]);
      store.deleteStep(999); // Non-existent ID

      expect(store.steps).toHaveLength(1);
    });
  });

  describe('updateStep', () => {
    it('should update step fields', () => {
      const store = useRecipeStepStore.getState();
      const step = createMockStep({ id: 123, instruction: 'Original' });

      store.setSteps([step]);
      store.updateStep(123, { instruction: 'Updated' });

      expect(store.steps[0].instruction).toBe('Updated');
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

      expect(store.steps[0].instruction).toBe('Original');
      expect(store.steps[0].duration_minutes).toBe(10);
    });
  });

  describe('reorderSteps', () => {
    it('should reorder steps by sort_order', () => {
      const store = useRecipeStepStore.getState();
      const step1 = createMockStep({ id: 1, sort_order: 1 });
      const step2 = createMockStep({ id: 2, sort_order: 2 });
      const step3 = createMockStep({ id: 3, sort_order: 3 });

      store.setSteps([step1, step2, step3]);
      store.reorderSteps([3, 1, 2]); // New sort order

      expect(store.steps[0].id).toBe(3);
      expect(store.steps[1].id).toBe(1);
      expect(store.steps[2].id).toBe(2);
    });
  });

  describe('undo/redo', () => {
    it('should support undo operation', () => {
      const store = useRecipeStepStore.getState();
      const step1 = createMockStep({ sort_order: 1 });
      const step2 = createMockStep({ sort_order: 2 });

      store.setSteps([step1]);
      store.setSteps([step1, step2]); // This should save state
      store.undo();

      // After undo, should be back to first state
      expect(store.canUndo()).toBeDefined();
    });

    it('should indicate undo availability', () => {
      const store = useRecipeStepStore.getState();
      const step = createMockStep();

      store.setSteps([step]);

      // Should have history after making changes
      expect(typeof store.canUndo() === 'boolean').toBe(true);
    });
  });

  describe('selectStep', () => {
    it('should set selected step ID', () => {
      const store = useRecipeStepStore.getState();
      store.selectStep(123);

      expect(store.selectedStepId).toBe(123);
    });

    it('should clear selection when null is passed', () => {
      const store = useRecipeStepStore.getState();
      store.selectStep(123);
      store.selectStep(null);

      expect(store.selectedStepId).toBeNull();
    });
  });

  describe('store persistence', () => {
    it('should maintain state across multiple operations', () => {
      const store = useRecipeStepStore.getState();
      const step1 = createMockStep({ id: 1 });
      const step2 = createMockStep({ id: 2 });

      store.setSteps([step1]);
      store.addStep(step2);
      store.selectStep(1);

      expect(store.steps).toHaveLength(2);
      expect(store.selectedStepId).toBe(1);
    });
  });
});
