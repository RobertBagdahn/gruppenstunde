import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import PortionRepairList from './PortionRepairList';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockFindings = [
  {
    id: 1,
    portion_id: 10,
    ingredient_id: 100,
    ingredient_name: 'Ei',
    portion_name: 'Stück',
    detection_reason: 'piece_name_one_gram',
    status: 'pending_review',
    before_snapshot: {
      name: 'Stück',
      weight_g: 1,
      quantity: 1,
      rank: 1,
      measuring_unit_id: 1,
      measuring_unit_name: 'Gramm',
      measuring_unit_unit: 'g',
    },
    recipe_item_ids: [201, 202, 203],
    ai_proposal: {
      classification: 'piece',
      proposed_name: 'Stück',
      proposed_weight_g: 60,
      proposed_quantity: 1,
      proposed_unit_name: 'Stück',
      confidence: 0.7,
      rationale: 'Ein Ei wiegt ca. 60g',
    },
    confidence: 0.7,
    prompt_version: '1',
    threshold: 0.9,
    applied_portion_id: null,
    moved_recipe_item_ids: [],
    affected_recipe_ids: [],
    applied_at: null,
    rejected_at: null,
    created_at: '2026-09-15T10:00:00',
  },
  {
    id: 2,
    portion_id: 11,
    ingredient_id: 101,
    ingredient_name: 'Tomate',
    portion_name: 'Stück',
    detection_reason: 'piece_name_gram_unit',
    status: 'ready',
    before_snapshot: {
      name: 'Stück',
      weight_g: 50,
      quantity: 1,
      rank: 1,
      measuring_unit_id: 1,
      measuring_unit_name: 'Gramm',
      measuring_unit_unit: 'g',
    },
    recipe_item_ids: [],
    ai_proposal: {
      classification: 'piece',
      proposed_name: 'Stück',
      proposed_weight_g: 120,
      proposed_quantity: 1,
      proposed_unit_name: 'Stück',
      confidence: 0.95,
      rationale: 'Eine Tomate wiegt ca. 120g',
    },
    confidence: 0.95,
    prompt_version: '1',
    threshold: 0.9,
    applied_portion_id: null,
    moved_recipe_item_ids: [],
    affected_recipe_ids: [],
    applied_at: null,
    rejected_at: null,
    created_at: '2026-09-15T10:01:00',
  },
  {
    id: 3,
    portion_id: 12,
    ingredient_id: 102,
    ingredient_name: 'Käse',
    portion_name: 'Scheibe',
    detection_reason: 'piece_name_one_gram',
    status: 'applied',
    before_snapshot: {
      name: 'Scheibe',
      weight_g: 1,
      quantity: 1,
      rank: 1,
      measuring_unit_id: 1,
      measuring_unit_name: 'Gramm',
      measuring_unit_unit: 'g',
    },
    recipe_item_ids: [301],
    ai_proposal: {
      classification: 'piece',
      proposed_name: 'Scheibe',
      proposed_weight_g: 30,
      proposed_quantity: 1,
      proposed_unit_name: 'Stück',
      confidence: 0.96,
      rationale: 'Eine Käsescheibe wiegt ca. 30g',
    },
    confidence: 0.96,
    prompt_version: '1',
    threshold: 0.9,
    applied_portion_id: 13,
    moved_recipe_item_ids: [301],
    affected_recipe_ids: [7],
    applied_at: '2026-09-15T11:00:00',
    rejected_at: null,
    created_at: '2026-09-15T10:02:00',
  },
];

const mockApply = vi.fn().mockResolvedValue({
  applied: true,
  finding_id: 1,
  applied_portion_id: 14,
  moved_recipe_item_ids: [201, 202, 203],
  affected_recipe_ids: [5],
});

const mockReject = vi.fn().mockResolvedValue({
  finding_id: 1,
  status: 'rejected',
});

vi.mock('@/api/portionRepair', () => ({
  usePortionRepairFindings: () => ({
    data: {
      items: mockFindings,
      total: 3,
      page: 1,
      page_size: 20,
      total_pages: 1,
    },
    isLoading: false,
    error: null,
  }),
  usePortionRepairApply: () => ({
    mutateAsync: mockApply,
    isPending: false,
  }),
  usePortionRepairReject: () => ({
    mutateAsync: mockReject,
    isPending: false,
  }),
}));

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('PortionRepairList', () => {
  it('renders findings with before/after values, confidence and affected counts', () => {
    renderWithClient(<PortionRepairList />);

    expect(screen.getByText('Ei')).toBeInTheDocument();
    expect(screen.getByText('Tomate')).toBeInTheDocument();
    expect(screen.getByText('Käse')).toBeInTheDocument();
    expect(screen.getByText(/3 Rezept-Zutat\(en\)/)).toBeInTheDocument();
    expect(screen.getByText(/1 Zutat\(en\) umgestellt/)).toBeInTheDocument();
    expect(screen.getAllByText('Anwenden').length).toBe(2);
  });

  it('applies a finding after confirmation', async () => {
    renderWithClient(<PortionRepairList />);

    fireEvent.click(screen.getAllByText('Anwenden')[0]);
    fireEvent.click(screen.getByText('Ja, anwenden'));

    await waitFor(() => {
      expect(mockApply).toHaveBeenCalledWith(1);
    });
  });

  it('rejects a finding after confirmation', async () => {
    renderWithClient(<PortionRepairList />);

    fireEvent.click(screen.getAllByText('Ablehnen')[0]);
    fireEvent.click(screen.getByText('Ja, ablehnen'));

    await waitFor(() => {
      expect(mockReject).toHaveBeenCalledWith(1);
    });
  });

  it('does not show actions for applied findings', () => {
    renderWithClient(<PortionRepairList />);

    const rejectButtons = screen.getAllByText('Ablehnen');
    expect(rejectButtons.length).toBe(2);
  });
});
