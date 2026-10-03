// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BuffetBuilder } from './BuffetBuilder';
import {
  useBuffetTemplates,
  useBuffetCatalog,
  useBuffetState,
  useBuffetPreview,
  useSaveBuffet,
} from '@/api/buffet';
import type { BuffetTemplate, BuffetCatalog, BuffetState, BuffetResult } from '@/schemas/buffet';

vi.mock('@/api/buffet', () => ({
  useBuffetTemplates: vi.fn(),
  useBuffetCatalog: vi.fn(),
  useBuffetState: vi.fn(),
  useBuffetPreview: vi.fn(),
  useSaveBuffet: vi.fn(),
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const baguetteTemplate: BuffetTemplate = {
  id: 1,
  name: 'Belegte Baguettes',
  slug: 'baguettes',
  description: '',
  meal_types: ['lunch', 'dinner'],
  sort_order: 20,
  roles: [],
};

const breakfastTemplate: BuffetTemplate = {
  id: 2,
  name: 'Frühstück',
  slug: 'breakfast',
  description: '',
  meal_types: ['breakfast'],
  sort_order: 10,
  roles: [],
};

function makeCatalog(overrides: Partial<BuffetCatalog> = {}): BuffetCatalog {
  return {
    template_slug: 'baguettes',
    gram_unit_id: 1,
    ml_unit_id: 2,
    roles: [
      {
        role: { slug: 'buffet-bread', name: 'Brot & Gebäck', icon: '' },
        amount_per_person: 150,
        unit: 'g',
        enabled_by_default: true,
        items: [
          { kind: 'ingredient', id: 10, name: 'Baguette', default_selected: true, energy_kcal_per_100g: 250, price_per_kg: 3 },
          { kind: 'ingredient', id: 11, name: 'Ciabatta', default_selected: false, energy_kcal_per_100g: 260, price_per_kg: 3.5 },
        ],
      },
      {
        role: { slug: 'buffet-sweet', name: 'Belag süß', icon: '' },
        amount_per_person: 20,
        unit: 'g',
        enabled_by_default: false,
        items: [
          { kind: 'ingredient', id: 20, name: 'Nutella', default_selected: false, energy_kcal_per_100g: 540, price_per_kg: 8 },
        ],
      },
    ],
    ...overrides,
  };
}

const emptyState: BuffetState = { template_id: null, selections: [], role_amounts: {} };

function makeResult(overrides: Partial<BuffetResult> = {}): BuffetResult {
  return {
    saved: false,
    portions: 4,
    items: [],
    energy_kcal_per_person: 400,
    target_kcal_per_person: 800,
    cost_per_person: 1.2,
    cost_total: 4.8,
    warnings: [],
    ...overrides,
  };
}

const previewFn = vi.fn();
const saveMutate = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useBuffetTemplates).mockReturnValue({
    data: [baguetteTemplate, breakfastTemplate],
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  } as unknown as ReturnType<typeof useBuffetTemplates>);
  vi.mocked(useBuffetState).mockReturnValue({
    data: emptyState,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  } as unknown as ReturnType<typeof useBuffetState>);
  vi.mocked(useBuffetCatalog).mockReturnValue({
    data: makeCatalog(),
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  } as unknown as ReturnType<typeof useBuffetCatalog>);
  vi.mocked(useBuffetPreview).mockReturnValue({
    preview: previewFn,
    result: makeResult(),
    isPending: false,
    error: null,
    reset: vi.fn(),
  } as unknown as ReturnType<typeof useBuffetPreview>);
  vi.mocked(useSaveBuffet).mockReturnValue({
    mutate: saveMutate,
    isPending: false,
  } as unknown as ReturnType<typeof useSaveBuffet>);
});

function renderBuilder(props: Partial<Parameters<typeof BuffetBuilder>[0]> = {}) {
  return render(
    <BuffetBuilder
      open
      onOpenChange={vi.fn()}
      mealPlanId={1}
      mealId={2}
      mealType="lunch"
      normPortions={4}
      {...props}
    />,
  );
}

