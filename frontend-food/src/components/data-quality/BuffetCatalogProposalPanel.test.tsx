// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ApiError } from '@/lib/api';
import { toast } from 'sonner';
import BuffetCatalogProposalPanel from './BuffetCatalogProposalPanel';
import {
  useBuffetCandidates,
  useBuffetDataQualityReport,
  useBuffetDataProposals,
  useCreateBuffetProposal,
  useExportBuffetProposals,
  usePreviewBuffetProposal,
  useReviewBuffetProposal,
  useSuggestBuffetItem,
  useUpdateBuffetProposal,
} from '@/api/dataQuality';

vi.mock('@/hooks/usePersistedListState', () => ({
  usePersistedListState: () => ({
    state: {
      q: '', action: 'all', kind: 'all', role_slug: '', status: 'pending',
      candidate_page: 1, proposal_page: 1, report_page: 1,
    },
    patch: vi.fn(),
  }),
}));

vi.mock('@/api/dataQuality', () => ({
  useBuffetCandidates: vi.fn(),
  useBuffetDataQualityReport: vi.fn(),
  useBuffetDataProposals: vi.fn(),
  useCreateBuffetProposal: vi.fn(),
  useExportBuffetProposals: vi.fn(),
  usePreviewBuffetProposal: vi.fn(),
  useReviewBuffetProposal: vi.fn(),
  useSuggestBuffetItem: vi.fn(),
  useUpdateBuffetProposal: vi.fn(),
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const proposal = {
  id: 44,
  action: 'add' as const,
  item_kind: 'ingredient' as const,
  source_id: 101,
  source_expected_name: 'Cocktailtomaten',
  target_id: null,
  target_expected_name: '',
  role_slugs: ['buffet-fresh'],
  proposed_data: {},
  origin: 'manual' as const,
  ai_confidence: null,
  rationale: '',
  status: 'pending' as const,
  created_by_name: 'staff',
  reviewed_by_name: null,
  review_note: '',
  preview_current: false,
  preview_result: {},
  created_at: '2026-10-03T00:00:00Z',
  updated_at: '2026-10-03T00:00:00Z',
  reviewed_at: null,
};

const candidate = {
  candidate_key: 'add:ingredient:101:buffet-fresh',
  action: 'add' as const,
  item_kind: 'ingredient' as const,
  source_id: 101,
  source_name: 'Cocktailtomaten',
  target_id: null,
  target_name: null,
  role_slugs: ['buffet-fresh'],
  retail_section: 'Obst',
  recipe_type: null,
  is_standalone_food: true,
  similarity: null,
  candidate_status: 'available' as const,
  rationale: 'Kandidat aus der Retail-Section',
};

const createMutate = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useBuffetCandidates).mockReturnValue({
    data: { items: [candidate], total: 1, page: 1, page_size: 20, total_pages: 1 },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  } as unknown as ReturnType<typeof useBuffetCandidates>);
  vi.mocked(useBuffetDataQualityReport).mockReturnValue({
    data: {
      items: [],
      total: 0,
      page: 1,
      page_size: 20,
      total_pages: 1,
      summary: { missing_energy: 0, unverified: 0, missing_retail_section: 0, legacy_tag_carriers: 0 },
    },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  } as unknown as ReturnType<typeof useBuffetDataQualityReport>);
  vi.mocked(useBuffetDataProposals).mockReturnValue({
    data: { items: [proposal], total: 1, page: 1, page_size: 20, total_pages: 1 },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  } as unknown as ReturnType<typeof useBuffetDataProposals>);
  vi.mocked(useCreateBuffetProposal).mockReturnValue({
    mutateAsync: createMutate.mockResolvedValue(proposal),
    isPending: false,
  } as unknown as ReturnType<typeof useCreateBuffetProposal>);
  vi.mocked(useUpdateBuffetProposal).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as unknown as ReturnType<typeof useUpdateBuffetProposal>);
  vi.mocked(useSuggestBuffetItem).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as unknown as ReturnType<typeof useSuggestBuffetItem>);
  vi.mocked(usePreviewBuffetProposal).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as unknown as ReturnType<typeof usePreviewBuffetProposal>);
  vi.mocked(useReviewBuffetProposal).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as unknown as ReturnType<typeof useReviewBuffetProposal>);
  vi.mocked(useExportBuffetProposals).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as unknown as ReturnType<typeof useExportBuffetProposals>);
});

