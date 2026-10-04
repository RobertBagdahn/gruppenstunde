// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { IngredientReviewPreview, IngredientReviewRow } from '@/schemas/ingredientReview';
import StaleStepsNotice from './StaleStepsNotice';
import { useRecipeIngredientReviewStore } from '@/store/useRecipeIngredientReviewStore';

function row(key: string, name: string): IngredientReviewRow {
  return {
    key,
    source_text: name,
    sources: [{ type: 'text', label: 'Text', value: 'x' }],
    selected_ingredient_id: key === 'a' ? 1 : 2,
    selected_ingredient_slug: name.toLowerCase(),
    selected_ingredient_name: name,
    suggested_ingredient_id: key === 'a' ? 1 : 2,
    suggested_ingredient_name: name,
    candidates: [],
    selected_portion: null,
    suggested_portion: null,
    quantity: 1,
    suggested_quantity: 1,
    reason: '',
    technical_details: null,
    conflicts: [],
    new_ingredient_draft: null,
    status: 'open',
  };
}

const preview: IngredientReviewPreview = {
  rows: [row('a', 'Tomate'), row('b', 'Zwiebel')],
  sources: [],
  ai_interaction_id: null,
} as unknown as IngredientReviewPreview;

describe('StaleStepsNotice', () => {
  beforeEach(() => {
    useRecipeIngredientReviewStore.getState().initialize(preview);
  });

  it('is hidden right after the import', () => {
    render(<StaleStepsNotice />);
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('appears after an ingredient was removed', () => {
    useRecipeIngredientReviewStore.getState().removeRow('a');
    render(<StaleStepsNotice />);
    expect(screen.getByText('Zutaten wurden geändert – bitte Schritte prüfen')).toBeTruthy();
  });

  it('does not appear for quantity-only changes', () => {
    useRecipeIngredientReviewStore.getState().updateRow('a', { quantity: 3 });
    render(<StaleStepsNotice />);
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('appears when an ingredient is replaced and can be acknowledged', () => {
    useRecipeIngredientReviewStore.getState().updateRow('b', { selected_ingredient_id: 7, selected_ingredient_name: 'Schalotte' });
    render(<StaleStepsNotice />);
    fireEvent.click(screen.getByRole('button', { name: 'Verstanden' }));
    expect(screen.queryByRole('status')).toBeNull();
  });
});