describe('BuffetBuilder', () => {
  it('preselects the template for the meal type and shows its roles with default items checked', () => {
    renderBuilder();

    expect(screen.getByText('Brot & Gebäck')).toBeInTheDocument();
    expect(screen.getByText('Belag süß')).toBeInTheDocument();
    // enabled_by_default role starts expanded with its default item selected
    const baguetteChip = screen.getByText('Baguette').closest('button');
    expect(baguetteChip).toHaveClass('border-primary');
  });

  it('collapses a role that is not enabled by default and has no selection', () => {
    renderBuilder();

    // "Belag süß" is enabled_by_default: false -> collapsed, chips not shown
    expect(screen.queryByText('Nutella')).not.toBeInTheDocument();
  });

  it('toggles item selection on click', () => {
    renderBuilder();

    const ciabattaChip = screen.getByText('Ciabatta').closest('button')!;
    expect(ciabattaChip).not.toHaveClass('border-primary');
    fireEvent.click(ciabattaChip);
    expect(ciabattaChip).toHaveClass('border-primary');
  });

  it('sends a dry-run preview reflecting the current selection', async () => {
    renderBuilder();

    await waitFor(() => expect(previewFn).toHaveBeenCalled());
    const lastCall = previewFn.mock.calls[previewFn.mock.calls.length - 1]?.[0];
    expect(lastCall.templateId).toBe(1);
    expect(lastCall.selections).toEqual([{ role_slug: 'buffet-bread', ingredient_id: 10, recipe_id: null }]);
  });

  it('shows no default selection when the template has none for a role', () => {
    vi.mocked(useBuffetCatalog).mockReturnValue({
      data: makeCatalog({
        roles: [
          {
            role: { slug: 'buffet-bread', name: 'Brot & Gebäck', icon: '' },
            amount_per_person: 150,
            unit: 'g',
            enabled_by_default: true,
            items: [{ kind: 'ingredient', id: 10, name: 'Baguette', default_selected: false }],
          },
        ],
      }),
      isLoading: false,
    } as unknown as ReturnType<typeof useBuffetCatalog>);

    renderBuilder();

    const chip = screen.getByText('Baguette').closest('button');
    expect(chip).not.toHaveClass('border-primary');
  });

  it('shows a search field only when a role has more than 8 items', () => {
    const manyItems = Array.from({ length: 9 }, (_, i) => ({
      kind: 'ingredient' as const,
      id: 100 + i,
      name: `Zutat ${i}`,
      default_selected: false,
    }));
    vi.mocked(useBuffetCatalog).mockReturnValue({
      data: makeCatalog({
        roles: [
          {
            role: { slug: 'buffet-bread', name: 'Brot & Gebäck', icon: '' },
            amount_per_person: 150,
            unit: 'g',
            enabled_by_default: true,
            items: manyItems,
          },
        ],
      }),
      isLoading: false,
    } as unknown as ReturnType<typeof useBuffetCatalog>);

    renderBuilder();

    expect(screen.getByPlaceholderText('Suchen...')).toBeInTheDocument();
  });

  it('restores the saved selection and amounts when reopening', () => {
    vi.mocked(useBuffetState).mockReturnValue({
      data: {
        template_id: 1,
        selections: [{ role_slug: 'buffet-sweet', ingredient_id: 20, recipe_id: null }],
        role_amounts: { 'buffet-sweet': 35 },
      },
    } as unknown as ReturnType<typeof useBuffetState>);

    renderBuilder();

    // The restored role is expanded (it has a selection) even though not enabled_by_default.
    expect(screen.getByText('Nutella')).toBeInTheDocument();
    const nutellaChip = screen.getByText('Nutella').closest('button');
    expect(nutellaChip).toHaveClass('border-primary');
    expect(screen.getByLabelText('Menge pro Person für Belag süß')).toHaveValue(35);
  });

  it('saves with the current selection and amounts', () => {
    renderBuilder();

    fireEvent.click(screen.getByTestId('buffet-save'));

    expect(saveMutate).toHaveBeenCalledWith(
      {
        templateId: 1,
        selections: [{ role_slug: 'buffet-bread', ingredient_id: 10, recipe_id: null }],
        roleAmounts: { 'buffet-bread': 150 },
      },
      expect.anything(),
    );
  });

  it('shows a retry control when buffet catalog loading fails', async () => {
    const refetchTemplates = vi.fn();
    const refetchState = vi.fn();
    const refetchCatalog = vi.fn();
    vi.mocked(useBuffetTemplates).mockReturnValue({
      data: [baguetteTemplate, breakfastTemplate],
      isLoading: false,
      error: null,
      refetch: refetchTemplates,
    } as unknown as ReturnType<typeof useBuffetTemplates>);
    vi.mocked(useBuffetState).mockReturnValue({
      data: emptyState,
      isLoading: false,
      error: null,
      refetch: refetchState,
    } as unknown as ReturnType<typeof useBuffetState>);
    vi.mocked(useBuffetCatalog).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Serverfehler (HTTP 500). Bitte versuche es später erneut.'),
      refetch: refetchCatalog,
    } as unknown as ReturnType<typeof useBuffetCatalog>);

    renderBuilder();

    expect(screen.getByRole('alert')).toHaveTextContent('Serverfehler (HTTP 500)');
    fireEvent.click(screen.getByRole('button', { name: 'Erneut versuchen' }));
    await waitFor(() => {
      expect(refetchTemplates).toHaveBeenCalledTimes(1);
      expect(refetchState).toHaveBeenCalledTimes(1);
      expect(refetchCatalog).toHaveBeenCalledTimes(1);
    });
  });

  it('closes the builder after a successful save', () => {
    const onOpenChange = vi.fn();
    renderBuilder({ onOpenChange });

    fireEvent.click(screen.getByTestId('buffet-save'));
    const callbacks = saveMutate.mock.calls[0]?.[1] as { onSuccess?: () => void } | undefined;
    callbacks?.onSuccess?.();

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('keeps the builder open and selected items intact after a save failure', () => {
    const onOpenChange = vi.fn();
    renderBuilder({ onOpenChange });

    fireEvent.click(screen.getByTestId('buffet-save'));
    const callbacks = saveMutate.mock.calls[0]?.[1] as { onError?: (error: Error) => void } | undefined;
    callbacks?.onError?.(new Error('Serverfehler (HTTP 500). Bitte versuche es später erneut.'));

    expect(onOpenChange).not.toHaveBeenCalledWith(false);
    expect(screen.getByTestId('buffet-role-buffet-bread')).toBeInTheDocument();
    expect(screen.getByText('Baguette').closest('button')).toHaveClass('border-primary');
  });

  it('shows a retry control for preview server errors', () => {
    vi.mocked(useBuffetPreview).mockReturnValue({
      preview: previewFn,
      result: null,
      isPending: false,
      error: new Error('Serverfehler (HTTP 500). Bitte versuche es später erneut.'),
      reset: vi.fn(),
    } as unknown as ReturnType<typeof useBuffetPreview>);

    renderBuilder();

    expect(screen.getByRole('alert')).toHaveTextContent('Serverfehler (HTTP 500)');
    const callsBeforeRetry = previewFn.mock.calls.length;
    fireEvent.click(screen.getByRole('button', { name: 'Erneut versuchen' }));
    expect(previewFn).toHaveBeenCalledTimes(callsBeforeRetry + 1);
  });

  it('shows warnings from the preview', () => {
    vi.mocked(useBuffetPreview).mockReturnValue({
      preview: previewFn,
      result: makeResult({ warnings: [{ ingredient_name: 'Baguette', per_person_value: 2000, per_person_unit: 'g', total_value: 8, total_unit: 'kg', message: 'Baguette: 2000 g pro Person – bitte prüfen.' }] }),
      isPending: false,
      error: null,
      reset: vi.fn(),
    } as unknown as ReturnType<typeof useBuffetPreview>);

    renderBuilder();

    expect(screen.getByText(/bitte prüfen/)).toBeInTheDocument();
  });
});