describe('BuffetCatalogProposalPanel', () => {
  it('shows candidates and creates a pending role proposal without applying it', async () => {
    render(<BuffetCatalogProposalPanel />);

    expect(screen.getAllByText('Cocktailtomaten').length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: 'Vorschlag anlegen' }));

    await waitFor(() => expect(createMutate).toHaveBeenCalledWith(expect.objectContaining({
      action: 'add',
      source_id: 101,
      source_expected_name: 'Cocktailtomaten',
      role_slugs: ['buffet-fresh'],
    })));
    expect(screen.getByText(/Freigabe exportiert nur ein Mapping/)).toBeInTheDocument();
  });

  it('offers manual entry and an optional AI suggestion action', () => {
    render(<BuffetCatalogProposalPanel />);
    fireEvent.click(screen.getByRole('button', { name: 'Neuen Vorschlag erfassen' }));

    expect(screen.getByLabelText('Zutatenname')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'KI-Vorschlag erzeugen' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Als Vorschlag speichern' })).toBeInTheDocument();
  });

  it('keeps the form open and shows the server message when required fields are missing', async () => {
    createMutate.mockRejectedValueOnce(new ApiError(422, 'Unprocessable', { detail: 'Der Name der neuen Zutat fehlt.' }));
    render(<BuffetCatalogProposalPanel />);
    fireEvent.click(screen.getByRole('button', { name: 'Neuen Vorschlag erfassen' }));

    fireEvent.click(screen.getByRole('button', { name: 'Als Vorschlag speichern' }));

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    const [title, options] = vi.mocked(toast.error).mock.calls[0] as [string, { description: string }];
    expect(title).toBe('Vorschlag konnte nicht gespeichert werden');
    expect(options.description).toBe('Der Name der neuen Zutat fehlt.');
    expect(screen.getByLabelText('Zutatenname')).toBeInTheDocument();
  });

  it('prefills the form from an AI suggestion, lets staff edit it and saves it as a mixed proposal', async () => {
    const suggest = vi.fn().mockResolvedValue({
      name: 'Salzstangen',
      ai_interaction_id: 'ai-1',
      proposed_data: { name: 'Salzstangen', energy_kcal: 380, retail_section: 'Knabberartikel', is_standalone_food: true },
    });
    vi.mocked(useSuggestBuffetItem).mockReturnValue({ mutateAsync: suggest, isPending: false } as unknown as ReturnType<typeof useSuggestBuffetItem>);
    render(<BuffetCatalogProposalPanel />);
    fireEvent.click(screen.getByRole('button', { name: 'Neuen Vorschlag erfassen' }));

    fireEvent.change(screen.getByLabelText('Zutatenname'), { target: { value: 'Salzstange' } });
    fireEvent.click(screen.getByRole('button', { name: 'KI-Vorschlag erzeugen' }));
    await waitFor(() => expect((screen.getByLabelText('Energie (kcal/100 g)') as HTMLInputElement).value).toBe('380'));
    expect((screen.getByLabelText('Zutatenname') as HTMLInputElement).value).toBe('Salzstangen');

    fireEvent.change(screen.getByLabelText('Energie (kcal/100 g)'), { target: { value: '385' } });
    fireEvent.click(screen.getByRole('button', { name: 'Als Vorschlag speichern' }));

    await waitFor(() => expect(createMutate).toHaveBeenCalledWith(expect.objectContaining({
      action: 'create',
      origin: 'mixed',
      proposed_data: expect.objectContaining({ name: 'Salzstangen', energy_kcal: 385, ai_interaction_id: 'ai-1' }),
    })));
  });

  it('blocks approval while the preview is stale and enables it after a current preview', () => {
    vi.mocked(useBuffetDataProposals).mockReturnValue({
      data: {
        items: [{ ...proposal, id: 44, preview_current: false }, { ...proposal, id: 45, preview_current: true }],
        total: 2,
        page: 1,
        page_size: 20,
        total_pages: 1,
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useBuffetDataProposals>);
    render(<BuffetCatalogProposalPanel />);

    const approve = screen.getAllByRole('button', { name: 'Freigeben' });
    expect(approve[0]).toBeDisabled();
    expect(approve[1]).toBeEnabled();
    expect(screen.getAllByText('Vor Freigabe erst erneut testen')).toHaveLength(1);
  });

  it('exports the approved mapping as a JSON download', async () => {
    const exportMutate = vi.fn().mockResolvedValue({ approved: [] });
    vi.mocked(useExportBuffetProposals).mockReturnValue({ mutateAsync: exportMutate, isPending: false } as unknown as ReturnType<typeof useExportBuffetProposals>);
    const createUrl = vi.fn(() => 'blob:mapping');
    const revokeUrl = vi.fn();
    Object.assign(URL, { createObjectURL: createUrl, revokeObjectURL: revokeUrl });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    render(<BuffetCatalogProposalPanel />);

    fireEvent.click(screen.getByRole('button', { name: 'Mapping exportieren' }));

    await waitFor(() => expect(exportMutate).toHaveBeenCalledTimes(1));
    expect(createUrl).toHaveBeenCalledTimes(1);
    expect(click).toHaveBeenCalledTimes(1);
    expect(toast.success).toHaveBeenCalled();
    click.mockRestore();
  });
});
