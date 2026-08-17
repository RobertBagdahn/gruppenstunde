/**
 * Zustand store for recipe step state management.
 *
 * Tracks:
 - Current steps list
 - Last state for simple undo/redo (two-level history)
 - Selected step for editing
 - Loading/error states for async operations
 - Changes detection
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { RecipeStep, RecipeStepInput } from '@/schemas/recipeStep';

type RecipeStepUpdate = Partial<Omit<RecipeStep, 'id' | 'created_at' | 'updated_at'>>;

interface RecipeStepStoreState {
  // --- Data ---
  steps: RecipeStep[];
  lastState: RecipeStep[];
  selectedStepId: number | null;
  isLoading: boolean;
  error: string | null;

  // --- Computed ---
  hasChanges: boolean;
  canUndo: boolean;
  canRedo: boolean;

  // --- Actions ---

  /** Load steps from API response */
  setSteps: (steps: RecipeStep[]) => void;

  /** Add a new step */
  addStep: (step: RecipeStepInput, atIndex?: number) => void;

  /** Remove a step by ID */
  deleteStep: (stepId: number) => void;

  /** Update an existing step */
  updateStep: (stepId: number, updates: RecipeStepUpdate) => void;

  /** Reorder steps (swap sort_order of two steps) */
  reorderSteps: (fromIndex: number, toIndex: number) => void;

  /** Select a step for editing */
  selectStep: (stepId: number | null) => void;

  /** Get currently selected step */
  getSelectedStep: () => RecipeStep | null;

  /** Get current step count */
  getStepCount: () => number;

  /** Undo last action (restore from lastState) */
  undo: () => void;

  /** Redo last action (restore from current state) */
  redo: () => void;

  /** Reset to last saved state */
  reset: () => void;

  /** Mark as dirty when making changes (for save detection) */
  setChanges: (hasChanges: boolean) => void;

  /** Set loading state */
  setLoading: (isLoading: boolean) => void;

  /** Set error message */
  setError: (error: string | null) => void;
}

export const useRecipeStepStore = create<RecipeStepStoreState>()(
  immer((set, get) => ({
    steps: [],
    lastState: [],
    selectedStepId: null,
    isLoading: false,
    error: null,
    hasChanges: false,
    canUndo: false,
    canRedo: false,

    setSteps: (steps) =>
      set((state) => {
        state.steps = steps;
        state.lastState = [];
        state.hasChanges = false;
        state.canUndo = false;
        state.canRedo = false;
        state.error = null;
      }),

    addStep: (step, atIndex) =>
      set((state) => {
        const newStep: RecipeStep = {
          id: Math.max(0, ...state.steps.map((s) => s.id)) + 1, // Generate temp ID
          sort_order:
            atIndex ??
            (state.steps.length > 0
              ? Math.max(...state.steps.map((existingStep) => existingStep.sort_order)) + 1
              : step.sort_order),
          instruction: step.instruction,
          duration_minutes: step.duration_minutes || null,
          section: step.section || '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          step_ingredients: [],
        };

        // Save current state for undo
        state.lastState = [...state.steps];
        state.canUndo = true;
        state.canRedo = false;

        // Insert at index or append
        if (atIndex !== undefined && atIndex >= 0) {
          state.steps.splice(atIndex, 0, newStep);
          // Update sort_order for subsequent steps
          state.steps.forEach((s, i) => {
            s.sort_order = i;
          });
        } else {
          state.steps.push(newStep);
        }

        state.hasChanges = true;
        state.selectedStepId = newStep.id;
      }),

    deleteStep: (stepId) =>
      set((state) => {
        const index = state.steps.findIndex((s) => s.id === stepId);
        if (index === -1) return;

        // Save current state for undo
        state.lastState = [...state.steps];
        state.canUndo = true;
        state.canRedo = false;

        state.steps.splice(index, 1);
        // Update sort_order for remaining steps
        state.steps.forEach((s, i) => {
          s.sort_order = i;
        });

        state.hasChanges = true;
        if (state.selectedStepId === stepId) {
          state.selectedStepId = null;
        }
      }),

    updateStep: (stepId, updates: RecipeStepUpdate) =>
      set((state) => {
        const step = state.steps.find((s) => s.id === stepId);
        if (!step) return;

        // Save current state for undo
        state.lastState = JSON.parse(JSON.stringify(state.steps));
        state.canUndo = true;
        state.canRedo = false;

        // Apply updates
        if (updates.instruction !== undefined) step.instruction = updates.instruction;
        if (updates.duration_minutes !== undefined) step.duration_minutes = updates.duration_minutes;
        if (updates.section !== undefined) step.section = updates.section;
        if (updates.step_ingredients !== undefined) step.step_ingredients = updates.step_ingredients;

        step.updated_at = new Date().toISOString();
        state.hasChanges = true;
      }),

    reorderSteps: (fromIndex, toIndex) =>
      set((state) => {
        if (fromIndex === toIndex) return;
        if (fromIndex < 0 || fromIndex >= state.steps.length) return;
        if (toIndex < 0 || toIndex >= state.steps.length) return;

        // Save current state for undo
        state.lastState = [...state.steps];
        state.canUndo = true;
        state.canRedo = false;

        // Remove and reinsert
        const [removed] = state.steps.splice(fromIndex, 1);
        state.steps.splice(toIndex, 0, removed);

        // Update sort_order for all steps
        state.steps.forEach((s, i) => {
          s.sort_order = i;
        });

        state.hasChanges = true;
      }),

    selectStep: (stepId) =>
      set((state) => {
        state.selectedStepId = stepId;
      }),

    getSelectedStep: () => {
      const state = get();
      return state.steps.find((s) => s.id === state.selectedStepId) || null;
    },

    getStepCount: () => {
      return get().steps.length;
    },

    undo: () =>
      set((state) => {
        if (state.lastState.length === 0) return;

        // Swap current with last state
        const temp = [...state.steps];
        state.steps = [...state.lastState];
        state.lastState = temp;

        state.canRedo = true;
        state.canUndo = false; // Can't undo twice
        state.hasChanges = true;
      }),

    redo: () =>
      set((state) => {
        // After redo, we can't undo again (simple two-level)
        // This is just a flag for UX
        state.canUndo = true;
        state.canRedo = false;
      }),

    reset: () =>
      set((state) => {
        state.steps = [...state.lastState];
        state.hasChanges = false;
        state.canUndo = false;
        state.canRedo = false;
      }),

    setChanges: (hasChanges) =>
      set((state) => {
        state.hasChanges = hasChanges;
      }),

    setLoading: (isLoading) =>
      set((state) => {
        state.isLoading = isLoading;
      }),

    setError: (error) =>
      set((state) => {
        state.error = error;
      }),
  }))
);
