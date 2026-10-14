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

vi.mock('./IngredientAutocomplete', () => ({
  IngredientAutocomplete: () => <div />,
}));

const row: IngredientReviewRow = {
  key: 'row-1',
  source_text: 'Zauberpulver',
  sources: [{ type: 'text', label: 'Eingefügter Rezepttext', value: 'text' }],
  selected_ingredient_id: null,
  selected_ingredient_slug: '',
  selected_ingredient_name: 'Zauberpulver',
  suggested_ingredient_id: null,
  suggested_ingredient_name: 'Zauberpulver',
  candidates: [],
  selected_portion: null,
  suggested_portion: null,
  quantity: null,
  suggested_quantity: null,
  reason: '',
  note: '',
  technical_details: null,
  conflicts: [],
  new_ingredient_draft: {
    name: 'Zauberpulver',
    description: '',
    status: 'draft',
    values: { energy_kcal: 500, protein_g: 200 },
    portions: [],
    quantity: null,
  },
  status: 'unresolved',
};

describe('review row: new ingredient draft nutrition validation', () => {
  beforeEach(() => {
    useRecipeIngredientReviewStore.setState({ rows: [row], error: null });
  });

  it('shows an inline error for impossible nutrition values', () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <RecipeIngredientReviewStep />
      </QueryClientProvider>,
    );

    expect(screen.getAllByRole('alert').some((node) => /100 g/.test(node.textContent ?? ''))).toBe(true);
  });
});

describe('review row: new ingredient draft saturated fat and quantity', () => {
  function renderStep(draft: Partial<NonNullable<IngredientReviewRow['new_ingredient_draft']>>) {
    useRecipeIngredientReviewStore.setState({
      rows: [{ ...row, new_ingredient_draft: { ...row.new_ingredient_draft!, ...draft } }],
      error: null,
    });
    render(
      <QueryClientProvider client={new QueryClient()}>
        <RecipeIngredientReviewStep />
      </QueryClientProvider>,
    );
  }

  it('flags saturated fat above fat like the backend', () => {
    renderStep({ values: { energy_kcal: 700, fat_g: 10, fat_sat_g: 30, carbohydrate_g: 5 } });

    expect(screen.getAllByRole('alert').some((node) => /Gesättigte Fettsäuren/.test(node.textContent ?? ''))).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: /Portion & Menge festlegen/ }));
    expect(screen.getByRole('button', { name: /Zutat und Menge übernehmen/ })).toBeDisabled();
  });

  it('requires at least 0,1 portions', () => {
    renderStep({
      values: { energy_kcal: 100, protein_g: 5, fat_g: 2, carbohydrate_g: 15 },
      portions: [{ id: null, name: 'Stück', quantity: 1, weight_g: 50, measuring_unit_id: null, measuring_unit_name: null, is_new: true }],
    });
    fireEvent.click(screen.getByRole('button', { name: /Portion & Menge festlegen/ }));
    const quantityInput = screen.getByLabelText(/Menge \(Anzahl Portionen\)/);
    const confirm = screen.getByRole('button', { name: /Zutat und Menge übernehmen/ });

    fireEvent.change(quantityInput, { target: { value: '0,05' } });
    expect(confirm).toBeDisabled();

    fireEvent.change(quantityInput, { target: { value: '0,1' } });
    expect(confirm).toBeEnabled();
  });
});

describe('review row: choosing an existing ingredient', () => {
  beforeEach(() => {
    useRecipeIngredientReviewStore.setState({ rows: [{ ...row, candidates: [{ id: 9, name: 'Eier (Größe M)', slug: 'eier-groesse-m', confidence: 0.44 }] }], error: null });
  });

  it('drops the pending new-ingredient draft', async () => {
    const { fireEvent } = await import('@testing-library/react');
    render(
      <QueryClientProvider client={new QueryClient()}>
        <RecipeIngredientReviewStep />
      </QueryClientProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: /Alternativen anzeigen/ }));
    fireEvent.click(screen.getByText('Eier (Größe M)'));

    const updated = useRecipeIngredientReviewStore.getState().rows[0];
    expect(updated.selected_ingredient_id).toBe(9);
    expect(updated.new_ingredient_draft).toBeNull();
  });
});
