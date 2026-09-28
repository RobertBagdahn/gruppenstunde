import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PackageSuggestionsPanel from './PackageSuggestionsPanel';
import type { PackageSuggestion, PackageSuggestionFilters } from '@/schemas/dataOffensive';

const acceptMutate = vi.fn();
const rejectMutate = vi.fn();
const patchMutateAsync = vi.fn().mockResolvedValue({});
const runChunk = vi.fn();

function suggestion(overrides: Partial<PackageSuggestion> = {}): PackageSuggestion {
  return {
    id: 1,
    ingredient_id: 10,
    ingredient_name: 'Spaghetti',
    ingredient_slug: 'spaghetti',
    retail_section_id: 3,
    retail_section_name: 'Nudeln & Reis',
    package_name: 'Packung',
    weight_g: 500,
    volume_ml: null,
    physical_viscosity: 'solid',
    physical_density: null,
    confidence: 0.92,
    reason: 'Übliche Größe',
    status: 'pending',
    viscosity_is_manual: false,
    created_at: '2026-09-28T10:00:00Z',
    can_edit: true,
    can_delete: false,
    ...overrides,
  };
}

let items: PackageSuggestion[] = [];

vi.mock('@/api/dataOffensive', () => ({
  usePackageSuggestEstimate: () => ({
    data: { dry_run: true, candidates: 638, estimated_calls: 43, estimated_cost_eur: 0.129, remaining: 638 },
  }),
  usePackageSuggestions: () => ({
    data: { items, total: items.length, page: 1, page_size: 50, total_pages: 1 },
    isLoading: false,
    isFetching: false,
    error: null,
    refetch: vi.fn(),
  }),
  useRetailSectionOptions: () => ({ data: [{ id: 3, name: 'Nudeln & Reis', rank: 1, ingredient_count: 5 }] }),
  useDecidePackageSuggestions: (action: 'accept' | 'reject') => ({
    mutate: action === 'accept' ? acceptMutate : rejectMutate,
    isPending: false,
  }),
  usePatchPackageSuggestion: () => ({ mutateAsync: patchMutateAsync }),
  useInvalidateOffensive: () => vi.fn(),
  runPackageSuggestChunk: (...args: unknown[]) => runChunk(...args),
}));

function renderPanel(filters: PackageSuggestionFilters = { status: 'pending', page: 1, page_size: 50 }) {
  const onFiltersChange = vi.fn();
  render(
    <MemoryRouter>
      <PackageSuggestionsPanel filters={filters} onFiltersChange={onFiltersChange} onNotify={vi.fn()} />
    </MemoryRouter>,
  );
  return { onFiltersChange };
}

describe('PackageSuggestionsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    items = [suggestion(), suggestion({ id: 2, ingredient_name: 'Rapsöl', ingredient_slug: 'rapsoel', package_name: '1-l-Flasche', weight_g: 920, volume_ml: 1000, physical_viscosity: 'liquid', physical_density: 0.92, confidence: 0.6 })];
  });

  it('shows the cost estimate before the AI run', () => {
    renderPanel();
    expect(screen.getByTestId('package-estimate')).toHaveTextContent('638 Zutaten ohne Standardpackung · 43 KI-Aufrufe · ≈ 0,13 €');
  });

  it('renders suggestions with package label, confidence and liquid data', () => {
    renderPanel();
    expect(screen.getByText('500-g-Packung')).toBeInTheDocument();
    expect(screen.getByText('92 %')).toBeInTheDocument();
    expect(screen.getByText('1-l-Flasche')).toBeInTheDocument();
    expect(screen.getByText(/Flüssig · Dichte 0,92 g\/ml/)).toBeInTheDocument();
  });

  it('accepts a single suggestion', () => {
    renderPanel();
    fireEvent.click(screen.getAllByRole('button', { name: /Übernehmen/ })[0]);
    expect(acceptMutate).toHaveBeenCalledWith({ ids: [1] }, expect.any(Object));
  });

  it('rejects the selected suggestions in bulk', () => {
    renderPanel();
    fireEvent.click(screen.getByLabelText('Spaghetti auswählen'));
    fireEvent.click(screen.getByLabelText('Rapsöl auswählen'));
    expect(screen.getByText('2 ausgewählt')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Auswahl verwerfen' }));
    expect(rejectMutate).toHaveBeenCalledWith({ ids: [1, 2] }, expect.any(Object));
  });

  it('accepts all suggestions from 80 % confidence after confirmation', () => {
    renderPanel();
    fireEvent.click(screen.getByRole('button', { name: /Alle mit Konfidenz ≥ 80 % übernehmen/ }));
    expect(acceptMutate).not.toHaveBeenCalled();
    const confirmButtons = screen.getAllByRole('button', { name: 'Übernehmen' });
    fireEvent.click(confirmButtons[confirmButtons.length - 1]);
    expect(acceptMutate).toHaveBeenCalledWith({ min_confidence: 0.8, section_id: undefined }, expect.any(Object));
  });

  it('uses the confidence filter as bulk threshold', () => {
    renderPanel({ status: 'pending', min_confidence: 0.9, section_id: 3, page: 1, page_size: 50 });
    expect(screen.getByRole('button', { name: /Alle mit Konfidenz ≥ 90 % übernehmen/ })).toBeInTheDocument();
  });

  it('edits a suggestion inline', async () => {
    renderPanel();
    fireEvent.click(screen.getAllByRole('button', { name: 'Bearbeiten' })[0]);
    fireEvent.change(screen.getByLabelText('Packungsname'), { target: { value: '1-kg-Packung' } });
    fireEvent.change(screen.getByLabelText('Gewicht in Gramm'), { target: { value: '1000' } });
    fireEvent.click(screen.getByRole('button', { name: /Speichern/ }));
    expect(patchMutateAsync).toHaveBeenCalledWith(
      { id: 1, patch: { package_name: '1-kg-Packung', weight_g: 1000 } },
      expect.any(Object),
    );
  });

  it('writes filter changes to the URL state handler', () => {
    const { onFiltersChange } = renderPanel();
    fireEvent.change(screen.getByLabelText('Konfidenz filtern'), { target: { value: '0.8' } });
    expect(onFiltersChange).toHaveBeenCalledWith(expect.objectContaining({ min_confidence: 0.8, page: 1 }));
  });

  it('runs the AI suggestions chunk by chunk', async () => {
    runChunk.mockResolvedValueOnce({ suggested: 45, remaining: 0, errors: [] });
    renderPanel();
    fireEvent.click(screen.getByRole('button', { name: /Packungen vorschlagen/ }));
    expect(runChunk).toHaveBeenCalledWith(45);
    expect(await screen.findByText(/45 Vorschläge/)).toBeInTheDocument();
  });
});
