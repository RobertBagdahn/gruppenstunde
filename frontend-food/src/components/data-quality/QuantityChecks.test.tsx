import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AliasConflictList, QuantityOutlierList, SuspiciousPortionList } from './QuantityChecks';
import {
  useAliasConflicts,
  useDismissDuplicate,
  useRecipeQuantityOutliers,
  useRecipeUndividedLines,
  useSuspiciousPortions,
} from '@/api/dataQuality';
import QuantityOutlierBadge from '@/components/recipe/QuantityOutlierBadge';

vi.mock('@/api/dataQuality', () => ({
  useRecipeQuantityOutliers: vi.fn(),
  useRecipeUndividedLines: vi.fn(),
  useSuspiciousPortions: vi.fn(),
  useAliasConflicts: vi.fn(),
  useDismissDuplicate: vi.fn(),
}));
vi.mock('@/components/ingredients/IngredientMergeDialog', () => ({
  default: ({ currentIngredient, preSelectedTarget }: { currentIngredient: { name: string }; preSelectedTarget: { name: string } }) => (
    <div role="dialog">
      {preSelectedTarget.name} → {currentIngredient.name}
    </div>
  ),
}));

function infinite<T>(items: T[], total = items.length, hasNextPage = false) {
  return {
    isPending: false,
    isError: false,
    error: null,
    data: { pages: [{ items, total, page: 1, page_size: 20, total_pages: hasNextPage ? 2 : 1 }], pageParams: [1] },
    hasNextPage,
    isFetchingNextPage: false,
    fetchNextPage: vi.fn(),
    refetch: vi.fn(),
  } as never;
}

const outlierRow = {
  recipe_id: 528,
  recipe_title: 'Sweet Onion Sauce',
  recipe_slug: 'sweet-onion-sauce',
  recipe_item_id: 3836,
  ingredient_id: 38,
  ingredient_name: 'Speisezwiebel',
  quantity: 2,
  unit_label: 'mittelgroße Zwiebel',
  outlier: {
    kind: 'high_quantity' as const,
    severity: 'danger' as const,
    grams_per_person: 160,
    median_g: 25,
    p90_g: 60,
    sample_count: 40,
    message: '160 g pro Person – üblich sind 25 g',
  },
};

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe('QuantityChecks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useRecipeUndividedLines).mockReturnValue(infinite([]));
  });

  it('lists outliers with message and loads more pages', () => {
    const query = infinite([outlierRow], 25, true);
    vi.mocked(useRecipeQuantityOutliers).mockReturnValue(query);

    renderWithRouter(<QuantityOutlierList />);

    expect(screen.getByText('Sweet Onion Sauce')).toBeInTheDocument();
    expect(screen.getByText('160 g pro Person – üblich sind 25 g')).toBeInTheDocument();
    expect(screen.getByText('1 von 25')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Mehr laden' }));
    expect((query as unknown as { fetchNextPage: () => void }).fetchNextPage).toHaveBeenCalled();
  });

  it('filters by severity', () => {
    vi.mocked(useRecipeQuantityOutliers).mockReturnValue(infinite([]));

    renderWithRouter(<QuantityOutlierList />);
    fireEvent.click(screen.getByRole('radio', { name: 'Stark' }));

    expect(useRecipeQuantityOutliers).toHaveBeenLastCalledWith('danger');
    expect(screen.getByText('Keine auffälligen Mengen gefunden.')).toBeInTheDocument();
  });

  it('shows suspicious piece portions with usage', () => {
    vi.mocked(useSuspiciousPortions).mockReturnValue(
      infinite([
        {
          portion_id: 47626,
          portion_name: '1 Stück (150g)',
          weight_g: 150,
          weight_status: 'imported',
          ingredient_id: 30,
          ingredient_name: 'Eisbergsalat',
          ingredient_slug: 'eisbergsalat',
          recipe_count: 8,
          meal_item_count: 0,
        },
      ]),
    );

    renderWithRouter(<SuspiciousPortionList />);

    expect(screen.getByText('Eisbergsalat')).toBeInTheDocument();
    expect(screen.getByText('8 Rezepte · 0 Plan-Einträge')).toBeInTheDocument();
  });

  it('merges or dismisses alias conflicts', () => {
    const dismiss = vi.fn();
    vi.mocked(useDismissDuplicate).mockReturnValue({ mutate: dismiss, isPending: false } as never);
    vi.mocked(useAliasConflicts).mockReturnValue(
      infinite([
        {
          kind: 'name_is_alias',
          alias: 'Zwiebel',
          ingredient_id: 7599,
          ingredient_name: 'Zwiebel',
          ingredient_slug: 'zwiebel',
          ingredient_usage: 7,
          conflicting_ingredient_id: 38,
          conflicting_ingredient_name: 'Speisezwiebel',
          conflicting_ingredient_slug: 'speisezwiebel',
          conflicting_ingredient_usage: 98,
        },
      ]),
    );

    renderWithRouter(<AliasConflictList />);
    fireEvent.click(screen.getByRole('button', { name: 'Kein Duplikat' }));
    expect(dismiss).toHaveBeenCalledWith({ ingredient_a_id: 7599, ingredient_b_id: 38 }, expect.anything());

    fireEvent.click(screen.getByRole('button', { name: 'Zusammenführen' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('Zwiebel → Speisezwiebel');
  });

  it('badge names the finding and keeps the message accessible', () => {
    render(<QuantityOutlierBadge outlier={{ ...outlierRow.outlier, kind: 'undivided', message: 'Vermutlich nicht durch 4 Personen geteilt' }} />);

    expect(screen.getByText('Nicht geteilt?')).toBeInTheDocument();
    expect(screen.getByText(/Vermutlich nicht durch 4 Personen geteilt/)).toBeInTheDocument();
  });
});
