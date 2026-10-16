// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { IngredientReviewRow } from '@/schemas/ingredientReview';
import RecipeIngredientReviewStep from './RecipeIngredientReviewStep';
import { useRecipeIngredientReviewStore } from '@/store/useRecipeIngredientReviewStore';

const draftMutate = vi.fn();

vi.mock('@/api/recipeImport', () => ({
  useIngredientDraftMutation: () => ({ mutateAsync: draftMutate, isPending: false }),
}));

vi.mock('@/api/supplies', () => ({
  useIngredientPortions: vi.fn(() => ({ data: [], isSuccess: false })),
  useIngredient: vi.fn(() => ({ data: undefined })),
  useRetailSections: vi.fn(() => ({ data: [] })),
  useStandardMeasures: vi.fn(() => ({ data: [] })),
  useIngredientGroups: vi.fn(() => ({ data: [] })),
}));

vi.mock('./IngredientAutocomplete', () => ({
  IngredientAutocomplete: () => <div />,
}));

const row: IngredientReviewRow = {
  key: 'row-1',
  source_text: 'Frischer Ingwer: ca. 60–80 g',
  sources: [{ type: 'text', label: 'Eingefügter Rezepttext', value: 'text' }],
  selected_ingredient_id: null,
  selected_ingredient_slug: '',
  selected_ingredient_name: '',
  suggested_ingredient_id: null,
  suggested_ingredient_name: 'Ingwer',
  candidates: [],
  selected_portion: null,
  suggested_portion: null,
  quantity: null,
  suggested_quantity: 7,
  reason: '',
  note: '',
  technical_details: null,
  conflicts: [],
  new_ingredient_draft: null,
  status: 'unresolved',
};

function renderStep() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <RecipeIngredientReviewStep />
    </QueryClientProvider>,
  );
}

describe('review row: "Zutat anlegen"', () => {
  beforeEach(() => {
    draftMutate.mockReset();
    useRecipeIngredientReviewStore.setState({ rows: [row], error: null });
  });

  it('asks the backend for an enriched draft and opens it in the editor', async () => {
    draftMutate.mockResolvedValue({
      draft: {
        name: 'Ingwer',
        description: '',
        status: 'draft',
        values: { energy_kcal: 80 },
        portions: [{ name: 'Stück', quantity: 1, weight_g: 20, measuring_unit_name: 'Stück', is_new: true }],
        quantity: 7,
      },
      duplicates: [],
      is_enriched: true,
    });
    renderStep();

    fireEvent.click(screen.getByRole('button', { name: 'Zutat anlegen' }));

    await waitFor(() => expect(draftMutate).toHaveBeenCalledWith({
      source_text: 'Frischer Ingwer: ca. 60–80 g',
      quantity: 7,
      unit: '',
    }));
    await waitFor(() => {
      expect(useRecipeIngredientReviewStore.getState().rows[0].new_ingredient_draft?.name).toBe('Ingwer');
    });
  });

  it('offers an existing ingredient before creating a duplicate', async () => {
    draftMutate.mockResolvedValue({
      draft: { name: 'Ingwer', description: '', status: 'draft', values: {}, portions: [], quantity: 7 },
      duplicates: [{ id: 9, name: 'Ingwer', slug: 'ingwer', confidence: 0.95 }],
      is_enriched: false,
    });
    renderStep();

    fireEvent.click(screen.getByRole('button', { name: 'Zutat anlegen' }));

    const hint = await screen.findByTestId('review-row-duplicates');
    expect(hint).toHaveTextContent('Vorhandene Zutat verwenden?');
    // The editor dialog hides the page from the accessibility tree, so query inside the hint.
    fireEvent.click(within(hint).getByText('Ingwer'));

    await waitFor(() => {
      expect(useRecipeIngredientReviewStore.getState().rows[0].selected_ingredient_id).toBe(9);
    });
  });
});
