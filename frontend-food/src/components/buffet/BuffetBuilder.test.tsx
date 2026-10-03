// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { BuffetBuilder } from './BuffetBuilder';
import {
  useBuffetTemplates,
  useBuffetCatalog,
  useBuffetCatalogSearch,
  useBuffetState,
  useBuffetPreview,
  useSaveBuffet,
} from '@/api/buffet';
import type { BuffetTemplate, BuffetCatalog, BuffetState, BuffetResult } from '@/schemas/buffet';

vi.mock('@/api/buffet', () => ({
  useBuffetTemplates: vi.fn(),
  useBuffetCatalog: vi.fn(),
  useBuffetCatalogSearch: vi.fn(),
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
          { kind: 'ingredient', id: 10, name: 'Baguette', is_favorite: true, is_template_default: true, role_slugs: ['buffet-bread'], default_selected: true, energy_kcal_per_100g: 250, price_per_kg: 3 },
          { kind: 'ingredient', id: 11, name: 'Ciabatta', is_favorite: true, is_template_default: false, role_slugs: ['buffet-bread'], default_selected: false, energy_kcal_per_100g: 260, price_per_kg: 3.5 },
        ],
      },
      {
        role: { slug: 'buffet-sweet', name: 'Belag süß', icon: '' },
        amount_per_person: 20,
        unit: 'g',
        enabled_by_default: false,
        items: [
          { kind: 'ingredient', id: 20, name: 'Nutella', is_favorite: true, is_template_default: false, role_slugs: ['buffet-sweet'], default_selected: false, energy_kcal_per_100g: 540, price_per_kg: 8 },
        ],
      },
    ],
    ...overrides,
  };
}

const emptyState: BuffetState = { template_id: null, selections: [], role_amounts: {}, manual_item_count: 0 };

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
  } as unknown as ReturnType<typeof useBuffetTemplates>);
  vi.mocked(useBuffetState).mockReturnValue({ data: emptyState } as unknown as ReturnType<typeof useBuffetState>);
  vi.mocked(useBuffetCatalog).mockReturnValue({
    data: makeCatalog(),
    isLoading: false,
  } as unknown as ReturnType<typeof useBuffetCatalog>);
  vi.mocked(useBuffetCatalogSearch).mockReturnValue({
    data: [],
    isLoading: false,
    isFetching: false,
    error: null,
    refetch: vi.fn(),
  } as unknown as ReturnType<typeof useBuffetCatalogSearch>);
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

function choosePreset(name = 'Belegte Baguettes') {
  fireEvent.click(screen.getByRole('button', { name: new RegExp(name) }));
}

