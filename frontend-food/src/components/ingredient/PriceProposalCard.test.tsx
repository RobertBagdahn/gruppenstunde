import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import PriceProposalCard from './PriceProposalCard';
import type { IngredientDetail } from '@/schemas/supply';

const pendingProposal = {
  id: 7,
  ingredient_id: 1,
  proposed_price_per_kg: 3.49,
  confidence: 0.8,
  rationale: 'Typischer Supermarktpreis.',
  source: 'gemini',
  status: 'pending' as const,
  requested_by_name: 'Staff',
  reviewed_by_name: null,
  reviewed_at: null,
  ai_interaction_id: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

function makeIngredient(overrides: Partial<IngredientDetail> = {}): IngredientDetail {
  return {
    id: 1,
    name: 'Weizenmehl',
    slug: 'weizenmehl',
    description: '',
    status: 'approved',
    physical_density: 1,
    physical_viscosity: 'solid',
    durability_in_days: null,
    max_storage_temperature: null,
    storage_type: null,
    cooking_factor: null,
    camp_suitable: false,
    preparation_time_min: null,
    season_start: null,
    season_end: null,
    energy_kcal: null,
    protein_g: null,
    fat_g: null,
    fat_sat_g: null,
    carbohydrate_g: null,
    sugar_g: null,
    fibre_g: null,
    salt_g: null,
    sodium_mg: null,
    fructose_g: null,
    lactose_g: null,
    child_score: null,
    scout_score: null,
    environmental_score: null,
    nova_score: null,
    fruit_factor: null,
    nutri_score: null,
    nutri_class: null,
    price_per_kg: null,
    price_source: 'missing',
    pending_price_proposal: null,
    fdc_id: null,
    nan_art_id_rewe: null,
    ean: '',
    is_standalone_food: false,
    ingredient_ref_id: null,
    retail_section_id: null,
    retail_section_name: null,
    nutritional_tags: [],
    portions: [],
    packages: [],
    tags: [],
    aliases: [],
    groups: [],
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    created_by_id: null,
    quality_score: null,
    quality_score_updated_at: null,
    can_edit: true,
    can_delete: true,
    ai_interaction_id: null,
    ...overrides,
  } as IngredientDetail;
}

function renderWithClient(ui: React.ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

const mockCreateProposal = vi.fn();
const mockAcceptProposal = vi.fn();
const mockRejectProposal = vi.fn();

vi.mock('@/api/supplies', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/supplies')>();
  return {
    ...actual,
    useCreatePriceProposal: () => ({
      mutate: mockCreateProposal,
      isPending: false,
    }),
    useAcceptPriceProposal: () => ({
      mutate: mockAcceptProposal,
      isPending: false,
    }),
    useRejectPriceProposal: () => ({
      mutate: mockRejectProposal,
      isPending: false,
    }),
  };
});

describe('PriceProposalCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows create button for missing price when editable', () => {
    renderWithClient(<PriceProposalCard ingredient={makeIngredient()} />);

    expect(screen.getByText('Kein Preis hinterlegt')).toBeDefined();
    const button = screen.getByRole('button', { name: /Preis mit KI vorschlagen/ });
    expect(button).toBeDefined();
  });

  it('does not show create button when user cannot edit', () => {
    renderWithClient(
      <PriceProposalCard ingredient={makeIngredient({ can_edit: false })} />,
    );

    expect(screen.queryByRole('button', { name: /Preis mit KI vorschlagen/ })).toBeNull();
    expect(screen.getByText('Kein Preis vorhanden.')).toBeDefined();
  });

  it('shows pending proposal with accept and reject buttons', () => {
    renderWithClient(
      <PriceProposalCard
        ingredient={makeIngredient({ pending_price_proposal: pendingProposal })}
      />,
    );

    expect(screen.getByText('Vorschlag ausstehend')).toBeDefined();
    expect(screen.getByText('Typischer Supermarktpreis.')).toBeDefined();
    expect(screen.getByRole('button', { name: /Bestätigen/ })).toBeDefined();
    expect(screen.getByRole('button', { name: /Ablehnen/ })).toBeDefined();
  });

  it('shows replace checkbox when a positive price exists', () => {
    renderWithClient(
      <PriceProposalCard
        ingredient={makeIngredient({
          price_per_kg: 5.0,
          price_source: 'manual',
          pending_price_proposal: pendingProposal,
        })}
      />,
    );

    expect(screen.getByLabelText('Bestehenden Preis ersetzen')).toBeDefined();
  });

  it('accept triggers mutation with replace flag', () => {
    mockAcceptProposal.mockImplementation((_variables, options) => {
      options?.onSuccess?.();
    });
    renderWithClient(
      <PriceProposalCard
        ingredient={makeIngredient({
          price_per_kg: 5.0,
          price_source: 'manual',
          pending_price_proposal: pendingProposal,
        })}
      />,
    );

    fireEvent.click(screen.getByLabelText('Bestehenden Preis ersetzen'));
    fireEvent.click(screen.getByRole('button', { name: /Bestätigen/ }));

    expect(mockAcceptProposal).toHaveBeenCalledWith(
      { proposalId: 7, replace: true },
      expect.any(Object),
    );
  });

  it('reject triggers mutation', () => {
    renderWithClient(
      <PriceProposalCard
        ingredient={makeIngredient({ pending_price_proposal: pendingProposal })}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Ablehnen/ }));

    expect(mockRejectProposal).toHaveBeenCalledWith(7, expect.any(Object));
  });
});
