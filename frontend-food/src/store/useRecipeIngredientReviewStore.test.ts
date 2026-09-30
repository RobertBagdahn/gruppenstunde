import { describe, expect, it } from 'vitest';
import { useRecipeIngredientReviewStore } from './useRecipeIngredientReviewStore';
import type { IngredientReviewPreview } from '@/schemas/ingredientReview';

const preview: IngredientReviewPreview = {
  recipe_draft: {
    title: 'Test', description: '', summary: '', servings: 2, preparation_time: null,
    execution_time: null, recipe_type: 'warm_meal', difficulty: 'easy',
    execution_time_choice: 'less_30', preparation_time_choice: 'none',
    scout_level_ids: [], tag_ids: [], steps: [], source_url: '', image_url: '',
  },
  sources: [],
  ai_interaction_id: null,
  is_reconstructed: false,
  rows: [{
    key: 'one', source_text: '1 Apfel', sources: [], selected_ingredient_id: 1,
    selected_ingredient_slug: 'apfel', selected_ingredient_name: 'Apfel',
    suggested_ingredient_id: 1, suggested_ingredient_name: 'Apfel', candidates: [],
    selected_portion: { id: 2, name: 'Stück', quantity: 1, weight_g: 120, measuring_unit_id: 1, measuring_unit_name: 'Stück', is_new: false },
    suggested_portion: null, quantity: 1, suggested_quantity: 1, reason: 'Exakt',
    technical_details: null, conflicts: [], new_ingredient_draft: null, status: 'open',
  }],
};

describe('useRecipeIngredientReviewStore', () => {
  it('requires explicit confirmation before finalization', () => {
    const store = useRecipeIngredientReviewStore.getState();
    store.initialize(preview);
    expect(store.getFinalizedRows()).toBeNull();
    store.confirmRow('one');
    expect(useRecipeIngredientReviewStore.getState().getFinalizedRows()).toHaveLength(1);
  });

  it('drops a stale AI draft once an existing ingredient portion is chosen', () => {
    const draftPortion = { id: null, name: 'Zehe', quantity: 1, weight_g: 4, measuring_unit_id: null, measuring_unit_name: null, is_new: true };
    const draft = { name: 'Knoblauch', description: '', status: 'draft', values: {}, portions: [draftPortion], quantity: 2 };
    const store = useRecipeIngredientReviewStore.getState();
    store.initialize({ ...preview, rows: [{ ...preview.rows[0], new_ingredient_draft: draft }] });
    store.confirmRow('one');
    expect(useRecipeIngredientReviewStore.getState().getFinalizedRows()?.[0].temporary_ingredient).toBeNull();

    store.updateRow('one', { selected_portion: draftPortion, status: 'open' });
    store.confirmRow('one');
    expect(useRecipeIngredientReviewStore.getState().getFinalizedRows()?.[0].temporary_ingredient).toEqual(draft);
  });

  it('bulk confirms complete rows but leaves incomplete rows open', () => {
    const store = useRecipeIngredientReviewStore.getState();
    store.initialize(preview);
    store.confirmCompleteRows();
    expect(useRecipeIngredientReviewStore.getState().rows[0].status).toBe('confirmed');
  });

  it('removes a row and restores it at its old position', () => {
    const second = { ...preview.rows[0], key: 'two' };
    const store = useRecipeIngredientReviewStore.getState();
    store.initialize({ ...preview, rows: [preview.rows[0], second] });

    const removed = useRecipeIngredientReviewStore.getState().removeRow('one');
    expect(useRecipeIngredientReviewStore.getState().rows.map((row) => row.key)).toEqual(['two']);

    useRecipeIngredientReviewStore.getState().restoreRow(removed!.row, removed!.index);
    expect(useRecipeIngredientReviewStore.getState().rows.map((row) => row.key)).toEqual(['one', 'two']);
  });

  it('finalizes without the removed, still unresolved row', () => {
    const unresolved = { ...preview.rows[0], key: 'noise', quantity: null, status: 'unresolved' as const };
    const store = useRecipeIngredientReviewStore.getState();
    store.initialize({ ...preview, rows: [preview.rows[0], unresolved] });
    useRecipeIngredientReviewStore.getState().confirmRow('one');
    expect(useRecipeIngredientReviewStore.getState().getFinalizedRows()).toBeNull();

    useRecipeIngredientReviewStore.getState().removeRow('noise');

    expect(useRecipeIngredientReviewStore.getState().getFinalizedRows()).toHaveLength(1);
  });

  it('keeps an explicit status passed to updateRow', () => {
    const store = useRecipeIngredientReviewStore.getState();
    store.initialize(preview);

    useRecipeIngredientReviewStore.getState().updateRow('one', { status: 'unresolved' });

    expect(useRecipeIngredientReviewStore.getState().rows[0].status).toBe('unresolved');
  });

  it('adds an empty unresolved row', () => {
    const store = useRecipeIngredientReviewStore.getState();
    store.initialize(preview);

    const key = useRecipeIngredientReviewStore.getState().addEmptyRow();

    const row = useRecipeIngredientReviewStore.getState().rows.find((candidate) => candidate.key === key);
    expect(row?.status).toBe('unresolved');
    expect(row?.selected_ingredient_id).toBeNull();
  });
});