describe('BuffetBuilder', () => {
  it('preselects the template for the meal type and shows its roles with default items checked', () => {
    renderBuilder();
    choosePreset();

    expect(screen.getByText('Brot & Gebäck')).toBeInTheDocument();
    expect(screen.getByText('Belag süß')).toBeInTheDocument();
    // enabled_by_default role starts expanded with its default item selected
    const baguetteChip = within(screen.getByTestId('buffet-role-buffet-bread')).getByRole('button', { name: /Baguette/ });
    expect(baguetteChip).toHaveClass('border-primary');
  });

  it('collapses a role that is not enabled by default and has no selection', () => {
    renderBuilder();
    choosePreset();

    // "Belag süß" is enabled_by_default: false -> collapsed, chips not shown
    expect(screen.queryByText('Nutella')).not.toBeInTheDocument();
  });

  it('toggles item selection on click', () => {
    renderBuilder();
    choosePreset();

    const ciabattaChip = screen.getByText('Ciabatta').closest('button')!;
    expect(ciabattaChip).not.toHaveClass('border-primary');
    fireEvent.click(ciabattaChip);
    expect(ciabattaChip).toHaveClass('border-primary');
  });

  it('sends a dry-run preview reflecting the current selection', async () => {
    renderBuilder();
    choosePreset();

    await waitFor(() => expect(previewFn).toHaveBeenCalled());
    const lastCall = previewFn.mock.calls[previewFn.mock.calls.length - 1]?.[0];
    expect(lastCall.templateId).toBe(1);
    expect(lastCall.selections).toEqual([{ role_slug: 'buffet-bread', ingredient_id: 10, recipe_id: null, share_percent: 100 }]);
  });

  it('rebalances item shares and includes them in the preview request', async () => {
    renderBuilder();
    choosePreset();

    const breadRole = within(screen.getByTestId('buffet-role-buffet-bread'));
    fireEvent.click(breadRole.getByRole('button', { name: /Ciabatta/ }));

    const baguetteSlider = breadRole.getByRole('slider', { name: 'Anteil für Baguette' });
    const ciabattaSlider = breadRole.getByRole('slider', { name: 'Anteil für Ciabatta' });
    expect(baguetteSlider).toHaveValue('50');
    expect(ciabattaSlider).toHaveValue('50');

    fireEvent.change(baguetteSlider, { target: { value: '70' } });
    await waitFor(() => {
      const lastCall = previewFn.mock.calls[previewFn.mock.calls.length - 1]?.[0];
      expect(lastCall.selections).toEqual([
        { role_slug: 'buffet-bread', ingredient_id: 10, recipe_id: null, share_percent: 70 },
        { role_slug: 'buffet-bread', ingredient_id: 11, recipe_id: null, share_percent: 30 },
      ]);
    });

    fireEvent.click(breadRole.getAllByTitle('Sperren')[0]);
    fireEvent.change(ciabattaSlider, { target: { value: '50' } });
    expect(baguetteSlider).toHaveValue('70');
    expect(ciabattaSlider).toHaveValue('30');
  });

  it('preselects the first visible favorite when the template has no explicit default', () => {
    vi.mocked(useBuffetCatalog).mockReturnValue({
      data: makeCatalog({
        roles: [
          {
            role: { slug: 'buffet-bread', name: 'Brot & Gebäck', icon: '' },
            amount_per_person: 150,
            unit: 'g',
            enabled_by_default: true,
            items: [{ kind: 'ingredient', id: 10, name: 'Baguette', is_favorite: true, is_template_default: false, role_slugs: ['buffet-bread'], default_selected: false }],
          },
        ],
      }),
      isLoading: false,
    } as unknown as ReturnType<typeof useBuffetCatalog>);

    renderBuilder();
    choosePreset();

    const chip = within(screen.getByTestId('buffet-role-buffet-bread')).getByRole('button', { name: /Baguette/ });
    expect(chip).toHaveClass('border-primary');
  });

  it('always shows the search field for an expanded role', () => {
    const manyItems = Array.from({ length: 2 }, (_, i) => ({
      kind: 'ingredient' as const,
      id: 100 + i,
      name: `Zutat ${i}`,
      is_favorite: true,
      is_template_default: false,
      role_slugs: ['buffet-bread'],
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
    choosePreset();

    expect(screen.getByPlaceholderText('Weitere hinzufügen…')).toBeInTheDocument();
  });

  it('restores the saved selection and amounts when reopening', () => {
    vi.mocked(useBuffetState).mockReturnValue({
      data: {
        template_id: 1,
        selections: [{
          role_slug: 'buffet-sweet',
          ingredient_id: 20,
          recipe_id: null,
          kind: 'ingredient',
          share_percent: 100,
          name: 'Nutella',
          energy_kcal_per_100g: 540,
          price_per_kg: 8,
          weight_per_serving_g: null,
        }],
        role_amounts: { 'buffet-sweet': 35 },
      },
    } as unknown as ReturnType<typeof useBuffetState>);

    renderBuilder();

    // The restored role is expanded (it has a selection) even though not enabled_by_default.
    const sweetRole = within(screen.getByTestId('buffet-role-buffet-sweet'));
    const nutellaChip = sweetRole.getByRole('button', { name: /Nutella/ });
    expect(nutellaChip).toHaveClass('border-primary');
    expect(sweetRole.getByRole('spinbutton', { name: 'Menge pro Person für Belag süß' })).toHaveValue(35);
  });

  it('restores a free selection that is no longer in the role catalog', () => {
    vi.mocked(useBuffetState).mockReturnValue({
      data: {
        template_id: 1,
        selections: [{
          role_slug: 'buffet-bread',
          ingredient_id: 77,
          recipe_id: null,
          kind: 'ingredient',
          share_percent: 100,
          name: 'Freie Tomaten',
          energy_kcal_per_100g: 18,
          price_per_kg: null,
          weight_per_serving_g: null,
        }],
        role_amounts: {},
      },
    } as unknown as ReturnType<typeof useBuffetState>);

    renderBuilder();

    const breadRole = within(screen.getByTestId('buffet-role-buffet-bread'));
    const freeTomatoes = breadRole.getByRole('button', { name: /Freie Tomaten/ });
    expect(freeTomatoes).toHaveAttribute('aria-pressed', 'true');
    expect(breadRole.getByText('Eigene')).toBeInTheDocument();
  });

  it('adds a visible search result as a free selection', async () => {
    vi.mocked(useBuffetCatalogSearch).mockReturnValue({
      data: [{
        kind: 'ingredient',
        id: 77,
        name: 'Cocktailtomaten',
        energy_kcal_per_100g: 18,
        price_per_kg: 5,
        weight_per_serving_g: null,
        recipe_type: null,
        is_favorite: false,
        role_slugs: [],
      }],
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useBuffetCatalogSearch>);

    renderBuilder();
    choosePreset();
    fireEvent.change(screen.getByPlaceholderText('Weitere hinzufügen…'), { target: { value: 'Cocktail' } });

    const result = await screen.findByText('Cocktailtomaten');
    fireEvent.click(result.closest('button')!);

    await waitFor(() => {
      const call = previewFn.mock.calls[previewFn.mock.calls.length - 1]?.[0];
      expect(call.selections).toContainEqual({ role_slug: 'buffet-bread', ingredient_id: 77, recipe_id: null, share_percent: 50 });
    });
  });

  it('saves with the current selection and amounts', () => {
    renderBuilder();
    choosePreset();
    fireEvent.click(screen.getByRole('button', { name: 'Prüfen' }));

    fireEvent.click(screen.getByTestId('buffet-save'));

    expect(saveMutate).toHaveBeenCalledWith(
      {
        templateId: 1,
        selections: [{ role_slug: 'buffet-bread', ingredient_id: 10, recipe_id: null, share_percent: 100 }],
        roleAmounts: { 'buffet-bread': 150 },
        manualItemsPolicy: 'preserve',
      },
      expect.anything(),
    );
  });

  it('allows choosing to replace existing manual meal items before saving', () => {
    vi.mocked(useBuffetState).mockReturnValue({
      data: {
        template_id: 1,
        selections: [{
          role_slug: 'buffet-bread',
          ingredient_id: 10,
          recipe_id: null,
          kind: 'ingredient',
          share_percent: 100,
          name: 'Baguette',
          energy_kcal_per_100g: 250,
          price_per_kg: 3,
          weight_per_serving_g: null,
        }],
        role_amounts: { 'buffet-bread': 150 },
        manual_item_count: 2,
      },
    } as unknown as ReturnType<typeof useBuffetState>);

    renderBuilder();
    fireEvent.click(screen.getByRole('button', { name: 'Prüfen' }));
    fireEvent.click(screen.getByLabelText('Manuelle Einträge durch das Buffet ersetzen'));
    fireEvent.click(screen.getByTestId('buffet-save'));

    expect(saveMutate).toHaveBeenCalledWith(
      expect.objectContaining({ manualItemsPolicy: 'replace' }),
      expect.anything(),
    );
  });

  it('falls back to the free template when no template matches the meal type', async () => {
    const freeTemplate: BuffetTemplate = {
      id: 9,
      name: 'Freies Buffet',
      slug: 'free',
      description: '',
      meal_types: ['breakfast', 'lunch', 'dinner', 'snack', 'drinks'],
      sort_order: 100,
      roles: [],
    };
    vi.mocked(useBuffetTemplates).mockReturnValue({
      data: [freeTemplate],
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useBuffetTemplates>);
    vi.mocked(useBuffetCatalog).mockReturnValue({
      data: makeCatalog({ template_slug: 'free' }),
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useBuffetCatalog>);

    renderBuilder({ mealType: 'snack' });
    fireEvent.click(screen.getByTestId('buffet-free-preset'));

    await waitFor(() => expect(useBuffetCatalog).toHaveBeenLastCalledWith('free', { enabled: true }));
    expect(screen.getByText('Brot & Gebäck')).toBeInTheDocument();
    expect(screen.queryByText('Lade Buffet-Katalog…')).not.toBeInTheDocument();
  });

  it('shows at most six existing presets in configured order and keeps free separate', () => {
    const snackTemplates: BuffetTemplate[] = Array.from({ length: 7 }, (_, index) => ({
      id: 20 + index,
      name: `Snack ${index + 1}`,
      slug: `snack-${index + 1}`,
      description: '',
      meal_types: ['snack'],
      sort_order: 7 - index,
      roles: [],
    }));
    vi.mocked(useBuffetTemplates).mockReturnValue({
      data: [
        ...snackTemplates,
        { id: 99, name: 'Freies Buffet', slug: 'free', description: '', meal_types: ['snack'], sort_order: 999, roles: [] },
      ],
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useBuffetTemplates>);

    renderBuilder({ mealType: 'snack' });

    const featured = within(screen.getByTestId('buffet-featured-presets'));
    expect(featured.getByRole('button', { name: /Snack 7/ })).toBeInTheDocument();
    expect(featured.getByRole('button', { name: /Snack 2/ })).toBeInTheDocument();
    expect(featured.queryByRole('button', { name: /Snack 1/ })).not.toBeInTheDocument();
    expect(screen.getByTestId('buffet-free-preset')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Weitere Vorlagen'));
    expect(within(screen.getByTestId('buffet-other-presets')).getByRole('button', { name: /Snack 1/ })).toBeInTheDocument();
  });

  it('shows the breakfast preset first for the breakfast meal type', async () => {
    vi.mocked(useBuffetTemplates).mockReturnValue({
      data: [
        { ...breakfastTemplate, sort_order: 10 },
        { id: 3, name: 'Freies Buffet', slug: 'free', description: '', meal_types: ['breakfast'], sort_order: 100, roles: [] },
      ],
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useBuffetTemplates>);

    renderBuilder({ mealType: 'breakfast' });

    expect(screen.getByRole('button', { name: 'Frühstück' })).toBeInTheDocument();
    expect(screen.getByTestId('buffet-free-preset')).toBeInTheDocument();
  });

  it('shows a retry state when template loading fails', () => {
    const retry = vi.fn();
    vi.mocked(useBuffetTemplates).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch: retry,
    } as unknown as ReturnType<typeof useBuffetTemplates>);

    renderBuilder();

    expect(screen.getByText('Die Buffet-Vorlagen konnten nicht geladen werden.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Erneut versuchen' }));
    expect(retry).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Lade Buffet-Katalog…')).not.toBeInTheDocument();
  });

  it('shows an empty state instead of loading when no templates exist', () => {
    vi.mocked(useBuffetTemplates).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useBuffetTemplates>);

    renderBuilder({ mealType: 'snack' });

    expect(screen.getByText('Für diesen Mahlzeitentyp gibt es noch keine hervorgehobene Vorlage.')).toBeInTheDocument();
    expect(screen.queryByText('Lade Buffet-Katalog…')).not.toBeInTheDocument();
  });

  it('shows warnings from the preview', () => {
    vi.mocked(useBuffetPreview).mockReturnValue({
      preview: previewFn,
      result: makeResult({ warnings: [{ code: 'quantity_plausibility', ingredient_name: 'Baguette', per_person_value: 2000, per_person_unit: 'g', total_value: 8, total_unit: 'kg', message: 'Baguette: 2000 g pro Person – bitte prüfen.' }] }),
      isPending: false,
      error: null,
      reset: vi.fn(),
    } as unknown as ReturnType<typeof useBuffetPreview>);

    renderBuilder();
    choosePreset();

    expect(screen.getByText(/bitte prüfen/)).toBeInTheDocument();
  });
});
