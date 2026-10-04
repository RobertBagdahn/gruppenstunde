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

// A plain input stands in for the autocomplete: only focus/selection behaviour matters here.
vi.mock('./IngredientAutocomplete', () => ({
  IngredientAutocomplete: ({ value, onChange }: { value: string; onChange: (value: string) => void }) => (
    <input aria-label="Zutat suchen" value={value} onChange={(event) => onChange(event.target.value)} />
  ),
}));

const row: IngredientReviewRow = {
  key: 'row-1',
  source_text: '1 Dose Tomaten',
  sources: [{ type: 'text', label: 'Eingefügter Rezepttext', value: 'text' }],
  selected_ingredient_id: 3,
  selected_ingredient_slug: 'tomate',
  selected_ingredient_name: 'Tomate',
  suggested_ingredient_id: 3,
  suggested_ingredient_name: 'Tomate',
  candidates: [],
  selected_portion: null,
  suggested_portion: null,
  quantity: null,
  suggested_quantity: null,
  reason: '',
  technical_details: null,
  conflicts: [],
  new_ingredient_draft: null,
  status: 'open',
};

describe('review row: "Zutat ändern"', () => {
  beforeEach(() => {
    useRecipeIngredientReviewStore.setState({ rows: [row], error: null });
  });

  it('focuses the search field with its text selected so typing replaces it', () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <RecipeIngredientReviewStep />
      </QueryClientProvider>,
    );
    const input = screen.getByLabelText('Zutat suchen') as HTMLInputElement;

    fireEvent.click(screen.getByRole('button', { name: /Zutat ändern/ }));

    expect(document.activeElement).toBe(input);
    expect(input.selectionStart).toBe(0);
    expect(input.selectionEnd).toBe('Tomate'.length);
  });
});
