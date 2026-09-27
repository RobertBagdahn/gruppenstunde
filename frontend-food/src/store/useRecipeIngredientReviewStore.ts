import { create } from 'zustand';
import type {
  IngredientReviewPreview,
  IngredientReviewRow,
  IngredientReviewRowInput,
} from '@/schemas/ingredientReview';

interface RecipeIngredientReviewState {
  rows: IngredientReviewRow[];
  sources: IngredientReviewPreview['sources'];
  aiInteractionId: string | null;
  isDirty: boolean;
  error: string | null;
  fieldErrors: Record<string, string>;
  initialize: (preview: IngredientReviewPreview) => void;
  updateRow: (key: string, updates: Partial<IngredientReviewRow>) => void;
  confirmRow: (key: string) => void;
  confirmCompleteRows: () => void;
  reset: () => void;
  setError: (error: string | null, fieldErrors?: Record<string, string>) => void;
  getFinalizedRows: () => IngredientReviewRowInput[] | null;
}

function isComplete(row: IngredientReviewRow): boolean {
  return (row.selected_ingredient_id !== null || row.new_ingredient_draft !== null)
    && row.selected_portion !== null
    && row.quantity !== null
    && row.quantity > 0;
}

export const useRecipeIngredientReviewStore = create<RecipeIngredientReviewState>((set, get) => ({
  rows: [],
  sources: [],
  aiInteractionId: null,
  isDirty: false,
  error: null,
  fieldErrors: {},

  initialize: (preview) => set({
    rows: preview.rows,
    sources: preview.sources,
    aiInteractionId: preview.ai_interaction_id,
    isDirty: false,
    error: null,
    fieldErrors: {},
  }),

  updateRow: (key, updates) => set((state) => ({
    rows: state.rows.map((row) => row.key === key ? { ...row, ...updates, status: 'changed' } : row),
    isDirty: true,
    error: null,
  })),

  confirmRow: (key) => set((state) => ({
    rows: state.rows.map((row) => row.key === key && isComplete(row)
      ? { ...row, status: 'confirmed' }
      : row),
    isDirty: true,
    error: null,
  })),

  confirmCompleteRows: () => set((state) => ({
    rows: state.rows.map((row) => isComplete(row) && row.status !== 'confirmed'
      ? { ...row, status: 'confirmed' }
      : row),
    isDirty: true,
    error: null,
  })),

  reset: () => set({
    rows: [],
    sources: [],
    aiInteractionId: null,
    isDirty: false,
    error: null,
    fieldErrors: {},
  }),

  setError: (error, fieldErrors = {}) => set({ error, fieldErrors }),

  getFinalizedRows: () => {
    const { rows } = get();
    if (rows.some((row) => row.status !== 'confirmed' || !isComplete(row))) return null;
    return rows.map((row) => ({
      key: row.key,
      status: 'confirmed' as const,
      selected_ingredient_id: row.selected_ingredient_id,
      selected_portion_id: row.selected_portion?.id ?? null,
      quantity: row.quantity as number,
      // Only send the AI draft when the user actually confirmed it; picking an
      // existing ingredient afterwards must not create a new one.
      temporary_ingredient: row.selected_portion?.is_new ? row.new_ingredient_draft : null,
    }));
  },
}));

export { isComplete as isIngredientReviewRowComplete };
