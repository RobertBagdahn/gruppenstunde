// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { IngredientReviewRow } from '@/schemas/ingredientReview';
import RecipeIngredientReviewStep from './RecipeIngredientReviewStep';
import { useRecipeIngredientReviewStore } from '@/store/useRecipeIngredientReviewStore';

vi.mock('@/api/supplies', () => ({
  useIngredientPortions: vi.fn(() => ({ data: [], isSuccess: false })),
  useRetailSections: vi.fn(() => ({ data: [] })),
  useStandardMeasures: vi.fn(() => ({ data: [] })),
  useIngredientGroups: vi.fn(() => ({ data: [] })),
}));

// The real autocomplete searches the API; here only its "no fit" callback matters.
vi.mock('./IngredientAutocomplete', () => ({
  IngredientAutocomplete: ({ onCreateNew }: { onCreateNew?: (name: string) => void }) => (
    <button type="button" onClick={() => onCreateNew?.('Dinkelmehl')}>
      Keine passende Zutat
    </button>
  ),
}));

const row: IngredientReviewRow = {
  key: 'row-1',
  source_text: 'Dinkelmehl',
  sources: [{ type: 'text', label: 'Eingefügter Rezepttext', value: 'text' }],
  selected_ingredient_id: null,
  selected_ingredient_slug: '',
  selected_ingredient_name: '',
  suggested_ingredient_id: null,
  suggested_ingredient_name: 'Dinkelmehl',
  candidates: [],
  selected_portion: null,
  suggested_portion: null,
  quantity: null,
  suggested_quantity: null,
  reason: '',
  technical_details: null,
  conflicts: [],
  new_ingredient_draft: null,
  status: 'unresolved',
};

describe('review row: no existing ingredient fits', () => {
  beforeEach(() => {
    useRecipeIngredientReviewStore.setState({ rows: [row], error: null });
  });

  it('starts a new-ingredient draft from the typed name instead of a dead end', () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <RecipeIngredientReviewStep />
      </QueryClientProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Keine passende Zutat' }));

    const updated = useRecipeIngredientReviewStore.getState().rows[0];
    expect(updated.new_ingredient_draft?.name).toBe('Dinkelmehl');
    expect(updated.selected_ingredient_id).toBeNull();
    expect(updated.status).toBe('unresolved');
    // The draft dialog opens right away so the user can add portion and quantity.
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
