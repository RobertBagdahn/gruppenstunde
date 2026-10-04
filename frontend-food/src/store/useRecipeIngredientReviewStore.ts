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
  /** True once ingredients were removed, added or replaced after the import, so imported steps may be outdated. */
  ingredientsChangedSinceImport: boolean;
  error: string | null;
  fieldErrors: Record<string, string>;
  initialize: (preview: IngredientReviewPreview) => void;
  updateRow: (key: string, updates: Partial<IngredientReviewRow>) => void;
  /** Removes a row and returns it with its position so the caller can offer undo. */
  removeRow: (key: string) => { row: IngredientReviewRow; index: number } | null;
  restoreRow: (row: IngredientReviewRow, index: number) => void;
  /** Appends an empty, unresolved row for an ingredient the AI did not list. */
  addEmptyRow: () => string;
  /** The user has seen the outdated-steps hint (or edited the steps). */
  acknowledgeIngredientChange: () => void;
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
  ingredientsChangedSinceImport: false,
  error: null,
  fieldErrors: {},

  initialize: (preview) => set({
    rows: preview.rows,
    sources: preview.sources,
    aiInteractionId: preview.ai_interaction_id,
    isDirty: false,
    ingredientsChangedSinceImport: false,
    error: null,
    fieldErrors: {},
  }),

  // An edit marks the row as changed unless the caller sets the status itself
  // (e.g. "unresolved" for a rejected suggestion).
  updateRow: (key, updates) => set((state) => {
    const current = state.rows.find((row) => row.key === key);
    // Only a different ingredient counts; quantity or portion edits never outdate the steps.
    const replaced = current !== undefined
      && (('selected_ingredient_id' in updates && updates.selected_ingredient_id !== current.selected_ingredient_id)
        || ('selected_ingredient_name' in updates
          && updates.selected_ingredient_name !== current.selected_ingredient_name));
    return {
      rows: state.rows.map((row) => row.key === key ? { ...row, status: 'changed', ...updates } : row),
      isDirty: true,
      ingredientsChangedSinceImport: state.ingredientsChangedSinceImport || replaced,
      error: null,
    };
  }),

  removeRow: (key) => {
    const { rows } = get();
    const index = rows.findIndex((row) => row.key === key);
    if (index === -1) return null;
    const row = rows[index];
    set({
      rows: rows.filter((candidate) => candidate.key !== key),
      isDirty: true,
      ingredientsChangedSinceImport: true,
      error: null,
    });
    return { row, index };
  },

  restoreRow: (row, index) => set((state) => {
    if (state.rows.some((candidate) => candidate.key === row.key)) return {};
    const next = [...state.rows];
    next.splice(Math.min(index, next.length), 0, row);
    return { rows: next, isDirty: true, error: null };
  }),

  addEmptyRow: () => {
    const key = `manual-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const row: IngredientReviewRow = {
      key,
      source_text: 'Zusätzliche Zutat',
      sources: [{ type: 'text', label: 'Manuell hinzugefügt', value: key }],
      selected_ingredient_id: null,
      selected_ingredient_slug: '',
      selected_ingredient_name: '',
      suggested_ingredient_id: null,
      suggested_ingredient_name: '',
      candidates: [],
      selected_portion: null,
      suggested_portion: null,
      quantity: null,
      suggested_quantity: null,
      reason: 'Suche eine Zutat und lege Menge und Portion fest.',
      technical_details: null,
      conflicts: [],
      new_ingredient_draft: null,
      status: 'unresolved',
    };
    set((state) => ({ rows: [...state.rows, row], isDirty: true, ingredientsChangedSinceImport: true, error: null }));
    return key;
  },

  acknowledgeIngredientChange: () => set({ ingredientsChangedSinceImport: false }),

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
    ingredientsChangedSinceImport: false,
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
