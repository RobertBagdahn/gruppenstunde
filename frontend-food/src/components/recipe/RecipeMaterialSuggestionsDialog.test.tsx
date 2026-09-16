// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import RecipeMaterialSuggestionsDialog from './RecipeMaterialSuggestionsDialog';

vi.mock('@/api/recipeMaterials', () => ({
  useSuggestRecipeMaterials: vi.fn(),
  useApplyRecipeMaterials: vi.fn(),
}));

vi.mock('@/api/aiInteraction', () => ({
  useVoteAiInteraction: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
}));

import { useSuggestRecipeMaterials, useApplyRecipeMaterials } from '@/api/recipeMaterials';

const suggestionsFixture = {
  items: [
    {
      material_id: 12,
      suggested_name: 'Zahnstocher',
      quantity: '30 Stück',
      matched_name: 'Zahnstocher',
      is_new: false,
    },
    {
      material_id: null,
      suggested_name: 'Spießhalter',
      quantity: '1 Stück',
      matched_name: null,
      is_new: true,
    },
  ],
  ai_interaction_id: null,
};

function renderDialog(onOpenChange = vi.fn()) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <RecipeMaterialSuggestionsDialog open onOpenChange={onOpenChange} recipeId={1} />
    </QueryClientProvider>,
  );
}

describe('RecipeMaterialSuggestionsDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useApplyRecipeMaterials as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      reset: vi.fn(),
    });
  });

  it('shows matched and unmatched status for suggestions', async () => {
    (useSuggestRecipeMaterials as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      data: suggestionsFixture,
      reset: vi.fn(),
    });
    renderDialog();

    expect(screen.getByText('Zahnstocher')).toBeTruthy();
    expect(screen.getByText('Gefunden: Zahnstocher')).toBeTruthy();
    expect(screen.getByText('Spießhalter')).toBeTruthy();
    expect(screen.getByText('Noch nicht im Material-Katalog')).toBeTruthy();
  });

  it('applies only selected matched suggestions', async () => {
    const applyMutate = vi.fn();
    (useSuggestRecipeMaterials as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      data: suggestionsFixture,
      reset: vi.fn(),
    });
    (useApplyRecipeMaterials as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      mutate: applyMutate,
      isPending: false,
      reset: vi.fn(),
    });
    renderDialog();

    fireEvent.click(screen.getByTestId('suggestion-checkbox-12'));
    fireEvent.click(screen.getByTestId('materials-apply-suggestions'));

    await waitFor(() => {
      expect(applyMutate).toHaveBeenCalledWith(
        [{ material_id: 12, quantity: '30 Stück' }],
        expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) }),
      );
    });
  });

  it('offers no checkbox for unmatched suggestions', () => {
    (useSuggestRecipeMaterials as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      data: suggestionsFixture,
      reset: vi.fn(),
    });
    renderDialog();

    expect(screen.queryByTestId('suggestion-checkbox-null')).toBeNull();
  });
});
